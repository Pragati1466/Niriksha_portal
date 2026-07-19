import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- helpers ----------

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  console.log("[requireAdmin] ✦ called — userId:", ctx.userId);
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  console.log("[requireAdmin] has_role RPC result — data:", data, "| error:", error ?? null);
  if (error) {
    console.error("[requireAdmin] ✘ RPC error:", error.message, "| code:", error.code);
    throw new Error(error.message);
  }
  if (!data) {
    console.error("[requireAdmin] ✘ has_role returned false — user", ctx.userId, "is NOT in user_roles as admin");
    throw new Error("Forbidden: admin role required");
  }
  console.log("[requireAdmin] ✔ has_role confirmed admin for userId:", ctx.userId);
}

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// ---------- bootstrap ----------

export const getAdminCount = createServerFn({ method: "GET" }).handler(async () => {
  const c = publicClient();
  const { data, error } = await c.rpc("admin_count");
  if (error) throw new Error(error.message);
  return { count: (data as number) ?? 0 };
});

/** Only works if there are ZERO admins in the system. */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string; name: string }) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const c = publicClient();
    const { data: countData, error: countErr } = await c.rpc("admin_count");
    if (countErr) throw new Error(countErr.message);
    if (((countData as number) ?? 0) > 0) {
      throw new Error("An administrator already exists. Use normal sign-in.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("profiles").upsert({ id: uid, name: data.name, email: data.email });
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true };
  });

// ---------- current admin check ----------

export const requireAdminRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    console.log("[requireAdminRole] ✦ handler reached — userId from context:", (context as any).userId);
    try {
      await requireAdmin(context as any);
      console.log("[requireAdminRole] ✔ admin check passed");
      return { ok: true };
    } catch (err: any) {
      console.error("[requireAdminRole] ✘ admin check failed:", err?.message);
      throw err;
    }
  });

// ---------- dashboard ----------

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const [dept, est, insp, sup, pending, completed, templates] = await Promise.all([
      sb.from("departments").select("id", { count: "exact", head: true }),
      sb.from("establishments").select("id", { count: "exact", head: true }),
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "inspector"),
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "supervisor"),
      sb.from("inspections").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("inspections").select("id", { count: "exact", head: true }).eq("status", "completed"),
      sb.from("checklist_templates").select("id", { count: "exact", head: true }),
    ]);
    return {
      departments: dept.count ?? 0,
      establishments: est.count ?? 0,
      inspectors: insp.count ?? 0,
      supervisors: sup.count ?? 0,
      pendingInspections: pending.count ?? 0,
      completedInspections: completed.count ?? 0,
      templates: templates.count ?? 0,
    };
  });

// ---------- departments ----------

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = (context as any).supabase;
    const { data, error } = await sb.from("departments").select("*").order("name");
    if (error) throw new Error(error.message);
    return data;
  });

const departmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  code: z.string().min(1).max(32),
  description: z.string().optional().nullable(),
});

export const upsertDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof departmentSchema>) => departmentSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    if (data.id) {
      const { error } = await sb.from("departments").update({
        name: data.name, code: data.code, description: data.description ?? null,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("departments").insert({
        name: data.name, code: data.code, description: data.description ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("departments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- users ----------

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { data: profiles, error } = await sb
      .from("profiles")
      .select("id, name, email, phone, employee_id, jurisdiction, is_active, department_id, created_at, login_password")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await sb.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
  });

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["inspector", "supervisor", "admin"]),
  department_id: z.string().uuid().nullable().optional(),
  phone: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  jurisdiction_state: z.string().optional().nullable(),
  jurisdiction_district: z.string().optional().nullable(),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof createUserSchema>) => createUserSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      employee_id: data.employee_id ?? null,
      department_id: data.department_id ?? null,
      jurisdiction: {
        state: data.jurisdiction_state ?? null,
        district: data.jurisdiction_district ?? null,
      },
      login_password: data.password,
    });
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.role });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true, user_id: uid };
  });

