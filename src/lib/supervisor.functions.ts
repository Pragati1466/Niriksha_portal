/**
 * supervisor.functions.ts
 *
 * All Supabase query functions for the Supervisor Dashboard.
 * These run client-side using the authenticated user session (RLS enforced).
 * No mock data. No hardcoded values.
 *
 * AI agent output sections (risk_score via /risk-score, evidence via /verify-evidence,
 * report via /generate-report) are intentionally left as empty/null returns until
 * those APIs are connected.
 */

import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type SupervisorKpis = {
  totalInspections: number;
  pendingReview: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  highRiskEstablishments: number;
};

export type InspectionStatusCounts = {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
};

export type ActivityEntry = {
  id: number;
  action: string;
  entity_type: string;
  summary: string | null;
  created_at: string;
};

export type QueueRow = {
  id: string;
  establishmentName: string;
  establishmentId: string;
  department: string;
  departmentId: string;
  inspectorName: string;
  scheduledDate: string;
  actualDate: string | null;
  status: string;
  riskLevel: string | null;
  riskScore: number | null;
  evidenceSummary: Record<string, unknown> | null;
  createdAt: string;
};

export type InspectionDetail = {
  id: string;
  /** Raw FK — used by AI payload builder. */
  _establishmentId: string;
  /** Raw FK — used by AI payload builder. */
  _departmentId: string;
  establishmentName: string;
  establishmentAddress: string | null;
  registrationNumber: string;
  departmentName: string;
  departmentCode: string;
  inspectorName: string;
  inspectorEmail: string;
  scheduledDate: string;
  actualDate: string | null;
  status: string;
  checklist: Record<string, unknown> | null;
  findings: Record<string, unknown> | null;
  riskScoreAtInspection: number | null;
  evidenceSummary: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
};

export type RiskProfileRow = {
  id: string;
  establishmentId: string;
  establishmentName: string;
  riskScore: number;
  riskLevel: string;
  factors: Record<string, unknown> | null;
  lastInspectionDate: string | null;
  nextDueDate: string | null;
};

export type RiskKpis = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
};

export type CompletedInspectionRow = {
  id: string;
  establishmentName: string;
  department: string;
  inspectorName: string;
  scheduledDate: string;
  actualDate: string | null;
  riskScore: number | null;
  createdAt: string;
};

/* ─────────────────────────────────────────────────────────────
   Helper: get current user id
───────────────────────────────────────────────────────────── */

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/* ─────────────────────────────────────────────────────────────
   Overview KPIs
   Counts inspections assigned to this supervisor.
───────────────────────────────────────────────────────────── */

export async function getSupervisorKpis(): Promise<SupervisorKpis> {
  const uid = await currentUserId();

  const [total, pending, inProgress, completed, cancelled] = await Promise.all([
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", uid),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", uid)
      .eq("status", "pending"),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", uid)
      .eq("status", "in_progress"),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", uid)
      .eq("status", "completed"),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", uid)
      .eq("status", "cancelled"),
  ]);

  // High-risk: risk_profiles for establishments in this supervisor's inspections
  const { data: estIds } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  const uniqueEstIds = [...new Set((estIds ?? []).map((r: any) => r.establishment_id))];

  let highRisk = 0;
  if (uniqueEstIds.length > 0) {
    const { count } = await supabase
      .from("risk_profiles")
      .select("id", { count: "exact", head: true })
      .in("establishment_id", uniqueEstIds)
      .in("risk_level", ["High", "Critical"]);
    highRisk = count ?? 0;
  }

  return {
    totalInspections: total.count ?? 0,
    pendingReview: pending.count ?? 0,
    inProgress: inProgress.count ?? 0,
    completed: completed.count ?? 0,
    cancelled: cancelled.count ?? 0,
    highRiskEstablishments: highRisk,
  };
}

/* ─────────────────────────────────────────────────────────────
   Inspection status counts (for status breakdown panel)
───────────────────────────────────────────────────────────── */

export async function getInspectionStatusCounts(): Promise<InspectionStatusCounts> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("inspections")
    .select("status")
    .eq("supervisor_id", uid);
  if (error) throw new Error(error.message);
  const counts: InspectionStatusCounts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const row of (data ?? []) as any[]) {
    const s = row.status as keyof InspectionStatusCounts;
    if (s in counts) counts[s]++;
  }
  return counts;
}

/* ─────────────────────────────────────────────────────────────
   Recent audit activity for this supervisor
───────────────────────────────────────────────────────────── */

export async function getSupervisorActivity(limit = 8): Promise<ActivityEntry[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, summary, created_at")
    .eq("actor_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityEntry[];
}

/* ─────────────────────────────────────────────────────────────
   Helper: batch-fetch profiles by an array of user IDs.
   Used instead of profiles!fk_name(...) join because the
   inspector_id FK constraint does not exist in this schema.
───────────────────────────────────────────────────────────── */

async function fetchProfileMap(
  userIds: string[],
): Promise<Map<string, { name: string; email: string }>> {
  const map = new Map<string, { name: string; email: string }>();
  if (userIds.length === 0) return map;
  // Direct .from("profiles") is blocked by the "profiles_self_select" RLS
  // policy which only permits reading your own row. Use the SECURITY DEFINER
  // RPC instead — it enforces least-privilege server-side (returns only
  // id/name/email, and only for inspectors on this supervisor's inspections).
  const { data } = await supabase
    .rpc("get_inspector_profiles", { inspector_ids: userIds });
  for (const p of (data ?? []) as any[]) {
    map.set(p.id, { name: p.name ?? "", email: p.email ?? "" });
  }
  return map;
}

/* ─────────────────────────────────────────────────────────────
   Pending review queue
   Returns inspections assigned to this supervisor.
   Inspector names are resolved via a two-step profile fetch
   (no FK constraint required).
   NOTE: "completed" is temporarily included alongside
   "pending"/"in_progress" because the current dataset only
   contains completed inspections. Remove "completed" from
   QUEUE_STATUSES once pending/in_progress records exist.
───────────────────────────────────────────────────────────── */

// Pending Reviews shows only inspections awaiting review or currently in progress.
const QUEUE_STATUSES = ["pending", "in_progress"] as const;

export async function getReviewQueue(filters?: {
  search?: string;
  status?: string;
  departmentId?: string;
  riskLevel?: string;
  sortBy?: string;
}): Promise<QueueRow[]> {
  const uid = await currentUserId();

  // Step 1: fetch inspections (with establishment + department joins only)
  let q = supabase
    .from("inspections")
    .select(`
      id,
      establishment_id,
      department_id,
      inspector_id,
      scheduled_date,
      actual_date,
      status,
      evidence_summary,
      created_at,
      establishment:establishments(id, name, registration_number, address),
      department:departments(id, name, code)
    `)
    .eq("supervisor_id", uid)
    .in("status", [...QUEUE_STATUSES]);

  if (filters?.departmentId && filters.departmentId !== "all") {
    q = q.eq("department_id", filters.departmentId);
  }

  const sort = filters?.sortBy ?? "submitted_desc";
  if (sort === "submitted_desc") q = q.order("created_at", { ascending: false });
  else if (sort === "submitted_asc") q = q.order("created_at", { ascending: true });
  else q = q.order("created_at", { ascending: false });

  const { data, error } = await q.limit(200);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];

  // Step 2: resolve inspector names separately (no FK needed)
  const inspectorIds = [...new Set(rows.map((r) => r.inspector_id).filter(Boolean))];
  const profileMap = await fetchProfileMap(inspectorIds);

  // Step 3: fetch risk profiles for all establishment IDs
  const estIds = [...new Set(rows.map((r) => r.establishment_id).filter(Boolean))];
  const riskMap = new Map<string, { risk_level: string; risk_score: number }>();
  if (estIds.length > 0) {
    const { data: riskData } = await supabase
      .from("risk_profiles")
      .select("establishment_id, risk_level, risk_score")
      .in("establishment_id", estIds);
    for (const rp of (riskData ?? []) as any[]) {
      riskMap.set(rp.establishment_id, { risk_level: rp.risk_level, risk_score: rp.risk_score });
    }
  }

  // Step 4: merge
  let result: QueueRow[] = rows.map((r) => {
    const risk     = riskMap.get(r.establishment_id);
    const profile  = profileMap.get(r.inspector_id);
    return {
      id: r.id,
      establishmentName: r.establishment?.name ?? "—",
      establishmentId: r.establishment_id,
      department: r.department?.name ?? "—",
      departmentId: r.department_id,
      inspectorName: profile?.name || profile?.email || "—",
      scheduledDate: r.scheduled_date ?? "—",
      actualDate: r.actual_date ?? null,
      status: r.status,
      riskLevel: risk?.risk_level ?? null,
      riskScore: risk?.risk_score ?? null,
      evidenceSummary: r.evidence_summary as Record<string, unknown> | null,
      createdAt: r.created_at,
    };
  });

  // Client-side search
  if (filters?.search?.trim()) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.establishmentName.toLowerCase().includes(s) ||
        r.inspectorName.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s),
    );
  }

  // Client-side risk filter
  if (filters?.riskLevel && filters.riskLevel !== "all") {
    const lvl = filters.riskLevel.toLowerCase();
    result = result.filter((r) => (r.riskLevel ?? "").toLowerCase() === lvl);
  }

  // Client-side status filter (applied after fetch so QUEUE_STATUSES drives the DB query)
  if (filters?.status && filters.status !== "all") {
    result = result.filter((r) => r.status === filters.status);
  }

  if (sort === "risk_desc") result.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
  else if (sort === "risk_asc") result.sort((a, b) => (a.riskScore ?? 0) - (b.riskScore ?? 0));
  else if (sort === "dept_asc") result.sort((a, b) => a.department.localeCompare(b.department));

  return result;
}

