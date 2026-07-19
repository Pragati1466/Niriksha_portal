"""
verify_helpers.py
Smoke-tests _extract_compliance and _extract_findings_text without any LLM call.
Run from agentic_agent/:  python verify_helpers.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from agents.risk_agent import _extract_compliance, _extract_findings_text, build_explanation_prompt, calculate_base_score
from mock_data import get_sample_inspection_high_risk, get_sample_inspection_low_risk, get_sample_inspection_moderate_risk

# ── _extract_compliance ────────────────────────────────────────────────────────
cases_compliance = [
    ({},                              None,  "empty dict"),
    ({"compliance": 79.36},           79.36, "standard key"),
    ({"compliance_score": 55.0},      55.0,  "alias key"),
    ({"score": 88.1},                 88.1,  "score key"),
    ({"unknown_key": 42.5},           42.5,  "single numeric fallback"),
    ({"a": "text", "b": "text"},      None,  "no numeric values"),
]

print("=== _extract_compliance ===")
all_ok = True
for checklist, expected, label in cases_compliance:
    result = _extract_compliance(checklist)
    ok = result == expected
    all_ok = all_ok and ok
    print(f"  {'OK' if ok else 'FAIL'} | {label:<35} -> {result!r}  (expected {expected!r})")

# ── _extract_findings_text ─────────────────────────────────────────────────────
import json
cases_findings = [
    ("",                                        "",                                   "empty string"),
    ("Plain findings text",                      "Plain findings text",                "plain string"),
    (json.dumps("Plain findings text"),          "Plain findings text",                "JSON-encoded string"),
    ("{}",                                      "",                                   "empty JSON object"),
    (json.dumps({"text": "Some findings"}),     "Some findings",                      "JSON object with text key"),
    (json.dumps({"summary": "Some findings"}),  "Some findings",                      "JSON object with summary key"),
    (json.dumps({}),                            "",                                   "JSON.stringify({})"),
    ("not { valid json",                         "not { valid json",                   "invalid JSON passthrough"),
]

print("\n=== _extract_findings_text ===")
for raw, expected, label in cases_findings:
    result = _extract_findings_text(raw)
    ok = result == expected
    all_ok = all_ok and ok
    print(f"  {'OK' if ok else 'FAIL'} | {label:<40} -> {result!r}")

# ── calculate_base_score unchanged ────────────────────────────────────────────
print("\n=== calculate_base_score (mock_data samples, must match pre-change) ===")
expected_scores = [
    ("HIGH",     get_sample_inspection_high_risk(),     58),
    ("MODERATE", get_sample_inspection_moderate_risk(), 16),
    ("LOW",      get_sample_inspection_low_risk(),       0),
]
for name, sample, expected in expected_scores:
    score = calculate_base_score(sample)
    ok = score == expected
    all_ok = all_ok and ok
    print(f"  {'OK' if ok else 'FAIL'} | {name:<10} score={score}  (expected {expected})")

# ── build_explanation_prompt uses helpers (no LLM) ────────────────────────────
print("\n=== build_explanation_prompt (structure check, no LLM) ===")
high = get_sample_inspection_high_risk()
prompt = build_explanation_prompt(high, 48, "high")
checks = [
    ("compliance_str in prompt", "38.5%" in prompt),
    ("findings plain text in prompt", "unrefrigerated" in prompt),
    ("not raw JSON in prompt", '"Raw meat' not in prompt),  # no leading quote
    ("complaints in prompt", "Safety" in prompt),
    ("history in prompt", "2025-01-10" in prompt),
]
for label, ok in checks:
    all_ok = all_ok and ok
    print(f"  {'OK' if ok else 'FAIL'} | {label}")

print()
print("Result:", "ALL PASSED" if all_ok else "SOME FAILURES — see above")