const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  department_id: z.string().uuid().nullable().optional(),
  jurisdiction_state: z.string().optional().nullable(),
  jurisdiction_district: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  role: z.enum(["inspector", "supervisor", "admin"]).optional(),
});

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof updateUserSchema>) => updateUserSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({
      name: data.name,
      phone: data.phone ?? null,
      employee_id: data.employee_id ?? null,
      department_id: data.department_id ?? null,
      jurisdiction: {
        state: data.jurisdiction_state ?? null,
        district: data.jurisdiction_district ?? null,
      },
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    if (data.id === (context as any).userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- establishments ----------

const establishmentSchema = z.object({
  id: z.string().uuid().optional(),
  department_id: z.string().uuid(),
  registration_number: z.string().optional().nullable(),
  name: z.string().min(1),
  owner_name: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  pincode: z.string().optional().nullable(),
  business_type: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  registration_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  status: z.enum(["active", "suspended", "archived"]).default("active"),
});

export const listEstablishments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = (context as any).supabase;
    const { data, error } = await sb.from("establishments")
      .select("*, department:departments(id,name,code)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof establishmentSchema>) => establishmentSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const payload: any = { ...data };
    delete payload.id;
    if (data.id) {
      const { error } = await sb.from("establishments").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("establishments").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("establishments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- templates ----------

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  department_id: z.string().uuid(),
  template_name: z.string().min(1),
  checklist_json: z.any(),
  version: z.number().int().min(1).default(1),
  is_active: z.boolean().default(true),
});

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = (context as any).supabase;
    const { data, error } = await sb.from("checklist_templates")
      .select("*, department:departments(id,name,code)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof templateSchema>) => templateSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const payload: any = { ...data };
    delete payload.id;
    if (data.id) {
      const { error } = await sb.from("checklist_templates").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("checklist_templates").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("checklist_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- assignments ----------

const assignmentSchema = z.object({
  id: z.string().uuid().optional(),
  establishment_id: z.string().uuid(),
  department_id: z.string().uuid(),
  inspector_id: z.string().uuid(),
  supervisor_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  scheduled_date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { data, error } = await sb.from("inspections")
      .select("*, establishment:establishments(id,name,registration_number), department:departments(id,name)")
      .order("scheduled_date", { ascending: false });
    if (error) throw new Error(error.message);
    // hydrate inspector/supervisor names via profiles
    const ids = Array.from(new Set(((data ?? []) as any[]).flatMap((r: any) => [r.inspector_id, r.supervisor_id])));
    const { data: profiles } = await sb.from("profiles").select("id, name, email").in("id", ids);
    const pmap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => pmap.set(p.id, p));
    return (data ?? []).map((r: any) => ({
      ...r,
      inspector: pmap.get(r.inspector_id) ?? null,
      supervisor: pmap.get(r.supervisor_id) ?? null,
    }));
  });

export const upsertAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof assignmentSchema>) => assignmentSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const payload: any = { ...data };
    delete payload.id;
    if (data.id) {
      const { error } = await sb.from("inspections").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("inspections").insert({ ...payload, status: "pending" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------- aliases / delete ----------

export const listInspections = listAssignments;

export const deleteInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("inspections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- audit logs ----------

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { entity_type?: string; action?: string; limit?: number } | undefined) =>
    z.object({
      entity_type: z.string().optional(),
      action: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    let q = sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 200);
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows;
  });

// ---------- system settings ----------

export const listSystemSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { data, error } = await sb.from("system_settings").select("*").order("key");
    if (error) throw new Error(error.message);
    return data;
  });

export const updateSystemSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { key: string; value: unknown }) =>
    z.object({ key: z.string().min(1), value: z.unknown() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("system_settings").update({ value: data.value as any }).eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- password reset (admin) ----------

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { user_id: string; new_password: string }) =>
    z.object({ user_id: z.string().uuid(), new_password: z.string().min(8) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    // Manual audit entry (auth.users changes don't fire our trigger)
    const sb = (context as any).supabase;
    await sb.from("audit_logs").insert({
      actor_id: (context as any).userId,
      action: "CUSTOM",
      entity_type: "auth.users",
      entity_id: data.user_id,
      summary: "Password reset by administrator",
    }).then(() => undefined, () => undefined);
    return { ok: true };
  });

// ---------- establishment status lifecycle ----------

export const setEstablishmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: "active" | "suspended" | "archived" }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "suspended", "archived"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("establishments").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- enterprise dashboard overview ----------

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;

    const [
      deptRows,
      estCount, estSuspended, estArchived,
      inspectorsCount, supervisorsCount, adminsCount,
      pendingCount, completedCount, inProgressCount,
      templatesCount,
      recentAudits,
      recentEsts,
      recentUsers,
      inactiveUsersCount,
      overdueInspections,
    ] = await Promise.all([
      sb.from("departments").select("id, name, code"),
      sb.from("establishments").select("id", { count: "exact", head: true }),
      sb.from("establishments").select("id", { count: "exact", head: true }).eq("status", "suspended"),
      sb.from("establishments").select("id", { count: "exact", head: true }).eq("status", "archived"),
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "inspector"),
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "supervisor"),
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
      sb.from("inspections").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("inspections").select("id", { count: "exact", head: true }).eq("status", "completed"),
      sb.from("inspections").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      sb.from("checklist_templates").select("id", { count: "exact", head: true }),
      sb.from("audit_logs").select("id, action, entity_type, entity_id, actor_email, created_at")
        .order("created_at", { ascending: false }).limit(8),
      sb.from("establishments").select("id, name, category, status, department_id, created_at")
        .order("created_at", { ascending: false }).limit(6),
      sb.from("profiles").select("id, name, email, is_active, department_id, created_at")
        .order("created_at", { ascending: false }).limit(6),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", false),
      sb.from("inspections").select("id", { count: "exact", head: true })
        .eq("status", "pending").lt("scheduled_date", new Date().toISOString()),
    ]);

    const deptList = (deptRows.data ?? []) as Array<{ id: string; name: string; code: string | null }>;

    // per-department rollups (limit to keep light)
    const perDept = await Promise.all(
      deptList.slice(0, 8).map(async (d) => {
        const [ests, inspectors, pending] = await Promise.all([
          sb.from("establishments").select("id", { count: "exact", head: true }).eq("department_id", d.id),
          sb.from("profiles").select("id", { count: "exact", head: true }).eq("department_id", d.id),
          sb.from("inspections").select("id", { count: "exact", head: true })
            .eq("department_id", d.id).eq("status", "pending"),
        ]);
        return {
          id: d.id,
          name: d.name,
          code: d.code,
          establishments: ests.count ?? 0,
          inspectors: inspectors.count ?? 0,
          pending: pending.count ?? 0,
        };
      }),
    );

    return {
      kpis: {
        departments: deptList.length,
        establishments: estCount.count ?? 0,
        inspectors: inspectorsCount.count ?? 0,
        supervisors: supervisorsCount.count ?? 0,
        admins: adminsCount.count ?? 0,
        pending: pendingCount.count ?? 0,
        inProgress: inProgressCount.count ?? 0,
        completed: completedCount.count ?? 0,
        templates: templatesCount.count ?? 0,
        suspendedEstablishments: estSuspended.count ?? 0,
        archivedEstablishments: estArchived.count ?? 0,
        inactiveUsers: inactiveUsersCount.count ?? 0,
        overdueInspections: overdueInspections.count ?? 0,
      },
      departments: perDept,
      recentActivity: recentAudits.data ?? [],
      recentEstablishments: recentEsts.data ?? [],
      recentUsers: recentUsers.data ?? [],
    };
  });

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { q: string }) => z.object({ q: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const q = data.q.trim();
    const like = `%${q}%`;
    const [ests, users, depts, insp] = await Promise.all([
      sb.from("establishments").select("id, name, category, status").ilike("name", like).limit(6),
      sb.from("profiles").select("id, name, email").or(`name.ilike.${like},email.ilike.${like}`).limit(6),
      sb.from("departments").select("id, name, code").or(`name.ilike.${like},code.ilike.${like}`).limit(6),
      sb.from("inspections").select("id, status, scheduled_date").ilike("id", like).limit(6),
    ]);
    return {
      establishments: ests.data ?? [],
      users: users.data ?? [],
      departments: depts.data ?? [],
      inspections: insp.data ?? [],
    };
  });