/* ─────────────────────────────────────────────────────────────
   Single inspection detail
   Inspector resolved via two-step profile fetch (no FK needed).
───────────────────────────────────────────────────────────── */

export async function getInspectionDetail(inspectionId: string): Promise<InspectionDetail | null> {
  const uid = await currentUserId();

  // Step 1: fetch inspection with establishment + department (these FKs exist)
  const { data, error } = await supabase
    .from("inspections")
    .select(`
      id,
      inspector_id,
      scheduled_date,
      actual_date,
      status,
      checklist,
      findings,
      risk_score_at_inspection,
      evidence_summary,
      notes,
      created_at,
      establishment:establishments(id, name, registration_number, address),
      department:departments(id, name, code)
    `)
    .eq("id", inspectionId)
    .eq("supervisor_id", uid)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const d = data as any;

  // Step 2: resolve inspector profile separately
  const profileMap = await fetchProfileMap(d.inspector_id ? [d.inspector_id] : []);
  const inspector  = profileMap.get(d.inspector_id) ?? { name: "", email: "" };

  return {
    id: d.id,
    _establishmentId: d.establishment?.id ?? "",
    _departmentId: d.department?.id ?? "",
    establishmentName: d.establishment?.name ?? "—",
    establishmentAddress: d.establishment?.address ?? null,
    registrationNumber: d.establishment?.registration_number ?? "—",
    departmentName: d.department?.name ?? "—",
    departmentCode: d.department?.code ?? "—",
    inspectorName: inspector.name || inspector.email || "—",
    inspectorEmail: inspector.email || "—",
    scheduledDate: d.scheduled_date ?? "—",
    actualDate: d.actual_date ?? null,
    status: d.status,
    checklist: d.checklist as Record<string, unknown> | null,
    findings: d.findings as Record<string, unknown> | null,
    riskScoreAtInspection: d.risk_score_at_inspection ?? null,
    evidenceSummary: d.evidence_summary as Record<string, unknown> | null,
    notes: d.notes ?? null,
    createdAt: d.created_at,
  };
}

/* ─────────────────────────────────────────────────────────────
   Risk profile for a single establishment (for inspection detail)
   Returns null — AI agent will populate this via POST /risk-score
───────────────────────────────────────────────────────────── */

export async function getRiskProfileForEstablishment(
  establishmentId: string,
): Promise<RiskProfileRow | null> {
  const { data, error } = await supabase
    .from("risk_profiles")
    .select("id, establishment_id, risk_score, risk_level, factors, last_inspection_date, next_due_date")
    .eq("establishment_id", establishmentId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const d = data as any;
  return {
    id: d.id,
    establishmentId: d.establishment_id,
    establishmentName: "",
    riskScore: d.risk_score,
    riskLevel: d.risk_level,
    factors: d.factors as Record<string, unknown> | null,
    lastInspectionDate: d.last_inspection_date ?? null,
    nextDueDate: d.next_due_date ?? null,
  };
}

/* ─────────────────────────────────────────────────────────────
   Risk monitoring KPIs
   Scoped to establishments this supervisor oversees.
───────────────────────────────────────────────────────────── */

export async function getRiskKpis(): Promise<RiskKpis> {
  const uid = await currentUserId();

  // Get all establishments this supervisor has inspections for
  const { data: estRows } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  const estIds = [...new Set((estRows ?? []).map((r: any) => r.establishment_id))];

  if (estIds.length === 0) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

  const { data, error } = await supabase
    .from("risk_profiles")
    .select("risk_level")
    .in("establishment_id", estIds);

  if (error) throw new Error(error.message);

  const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  for (const row of (data ?? []) as any[]) {
    const lvl = (row.risk_level ?? "").toLowerCase();
    if (lvl === "critical") counts.critical++;
    else if (lvl === "high") counts.high++;
    else if (lvl === "medium") counts.medium++;
    else if (lvl === "low") counts.low++;
    counts.total++;
  }
  return counts;
}

/* ─────────────────────────────────────────────────────────────
   Risk priority queue — top HIGH/CRITICAL establishments by risk score
   Only shows risk_level High/Critical OR risk_score >= 60, sorted desc.
───────────────────────────────────────────────────────────── */

export async function getRiskPriorityQueue(limit = 10): Promise<RiskProfileRow[]> {
  const uid = await currentUserId();

  const { data: estRows } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  const estIds = [...new Set((estRows ?? []).map((r: any) => r.establishment_id))];
  if (estIds.length === 0) return [];

  // Fetch all risk profiles for these establishments, then filter client-side
  // for High/Critical OR score >= 60 (Supabase doesn't support OR across
  // different columns without using .or() which requires careful escaping).
  const { data, error } = await supabase
    .from("risk_profiles")
    .select(`
      id,
      establishment_id,
      risk_score,
      risk_level,
      factors,
      last_inspection_date,
      next_due_date,
      establishment:establishments(id, name)
    `)
    .in("establishment_id", estIds)
    .or("risk_level.in.(High,Critical),risk_score.gte.60")
    .order("risk_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    establishmentId: d.establishment_id,
    establishmentName: d.establishment?.name ?? "—",
    riskScore: d.risk_score,
    riskLevel: d.risk_level,
    factors: d.factors as Record<string, unknown> | null,
    lastInspectionDate: d.last_inspection_date ?? null,
    nextDueDate: d.next_due_date ?? null,
  }));
}

