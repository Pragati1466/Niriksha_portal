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

export const getInspectorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireInspector(context as any);
    const sb = (context as any).supabase;
    const userId = (context as any).userId;

    // Fetch profile, inspections, and departments using the authenticated client
    const [profileResult, inspectionsResult, departmentsResult] = await Promise.all([
      sb.from("profiles").select("id, name, email, employee_id, department_id").eq("id", userId).maybeSingle(),
      sb.from("inspections")
        .select("*, establishment:establishments(id, name, address), department:departments(id, name)")
        .eq("inspector_id", userId)
        .order("scheduled_date", { ascending: false }),
      sb.from("departments").select("id, name").order("name"),
    ]);

    if (profileResult.error) throw new Error(profileResult.error.message);
    if (inspectionsResult.error) throw new Error(inspectionsResult.error.message);
    if (departmentsResult.error) throw new Error(departmentsResult.error.message);

    return {
      profile: profileResult.data,
      inspections: inspectionsResult.data ?? [],
      departments: departmentsResult.data ?? [],
    };
  });

export const getInspectionDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireInspector(context as any);
    // This is called with query params, so we get the id from context
    return { ok: true };
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
  .validator((input: z.infer<typeof newCaseSchema>) => newCaseSchema.parse(input))
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

const responseItemSchema = z.object({
  checklist_item_id: z.string(),
  response: z.string(),
  finding: z.string().optional().default(""),
});

const evidenceFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  observation: z.string().optional().default(""),
});

const evidenceLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  captured_at: z.string(),
});

const draftSchema = z.object({
  id: z.string().uuid(),
  responses: z.array(responseItemSchema).default([]),
  evidence_files: z.array(evidenceFileSchema).default([]),
  evidence_location: evidenceLocationSchema.nullable().optional(),
  location_text: z.string().max(500).default(""),
  inspector_notes: z.string().max(5000).default(""),
});

export const saveInspectionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.infer<typeof draftSchema>) => draftSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireInspector(context as any);
    const { sb, inspection } = await getOwnedInspection(context, data.id);
    if (inspection.status === "completed") throw new Error("Completed inspections cannot be changed");

    const userId = (context as any).userId;

    // 1. Upsert checklist responses into inspection_responses table
    for (const item of data.responses) {
      const { error: upsertError } = await sb.from("inspection_responses").upsert({
        inspection_id: data.id,
        checklist_item_id: item.checklist_item_id,
        response: item.response,
        finding: item.finding || null,
        responded_by: userId,
        responded_at: new Date().toISOString(),
      }, {
        onConflict: "inspection_id, checklist_item_id",
        ignoreDuplicates: false,
      });
      if (upsertError) throw new Error(upsertError.message);
    }

    // 2. Insert evidence files into evidence table
    // We use a simple approach: delete existing and re-insert for simplicity
    if (data.evidence_files.length > 0) {
      // Delete existing image/document evidence for this inspection
      await sb.from("evidence").delete().eq("inspection_id", data.id).in("evidence_type", ["image", "document"]);

      const evidenceRows = data.evidence_files.map((file) => ({
        inspection_id: data.id,
        evidence_type: file.type.startsWith("image/") ? "image" as const : "document" as const,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        observation: file.observation || null,
        uploaded_by: userId,
      }));

      const { error: evidenceError } = await sb.from("evidence").insert(evidenceRows);
      if (evidenceError) throw new Error(evidenceError.message);
    }

    // 3. Upsert observation/location evidence (type = 'observation')
    // We maintain a single observation record per inspection
    const { data: existingObs } = await sb.from("evidence")
      .select("id")
      .eq("inspection_id", data.id)
      .eq("evidence_type", "observation")
      .limit(1)
      .maybeSingle();

    const obsPayload: any = {
      inspection_id: data.id,
      evidence_type: "observation",
      observation: data.inspector_notes || null,
      location_text: data.location_text || null,
      latitude: data.evidence_location?.latitude ?? null,
      longitude: data.evidence_location?.longitude ?? null,
      captured_at: data.evidence_location?.captured_at ?? null,
      uploaded_by: userId,
    };

    if (existingObs) {
      const { error: updateObsError } = await sb.from("evidence")
        .update(obsPayload)
        .eq("id", existingObs.id);
      if (updateObsError) throw new Error(updateObsError.message);
    } else {
      const { error: insertObsError } = await sb.from("evidence")
        .insert(obsPayload);
      if (insertObsError) throw new Error(insertObsError.message);
    }

    // 4. Update inspection status
    const { error } = await sb.from("inspections").update({
      status: "in_progress",
      actual_date: new Date().toISOString().slice(0, 10),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const submitInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.infer<typeof draftSchema>) => draftSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireInspector(context as any);
    const { sb, inspection } = await getOwnedInspection(context, data.id);
    if (inspection.status === "completed") throw new Error("This inspection was already submitted");

    const userId = (context as any).userId;

    // 1. Save all responses and evidence first (same as draft save)
    for (const item of data.responses) {
      await sb.from("inspection_responses").upsert({
        inspection_id: data.id,
        checklist_item_id: item.checklist_item_id,
        response: item.response,
        finding: item.finding || null,
        responded_by: userId,
        responded_at: new Date().toISOString(),
      }, {
        onConflict: "inspection_id, checklist_item_id",
        ignoreDuplicates: false,
      });
    }

    if (data.evidence_files.length > 0) {
      await sb.from("evidence").delete().eq("inspection_id", data.id).in("evidence_type", ["image", "document"]);

      const evidenceRows = data.evidence_files.map((file) => ({
        inspection_id: data.id,
        evidence_type: file.type.startsWith("image/") ? "image" as const : "document" as const,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        observation: file.observation || null,
        uploaded_by: userId,
      }));

      await sb.from("evidence").insert(evidenceRows);
    }

    const { data: existingObs } = await sb.from("evidence")
      .select("id")
      .eq("inspection_id", data.id)
      .eq("evidence_type", "observation")
      .limit(1)
      .maybeSingle();

    const obsPayload: any = {
      inspection_id: data.id,
      evidence_type: "observation",
      observation: data.inspector_notes || null,
      location_text: data.location_text || null,
      latitude: data.evidence_location?.latitude ?? null,
      longitude: data.evidence_location?.longitude ?? null,
      captured_at: data.evidence_location?.captured_at ?? null,
      uploaded_by: userId,
    };

    if (existingObs) {
      await sb.from("evidence").update(obsPayload).eq("id", existingObs.id);
    } else {
      await sb.from("evidence").insert(obsPayload);
    }

    // 2. Build snapshot for inspection_history
    const snapshot = {
      responses: data.responses,
      evidence_files: data.evidence_files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      location_text: data.location_text,
      inspector_notes: data.inspector_notes,
      evidence_location: data.evidence_location,
      submitted_at: new Date().toISOString(),
    };

    // 3. Insert into inspection_history
    const { error: historyError } = await sb.from("inspection_history").insert({
      inspection_id: data.id,
      inspector_id: userId,
      action: "submitted",
      status: "completed",
      snapshot: snapshot,
      completed_at: new Date().toISOString(),
    });
    if (historyError) throw new Error(historyError.message);

    // 4. Update inspection status to completed
    const { error } = await sb.from("inspections").update({
      status: "completed",
      actual_date: new Date().toISOString().slice(0, 10),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });