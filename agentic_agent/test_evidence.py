from mock_data import get_sample_inspection_low_risk
from agents.evidence_agent import run_evidence_agent

sample = get_sample_inspection_low_risk()
result = run_evidence_agent(sample)
print(result.model_dump_json(indent=2))