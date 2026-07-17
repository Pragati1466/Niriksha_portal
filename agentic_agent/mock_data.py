# mock_data.py
from schemas import (
    InspectionAnalysisRequest,
    PastInspection,
    Establishment,
    Department,
    Complaint,
)

DEPARTMENT_FOOD_SAFETY = Department(
    department_id="a338e2f8-957f-46aa-8d6e-5d00ffabcfda",
    name="Food Safety",
    code="FSSAI",
)


def get_sample_inspection_high_risk() -> InspectionAnalysisRequest:
    establishment = Establishment(
        establishment_id="ENT-HIGH-001",
        department_id=DEPARTMENT_FOOD_SAFETY.department_id,
        registration_number="FSSAI64839908",
        name="Sharma Sweets & Restaurant",
        owner_name="Owner Sharma",
        address="12 MG Road, Ghaziabad",
        latitude=28.6692,
        longitude=77.4538,
        pincode="201001",
        business_type="Restaurant",
        category="Large",
        contact_details={"phone": "9876543210"},
        registration_date="2022-05-10",
        expiry_date="2027-05-10",
        status="Registered",
        metadata={"turnover": 5000000},
        created_at="2026-07-12T13:03:25.771372",
    )

    current_inspection = PastInspection(
        inspection_id="INSP001",
        establishment_id=establishment.establishment_id,
        department_id=DEPARTMENT_FOOD_SAFETY.department_id,
        inspector_id="INS12",
        supervisor_id="SUP01",
        scheduled_date="2026-07-11T10:00:00",
        actual_date="2026-07-11T10:30:00",
        status="Completed",
        checklist={"compliance": 38.5},
        findings="Raw meat found unrefrigerated. Staff not wearing gloves during food preparation. Visible pest droppings near storage area.",
        risk_score_at_inspection=0,  # not yet calculated — this is what we're computing
        evidence_summary={"images": 2},
        created_at="2026-07-11T10:35:00",
    )

    complaints = [
        Complaint(
            complaint_id="C1", establishment_id=establishment.establishment_id,
            department_id=DEPARTMENT_FOOD_SAFETY.department_id,
            description="Found pests in kitchen area", category="Hygiene",
            priority="High", status="Resolved", created_at="2025-11-02T10:00:00",
        ),
        Complaint(
            complaint_id="C2", establishment_id=establishment.establishment_id,
            department_id=DEPARTMENT_FOOD_SAFETY.department_id,
            description="Food poisoning reported by customer", category="Safety",
            priority="High", status="Pending", created_at="2026-06-20T10:00:00",
        ),
        Complaint(
            complaint_id="C3", establishment_id=establishment.establishment_id,
            department_id=DEPARTMENT_FOOD_SAFETY.department_id,
            description="Unclean surroundings", category="Hygiene",
            priority="Medium", status="Pending", created_at="2026-06-25T10:00:00",
        ),
    ]

    inspection_history = [
        PastInspection(
            inspection_id="INSP000A", establishment_id=establishment.establishment_id,
            department_id=DEPARTMENT_FOOD_SAFETY.department_id,
            inspector_id="INS09", supervisor_id="SUP01",
            scheduled_date="2025-01-05T10:00:00", actual_date="2025-01-10T10:00:00",
            status="Completed", checklist={"compliance": 45.0},
            findings="Improper food storage observed.",
            risk_score_at_inspection=78,
            evidence_summary={"images": 3},
            created_at="2025-01-10T11:00:00",
        ),
    ]

    return InspectionAnalysisRequest(
        current_inspection=current_inspection,
        establishment=establishment,
        department=DEPARTMENT_FOOD_SAFETY,
        complaints=complaints,
        inspection_history=inspection_history,
    )