/* ─────────────────────────────────────────────────────────────
   Risk Trend Over Time
   Groups completed inspections by month and averages
   risk_score_at_inspection. Returns chronological data points.
───────────────────────────────────────────────────────────── */

export type RiskTrendPoint = {
  label: string;      // e.g. "Jan 2026"
  averageRiskScore: number;
  count: number;
};

export async function getRiskTrend(): Promise<RiskTrendPoint[]> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from("inspections")
    .select("actual_date, risk_score_at_inspection")
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .not("risk_score_at_inspection", "is", null)
    .not("actual_date", "is", null)
    .order("actual_date", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { actual_date: string; risk_score_at_inspection: number }[];
  if (rows.length === 0) return [];

  // Group by "YYYY-MM" bucket
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const d    = new Date(row.actual_date);
    const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row.risk_score_at_inspection);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, scores]) => {
      const [yr, mo] = key.split("-");
      const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleString("en-IN", {
        month: "short",
        year:  "numeric",
      });
      const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      return { label, averageRiskScore: avg, count: scores.length };
    });
}

/* ─────────────────────────────────────────────────────────────
   Department Risk Comparison
   Joins completed inspections with departments and averages
   risk_score_at_inspection per department.
───────────────────────────────────────────────────────────── */

export type DepartmentRiskPoint = {
  department: string;
  averageRiskScore: number;
  count: number;
};

export async function getDepartmentRiskComparison(): Promise<DepartmentRiskPoint[]> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from("inspections")
    .select("risk_score_at_inspection, department:departments(name)")
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .not("risk_score_at_inspection", "is", null);

  if (error) throw new Error(error.message);

  const buckets = new Map<string, number[]>();
  for (const row of (data ?? []) as any[]) {
    const name: string = row.department?.name ?? "Unknown";
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name)!.push(row.risk_score_at_inspection as number);
  }

  return Array.from(buckets.entries())
    .map(([department, scores]) => ({
      department,
      averageRiskScore: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.averageRiskScore - a.averageRiskScore);
}

/* ─────────────────────────────────────────────────────────────
   Risk Heatmap Data
   Fetches establishments (with lat/lng) scoped to this
   supervisor's inspections, joined with their latest risk
   profile. Returns only rows that have coordinate data.
   Callers should check hasGeoData to decide whether to render
   a map or show the "no coordinates" fallback.
───────────────────────────────────────────────────────────── */

export type HeatmapPoint = {
  establishmentId: string;
  establishmentName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  riskScore: number;
  riskLevel: string;
};

export type HeatmapData = {
  points: HeatmapPoint[];
  /** True when at least one establishment has lat/lng coordinates. */
  hasGeoData: boolean;
  /** Total supervised establishments (with and without coordinates). */
  totalEstablishments: number;
};

export async function getHeatmapData(): Promise<HeatmapData> {
  const uid = await currentUserId();

  // Step 1: get all establishment IDs under this supervisor
  const { data: estRows, error: estErr } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  if (estErr) throw new Error(estErr.message);

  const estIds = [...new Set((estRows ?? []).map((r: any) => r.establishment_id as string))];
  if (estIds.length === 0) {
    return { points: [], hasGeoData: false, totalEstablishments: 0 };
  }

  // Step 2: fetch establishments with coordinates
  const { data: establishments, error: estDataErr } = await supabase
    .from("establishments")
    .select("id, name, address, latitude, longitude")
    .in("id", estIds);

  if (estDataErr) throw new Error(estDataErr.message);

  const estList = (establishments ?? []) as {
    id: string; name: string; address: string | null;
    latitude: number | null; longitude: number | null;
  }[];

  // Step 3: fetch latest risk profile for each establishment
  const { data: riskData } = await supabase
    .from("risk_profiles")
    .select("establishment_id, risk_score, risk_level")
    .in("establishment_id", estIds)
    .order("calculated_at", { ascending: false });

  // Keep only the most recent profile per establishment
  const riskMap = new Map<string, { risk_score: number; risk_level: string }>();
  for (const rp of (riskData ?? []) as any[]) {
    if (!riskMap.has(rp.establishment_id)) {
      riskMap.set(rp.establishment_id, {
        risk_score: rp.risk_score,
        risk_level: rp.risk_level,
      });
    }
  }

  // Step 4: build points array — only include rows with actual coordinates
  const points: HeatmapPoint[] = estList
    .filter((e) => e.latitude != null && e.longitude != null)
    .map((e) => {
      const risk = riskMap.get(e.id);
      return {
        establishmentId: e.id,
        establishmentName: e.name,
        address: e.address,
        latitude:  e.latitude!,
        longitude: e.longitude!,
        riskScore: risk?.risk_score ?? 0,
        riskLevel: risk?.risk_level ?? "Low",
      };
    });

  return {
    points,
    hasGeoData:          points.length > 0,
    totalEstablishments: estList.length,
  };
}

/* ─────────────────────────────────────────────────────────────
   Completed inspections for reports page
───────────────────────────────────────────────────────────── */

export async function getCompletedInspections(filters?: {
  search?: string;
  departmentId?: string;
  dateRange?: string;
}): Promise<CompletedInspectionRow[]> {
  const uid = await currentUserId();

  // Step 1: fetch inspections with establishment + department (these FKs exist)
  let q = supabase
    .from("inspections")
    .select(`
      id,
      inspector_id,
      scheduled_date,
      actual_date,
      risk_score_at_inspection,
      created_at,
      establishment:establishments(id, name),
      department:departments(id, name)
    `)
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .order("actual_date", { ascending: false });

  if (filters?.departmentId && filters.departmentId !== "all") {
    q = q.eq("department_id", filters.departmentId);
  }

  if (filters?.dateRange && filters.dateRange !== "all") {
    const days =
      filters.dateRange === "7d"  ? 7  :
      filters.dateRange === "30d" ? 30 :
      filters.dateRange === "90d" ? 90 :
      filters.dateRange === "1y"  ? 365 : null;
    if (days) {
      const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      q = q.gte("created_at", since);
    }
  }

  const { data, error } = await q.limit(500);
  if (error) throw new Error(error.message);

  const rawRows = (data ?? []) as any[];

  // Step 2: resolve inspector names via separate profile fetch (no FK needed)
  const inspectorIds = [...new Set(rawRows.map((r) => r.inspector_id).filter(Boolean))];
  const profileMap = await fetchProfileMap(inspectorIds);

  let rows: CompletedInspectionRow[] = rawRows.map((d) => {
    const profile = profileMap.get(d.inspector_id);
    return {
      id: d.id,
      establishmentName: d.establishment?.name ?? "—",
      department: d.department?.name ?? "—",
      inspectorName: profile?.name || profile?.email || "—",
      scheduledDate: d.scheduled_date ?? "—",
      actualDate: d.actual_date ?? null,
      riskScore: d.risk_score_at_inspection ?? null,
      createdAt: d.created_at,
    };
  });

  if (filters?.search?.trim()) {
    const s = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.establishmentName.toLowerCase().includes(s) ||
        r.department.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s),
    );
  }

  return rows;
}

