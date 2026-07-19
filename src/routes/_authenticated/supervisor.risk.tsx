import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ShieldAlert, ChevronRight, MapPin, AlertTriangle,
  TrendingUp, Building2, Filter, BarChart3, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  getRiskKpis, getRiskPriorityQueue, getDepartments,
  getLatestInspectionForEstablishment,
  getRiskTrend, getDepartmentRiskComparison, getHeatmapData,
  type RiskTrendPoint, type DepartmentRiskPoint, type HeatmapData,
} from "@/lib/supervisor.functions";
import { getRiskScore, buildAIPayload, type RiskScoreResponse } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/supervisor/risk")({
  head: () => ({ meta: [{ title: "Risk Monitoring — NIRIKSHA Supervisor" }] }),
  component: RiskMonitoringPage,
});

type RiskAccent = "critical" | "high" | "medium" | "low";

function RiskMonitoringPage() {
  const [deptFilter, setDept] = useState("all");

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["supervisor-risk-kpis"],
    queryFn: getRiskKpis,
    refetchOnWindowFocus: false,
  });

  const { data: priorityQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ["supervisor-risk-priority"],
    queryFn: () => getRiskPriorityQueue(10),
    refetchOnWindowFocus: false,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    refetchOnWindowFocus: false,
  });

  // Distribution percentages
  const distribution = useMemo(() => {
    const total = kpis?.total ?? 0;
    if (total === 0) return { critical: 0, high: 0, medium: 0, low: 0 };
    return {
      critical: Math.round(((kpis?.critical ?? 0) / total) * 100),
      high:     Math.round(((kpis?.high     ?? 0) / total) * 100),
      medium:   Math.round(((kpis?.medium   ?? 0) / total) * 100),
      low:      Math.round(((kpis?.low      ?? 0) / total) * 100),
    };
  }, [kpis]);

  return (
    <div className="space-y-6 pb-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>NIRIKSHA</span><ChevronRight className="h-3 w-3" />
          <span>Supervisor Console</span><ChevronRight className="h-3 w-3" />
          <span>Risk Monitoring</span>
        </div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">Risk Monitoring</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              High-risk establishment overview, geographic distribution, and priority inspection indicators.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={deptFilter} onValueChange={setDept}>
              <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Risk KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["critical","high","medium","low"] as RiskAccent[]).map((lvl) => (
          <RiskKpiCard
            key={lvl}
            label={`${lvl.charAt(0).toUpperCase() + lvl.slice(1)} Risk`}
            accent={lvl}
            count={kpis?.[lvl]}
            loading={kpisLoading}
          />
        ))}
      </div>

      {/* Main content — left/right columns both start at top, no vertical stretching */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
        <RiskHeatmapCard />
        <div className="flex flex-col gap-4">
          <RiskDistributionCard distribution={distribution} counts={kpis} loading={kpisLoading} />
          <PriorityQueueCard rows={priorityQueue} loading={queueLoading} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 xl:grid-cols-2">
        <RiskTrendCard />
        <RiskComparisonCard />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Risk KPI Cards
───────────────────────────────────────────────────────────── */

function RiskKpiCard({ label, accent, count, loading }: { label: string; accent: RiskAccent; count?: number; loading: boolean }) {
  const styles: Record<RiskAccent, { border: string; bg: string; dot: string; text: string }> = {
    critical: { border: "border-destructive/30", bg: "bg-destructive/5", dot: "bg-destructive",  text: "text-destructive" },
    high:     { border: "border-orange-500/30",  bg: "bg-orange-500/5",  dot: "bg-orange-500",   text: "text-orange-700 dark:text-orange-300" },
    medium:   { border: "border-amber-500/30",   bg: "bg-amber-500/5",   dot: "bg-amber-500",    text: "text-amber-700 dark:text-amber-300" },
    low:      { border: "border-emerald-500/30", bg: "bg-emerald-500/5", dot: "bg-emerald-500",  text: "text-emerald-700 dark:text-emerald-300" },
  };
  const s = styles[accent];
  return (
    <Card className={`border ${s.border} ${s.bg} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${s.text}`}>{label}</span>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-7 w-10" />
        ) : (
          <div className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{count ?? 0}</div>
        )}
        <div className="mt-1 text-[11px] text-muted-foreground">establishments</div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Risk Heatmap — geographic risk scatter plot
───────────────────────────────────────────────────────────── */

const RISK_LEVEL_COLOR: Record<string, string> = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#f59e0b",
  Low:      "#22c55e",
};