def get_sample_inspection_moderate_risk() -> InspectionAnalysisRequest:
    establishment = Establishment(
        establishment_id="ENT-MOD-001",
        department_id=DEPARTMENT_FOOD_SAFETY.department_id,
        registration_number="FSSAI11223344",
        name="Bombay Spice Corner",
        owner_name="Owner Verma",
        address="45 Sector 12, Noida",
        latitude=28.5804,
        longitude=77.3910,
        pincode="201301",
        business_type="Restaurant",
        category="Medium",
        contact_details={"phone": "9812345678"},
        registration_date="2021-03-15",
        expiry_date="2026-03-15",
        status="Registered",
        metadata={"turnover": 2000000},
        created_at="2026-07-12T13:03:25.771372",
    )

    current_inspection = PastInspection(
        inspection_id="INSP003",
        establishment_id=establishment.establishment_id,
        department_id=DEPARTMENT_FOOD_SAFETY.department_id,
        inspector_id="INS09",
        supervisor_id="SUP02",
        scheduled_date="2026-07-11T14:00:00",
        actual_date="2026-07-11T16:15:00",
        status="Completed",
        checklist={"compliance": 72.0},
        findings="Pest control certificate found expired 2 months ago. Overall kitchen reasonably clean, no active pest activity observed.",
        risk_score_at_inspection=0,
        evidence_summary={"images": 1},
        created_at="2026-07-11T16:20:00",
    )

    complaints = [
        Complaint(
            complaint_id="C4", establishment_id=establishment.establishment_id,
            department_id=DEPARTMENT_FOOD_SAFETY.department_id,
            description="Expired documentation seen", category="Compliance",
            priority="Medium", status="Resolved", created_at="2026-05-10T10:00:00",
        ),
    ]

    inspection_history = [
        PastInspection(
            inspection_id="INSP000B", establishment_id=establishment.establishment_id,
            department_id=DEPARTMENT_FOOD_SAFETY.department_id,
            inspector_id="INS07", supervisor_id="SUP02",
            scheduled_date="2025-05-10T10:00:00", actual_date="2025-05-12T10:00:00",
            status="Completed", checklist={"compliance": 68.0},
            findings="Expired pest control certificate noted.",
            risk_score_at_inspection=55,
            evidence_summary={"images": 2},
            created_at="2025-05-12T11:00:00",
        ),
    ]

    return InspectionAnalysisRequest(
        current_inspection=current_inspection,
        establishment=establishment,
        department=DEPARTMENT_FOOD_SAFETY,
        complaints=complaints,
        inspection_history=inspection_history,
    )


def get_sample_inspection_low_risk() -> InspectionAnalysisRequest:
    establishment = Establishment(
        establishment_id="ENT-LOW-001",
        department_id=DEPARTMENT_FOOD_SAFETY.department_id,
        registration_number="FSSAI99887766",
        name="Green Leaf Cafe",
        owner_name="Owner Kapoor",
        address="9 Park Street, Delhi",
        latitude=28.7041,
        longitude=77.1025,
        pincode="110001",
        business_type="Cafe",
        category="Small",
        contact_details={"phone": "9900112233"},
        registration_date="2020-01-01",
        expiry_date="2027-01-01",
        status="Registered",
        metadata={"turnover": 800000},
        created_at="2026-07-12T13:03:25.771372",
    )

    current_inspection = PastInspection(
        inspection_id="INSP002",
        establishment_id=establishment.establishment_id,
        department_id=DEPARTMENT_FOOD_SAFETY.department_id,
        inspector_id="INS07",
        supervisor_id="SUP02",
        scheduled_date="2026-07-11T14:00:00",
        actual_date="2026-07-11T14:00:00",
        status="Completed",
        checklist={"compliance": 96.0},
        findings="Kitchen was clean and well organized. All staff wore gloves and hairnets. No issues found.",
        risk_score_at_inspection=0,
        evidence_summary={"images": 4},
        created_at="2026-07-11T14:30:00",
    )

    return InspectionAnalysisRequest(
        current_inspection=current_inspection,
        establishment=establishment,
        department=DEPARTMENT_FOOD_SAFETY,
        complaints=[],
        inspection_history=[
            PastInspection(
                inspection_id="INSP000C", establishment_id=establishment.establishment_id,
                department_id=DEPARTMENT_FOOD_SAFETY.department_id,
                inspector_id="INS07", supervisor_id="SUP02",
                scheduled_date="2025-03-18T10:00:00", actual_date="2025-03-20T10:00:00",
                status="Completed", checklist={"compliance": 94.0},
                findings="Clean and compliant.",
                risk_score_at_inspection=10,
                evidence_summary={"images": 3},
                created_at="2025-03-20T11:00:00",
            ),
        ],
    )