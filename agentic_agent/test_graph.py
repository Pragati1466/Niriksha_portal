# test_graph.py
from mock_data import (
    get_sample_inspection_high_risk,
    get_sample_inspection_moderate_risk,
    get_sample_inspection_low_risk,
)
from graph import run_full_pipeline

for name, sample in [
    ("HIGH", get_sample_inspection_high_risk()),
    ("MODERATE", get_sample_inspection_moderate_risk()),
    ("LOW", get_sample_inspection_low_risk()),
]:
    final_state = run_full_pipeline(sample)
    print(f"\n========== {name} ==========")
    print("RISK:", final_state["risk_result"].model_dump_json(indent=2))
    print("EVIDENCE:", final_state["evidence_result"].model_dump_json(indent=2))
    print("REPORT:", final_state["report_result"].model_dump_json(indent=2))