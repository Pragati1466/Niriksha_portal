import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ClipboardList,
  ClipboardCheck,
  ShieldAlert,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  Brain,
  ChevronRight,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSupervisorKpis,
  getInspectionStatusCounts,
  getSupervisorReviewActivity,
  getAvgInspectorProductivity,
  getHighRiskCoverage,
  getAvgTurnaroundHours,
  getAIAcceptanceRateAllTime,
  type ReviewActivityEntry,
} from "@/lib/supervisor.functions";

export const Route = createFileRoute("/_authenticated/supervisor/")({
  head: () => ({ meta: [{ title: "Supervisor Overview — NIRIKSHA" }] }),
  component: SupervisorOverviewPage,
});

type Accent = "default" | "warn" | "ok" | "danger";

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */

function SupervisorOverviewPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["supervisor-kpis"],
    queryFn: getSupervisorKpis,
    refetchOnWindowFocus: false,
  });

  const { data: statusCounts, isLoading: statusLoading } = useQuery({
    queryKey: ["supervisor-status-counts"],
    queryFn: getInspectionStatusCounts,
    refetchOnWindowFocus: false,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["supervisor-review-activity"],
    queryFn: () => getSupervisorReviewActivity(8),
    refetchOnWindowFocus: false,
  });

  const { data: avgInspectorProd, isLoading: avgInspectorLoading } = useQuery({
    queryKey: ["supervisor-avg-inspector-prod"],
    queryFn: () => getAvgInspectorProductivity("year"),
    refetchOnWindowFocus: false,
  });

  const { data: highRiskCoverage, isLoading: highRiskCoverageLoading } = useQuery({
    queryKey: ["supervisor-high-risk-coverage"],
    queryFn: getHighRiskCoverage,
    refetchOnWindowFocus: false,
  });

  const { data: avgTurnaroundHours, isLoading: avgTurnaroundLoading } = useQuery({
    queryKey: ["supervisor-avg-turnaround-hours"],
    queryFn: getAvgTurnaroundHours,
    refetchOnWindowFocus: false,
  });

  const { data: aiAcceptance, isLoading: aiAcceptanceLoading } = useQuery({
    queryKey: ["supervisor-ai-acceptance-rate"],
    queryFn: getAIAcceptanceRateAllTime,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>NIRIKSHA</span>
          <ChevronRight className="h-3 w-3" />
          <span>Supervisor Console</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decision-making control room — review AI-processed inspections and take regulatory action.
        </p>
      </header>

      {/* Primary KPI row */}
      <section>
        <SectionLabel>Inspection Summary</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total Inspections"        icon={ClipboardList} accent="default" value={kpis?.totalInspections}     loading={kpisLoading} />
          <KpiCard label="Pending Reviews"          icon={Clock}         accent="warn"    value={kpis?.pendingReview}         loading={kpisLoading} />
          <KpiCard label="Completed"                icon={CheckCircle2}  accent="ok"      value={kpis?.completed}             loading={kpisLoading} />
          <KpiCard label="High-Risk Establishments" icon={ShieldAlert}   accent="danger"  value={kpis?.highRiskEstablishments} loading={kpisLoading} labelClassName="-ml-3" iconBoxClassName="h-7 w-7 -ml-1.5" iconClassName="h-3.5 w-3.5" />
          <KpiCard label="In Progress"              icon={AlertTriangle} accent="warn"    value={kpis?.inProgress}            loading={kpisLoading} />
          <KpiCard label="Cancelled"                icon={FileText}      accent="default" value={kpis?.cancelled}             loading={kpisLoading} />
        </div>
      </section>

      {/* Secondary KPI row — derived metrics, kept as placeholders until analytics are built */}
      <section>
        <SectionLabel>Performance Indicators</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="High-Risk Coverage"    icon={ShieldAlert} accent="danger"  value={highRiskCoverage ?? undefined}               loading={highRiskCoverageLoading} sub="% of high-risk inspections reviewed" />
          <KpiCard label="Avg. Report Turnaround" icon={Clock}      accent="default" value={avgTurnaroundHours ?? undefined}              loading={avgTurnaroundLoading}    sub="Hours from submission to approval" />
          <KpiCard label="Inspector Productivity" icon={Users}      accent="default" value={avgInspectorProd ?? undefined}                loading={avgInspectorLoading}     sub="Avg. inspections per inspector" />
          <KpiCard label="AI Acceptance Rate"     icon={Brain}      accent="default" value={aiAcceptance?.acceptanceRate ?? undefined}    loading={aiAcceptanceLoading}     sub="% of AI reports accepted as-is" />
        </div>
      </section>

      {/* Two-column mid section */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentActivityPanel items={activity ?? []} loading={activityLoading} />
        </div>
        <QuickActionsPanel />
      </div>

      {/* Status breakdown row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <InspectionStatusPanel counts={statusCounts} loading={statusLoading} />
        <div className="xl:col-span-2">
          <AIInsightsSummaryPanel />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Primitives
───────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

function KpiCard({
  label,
  icon: Icon,
  accent = "default",
  value,
  loading,
  sub,
  labelClassName = "",
  iconBoxClassName = "h-8 w-8",
  iconClassName = "h-4 w-4",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: Accent;
  value?: number;
  loading?: boolean;
  sub?: string;
  labelClassName?: string;
  iconBoxClassName?: string;
  iconClassName?: string;
}) {
  const iconBg: Record<Accent, string> = {
    default: "bg-primary/10 text-primary",
    warn:    "bg-amber-500/10 text-amber-600",
    ok:      "bg-emerald-500/10 text-emerald-600",
    danger:  "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground leading-tight pr-2 ${labelClassName}`}>
            {label}
          </span>
          <div className={`grid ${iconBoxClassName} shrink-0 place-items-center rounded-lg ${iconBg[accent]}`}>
            <Icon className={iconClassName} />
          </div>
        </div>
        <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : value !== undefined ? (
            value.toLocaleString()
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </div>
        {sub && <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function PanelCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
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

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="max-w-[240px] text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Panels
───────────────────────────────────────────────────────────── */

function RecentActivityPanel({
  items,
  loading,
}: {
  items: ReviewActivityEntry[];
  loading: boolean;
}) {
  const decisionColor = (d: "approved" | "rejected") =>
    d === "approved"
      ? "bg-emerald-500"
      : "bg-destructive";

  const decisionLabel = (d: "approved" | "rejected") =>
    d === "approved" ? "Approved" : "Rejected";

  return (
    <PanelCard
      title="Recent Review Activity"
      icon={Activity}
      action={
        <Link
          to="/supervisor/reviews"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          View queue <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
    >
      <div className="p-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <EmptyState
            icon={ClipboardCheck}
            title="No recent activity"
            detail="Your review actions will appear here once you start approving or rejecting inspections."
          />
        )}
        {!loading && items.length > 0 && (
          <div className="h-[188px] overflow-y-auto pr-2">
  <ol className="space-y-3">
    {items.map((a) => (
      <li key={a.id} className="flex gap-3">
        <div
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${decisionColor(a.decision)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {decisionLabel(a.decision)}
            </span>
            <span className="truncate text-foreground">
              {a.establishmentName}
            </span>
          </div>

          {a.remarks && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {a.remarks}
            </div>
          )}

          <div className="mt-0.5 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(a.reviewedAt), {
              addSuffix: true,
            })}
          </div>
        </div>
      </li>
    ))}
  </ol>
</div>
        )}
      </div>
    </PanelCard>
  );
}

