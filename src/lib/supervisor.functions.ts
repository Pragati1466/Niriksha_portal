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
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);
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

// TODO: revert to ["pending", "in_progress"] when live pending data is available
const QUEUE_STATUSES = ["pending", "in_progress", "completed"] as const;

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
   Risk priority queue — top establishments by risk score
───────────────────────────────────────────────────────────── */

export async function getRiskPriorityQueue(limit = 10): Promise<RiskProfileRow[]> {
  const uid = await currentUserId();

  const { data: estRows } = await supabase
    .from("inspections")
    .select("establishment_id")
    .eq("supervisor_id", uid);

  const estIds = [...new Set((estRows ?? []).map((r: any) => r.establishment_id))];
  if (estIds.length === 0) return [];

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
