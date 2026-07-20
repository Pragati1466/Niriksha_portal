import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight, Building2, User, Calendar, ClipboardList,
  Shield, CheckCircle2, XCircle, RotateCcw, Plus, Brain,
  AlertTriangle, FileText, Camera, Eye, ArrowLeft,
  MessageSquare, ShieldAlert, Info, ImageIcon, Paperclip,
  Sparkles, ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getInspectionDetail,
  getRiskProfileForEstablishment,
  submitSupervisorReview,
  type InspectionDetail,
  type RiskProfileRow,
} from "@/lib/supervisor.functions";
import {
  getRiskScore,
  verifyEvidence,
  generateReport,
  recommendAction,
  buildAIPayload,
  type RiskScoreResponse,
  type EvidenceVerificationResponse,
  type GeneratedReportResponse,
  type RecommendActionResponse,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/supervisor/inspection/$id")({
  head: () => ({ meta: [{ title: "Inspection Review — NIRIKSHA Supervisor" }] }),
  component: InspectionReviewWorkspace,
});

/* ─────────────────────────────────────────────────────────────
   Page shell
───────────────────────────────────────────────────────────── */

function InspectionReviewWorkspace() {
  const { id } = Route.useParams();

  const { data: inspection, isLoading, error } = useQuery({
    queryKey: ["inspection-detail", id],
    queryFn: () => getInspectionDetail(id),
    refetchOnWindowFocus: false,
  });

  const { data: riskProfile } = useQuery({
    queryKey: ["risk-profile", inspection?.establishmentName],
    queryFn: () => getRiskProfileForEstablishment(
      (inspection as any)?._establishmentId ?? "",
    ),
    enabled: !!inspection,
    refetchOnWindowFocus: false,
  });

  // Lifted AI risk result — shared between RiskAnalysisCard (sets it) and
  // ApprovalWorkflowSection (reads it to persist into ai_recommendations).
  const [aiRiskResult, setAiRiskResult] = useState<RiskScoreResponse | null>(null);

  const statusColors: Record<string, string> = {
    pending:     "border-amber-500/40 bg-amber-500/10",
    in_progress: "border-sky-500/40 bg-sky-500/10",
    completed:   "border-emerald-500/40 bg-emerald-500/10",
    cancelled:   "border-border/60 bg-muted/40",
  };
  const statusTextColors: Record<string, string> = {
    pending:     "text-amber-700 dark:text-amber-300",
    in_progress: "text-sky-700 dark:text-sky-300",
    completed:   "text-emerald-700 dark:text-emerald-300",
    cancelled:   "text-muted-foreground",
  };
  const statusDotColors: Record<string, string> = {
    pending:     "bg-amber-500",
    in_progress: "bg-sky-500",
    completed:   "bg-emerald-500",
    cancelled:   "bg-muted-foreground",
  };

  const status = inspection?.status ?? "pending";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-foreground">Failed to load inspection</p>
        <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
        <Link to="/supervisor/reviews">
          <Button variant="outline" size="sm">Back to queue</Button>
        </Link>
      </div>
    );
  }

  if (!isLoading && !inspection) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Inspection not found</p>
        <p className="text-xs text-muted-foreground">
          This inspection either doesn't exist or is not assigned to you.
        </p>
        <Link to="/supervisor/reviews">
          <Button variant="outline" size="sm">Back to queue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>NIRIKSHA</span>
        <ChevronRight className="h-3 w-3" />
        <Link to="/supervisor/reviews" className="hover:text-foreground transition-colors">
          Pending Reviews
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-mono text-foreground">{id.slice(0, 8)}</span>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/supervisor/reviews">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isLoading ? <Skeleton className="h-8 w-56" /> : (inspection?.establishmentName ?? "Inspection Review")}
            </h1>
          </div>
          <p className="mt-1 ml-11 text-sm text-muted-foreground">
            Review AI-processed inspection and take regulatory action.
          </p>
        </div>
        {/* Status pill */}
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${statusColors[status]}`}>
          <span className={`h-2 w-2 rounded-full ${statusDotColors[status]}`} />
          <span className={`text-xs font-medium capitalize ${statusTextColors[status]}`}>
            {status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <InspectionInfoSection inspection={inspection} loading={isLoading} />
          <InspectionTabsSection inspection={inspection} loading={isLoading} />
        </div>
        <div className="space-y-5">
          <AIDecisionSupportSection riskProfile={riskProfile ?? null} inspection={inspection ?? null} onAiRiskResult={setAiRiskResult} />
          <ApprovalWorkflowSection inspectionId={id} aiRiskResult={aiRiskResult} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Inspection Information — wired to real data
───────────────────────────────────────────────────────────── */

function InspectionInfoSection({
  inspection,
  loading,
}: {
  inspection: InspectionDetail | null | undefined;
  loading: boolean;
}) {
  const fields = [
    { icon: Building2,    label: "Establishment",  value: inspection?.establishmentName },
    { icon: Shield,       label: "Department",      value: `${inspection?.departmentName ?? ""}${inspection?.departmentCode ? ` (${inspection.departmentCode})` : ""}` },
    { icon: User,         label: "Inspector",       value: inspection?.inspectorName },
    { icon: Calendar,     label: "Scheduled Date",  value: inspection?.scheduledDate && inspection.scheduledDate !== "—" ? new Date(inspection.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
    { icon: Calendar,     label: "Actual Date",     value: inspection?.actualDate ? new Date(inspection.actualDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not conducted" },
    { icon: ClipboardList, label: "Status",         value: inspection?.status?.replace("_", " ") },
  ];

  return (
    <SectionCard title="Inspection Information" icon={Info}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <f.icon className="h-3 w-3" />
              {f.label}
            </div>
            {loading ? (
              <Skeleton className="mt-1.5 h-5 w-32" />
            ) : (
              <div className="mt-1.5 text-sm font-medium text-foreground capitalize">
                {f.value || "—"}
              </div>
            )}
          </div>
        ))}
      </div>
      {inspection?.notes && (
        <div className="border-t border-border/60 px-4 py-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</div>
          <p className="text-sm text-foreground">{inspection.notes}</p>
        </div>
      )}
    </SectionCard>
  );
}


/* ─────────────────────────────────────────────────────────────
   Tabbed: Checklist + Evidence — wired to real data
───────────────────────────────────────────────────────────── */

function InspectionTabsSection({
  inspection,
  loading,
}: {
  inspection: InspectionDetail | null | undefined;
  loading: boolean;
}) {
  return (
    <SectionCard title="Inspection Details" icon={ClipboardList}>
      <Tabs defaultValue="checklist" className="w-full">
        <div className="border-b border-border/60 px-4">
          <TabsList className="h-10 bg-transparent p-0 gap-1">
            <TabsTrigger value="checklist" className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 text-sm data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
              Checklist
            </TabsTrigger>
            <TabsTrigger value="evidence" className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 text-sm data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">
              Evidence
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="checklist" className="mt-0">
          <ChecklistTab checklist={inspection?.checklist} findings={inspection?.findings} loading={loading} />
        </TabsContent>
        <TabsContent value="evidence" className="mt-0">
          <EvidenceTab evidenceSummary={inspection?.evidenceSummary} loading={loading} />
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
}

function ChecklistTab({
  checklist,
  findings,
  loading,
}: {
  checklist: Record<string, unknown> | null | undefined;
  findings: Record<string, unknown> | null | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <div className="mb-3 grid grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)] gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Question</span><span>Response</span><span>Observation</span>
        </div>
        {[1,2,3,4].map((i) => (
          <div key={i} className="grid grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)] gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5">
            <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  // ── Normalise checklist into a flat list of {question, answer, observation} ─
  // The DB stores checklist as JSONB, which can come back as:
  //   • an array of item objects: [{question, answer, observation, ...}, ...]
  //   • a flat key→value object: {"fire_exit": "Yes", "water_supply": "No", ...}
  //   • null / empty
  type ChecklistItem = { question: string; answer: string; observation: string };

  function normaliseChecklist(raw: Record<string, unknown> | null | undefined): ChecklistItem[] {
    if (!raw) return [];

    // Unwrap wrapper object: { items: [...], compliance: 70, ... }
    // Process raw.items as the rows; ignore non-array sibling keys like "compliance".
    const source: unknown = Array.isArray((raw as any).items) ? (raw as any).items : raw;

    // Array form: [{question/label/text, answer/response/value, observation/notes/remark, ...}]
    if (Array.isArray(source)) {
      return (source as any[]).map((item, i) => {
        if (typeof item !== "object" || item === null) {
          return { question: `Item ${i + 1}`, answer: String(item ?? "—"), observation: "" };
        }
        const o = item as Record<string, unknown>;
        const question    = String(o.question ?? o.label ?? o.text ?? o.name ?? `Item ${i + 1}`);
        const answerRaw   = o.answer ?? o.response ?? o.value ?? o.status ?? null;
        const answer      = answerRaw !== null ? String(answerRaw) : "—";
        const obsRaw      = o.observation ?? o.notes ?? o.remark ?? o.details ?? null;
        const observation = obsRaw !== null ? String(obsRaw) : "";
        return { question, answer, observation };
      });
    }

    // Flat object form: {"key": value, ...}
    // Skip keys whose value is an array or object (e.g. a nested items array already handled above).
    return Object.entries(raw)
      .filter(([, val]) => val === null || typeof val !== "object")
      .map(([key, val]) => ({
        question: key.replace(/_/g, " "),
        answer: val === null || val === undefined ? "—" : String(val),
        observation: "",
      }));
  }

  const items = normaliseChecklist(checklist);

  // findings can also be array or flat object — normalise the same way
  const findingItems = normaliseChecklist(findings as Record<string, unknown> | null);

  const answerColour = (ans: string): string => {
    const lv = ans.toLowerCase();
    if (lv === "yes" || lv === "pass" || lv === "true" || lv === "compliant")
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (lv === "no" || lv === "fail" || lv === "false" || lv === "non-compliant")
      return "bg-destructive/10 text-destructive";
    if (lv === "na" || lv === "n/a" || lv === "not applicable")
      return "bg-muted text-muted-foreground";
    return "bg-primary/10 text-primary";
  };

  if (items.length === 0 && findingItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <ClipboardList className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No checklist data</p>
        <p className="text-xs text-muted-foreground">The inspector has not submitted checklist responses yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {items.length > 0 && (
        <>
          <div className="mb-3 grid grid-cols-[minmax(0,2fr)_100px_minmax(0,1fr)] gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Question</span><span>Answer</span><span>Observation</span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,2fr)_100px_minmax(0,1fr)] gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm">
              <span className="text-foreground capitalize leading-snug">{item.question}</span>
              <Badge variant="secondary" className={`w-fit h-fit text-[10px] uppercase tracking-wide ${answerColour(item.answer)}`}>
                {item.answer}
              </Badge>
              <span className="text-xs text-muted-foreground leading-snug">
                {item.observation || "—"}
              </span>
            </div>
          ))}
        </>
      )}

      {findingItems.length > 0 && (
        <>
          <div className="pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Findings</div>
          {findingItems.map((item, i) => (
            <div key={i} className="rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm">
              <span className="font-medium capitalize text-foreground">{item.question}: </span>
              <span className="text-muted-foreground">{item.answer}</span>
              {item.observation && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.observation}</p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function EvidenceTab({
  evidenceSummary,
  loading,
}: {
  evidenceSummary: Record<string, unknown> | null | undefined;
  loading: boolean;
}) {
  // Resolve image count from any common key name the DB might use
  const imageCount: number | null = (() => {
    if (!evidenceSummary) return null;
    const v = evidenceSummary.images
      ?? evidenceSummary.image_count
      ?? evidenceSummary.total_images
      ?? evidenceSummary.photos
      ?? null;
    return typeof v === "number" ? v : v !== null && v !== undefined ? Number(v) || null : null;
  })();

  // Resolve document count
  const docCount: number | null = (() => {
    if (!evidenceSummary) return null;
    const v = evidenceSummary.documents
      ?? evidenceSummary.document_count
      ?? evidenceSummary.docs
      ?? evidenceSummary.files
      ?? null;
    return typeof v === "number" ? v : v !== null && v !== undefined ? Number(v) || null : null;
  })();

  const totalCount =
    imageCount !== null && docCount !== null ? imageCount + docCount : imageCount ?? docCount ?? null;

  // All other keys in evidence_summary that aren't images/documents —
  // render them as a generic key-value list so no data is hidden.
  const knownKeys = new Set([
    "images", "image_count", "total_images", "photos",
    "documents", "document_count", "docs", "files",
  ]);
  const extraEntries = evidenceSummary
    ? Object.entries(evidenceSummary).filter(([k]) => !knownKeys.has(k))
    : [];

  return (
    <div className="p-4 space-y-4">
      {/* Images */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          Uploaded Images
          {imageCount !== null && (
            <Badge variant="secondary" className="ml-1 text-[10px]">{imageCount}</Badge>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {[1,2,3].map((i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
          </div>
        ) : imageCount === null || imageCount === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-4 text-center">
            <Camera className="mx-auto h-5 w-5 text-muted-foreground/50" />
            <p className="mt-1 text-xs text-muted-foreground">No images uploaded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: Math.min(imageCount, 8) }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-1">
                <Camera className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground">Image {i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Documents */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Documents & Files
          {docCount !== null && (
            <Badge variant="secondary" className="ml-1 text-[10px]">{docCount}</Badge>
          )}
        </div>
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
          <Paperclip className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-2 text-xs text-muted-foreground">
            {docCount !== null && docCount > 0
              ? `${docCount} document${docCount > 1 ? "s" : ""} uploaded.`
              : "No documents uploaded."}
          </p>
        </div>
      </div>

      {/* Evidence Summary counts */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence Summary</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Files", value: totalCount },
            { label: "Images",      value: imageCount },
            { label: "Documents",   value: docCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md border border-border/60 bg-background p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              {loading ? (
                <Skeleton className="mt-1 h-5 w-8" />
              ) : (
                <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {value !== null ? value : "—"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Extra fields from evidence_summary that don't map to images/documents */}
      {!loading && extraEntries.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Additional Evidence Data
          </div>
          <div className="space-y-1.5">
            {extraEntries.map(([key, val]) => (
              <div key={key} className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                <span className="capitalize text-foreground">{key.replace(/_/g, " ")}</span>
                <span className="text-right text-xs text-muted-foreground break-all">
                  {val === null || val === undefined
                    ? "—"
                    : typeof val === "object"
                      ? JSON.stringify(val)
                      : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: evidence_summary exists but all counts are null — show raw */}
      {!loading && evidenceSummary && imageCount === null && docCount === null && extraEntries.length === 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Raw Evidence Data
          </div>
          <pre className="rounded-md border border-border/60 bg-muted/20 p-3 text-[11px] text-foreground overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(evidenceSummary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AI Decision Support — live agent calls
───────────────────────────────────────────────────────────── */

function AIDecisionSupportSection({
  riskProfile,
  inspection,
  onAiRiskResult,
}: {
  riskProfile: RiskProfileRow | null;
  inspection: InspectionDetail | null;
  onAiRiskResult: (result: RiskScoreResponse) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Brain className="h-3.5 w-3.5" />
        AI Decision Intelligence
      </div>
      <RiskAnalysisCard riskProfile={riskProfile} inspection={inspection} onResult={onAiRiskResult} />
      <EvidenceVerificationCard inspection={inspection} />
      <AIReportCard inspection={inspection} />
      <RecommendActionCard inspection={inspection} />
    </div>
  );
}

function RiskAnalysisCard({
  riskProfile,
  inspection,
  onResult,
}: {
  riskProfile: RiskProfileRow | null;
  inspection: InspectionDetail | null;
  onResult: (result: RiskScoreResponse) => void;
}) {
  const [aiResult, setAiResult] = useState<RiskScoreResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No inspection data");
      return getRiskScore(await buildAIPayload(inspection));
    },
    onSuccess: (data) => {
      setAiResult(data);
      onResult(data);   // bubble up to InspectionReviewWorkspace
    },
  });

  // Prefer live AI result → DB risk_profile → inspection snapshot
  const score = aiResult?.risk_score ?? riskProfile?.riskScore ?? inspection?.riskScoreAtInspection ?? null;
  const level = aiResult?.risk_level ?? riskProfile?.riskLevel ?? null;
  const explanation = aiResult?.explanation ?? null;

  const levelColor: Record<string, string> = {
    Critical: "bg-destructive text-destructive-foreground",
    High:     "bg-destructive/10 text-destructive",
    Medium:   "bg-amber-500/10 text-amber-700",
    Low:      "bg-emerald-500/10 text-emerald-700",
  };

  return (
    <Card className="border-destructive/20 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60 py-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-destructive/10">
          <ShieldAlert className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Risk Analysis</CardTitle>
          <p className="text-[11px] text-muted-foreground">Risk Prioritization Agent</p>
        </div>
        <AIAgentBadge active={mutation.isPending} />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border/60 bg-background p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Score</div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {mutation.isPending ? <Skeleton className="h-7 w-10" /> : score !== null ? score : <span className="text-sm text-muted-foreground">—</span>}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-background p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk Level</div>
            <div className="mt-1.5">
              {mutation.isPending ? <Skeleton className="h-5 w-16 rounded-full" /> : level ? (
                <Badge variant="secondary" className={`text-[10px] uppercase tracking-wide ${levelColor[level] ?? "bg-muted text-muted-foreground"}`}>{level}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>Risk Score</span><span>0 – 100</span>
          </div>
          <Progress value={score ?? 0} className="h-2" />
        </div>
        {riskProfile?.factors && Object.keys(riskProfile.factors).length > 0 && !aiResult && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk Factors</div>
            <div className="space-y-1">
              {Object.entries(riskProfile.factors).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-foreground">{k.replace(/_/g, " ")}</span>
                  <span className="tabular-nums text-muted-foreground">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Explanation</div>
          {mutation.isPending ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" />
            </div>
          ) : explanation ? (
            <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-foreground">{explanation}</p>
          ) : (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground italic">
              {mutation.isError ? `Error: ${(mutation.error as Error).message}` : "Click Analyse Risk to run the agent."}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={mutation.isPending || !inspection}
          onClick={() => mutation.mutate()}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          {mutation.isPending ? "Analysing…" : "Analyse Risk"}
        </Button>
      </CardContent>
    </Card>
  );
}

function EvidenceVerificationCard({ inspection }: { inspection: InspectionDetail | null }) {
  const [aiResult, setAiResult] = useState<EvidenceVerificationResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No inspection data");
      return verifyEvidence(await buildAIPayload(inspection));
    },
    onSuccess: (data) => setAiResult(data),
  });

  const confidence = aiResult?.confidence_score ?? null;
  const suspicious = aiResult?.flagged_suspicious ?? null;
  const mismatches = aiResult?.mismatches ?? [];
  const explanation = aiResult?.explanation ?? null;

  return (
    <Card className="border-amber-500/20 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60 py-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-500/10">
          <Eye className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Evidence Verification</CardTitle>
          <p className="text-[11px] text-muted-foreground">Evidence Verification Agent</p>
        </div>
        <AIAgentBadge active={mutation.isPending} />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border/60 bg-background p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {mutation.isPending ? <Skeleton className="h-7 w-10" /> : confidence !== null ? `${confidence}%` : <span className="text-sm text-muted-foreground">—</span>}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-background p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Suspicious</div>
            <div className="mt-1.5">
              {mutation.isPending ? <Skeleton className="h-5 w-10 rounded-full" /> : suspicious !== null ? (
                <Badge variant="secondary" className={suspicious ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}>
                  {suspicious ? "Yes" : "No"}
                </Badge>
              ) : <span className="text-sm text-muted-foreground">—</span>}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>Confidence Score</span><span>0 – 100%</span>
          </div>
          <Progress value={confidence ?? 0} className="h-2" />
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detected Mismatches</div>
          {mutation.isPending ? (
            <div className="space-y-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
          ) : mismatches.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              {mismatches.map((m, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {mutation.isError ? `Error: ${(mutation.error as Error).message}` : aiResult ? "No mismatches detected." : "Click Verify Evidence to run the agent."}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Explanation</div>
          {mutation.isPending ? (
            <div className="space-y-1.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>
          ) : explanation ? (
            <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-foreground">{explanation}</p>
          ) : (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground italic">
              Awaiting Evidence Verification Agent output.
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={mutation.isPending || !inspection}
          onClick={() => mutation.mutate()}
        >
          <Eye className="h-3.5 w-3.5" />
          {mutation.isPending ? "Verifying…" : "Verify Evidence"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AIReportCard({ inspection }: { inspection: InspectionDetail | null }) {
  const [aiResult, setAiResult] = useState<GeneratedReportResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No inspection data");
      return generateReport(await buildAIPayload(inspection));
    },
    onSuccess: (data) => setAiResult(data),
  });

  const sections: { label: string; accent?: "destructive"; value: string | null }[] = [
    { label: "Executive Summary",   value: aiResult?.report_summary ?? null },
    { label: "Violation Notice",    accent: "destructive", value: aiResult?.violation_notice ?? null },
    { label: "Recommended Actions", value: aiResult ? aiResult.recommended_actions.join("\n• ") || null : null },
    { label: "Corrective Actions",  value: aiResult ? aiResult.corrective_actions.join("\n• ")  || null : null },
  ];

  return (
    <Card className="border-primary/20 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60 py-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Generated Report</CardTitle>
          <p className="text-[11px] text-muted-foreground">Report Generation Agent</p>
        </div>
        <AIAgentBadge active={mutation.isPending} />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {sections.map(({ label, accent, value }) => (
          <div key={label}>
            <div className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${accent === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
              {label}
            </div>
            {mutation.isPending ? (
              <div className="space-y-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
            ) : value ? (
              <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-foreground whitespace-pre-line min-h-[40px]">{value}</p>
            ) : (
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground italic min-h-[40px]">
                {mutation.isError ? `Error: ${(mutation.error as Error).message}` : "Click Generate Report to run the agent."}
              </div>
            )}
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={mutation.isPending || !inspection}
          onClick={() => mutation.mutate()}
        >
          <FileText className="h-3.5 w-3.5" />
          {mutation.isPending ? "Generating…" : "Generate Report"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RecommendActionCard({ inspection }: { inspection: InspectionDetail | null }) {
  const [aiResult, setAiResult] = useState<RecommendActionResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error("No inspection data");
      return recommendAction(await buildAIPayload(inspection));
    },
    onSuccess: (data) => setAiResult(data),
  });

  return (
    <Card className="border-emerald-500/20 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border/60 py-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/10">
          <ListChecks className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">Recommended Actions</CardTitle>
          <p className="text-[11px] text-muted-foreground">Report Generation Agent</p>
        </div>
        <AIAgentBadge active={mutation.isPending} />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {(["Recommended Actions", "Corrective Actions"] as const).map((label) => {
          const items = label === "Recommended Actions"
            ? (aiResult?.recommended_actions ?? [])
            : (aiResult?.corrective_actions ?? []);
          return (
            <div key={label}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
              {mutation.isPending ? (
                <div className="space-y-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
              ) : items.length > 0 ? (
                <ul className="space-y-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {mutation.isError ? `Error: ${(mutation.error as Error).message}` : "Click Recommend Action to run the agent."}
                </div>
              )}
            </div>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          disabled={mutation.isPending || !inspection}
          onClick={() => mutation.mutate()}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {mutation.isPending ? "Processing…" : "Recommend Action"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AIAgentBadge({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? "bg-primary" : "bg-primary/60"}`} />
      </span>
      <span className="text-[10px] text-muted-foreground">{active ? "Running…" : "AI"}</span>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   Approval Workflow