// ============================================================
// AI DECISION SUPPORT (deterministic, rules-based)
// ============================================================

// ---------- 1. Smart Inspector / Supervisor recommendations ----------

export const recommendAssignees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { establishment_id: string }) =>
    z.object({ establishment_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;

    const { data: est, error: estErr } = await sb
      .from("establishments")
      .select("id, name, department_id, pincode, address, department:departments(id, name, code)")
      .eq("id", data.establishment_id)
      .maybeSingle();
    if (estErr) throw new Error(estErr.message);
    if (!est) throw new Error("Establishment not found");

    // Candidate pool: all inspectors + supervisors that are active
    const { data: candidates, error: candErr } = await sb
      .from("profiles")
      .select("id, name, email, department_id, jurisdiction, is_active")
      .eq("is_active", true);
    if (candErr) throw new Error(candErr.message);

    const { data: roles } = await sb.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of (roles ?? []) as any[]) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }

    // Active workload counts (status pending or in_progress) per user
    const { data: activeInsp } = await sb
      .from("inspections")
      .select("inspector_id, supervisor_id, status")
      .in("status", ["pending", "in_progress"]);
    const workload = new Map<string, number>();
    for (const r of (activeInsp ?? []) as any[]) {
      workload.set(r.inspector_id, (workload.get(r.inspector_id) ?? 0) + 1);
      workload.set(r.supervisor_id, (workload.get(r.supervisor_id) ?? 0) + 1);
    }

    const rank = (role: "inspector" | "supervisor") => {
      const pool = ((candidates ?? []) as any[])
        .filter((p) => roleMap.get(p.id)?.includes(role));

      const scored = pool.map((p) => {
        const reasons: string[] = [];
        let score = 0;
        const deptMatch = p.department_id === est.department_id;
        if (deptMatch) { score += 60; reasons.push(`${est.department?.name ?? "matching department"} specialization`); }
        const jd = (p.jurisdiction ?? {}) as { state?: string | null; district?: string | null };
        const addr = ((est.address ?? "") + " " + (est.pincode ?? "")).toLowerCase();
        if (jd.district && addr.includes(String(jd.district).toLowerCase())) {
          score += 25; reasons.push(`jurisdiction covers ${jd.district}`);
        } else if (jd.state && addr.includes(String(jd.state).toLowerCase())) {
          score += 15; reasons.push(`jurisdiction covers ${jd.state}`);
        }
        const load = workload.get(p.id) ?? 0;
        score += Math.max(0, 40 - Math.min(40, load * 2));
        reasons.push(`${load} active ${load === 1 ? "assignment" : "assignments"}`);
        return { id: p.id, name: p.name || p.email, email: p.email, score, workload: load, reasons, deptMatch };
      });

      scored.sort((a, b) => (b.deptMatch ? 1 : 0) - (a.deptMatch ? 1 : 0)
        || a.workload - b.workload
        || b.score - a.score);
      return scored.slice(0, 3);
    };

    return {
      establishment: { id: est.id, name: est.name, department: est.department },
      inspectors: rank("inspector"),
      supervisors: rank("supervisor"),
    };
  });

