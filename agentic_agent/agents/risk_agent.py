# agents/risk_agent.py
import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from schemas import InspectionAnalysisRequest, RiskScoreResponse

load_dotenv()

PRIORITY_WEIGHTS = {"High": 10, "Medium": 5, "Low": 2}

# Ordered list of keys that may hold the compliance percentage in the checklist
# JSONB.  The seed data uses "compliance"; downstream systems may vary.
_COMPLIANCE_KEYS = ("compliance", "compliance_score", "score", "total_score", "overall_score")


def _extract_compliance(checklist: dict) -> float | None:
    """
    Return the compliance percentage stored in the checklist dict, or None.

    Tries the known key aliases in priority order.  If none match but the
    dict contains exactly one numeric value, that value is used as a fallback.
    Returns None (not a default of 100) so callers can distinguish "data
    present and high" from "data absent".
    """
    if not checklist:
        return None

    for key in _COMPLIANCE_KEYS:
        value = checklist.get(key)
        if value is not None:
            try:
                return float(value)
            except (TypeError, ValueError):
                pass

    # Single-numeric-value fallback.
    numeric_values = [
        float(v) for v in checklist.values()
        if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace(".", "", 1).isdigit())
    ]
    if len(numeric_values) == 1:
        return numeric_values[0]

    return None


def _extract_findings_text(findings_raw: str) -> str:
    """
    The findings field arrives from buildAIPayload as one of:
      - A plain string:        "Raw meat found unrefrigerated."
      - A JSON-encoded string: '"Raw meat found unrefrigerated."'
        (because the frontend does JSON.stringify on a string value from JSONB)
      - An empty JSON object:  '{}'
        (JSON.stringify({}) when findings is null on the frontend)

    Returns a human-readable plain string for use in the LLM prompt.
    Scoring is not affected — this helper is only called from
    build_explanation_prompt().
    """
    if not findings_raw:
        return ""

    text = findings_raw.strip()

    # Already plain text — not a JSON literal.
    if not text.startswith(("{", "[", '"')):
        return text

    try:
        parsed = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return text  # not valid JSON, return as-is

    if isinstance(parsed, str):
        return parsed  # unwrap JSON-encoded string

    if isinstance(parsed, dict):
        if not parsed:
            return ""
        for key in ("text", "findings", "summary", "description", "notes"):
            val = parsed.get(key)
            if val and isinstance(val, str):
                return val
        return "; ".join(str(v) for v in parsed.values() if v)

    return str(parsed)


def calculate_base_score(data: InspectionAnalysisRequest) -> int:
    score = 0

    unresolved = [c for c in data.complaints if c.status.lower() != "resolved"]
    resolved = [c for c in data.complaints if c.status.lower() == "resolved"]

    complaint_score = sum(PRIORITY_WEIGHTS.get(c.priority, 2) for c in unresolved)
    complaint_score += sum(PRIORITY_WEIGHTS.get(c.priority, 2) * 0.3 for c in resolved)
    score += min(complaint_score, 30)

    past_high_risk = sum(1 for insp in data.inspection_history if insp.risk_score_at_inspection >= 70)
    score += min(past_high_risk * 10, 40)

    compliance = data.current_inspection.checklist.get("compliance", 100)
    if compliance < 50:
        score += 30
    elif compliance < 75:
        score += 15
    elif compliance < 90:
        score += 5

    return min(int(score), 100)


def get_risk_level(score: int) -> str:
    if score >= 50:
        return "high"
    elif score >= 20:
        return "moderate"
    else:
        return "low"


def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3,
    )


def build_explanation_prompt(data: InspectionAnalysisRequest, score: int, level: str) -> str:
    complaints_desc = "; ".join(
        f"{c.category} ({c.priority} priority, {c.status}): {c.description}"
        for c in data.complaints
    ) or "None on record"

    history_desc = "; ".join(
        f"{insp.actual_date[:10]} — risk {insp.risk_score_at_inspection}, "
        f"compliance {_extract_compliance(insp.checklist or {}) or 'N/A'}%"
        for insp in data.inspection_history
    ) or "No prior inspections on record"

    # Use _extract_compliance so the prompt shows a clean float (e.g. "79.4%")
    # rather than the raw dict value or "N/A" when the key is missing.
    compliance_val = _extract_compliance(data.current_inspection.checklist or {})
    compliance_str = f"{compliance_val:.1f}" if compliance_val is not None else "N/A"

    # Use _extract_findings_text to unwrap JSON-encoded strings that arrive
    # from buildAIPayload (e.g. '"Raw meat found..."' → 'Raw meat found...').
    findings_text = _extract_findings_text(data.current_inspection.findings)

    prompt = f"""You are a regulatory risk analyst. Given the following inspection data, write a concise, specific explanation (3-4 sentences) for why this establishment received a risk score of {score}/100 (level: {level}).

Establishment: {data.establishment.name} ({data.establishment.business_type}, {data.establishment.category})
Department: {data.department.name}
Current inspection compliance score: {compliance_str}%
Current inspection findings: {findings_text or "No findings recorded"}
Complaint history: {complaints_desc}
Past inspection history: {history_desc}

Rules:
- Reference specific facts above (numbers, dates, complaint categories) — do not write generic statements.
- Do not repeat the score itself; explain the reasoning behind it.
- Keep it factual and professional, suitable for a supervisor reading a report.
"""
    return prompt


def generate_explanation(data: InspectionAnalysisRequest, score: int, level: str) -> str:
    llm = get_llm()
    prompt = build_explanation_prompt(data, score, level)
    response = llm.invoke(prompt)
    return response.content


def run_risk_agent(data: InspectionAnalysisRequest) -> RiskScoreResponse:
    score = calculate_base_score(data)
    level = get_risk_level(score)
    explanation = generate_explanation(data, score, level)

    return RiskScoreResponse(
        establishment_id=data.establishment.establishment_id,
        inspection_id=data.current_inspection.inspection_id,
        risk_score=score,
        risk_level=level,
        explanation=explanation,
    )