from mock_data import get_sample_inspection_high_risk,get_sample_inspection_low_risk,get_sample_inspection_moderate_risk

high_risk = get_sample_inspection_high_risk()
low_risk = get_sample_inspection_low_risk()
moderate_risk = get_sample_inspection_moderate_risk()

print("HIGH RISK SAMPLE:")
print(high_risk.model_dump_json(indent=2))
print("\nLOW RISK SAMPLE:")
print(low_risk.model_dump_json(indent=2))
print("\nMODERATE RISK SAMPLE:")
print(moderate_risk.model_dump_json(indent=2))
