"""
Celery task that orchestrates the full document processing pipeline:
  1. Download file from Supabase Storage
  2. Extract text (PDF via pypdf, DOCX via python-docx)
  3. Run Gemini Agent 1 (Extractor)
  4. Run Gemini Agent 2 (Report Writer)
  5. Save report and mark document complete
"""
import io
import json
from collections import defaultdict

from celery import Celery
from supabase import create_client

from agents.extractor import run_extractor_with_fallback
from agents.writer import run_writer
from config import settings

celery_app = Celery("agentflow", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

# Celery config
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


def _get_sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _update_doc(sb, doc_id: str, **fields):
    """Helper to update document fields."""
    sb.table("documents").update(fields).eq("id", doc_id).execute()


def _clean_json_response(raw_text: str) -> str:
    """Remove common markdown wrappers before JSON parsing."""
    if not raw_text:
        raise ValueError("Model returned an empty response")

    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    return text


def _parse_model_json(raw_text: str) -> dict:
    """Parse a model response into JSON with clearer errors."""
    cleaned = _clean_json_response(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        preview = cleaned[:200].replace("\n", " ")
        raise ValueError(f"Invalid JSON from model: {preview}") from exc


def _check_abort(sb, doc_id: str):
    """Check if the UI has marked this task as cancelled."""
    res = sb.table("documents").select("status").eq("id", doc_id).single().execute()
    if res.data and res.data.get("status") == "cancelled":
        raise Exception("CANCELLED_BY_USER")


def _build_fallback_report(extracted_dict: dict) -> dict:
    """Create a structured research-summary fallback report."""
    summary = extracted_dict.get("summary", "No summary available.")
    paper_title = extracted_dict.get("paper_title") or "Untitled Research Paper"
    domain = extracted_dict.get("domain") or "Technical Research"
    entities = extracted_dict.get("entities", [])
    keywords = extracted_dict.get("keywords", [])
    section_map = extracted_dict.get("section_map", {})

    grouped = defaultdict(list)
    for item in entities:
        grouped[item.get("type", "other")].append(item)

    def compact_text(text: str, limit: int, fallback: str) -> str:
        clean = " ".join((text or "").split()).strip()
        if not clean:
            return fallback
        if len(clean) <= limit:
            return clean
        trimmed = clean[:limit].rsplit(" ", 1)[0].strip()
        return f"{trimmed}..."

    def bullet_list(items, default_message, limit=6):
        if not items:
            return default_message
        lines = []
        for item in items[:limit]:
            value = item.get("value", "")
            name = item.get("name", "")
            label = name if name and name.lower() not in {"keyword", "metric", "model", "dataset"} else value
            if label and label != value:
                lines.append(f"- **{label or 'Unknown'}:** {value}")
            else:
                lines.append(f"- {value or 'Unknown'}")
        return "\n".join(lines)

    problem_text = (
        section_map.get("problem_statement")
        or section_map.get("abstract")
        or section_map.get("introduction")
        or "The exact problem statement was not explicitly isolated in the extracted text."
    )
    objective_text = (
        section_map.get("objective")
        or section_map.get("abstract")
        or "The paper appears to aim at proposing, evaluating, or improving a technical method."
    )
    methodology_text = (
        section_map.get("methodology")
        or section_map.get("discussion")
        or "Method details were only partially available in the extracted text."
    )
    results_text = (
        section_map.get("results")
        or section_map.get("discussion")
        or "Explicit result text was limited, so findings are inferred from extracted metrics and entities."
    )
    limitations_text = (
        section_map.get("limitations")
        or "Limitations were not clearly stated in the extracted text; likely constraints should be verified from the full paper."
    )
    method_support = bullet_list(
        grouped.get("model", []) + grouped.get("dataset", []) + grouped.get("equation", []),
        "- Specific models, datasets, or equations were not clearly identified.",
    )
    findings_support = bullet_list(
        grouped.get("metric", []) + grouped.get("number", []) + grouped.get("date", []),
        "- Clear metrics or numerical results were not confidently extracted.",
    )
    key_insights = "\n".join(
        [
            f"- The paper mainly sits in the **{domain}** area.",
            f"- The central message is: {compact_text(summary, 180, 'A short overall summary was available, but some details were missing.')}",
            f"- The method matters most in how it approaches the problem and what results it reports.",
            (
                "- Important recurring ideas include: "
                + ", ".join(keywords[:6])
                if keywords
                else "- Important recurring ideas were not clearly listed in the extracted text."
            ),
            "- Some details should still be checked against the original paper before using the conclusions in high-stakes work.",
        ]
    )
    applications = bullet_list(
        grouped.get("organization", []) + grouped.get("dataset", []) + grouped.get("field", []),
        "- This work could likely be used in research, benchmarking, teaching, or domain-specific decision support depending on the paper topic.",
    )
    final_summary_lines = [
        f"- This paper discusses a problem in **{domain}** and tries to offer a useful solution or explanation.",
        f"- Main goal: {compact_text(objective_text, 150, 'The exact goal was not clearly stated in the extracted text.')}",
        f"- Core approach: {compact_text(methodology_text, 170, 'The method was only partially visible in the extracted content.')}",
        f"- Main findings: {compact_text(results_text, 170, 'The results were only partly available in the extracted content.')}",
        f"- Biggest limitation: {compact_text(limitations_text, 150, 'Important limitations were not clearly stated.')}",
        "- The paper seems useful, but the original document should still be checked for exact claims and technical detail.",
    ]

    sections = [
        {
            "heading": "Overview",
            "content": (
                f"- **Paper:** {paper_title}\n"
                f"- **Field:** {domain}\n"
                f"- {compact_text(summary, 500, 'This paper presents a technical idea or study, but only limited summary details were extracted.')}"
            ),
        },
        {
            "heading": "Problem & Purpose",
            "content": (
                f"- **Problem:** {compact_text(problem_text, 600, 'The exact problem statement was not clearly isolated in the extracted text.')}\n"
                f"- **Why it matters:** {compact_text(objective_text, 500, 'The paper appears to aim at improving an existing method, system, or understanding.')}"
            ),
        },
        {
            "heading": "Key Ideas / Approach",
            "content": (
                f"- **Step 1:** Understand the problem and define the goal.\n"
                f"- **Step 2:** Apply the main method described in the paper: {compact_text(methodology_text, 700, 'Method details were only partially available in the extracted text.')}\n"
                f"- **Step 3:** Evaluate the method using the paper's reported evidence.\n\n"
                f"**Key technical pieces**\n{method_support}"
            ),
        },
        {
            "heading": "Important Findings",
            "content": (
                f"- {compact_text(results_text, 700, 'Explicit result text was limited, so the findings are based on partial extracted evidence.')}\n\n"
                f"**Supporting signals**\n{findings_support}"
            ),
        },
        {
            "heading": "Key Insights",
            "content": key_insights,
        },
        {
            "heading": "Limitations",
            "content": (
                f"- {compact_text(limitations_text, 700, 'Limitations were not clearly stated in the extracted text, so some uncertainty remains.')}\n"
                "- Some context may be missing because the report is based on extracted sections rather than a full manual reading."
            ),
        },
        {
            "heading": "Real-Life Use",
            "content": applications,
        },
        {
            "heading": "Final Summary",
            "content": "\n".join(final_summary_lines),
        },
    ]

    return {
        "title": paper_title,
        "sections": sections,
    }


def extract_text_from_pdf(raw_bytes: bytes) -> str:
    """Extract text from a PDF using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(raw_bytes))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append(f"--- Page {i + 1} ---\n{text}")
    return "\n\n".join(pages) if pages else "[No readable text found in PDF]"


def extract_text_from_docx(raw_bytes: bytes) -> str:
    """Extract text from a DOCX using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(raw_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs) if paragraphs else "[No readable text found in DOCX]"


def extract_text(raw_bytes: bytes, storage_path: str) -> str:
    """Route to the correct text extractor based on file extension."""
    lower = storage_path.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(raw_bytes)
    if lower.endswith(".docx"):
        return extract_text_from_docx(raw_bytes)

    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return "[Unable to extract text from this file format]"


@celery_app.task(bind=True, max_retries=5)
def run_pipeline(self, doc_id: str, user_id: str, storage_path: str, batch_id: str, cached_extraction: dict = None):
    """
    Main pipeline task.
    """
    sb = _get_sb()
    extracted_dict = None

    try:
        if cached_extraction:
            extracted_dict = cached_extraction
            _update_doc(sb, doc_id, progress=55, status="processing", error_message="Resuming report generation...")
        else:
            _update_doc(sb, doc_id, progress=10, status="processing", error_message="Downloading source file...")
            raw_bytes = sb.storage.from_("documents").download(storage_path)

            _update_doc(sb, doc_id, progress=25, error_message="Extracting text from document...")
            text = extract_text(raw_bytes, storage_path)

            if text.startswith("["):
                _update_doc(
                    sb,
                    doc_id,
                    status="failed",
                    progress=0,
                    error_message=text,
                )
                return {"status": "failed", "error": text}

            _check_abort(sb, doc_id)
            _update_doc(sb, doc_id, progress=40, error_message="Running document analysis...")
            extracted_dict, extractor_mode = run_extractor_with_fallback(text)
            extracted_dict["source_excerpt"] = extracted_dict.get("source_excerpt") or text[:3000]
            if extractor_mode == "local":
                _update_doc(
                    sb,
                    doc_id,
                    progress=55,
                    error_message="Primary AI extractor unavailable. Switched to local research extractor and continuing report generation...",
                )

        _check_abort(sb, doc_id)
        _update_doc(sb, doc_id, progress=70, error_message="Generating the final report...")
        try:
            report_json = run_writer(extracted_dict)
            report_data = _parse_model_json(report_json)
        except Exception:
            report_data = _build_fallback_report(extracted_dict)

        _update_doc(sb, doc_id, progress=90, error_message="Saving completed report...")
        sb.table("reports").insert(
            {
                "document_id": doc_id,
                "user_id": user_id,
                "title": report_data.get("title", "Untitled Report"),
                "content": report_data,
                "extraction_accuracy": extracted_dict.get("extraction_accuracy", 0.0),
            }
        ).execute()

        _update_doc(
            sb,
            doc_id,
            status="complete",
            progress=100,
            summary=extracted_dict.get("summary", ""),
            error_message=None,
        )

        return {"status": "complete", "doc_id": doc_id}

    except Exception as exc:
        err_str = str(exc).lower()
        retry_args = [doc_id, user_id, storage_path, batch_id, extracted_dict]

        if "cancelled_by_user" in err_str:
            _update_doc(sb, doc_id, status="failed", progress=0, error_message="Workflow cancelled by user.")
            return {"status": "cancelled", "doc_id": doc_id}

        if self.request.retries >= self.max_retries:
            _update_doc(
                sb,
                doc_id,
                status="failed",
                progress=0,
                error_message=str(exc)[:500],
            )
            return {"status": "failed", "error": str(exc)[:500], "doc_id": doc_id}

        if "429" in err_str or "quota" in err_str or "resourceexhausted" in err_str:
            _update_doc(
                sb,
                doc_id,
                status="processing",
                error_message="Google API rate limit reached during report writing. Waiting 30 seconds before retry...",
            )
            raise self.retry(args=retry_args, exc=exc, countdown=30)

        if "10060" in err_str or "timeout" in err_str or "connection" in err_str:
            _update_doc(
                sb,
                doc_id,
                status="processing",
                error_message="Network timeout while contacting the model. Retrying in 10 seconds...",
            )
            raise self.retry(args=retry_args, exc=exc, countdown=10)

        _update_doc(
            sb,
            doc_id,
            status="processing",
            error_message=f"Analysis error, retrying automatically: {str(exc)[:200]}",
        )
        raise self.retry(args=retry_args, exc=exc, countdown=10)
