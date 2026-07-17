from schemas import InspectionSubmission, ChecklistItem

data = InspectionSubmission(
    inspection_id="INSP001",
    entity_id="ENT045",
    entity_name="Test Restaurant",
    inspection_type="food_safety",
    inspector_id="INS12",
    timestamp="2026-07-11T10:30:00",
    checklist=[
        ChecklistItem(item_id="C1", question="Temp check?", inspector_response="fail")
    ],
    inspector_observations="Meat left uncovered."
)

print(data.model_dump_json(indent=2))