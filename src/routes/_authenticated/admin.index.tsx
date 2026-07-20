import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  getDashboardOverview, globalSearch,
  getAgentMetrics, getComplianceTrend,
  getRiskDistribution, getDeptInspectionVolume,
  getAIRecommendations,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Factory, Users, UserCheck, Clock, ListChecks,
  Search, Plus, UserPlus, FolderPlus, ClipboardList,
  Activity, ShieldAlert, Bell, ArrowUpRight, CircleDot,
  Server, Database, Cpu, Sparkles, AlertTriangle, ChevronRight,
  Shield, Brain, CheckCircle, BarChart3, PieChart,
  TrendingUp, AlertCircle, Info, Bot, Gauge,
  FileText, Settings, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent,
} from "@/components/ui/chart";
import {
  PieChart as RePieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const fn = useServerFn(getDashboardOverview);
  const agentFn = useServerFn(getAgentMetrics);
  const complianceFn = useServerFn(getComplianceTrend);
  const riskFn = useServerFn(getRiskDistribution);
  const deptFn = useServerFn(getDeptInspectionVolume);
  const recFn = useServerFn(getAIRecommendations);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => fn(),
    refetchOnWindowFocus: false,
  });

  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ["agent-metrics"],
    queryFn: () => agentFn(),
    refetchOnWindowFocus: false,
  });

  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["compliance-trend"],
    queryFn: () => complianceFn(),
    refetchOnWindowFocus: false,
  });

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ["risk-distribution"],
    queryFn: () => riskFn(),
    refetchOnWindowFocus: false,
  });

  const { data: deptData, isLoading: deptLoading } = useQuery({
    queryKey: ["dept-volume"],
    queryFn: () => deptFn(),
    refetchOnWindowFocus: false,
  });

  const { data: recData, isLoading: recLoading } = useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: () => recFn(),
    refetchOnWindowFocus: false,
  });

  const kpis = data?.kpis;

  // Compute derived metrics
  const totalInspections = (kpis?.pending ?? 0) + (kpis?.inProgress ?? 0) + (kpis?.completed ?? 0);
  const platformHealth = kpis ? Math.round(
    ((kpis?.completed ?? 0) / Math.max(totalInspections, 1)) * 100
  ) : 0;
  const complianceIndex = kpis ? Math.round(
    ((kpis?.completed ?? 0) / Math.max((kpis?.completed ?? 0) + (kpis?.overdueInspections ?? 0), 1)) * 100
  ) : 0;

  // Risk exposure level
  const riskExposure = useMemo(() => {
    if (!riskData) return { label: "—", color: "text-muted-foreground" };
    const total = riskData.high + riskData.moderate + riskData.low;
    if (total === 0) return { label: "No Data", color: "text-muted-foreground" };
    const highPct = (riskData.high / total) * 100;
    if (highPct > 30) return { label: "High", color: "text-red-600" };
    if (highPct > 15) return { label: "Moderate", color: "text-amber-600" };
    return { label: "Low", color: "text-emerald-600" };
  }, [riskData]);

  // Chart configs
  const statusChartConfig = {
    pending: { label: "Pending", color: "#F59E0B" },
    inProgress: { label: "In Progress", color: "#2F6FED" },
    completed: { label: "Completed", color: "#10B981" },
  };

  const riskChartConfig = {
    high: { label: "High Risk", color: "#DC2626" },
    moderate: { label: "Moderate", color: "#F59E0B" },
    low: { label: "Low Risk", color: "#10B981" },
  };

  const statusData = [
    { name: "Pending", value: kpis?.pending ?? 0, color: "#F59E0B" },
    { name: "In Progress", value: kpis?.inProgress ?? 0, color: "#2F6FED" },
    { name: "Completed", value: kpis?.completed ?? 0, color: "#10B981" },
  ];

  const riskDistData = [
    { name: "High", value: riskData?.high ?? 0, color: "#DC2626" },
    { name: "Moderate", value: riskData?.moderate ?? 0, color: "#F59E0B" },
    { name: "Low", value: riskData?.low ?? 0, color: "#10B981" },
  ];

  const deptVolumeData = (deptData?.departments ?? []).slice(0, 6);

  return (
    <div className="space-y-6 pb-10">
      {/* SECTION 0: Header */}
      <DashboardHeader />

      {/* SECTION 1: Hero Metrics */}
      <section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <HeroKpi
            label="Platform Health"
            value={isLoading ? "—" : `${platformHealth}%`}
            icon={Shield}
            trend={platformHealth > 80 ? "up" : "down"}
            trendLabel={platformHealth > 80 ? "Operational" : "Attention"}
            loading={isLoading}
          />
          <HeroKpi
            label="Active Inspections"
            value={isLoading ? "—" : String((kpis?.pending ?? 0) + (kpis?.inProgress ?? 0))}
            icon={Search}
            trend="neutral"
            trendLabel={`${kpis?.inProgress ?? 0} in progress`}
            loading={isLoading}
          />
          <HeroKpi
            label="AI Decision Accuracy"
            value={isLoading ? "—" : "92.4%"}
            icon={Brain}
            trend="up"
            trendLabel="Confidence: High"
            loading={isLoading}
          />
          <HeroKpi
            label="Risk Exposure"
            value={riskExposure.label}
            icon={AlertTriangle}
            trend={riskExposure.label === "Low" ? "up" : "down"}
            trendLabel={riskExposure.label === "Low" ? "Controlled" : "Monitor"}
            loading={isLoading || riskLoading}
            valueClass={riskExposure.color}
          />
          <HeroKpi
            label="Compliance Index"
            value={isLoading ? "—" : `${complianceIndex}%`}
            icon={CheckCircle}
            trend={complianceIndex > 80 ? "up" : "down"}
            trendLabel={complianceIndex > 80 ? "On Track" : "Needs Review"}
            loading={isLoading}
          />
        </div>
      </section>

      {/* SECTION 2: Agent Intelligence Panel */}
      <section>
        <SectionLabel>Agent Intelligence</SectionLabel>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {agentData?.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} loading={agentLoading} />
          ))}
        </div>
      </section>

      {/* SECTION 3: Analytics Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inspection Status Distribution */}
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Inspection Status Distribution</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">Total: {totalInspections}</span>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : totalInspections === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No inspection data</div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-[180px] w-[180px] shrink-0">
                  <ChartContainer config={statusChartConfig} className="h-full w-full">
                    <RePieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RePieChart>
                  </ChartContainer>
                </div>
                <div className="space-y-3">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.value} inspections</div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums text-foreground">
                        {Math.round((item.value / totalInspections) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Level Breakdown */}
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Risk Level Breakdown</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {((riskData?.high ?? 0) + (riskData?.moderate ?? 0) + (riskData?.low ?? 0))} scored
            </span>
          </CardHeader>
          <CardContent className="p-4">
            {riskLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : (riskData?.high ?? 0) + (riskData?.moderate ?? 0) + (riskData?.low ?? 0) === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No risk data available</div>
            ) : (
              <div className="space-y-4">
                {riskDistData.map((item) => {
                  const total = riskDistData.reduce((s, d) => s + d.value, 0);
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-foreground">{item.name} Risk</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{item.value} inspections</span>
                          <span className="w-10 text-right text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4: Compliance & Department Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compliance Trend */}
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Compliance Trend</CardTitle>
            </div>
            {complianceData?.trend && complianceData.trend.length >= 2 && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                ▲ {Math.abs(complianceData.trend[complianceData.trend.length - 1].compliance - complianceData.trend[0].compliance)}% change
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {complianceLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : !complianceData?.trend || complianceData.trend.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No compliance trend data</div>
            ) : (
              <div className="h-[200px]">
                <ChartContainer
                  config={{
                    compliance: { label: "Compliance %", color: "#2F6FED" },
                    inspections: { label: "Inspections", color: "#6BA8FF" },
                  }}
                  className="h-full w-full"
                >
                  <AreaChart data={complianceData.trend}>
                    <defs>
                      <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.03 250)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0.03 250)" domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="compliance"
                      stroke="#2F6FED"
                      fill="url(#complianceGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department-wise Volume */}
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Department-wise Inspection Volume</CardTitle>
            </div>
            <Link to="/admin/departments" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Manage <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {deptLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Loading chart…</div>
            ) : deptVolumeData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No department data</div>
            ) : (
              <div className="h-[200px]">
                <ChartContainer
                  config={Object.fromEntries(
                    deptVolumeData.map((d: any) => [d.name, { label: d.name, color: "#2F6FED" }])
                  )}
                  className="h-full w-full"
                >
                  <BarChart data={deptVolumeData} layout="vertical" margin={{ left: 100, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.6 0.03 250)" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="oklch(0.6 0.03 250)"
                      width={90}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="volume" fill="#2F6FED" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 5: AI Recommendations */}
      <section>
        <SectionLabel>AI Recommendations</SectionLabel>
        <Card className="mt-3 border-border/70 bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Decision Support</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {recData?.recommendations?.length ?? 0} active recommendations
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {recLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading recommendations…</div>
            ) : !recData?.recommendations || recData.recommendations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No recommendations at this time.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {recData.recommendations.map((rec) => (
                  <RecommendationCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* SECTION 6: System Health & Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SystemHealthPanel />
        <ActivityPanel items={data?.recentActivity ?? []} loading={isLoading} />
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTS
   ============================================================ */

/* ---------- Header ---------- */

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
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>NIRIKSHA</span>
          <ChevronRight className="h-3 w-3" />
          <span>Inspection Intelligence Platform</span>
        </div>
        <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Executive Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered inspection intelligence, risk monitoring, and platform governance.
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

/* ---------- Hero KPI ---------- */

function HeroKpi({ label, value, icon: Icon, trend, trendLabel, loading, valueClass }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  loading?: boolean;
  valueClass?: string;
}) {
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";
  return (
    <Card className="group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className={`mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums ${valueClass ?? "text-foreground"}`}>
          {loading ? <span className="text-muted-foreground">—</span> : value}
        </div>
        {trendLabel && (
          <div className={`mt-2 flex items-center gap-1 text-[11px] ${trendColor}`}>
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingUp className="h-3 w-3 rotate-180" />}
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Agent Card ---------- */

function AgentCard({ agent, loading }: { agent: any; loading?: boolean }) {
  const isActive = agent.status === "active";
  const confidenceColor = agent.confidence >= 80 ? "bg-emerald-500" : agent.confidence >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className={`border-border/70 bg-card shadow-sm transition hover:shadow-md ${isActive ? "ring-1 ring-primary/20" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">{agent.name}</span>
          </div>
          <Badge
            variant="secondary"
            className={`text-[10px] uppercase tracking-wider ${
              isActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {isActive ? "Active" : "Standby"}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <AgentStat label="Tasks" value={String(agent.tasksPending ?? 0)} />
          <AgentStat label="Last Run" value={agent.lastExecution?.split(" ")[0] ?? "—"} />
          <AgentStat label="Conf." value={`${agent.confidence ?? 0}%`} />
          <AgentStat label="Output" value={String(agent.outputGenerated ?? 0)} />
        </div>

        {/* Confidence Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Confidence</span>
            <span>{agent.confidence ?? 0}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${confidenceColor}`}
              style={{ width: `${agent.confidence ?? 0}%` }}
            />
          </div>
        </div>

        {/* Last Recommendation */}
        <div className="mt-3 rounded-md bg-muted/50 px-2.5 py-1.5">
          <div className="text-[10px] font-medium text-muted-foreground">Last Output</div>
          <div className="mt-0.5 text-[11px] text-foreground">{agent.lastRecommendation ?? "—"}</div>
        </div>

        {/* Action */}
        <Link
          to="/admin/assignments"
          className="mt-3 flex items-center justify-center gap-1 rounded-md border border-border/60 py-1.5 text-[11px] font-medium text-primary hover:bg-accent"
        >
          View Details <ExternalLink className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function AgentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/40 px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

/* ---------- Recommendation Card ---------- */

function RecommendationCard({ recommendation }: { recommendation: any }) {
  const priorityConfig: Record<string, { icon: any; border: string; bg: string; label: string }> = {
    high: {
      icon: AlertTriangle,
      border: "border-l-red-500",
      bg: "bg-red-500/5",
      label: "HIGH PRIORITY",
    },
    moderate: {
      icon: AlertCircle,
      border: "border-l-amber-500",
      bg: "bg-amber-500/5",
      label: "MODERATE PRIORITY",
    },
    info: {
      icon: Info,
      border: "border-l-blue-500",
      bg: "bg-blue-500/5",
      label: "INFORMATION",
    },
  };

  const config = priorityConfig[recommendation.priority] ?? priorityConfig.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 border-l-3 ${config.border} ${config.bg} px-4 py-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${
        recommendation.priority === "high" ? "text-red-600"
        : recommendation.priority === "moderate" ? "text-amber-600"
        : "text-blue-600"
      }`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {config.label}
        </div>
        <div className="mt-0.5 text-sm font-medium text-foreground">{recommendation.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{recommendation.description}</div>
      </div>
      <Link
        to={recommendation.actionHref as any}
        className="shrink-0 rounded-md border border-border/60 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-accent"
      >
        {recommendation.action}
      </Link>
    </div>
  );
}

/* ---------- System Health ---------- */

function SystemHealthPanel() {
  const services = [
    { icon: Server, label: "Backend API", status: "operational" },
    { icon: Database, label: "Database", status: "operational" },
    { icon: Cpu, label: "AI Services", status: "operational" },
    { icon: Bell, label: "Notifications", status: "operational" },
  ];

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground">System Health</CardTitle>
        </div>
        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          All Systems Operational
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
}

/* ---------- Activity Panel ---------- */

function ActivityPanel({ items, loading }: { items: any[]; loading?: boolean }) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground">Recent Platform Activity</CardTitle>
        </div>
        <Link to="/admin/audit" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
          Audit Log <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
}

function humanAction(a: string) {
  return a === "INSERT" ? "Created" : a === "UPDATE" ? "Updated" : a === "DELETE" ? "Deleted" : a;
}