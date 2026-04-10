"""
Extractor engine for research-paper style documents.
Primary path uses Gemini. Fallback path uses local heuristics so
analysis can still complete when the model is unavailable or rate-limited.
"""
import json
import re
from collections import Counter

import google.generativeai as genai

from config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

MAX_INPUT_CHARS = 24000
MAX_LOCAL_ENTITIES = 220
MAX_SOURCE_EXCERPT = 3000

SECTION_ALIASES = {
    "abstract": ["abstract"],
    "introduction": ["introduction", "background"],
    "problem_statement": ["problem statement", "motivation"],
    "objective": ["objective", "objectives", "aim", "aims", "goal", "goals"],
    "methodology": [
        "methodology",
        "methods",
        "approach",
        "proposed method",
        "materials and methods",
        "experimental setup",
        "system model",
        "framework",
    ],
    "results": ["results", "findings", "evaluation", "experiments", "experimental results"],
    "discussion": ["discussion", "analysis"],
    "limitations": ["limitations", "threats to validity"],
    "conclusion": ["conclusion", "conclusions", "future work", "conclusion and future work"],
    "keywords": ["keywords", "index terms"],
}

DOMAIN_HINTS = {
    "Artificial Intelligence": ["neural network", "deep learning", "transformer", "llm", "machine learning", "classification"],
    "Networking": ["network", "routing", "throughput", "latency", "packet", "wireless", "5g", "tcp"],
    "Medicine": ["patient", "clinical", "disease", "diagnosis", "treatment", "medical", "healthcare"],
    "Cybersecurity": ["attack", "malware", "intrusion", "security", "encryption", "threat", "vulnerability"],
    "Robotics": ["robot", "control", "navigation", "sensor", "actuator", "trajectory"],
    "Finance": ["portfolio", "market", "trading", "risk", "asset", "financial"],
}

EXTRACTOR_SYSTEM = """You are Agent 1 - Extractor Engine.
You receive the full text of a research paper or technical document and must extract structured information.

Return ONLY valid JSON with these keys:
{
  "paper_title": "string",
  "domain": "string",
  "keywords": ["string"],
  "section_map": {
    "abstract": "string",
    "introduction": "string",
    "problem_statement": "string",
    "objective": "string",
    "methodology": "string",
    "results": "string",
    "discussion": "string",
    "limitations": "string",
    "conclusion": "string"
  },
  "equations": ["string"],
  "entities": [
    { "name": "string", "type": "string", "value": "string", "page": 0, "confidence": 0.95 }
  ],
  "summary": "2-3 sentence overview of the paper",
  "document_type": "string",
  "extraction_accuracy": 0.0 to 1.0
}

Rules:
- Extract meaningful entities including names, dates, datasets, models, metrics, identifiers, organizations, amounts, percentages, and key technical terms.
- Preserve the wording of important terms and findings where possible.
- Prioritize completeness for methodology and results.
- Do not fabricate missing details.
"""