function QuickActionsPanel() {
  const actions = [
    { icon: ClipboardList, label: "Review Queue",  detail: "Open pending inspections",  href: "/supervisor/reviews"   as const },
    { icon: ShieldAlert,   label: "Risk Monitor",  detail: "High-risk establishments",  href: "/supervisor/risk"      as const },
    { icon: TrendingUp,    label: "Analytics",     detail: "Inspection trends",          href: "/supervisor/analytics" as const },
    { icon: FileText,      label: "Reports",       detail: "Export & download",          href: "/supervisor/reports"   as const },
  ];

  return (
    <PanelCard title="Quick Actions" icon={Eye}>
      <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.href}
            className="group flex items-center gap-3 bg-card p-4 transition hover:bg-accent"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight text-foreground">
  {a.label}
</div>

<div className="mt-1 text-xs leading-snug text-muted-foreground">
  {a.detail}
</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </PanelCard>
  );
}

function InspectionStatusPanel({
  counts,
  loading,
}: {
  counts?: { pending: number; in_progress: number; completed: number; cancelled: number };
  loading: boolean;
}) {
  const statuses = [
    { label: "Pending Review", icon: Clock,        color: "bg-amber-500/10 text-amber-700 dark:text-amber-300", key: "pending"     as const },
    { label: "Completed",      icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", key: "completed"   as const },
    { label: "In Progress",    icon: XCircle,      color: "bg-destructive/10 text-destructive", key: "in_progress" as const },
    { label: "Cancelled",      icon: TrendingUp,   color: "bg-primary/10 text-primary", key: "cancelled"   as const },
  ];

  return (
    <PanelCard title="Inspection Status" icon={ClipboardList}>
      <div className="divide-y divide-border/60">
        {statuses.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="truncate text-sm font-medium text-foreground">{s.label}</span>
            </div>
            {loading ? (
              <Skeleton className="h-5 w-8 rounded" />
            ) : (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {counts?.[s.key] ?? 0}
              </span>
            )}
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function AIInsightsSummaryPanel() {
  const agents = [
    {
      label: "Risk Prioritization Agent",
      description: "Evaluates inspection urgency based on complaint history and compliance records.",
      badge: "Risk",
      badgeColor: "bg-destructive/10 text-destructive",
    },
    {
      label: "Evidence Verification Agent",
      description: "Checks whether uploaded evidence supports the inspector's findings.",
      badge: "Evidence",
      badgeColor: "bg-amber-500/10 text-amber-700",
    },
    {
      label: "Report Generation Agent",
      description: "Automatically generates structured inspection reports from all agent outputs.",
      badge: "Report",
      badgeColor: "bg-primary/10 text-primary",
    },
  ];

  return (
    <PanelCard title="AI Decision Intelligence Engine" icon={Brain}>
      <div className="divide-y divide-border/60">
        {agents.map((a) => (
          <div key={a.label} className="flex items-start gap-3 px-4 py-3">
            <Badge
              variant="secondary"
              className={`mt-0.5 shrink-0 text-[10px] uppercase tracking-wider ${a.badgeColor}`}
            >
              {a.badge}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{a.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary/60" />
              </span>
              <span className="text-[10px] text-muted-foreground">Ready</span>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
