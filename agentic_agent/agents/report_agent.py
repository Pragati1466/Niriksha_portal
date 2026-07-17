# agents/report_agent.py
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from schemas import InspectionAnalysisRequest, GeneratedReportResponse
from agents.risk_agent import run_risk_agent
from agents.evidence_agent import run_evidence_agent

load_dotenv()


def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3,
    )


def build_report_prompt(data: InspectionAnalysisRequest, risk_result, evidence_result) -> str:
    compliance = data.current_inspection.checklist.get("compliance", "N/A")

    prompt = f"""You are an inspection report generator for a regulatory compliance system. Using the data below, produce a structured inspection report.

ESTABLISHMENT: {data.establishment.name} ({data.establishment.establishment_id})
DEPARTMENT: {data.department.name}
INSPECTION DATE: {data.current_inspection.actual_date}
COMPLIANCE SCORE: {compliance}%

RISK ASSESSMENT:
Score: {risk_result.risk_score}/100 ({risk_result.risk_level})
Reasoning: {risk_result.explanation}

EVIDENCE CONSISTENCY CHECK:
Confidence: {evidence_result.confidence_score}/100
Flagged suspicious: {evidence_result.flagged_suspicious}
Mismatches: {', '.join(evidence_result.mismatches) or 'None'}
Notes: {evidence_result.explanation}

FINDINGS: {data.current_inspection.findings}

Respond in this exact format:
REPORT_SUMMARY: <3-4 sentence professional summary of the inspection findings, referencing the risk level and specific issues found>
VIOLATION_NOTICE: <a formal violation notice if risk_level is moderate or high, citing specific findings; write "None" if risk_level is low>
RECOMMENDED_ACTIONS: <comma-separated list of 2-4 specific actions supervisors should take>
CORRECTIVE_ACTIONS: <comma-separated list of 2-4 specific actions the establishment must take>
"""
    return prompt


def parse_report_response(raw: str) -> dict:
    result = {"report_summary": "", "violation_notice": None, "recommended_actions": [], "corrective_actions": []}
    for line in raw.split("\n"):
        if line.startswith("REPORT_SUMMARY:"):
            result["report_summary"] = line.split(":", 1)[1].strip()
        elif line.startswith("VIOLATION_NOTICE:"):
            val = line.split(":", 1)[1].strip()
            result["violation_notice"] = None if val.lower() == "none" else val
        elif line.startswith("RECOMMENDED_ACTIONS:"):
            val = line.split(":", 1)[1].strip()
            result["recommended_actions"] = [a.strip() for a in val.split(",") if a.strip()]
        elif line.startswith("CORRECTIVE_ACTIONS:"):
            val = line.split(":", 1)[1].strip()
            result["corrective_actions"] = [a.strip() for a in val.split(",") if a.strip()]
    return result


def generate_report_from_results(data: InspectionAnalysisRequest, risk_result, evidence_result) -> GeneratedReportResponse:
    llm = get_llm()
    prompt = build_report_prompt(data, risk_result, evidence_result)
    response = llm.invoke(prompt)
    parsed = parse_report_response(response.content)

    return GeneratedReportResponse(
        inspection_id=data.current_inspection.inspection_id,
        report_summary=parsed["report_summary"],
        violation_notice=parsed["violation_notice"],
        recommended_actions=parsed["recommended_actions"],
        corrective_actions=parsed["corrective_actions"],
    )


def run_report_agent(data: InspectionAnalysisRequest) -> GeneratedReportResponse:
    risk_result = run_risk_agent(data)
    evidence_result = run_evidence_agent(data)
    return generate_report_from_results(data, risk_result, evidence_result)