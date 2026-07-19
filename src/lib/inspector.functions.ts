import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireInspector(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "inspector",
  });
  if (error || !data) throw new Error("Forbidden: inspector role required");
}

/** Lightweight role check used during routing; it does not require the service key. */
export const requireInspectorRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireInspector(context as any);
    return { ok: true };
  });

async function getOwnedInspection(context: any, id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("inspections").select("id, inspector_id, status")
    .eq("id", id).single();
  if (error || !data || data.inspector_id !== context.userId) throw new Error("Inspection not found");
  return { sb: supabaseAdmin, inspection: data };
}

async function storeInspectionDetails(sb: any, data: any, inspectorId: string) {
  const responseRows = Object.entries(data.checklist).map(([checklist_item_id, response]) => ({
    inspection_id: data.id,
    checklist_item_id,
    response: String(response),
    finding: data.findings[checklist_item_id] || null,
    responded_by: inspectorId,
    responded_at: new Date().toISOString(),
  }));
  const { error: responseDeleteError } = await sb.from("inspection_responses").delete().eq("inspection_id", data.id);
  if (responseDeleteError) throw new Error(responseDeleteError.message);
  if (responseRows.length) {
    const { error } = await sb.from("inspection_responses").insert(responseRows);
    if (error) throw new Error(error.message);
  }

  const location = data.evidence_summary.location;
  const evidenceRows = data.evidence_summary.files.map((file: any) => ({
    inspection_id: data.id,
    evidence_type: file.type.startsWith("image/") ? "image" : "document",
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: inspectorId,
    metadata: { 
      source: "inspector_dashboard",
      category: file.category || null,
      remark: file.remark || null,
    },
  }));
  if (data.notes.trim() || data.evidence_summary.location_text.trim() || location) {
    evidenceRows.push({
      inspection_id: data.id,
      evidence_type: "observation",
      observation: data.notes.trim() || null,
      location_text: data.evidence_summary.location_text.trim() || null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      captured_at: location?.captured_at ?? null,
      uploaded_by: inspectorId,
      metadata: { source: "inspector_dashboard" },
    });
  }
  const { error: evidenceDeleteError } = await sb.from("evidence").delete().eq("inspection_id", data.id);
  if (evidenceDeleteError) throw new Error(evidenceDeleteError.message);
  if (evidenceRows.length) {
    const { error } = await sb.from("evidence").insert(evidenceRows);
    if (error) throw new Error(error.message);
  }
}

export const getInspectorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireInspector(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).userId;
    const [{ data: profile }, { data: inspections, error }, { data: departments }] = await Promise.all([
      supabaseAdmin.from("profiles").select("name, department:departments(name)").eq("id", userId).single(),
      supabaseAdmin.from("inspections").select("*, establishment:establishments(id,name,address,registration_number,category), department:departments(id,name,code), template:checklist_templates(id,template_name,checklist_json)")
        .eq("inspector_id", userId).order("scheduled_date", { ascending: true }),
      supabaseAdmin.from("departments").select("id,name").order("name"),
    ]);
    if (error) throw new Error(error.message);
    const ids = (inspections ?? []).map((inspection: any) => inspection.id);
    const [responseResult, evidenceResult, historyResult] = ids.length ? await Promise.all([
      supabaseAdmin.from("inspection_responses").select("inspection_id,checklist_item_id,response,finding,responded_at").in("inspection_id", ids),
      supabaseAdmin.from("evidence").select("inspection_id,evidence_type,file_name,file_type,file_size,observation,location_text,latitude,longitude,captured_at,created_at").in("inspection_id", ids).order("created_at", { ascending: false }),
      supabaseAdmin.from("inspection_history").select("inspection_id,action,status,completed_at").in("inspection_id", ids),
    ]) : [{ data: [] }, { data: [] }, { data: [] }];
    if (responseResult.error || evidenceResult.error || historyResult.error) throw new Error(responseResult.error?.message ?? evidenceResult.error?.message ?? historyResult.error?.message);
    const responsesByInspection = new Map<string, any[]>();
    const evidenceByInspection = new Map<string, any[]>();
    const historyByInspection = new Map<string, any>();
    for (const response of responseResult.data ?? []) responsesByInspection.set(response.inspection_id, [...(responsesByInspection.get(response.inspection_id) ?? []), response]);
    for (const evidence of evidenceResult.data ?? []) evidenceByInspection.set(evidence.inspection_id, [...(evidenceByInspection.get(evidence.inspection_id) ?? []), evidence]);
    for (const history of historyResult.data ?? []) historyByInspection.set(history.inspection_id, history);
    const dashboardInspections = (inspections ?? []).map((inspection: any) => {
      const responses = responsesByInspection.get(inspection.id) ?? [];
      const evidence = evidenceByInspection.get(inspection.id) ?? [];
      const observation = evidence.find((item) => item.evidence_type === "observation");
      return {
        ...inspection,
        checklist: Object.fromEntries(responses.map((item) => [item.checklist_item_id, item.response])),
        findings: Object.fromEntries(responses.filter((item) => item.finding).map((item) => [item.checklist_item_id, item.finding])),
        evidence_summary: {
          files: evidence.filter((item) => item.evidence_type !== "observation").map((item) => ({ name: item.file_name ?? "Evidence file", type: item.file_type ?? "application/octet-stream", size: Number(item.file_size ?? 0) })),
          location_text: observation?.location_text ?? "",
          location: observation?.latitude != null && observation?.longitude != null ? { latitude: observation.latitude, longitude: observation.longitude, captured_at: observation.captured_at } : null,
        },
        history: historyByInspection.get(inspection.id) ?? null,
      };
    });
    return { profile, inspections: dashboardInspections, departments: departments ?? [] };
  });

