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
  getRiskKpis, getRiskPriorityQueue, getDepartments,
  getLatestInspectionForEstablishment,
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

      {/* Main content */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <RiskHeatmapCard />
        <div className="space-y-4">
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
   Risk Heatmap (placeholder — geo data not yet available)
───────────────────────────────────────────────────────────── */

function RiskHeatmapCard() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground">Risk Heatmap</CardTitle>
            <p className="text-[11px] text-muted-foreground">Geographic distribution of inspection risk</p>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">Awaiting geo data</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative flex flex-col items-center justify-center gap-3 bg-muted/20 px-8 text-center" style={{ height: 420 }}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-border/60 bg-card">
              <MapPin className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Geographic Heatmap</p>
              <p className="mt-1 max-w-[320px] text-xs text-muted-foreground">
                Risk concentration by location will render here. Requires latitude/longitude from
                establishments and Risk Prioritization Agent output.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-card px-4 py-2">
              {(["Critical","High","Medium","Low"] as string[]).map((lvl, i) => {
                const dots = ["bg-destructive","bg-orange-500","bg-amber-500","bg-emerald-500"];
                return (
                  <div key={lvl} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${dots[i]}`} />
                    <span className="text-[11px] text-muted-foreground">{lvl}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
        <CardTitle className="text-sm font-semibold text-foreground">Risk Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {levels.map((l) => (
          <div key={l.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dotColors[l.accent]}`} />
                <span className="text-foreground">{l.label}</span>
              </div>
              {loading ? (
                <div className="flex gap-2"><Skeleton className="h-4 w-6" /><Skeleton className="h-4 w-8" /></div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="tabular-nums">{counts?.[l.accent] ?? 0}</span>
                  <span className="tabular-nums text-[11px]">{distribution[l.accent]}%</span>
                </div>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-muted/60">
              {!loading && (
                <div
                  className={`h-2 rounded-full ${l.barColor} transition-all duration-500`}
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
      <div className="grid grid-cols-[minmax(0,1fr)_80px_56px_auto] gap-2 items-center px-4 py-2.5 text-sm hover:bg-accent/40">
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

      {/* Inline AI result — shown only when we have data or an error */}
      {(mutation.isPending || aiResult || mutation.isError) && (
        <div className="mx-4 mb-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-xs space-y-2">
          {mutation.isPending ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : mutation.isError ? (
            <p className="text-destructive">{fetchError ?? (mutation.error as Error).message}</p>
          ) : aiResult ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">AI Score:</span>
                <span className="font-semibold tabular-nums text-foreground">{aiResult.risk_score}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] uppercase ${levelColor[aiResult.risk_level] ?? "bg-muted text-muted-foreground"}`}
                >
                  {aiResult.risk_level}
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">{aiResult.explanation}</p>
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
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <CardTitle className="text-sm font-semibold text-foreground">Priority Inspections</CardTitle>
        {!loading && rows.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px] bg-destructive/10 text-destructive">
            {rows.length} high-priority
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_56px_auto] gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Establishment</span><span>Risk</span><span className="text-right">Score</span><span />
        </div>
        {loading && (
          <div className="divide-y divide-border/60">
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_80px_56px_auto] gap-2 px-4 py-2.5">
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
        {!loading && rows.length > 0 && (
          <div>
            {rows.map((r) => (
              <PriorityQueueRow key={r.id} row={r} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Trend + Comparison — awaiting chart data
───────────────────────────────────────────────────────────── */

function RiskTrendCard() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Risk Trend Over Time</CardTitle>
          <p className="text-[11px] text-muted-foreground">Change in average risk score per period.</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">Awaiting data</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center" style={{ height: 180 }}>
          <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Risk trend chart will render here once time-series data is available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskComparisonCard() {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Department Risk Comparison</CardTitle>
          <p className="text-[11px] text-muted-foreground">Average risk score by regulatory department.</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">Awaiting data</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center" style={{ height: 180 }}>
          <ShieldAlert className="h-6 w-6 text-muted-foreground/50" />
          <p className="max-w-[260px] text-xs text-muted-foreground">
            Department-level risk comparison will render here once data is connected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
