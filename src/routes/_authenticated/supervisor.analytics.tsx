import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  TrendingUp,
  Users,
  Brain,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  PieChart,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/supervisor/analytics")({
  head: () => ({ meta: [{ title: "Analytics — NIRIKSHA Supervisor" }] }),
  component: AnalyticsDashboardPage,
});

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */

function AnalyticsDashboardPage() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>NIRIKSHA</span>
          <ChevronRight className="h-3 w-3" />
          <span>Supervisor Console</span>
          <ChevronRight className="h-3 w-3" />
          <span>Analytics</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspection performance, risk distribution, and AI adoption metrics.
        </p>
      </header>

      {/* Period tabs */}
      <Tabs defaultValue="month">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>

        {/* All periods share the same layout — data changes by period */}
        {["week", "month", "quarter", "year"].map((period) => (
          <TabsContent key={period} value={period} className="mt-5 space-y-5">
            <AnalyticsContent />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AnalyticsContent() {
  return (
    <>
      {/* Row 1: Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Inspections"          icon={BarChart3}   />
        <StatCard label="Approval Rate"              icon={CheckCircle2} accent="ok" />
        <StatCard label="Avg. Turnaround"            icon={Clock}        sub="hours" />
        <StatCard label="AI Acceptance Rate"         icon={Brain}        accent="primary" />
      </div>

      {/* Row 2: Trend + Risk distribution */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Inspection Trends Over Time"
            icon={TrendingUp}
            description="Total inspections submitted, approved, and rejected per period."
            height={220}
          />
        </div>
        <ChartCard
          title="Risk Distribution"
          icon={PieChart}
          description="Breakdown of inspections by risk level."
          height={220}
        />
      </div>

      {/* Row 3: Dept performance + Inspector productivity */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Department-wise Inspection Performance"
          icon={BarChart3}
          description="Inspections completed per department."
          height={200}
        />
        <ChartCard
          title="Inspector Productivity"
          icon={Users}
          description="Inspections completed per inspector in the selected period."
          height={200}
        />
      </div>

      {/* Row 4: Approval vs Rejection + AI acceptance */}
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Approval vs Rejection"
          icon={CheckCircle2}
          description="Supervisor decision outcomes over time."
          height={180}
        />
        <ChartCard
          title="AI Recommendation Acceptance"
          icon={Brain}
          description="% of AI reports accepted, modified, or overridden."
          height={180}
        />
        <ChartCard
          title="Report Turnaround Time"
          icon={Clock}
          description="Time from inspector submission to supervisor approval."
          height={180}
        />
      </div>

      {/* Row 5: Activity timeline */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
          <Activity className="h-4 w-4 shrink-0 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground">Review Activity Timeline</CardTitle>
          <Badge variant="secondary" className="ml-auto text-[10px]">Awaiting data</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <ChartEmptyState
            icon={Activity}
            label="Activity Timeline"
            detail="Inspector submission and supervisor decision events will be plotted here."
            height={140}
          />
        </CardContent>
      </Card>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Primitives
───────────────────────────────────────────────────────────── */

type StatAccent = "default" | "ok" | "warn" | "primary";

function StatCard({
  label,
  icon: Icon,
  accent = "default",
  sub,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: StatAccent;
  sub?: string;
}) {
  const iconBg: Record<StatAccent, string> = {
    default: "bg-muted text-muted-foreground",
    ok:      "bg-emerald-500/10 text-emerald-600",
    warn:    "bg-amber-500/10 text-amber-600",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground leading-tight">
            {label}
          </span>
          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${iconBg[accent]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        {/* Value slot */}
        <div className="mt-3 h-7 w-14 rounded bg-muted/60" />
        {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  icon: Icon,
  description,
  height,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  height: number;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm font-semibold text-foreground">{title}</CardTitle>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">Awaiting data</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ChartEmptyState icon={Icon} label={title} height={height} />
      </CardContent>
    </Card>
  );
}

function ChartEmptyState({
  icon: Icon,
  label,
  detail,
  height,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  height: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 border-dashed text-center px-6"
      style={{ height }}
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 max-w-[260px] text-[11px] text-muted-foreground/70">
          {detail ?? "Chart will render here once inspection data is connected to the dashboard."}
        </p>
      </div>
    </div>
  );
}