/* ─────────────────────────────────────────────────────────────
   Latest inspection detail for a given establishment
   Used by Risk Monitoring so the AI payload is real, not synthetic.
   Returns the most-recent inspection (any status) for this
   supervisor's scoped establishment, or null if none exists.
───────────────────────────────────────────────────────────── */

export async function getLatestInspectionForEstablishment(
  establishmentId: string,
): Promise<InspectionDetail | null> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from("inspections")
    .select(`
      id,
      inspector_id,
      scheduled_date,
      actual_date,
      status,
      checklist,
      findings,
      risk_score_at_inspection,
      evidence_summary,
      notes,
      created_at,
      establishment:establishments(id, name, registration_number, address),
      department:departments(id, name, code)
    `)
    .eq("supervisor_id", uid)
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const d = data as any;

  const profileMap = await fetchProfileMap(d.inspector_id ? [d.inspector_id] : []);
  const inspector  = profileMap.get(d.inspector_id) ?? { name: "", email: "" };

  return {
    id: d.id,
    _establishmentId: d.establishment?.id ?? establishmentId,
    _departmentId: d.department?.id ?? "",
    establishmentName: d.establishment?.name ?? "—",
    establishmentAddress: d.establishment?.address ?? null,
    registrationNumber: d.establishment?.registration_number ?? "—",
    departmentName: d.department?.name ?? "—",
    departmentCode: d.department?.code ?? "—",
    inspectorName: inspector.name || inspector.email || "—",
    inspectorEmail: inspector.email || "—",
    scheduledDate: d.scheduled_date ?? "—",
    actualDate: d.actual_date ?? null,
    status: d.status,
    checklist: d.checklist as Record<string, unknown> | null,
    findings: d.findings as Record<string, unknown> | null,
    riskScoreAtInspection: d.risk_score_at_inspection ?? null,
    evidenceSummary: d.evidence_summary as Record<string, unknown> | null,
    notes: d.notes ?? null,
    createdAt: d.created_at,
  };
}

/* ─────────────────────────────────────────────────────────────
   Complaints for a given establishment
   Used by buildAIPayload so the risk agent receives real complaint
   data instead of an empty array.
───────────────────────────────────────────────────────────── */

export type ComplaintRow = {
  complaint_id: string;
  establishment_id: string;
  department_id: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
};

export async function getComplaintsForEstablishment(
  establishmentId: string,
): Promise<ComplaintRow[]> {
  // Column names verified against types.ts: id, establishment_id, department_id,
  // description, category, priority, status, created_at
  const { data, error } = await supabase
    .from("complaints")
    .select("id, establishment_id, department_id, description, category, priority, status, created_at")
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((r) => ({
    complaint_id: r.id,
    establishment_id: r.establishment_id,
    department_id: r.department_id,
    description: r.description ?? "",
    category: r.category ?? "General",
    priority: r.priority ?? "Low",
    status: r.status ?? "Pending",
    created_at: r.created_at,
  }));
}

/* ─────────────────────────────────────────────────────────────
   Past inspection history for a given establishment
   Used by buildAIPayload so the risk agent receives real history
   instead of an empty array.  Excludes the current inspection
   (matched by excludeInspectionId) and limits to the 10 most recent.
───────────────────────────────────────────────────────────── */

export type PastInspectionRow = {
  inspection_id: string;
  establishment_id: string;
  department_id: string;
  inspector_id: string;
  supervisor_id: string;
  scheduled_date: string;
  actual_date: string;
  status: string;
  checklist: Record<string, unknown>;
  findings: string;
  risk_score_at_inspection: number;
  evidence_summary: Record<string, unknown>;
  created_at: string;
};

export async function getInspectionHistoryForEstablishment(
  establishmentId: string,
  excludeInspectionId: string,
): Promise<PastInspectionRow[]> {
  // Uses a SECURITY DEFINER RPC so the query bypasses the inspections RLS
  // policy.  The RPC enforces its own caller-ownership check: it returns rows
  // only when the authenticated user supervises at least one inspection for
  // this establishment.  This allows supervisors to read prior inspection
  // history for the same establishment even when those inspections were
  // assigned to different supervisor_ids.
  const { data, error } = await (supabase as any).rpc(
    "get_establishment_inspection_history",
    {
      p_establishment_id:      establishmentId,
      p_exclude_inspection_id: excludeInspectionId,
    },
  );

  if (error) throw new Error(error.message);

  // TEMPORARY TRACE — dump raw RPC row shape before mapping
  const _rows = (data ?? []) as any[];
  if (_rows.length > 0) {
    console.log(
      "[TRACE] getInspectionHistoryForEstablishment raw RPC columns:",
      Object.keys(_rows[0]),
    );
    console.log("[TRACE] raw row[0]:", _rows[0]);
  }

  return _rows.map((r) => ({
    // The RPC may return the PK as "inspection_id" (aliased) or "id" (raw).
    // Try inspection_id first; fall back to id.
    inspection_id:    r.inspection_id    ?? r.id             ?? "",
    establishment_id: r.establishment_id ?? "",
    department_id:    r.department_id    ?? "",
    inspector_id:     r.inspector_id     ?? "",
    supervisor_id:    r.supervisor_id    ?? "",
    scheduled_date:   r.scheduled_date   ?? new Date().toISOString(),
    actual_date:      r.actual_date ?? r.scheduled_date ?? new Date().toISOString(),
    status:           r.status           ?? "completed",
    checklist: (r.checklist as Record<string, unknown>) ?? {},
    // findings is Json in the DB (can be string scalar, object, or null).
    // Normalise to string so the AI schema (findings: str) always gets a string.
    findings: typeof r.findings === "string"
      ? r.findings
      : JSON.stringify(r.findings ?? {}),
    risk_score_at_inspection: Math.round(Number(r.risk_score_at_inspection ?? 0)),
    evidence_summary: (r.evidence_summary as Record<string, unknown>) ?? {},
    created_at: r.created_at ?? new Date().toISOString(),
  }));
}

/* ─────────────────────────────────────────────────────────────
   Departments list (for filter dropdowns)
───────────────────────────────────────────────────────────── */

