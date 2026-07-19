from mock_data import get_sample_inspection_high_risk
from agents.report_agent import run_report_agent

sample = get_sample_inspection_high_risk()
result = run_report_agent(sample)
print(result.model_dump_json(indent=2))