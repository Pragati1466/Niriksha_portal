import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Download, ChevronRight, FileSpreadsheet,
  Filter, Calendar, Building2, Shield, Clock, CheckCircle2, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getCompletedInspections, getDepartments } from "@/lib/supervisor.functions";

export const Route = createFileRoute("/_authenticated/supervisor/reports")({
  head: () => ({ meta: [{ title: "Reports — NIRIKSHA Supervisor" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [search, setSearch]       = useState("");
  const [deptFilter, setDept]     = useState("all");
  const [dateRange, setDateRange] = useState("30d");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    refetchOnWindowFocus: false,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["supervisor-completed-inspections", deptFilter, dateRange],
    queryFn: () => getCompletedInspections({ departmentId: deptFilter, dateRange }),
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.establishmentName.toLowerCase().includes(s) ||
        r.department.toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s),
    );
  }, [rows, search]);

  const hasFilters = search || deptFilter !== "all" || dateRange !== "30d";

  return (
    <div className="space-y-6 pb-10">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>NIRIKSHA</span><ChevronRight className="h-3 w-3" />
          <span>Supervisor Console</span><ChevronRight className="h-3 w-3" />
          <span>Reports</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">Reports & Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">Completed inspection records and export tools.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* Left: filter + table */}
        <div className="space-y-4">
          {/* Filters */}
          <Card className="border-border/70 bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reports…"
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <Select value={deptFilter} onValueChange={setDept}>
                  <SelectTrigger className="h-9 w-[170px] text-sm"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Date range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button
                    variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground"
                    onClick={() => { setSearch(""); setDept("all"); setDateRange("30d"); }}
                  >
                    <Filter className="h-3.5 w-3.5" />Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reports list */}
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Completed Inspections</CardTitle>
              {!isLoading && (
                <span className="ml-auto text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_90px_70px] gap-3 border-b border-border/60 bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Establishment</span>
                <span>Department</span>
                <span>Inspector</span>
                <span>Date</span>
                <span className="text-right">Risk</span>
              </div>

              {isLoading && (
                <div className="divide-y divide-border/60">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_90px_70px] gap-3 px-4 py-3">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="ml-auto h-4 w-8" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No completed inspections</p>
                    <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
                      Completed inspections assigned to you will appear here.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Waiting for completed inspections
                  </div>
                </div>
              )}

              {!isLoading && filtered.length > 0 && (
                <div className="divide-y divide-border/60">
                  {filtered.map((r) => (
                    <div key={r.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_90px_70px] gap-3 px-4 py-3 text-sm hover:bg-accent/40 transition-colors">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{r.establishmentName}</div>
                        <div className="truncate text-[11px] font-mono text-muted-foreground">{r.id.slice(0,8)}</div>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{r.department}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.inspectorName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.actualDate
                          ? new Date(r.actualDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : r.scheduledDate !== "—"
                          ? new Date(r.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </div>
                      <div className="text-right text-xs font-semibold tabular-nums text-muted-foreground">
                        {r.riskScore !== null ? r.riskScore : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: export + summary */}
        <div className="space-y-4">
          {/* Export */}
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
              <Download className="h-4 w-4 shrink-0 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Export Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">Export all filtered records or select individual rows to download.</p>
              <Button variant="outline" className="w-full justify-start gap-2.5" disabled={filtered.length === 0}>
                <FileText className="h-4 w-4 text-destructive" />
                <div className="text-left">
                  <div className="text-sm font-medium">Export as PDF</div>
                  <div className="text-[11px] text-muted-foreground">Formatted inspection reports</div>
                </div>
                <Download className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2.5" disabled={filtered.length === 0}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <div className="text-left">
                  <div className="text-sm font-medium">Export as CSV</div>
                  <div className="text-[11px] text-muted-foreground">Raw data for analysis</div>
                </div>
                <Download className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>
              {filtered.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Export activates when records are available.</p>
              )}
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Report Preview</CardTitle>
              <Badge variant="secondary" className="ml-auto text-[10px]">No report selected</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col items-center justify-center gap-3 bg-muted/10 px-5 py-10 text-center" style={{ minHeight: 200 }}>
                <div className="w-full max-w-[200px] space-y-2 rounded-md border border-dashed border-border/70 bg-card p-4 text-left">
                  <div className="h-2.5 w-24 rounded bg-muted/70" />
                  <div className="h-2 w-full rounded bg-muted/50" />
                  <div className="h-2 w-4/5 rounded bg-muted/50" />
                  <Separator className="my-2" />
                  <div className="h-2 w-16 rounded bg-muted/70" />
                  <div className="h-2 w-full rounded bg-muted/40" />
                </div>
                <p className="text-xs text-muted-foreground">Select a record to preview the report.</p>
              </div>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
              <Shield className="h-4 w-4 shrink-0 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Report Summary</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {[
                { icon: CheckCircle2, label: "Completed Inspections", value: isLoading ? null : rows.length,    color: "text-emerald-600" },
                { icon: Filter,       label: "Filtered Records",       value: isLoading ? null : filtered.length, color: "text-primary" },
                { icon: Building2,    label: "Unique Establishments",  value: isLoading ? null : new Set(rows.map((r) => r.establishmentName)).size, color: "text-primary" },
                { icon: Calendar,     label: "Date Range",             value: null, label2: dateRange === "all" ? "All time" : `Last ${dateRange}`, color: "text-muted-foreground" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                    <span className="truncate text-sm text-foreground">{s.label}</span>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-5 w-8" />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {s.value !== null ? s.value : (s as any).label2 ?? "—"}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