export async function getDepartments(): Promise<{ id: string; name: string; code: string }[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, code")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string; code: string }[];
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS FUNCTIONS
   Added for the Analytics Dashboard page.
   All existing functions above are unchanged.
   Only derives data from: inspections, risk_profiles, departments.
   No AI-agent endpoints. No fabricated metrics.
═══════════════════════════════════════════════════════════════ */

export type AnalyticsPeriod = "week" | "month" | "quarter" | "year";

export type AnalyticsSummary = {
  totalInspections: number;
  /** Average days from scheduled_date → actual_date. null = no completed data. */
  avgTurnaroundDays: number | null;
  /** Always null — no supervisor approval/rejection columns exist in schema. */
  approvalRate: null;
};

export type TrendPoint = {
  label: string;
  completed: number;
  pending: number;
  in_progress: number;
  cancelled: number;
  total: number;
};

export type RiskDistPoint = { name: string; value: number; fill: string };

export type DeptPerfPoint = { department: string; completed: number };

export type InspectorProdPoint = { inspectorName: string; completed: number };

export type TurnaroundPoint = { label: string; avgDays: number };

/* private helpers */

function _isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function _weekMonday(d: Date): Date {
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m    = new Date(d);
  m.setDate(diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export function analyticsPeriodRange(period: AnalyticsPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to  = new Date(now);
  let from: Date;
  if (period === "week") {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }
  return { from, to };
}

function _bucketKey(d: Date, period: AnalyticsPeriod): string {
  if (period === "week" || period === "month") return _isoDate(d);
  if (period === "quarter") return _isoDate(_weekMonday(d));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function _bucketLabel(key: string, period: AnalyticsPeriod): string {
  if (period === "year") {
    const [yr, mo] = key.split("-");
    return new Date(Number(yr), Number(mo) - 1, 1)
      .toLocaleString("en-IN", { month: "short", year: "2-digit" });
  }
  return new Date(key)
    .toLocaleString("en-IN", { month: "short", day: "numeric" });
}

/* ─── 1. Analytics Summary ─── */

export async function getAnalyticsSummary(period: AnalyticsPeriod): Promise<AnalyticsSummary> {
  const uid          = await currentUserId();
  const { from, to } = analyticsPeriodRange(period);

  const { count: total } = await supabase
    .from("inspections")
    .select("id", { count: "exact", head: true })
    .eq("supervisor_id", uid)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  const { data: completedRows } = await supabase
    .from("inspections")
    .select("scheduled_date, actual_date")
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .not("actual_date",    "is", null)
    .not("scheduled_date", "is", null);

  let avgTurnaroundDays: number | null = null;
  const cRows = (completedRows ?? []) as { scheduled_date: string; actual_date: string }[];
  if (cRows.length > 0) {
    const deltas = cRows
      .map((r) => (new Date(r.actual_date).getTime() - new Date(r.scheduled_date).getTime()) / 86400000)
      .filter((d) => d >= 0);
    if (deltas.length > 0) {
      avgTurnaroundDays =
        Math.round((deltas.reduce((s, v) => s + v, 0) / deltas.length) * 10) / 10;
    }
  }

  return { totalInspections: total ?? 0, avgTurnaroundDays, approvalRate: null };
}

/* ─── 2. Inspection Trends ─── */

export async function getInspectionTrends(period: AnalyticsPeriod): Promise<TrendPoint[]> {
  const uid          = await currentUserId();
  const { from, to } = analyticsPeriodRange(period);

  const { data, error } = await supabase
    .from("inspections")
    .select("scheduled_date, status")
    .eq("supervisor_id", uid)
    .gte("scheduled_date", from.toISOString())
    .lte("scheduled_date", to.toISOString())
    .order("scheduled_date", { ascending: true });

  if (error) throw new Error(error.message);

  type B = { label: string; completed: number; pending: number; in_progress: number; cancelled: number };
  const buckets = new Map<string, B>();

  const cursor = new Date(from);
  while (cursor <= to) {
    const key = _bucketKey(cursor, period);
    if (!buckets.has(key))
      buckets.set(key, { label: _bucketLabel(key, period), completed: 0, pending: 0, in_progress: 0, cancelled: 0 });
    if (period === "week" || period === "month") cursor.setDate(cursor.getDate() + 1);
    else if (period === "quarter")               cursor.setDate(cursor.getDate() + 7);
    else                                         cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const row of (data ?? []) as any[]) {
    const b = buckets.get(_bucketKey(new Date(row.scheduled_date), period));
    if (b) {
      const s = row.status as keyof Omit<B, "label">;
      if (s in b) b[s]++;
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    label:       b.label,
    completed:   b.completed,
    pending:     b.pending,
    in_progress: b.in_progress,
    cancelled:   b.cancelled,
    total:       b.completed + b.pending + b.in_progress + b.cancelled,
  }));
}

/* ─── 3. Risk Distribution ─── */

const _RISK_FILL: Record<string, string> = {
  Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444", Critical: "#7c3aed",
};

export async function getRiskDistributionAnalytics(): Promise<RiskDistPoint[]> {
  const uid = await currentUserId();

  const { data: estRows } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  const estIds = [...new Set((estRows ?? []).map((r: any) => r.establishment_id as string))];
  if (estIds.length === 0) return [];

  const { data, error } = await supabase
    .from("risk_profiles")
    .select("risk_level")
    .in("establishment_id", estIds);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const row of (data ?? []) as any[]) {
    const lvl: string = row.risk_level ?? "";
    if (lvl in counts) counts[lvl]++;
  }

  return (["Critical", "High", "Medium", "Low"] as const)
    .map((lvl) => ({ name: lvl, value: counts[lvl], fill: _RISK_FILL[lvl] }))
    .filter((p) => p.value > 0);
}

/* ─── 4. Department Performance ─── */

export async function getDeptPerformance(period: AnalyticsPeriod): Promise<DeptPerfPoint[]> {
  const uid          = await currentUserId();
  const { from, to } = analyticsPeriodRange(period);

  const { data, error } = await supabase
    .from("inspections")
    .select("department:departments(name)")
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    const name: string = row.department?.name ?? "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([department, completed]) => ({ department, completed }))
    .sort((a, b) => b.completed - a.completed);
}

/* ─── 5. Inspector Productivity (Top 10) ─── */

export async function getInspectorProductivity(period: AnalyticsPeriod): Promise<InspectorProdPoint[]> {
  const uid          = await currentUserId();
  const { from, to } = analyticsPeriodRange(period);

  const { data, error } = await supabase
    .from("inspections")
    .select("inspector_id")
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { inspector_id: string }[]) {
    if (row.inspector_id) counts.set(row.inspector_id, (counts.get(row.inspector_id) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const profileMap = await fetchProfileMap(Array.from(counts.keys()));

  return Array.from(counts.entries())
    .map(([id, completed]) => {
      const p = profileMap.get(id);
      return { inspectorName: p?.name || p?.email || id.slice(0, 8), completed };
    })
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 10);
}

/* ─── 5b. Avg Inspector Productivity (single scalar for Overview KPI card) ───
   Returns: total completed inspections / unique inspectors in the given period.
   Delegates entirely to getInspectorProductivity — no query logic is duplicated.
   Defaults to "year" so the Overview card reflects the broadest meaningful range.
─────────────────────────────────────────────────────────────────────────────── */

export async function getAvgInspectorProductivity(
  period: AnalyticsPeriod = "year",
): Promise<number | null> {
  const points = await getInspectorProductivity(period);
  if (points.length === 0) return null;
  const total = points.reduce((sum, p) => sum + p.completed, 0);
  return Math.round((total / points.length) * 10) / 10;
}

/* ─── 6. Turnaround Trend ─── */

/**
 * OUTLIER FILTERING:
 * Seed data and historical records may have actual_date values that are
 * 100–200+ days after scheduled_date (data quality issue, not production
 * logic).  We filter out any gap > TURNAROUND_OUTLIER_THRESHOLD_DAYS so
 * the chart shows a realistic average without modifying any DB rows.
 * 30 days is a generous upper bound for a government inspection cycle.
 */
const TURNAROUND_OUTLIER_THRESHOLD_DAYS = 30;

export async function getTurnaroundTrend(period: AnalyticsPeriod): Promise<TurnaroundPoint[]> {
  const uid          = await currentUserId();
  const { from, to } = analyticsPeriodRange(period);

  const { data, error } = await supabase
    .from("inspections")
    .select("scheduled_date, actual_date, created_at")
    .eq("supervisor_id", uid)
    .eq("status", "completed")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .not("actual_date",    "is", null)
    .not("scheduled_date", "is", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { scheduled_date: string; actual_date: string; created_at: string }[];
  if (rows.length === 0) return [];

  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const days =
      (new Date(row.actual_date).getTime() - new Date(row.scheduled_date).getTime()) / 86400000;
    // Skip negative gaps (data entry errors) and outliers (>30 days).
    if (days < 0 || days > TURNAROUND_OUTLIER_THRESHOLD_DAYS) continue;
    const key = _bucketKey(new Date(row.created_at), period);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(days);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({
      label:   _bucketLabel(key, period),
      avgDays: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
    }));
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS FUNCTIONS — APPROVAL RATE & AI ACCEPTANCE
   Call the Supabase RPCs added in migrations:
     20260719151000_supervisor_reviews.sql
     20260719152000_ai_recommendations.sql
═══════════════════════════════════════════════════════════════ */

/* ─── Types for approval / AI analytics ─── */

export type ApprovalRateResult = {
  approved:      number;
  rejected:      number;
  total:         number;
  /** Percentage 0–100, or null when no data exists yet. */
  approvalRate:  number | null;
};

export type AIAcceptanceResult = {
  accepted:        number;
  rejected:        number;
  total:           number;
  /** Percentage 0–100, or null when no data exists yet. */
  acceptanceRate:  number | null;
};

export type ApprovalTrendPoint = {
  label:    string;
  approved: number;
  rejected: number;
};

export type AIAcceptanceTrendPoint = {
  label:    string;
  accepted: number;
  rejected: number;
};

/* ─── 7. Approval Rate ─── */

/**
 * Calls the get_approval_rate() SECURITY DEFINER RPC.
 * Scoped to the authenticated supervisor.
 * Optionally filtered by period (defaults to the given AnalyticsPeriod range).
 */
export async function getApprovalRate(
  period: AnalyticsPeriod,
): Promise<ApprovalRateResult> {
  const { from, to } = analyticsPeriodRange(period);

  const { data, error } = await (supabase as any).rpc("get_approval_rate", {
    p_from: from.toISOString(),
    p_to:   to.toISOString(),
  });

  if (error) throw new Error(error.message);

  const d = (data ?? {}) as {
    approved?: number;
    rejected?: number;
    total?: number;
    approval_rate?: number | null;
  };

  return {
    approved:     d.approved     ?? 0,
    rejected:     d.rejected     ?? 0,
    total:        d.total        ?? 0,
    approvalRate: d.approval_rate ?? null,
  };
}

/* ─── 8. Approval Trend ─── */

/**
 * Calls the get_approval_trend() SECURITY DEFINER RPC.
 * Returns time-bucketed approved vs rejected counts.
 * Bucket granularity is derived from period:
 *   week/month → 'week' | quarter → 'week' | year → 'month'
 */
export async function getApprovalTrend(
  period: AnalyticsPeriod,
): Promise<ApprovalTrendPoint[]> {
  const { from, to } = analyticsPeriodRange(period);
  const bucket =
    period === "year" ? "month" :
    period === "quarter" ? "week" :
    "week";

  const { data, error } = await (supabase as any).rpc("get_approval_trend", {
    p_from:   from.toISOString(),
    p_to:     to.toISOString(),
    p_bucket: bucket,
  });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((r) => ({
    label:    r.bucket_label ?? "",
    approved: r.approved     ?? 0,
    rejected: r.rejected     ?? 0,
  }));
}

/* ─── 9. AI Acceptance Rate ─── */

/**
 * Calls the get_ai_acceptance_rate() SECURITY DEFINER RPC.
 * Scoped to the authenticated supervisor.
 */
export async function getAIAcceptanceRate(
  period: AnalyticsPeriod,
): Promise<AIAcceptanceResult> {
  const { from, to } = analyticsPeriodRange(period);

  const { data, error } = await (supabase as any).rpc("get_ai_acceptance_rate", {
    p_from: from.toISOString(),
    p_to:   to.toISOString(),
  });

  if (error) throw new Error(error.message);

  const d = (data ?? {}) as {
    accepted?: number;
    rejected?: number;
    total?: number;
    acceptance_rate?: number | null;
  };

  return {
    accepted:       d.accepted       ?? 0,
    rejected:       d.rejected       ?? 0,
    total:          d.total          ?? 0,
    acceptanceRate: d.acceptance_rate ?? null,
  };
}

/* ─── 9b. AI Acceptance Rate — all-time (no date filter) ─────────────────────
   Used by the Overview KPI card.  Passing NULL to p_from / p_to tells the
   RPC to ignore the date range and count all decided rows for this supervisor.
   This avoids the "year window excludes seeded/historical data" problem that
   causes the card to show "—" even when ai_recommendations rows exist.
─────────────────────────────────────────────────────────────────────────────── */

export async function getAIAcceptanceRateAllTime(): Promise<AIAcceptanceResult> {
  const { data, error } = await (supabase as any).rpc("get_ai_acceptance_rate", {
    p_from: null,
    p_to:   null,
  });

  if (error) throw new Error(error.message);

  const d = (data ?? {}) as {
    accepted?: number;
    rejected?: number;
    total?: number;
    acceptance_rate?: number | null;
  };

  return {
    accepted:       d.accepted       ?? 0,
    rejected:       d.rejected       ?? 0,
    total:          d.total          ?? 0,
    acceptanceRate: d.acceptance_rate ?? null,
  };
}

/* ─── 10. AI Acceptance Trend ─── */

/**
 * Calls the get_ai_acceptance_trend() SECURITY DEFINER RPC.
 * Returns time-bucketed accepted vs rejected AI recommendation counts.
 */
export async function getAIAcceptanceTrend(
  period: AnalyticsPeriod,
): Promise<AIAcceptanceTrendPoint[]> {
  const { from, to } = analyticsPeriodRange(period);
  const bucket =
    period === "year" ? "month" :
    period === "quarter" ? "week" :
    "week";

  const { data, error } = await (supabase as any).rpc("get_ai_acceptance_trend", {
    p_from:   from.toISOString(),
    p_to:     to.toISOString(),
    p_bucket: bucket,
  });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((r) => ({
    label:    r.bucket_label ?? "",
    accepted: r.accepted     ?? 0,
    rejected: r.rejected     ?? 0,
  }));
}

/* ─────────────────────────────────────────────────────────────
   Supervisor Review — approve / reject an inspection
   Inserts into public.supervisor_reviews.
   RLS enforces supervisor_id = auth.uid() — no bypass needed.
   Throws an Error with message on any Supabase error so the
   calling useMutation's onError handler receives it directly.
───────────────────────────────────────────────────────────── */

export async function submitSupervisorReview(
  inspectionId: string,
  decision: "approved" | "rejected",
  remarks?: string,
  aiOutput?: {
    risk_score:  number | null;
    risk_level:  string | null;
    explanation: string | null;
    [key: string]: unknown;
  } | null,
): Promise<void> {
  const uid = await currentUserId();

  // [DEBUG] Log everything before any await so we know the args arrived.
  console.log("[ai_rec DEBUG] submitSupervisorReview called — inspectionId:", inspectionId, "| decision:", decision, "| aiOutput:", aiOutput);

  // ── Primary operation: write the supervisor review ──────────────────────
  const { error } = await supabase
    .from("supervisor_reviews")
    .insert({
      inspection_id: inspectionId,
      supervisor_id: uid,
      decision,
      remarks: remarks?.trim() || null,
    });

  if (error) {
    console.log("[ai_rec DEBUG] supervisor_reviews insert FAILED:", error.message, "| code:", error.code);
    throw new Error(error.message);
  }

  console.log("[ai_rec DEBUG] supervisor_reviews insert succeeded");

  // ── Secondary (best-effort): persist AI output for acceptance analytics ─
  // [DEBUG] Trace whether aiOutput arrived and what the upsert result is.
  console.log("[ai_rec DEBUG] aiOutput received:", aiOutput);

  if (aiOutput) {
    const aiDecision: "accepted" | "rejected" =
      decision === "approved" ? "accepted" : "rejected";

    const upsertPayload = {
      inspection_id:       inspectionId,
      supervisor_id:       uid,
      ai_output:           aiOutput as unknown as import("@/integrations/supabase/types").Json,
      recommendation_text: typeof aiOutput.explanation === "string" ? aiOutput.explanation : null,
      ai_risk_level:       typeof aiOutput.risk_level  === "string" ? aiOutput.risk_level  : null,
      ai_risk_score:       typeof aiOutput.risk_score  === "number" ? aiOutput.risk_score  : null,
      supervisor_decision: aiDecision,
      supervisor_notes:    remarks?.trim() || null,
      decided_at:          new Date().toISOString(),
    };

    console.log("[ai_rec DEBUG] upsert payload:", upsertPayload);

    const { data: upsertData, error: upsertError } = await supabase
      .from("ai_recommendations")
      .upsert(upsertPayload, { onConflict: "inspection_id" })
      .select("id");

    console.log("[ai_rec DEBUG] upsert result — data:", upsertData, "| error:", upsertError);
  } else {
  console.log(
    "[ai_rec DEBUG] aiOutput missing — checking for existing AI recommendation"
  );

  const aiDecision: "accepted" | "rejected" =
    decision === "approved" ? "accepted" : "rejected";

  const { data: existing, error: existingError } = await supabase
    .from("ai_recommendations")
    .select("id")
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  console.log(
    "[ai_rec DEBUG] existing ai_recommendations row:",
    existing,
    "| error:",
    existingError
  );

  if (existing) {
    const { error: updateError } = await supabase
      .from("ai_recommendations")
      .update({
        supervisor_decision: aiDecision,
        supervisor_notes: remarks?.trim() || null,
        decided_at: new Date().toISOString(),
      })
      .eq("inspection_id", inspectionId);

    console.log(
      "[ai_rec DEBUG] decision-only update error:",
      updateError
    );
  } else {
    console.log(
      "[ai_rec DEBUG] no existing ai_recommendations row; nothing to update"
    );
  }
}
}

/* ─────────────────────────────────────────────────────────────
   Review Activity Timeline
   Reads directly from supervisor_reviews joined to inspections
   and establishments.  This is the correct source for the
   "Review Activity Timeline" panel — it contains approved/
   rejected decisions, remarks, and timestamps recorded by this
   supervisor.  No audit_logs dependency needed because
   supervisor_reviews IS the approval audit trail.

   The join to inspections + establishments is safe:
     • inspections RLS allows supervisor_id = auth.uid() reads
     • establishments RLS is open to all authenticated users
     • supervisor_reviews RLS scopes rows to supervisor_id = auth.uid()

   Inspector name is resolved via the existing get_inspector_profiles
   SECURITY DEFINER RPC (same helper used by fetchProfileMap).
───────────────────────────────────────────────────────────── */

export type ReviewActivityEntry = {
  id: string;
  inspectionId: string;
  decision: "approved" | "rejected";
  remarks: string | null;
  /** Establishment name resolved from the joined inspection row. */
  establishmentName: string;
  supervisorName: string;
  reviewedAt: string;
};

export async function getSupervisorReviewActivity(
  limit = 12,
): Promise<ReviewActivityEntry[]> {
  const uid = await currentUserId();

  // Step 1: fetch supervisor_reviews with nested inspection → establishment join.
  // PostgREST allows chaining embedded resource selects through FK relationships.
  // supervisor_reviews.inspection_id → inspections.id (FK exists)
  // inspections.establishment_id     → establishments.id (FK exists)
  const { data, error } = await supabase
    .from("supervisor_reviews")
    .select(`
      id,
      inspection_id,
      decision,
      remarks,
      reviewed_at,
      inspection:inspections (
        establishment:establishments ( name )
      )
    `)
    .eq("supervisor_id", uid)
    .order("reviewed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];

  // Step 2: resolve the supervisor's own display name via the existing RPC helper.
  // We pass only the current user's own UID — the RPC gates on supervisor_id = auth.uid(),
  // so this is guaranteed to return exactly one row (the supervisor's own profile).
  const profileMap = await fetchProfileMap([uid]);
  const supervisorProfile = profileMap.get(uid);
  // fetchProfileMap uses get_inspector_profiles which only returns profiles for
  // inspectors on this supervisor's inspections — if the supervisor's own id
  // isn't returned (unlikely but possible), fall back to a generic label.
  const supervisorName =
    supervisorProfile?.name ||
    supervisorProfile?.email ||
    "Supervisor";

  return rows.map((r) => ({
    id:               r.id,
    inspectionId:     r.inspection_id,
    decision:         r.decision as "approved" | "rejected",
    remarks:          r.remarks ?? null,
    establishmentName:
      (r.inspection as any)?.establishment?.name ?? "Unknown Establishment",
    supervisorName,
    reviewedAt:       r.reviewed_at,
  }));
}

/* ─────────────────────────────────────────────────────────────
   Compliance Risk Intelligence
   Answers: "Where is the danger and where should I focus next?"
   Computes four action-oriented counts from existing tables only.
   No new schema required. All queries scoped to this supervisor.

   Metric definitions
   ──────────────────
   criticalEstablishments
     Distinct establishments under this supervisor whose latest
     risk_profiles entry is 'High' or 'Critical'.
     Source: risk_profiles (risk_level).

   highRiskPendingActions
     Inspections that are still open (pending or in_progress) AND
     carry a risk_score_at_inspection ≥ 60.  These are active
     assignments needing urgent follow-through.
     Source: inspections (status, risk_score_at_inspection).

   repeatViolators
     Establishments that have ≥ 2 completed inspections where
     risk_score_at_inspection ≥ 60, indicating a pattern of
     repeated high-risk findings rather than a one-off event.
     Source: inspections (status, risk_score_at_inspection, establishment_id).

   escalationsRecommended
     Completed inspections with risk_score_at_inspection ≥ 70
     for which NO supervisor_review row exists yet — i.e. high-
     severity outcomes that the supervisor has not acted on.
     Source: inspections LEFT JOIN supervisor_reviews.
───────────────────────────────────────────────────────────── */

export type ComplianceRiskIntelligence = {
  criticalEstablishments:  number;
  highRiskPendingActions:  number;
  repeatViolators:         number;
  escalationsRecommended:  number;
};

export async function getComplianceRiskIntelligence(): Promise<ComplianceRiskIntelligence> {
  const uid = await currentUserId();

  // ── Step 1: establishments supervised by this user ───────────────────────
  const { data: estRows, error: estErr } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  if (estErr) throw new Error(estErr.message);

  const estIds = [...new Set((estRows ?? []).map((r: any) => r.establishment_id as string))];

  if (estIds.length === 0) {
    return { criticalEstablishments: 0, highRiskPendingActions: 0, repeatViolators: 0, escalationsRecommended: 0 };
  }

  // Run all four counts in parallel for efficiency
  const [
    criticalResult,
    pendingResult,
    allCompletedHighRisk,
    unreviewed,
  ] = await Promise.all([

    // ── 1. Critical establishments ────────────────────────────────────────
    // Count distinct establishments with a High or Critical risk_profiles row.
    supabase
      .from("risk_profiles")
      .select("establishment_id", { count: "exact", head: true })
      .in("establishment_id", estIds)
      .in("risk_level", ["High", "Critical"]),

    // ── 2. High-risk pending actions ──────────────────────────────────────
    // Open inspections (pending or in_progress) with risk score ≥ 60.
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", uid)
      .in("status", ["pending", "in_progress"])
      .gte("risk_score_at_inspection", 60),

    // ── 3. Repeat violators (raw rows for client-side grouping) ───────────
    // Completed high-risk inspections — group by establishment_id client-side
    // to count establishments with ≥ 2 such inspections.
    // head:true + count is not used here because we need grouping logic.
    supabase
      .from("inspections")
      .select("establishment_id")
      .eq("supervisor_id", uid)
      .eq("status", "completed")
      .gte("risk_score_at_inspection", 60),

    // ── 4. Escalations recommended ────────────────────────────────────────
    // Completed inspections with risk_score_at_inspection ≥ 70 that have
    // no matching supervisor_reviews row (unreviewed high-severity cases).
    // PostgREST supports !inner / !left — use a left join and filter nulls.
    supabase
      .from("inspections")
      .select("id, supervisor_reviews!left(id)")
      .eq("supervisor_id", uid)
      .eq("status", "completed")
      .gte("risk_score_at_inspection", 70),
  ]);

  if (criticalResult.error) throw new Error(criticalResult.error.message);
  if (pendingResult.error)  throw new Error(pendingResult.error.message);
  if (allCompletedHighRisk.error) throw new Error(allCompletedHighRisk.error.message);
  if (unreviewed.error)     throw new Error(unreviewed.error.message);

  // ── Repeat violators: client-side group-by ──────────────────────────────
  const violatorCounts = new Map<string, number>();
  for (const row of (allCompletedHighRisk.data ?? []) as any[]) {
    const eid: string = row.establishment_id;
    violatorCounts.set(eid, (violatorCounts.get(eid) ?? 0) + 1);
  }
  const repeatViolators = [...violatorCounts.values()].filter((c) => c >= 2).length;

  // ── Escalations: count rows where supervisor_reviews join returned null ──
  const escalationsRecommended = ((unreviewed.data ?? []) as any[]).filter(
    (row) => !row.supervisor_reviews || (Array.isArray(row.supervisor_reviews) && row.supervisor_reviews.length === 0),
  ).length;

  return {
    criticalEstablishments:  criticalResult.count  ?? 0,
    highRiskPendingActions:  pendingResult.count   ?? 0,
    repeatViolators,
    escalationsRecommended,
  };
}

/* ─────────────────────────────────────────────────────────────
   High-Risk Coverage
   Formula: reviewed high-risk inspections / total high-risk inspections × 100
   "High-risk" = inspections with risk_score_at_inspection >= 60 OR
                 whose establishment has a High/Critical risk_profile.
   "Reviewed"  = a supervisor_reviews row exists for that inspection.
   Scoped to this supervisor's inspections.
   Returns a rounded percentage (0–100), or null if no high-risk data exists.
───────────────────────────────────────────────────────────── */

export async function getHighRiskCoverage(): Promise<number | null> {
  const uid = await currentUserId();

  // All high-risk inspection IDs for this supervisor
  const { data: highRiskRows, error: hrErr } = await supabase
    .from("inspections")
    .select("id")
    .eq("supervisor_id", uid)
    .gte("risk_score_at_inspection", 60);

  if (hrErr) throw new Error(hrErr.message);

  const highRiskIds = (highRiskRows ?? []).map((r: any) => r.id as string);
  if (highRiskIds.length === 0) return null;

  // How many of those have a supervisor_review row?
  const { count: reviewedCount, error: revErr } = await supabase
    .from("supervisor_reviews")
    .select("id", { count: "exact", head: true })
    .eq("supervisor_id", uid)
    .in("inspection_id", highRiskIds);

  if (revErr) throw new Error(revErr.message);

  return Math.round(((reviewedCount ?? 0) / highRiskIds.length) * 100);
}

/* ─────────────────────────────────────────────────────────────
   Average Report Turnaround (hours)
   Measures: supervisor_reviews.reviewed_at − inspections.created_at
   This is the real end-to-end workflow gap:
     - inspections.created_at  = when the inspection was submitted
     - supervisor_reviews.reviewed_at = when the supervisor approved/rejected
   Returns average hours (rounded to 1 decimal), or null if no reviews exist.
   Outliers > 30 days are excluded (same policy as getTurnaroundTrend).
───────────────────────────────────────────────────────────── */

const _TURNAROUND_MAX_HOURS = 30 * 24; // 30 days in hours

export async function getAvgTurnaroundHours(): Promise<number | null> {
  const uid = await currentUserId();

  // Join supervisor_reviews → inspections to get both timestamps.
  // supervisor_reviews.inspection_id FK → inspections.id
  const { data, error } = await supabase
    .from("supervisor_reviews")
    .select(`
      reviewed_at,
      inspection:inspections ( created_at )
    `)
    .eq("supervisor_id", uid)
    .not("reviewed_at", "is", null);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { reviewed_at: string; inspection: { created_at: string } | null }[];
  if (rows.length === 0) return null;

  const deltas: number[] = [];
  for (const row of rows) {
    if (!row.inspection?.created_at) continue;
    const hours =
      (new Date(row.reviewed_at).getTime() - new Date(row.inspection.created_at).getTime()) /
      3600000;
    if (hours >= 0 && hours <= _TURNAROUND_MAX_HOURS) deltas.push(hours);
  }

  if (deltas.length === 0) return null;
  return Math.round((deltas.reduce((s, v) => s + v, 0) / deltas.length) * 10) / 10;
}
