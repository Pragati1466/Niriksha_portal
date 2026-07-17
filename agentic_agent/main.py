# main.py
from fastapi import FastAPI, HTTPException
from schemas import (
    InspectionAnalysisRequest,
    RiskScoreResponse,
    EvidenceVerificationResponse,
    GeneratedReportResponse,
)
from agents.risk_agent import run_risk_agent
from agents.evidence_agent import run_evidence_agent
from graph import run_full_pipeline

app = FastAPI(title="NIRIKSHA AI Intelligence Module")


@app.get("/")
def root():
    return {"status": "NIRIKSHA AI module is running"}


@app.post("/risk-score", response_model=RiskScoreResponse)
def risk_score(data: InspectionAnalysisRequest):
    try:
        return run_risk_agent(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify-evidence", response_model=EvidenceVerificationResponse)
def verify_evidence(data: InspectionAnalysisRequest):
    try:
        return run_evidence_agent(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-report", response_model=GeneratedReportResponse)
def generate_report(data: InspectionAnalysisRequest):
    try:
        final_state = run_full_pipeline(data)
        return final_state["report_result"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend-action")
def recommend_action(data: InspectionAnalysisRequest):
    try:
        final_state = run_full_pipeline(data)
        report = final_state["report_result"]
        return {
            "inspection_id": report.inspection_id,
            "recommended_actions": report.recommended_actions,
            "corrective_actions": report.corrective_actions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))