# schemas.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class Department(BaseModel):
    department_id: str
    name: str
    code: str


class Establishment(BaseModel):
    establishment_id: str
    department_id: str
    registration_number: str
    name: str
    owner_name: str
    address: str
    latitude: float
    longitude: float
    pincode: str
    business_type: str
    category: str
    contact_details: Dict[str, Any] = {}
    registration_date: str
    expiry_date: str
    status: str
    metadata: Dict[str, Any] = {}
    created_at: str


class Complaint(BaseModel):
    complaint_id: str
    establishment_id: str
    department_id: str
    description: str
    category: str
    priority: str       # Low / Medium / High
    status: str         # Resolved / Pending / etc
    created_at: str


class PastInspection(BaseModel):
    inspection_id: str
    establishment_id: str
    department_id: str
    inspector_id: str
    supervisor_id: str
    scheduled_date: str
    actual_date: str
    status: str
    checklist: Dict[str, Any] = {}          # e.g. {"compliance": 79.36}
    findings: str
    risk_score_at_inspection: int
    evidence_summary: Dict[str, Any] = {}   # e.g. {"images": 8}
    created_at: str


class RiskScoreRecord(BaseModel):
    risk_id: str
    establishment_id: str
    department_id: str
    risk_score: int
    risk_level: str
    calculated_at: str
    factors: Dict[str, Any] = {}
    last_inspection_date: str
    next_due_date: str


class User(BaseModel):
    user_id: str
    department_id: str
    role: str
    name: str
    email: str
    phone: str
    employee_id: str
    jurisdiction: Dict[str, Any] = {}
    created_at: str


# ---- This is the combined payload your AI module actually receives ----
# One current inspection + its related context, assembled from Pragati's tables

class InspectionAnalysisRequest(BaseModel):
    current_inspection: PastInspection
    establishment: Establishment
    department: Department
    complaints: List[Complaint] = []
    inspection_history: List[PastInspection] = []
    image_urls: List[str] = []   # see note below — not directly in her schema


# ---- Your response models (unchanged in spirit, same as before) ----

class RiskScoreResponse(BaseModel):
    establishment_id: str
    inspection_id: str
    risk_score: int
    risk_level: str
    explanation: str


class EvidenceVerificationResponse(BaseModel):
    inspection_id: str
    confidence_score: int
    mismatches: List[str] = []
    flagged_suspicious: bool
    explanation: str


class GeneratedReportResponse(BaseModel):
    inspection_id: str
    report_summary: str
    violation_notice: Optional[str] = None
    recommended_actions: List[str] = []
    corrective_actions: List[str] = []