// ---------- 2. Assignment conflict detection ----------

export const checkAssignmentConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    inspector_id?: string; supervisor_id?: string; establishment_id?: string;
    scheduled_date?: string; exclude_id?: string;
  }) => z.object({
    inspector_id: z.string().uuid().optional(),
    supervisor_id: z.string().uuid().optional(),
    establishment_id: z.string().uuid().optional(),
    scheduled_date: z.string().optional(),
    exclude_id: z.string().uuid().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;

    const conflicts: Array<{ severity: "warn" | "error"; message: string }> = [];

    if (data.inspector_id && data.scheduled_date) {
      let q = sb.from("inspections")
        .select("id, establishment_id, scheduled_date, status")
        .eq("inspector_id", data.inspector_id)
        .eq("scheduled_date", data.scheduled_date)
        .in("status", ["pending", "in_progress"]);
      if (data.exclude_id) q = q.neq("id", data.exclude_id);
      const { data: rows } = await q;
      if ((rows ?? []).length > 0) {
        conflicts.push({ severity: "warn",
          message: `Inspector already has ${rows!.length} active inspection${rows!.length > 1 ? "s" : ""} on ${data.scheduled_date}.` });
      }
    }

    if (data.supervisor_id && data.scheduled_date) {
      let q = sb.from("inspections")
        .select("id, scheduled_date")
        .eq("supervisor_id", data.supervisor_id)
        .eq("scheduled_date", data.scheduled_date)
        .in("status", ["pending", "in_progress"]);
      if (data.exclude_id) q = q.neq("id", data.exclude_id);
      const { data: rows } = await q;
      if ((rows ?? []).length > 0) {
        conflicts.push({ severity: "warn",
          message: `Supervisor is already overseeing ${rows!.length} active inspection${rows!.length > 1 ? "s" : ""} on ${data.scheduled_date}.` });
      }
    }

    if (data.establishment_id) {
      let q = sb.from("inspections")
        .select("id, scheduled_date, status")
        .eq("establishment_id", data.establishment_id)
        .in("status", ["pending", "in_progress"]);
      if (data.exclude_id) q = q.neq("id", data.exclude_id);
      const { data: rows } = await q;
      if ((rows ?? []).length > 0) {
        conflicts.push({ severity: "error",
          message: `This establishment already has an active inspection (status: ${rows![0].status}, scheduled ${rows![0].scheduled_date}).` });
      }
    }

    return { conflicts };
  });

