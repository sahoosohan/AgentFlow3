"""
Gemini Agent 2 - Research Paper Writer.
Turns extracted paper data into a structured analyst report.
"""
import json

import google.generativeai as genai

from config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

MAX_ENTITIES = 150

WRITER_SYSTEM = """You are a professional research analyst.
Your task is to convert the given research paper into a clear, simple, human-readable report.

Strict instructions:
- The final report should be about 10% of the original paper length while still covering the essential ideas.
- Use simple, natural language that a smart beginner can understand.
- Avoid jargon unless it is necessary, and briefly explain it when you use it.
- Do not copy text directly from the source. Rewrite everything in a simpler way.
- Remove repetition, long academic explanations, and low-value detail.
- Focus on what is important, useful, and practical.
- If evidence is missing, say so clearly instead of inventing details.

Style:
- Use short paragraphs and bullet points.
- Keep the report easy to scan.
- Write in a clean, non-academic tone.

Return ONLY valid JSON with this exact shape:
{
  "title": "paper title",
  "sections": [
    { "heading": "Overview", "content": "..." },
    { "heading": "Problem & Purpose", "content": "..." },
    { "heading": "Key Ideas / Approach", "content": "..." },
    { "heading": "Important Findings", "content": "..." },
    { "heading": "Key Insights", "content": "..." },
    { "heading": "Limitations", "content": "..." },
    { "heading": "Real-Life Use", "content": "..." },
    { "heading": "Final Summary", "content": "..." }
  ]
}

Section rules:
- "Overview": explain what the paper is about in simple terms.
- "Problem & Purpose": explain the problem and why it matters.
- "Key Ideas / Approach": explain the solution step by step in simple language.
- "Important Findings": list the main results or discoveries.
- "Key Insights": explain the most important takeaways someone should remember.
- "Limitations": explain weaknesses, missing pieces, or uncertainty.
- "Real-Life Use": explain where the work can be applied in practice.
- "Final Summary": write a short conclusion in 5-8 lines.

Formatting rules:
- Use bullets inside sections when helpful.
- Keep each section concise.
- Prioritize clarity over completeness.
- Avoid adding sections outside the eight listed above.
"""


def run_writer(extracted_data: dict) -> str:
    """
    Run the writer agent on extracted paper data.
    Returns a JSON string compatible with the frontend report viewer.
    """
    safe_payload = {
        "paper_title": extracted_data.get("paper_title", ""),
        "domain": extracted_data.get("domain", ""),
        "summary": extracted_data.get("summary", ""),
        "document_type": extracted_data.get("document_type", "unknown"),
        "extraction_accuracy": extracted_data.get("extraction_accuracy", 0.0),
        "keywords": extracted_data.get("keywords", [])[:20],
        "section_map": extracted_data.get("section_map", {}),
        "equations": extracted_data.get("equations", [])[:5],
        "entities": extracted_data.get("entities", [])[:MAX_ENTITIES],
        "entity_count": len(extracted_data.get("entities", [])),
        "source_excerpt": extracted_data.get("source_excerpt", ""),
    }

    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=WRITER_SYSTEM,
    )
    response = model.generate_content(
        f"RESEARCH PAPER DATA:\n\n{json.dumps(safe_payload, indent=2)}",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.2,
            "max_output_tokens": 6144,
        },
        request_options={"timeout": 120},
    )
    return response.text
