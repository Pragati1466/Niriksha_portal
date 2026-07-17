# agents/evidence_agent.py
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from schemas import InspectionAnalysisRequest, EvidenceVerificationResponse

load_dotenv()


def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2,
    )


def build_verification_prompt(data: InspectionAnalysisRequest) -> str:
    compliance = data.current_inspection.checklist.get("compliance", "N/A")
    image_count = data.current_inspection.evidence_summary.get("images", 0)

    unresolved_high = [c for c in data.complaints if c.status.lower() != "resolved" and c.priority == "High"]

    prompt = f"""You are an evidence consistency analyst for a regulatory inspection system. No photos are available — evaluate ONLY whether the reported data is internally consistent. Look for mismatches between the findings text, the compliance score, the number of evidence images logged, and the complaint history.

Findings text: {data.current_inspection.findings}
Compliance score recorded: {compliance}%
Number of evidence images logged: {image_count}
Unresolved high-priority complaints: {len(unresolved_high)}
All complaints: {"; ".join(c.description for c in data.complaints) or "None"}

Flag it as suspicious if, for example: the findings describe serious violations but the compliance score is high, or serious findings are backed by very few logged images, or there are multiple unresolved high-priority complaints that the findings don't mention at all.

Respond in this exact format:
CONFIDENCE_SCORE: <0-100, how internally consistent and trustworthy this report appears>
MISMATCHES: <comma-separated list of specific inconsistencies found, or "None">
SUSPICIOUS: <true or false>
EXPLANATION: <2-3 sentences explaining your reasoning, citing the specific numbers/facts above>
"""
    return prompt


def parse_response(raw: str) -> dict:
    result = {"confidence_score": 50, "mismatches": [], "suspicious": False, "explanation": raw}
    for line in raw.split("\n"):
        if line.startswith("CONFIDENCE_SCORE:"):
            try:
                result["confidence_score"] = int(line.split(":", 1)[1].strip())
            except ValueError:
                pass
        elif line.startswith("MISMATCHES:"):
            val = line.split(":", 1)[1].strip()
            result["mismatches"] = [] if val.lower() == "none" else [m.strip() for m in val.split(",")]
        elif line.startswith("SUSPICIOUS:"):
            result["suspicious"] = "true" in line.lower()
        elif line.startswith("EXPLANATION:"):
            result["explanation"] = line.split(":", 1)[1].strip()
    return result


def run_evidence_agent(data: InspectionAnalysisRequest) -> EvidenceVerificationResponse:
    llm = get_llm()
    prompt = build_verification_prompt(data)
    response = llm.invoke(prompt)
    parsed = parse_response(response.content)

    return EvidenceVerificationResponse(
        inspection_id=data.current_inspection.inspection_id,
        confidence_score=parsed["confidence_score"],
        mismatches=parsed["mismatches"],
        flagged_suspicious=parsed["suspicious"],
        explanation=parsed["explanation"],
    )