const demoEstablishments: Record<string, string[]> = {
  "Food Safety": ["Green Leaf Family Restaurant", "Spice Route Bakers", "FreshMart Supermarket", "Saffron Sweets & Snacks", "Lakeview Cloud Kitchen"],
  "Fire Safety": ["Orion Business Centre", "Metro Plaza Mall", "Sunrise Apartments", "Crescent Banquet Hall", "Northgate Cinema Complex"],
  "Pollution Control": ["Riverbend Textiles", "BlueStone Chemicals", "EcoCycle Plastics", "Apex Paper Works", "Crystal Dyeing Unit"],
  "Factory Safety": ["Prime Auto Components", "Vertex Engineering Works", "Bharat Steel Fabrication", "Pioneer Packaging Plant", "Nova Industrial Tools"],
  "Healthcare": ["CityCare Multispeciality Hospital", "Sanjeevani Diagnostic Centre", "WellSpring Clinic", "Harmony Nursing Home", "Medilife Pharmacy"],
  "Schools": ["Springfield Public School", "Little Scholars Academy", "St. Mary's Senior Secondary School", "Green Valley International School", "Bright Future Convent School"],
};

/** Creates a focused demo queue for the signed-in inspector only. */
export const seedInspectorDemoCases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireInspector(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inspectorId = (context as any).userId;
    const [{ data: supervisors }, { data: existing }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "supervisor").limit(1),
      supabaseAdmin.from("inspections").select("department_id").eq("inspector_id", inspectorId).eq("status", "pending"),
    ]);
    const supervisorId = supervisors?.[0]?.user_id;
    if (!supervisorId) throw new Error("Create a supervisor account before seeding demo cases");
    const { error: schoolError } = await supabaseAdmin.from("departments").upsert({
      name: "Schools",
      code: "SCHOOLS",
      description: "School safety and education regulatory inspections",
    }, { onConflict: "code" });
    if (schoolError) throw new Error(schoolError.message);
    const { data: departments, error: departmentError } = await supabaseAdmin.from("departments").select("id, name");
    if (departmentError) throw new Error(departmentError.message);
    const assignedCounts = new Map<string, number>();
    for (const item of existing ?? []) assignedCounts.set(item.department_id, (assignedCounts.get(item.department_id) ?? 0) + 1);
    const created: string[] = [];
    for (const department of departments ?? []) {
      const needed = Math.max(0, 5 - (assignedCounts.get(department.id) ?? 0));
      if (!needed) continue;
      const names = demoEstablishments[department.name] ?? Array.from({ length: 5 }, (_, index) => `${department.name} Establishment ${index + 1}`);
      const establishments = names.slice(0, needed).map((name, index) => ({
        department_id: department.id,
        name,
        registration_number: `DEMO-${department.id.slice(0, 4).toUpperCase()}-${index + 1}-${Date.now().toString().slice(-4)}`,
        address: `${12 + index}, Civic Centre, Sector ${index + 1}, New Delhi`,
        category: department.name,
        business_type: "Demo inspection establishment",
        status: "active" as const,
      }));
      const { data: createdEstablishments, error: establishmentError } = await supabaseAdmin.from("establishments").insert(establishments).select("id");
      if (establishmentError) throw new Error(establishmentError.message);
      const today = new Date();
      const assignments = (createdEstablishments ?? []).map((establishment: any, index: number) => ({
        establishment_id: establishment.id,
        department_id: department.id,
        inspector_id: inspectorId,
        supervisor_id: supervisorId,
        scheduled_date: new Date(today.getTime() + (index + 1) * 86400000).toISOString().slice(0, 10),
        status: "pending" as const,
        notes: "Demo assignment created for inspector dashboard display.",
      }));
      const { error: assignmentError } = await supabaseAdmin.from("inspections").insert(assignments);
      if (assignmentError) throw new Error(assignmentError.message);
      created.push(department.name);
    }
    return { created };
  });