def _trim_text(document_text: str) -> str:
    cleaned_text = (document_text or "").strip()
    if len(cleaned_text) <= MAX_INPUT_CHARS:
        return cleaned_text

    head = cleaned_text[:12000]
    middle_start = max((len(cleaned_text) // 2) - 4000, 0)
    middle = cleaned_text[middle_start:middle_start + 8000]
    tail = cleaned_text[-4000:]
    return (
        f"{head}\n\n"
        f"[TRUNCATED FOR MODEL INPUT]\n\n"
        f"{middle}\n\n"
        f"[END OF DOCUMENT]\n\n"
        f"{tail}"
    )


def _clean_model_json(raw_text: str) -> dict:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return json.loads(text)


def _merge_unique_strings(primary: list, secondary: list, limit: int) -> list:
    merged = []
    seen = set()
    for item in (primary or []) + (secondary or []):
        clean = (item or "").strip()
        if not clean:
            continue
        key = clean.lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(clean)
        if len(merged) >= limit:
            break
    return merged


def _merge_entities(primary: list, secondary: list, limit: int) -> list:
    merged = []
    seen = set()
    for item in (primary or []) + (secondary or []):
        entity_type = (item.get("type") or "").strip().lower()
        value = (item.get("value") or "").strip()
        if not entity_type or not value:
            continue
        key = (entity_type, value.lower())
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
    merged.sort(key=lambda item: -float(item.get("confidence", 0)))
    return merged[:limit]


def _merge_extractions(primary: dict, secondary: dict) -> dict:
    section_map = {}
    for key in sorted(set((primary.get("section_map") or {}).keys()) | set((secondary.get("section_map") or {}).keys())):
        section_map[key] = (primary.get("section_map") or {}).get(key) or (secondary.get("section_map") or {}).get(key) or ""

    merged = {
        "paper_title": primary.get("paper_title") or secondary.get("paper_title") or "Untitled Research Paper",
        "domain": primary.get("domain") or secondary.get("domain") or "Technical Research",
        "keywords": _merge_unique_strings(primary.get("keywords", []), secondary.get("keywords", []), 20),
        "section_map": {key: value for key, value in section_map.items() if value},
        "equations": _merge_unique_strings(primary.get("equations", []), secondary.get("equations", []), 5),
        "entities": _merge_entities(primary.get("entities", []), secondary.get("entities", []), MAX_LOCAL_ENTITIES),
        "summary": primary.get("summary") or secondary.get("summary") or "",
        "document_type": primary.get("document_type") or secondary.get("document_type") or "research_paper",
        "extraction_accuracy": primary.get("extraction_accuracy") or secondary.get("extraction_accuracy") or 0.75,
        "source_excerpt": primary.get("source_excerpt") or secondary.get("source_excerpt") or "",
    }
    return merged


def _normalize_heading(line: str) -> str:
    normalized = re.sub(r"[^a-z0-9 ]+", " ", line.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    normalized = re.sub(r"^\d+(\.\d+)*\s+", "", normalized)
    return normalized


def _is_title_noise(clean: str, normalized: str) -> bool:
    if not clean:
        return True
    if normalized in {"abstract", "introduction", "keywords"}:
        return True
    if re.fullmatch(r"page\s*\d+(?:\s*of\s*\d+)?", normalized):
        return True
    if re.fullmatch(r"p\s*\d+", normalized):
        return True
    if re.fullmatch(r"\d+", normalized):
        return True
    if re.fullmatch(r"[A-Z0-9\s\-:]+", clean) and len(clean.split()) <= 2:
        return True
    return False


def _extract_title(lines: list[str]) -> str:
    for line in lines[:12]:
        clean = line.strip()
        if not clean or len(clean) < 10 or len(clean) > 180:
            continue
        normalized = _normalize_heading(clean)
        if _is_title_noise(clean, normalized):
            continue
        return clean
    return "Untitled Research Paper"


def _extract_section_map(lines: list[str]) -> dict:
    sections = {}
    positions = []
    alias_lookup = {
        alias: canonical
        for canonical, aliases in SECTION_ALIASES.items()
        for alias in aliases
    }

    for idx, line in enumerate(lines):
        normalized = _normalize_heading(line)
        if normalized in alias_lookup and len(normalized.split()) <= 6:
            positions.append((idx, alias_lookup[normalized]))

    for index, (start_idx, canonical) in enumerate(positions):
        end_idx = positions[index + 1][0] if index + 1 < len(positions) else len(lines)
        chunk = " ".join(lines[start_idx + 1:end_idx]).strip()
        if chunk:
            sections[canonical] = chunk[:2200]

    return sections


def _extract_keywords(text: str, section_map: dict) -> list[str]:
    keywords_text = section_map.get("keywords", "")
    if keywords_text:
        raw_parts = re.split(r"[,;|]", keywords_text)
        keywords = [part.strip() for part in raw_parts if part.strip()]
        if keywords:
            return keywords[:12]

    frequent_terms = re.findall(r"\b[A-Z][A-Za-z0-9-]{2,}\b", text[:3000])
    keywords = []
    for term, _count in Counter(frequent_terms).most_common(12):
        if term.lower() in {"abstract", "introduction", "results", "conclusion", "figure", "table"}:
            continue
        keywords.append(term)
    return keywords[:10]


def _infer_document_type(text: str) -> str:
    lowered = text.lower()
    if all(token in lowered for token in ["abstract", "introduction"]) and (
        "results" in lowered or "conclusion" in lowered or "references" in lowered
    ):
        return "research_paper"
    if "invoice" in lowered:
        return "invoice"
    if "agreement" in lowered or "contract" in lowered:
        return "contract"
    return "document"


def _infer_domain(text: str, keywords: list[str]) -> str:
    lowered = f"{text[:5000]} {' '.join(keywords)}".lower()
    best_domain = "Technical Research"
    best_score = 0
    for domain, hints in DOMAIN_HINTS.items():
        score = sum(1 for hint in hints if hint in lowered)
        if score > best_score:
            best_score = score
            best_domain = domain
    return best_domain


def _extract_equations(lines: list[str]) -> list[str]:
    equations = []
    for line in lines:
        clean = line.strip()
        if len(clean) < 6 or len(clean) > 140:
            continue
        if "=" in clean and re.search(r"[A-Za-z]", clean) and re.search(r"[\d()+\-/*^]", clean):
            equations.append(clean)
        elif "O(" in clean or "loss" in clean.lower():
            equations.append(clean)
        if len(equations) >= 5:
            break
    return equations


def _build_summary(section_map: dict, text: str, document_type: str, entity_count: int, domain: str) -> str:
    basis = (
        section_map.get("abstract")
        or section_map.get("problem_statement")
        or section_map.get("introduction")
        or " ".join(line.strip() for line in text.splitlines()[:4] if line.strip())
    )
    basis = basis[:420].strip() or "Limited readable content was available."
    return (
        f"This {document_type.replace('_', ' ')} in the {domain} domain was analyzed for high-value content. "
        f"{entity_count} entities were extracted. "
        f"Core overview: {basis}"
    )


def _make_entity(name: str, entity_type: str, value: str, confidence: float) -> dict:
    return {
        "name": name.strip()[:120],
        "type": entity_type,
        "value": value.strip()[:500],
        "page": 0,
        "confidence": confidence,
    }


def _add_entity(entities: list, seen: set, name: str, entity_type: str, value: str, confidence: float):
    clean_value = (value or "").strip()
    if not clean_value or len(clean_value) < 2:
        return
    key = (entity_type, clean_value.lower())
    if key in seen:
        return
    seen.add(key)
    entities.append(_make_entity(name, entity_type, clean_value, confidence))


def _infer_entity_type(label: str, value: str) -> str:
    label_l = label.lower()
    value_l = value.lower()
    if any(token in label_l for token in ["dataset", "corpus", "benchmark"]):
        return "dataset"
    if any(token in label_l for token in ["model", "architecture", "algorithm", "framework"]):
        return "model"
    if any(token in label_l for token in ["metric", "accuracy", "precision", "recall", "f1", "auc"]):
        return "metric"
    if any(token in label_l for token in ["date", "year"]):
        return "date"
    if any(token in label_l for token in ["author", "researcher", "name"]):
        return "name"
    if any(token in label_l for token in ["institution", "organization", "university", "company"]):
        return "organization"
    if any(token in label_l for token in ["equation", "formula"]):
        return "equation"
    if any(token in label_l for token in ["identifier", "reference", "id", "number"]):
        return "identifier"
    if any(token in label_l for token in ["amount", "cost", "price", "value", "score"]):
        return "number"
    if "@" in value:
        return "email"
    if re.search(r"\b\d+(?:\.\d+)?%\b", value):
        return "metric"
    if re.search(r"(bert|gpt|cnn|rnn|transformer|svm|resnet|gan)", value_l):
        return "model"
    return "field"


def _extract_labeled_fields(lines: list[str], entities: list, seen: set):
    for line in lines:
        match = re.match(r"^\s*([A-Za-z][A-Za-z0-9 /&().#-]{1,60})\s*[:\-]\s*(.+?)\s*$", line)
        if not match:
            continue
        label = re.sub(r"\s+", " ", match.group(1)).strip()
        value = match.group(2).strip()[:220]
        entity_type = _infer_entity_type(label, value)
        _add_entity(entities, seen, label.title(), entity_type, value, 0.9)


def _extract_pattern_entities(text: str, entities: list, seen: set):
    patterns = [
        (r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", "Email", "email", 0.98),
        (r"\bhttps?://[^\s<>\"]+|www\.[^\s<>\"]+\b", "URL", "url", 0.95),
        (r"\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{3,4}\b", "Phone", "phone", 0.9),
        (r"\b\d+(?:\.\d+)?%\b", "Metric", "metric", 0.94),
        (r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", "Date", "date", 0.92),
        (r"\b(?:19|20)\d{2}\b", "Year", "date", 0.88),
        (r"\b(?:BERT|GPT-\d|Transformer|ResNet|LSTM|CNN|RNN|SVM|Random Forest)\b", "Model", "model", 0.93),
        (r"\b(?:MNIST|CIFAR-10|ImageNet|COCO|GLUE|SQuAD)\b", "Dataset", "dataset", 0.92),
        (r"\b(?:accuracy|precision|recall|f1|auc|mse|rmse|mae)\b", "Metric", "metric", 0.88),
        (r"\b[A-Z]{2,8}[-/][A-Z0-9-]{2,}\b", "Identifier", "identifier", 0.9),
    ]

    for pattern, name, entity_type, confidence in patterns:
        for match in re.findall(pattern, text, flags=re.IGNORECASE):
            _add_entity(entities, seen, name, entity_type, match, confidence)


def _extract_named_entities(text: str, entities: list, seen: set):
    proper_nouns = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}\b", text)
    for value, count in Counter(proper_nouns).most_common(60):
        if len(value) < 4:
            continue
        if value.lower() in {"abstract", "introduction", "results", "conclusion", "methodology"}:
            continue
        _add_entity(entities, seen, "Name", "name", value, 0.72 if count == 1 else 0.82)

    orgs = re.findall(
        r"\b[A-Z][A-Za-z&.,'-]+(?:\s+[A-Z][A-Za-z&.,'-]+){0,5}\s+"
        r"(?:Inc|LLC|Ltd|Limited|Corp|Corporation|Company|Bank|University|Institute|Laboratory|Lab|Press)\b",
        text,
    )
    for value in orgs:
        _add_entity(entities, seen, "Organization", "organization", value, 0.86)


def run_local_extractor(document_text: str) -> dict:
    text = (document_text or "").strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    section_map = _extract_section_map(lines)
    keywords = _extract_keywords(text, section_map)
    domain = _infer_domain(text, keywords)
    paper_title = _extract_title(lines)
    equations = _extract_equations(lines)

    entities = []
    seen = set()
    _extract_labeled_fields(lines, entities, seen)
    _extract_pattern_entities(text, entities, seen)
    _extract_named_entities(text, entities, seen)

    for keyword in keywords:
        _add_entity(entities, seen, "Keyword", "keyword", keyword, 0.8)
    for equation in equations:
        _add_entity(entities, seen, "Equation", "equation", equation, 0.78)

    entities = sorted(
        entities,
        key=lambda item: (
            -float(item.get("confidence", 0)),
            len(item.get("value", "")),
        ),
    )[:MAX_LOCAL_ENTITIES]

    document_type = _infer_document_type(text)
    summary = _build_summary(section_map, text, document_type, len(entities), domain)

    return {
        "paper_title": paper_title,
        "domain": domain,
        "keywords": keywords,
        "section_map": section_map,
        "equations": equations,
        "entities": entities,
        "summary": summary,
        "document_type": document_type,
        "extraction_accuracy": 0.86 if entities else 0.58,
        "source_excerpt": text[:MAX_SOURCE_EXCERPT],
    }


def run_extractor(document_text: str) -> str:
    """
    Run the extraction agent on document text.
    Returns a JSON string.
    """
    cleaned_text = _trim_text(document_text)
    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=EXTRACTOR_SYSTEM,
    )
    response = model.generate_content(
        f"EXTRACT RESEARCH-PAPER INFORMATION:\n\n{cleaned_text}",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.05,
            "max_output_tokens": 4096,
        },
        request_options={"timeout": 120},
    )
    return response.text


def run_extractor_with_fallback(document_text: str) -> tuple[dict, str]:
    """
    Returns (extracted_dict, mode) where mode is 'gemini' or 'local'.
    """
    try:
        primary = _clean_model_json(run_extractor(document_text))
        secondary = run_local_extractor(document_text)
        return _merge_extractions(primary, secondary), "gemini"
    except Exception:
        return run_local_extractor(document_text), "local"