const RISK_LEVEL_BG: Record<string, string> = {
  Critical: "#ef444418",
  High:     "#f9731618",
  Medium:   "#f59e0b18",
  Low:      "#22c55e18",
};

type HeatmapPoint = NonNullable<HeatmapData["points"]>[number];

/** Custom scatter dot — renders a circle with a thin ring for depth. */
function RiskDot(props: {
  cx?: number; cy?: number;
  payload?: HeatmapPoint;
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  const color = RISK_LEVEL_COLOR[payload.riskLevel] ?? "#94a3b8";
  return (
    <g>
      {/* Outer glow ring */}
      <circle cx={cx} cy={cy} r={10} fill={color} fillOpacity={0.15} />
      {/* Solid dot */}
      <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.9} stroke="white" strokeWidth={1.2} strokeOpacity={0.6} />
    </g>
  );
}

function RiskHeatmapCard() {
  const { data: heatmap, isLoading } = useQuery<HeatmapData>({
    queryKey: ["supervisor-risk-heatmap"],
    queryFn:  getHeatmapData,
    refetchOnWindowFocus: false,
  });

  const noData    = !isLoading && (!heatmap || heatmap.totalEstablishments === 0);
  const noGeoData = !isLoading && heatmap && heatmap.totalEstablishments > 0 && !heatmap.hasGeoData;
  const hasPoints = !isLoading && heatmap && heatmap.hasGeoData && heatmap.points.length > 0;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      {/* ── Header ── */}
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b border-border/60 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground">Risk Heatmap</CardTitle>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground max-w-xs">
              Geographic concentration of inspection risks across supervised establishments
            </p>
          </div>
        </div>
        {!isLoading && heatmap && (
          <Badge variant="secondary" className="shrink-0 mt-0.5 text-[10px] font-medium">
            {heatmap.totalEstablishments} establishment{heatmap.totalEstablishments !== 1 ? "s" : ""}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Loading skeleton ── */}
        {isLoading && (
          <div className="space-y-3 p-4" style={{ height: 360 }}>
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-[290px] w-full rounded-lg" />
          </div>
        )}

        {/* ── No establishments ── */}
        {noData && (
          <div className="flex flex-col items-center justify-center gap-3 px-8 py-10 text-center" style={{ height: 360 }}>
            <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-border/60 bg-muted/30">
              <MapPin className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No establishments found</p>
              <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                No establishments are associated with your inspections yet.
              </p>
            </div>
          </div>
        )}

        {/* ── No coordinates ── */}
        {noGeoData && (
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-10 text-center" style={{ height: 360 }}>
            <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-border/60 bg-muted/30">
              <MapPin className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Location intelligence unavailable</p>
              <p className="mt-1 max-w-[300px] text-xs text-muted-foreground">
                Establishment coordinates not recorded — latitude/longitude data is required to render
                a geographic risk plot.{" "}
                <span className="font-medium text-foreground">
                  {heatmap!.totalEstablishments} establishment{heatmap!.totalEstablishments !== 1 ? "s" : ""}
                </span>{" "}
                found without coordinates.
              </p>
            </div>
            {/* Legend still shown so the UI is not empty */}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {(["Critical","High","Medium","Low"] as const).map((lvl) => (
                <span
                  key={lvl}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium"
                  style={{
                    borderColor: RISK_LEVEL_COLOR[lvl] + "50",
                    background:  RISK_LEVEL_BG[lvl],
                    color:       RISK_LEVEL_COLOR[lvl],
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_LEVEL_COLOR[lvl] }} />
                  {lvl}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Geo data available — full chart ── */}
        {hasPoints && (
          <div>
            {/* Legend + total */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/10 px-4 py-2">
              {(["Critical","High","Medium","Low"] as const).map((lvl) => (
                <span
                  key={lvl}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    borderColor: RISK_LEVEL_COLOR[lvl] + "50",
                    background:  RISK_LEVEL_BG[lvl],
                    color:       RISK_LEVEL_COLOR[lvl],
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_LEVEL_COLOR[lvl] }} />
                  {lvl}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {heatmap!.points.length} of {heatmap!.totalEstablishments} plotted
              </span>
            </div>

            {/* Scatter plot */}
            <div className="px-2 pt-2 pb-1" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 28, bottom: 28, left: 10 }}>
                  {/* Subtle dot-grid background */}
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="var(--color-border)"
                    strokeOpacity={0.35}
                    horizontal
                    vertical
                  />
                  <XAxis
                    type="number"
                    dataKey="longitude"
                    name="Longitude"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.4 }}
                    label={{
                      value: "Longitude",
                      position: "insideBottom",
                      offset: -16,
                      style: {
                        fontSize: 9,
                        fill: "hsl(var(--muted-foreground))",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      },
                    }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                    tickCount={5}
                  />
                  <YAxis
                    type="number"
                    dataKey="latitude"
                    name="Latitude"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.4 }}
                    width={44}
                    label={{
                      value: "Latitude",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: {
                        fontSize: 9,
                        fill: "hsl(var(--muted-foreground))",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      },
                    }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                    tickCount={5}
                  />
                  <ZAxis type="number" range={[1, 1]} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as HeatmapPoint;
                      const color = RISK_LEVEL_COLOR[d.riskLevel] ?? "#94a3b8";
                      return (
                        <div
                          className="rounded-lg border bg-card shadow-lg text-[11px]"
                          style={{ borderColor: color + "40", minWidth: 200, maxWidth: 260 }}
                        >
                          {/* Coloured accent bar at top */}
                          <div className="h-1 w-full rounded-t-lg" style={{ background: color }} />
                          <div className="space-y-1.5 px-3 py-2.5">
                            <p className="font-semibold text-foreground leading-snug line-clamp-2">
                              {d.establishmentName}
                            </p>
                            {d.address && (
                              <p className="text-muted-foreground leading-snug line-clamp-2">{d.address}</p>
                            )}
                            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                                style={{ background: color + "20", color }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                                {d.riskLevel}
                              </span>
                              <span className="ml-auto text-xs tabular-nums font-bold text-foreground">
                                {d.riskScore}
                                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">/100</span>
                              </span>
                            </div>
                            <p className="tabular-nums text-muted-foreground text-[10px] font-mono">
                              {d.latitude.toFixed(5)}°N · {d.longitude.toFixed(5)}°E
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* One series per risk level so each dot gets the right colour */}
                  {(["Critical","High","Medium","Low"] as const).map((lvl) => {
                    const pts = heatmap!.points.filter((p) => p.riskLevel === lvl);
                    if (pts.length === 0) return null;
                    return (
                      <Scatter
                        key={lvl}
                        name={lvl}
                        data={pts}
                        shape={<RiskDot />}
                      />
                    );
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Risk Distribution — real percentages
───────────────────────────────────────────────────────────── */

function RiskDistributionCard({
  distribution,
  counts,
  loading,
}: {
  distribution: Record<RiskAccent, number>;
  counts?: { critical: number; high: number; medium: number; low: number; total: number };
  loading: boolean;
}) {
  const levels: { label: string; accent: RiskAccent; barColor: string }[] = [
    { label: "Critical", accent: "critical", barColor: "bg-destructive" },
    { label: "High",     accent: "high",     barColor: "bg-orange-500" },
    { label: "Medium",   accent: "medium",   barColor: "bg-amber-500" },
    { label: "Low",      accent: "low",      barColor: "bg-emerald-500" },
  ];
  const dotColors: Record<RiskAccent, string> = {
    critical: "bg-destructive", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-emerald-500",
  };

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 px-4 py-3">
        <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
        <CardTitle className="text-sm font-semibold text-foreground">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3 space-y-2.5">
        {levels.map((l) => (
          <div key={l.label}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dotColors[l.accent]}`} />
                <span className="text-xs text-foreground">{l.label}</span>
              </div>
              {loading
                ? <Skeleton className="h-3.5 w-7" />
                : <span className="tabular-nums text-[11px] text-muted-foreground">{distribution[l.accent]}%</span>
              }
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/60">
              {!loading && (
                <div
                  className={`h-1.5 rounded-full ${l.barColor} transition-all duration-500`}
                  style={{ width: `${distribution[l.accent]}%` }}
                />
              )}
            </div>
          </div>
        ))}
        {!loading && (counts?.total ?? 0) === 0 && (
          <p className="pt-1 text-[11px] text-muted-foreground">
            No risk profiles found for your assigned establishments.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Priority Queue — real data + per-row AI analysis
───────────────────────────────────────────────────────────── */

/**
 * Single priority queue row.
 *
 * On "Analyse" click:
 *   1. Fetches the latest full InspectionDetail for this establishment
 *      via getLatestInspectionForEstablishment — exactly the same data
 *      source and shape used by supervisor.inspection.$id.tsx.
 *   2. Passes it to buildAIPayload (same helper used in the detail page)
 *      to get a complete InspectionAnalysisRequest with real checklist,
 *      findings, evidence, establishment info, department, etc.
 *   3. Sends that payload to getRiskScore.
 *
 * Unmount safety: a mounted ref prevents calling setAiResult after the
 * component has been removed from the tree.
 */
function PriorityQueueRow({
  row,
}: {
  row: { id: string; establishmentName: string; riskScore: number; riskLevel: string; establishmentId: string };
}) {
  const levelColor: Record<string, string> = {
    Critical: "bg-destructive text-destructive-foreground",
    High:     "bg-destructive/10 text-destructive",
    Medium:   "bg-amber-500/10 text-amber-700",
    Low:      "bg-emerald-500/10 text-emerald-700",
  };

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [aiResult, setAiResult] = useState<RiskScoreResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      // Step 1: fetch complete inspection data for this establishment
      const detail = await getLatestInspectionForEstablishment(row.establishmentId);
      if (!detail) {
        throw new Error(
          `No inspection found for "${row.establishmentName}". ` +
          "The AI cannot analyse risk without inspection data."
        );
      }
      // Step 2: build a real payload using the same helper as the detail page
      const payload = await buildAIPayload(detail);
      // Step 3: call the Risk Prioritization Agent
      return getRiskScore(payload);
    },
    onSuccess: (data) => {
      if (mountedRef.current) {
        setFetchError(null);
        setAiResult(data);
        setAiExpanded(false);
      }
    },
    onError: (err) => {
      if (mountedRef.current) {
        setFetchError((err as Error).message);
      }
    },
  });

  // Use AI result score/level if available, otherwise fall back to DB values
  const displayScore = aiResult?.risk_score ?? row.riskScore;
  const displayLevel = aiResult?.risk_level ?? row.riskLevel;

  return (
    <div className="border-b border-border/60 last:border-0">
      {/* Main row — always visible */}
      <div className="grid grid-cols-[minmax(0,1fr)_76px_52px_auto] gap-2 items-center px-4 py-2 text-sm hover:bg-accent/40">
        <span className="truncate text-foreground font-medium">{row.establishmentName}</span>
        <Badge
          variant="secondary"
          className={`w-fit text-[10px] uppercase ${levelColor[displayLevel] ?? "bg-muted text-muted-foreground"}`}
        >
          {displayLevel}
        </Badge>
        <span className="text-right tabular-nums text-muted-foreground font-semibold">{displayScore}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          title="Analyse Risk with AI agent"
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          {mutation.isPending ? "…" : "Analyse"}
        </Button>
      </div>

      {/* Inline AI result panel */}
      {(mutation.isPending || aiResult || mutation.isError) && (
        <div className="mx-3 mb-2.5 rounded-md border border-border/70 bg-muted/20 text-xs overflow-hidden">
          {mutation.isPending ? (
            <div className="space-y-1.5 p-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : mutation.isError ? (
            <p className="p-3 text-destructive">{fetchError ?? (mutation.error as Error).message}</p>
          ) : aiResult ? (
            <>
              {/* Coloured top bar matching risk level */}
              <div
                className="h-0.5 w-full"
                style={{ background: RISK_LEVEL_COLOR[aiResult.risk_level] ?? "#94a3b8" }}
              />
              <div className="divide-y divide-border/50">
                {/* Header row: establishment + scores */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 bg-muted/30">
                  <span className="font-semibold text-foreground">{row.establishmentName}</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase ${levelColor[aiResult.risk_level] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {aiResult.risk_level}
                    </Badge>
                    <span className="tabular-nums font-bold text-foreground">{aiResult.risk_score}</span>
                    <span className="text-muted-foreground text-[10px]">/100</span>
                    {row.riskScore !== aiResult.risk_score && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        (DB: {row.riskScore})
                      </span>
                    )}
                  </div>
                </div>
                {/* Explanation — clamped to 3 lines, expandable */}
                <div className="px-3 py-2">
                  <p className={`text-muted-foreground leading-relaxed whitespace-pre-wrap ${aiExpanded ? "" : "line-clamp-3"}`}>
                    {aiResult.explanation}
                  </p>
                  <button
                    onClick={() => setAiExpanded((v) => !v)}
                    className="mt-1 text-[10px] font-medium text-primary hover:underline focus:outline-none"
                  >
                    {aiExpanded ? "Show less ↑" : "View full analysis ↓"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PriorityQueueCard({
  rows,
  loading,
}: {
  rows: { id: string; establishmentName: string; riskScore: number; riskLevel: string; establishmentId: string }[];
  loading: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 px-4 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <CardTitle className="text-sm font-semibold text-foreground">Priority Inspections</CardTitle>
        {!loading && rows.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px] bg-destructive/10 text-destructive">
            {rows.length} high-priority
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Sticky column header */}
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_76px_52px_auto] gap-2 border-b border-border/60 bg-muted/50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Establishment</span><span>Risk</span><span className="text-right">Score</span><span />
        </div>
        {/* Scrollable rows area */}
        <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
          {loading && (
            <div className="divide-y divide-border/60">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_76px_52px_auto] gap-2 px-4 py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-8" />
                  <Skeleton className="h-7 w-16 rounded" />
                </div>
              ))}
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <Building2 className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No high-priority establishments found.</p>
            </div>
          )}
          {!loading && rows.length > 0 && rows.map((r) => (
            <PriorityQueueRow key={r.id} row={r} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Risk Trend Over Time — real data via getRiskTrend()
───────────────────────────────────────────────────────────── */

function RiskTrendCard() {
  const { data: trend = [], isLoading } = useQuery<RiskTrendPoint[]>({
    queryKey: ["supervisor-risk-trend"],
    queryFn:  getRiskTrend,
    refetchOnWindowFocus: false,
  });

  const noData = !isLoading && trend.length === 0;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Risk Trend Over Time</CardTitle>
          <p className="text-[11px] text-muted-foreground">Average risk score per month (completed inspections).</p>
        </div>
        {!isLoading && trend.length > 0 && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {trend.length} month{trend.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex flex-col gap-2 p-4" style={{ height: 200 }}>
            <Skeleton className="h-full w-full" />
          </div>
        )}
        {noData && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center" style={{ height: 200 }}>
            <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
            <p className="max-w-[260px] text-xs text-muted-foreground">
              No completed inspections with risk scores found. Data will appear once inspections are completed.
            </p>
          </div>
        )}
        {!isLoading && trend.length > 0 && (
          <div className="px-2 py-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                  }}
                  formatter={(value: number) => [value, "Avg Risk Score"]}
                />
                {/* Reference lines for risk level thresholds */}
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey="averageRiskScore"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Department Risk Comparison — real data via getDepartmentRiskComparison()
───────────────────────────────────────────────────────────── */

function RiskComparisonCard() {
  const { data: comparison = [], isLoading } = useQuery<DepartmentRiskPoint[]>({
    queryKey: ["supervisor-risk-comparison"],
    queryFn:  getDepartmentRiskComparison,
    refetchOnWindowFocus: false,
  });

  const noData = !isLoading && comparison.length === 0;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Department Risk Comparison</CardTitle>
          <p className="text-[11px] text-muted-foreground">Average risk score by regulatory department.</p>
        </div>
        {!isLoading && comparison.length > 0 && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {comparison.length} dept{comparison.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex flex-col gap-2 p-4" style={{ height: 200 }}>
            <Skeleton className="h-full w-full" />
          </div>
        )}
        {noData && (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center" style={{ height: 200 }}>
            <ShieldAlert className="h-6 w-6 text-muted-foreground/50" />
            <p className="max-w-[260px] text-xs text-muted-foreground">
              No completed inspections with risk scores found. Department comparison will appear once data is available.
            </p>
          </div>
        )}
        {!isLoading && comparison.length > 0 && (
          <div className="px-2 py-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparison}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                  }}
                  formatter={(value: number, _name, props) => [
                    `${value} (${(props.payload as DepartmentRiskPoint).count} inspection${(props.payload as DepartmentRiskPoint).count !== 1 ? "s" : ""})`,
                    "Avg Risk Score",
                  ]}
                />
                <Bar
                  dataKey="averageRiskScore"
                  fill="var(--color-primary)"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