const newCaseSchema = z.object({
  department_id: z.string().uuid(),
  establishment_name: z.string().min(2).max(160),
  location: z.string().min(3).max(500),
});

export const createInspectorCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof newCaseSchema>) => newCaseSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireInspector(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const inspectorId = (context as any).userId;
    const { data: supervisor } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "supervisor").limit(1).maybeSingle();
    if (!supervisor) throw new Error("Create a supervisor account before creating a case");
    const { data: establishment, error: establishmentError } = await supabaseAdmin.from("establishments").insert({
      department_id: data.department_id,
      registration_number: `CASE-${data.department_id.slice(0, 4).toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      name: data.establishment_name,
      address: data.location,
      category: "Inspector-created case",
      business_type: "Inspection establishment",
      status: "active",
    }).select("id").single();
    if (establishmentError || !establishment) throw new Error(establishmentError?.message ?? "Could not create establishment");
    const { error } = await supabaseAdmin.from("inspections").insert({
      establishment_id: establishment.id,
      department_id: data.department_id,
      inspector_id: inspectorId,
      supervisor_id: supervisor.user_id,
      scheduled_date: new Date().toISOString().slice(0, 10),
      status: "pending",
      notes: "Case created by inspector.",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const draftSchema = z.object({
  id: z.string().uuid(),
  checklist: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).transform(String)).default({}),
  findings: z.record(z.string(), z.string()).default({}),
  notes: z.string().max(5000).default(""),
  evidence_summary: z.object({
    files: z.array(z.object({ name: z.string(), type: z.string(), size: z.number() })).default([]),
    location: z.object({ latitude: z.number(), longitude: z.number(), captured_at: z.string() }).nullable().optional(),
    location_text: z.string().max(500).default(""),
    ai_handoff: z.object({ image_count: z.number(), has_inspector_notes: z.boolean(), status: z.string() }).optional(),
  }).default({ files: [] }),
});

export const saveInspectionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof draftSchema>) => draftSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireInspector(context as any);
    const { sb, inspection } = await getOwnedInspection(context, data.id);
    if (inspection.status === "completed") throw new Error("Completed inspections cannot be changed");
    const { error } = await sb.from("inspections").update({ notes: data.notes, status: "in_progress", actual_date: new Date().toISOString().slice(0, 10) }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await storeInspectionDetails(sb, data, (context as any).userId);
    return { ok: true };
  });

export const submitInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof draftSchema>) => draftSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireInspector(context as any);
    const { sb, inspection } = await getOwnedInspection(context, data.id);
    if (inspection.status === "completed") throw new Error("This inspection was already submitted");
    const { error } = await sb.from("inspections").update({ notes: data.notes, status: "completed", actual_date: new Date().toISOString().slice(0, 10) }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await storeInspectionDetails(sb, data, (context as any).userId);
    const { error: historyError } = await sb.from("inspection_history").upsert({
      inspection_id: data.id,
      inspector_id: (context as any).userId,
      action: "submitted_for_analysis",
      status: "completed",
      snapshot: { checklist: data.checklist, findings: data.findings, notes: data.notes, evidence_summary: data.evidence_summary },
      completed_at: new Date().toISOString(),
    }, { onConflict: "inspection_id" });
    if (historyError) throw new Error(historyError.message);
    return { ok: true };
  });
