import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Clock,
  ShieldAlert,
  User,
  Calendar,
  Brain,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { getReviewQueue, getDepartments, type QueueRow } from "@/lib/supervisor.functions";

export const Route = createFileRoute("/_authenticated/supervisor/reviews")({
  head: () => ({ meta: [{ title: "Pending Reviews — NIRIKSHA Supervisor" }] }),
  component: PendingReviewsPage,
});

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */

function PendingReviewsPage() {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [deptFilter, setDept]     = useState("all");
  const [riskFilter, setRisk]     = useState("all");
  const [sortBy, setSortBy]       = useState("submitted_desc");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    refetchOnWindowFocus: false,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["supervisor-review-queue", deptFilter, sortBy],
    queryFn: () =>
      getReviewQueue({ departmentId: deptFilter, sortBy }),
    refetchOnWindowFocus: false,
  });

  // Client-side search + risk filter on top of fetched data
  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.establishmentName.toLowerCase().includes(s) ||
          x.inspectorName.toLowerCase().includes(s) ||
          x.id.toLowerCase().includes(s),
      );
    }
    if (riskFilter !== "all") {
      r = r.filter((x) => (x.riskLevel ?? "").toLowerCase() === riskFilter.toLowerCase());
    }
    if (statusFilter !== "all") {
      r = r.filter((x) => x.status === statusFilter);
    }
    if (sortBy === "risk_desc") r = [...r].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    if (sortBy === "risk_asc")  r = [...r].sort((a, b) => (a.riskScore ?? 0) - (b.riskScore ?? 0));
    if (sortBy === "dept_asc")  r = [...r].sort((a, b) => a.department.localeCompare(b.department));
    return r;
  }, [rows, search, riskFilter, statusFilter, sortBy]);

  const pendingCount  = rows.filter((r) => r.status === "pending").length;
  const highRiskCount = rows.filter((r) => (r.riskLevel ?? "").toLowerCase() === "high" || (r.riskLevel ?? "").toLowerCase() === "critical").length;
  const overdueCount  = rows.filter((r) => {
    if (!r.scheduledDate || r.scheduledDate === "—") return false;
    return new Date(r.scheduledDate) < new Date();
  }).length;

  const hasFilters = search || statusFilter !== "all" || deptFilter !== "all" || riskFilter !== "all";

  return (
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <header>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>NIRIKSHA</span>
          <ChevronRight className="h-3 w-3" />
          <span>Supervisor Console</span>
          <ChevronRight className="h-3 w-3" />
          <span>Pending Reviews</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              Pending Review Queue
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inspections assigned to you that are pending or in-progress.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <QueueBadge label="Awaiting Review" count={pendingCount}  loading={isLoading} accent="warn" />
            <QueueBadge label="High Risk"        count={highRiskCount} loading={isLoading} accent="danger" />
            <QueueBadge label="Overdue"          count={overdueCount}  loading={isLoading} accent="danger" />
          </div>
        </div>
      </header>

      {/* Filter & Search bar */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by establishment, inspector, ID…"
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[150px] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>

            {/* Department filter */}
            <Select value={deptFilter} onValueChange={setDept}>
              <SelectTrigger className="h-9 w-[170px] text-sm">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Risk filter */}
            <Select value={riskFilter} onValueChange={setRisk}>
              <SelectTrigger className="h-9 w-[140px] text-sm">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk levels</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sort by
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { value: "submitted_desc", label: "Newest first" },
                  { value: "submitted_asc",  label: "Oldest first" },
                  { value: "risk_desc",      label: "Risk: High → Low" },
                  { value: "risk_asc",       label: "Risk: Low → High" },
                  { value: "dept_asc",       label: "Department A–Z" },
                ].map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => setSortBy(o.value)}
                    className={sortBy === o.value ? "bg-accent" : ""}
                  >
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => { setStatus("all"); setDept("all"); setRisk("all"); setSearch(""); }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue table */}
      <ReviewQueueTable rows={filtered} loading={isLoading} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Queue Table
───────────────────────────────────────────────────────────── */

function ReviewQueueTable({ rows, loading }: { rows: QueueRow[]; loading: boolean }) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_100px_110px_110px_80px] items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Establishment</span>
        <span>Department</span>
        <span>Inspector</span>
        <span>Date</span>
        <span>Status</span>
        <span>Risk Level</span>
        <span className="text-right">Action</span>
      </div>

      {loading && (
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_100px_110px_110px_80px] gap-3 px-4 py-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="p-12">
          <EmptyQueueState />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <InspectionRow key={row.id} item={row} />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────
   Inspection Row
───────────────────────────────────────────────────────────── */

function InspectionRow({ item }: { item: QueueRow }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_100px_110px_110px_80px] items-center gap-3 px-4 py-3 text-sm hover:bg-accent/40 transition-colors">
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{item.establishmentName}</div>
        <div className="truncate text-[11px] text-muted-foreground font-mono">{item.id.slice(0, 8)}</div>
      </div>

      <div className="truncate text-muted-foreground text-xs">{item.department}</div>

      <div className="flex items-center gap-1.5 min-w-0">
        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs">{item.inspectorName}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {item.scheduledDate !== "—"
          ? new Date(item.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "—"}
      </div>

      <StatusBadge status={item.status} />

      {item.riskLevel ? (
        <RiskBadge level={item.riskLevel} />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}

      <div className="flex justify-end">
        <Link to="/supervisor/inspection/$id" params={{ id: item.id }}>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" />
            Review
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Badge helpers
───────────────────────────────────────────────────────────── */

function QueueBadge({
  label,
  count,
  loading,
  accent,
}: {
  label: string;
  count: number;
  loading: boolean;
  accent: "warn" | "danger";
}) {
  const colors = {
    warn:   "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${colors[accent]}`}>
      {loading ? (
        <Skeleton className="h-4 w-5" />
      ) : (
        <span className="font-semibold tabular-nums">{count}</span>
      )}
      {label}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:     { label: "Pending",     cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    in_progress: { label: "In Progress", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    completed:   { label: "Completed",   cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    cancelled:   { label: "Cancelled",   cls: "bg-muted text-muted-foreground" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={`${cls} text-[10px] uppercase tracking-wide`}>{label}</Badge>;
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, { cls: string }> = {
    Critical: { cls: "bg-destructive text-destructive-foreground" },
    High:     { cls: "bg-destructive/10 text-destructive" },
    Medium:   { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    Low:      { cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  };
  const { cls } = map[level] ?? { cls: "bg-muted text-muted-foreground" };
  return (
    <div className="flex items-center gap-1.5">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Badge variant="secondary" className={`${cls} text-[10px] uppercase tracking-wide`}>{level}</Badge>
    </div>
  );
}

function EmptyQueueState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">No inspections in queue</div>
        <div className="mt-1 max-w-[300px] text-xs text-muted-foreground">
          Inspections assigned to you with pending or in-progress status will appear here.
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Waiting for assigned inspections
      </div>
    </div>
  );
}

export type { QueueRow as InspectionQueueItem };
