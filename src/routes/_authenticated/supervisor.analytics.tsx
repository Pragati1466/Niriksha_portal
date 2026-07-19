import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Users,
  Brain,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AnalyticsPeriod,
  getAnalyticsSummary,
  getInspectionTrends,
  getRiskDistributionAnalytics,
  getDeptPerformance,
  getInspectorProductivity,
  getTurnaroundTrend,
} from "@/lib/supervisor.functions";

export const Route = createFileRoute("/_authenticated/supervisor/analytics")({
  head: () => ({ meta: [{ title: "Analytics — NIRIKSHA Supervisor" }] }),
  component: AnalyticsDashboardPage,
});

/* ─────────────────────────────────────────────────────────────
   Page root
───────────────────────────────────────────────────────────── */

function AnalyticsDashboardPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");

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
          Inspection performance, risk distribution, and productivity metrics.
        </p>
      </header>

      {/* Period tabs — a single useState drives the selected period,
          which is passed to every queryKey + queryFn below. */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
        <TabsList className="bg-muted/60">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>

        {(["week", "month", "quarter", "year"] as AnalyticsPeriod[]).map((p) => (
          <TabsContent key={p} value={p} className="mt-5 space-y-5">
            {/* Only mount the active tab so queries don't fire for hidden tabs */}
            {p === period && <AnalyticsContent period={p} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   All charts — period flows into every queryKey and queryFn
───────────────────────────────────────────────────────────── */

function AnalyticsContent({ period }: { period: AnalyticsPeriod }) {
  /* 1. Summary KPIs: Total Inspections + Avg Turnaround */
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary", period],
    queryFn:  () => getAnalyticsSummary(period),
    refetchOnWindowFocus: false,
  });

  /* 2. Inspection Trends — LineChart */
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["analytics-trends", period],
    queryFn:  () => getInspectionTrends(period),
    refetchOnWindowFocus: false,
  });

  /* 3. Risk Distribution — PieChart (period-independent: snapshot of current state) */
  const { data: riskDist, isLoading: riskLoading } = useQuery({
    queryKey: ["analytics-risk-dist"],
    queryFn:  getRiskDistributionAnalytics,
    refetchOnWindowFocus: false,
  });

  /* 4. Department Performance — BarChart */
  const { data: deptPerf, isLoading: deptLoading } = useQuery({
    queryKey: ["analytics-dept-perf", period],
    queryFn:  () => getDeptPerformance(period),
    refetchOnWindowFocus: false,
  });

  /* 5. Inspector Productivity — horizontal BarChart */
  const { data: inspectorProd, isLoading: inspectorLoading } = useQuery({
    queryKey: ["analytics-inspector-prod", period],
    queryFn:  () => getInspectorProductivity(period),
    refetchOnWindowFocus: false,
  });

  /* 6. Turnaround Trend — AreaChart */
  const { data: turnaround, isLoading: turnaroundLoading } = useQuery({
    queryKey: ["analytics-turnaround", period],
    queryFn:  () => getTurnaroundTrend(period),
    refetchOnWindowFocus: false,
  });

  /* Derived: does the data contain at least one non-zero point? */
  const hasTrends     = (trends?.length     ?? 0) > 0 && (trends?.some((t) => t.total > 0) ?? false);
  const hasRisk       = (riskDist?.length   ?? 0) > 0;
  const hasDept       = (deptPerf?.length   ?? 0) > 0;
  const hasInspector  = (inspectorProd?.length ?? 0) > 0;
  const hasTurnaround = (turnaround?.length ?? 0) > 0;

  return (
    <>
      {/* ── Row 1: Summary KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        {/* Total Inspections — from getAnalyticsSummary */}
        <SummaryCard
          label="Total Inspections"
          icon={BarChart3}
          loading={summaryLoading}
          value={!summaryLoading && summary !== undefined ? String(summary.totalInspections) : undefined}
        />

        {/* Avg Turnaround — from getAnalyticsSummary */}
        <SummaryCard
          label="Avg. Turnaround"
          icon={Clock}
          loading={summaryLoading}
          value={
            !summaryLoading &&
            summary?.avgTurnaroundDays !== null &&
            summary?.avgTurnaroundDays !== undefined
              ? `${summary.avgTurnaroundDays}d`
              : undefined
          }
          sub="days (scheduled → actual)"
          placeholder={!summaryLoading ? "No completed data" : undefined}
        />

        {/* Approval Rate — no supervisor_decision column in schema */}
        <SummaryCard
          label="Approval Rate"
          icon={CheckCircle2}
          accent="ok"
          loading={false}
          value={undefined}
          placeholder="No decision data"
        />

        {/* AI Acceptance Rate — AI pipeline not yet connected */}
        <SummaryCard
          label="AI Acceptance Rate"
          icon={Brain}
          accent="primary"
          loading={false}
          value={undefined}
          placeholder="Awaiting AI review data"
        />
      </div>

      {/* ── Row 2: Inspection Trends + Risk Distribution ── */}
      <div className="grid gap-4 xl:grid-cols-3">

        {/* Inspection Trends — LineChart with 4 status series */}
        <div className="xl:col-span-2">
          <ChartPanel
            title="Inspection Trends Over Time"
            icon={TrendingUp}
            description="Inspections by status, grouped by time bucket."
            loading={trendsLoading}
            hasData={hasTrends}
            emptyDetail="No inspections found in this period."
            height={240}
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trends} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v: string) => v === "in_progress" ? "In Progress" : capitalize(v)}
                />
                <Line type="monotone" dataKey="completed"   stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pending"     stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="in_progress" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled"   stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        {/* Risk Distribution — PieChart from getRiskDistributionAnalytics */}
        <ChartPanel
          title="Risk Distribution"
          icon={ShieldAlert}
          description="Current risk levels across supervised establishments."
          loading={riskLoading}
          hasData={hasRisk}
          emptyDetail="No risk profiles found for your establishments."
          height={240}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={riskDist}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={75}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {riskDist?.map((entry, i) => (
                  <Cell key={`rc-${i}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* ── Row 3: Department Performance + Inspector Productivity ── */}
      <div className="grid gap-4 xl:grid-cols-2">

        {/* Department Performance — vertical BarChart from getDeptPerformance */}
        <ChartPanel
          title="Department-wise Inspection Performance"
          icon={BarChart3}
          description="Completed inspections per department."
          loading={deptLoading}
          hasData={hasDept}
          emptyDetail="No completed inspections in this period."
          height={230}
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={deptPerf} margin={{ top: 10, right: 16, left: -16, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Inspector Productivity — horizontal BarChart from getInspectorProductivity */}
        <ChartPanel
          title="Inspector Productivity (Top 10)"
          icon={Users}
          description="Completed inspections per inspector in this period."
          loading={inspectorLoading}
          hasData={hasInspector}
          emptyDetail="No completed inspections in this period."
          height={230}
        >
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              layout="vertical"
              data={inspectorProd}
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="inspectorName"
                width={110}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="completed" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* ── Row 4: Turnaround + Approval vs Rejection + AI Acceptance ── */}
      <div className="grid gap-4 xl:grid-cols-3">

        {/* Report Turnaround — AreaChart from getTurnaroundTrend */}
        <ChartPanel
          title="Report Turnaround Time"
          icon={Clock}
          description="Avg days from scheduled date to actual inspection date."
          loading={turnaroundLoading}
          hasData={hasTurnaround}
          emptyDetail="No completed inspections with both date fields in this period."
          height={200}
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={turnaround} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="taGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                unit="d"
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v} days`, "Avg turnaround"]}
              />
              <Area
                type="monotone"
                dataKey="avgDays"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#taGrad)"
                name="Avg Days"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Approval vs Rejection — no supervisor_decision column in schema */}
        <PlaceholderPanel
          title="Approval vs Rejection"
          icon={CheckCircle2}
          message="No supervisor review decisions available yet."
          detail="This chart will render when supervisor approval/rejection data is added to the schema."
          height={200}
        />

        {/* AI Recommendation Acceptance — AI pipeline not yet connected */}
        <PlaceholderPanel
          title="AI Recommendation Acceptance"
          icon={Brain}
          message="Awaiting AI review data."
          detail="This section will be connected to the AI agent pipeline when it is ready."
          height={200}
          badge="AI Pending"
        />
      </div>

      {/* ── Row 5: Review Activity Timeline ── */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
          <Activity className="h-4 w-4 shrink-0 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground">
            Review Activity Timeline
          </CardTitle>
          <Badge variant="secondary" className="ml-auto text-[10px]">No data</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={Activity}
            title="No supervisor activity available."
            detail="Audit log access is restricted to admins. Supervisor review history will appear here when activity tracking is enabled for supervisors."
            height={120}
          />
        </CardContent>
      </Card>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared tooltip style constant
───────────────────────────────────────────────────────────── */

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

/* ─────────────────────────────────────────────────────────────
   Primitive components
───────────────────────────────────────────────────────────── */

type Accent = "default" | "ok" | "warn" | "primary";

function SummaryCard({
  label,
  icon: Icon,
  accent = "default",
  loading,
  value,
  sub,
  placeholder,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: Accent;
  loading: boolean;
  value?: string;
  sub?: string;
  placeholder?: string;
}) {
  const iconBg: Record<Accent, string> = {
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

        {loading ? (
          <Skeleton className="mt-3 h-7 w-14" />
        ) : value !== undefined ? (
          <div className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {value}
          </div>
        ) : (
          <div className="mt-3 text-xs italic text-muted-foreground">
            {placeholder ?? "—"}
          </div>
        )}

        {sub && (
          <div className="mt-1.5 text-[11px] text-muted-foreground">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartPanel({
  title,
  icon: Icon,
  description,
  loading,
  hasData,
  emptyDetail,
  height,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  loading: boolean;
  hasData: boolean;
  emptyDetail: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm font-semibold text-foreground">{title}</CardTitle>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{description}</p>
        </div>
        {!loading && !hasData && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">No data</Badge>
        )}
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <Skeleton className="w-full rounded" style={{ height }} />
        ) : hasData ? (
          children
        ) : (
          <EmptyState icon={Icon} title={title} detail={emptyDetail} height={height} />
        )}
      </CardContent>
    </Card>
  );
}

function PlaceholderPanel({
  title,
  icon: Icon,
  message,
  detail,
  height,
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  detail: string;
  height: number;
  badge?: string;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm font-semibold text-foreground">{title}</CardTitle>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {badge ?? "Unavailable"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <EmptyState icon={Icon} title={message} detail={detail} height={height} />
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  height,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail?: string;
  height: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 px-6 text-center"
      style={{ height }}
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {detail && (
          <p className="mt-0.5 max-w-[260px] text-[11px] text-muted-foreground/70">{detail}</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────── */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
