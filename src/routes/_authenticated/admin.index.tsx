import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { getDashboardOverview, globalSearch } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Factory, Users, UserCheck, Clock, ListChecks,
  Search, Plus, UserPlus, FolderPlus, ClipboardList,
  Activity, ShieldAlert, Bell, ArrowUpRight, CircleDot,
  Server, Database, Cpu, Sparkles, AlertTriangle, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const fn = useServerFn(getDashboardOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => fn(),
    refetchOnWindowFocus: false,
  });

  const kpis = data?.kpis;

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader />

      {/* KPI cards */}
      <section>
        <SectionLabel>Overview</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Departments" value={kpis?.departments} icon={Building2} loading={isLoading} />
          <Kpi label="Establishments" value={kpis?.establishments} icon={Factory} loading={isLoading}
               sub={kpis ? `${kpis.suspendedEstablishments} suspended` : undefined} />
          <Kpi label="Inspectors" value={kpis?.inspectors} icon={Users} loading={isLoading} />
          <Kpi label="Supervisors" value={kpis?.supervisors} icon={UserCheck} loading={isLoading} />
          <Kpi label="Pending Assignments" value={kpis?.pending} icon={Clock} loading={isLoading}
               accent={kpis && kpis.overdueInspections > 0 ? "warn" : "default"}
               sub={kpis ? `${kpis.overdueInspections} overdue` : undefined} />
        </div>
      </section>

      {/* Row 2: Users preview + Recent activity */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <UsersPanel users={data?.recentUsers ?? []} loading={isLoading} />
        </div>
        <ActivityPanel items={data?.recentActivity ?? []} loading={isLoading} />
      </div>

      {/* Row 3: Establishments + Departments */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EstablishmentsPanel items={data?.recentEstablishments ?? []} loading={isLoading} />
        </div>
        <DepartmentsPanel items={data?.departments ?? []} loading={isLoading} />
      </div>

      {/* Row 4: Assignment shortcut + Notifications */}
      <div className="grid gap-4 xl:grid-cols-3">
        <AssignmentPanel kpis={kpis} loading={isLoading} />
        <div className="xl:col-span-2">
          <NotificationsPanel kpis={kpis} loading={isLoading} />
        </div>
      </div>

      {/* Row 5: Quick actions + System health */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QuickActionsPanel />
        </div>
        <SystemHealthPanel />
      </div>
    </div>
  );
}

/* ---------- Header (title + global search) ---------- */

function DashboardHeader() {
  const [q, setQ] = useState("");
  const search = useServerFn(globalSearch);
  const mut = useMutation({ mutationFn: (query: string) => search({ data: { q: query } }) });

  const results = mut.data;
  const hasResults = results && (
    results.establishments.length + results.users.length + results.departments.length + results.inspections.length > 0
  );

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>NIRIKSHA</span>
          <ChevronRight className="h-3 w-3" />
          <span>Pragati Admin</span>
        </div>
        <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Administrative Control
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure master data, users, and inspection pipelines across the platform.
        </p>
      </div>

      <div className="relative w-full sm:w-[380px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); if (e.target.value.length >= 2) mut.mutate(e.target.value); }}
          placeholder="Search inspectors, establishments, departments…"
          className="h-10 rounded-md border-border/70 bg-card pl-9 pr-16 text-sm shadow-sm"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          Global
        </kbd>
        {q.length >= 2 && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-border/70 bg-popover shadow-lg">
            {mut.isPending && <div className="p-3 text-xs text-muted-foreground">Searching…</div>}
            {!mut.isPending && !hasResults && <div className="p-3 text-xs text-muted-foreground">No matches.</div>}
            {hasResults && (
              <div className="max-h-[360px] overflow-y-auto">
                <SearchGroup title="Establishments" items={results!.establishments.map((r: any) => ({ id: r.id, label: r.name, meta: r.category ?? "—", href: "/admin/establishments" }))} />
                <SearchGroup title="Users" items={results!.users.map((r: any) => ({ id: r.id, label: r.name || r.email, meta: r.email, href: "/admin/users" }))} />
                <SearchGroup title="Departments" items={results!.departments.map((r: any) => ({ id: r.id, label: r.name, meta: r.code ?? "—", href: "/admin/departments" }))} />
                <SearchGroup title="Inspections" items={results!.inspections.map((r: any) => ({ id: r.id, label: r.id.slice(0, 8), meta: r.status, href: "/admin/assignments" }))} />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function SearchGroup({ title, items }: { title: string; items: Array<{ id: string; label: string; meta: string; href: string }> }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {items.map((i) => (
        <Link
          key={i.id}
          to={i.href}
          className="flex items-center justify-between gap-3 border-t border-border/50 px-3 py-2 text-sm hover:bg-accent"
        >
          <span className="truncate font-medium text-foreground">{i.label}</span>
          <span className="truncate text-xs text-muted-foreground">{i.meta}</span>
        </Link>
      ))}
    </div>
  );
}

/* ---------- Primitives ---------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

function PanelCard({ title, icon: Icon, action, children }: {
  title: string; icon: React.ComponentType<{ className?: string }>; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <CardTitle className="truncate text-sm font-semibold text-foreground">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function Kpi({ label, value, icon: Icon, loading, sub, accent = "default" }: {
  label: string; value?: number; icon: React.ComponentType<{ className?: string }>;
  loading?: boolean; sub?: string; accent?: "default" | "warn";
}) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
          <div className={`grid h-8 w-8 place-items-center rounded-lg ${accent === "warn" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {loading ? <span className="text-muted-foreground">—</span> : (value ?? 0).toLocaleString()}
        </div>
        {sub && <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

/* ---------- Panels ---------- */

function UsersPanel({ users, loading }: { users: any[]; loading?: boolean }) {
  return (
    <PanelCard title="User Management" icon={Users}
      action={<Link to="/admin/users" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">Open <ArrowUpRight className="h-3 w-3" /></Link>}
    >
      <div className="divide-y divide-border/60">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_90px] items-center gap-3 bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Name / Email</span>
          <span>Joined</span>
          <span className="text-right">Status</span>
        </div>
        {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!loading && users.length === 0 && <div className="p-4 text-sm text-muted-foreground">No recent users.</div>}
        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-[minmax(0,1fr)_120px_90px] items-center gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{u.name || "—"}</div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : "—"}
            </div>
            <div className="flex justify-end">
              {u.is_active ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Active</Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">Inactive</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function ActivityPanel({ items, loading }: { items: any[]; loading?: boolean }) {
  return (
    <PanelCard title="Recent Activity" icon={Activity}
      action={<Link to="/admin/audit" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">Audit log <ArrowUpRight className="h-3 w-3" /></Link>}
    >
      <div className="p-4">
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
        <ol className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex gap-3">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{humanAction(a.action)}</span>
                  <Badge variant="outline" className="border-border/60 text-[10px] uppercase tracking-wider">{a.entity_type}</Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {a.actor_email ?? "system"} · {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </PanelCard>
  );
}

function humanAction(a: string) {
  return a === "INSERT" ? "Created" : a === "UPDATE" ? "Updated" : a === "DELETE" ? "Deleted" : a;
}

function EstablishmentsPanel({ items, loading }: { items: any[]; loading?: boolean }) {
  return (
    <PanelCard title="Establishment Registry" icon={Factory}
      action={<Link to="/admin/establishments" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">Registry <ArrowUpRight className="h-3 w-3" /></Link>}
    >
      <div className="divide-y divide-border/60">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_100px] items-center gap-3 bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Name</span>
          <span>Category</span>
          <span className="text-right">Status</span>
        </div>
        {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && <div className="p-4 text-sm text-muted-foreground">No establishments.</div>}
        {items.map((e) => (
          <div key={e.id} className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_100px] items-center gap-3 px-4 py-2.5 text-sm">
            <div className="truncate font-medium text-foreground">{e.name}</div>
            <div className="truncate text-xs text-muted-foreground">{e.category ?? "—"}</div>
            <div className="flex justify-end">
              <StatusPill status={e.status} />
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    suspended: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    archived: "bg-muted text-muted-foreground",
  };
  return <Badge variant="secondary" className={`${map[status] ?? "bg-muted"} capitalize`}>{status}</Badge>;
}

function DepartmentsPanel({ items, loading }: { items: any[]; loading?: boolean }) {
  return (
    <PanelCard title="Department Overview" icon={Building2}
      action={<Link to="/admin/departments" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">Manage <ArrowUpRight className="h-3 w-3" /></Link>}
    >
      <div className="p-3">
        {loading && <div className="p-2 text-sm text-muted-foreground">Loading…</div>}
        {!loading && items.length === 0 && <div className="p-2 text-sm text-muted-foreground">No departments.</div>}
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="rounded-md border border-border/60 bg-background p-3 transition hover:border-primary/40">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{d.name}</div>
                  {d.code && <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.code}</div>}
                </div>
                {d.pending > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">{d.pending} pending</Badge>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <Metric label="Establishments" value={d.establishments} />
                <Metric label="Inspectors" value={d.inspectors} />
                <Metric label="Pending" value={d.pending} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-muted/40 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function AssignmentPanel({ kpis, loading }: { kpis?: any; loading?: boolean }) {
  return (
    <PanelCard title="Inspection Assignments" icon={ClipboardList}
      action={<Link to="/admin/assignments" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">Assign <ArrowUpRight className="h-3 w-3" /></Link>}
    >
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Pending" value={kpis?.pending} tone="warn" loading={loading} />
          <MiniStat label="In progress" value={kpis?.inProgress} tone="info" loading={loading} />
          <MiniStat label="Completed" value={kpis?.completed} tone="ok" loading={loading} />
        </div>
        <Separator />
        <Link to="/admin/assignments" className="flex w-full items-center justify-between rounded-md border border-dashed border-border/70 bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/60 hover:bg-accent">
          Open assignment console
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </PanelCard>
  );
}

function MiniStat({ label, value, tone, loading }: { label: string; value?: number; tone: "warn" | "info" | "ok"; loading?: boolean }) {
  const toneMap = {
    warn: "text-amber-600",
    info: "text-primary",
    ok: "text-emerald-600",
  } as const;
  return (
    <div className="rounded-md border border-border/60 bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${toneMap[tone]}`}>
        {loading ? "—" : (value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}

function NotificationsPanel({ kpis, loading }: { kpis?: any; loading?: boolean }) {
  const alerts = useMemo(() => {
    if (!kpis) return [];
    const a: Array<{ id: string; icon: any; title: string; detail: string; href: string; tone: "warn" | "info" | "ok" }> = [];
    if (kpis.overdueInspections > 0) a.push({ id: "overdue", icon: AlertTriangle, title: `${kpis.overdueInspections} overdue inspections`, detail: "Scheduled date has passed while status is still pending.", href: "/admin/assignments", tone: "warn" });
    if (kpis.inactiveUsers > 0) a.push({ id: "inactive", icon: ShieldAlert, title: `${kpis.inactiveUsers} inactive users`, detail: "Deactivated accounts cannot sign in.", href: "/admin/users", tone: "warn" });
    if (kpis.suspendedEstablishments > 0) a.push({ id: "suspended", icon: Factory, title: `${kpis.suspendedEstablishments} suspended establishments`, detail: "Not eligible for new assignments.", href: "/admin/establishments", tone: "warn" });
    if (kpis.templates === 0) a.push({ id: "templates", icon: ListChecks, title: "No checklist templates configured", detail: "Inspectors need at least one template per department.", href: "/admin/templates", tone: "info" });
    if (a.length === 0) a.push({ id: "ok", icon: CircleDot, title: "All systems nominal", detail: "No open administrative alerts.", href: "/admin", tone: "ok" });
    return a;
  }, [kpis]);

  return (
    <PanelCard title="Notifications & Alerts" icon={Bell}>
      <div className="divide-y divide-border/60">
        {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!loading && alerts.map((a) => (
          <Link key={a.id} to={a.href} className="flex items-start gap-3 px-4 py-3 hover:bg-accent">
            <a.icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.tone === "warn" ? "text-amber-600" : a.tone === "ok" ? "text-emerald-600" : "text-primary"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{a.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{a.detail}</div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </PanelCard>
  );
}

function QuickActionsPanel() {
  const actions = [
    { icon: UserPlus, label: "Add Inspector", detail: "Create inspector account", href: "/admin/users" },
    { icon: Factory, label: "Register Establishment", detail: "Add to registry", href: "/admin/establishments" },
    { icon: FolderPlus, label: "Create Department", detail: "New regulatory body", href: "/admin/departments" },
    { icon: ClipboardList, label: "Assign Inspection", detail: "Schedule and dispatch", href: "/admin/assignments" },
  ];
  return (
    <PanelCard title="Quick Actions" icon={Sparkles}>
      <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2">
        {actions.map((a) => (
          <Link key={a.label} to={a.href}
            className="group flex items-center gap-3 bg-card p-4 transition hover:bg-accent">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{a.label}</div>
              <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
            </div>
            <Plus className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </PanelCard>
  );
}

function SystemHealthPanel() {
  const services = [
    { icon: Server, label: "Backend API", status: "operational" },
    { icon: Database, label: "Database", status: "operational" },
    { icon: Cpu, label: "AI Services", status: "operational" },
    { icon: Bell, label: "Notifications", status: "operational" },
  ];
  return (
    <PanelCard title="System Health" icon={Activity}>
      <div className="divide-y divide-border/60">
        {services.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <s.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium text-foreground">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium capitalize text-emerald-700 dark:text-emerald-300">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