───────────────────────────────────────────────────────────── */

function ApprovalWorkflowSection({ inspectionId, aiRiskResult }: { inspectionId: string; aiRiskResult: RiskScoreResponse | null }) {
  const [notes, setNotes] = useState("");
  const [modifyOpen, setModifyOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [reinspectOpen, setReinspectOpen] = useState(false);

  const qc = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: ({ decision }: { decision: "approved" | "rejected" }) => {
      console.log("[ai_rec DEBUG] ApprovalWorkflowSection — aiRiskResult at submit:", aiRiskResult);
      return submitSupervisorReview(
        inspectionId,
        decision,
        notes,
        aiRiskResult
          ? {
              risk_score:  aiRiskResult.risk_score,
              risk_level:  aiRiskResult.risk_level,
              explanation: aiRiskResult.explanation,
            }
          : null,
      );
    },
    onSuccess: (_data, { decision }) => {
      toast.success(
        decision === "approved"
          ? "Inspection approved successfully."
          : "Inspection rejected. Review notes recorded.",
      );
      // Refresh the inspection detail so the status pill reflects any
      // downstream status change, and invalidate the review queue so
      // the supervisor queue count updates on the next visit.
      qc.invalidateQueries({ queryKey: ["inspection-detail", inspectionId] });
      qc.invalidateQueries({ queryKey: ["supervisor-review-queue"] });
      qc.invalidateQueries({ queryKey: ["analytics-approval-rate"] });
      qc.invalidateQueries({ queryKey: ["analytics-approval-trend"] });
      // Clear notes after a successful submission
      setNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to submit review. Please try again.");
    },
  });

  const isPending = reviewMutation.isPending;

  return (
    <SectionCard title="Supervisor Decision" icon={MessageSquare}>
      <div className="p-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Review Notes
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add comments, observations, or justification for your decision…"
            className="min-h-[80px] resize-y text-sm"
            disabled={isPending}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Decision</p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isPending ? "Submitting…" : "Approve AI-Generated Report"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve this inspection report?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the inspection as approved and finalise the AI-generated report.
                  This action creates an audit trail entry.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isPending}
                  onClick={() => reviewMutation.mutate({ decision: "approved" })}
                >
                  Confirm Approval
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                disabled={isPending}
              >
                <XCircle className="h-4 w-4" />
                {isPending ? "Submitting…" : "Reject Report"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject this inspection report?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reject the AI-generated report. Please ensure your review notes contain
                  the reason for rejection before confirming.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={isPending}
                  onClick={() => reviewMutation.mutate({ decision: "rejected" })}
                >
                  Confirm Rejection
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Other Actions</p>

          <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />Modify AI Recommendations
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Modify AI Recommendations</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">Override or amend the AI-generated recommendations before approval.</p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Modified Recommendations</label>
                  <Textarea placeholder="Enter modified recommendations…" className="min-h-[120px] text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason for Modification</label>
                  <Textarea placeholder="Explain why the AI recommendation was modified…" className="min-h-[80px] text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModifyOpen(false)}>Cancel</Button>
                <Button onClick={() => setModifyOpen(false)}>Save Modifications</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Camera className="h-4 w-4" />Request Additional Evidence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Request Additional Evidence</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">Send a request to the inspector for additional documentation or photographs.</p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Evidence Required</label>
                  <Textarea placeholder="Describe the specific evidence or documentation needed…" className="min-h-[100px] text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEvidenceOpen(false)}>Cancel</Button>
                <Button onClick={() => setEvidenceOpen(false)}>Send Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={reinspectOpen} onOpenChange={setReinspectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <RotateCcw className="h-4 w-4" />Request Re-inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Request Re-inspection</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">Flag this inspection for a new field visit.</p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason for Re-inspection</label>
                  <Textarea placeholder="Explain why a re-inspection is required…" className="min-h-[100px] text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReinspectOpen(false)}>Cancel</Button>
                <Button onClick={() => setReinspectOpen(false)}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            All decisions are recorded in the audit trail with timestamp and supervisor identity.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared primitive
───────────────────────────────────────────────────────────── */

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/60 py-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}