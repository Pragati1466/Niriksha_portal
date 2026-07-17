# agents/risk_agent.py
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from schemas import InspectionAnalysisRequest, RiskScoreResponse

load_dotenv()

PRIORITY_WEIGHTS = {"High": 10, "Medium": 5, "Low": 2}


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
    ) or "None"

    history_desc = "; ".join(
        f"{insp.actual_date[:10]} — risk {insp.risk_score_at_inspection}, compliance {insp.checklist.get('compliance', 'N/A')}%"
        for insp in data.inspection_history
    ) or "No prior inspections on record"

    compliance = data.current_inspection.checklist.get("compliance", "N/A")

    prompt = f"""You are a regulatory risk analyst. Given the following inspection data, write a concise, specific explanation (3-4 sentences) for why this establishment received a risk score of {score}/100 (level: {level}).

Establishment: {data.establishment.name} ({data.establishment.business_type}, {data.establishment.category})
Department: {data.department.name}
Current inspection compliance score: {compliance}%
Current inspection findings: {data.current_inspection.findings}
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