
# without gemini call for test
# from mock_data import (
#     get_sample_inspection_high_risk,
#     get_sample_inspection_moderate_risk,
#     get_sample_inspection_low_risk,
# )
# from agents.risk_agent import calculate_base_score, get_risk_level

# for name, sample in [
#     ("HIGH", get_sample_inspection_high_risk()),
#     ("MODERATE", get_sample_inspection_moderate_risk()),
#     ("LOW", get_sample_inspection_low_risk()),
# ]:
#     score = calculate_base_score(sample)
#     level = get_risk_level(score)
#     print(f"{name} sample -> score: {score}, level: {level}")




# INCLUDING GEMINI CALL
# test_risk_score.py
from mock_data import (
    get_sample_inspection_high_risk,
    get_sample_inspection_moderate_risk,
    get_sample_inspection_low_risk,
)
from agents.risk_agent import run_risk_agent

for name, sample in [
    ("HIGH", get_sample_inspection_high_risk()),
    ("MODERATE", get_sample_inspection_moderate_risk()),
    ("LOW", get_sample_inspection_low_risk()),
]:
    result = run_risk_agent(sample)
    print(f"\n=== {name} ===")
    print(result.model_dump_json(indent=2))