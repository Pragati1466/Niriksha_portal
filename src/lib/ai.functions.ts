/**
 * ai.functions.ts
 *
 * Reusable functions for the NIRIKSHA AI Intelligence Module.
 * Endpoint: VITE_AI_API_URL (http://127.0.0.1:8000 by default)
 *
 * Types mirror the Pydantic schemas in agentic_agent/schemas.py exactly.
 * All four POST endpoints are covered:
 *   POST /risk-score        → RiskScoreResponse
 *   POST /verify-evidence   → EvidenceVerificationResponse
 *   POST /generate-report   → GeneratedReportResponse
 *   POST /recommend-action  → RecommendActionResponse
 */

const AI_URL = import.meta.env.VITE_AI_API_URL as string;

/* ─────────────────────────────────────────────────────────────
   Request payload types (mirror schemas.py InspectionAnalysisRequest)
───────────────────────────────────────────────────────────── */

export type AIDepartment = {
  department_id: string;
  name: string;
  code: string;
};

export type AIEstablishment = {
  establishment_id: string;
  department_id: string;
  registration_number: string;
  name: string;
  owner_name: string;
  address: string;
  latitude: number;
  longitude: number;
  pincode: string;
  business_type: string;
  category: string;
  contact_details?: Record<string, unknown>;
  registration_date: string;
  expiry_date: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type AIComplaint = {
  complaint_id: string;
  establishment_id: string;
  department_id: string;
  description: string;
  category: string;
  priority: string;  // "Low" | "Medium" | "High"
  status: string;
  created_at: string;
};

export type AIPastInspection = {
  inspection_id: string;
  establishment_id: string;
  department_id: string;
  inspector_id: string;
  supervisor_id: string;
  scheduled_date: string;
  actual_date: string;
  status: string;
  checklist?: Record<string, unknown>;
  findings: string;
  risk_score_at_inspection: number;
  evidence_summary?: Record<string, unknown>;
  created_at: string;
};

/** The combined payload all four AI endpoints accept. */
export type InspectionAnalysisRequest = {
  current_inspection: AIPastInspection;
  establishment: AIEstablishment;
  department: AIDepartment;
  complaints?: AIComplaint[];
  inspection_history?: AIPastInspection[];
  image_urls?: string[];
};

/* ─────────────────────────────────────────────────────────────
   Response types (mirror schemas.py response models)
───────────────────────────────────────────────────────────── */

export type RiskScoreResponse = {
  establishment_id: string;
  inspection_id: string;
  risk_score: number;
  risk_level: string;
  explanation: string;
};

export type EvidenceVerificationResponse = {
  inspection_id: string;
  confidence_score: number;
  mismatches: string[];
  flagged_suspicious: boolean;
  explanation: string;
};

export type GeneratedReportResponse = {
  inspection_id: string;
  report_summary: string;
  violation_notice: string | null;
  recommended_actions: string[];
  corrective_actions: string[];
};

/** /recommend-action returns a subset of the report fields. */
export type RecommendActionResponse = {
  inspection_id: string;
  recommended_actions: string[];
  corrective_actions: string[];
};

/* ─────────────────────────────────────────────────────────────
   Internal helper — typed POST fetch
───────────────────────────────────────────────────────────── */

async function aiPost<T>(endpoint: string, body: InspectionAnalysisRequest): Promise<T> {
  // TEMPORARY TRACE LOG — remove after diagnosis
  console.log(
    "[TRACE] aiPost",
    "| endpoint:", endpoint,
    "| complaints.length:", (body.complaints ?? []).length,
    "| inspection_history.length:", (body.inspection_history ?? []).length,
  );
  console.log(
    "[TRACE] aiPost inspection_history key fields:",
    (body.inspection_history ?? []).map((h) => ({
      inspection_id:    h.inspection_id,
      establishment_id: h.establishment_id,
      department_id:    h.department_id,
      created_at:       h.created_at,
    })),
  );

  const res = await fetch(`${AI_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = await res.json();
      const raw = errJson.detail;
      if (Array.isArray(raw)) {
        // FastAPI 422: detail is an array of Pydantic validation error objects
        // e.g. [{loc: ["body","current_inspection","risk_score_at_inspection"], msg: "...", type: "..."}]
        // Stringify each entry as "field → field: message" instead of [object Object]
        detail = raw
          .map((e: any) => {
            const loc = Array.isArray(e.loc) ? e.loc.join(" → ") : String(e.loc ?? "");
            const msg = String(e.msg ?? e.message ?? e);
            return loc ? `${loc}: ${msg}` : msg;
          })
          .join("; ");
      } else if (typeof raw === "string") {
        detail = raw;
      } else if (raw != null) {
        detail = JSON.stringify(raw);
      }
    } catch {
      // JSON parse failed — keep statusText
    }
    throw new Error(`AI API error (${res.status}): ${detail}`);
  }

  return res.json() as Promise<T>;
}

/* ─────────────────────────────────────────────────────────────
   Public API functions
───────────────────────────────────────────────────────────── */

/**
 * POST /risk-score
 * Runs the Risk Prioritization Agent and returns a scored risk assessment.
 */
export async function getRiskScore(
  payload: InspectionAnalysisRequest,
): Promise<RiskScoreResponse> {
  return aiPost<RiskScoreResponse>("/risk-score", payload);
}

/**
 * POST /verify-evidence
 * Runs the Evidence Verification Agent and returns confidence + mismatch info.
 */
export async function verifyEvidence(
  payload: InspectionAnalysisRequest,
): Promise<EvidenceVerificationResponse> {
  return aiPost<EvidenceVerificationResponse>("/verify-evidence", payload);
}

/**
 * POST /generate-report
 * Runs the full LangGraph pipeline and returns the generated inspection report.
 */
export async function generateReport(
  payload: InspectionAnalysisRequest,
): Promise<GeneratedReportResponse> {
  return aiPost<GeneratedReportResponse>("/generate-report", payload);
}

/**
 * POST /recommend-action
 * Runs the full LangGraph pipeline and returns only the action recommendations.
 */
export async function recommendAction(
  payload: InspectionAnalysisRequest,
): Promise<RecommendActionResponse> {
  return aiPost<RecommendActionResponse>("/recommend-action", payload);
}

/* ─────────────────────────────────────────────────────────────
   Builder helper
   Converts the InspectionDetail shape from supervisor.functions.ts
   into the flat InspectionAnalysisRequest the AI backend expects.

   This function is async: it fetches real complaint and inspection-
   history data for the establishment so the risk agent receives the
   full context it needs for scoring, not empty arrays.

   findings normalisation
   ─────────────────────
   The DB stores `findings` as JSONB.  Depending on what the inspector
   submitted it can be:
     • a plain string scalar  → comes back from Supabase as a JS string
     • an object              → comes back as a JS object
     • null / undefined
   The Python schema expects `findings: str`.  We normalise here:
     • JS string  → send as-is (plain text reaches Python unmodified)
     • JS object  → JSON.stringify so Python gets a parseable string
     • null       → send ""  (Python handles empty string gracefully)
───────────────────────────────────────────────────────────── */

import type {
  InspectionDetail,
  ComplaintRow,
  PastInspectionRow,
} from "@/lib/supervisor.functions";
import {
  getComplaintsForEstablishment,
  getInspectionHistoryForEstablishment,
} from "@/lib/supervisor.functions";

/** Normalise the findings value coming out of a Supabase JSONB column. */
function _normaliseFindingsForAI(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw);
}

export async function buildAIPayload(
  inspection: InspectionDetail & { _establishmentId?: string; _departmentId?: string },
): Promise<InspectionAnalysisRequest> {
  const estId  = (inspection as any)._establishmentId ?? "";
  const deptId = (inspection as any)._departmentId   ?? "";

  // ── Fetch real context in parallel ────────────────────────────────────────
  const [rawComplaints, rawHistory] = await Promise.all([
    getComplaintsForEstablishment(estId).catch(() => [] as ComplaintRow[]),
    getInspectionHistoryForEstablishment(estId, inspection.id).catch(
      () => [] as PastInspectionRow[],
    ),
  ]);

  // TEMPORARY TRACE LOG — remove after diagnosis
  console.log(
    "[TRACE] buildAIPayload",
    "| estId:", estId,
    "| inspection.id (exclude):", inspection.id,
    "| rawComplaints.length:", rawComplaints.length,
    "| rawHistory.length:", rawHistory.length,
  );
  if (rawHistory.length > 0) {
    console.log("[TRACE] buildAIPayload rawHistory[0] (post-RPC mapping):", rawHistory[0]);
  }

  // ── Map complaints to AIComplaint ──────────────────────────────────────────
  const complaints: AIComplaint[] = rawComplaints.map((c) => ({
    complaint_id:     c.complaint_id,
    establishment_id: c.establishment_id,
    department_id:    c.department_id,
    description:      c.description,
    category:         c.category,
    priority:         c.priority,
    status:           c.status,
    created_at:       c.created_at,
  }));

  // ── Map history rows to AIPastInspection ───────────────────────────────────
  const inspectionHistory: AIPastInspection[] = rawHistory.map((h) => ({
    inspection_id:              h.inspection_id,
    establishment_id:           h.establishment_id,
    department_id:              h.department_id,
    inspector_id:               h.inspector_id,
    supervisor_id:              h.supervisor_id,
    scheduled_date:             h.scheduled_date,
    actual_date:                h.actual_date,
    status:                     h.status,
    checklist:                  h.checklist,
    findings:                   h.findings,   // already normalised in getInspectionHistoryForEstablishment
    risk_score_at_inspection:   h.risk_score_at_inspection,
    evidence_summary:           h.evidence_summary,
    created_at:                 h.created_at,
  }));

  // ── Build current_inspection ───────────────────────────────────────────────
  const currentInspection: AIPastInspection = {
    inspection_id:            inspection.id,
    establishment_id:         estId,
    department_id:            deptId,
    inspector_id:             inspection.inspectorEmail ?? "",
    supervisor_id:            "",
    scheduled_date:           inspection.scheduledDate ?? new Date().toISOString(),
    actual_date:              inspection.actualDate    ?? new Date().toISOString(),
    status:                   inspection.status,
    checklist:                (inspection.checklist as Record<string, unknown>) ?? {},
    findings:                 _normaliseFindingsForAI(inspection.findings),
    risk_score_at_inspection: Math.round(inspection.riskScoreAtInspection ?? 0),
    evidence_summary:         (inspection.evidenceSummary as Record<string, unknown>) ?? {},
    created_at:               inspection.createdAt,
  };

  // ── Build establishment ────────────────────────────────────────────────────
  const establishment: AIEstablishment = {
    establishment_id:   estId,
    department_id:      deptId,
    registration_number: inspection.registrationNumber ?? "",
    name:               inspection.establishmentName,
    owner_name:         "",
    address:            inspection.establishmentAddress ?? "",
    latitude:           0,
    longitude:          0,
    pincode:            "",
    business_type:      "",
    category:           "",
    registration_date:  new Date().toISOString(),
    expiry_date:        new Date().toISOString(),
    status:             "active",
    created_at:         inspection.createdAt,
  };

  const department: AIDepartment = {
    department_id: deptId,
    name:          inspection.departmentName,
    code:          inspection.departmentCode,
  };

  return {
    current_inspection: currentInspection,
    establishment,
    department,
    complaints,
    inspection_history: inspectionHistory,
    image_urls: [],
  };
}
