"""
trace_request.py

Traces the exact Supabase queries executed by:
  getComplaintsForEstablishment()
  getInspectionHistoryForEstablishment()

for establishment_id = 55ffb98d-faff-4d5c-8168-e90863fa970b

Three query sets are run for each function:
  A) Exact query the function uses (authenticated scope via service key)
  B) No-filter count (is there ANY data in the table?)
  C) Sample of establishment_ids actually in the table
     (to check if the UUID matches)

Run from agentic_agent/:  python trace_request.py
"""
import json, urllib.request, urllib.error, sys

ESTABLISHMENT_ID = "55ffb98d-faff-4d5c-8168-e90863fa970b"

# The frontend uses VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY.
# We use the service-role key against the same URL so RLS is bypassed,
# letting us distinguish "no data" from "data hidden by RLS".
SUPABASE_URL = "https://ptbecipcpzbdsjoljqgt.supabase.co"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "InB0YmVjaXBjcHpiZHNqb2xqcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6"
    "MTc4NDI3NDU5MCwiZXhwIjoyMDk5ODUwNTkwfQ.RMd76uZxLeOXAMpbAuWmai8502wcVat4Ojj-VGf2c-0"
)
HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept":        "application/json",
}


def get(table: str, params: dict) -> list:
    """GET /rest/v1/<table>?<params> with Prefer: return=representation."""
    qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
    url = f"{SUPABASE_URL}/rest/v1/{table}?{qs}"
    req = urllib.request.Request(url, headers={**HEADERS, "Prefer": "count=exact"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = json.loads(resp.read().decode())
            return raw if isinstance(raw, list) else []
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read().decode()[:300]}")
        return []
    except Exception as e:
        print(f"    Error: {e}")
        return []

import urllib.parse   # noqa: E402 (needed above)


def divider(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — getComplaintsForEstablishment()
# ─────────────────────────────────────────────────────────────────────────────
divider("SECTION 1: getComplaintsForEstablishment()")

# 1A — Exact query the function executes
print("\n[1A] EXACT FUNCTION QUERY")
print(f"     table  : complaints")
print(f"     select : id, establishment_id, department_id, description,")
print(f"              category, priority, status, created_at")
print(f"     filter : establishment_id = eq.{ESTABLISHMENT_ID}")
print(f"     order  : created_at.desc  limit: 50")
complaints_exact = get("complaints", {
    "select":           "id,establishment_id,department_id,description,category,priority,status,created_at",
    "establishment_id": f"eq.{ESTABLISHMENT_ID}",
    "order":            "created_at.desc",
    "limit":            "50",
})
print(f"\n     ROWS RETURNED: {len(complaints_exact)}")
if complaints_exact:
    for i, r in enumerate(complaints_exact):
        print(f"     [{i+1}] id={r['id']}  priority={r['priority']}  "
              f"status={r['status']}  category={r['category']}")
        print(f"          description: {str(r.get('description',''))[:80]}")

# 1B — Total rows in complaints table (no filter, service role bypasses RLS)
print("\n[1B] TOTAL ROWS IN complaints TABLE (no filter, service role)")
complaints_all = get("complaints", {
    "select": "id",
    "limit":  "1000",
})
print(f"     Total rows (up to 1000): {len(complaints_all)}")

# 1C — Which establishment_ids appear in complaints?
print("\n[1C] DISTINCT establishment_ids IN complaints (first 20 rows)")
complaints_sample = get("complaints", {
    "select": "establishment_id,id",
    "limit":  "20",
})
seen_ids = []
for r in complaints_sample:
    eid = r["establishment_id"]
    if eid not in seen_ids:
        seen_ids.append(eid)
print(f"     Sample establishment_ids found: {len(seen_ids)}")
for eid in seen_ids[:10]:
    match = " ← MATCH" if eid == ESTABLISHMENT_ID else ""
    print(f"       {eid}{match}")

# 1D — Does our establishment_id exist in the establishments table?
print("\n[1D] ESTABLISHMENT ROW for this id")
estab = get("establishments", {
    "select": "id,name,department_id,business_type,category",
    "id":     f"eq.{ESTABLISHMENT_ID}",
    "limit":  "1",
})
if estab:
    e = estab[0]
    print(f"     EXISTS: name={e['name']}  dept={e['department_id']}")
    print(f"             business_type={e['business_type']}  category={e['category']}")
else:
    print(f"     NOT FOUND — establishment_id does not exist in establishments table")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — getInspectionHistoryForEstablishment()
# ─────────────────────────────────────────────────────────────────────────────
divider("SECTION 2: getInspectionHistoryForEstablishment()")

# 2A — First find the current (latest) inspection to get its id
print("\n[2A] LATEST INSPECTION (to get excludeInspectionId)")
latest_insp = get("inspections", {
    "select":           "id,status,actual_date,risk_score_at_inspection,checklist",
    "establishment_id": f"eq.{ESTABLISHMENT_ID}",
    "order":            "created_at.desc",
    "limit":            "1",
})
if not latest_insp:
    print("     NO INSPECTIONS FOUND for this establishment_id")
    current_insp_id = "NO-INSPECTION"
else:
    ci = latest_insp[0]
    current_insp_id = ci["id"]
    print(f"     id:                       {ci['id']}")
    print(f"     status:                   {ci['status']}")
    print(f"     actual_date:              {ci['actual_date']}")
    print(f"     risk_score_at_inspection: {ci['risk_score_at_inspection']}")
    print(f"     checklist:                {json.dumps(ci['checklist'])[:100]}")

# 2B — Exact query the function executes
print(f"\n[2B] EXACT FUNCTION QUERY")
print(f"     table  : inspections")
print(f"     select : id, establishment_id, department_id, inspector_id,")
print(f"              supervisor_id, scheduled_date, actual_date, status,")
print(f"              checklist, findings, risk_score_at_inspection,")
print(f"              evidence_summary, created_at")
print(f"     filter : establishment_id = eq.{ESTABLISHMENT_ID}")
print(f"              id              = neq.{current_insp_id}")
print(f"     order  : actual_date.desc  limit: 10")
history_exact = get("inspections", {
    "select":           "id,establishment_id,department_id,inspector_id,"
                        "supervisor_id,scheduled_date,actual_date,status,"
                        "checklist,findings,risk_score_at_inspection,"
                        "evidence_summary,created_at",
    "establishment_id": f"eq.{ESTABLISHMENT_ID}",
    "id":               f"neq.{current_insp_id}",
    "order":            "actual_date.desc",
    "limit":            "10",
})
print(f"\n     ROWS RETURNED: {len(history_exact)}")
if history_exact:
    for i, h in enumerate(history_exact):
        print(f"     [{i+1}] id={h['id']}  status={h['status']}  "
              f"actual_date={h['actual_date']}  "
              f"risk_score={h['risk_score_at_inspection']}")
        print(f"          checklist: {json.dumps(h.get('checklist', {}))[:80]}")

# 2C — ALL inspections for this establishment (no exclusion)
print(f"\n[2C] ALL INSPECTIONS for this establishment_id (no exclusion filter)")
all_insp_for_est = get("inspections", {
    "select":           "id,status,actual_date,risk_score_at_inspection",
    "establishment_id": f"eq.{ESTABLISHMENT_ID}",
    "order":            "actual_date.desc",
    "limit":            "20",
})
print(f"     Total rows: {len(all_insp_for_est)}")
for i, h in enumerate(all_insp_for_est):
    marker = " ← current (excluded)" if h["id"] == current_insp_id else ""
    print(f"     [{i+1}] id={h['id']}  status={h['status']}  "
          f"actual_date={h['actual_date']}  "
          f"risk_score={h['risk_score_at_inspection']}{marker}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — RLS check
# ─────────────────────────────────────────────────────────────────────────────
divider("SECTION 3: RLS IMPACT ANALYSIS")

print("\n[3A] Service-role results vs authenticated-role simulation")
print("     The queries above used the service-role key (RLS bypassed).")
print("     The frontend uses an authenticated user JWT.")
print()

# Check if complaints table has RLS enabled by checking pg_tables via RPC
# (service role bypasses it, so if we see rows above but frontend sees 0,
#  that is a RLS issue)
print("[3B] COMPLAINTS TABLE — rows visible to service role:")
print(f"     Total complaint rows (any establishment): {len(complaints_all)}")
print(f"     Rows for our establishment_id:            {len(complaints_exact)}")
print()
print("[3C] INSPECTIONS TABLE — rows for our establishment:")
print(f"     Total inspections (any):                  ", end="")
all_insp = get("inspections", {"select": "id", "limit": "1000"})
print(len(all_insp))
print(f"     For our establishment_id:                 {len(all_insp_for_est)}")
print(f"     After excluding current inspection:       {len(history_exact)}")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Predicted payload summary
# ─────────────────────────────────────────────────────────────────────────────
divider("SECTION 4: PREDICTED buildAIPayload() VALUES")

print(f"\n  complaints array length      : {len(complaints_exact)}")
print(f"  inspection_history array len : {len(history_exact)}")
print()

if len(complaints_exact) == 0:
    if len(complaints_all) == 0:
        reason = "complaints TABLE IS EMPTY — no data was seeded"
    elif ESTABLISHMENT_ID not in [r['establishment_id'] for r in complaints_sample]:
        reason = (
            "establishment_id NOT FOUND in complaints table — "
            "this establishment has no complaints in the DB"
        )
    else:
        reason = "UNKNOWN — rows exist but query returned 0 (possible RLS)"
    print(f"  complaints [] REASON: {reason}")

if len(history_exact) == 0:
    total_for_est = len(all_insp_for_est)
    if total_for_est == 0:
        reason = "NO INSPECTIONS AT ALL for this establishment_id"
    elif total_for_est == 1:
        reason = (
            f"ONLY 1 INSPECTION EXISTS (id={current_insp_id}) — "
            "it is the current one and is excluded by the neq filter. "
            "No prior history exists in the DB."
        )
    else:
        reason = f"UNEXPECTED — {total_for_est} inspections exist but history query returned 0"
    print(f"  inspection_history [] REASON: {reason}")

print()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Predicted risk_score
# ─────────────────────────────────────────────────────────────────────────────
divider("SECTION 5: PREDICTED risk_score FROM calculate_base_score()")

PRIORITY_WEIGHTS = {"High": 10, "Medium": 5, "Low": 2}
unresolved = [c for c in complaints_exact if c["status"].lower() != "resolved"]
resolved   = [c for c in complaints_exact if c["status"].lower() == "resolved"]
cs  = sum(PRIORITY_WEIGHTS.get(c["priority"], 2) for c in unresolved)
cs += sum(PRIORITY_WEIGHTS.get(c["priority"], 2) * 0.3 for c in resolved)
complaint_pts = min(cs, 30)

phr = sum(1 for h in history_exact if (h.get("risk_score_at_inspection") or 0) >= 70)
history_pts = min(phr * 10, 40)

checklist = (latest_insp[0].get("checklist") or {}) if latest_insp else {}
compliance = checklist.get("compliance", 100) if isinstance(checklist, dict) else 100
if   compliance < 50:  comp_pts = 30
elif compliance < 75:  comp_pts = 15
elif compliance < 90:  comp_pts = 5
else:                  comp_pts = 0

total = min(int(complaint_pts + history_pts + comp_pts), 100)

print(f"\n  rule 1 complaints : {complaint_pts:.1f} pts "
      f"(unresolved={len(unresolved)}, resolved={len(resolved)})")
print(f"  rule 2 history    : {history_pts} pts  (past high-risk >=70: {phr})")
print(f"  rule 3 compliance : {compliance} -> {comp_pts} pts")
print(f"\n  PREDICTED risk_score : {total}")
print()