// ---------- 3. Intelligent data validation (duplicate detection) ----------

function normName(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function trigrams(s: string) {
  const n = normName(s);
  if (n.length < 2) return new Set([n]);
  const g = new Set<string>();
  const p = `  ${n} `;
  for (let i = 0; i < p.length - 2; i++) g.add(p.slice(i, i + 3));
  return g;
}
function similarity(a: string, b: string) {
  const A = trigrams(a), B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export const validateEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string; registration_number?: string; exclude_id?: string }) =>
    z.object({
      name: z.string().min(1),
      registration_number: z.string().optional().nullable(),
      exclude_id: z.string().uuid().optional(),
    }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const warnings: Array<{ severity: "warn" | "error"; message: string; ref_id?: string }> = [];

    if (data.registration_number && data.registration_number.trim()) {
      let q = sb.from("establishments").select("id, name, registration_number")
        .eq("registration_number", data.registration_number.trim());
      if (data.exclude_id) q = q.neq("id", data.exclude_id);
      const { data: dupes } = await q;
      for (const d of (dupes ?? []) as any[]) {
        warnings.push({ severity: "error",
          message: `Registration number "${d.registration_number}" is already used by "${d.name}".`, ref_id: d.id });
      }
    }

    // Name similarity — limit search space with ilike prefix
    const first = normName(data.name).split(" ")[0] ?? "";
    if (first.length >= 3) {
      let q = sb.from("establishments").select("id, name").ilike("name", `%${first}%`).limit(50);
      if (data.exclude_id) q = q.neq("id", data.exclude_id);
      const { data: near } = await q;
      for (const n of (near ?? []) as any[]) {
        const s = similarity(data.name, n.name);
        if (s >= 0.7 && normName(n.name) !== normName(data.name)) {
          warnings.push({ severity: "warn",
            message: `Possible duplicate: "${n.name}" (${Math.round(s * 100)}% name similarity).`, ref_id: n.id });
        } else if (normName(n.name) === normName(data.name)) {
          warnings.push({ severity: "error",
            message: `Exact name match already exists: "${n.name}".`, ref_id: n.id });
        }
      }
    }

    return { warnings };
  });

// ---------- 4. Configuration consistency checker ----------

export const getConfigIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;

    const [inspectorsNoDept, estNoDept, deptsAll, tplByDept, activeInsp, expiredEsts, expiringEsts] = await Promise.all([
      sb.from("profiles").select("id, name, email")
        .is("department_id", null)
        .in("id",
          (await sb.from("user_roles").select("user_id").in("role", ["inspector", "supervisor"])).data?.map((r: any) => r.user_id) ?? [],
        )
        .limit(50),
      sb.from("establishments").select("id, name").is("department_id", null).limit(50),
      sb.from("departments").select("id, name"),
      sb.from("checklist_templates").select("department_id"),
      sb.from("inspections").select("id, supervisor_id").in("status", ["pending", "in_progress"]).is("supervisor_id", null).limit(50),
      sb.from("establishments").select("id, name, expiry_date")
        .lt("expiry_date", new Date().toISOString().slice(0, 10))
        .eq("status", "active").limit(50),
      sb.from("establishments").select("id, name, expiry_date")
        .gte("expiry_date", new Date().toISOString().slice(0, 10))
        .lte("expiry_date", new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10))
        .eq("status", "active").limit(50),
    ]);

    const tplDeptIds = new Set(((tplByDept.data ?? []) as any[]).map((t) => t.department_id));
    const deptsWithoutTpl = ((deptsAll.data ?? []) as any[]).filter((d) => !tplDeptIds.has(d.id));

    return {
      inspectorsWithoutDepartment: inspectorsNoDept.data ?? [],
      establishmentsWithoutDepartment: estNoDept.data ?? [],
      departmentsWithoutTemplate: deptsWithoutTpl,
      inspectionsWithoutSupervisor: activeInsp.data ?? [],
      expiredLicenses: expiredEsts.data ?? [],
      expiringSoon: expiringEsts.data ?? [],
    };
  });

// ---------- 5. Natural-language search (deterministic parser) ----------

const STATUS_MAP: Record<string, string> = {
  pending: "pending", "in progress": "in_progress", inprogress: "in_progress",
  completed: "completed", done: "completed", suspended: "suspended", archived: "archived",
  active: "active", overdue: "overdue", expired: "expired",
};

export const nlSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { q: string }) => z.object({ q: z.string().min(1).max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as any);
    const sb = (context as any).supabase;
    const raw = data.q.trim();
    const q = " " + raw.toLowerCase() + " ";

    // Entity detection
    const entity: "inspectors" | "supervisors" | "admins" | "establishments" | "inspections" | "departments" =
      /\binspector/.test(q) ? "inspectors"
      : /\bsupervisor/.test(q) ? "supervisors"
      : /\badmin/.test(q) ? "admins"
      : /\bdepartment/.test(q) ? "departments"
      : /\b(inspection|assignment|assigned|scheduled)/.test(q) ? "inspections"
      : /\b(establishment|license|licence|registration|entity|entities|expired|expiring)/.test(q) ? "establishments"
      : "establishments";

    // Status detection
    let status: string | null = null;
    for (const [k, v] of Object.entries(STATUS_MAP)) if (q.includes(` ${k} `) || q.includes(` ${k}s `)) { status = v; break; }

    // Date detection
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    let dateFilter: { op: "eq" | "gte" | "lte" | "between"; a: string; b?: string } | null = null;
    if (/\btoday\b/.test(q)) dateFilter = { op: "eq", a: today };
    else if (/\btomorrow\b/.test(q)) dateFilter = { op: "eq", a: tomorrow };
    else if (/\bthis week\b/.test(q)) dateFilter = { op: "between", a: today, b: weekEnd };
    else if (/\bnext week\b/.test(q)) dateFilter = { op: "between", a: tomorrow, b: weekEnd };

    // Department detection: fuzzy match name/code
    const { data: depts } = await sb.from("departments").select("id, name, code");
    let deptMatch: { id: string; name: string; code: string } | null = null;
    for (const d of ((depts ?? []) as any[])) {
      const nm = String(d.name ?? "").toLowerCase();
      const cd = String(d.code ?? "").toLowerCase();
      if (nm && q.includes(nm)) { deptMatch = d; break; }
      if (cd && q.includes(` ${cd} `)) { deptMatch = d; break; }
      const firstWord = nm.split(" ")[0];
      if (firstWord && firstWord.length >= 4 && q.includes(` ${firstWord} `)) { deptMatch = d; break; }
    }

    // Location detection: "in <word>" or "at <word>"
    const locMatch = raw.match(/\b(?:in|at|from)\s+([A-Za-z][A-Za-z\s]{2,30}?)(?:\s+(?:with|for|and|department|dept|assigned|scheduled)|$|[?.,!])/i);
    const location = locMatch?.[1]?.trim() ?? null;

    const interpretation = {
      entity, status, deptMatch, location,
      date: dateFilter,
    };

    // Execute
    let results: any[] = [];
    if (entity === "inspectors" || entity === "supervisors" || entity === "admins") {
      const role = entity === "inspectors" ? "inspector" : entity === "supervisors" ? "supervisor" : "admin";
      const { data: roleRows } = await sb.from("user_roles").select("user_id").eq("role", role);
      const ids = ((roleRows ?? []) as any[]).map((r) => r.user_id);
      let pq = sb.from("profiles")
        .select("id, name, email, phone, department_id, jurisdiction, is_active")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .limit(50);
      if (deptMatch) pq = pq.eq("department_id", deptMatch.id);
      const { data: rows } = await pq;
      let out = (rows ?? []) as any[];
      if (location) {
        const l = location.toLowerCase();
        out = out.filter((r) => {
          const j = (r.jurisdiction ?? {}) as any;
          return String(j.state ?? "").toLowerCase().includes(l) || String(j.district ?? "").toLowerCase().includes(l);
        });
      }
      results = out;
    } else if (entity === "departments") {
      const like = `%${raw}%`;
      const { data: rows } = await sb.from("departments").select("*")
        .or(`name.ilike.${like},code.ilike.${like},description.ilike.${like}`).limit(50);
      results = rows ?? [];
    } else if (entity === "establishments") {
      let q2 = sb.from("establishments")
        .select("id, name, registration_number, category, status, expiry_date, department_id, address, pincode")
        .limit(50);
      if (deptMatch) q2 = q2.eq("department_id", deptMatch.id);
      if (status === "expired") q2 = q2.lt("expiry_date", today).eq("status", "active");
      else if (status && ["active", "suspended", "archived"].includes(status)) q2 = q2.eq("status", status);
      if (location) q2 = q2.or(`address.ilike.%${location}%,pincode.ilike.%${location}%`);
      // free text fallback
      const words = raw.split(/\s+/).filter((w) => w.length >= 4 && !/\b(show|find|list|all|the|with|expired|licenses|licences|establishments|in|at|for)\b/i.test(w));
      if (words.length && !deptMatch && !location) q2 = q2.ilike("name", `%${words[0]}%`);
      const { data: rows } = await q2;
      results = rows ?? [];
    } else if (entity === "inspections") {
      let q2 = sb.from("inspections")
        .select("id, status, scheduled_date, establishment_id, department_id, inspector_id")
        .limit(50)
        .order("scheduled_date", { ascending: false });
      if (deptMatch) q2 = q2.eq("department_id", deptMatch.id);
      if (status === "overdue") q2 = q2.eq("status", "pending").lt("scheduled_date", today);
      else if (status && ["pending", "in_progress", "completed"].includes(status)) q2 = q2.eq("status", status);
      if (dateFilter) {
        if (dateFilter.op === "eq") q2 = q2.eq("scheduled_date", dateFilter.a);
        else if (dateFilter.op === "between") q2 = q2.gte("scheduled_date", dateFilter.a).lte("scheduled_date", dateFilter.b!);
      }
      const { data: rows } = await q2;
      results = rows ?? [];
    }

    return { interpretation, entity, results };
  });


