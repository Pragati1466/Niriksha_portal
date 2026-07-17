import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listInspections, upsertAssignment, deleteInspection,
  listEstablishments, listUsers, listTemplates, listDepartments,
  recommendAssignees, checkAssignmentConflicts,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFormDraft, hasDraft, clearDraft, confirmDiscardOrKeep } from "@/hooks/use-form-draft";

const draftKey = (id: string | undefined) => `asg:${id ?? "new"}`;


export const Route = createFileRoute("/_authenticated/admin/assignments")({
  head: () => ({ meta: [{ title: "Assignments — NIRIKSHA Admin" }] }),
  component: AssignmentsPage,
});

type Insp = {
  id: string; establishment_id: string; department_id: string;
  inspector_id: string; supervisor_id: string; template_id: string | null;
  scheduled_date: string; status: string; notes: string | null;
};

function AssignmentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listInspections);
  const upsertFn = useServerFn(upsertAssignment);
  const delFn = useServerFn(deleteInspection);
  const estFn = useServerFn(listEstablishments);
  const usersFn = useServerFn(listUsers);
  const tplFn = useServerFn(listTemplates);
  const deptFn = useServerFn(listDepartments);

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["inspections"], queryFn: () => listFn() });
  const { data: ests = [] } = useQuery({ queryKey: ["establishments"], queryFn: () => estFn() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => usersFn() });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: () => tplFn() });
  const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: () => deptFn() });

  const inspectors = (users as any[]).filter((u) => u.roles?.includes("inspector"));
  const supervisors = (users as any[]).filter((u) => u.roles?.includes("supervisor"));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insp | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      clearDraft(draftKey(editing?.id));
      setOpen(false);
      toast.success(editing ? "Assignment updated" : "Inspection assigned");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tryClose = () => {
    if (hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setOpen(false); setEditing(null);
  };
  const trySwitch = (row: Insp | null) => {
    if (open && hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setEditing(row); setOpen(true);
  };
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inspections"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const nameOf = (list: any[], id: string | null) => (id ? list.find((x) => x.id === id)?.name ?? "—" : "—");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inspection Assignments</h1>
          <p className="text-sm text-muted-foreground">Assign checklists to inspectors for establishments.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); else tryClose(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => trySwitch(null)}><Plus className="mr-2 h-4 w-4" />New assignment</Button>
          </DialogTrigger>
          <AsgForm
            key={editing?.id ?? "new"}
            editing={editing} ests={ests as any[]} depts={depts as any[]}
            inspectors={inspectors} supervisors={supervisors}
            templates={templates as any[]}
            onSubmit={(v) => save.mutate(v)} submitting={save.isPending}
          />
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Establishment</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (rows as Insp[]).length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No assignments yet.</TableCell></TableRow>)}
            {(rows as Insp[]).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{nameOf(ests as any[], r.establishment_id)}</TableCell>
                <TableCell>{nameOf(depts as any[], r.department_id)}</TableCell>
                <TableCell>{(users as any[]).find((u) => u.id === r.inspector_id)?.name ?? "—"}</TableCell>
                <TableCell>{(users as any[]).find((u) => u.id === r.supervisor_id)?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{r.scheduled_date ?? "—"}</TableCell>
                <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => trySwitch(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete assignment?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(r.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AsgForm({ editing, ests, depts, inspectors, supervisors, templates, onSubmit, submitting }: {
  editing: Insp | null; ests: any[]; depts: any[]; inspectors: any[]; supervisors: any[]; templates: any[];
  onSubmit: (v: any) => void; submitting: boolean;
}) {
  const recFn = useServerFn(recommendAssignees);
  const conflictFn = useServerFn(checkAssignmentConflicts);

  const { values: f, set } = useFormDraft(draftKey(editing?.id), {
    establishment_id: editing?.establishment_id ?? "",
    department_id: editing?.department_id ?? "",
    inspector_id: editing?.inspector_id ?? "",
    supervisor_id: editing?.supervisor_id ?? "",
    template_id: editing?.template_id ?? "",
    scheduled_date: editing?.scheduled_date ?? "",
    notes: editing?.notes ?? "",
  });

  const recs = useMutation({ mutationFn: (id: string) => recFn({ data: { establishment_id: id } }) });
  const [conflicts, setConflicts] = useState<Array<{ severity: "warn" | "error"; message: string }>>([]);

  // Auto-load recommendations when establishment selected
  useEffect(() => {
    if (f.establishment_id) {
      recs.mutate(f.establishment_id);
      // auto-select department from establishment
      const est = ests.find((e) => e.id === f.establishment_id);
      if (est?.department_id && !f.department_id) set("department_id", est.department_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.establishment_id]);

  // Re-check conflicts whenever key fields change
  useEffect(() => {
    if (!f.inspector_id && !f.supervisor_id && !f.establishment_id) return;
    const t = setTimeout(async () => {
      const res = await conflictFn({
        data: {
          inspector_id: f.inspector_id || undefined,
          supervisor_id: f.supervisor_id || undefined,
          establishment_id: f.establishment_id || undefined,
          scheduled_date: f.scheduled_date || undefined,
          exclude_id: editing?.id,
        },
      });
      setConflicts(res.conflicts);
    }, 200);
    return () => clearTimeout(t);
  }, [f.inspector_id, f.supervisor_id, f.establishment_id, f.scheduled_date, editing?.id, conflictFn]);

  const hasErrors = conflicts.some((c) => c.severity === "error");

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Edit assignment" : "New assignment"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (hasErrors) { toast.error("Resolve conflicts before assigning"); return; }
        onSubmit({
          id: editing?.id,
          establishment_id: f.establishment_id,
          department_id: f.department_id,
          inspector_id: f.inspector_id,
          supervisor_id: f.supervisor_id,
          template_id: f.template_id || null,
          scheduled_date: f.scheduled_date,
          notes: f.notes || null,
        });
      }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Establishment</Label>
            <Select value={f.establishment_id || undefined} onValueChange={(v) => set("establishment_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{ests.slice(0, 200).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={f.department_id || undefined} onValueChange={(v) => set("department_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{depts.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Recommendations panel */}
        {f.establishment_id && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Recommended assignees</span>
              <Badge variant="outline" className="ml-auto text-[10px]">rules-based</Badge>
            </div>
            {recs.isPending && <div className="text-xs text-muted-foreground">Computing recommendations…</div>}
            {recs.data && (
              <div className="grid gap-3 md:grid-cols-2">
                <RecColumn title="Inspectors" role="inspector"
                  items={recs.data.inspectors} selected={f.inspector_id}
                  onPick={(id) => set("inspector_id", id)} />
                <RecColumn title="Supervisors" role="supervisor"
                  items={recs.data.supervisors} selected={f.supervisor_id}
                  onPick={(id) => set("supervisor_id", id)} />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Inspector</Label>
            <Select value={f.inspector_id || undefined} onValueChange={(v) => set("inspector_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{inspectors.slice(0, 200).map((x) => <SelectItem key={x.id} value={x.id}>{x.name || x.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Supervisor</Label>
            <Select value={f.supervisor_id || undefined} onValueChange={(v) => set("supervisor_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{supervisors.slice(0, 200).map((x) => <SelectItem key={x.id} value={x.id}>{x.name || x.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Checklist template</Label>
          <Select value={f.template_id || undefined} onValueChange={(v) => set("template_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{templates.map((x) => <SelectItem key={x.id} value={x.id}>{x.template_name} (v{x.version})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Scheduled date</Label><Input type="date" required value={f.scheduled_date ?? ""} onChange={(e) => set("scheduled_date", e.target.value)} /></div>
        <div className="space-y-2"><Label>Notes</Label><Input value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>

        {/* Conflict panel */}
        {conflicts.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
            {conflicts.map((c, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${c.severity === "error" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{c.message}</span>
              </div>
            ))}
          </div>
        )}
        {conflicts.length === 0 && f.inspector_id && f.supervisor_id && f.scheduled_date && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> No scheduling conflicts detected.
          </div>
        )}

        <DialogFooter>
          <Button type="submit" disabled={submitting || hasErrors}>{editing ? "Save" : "Assign"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function RecColumn({ title, role, items, selected, onPick }: {
  title: string; role: string;
  items: Array<{ id: string; name: string; email: string; workload: number; reasons: string[]; deptMatch: boolean }>;
  selected: string; onPick: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border/70 p-2 text-[11px] text-muted-foreground">
          No matching {role}s in this department.
        </div>
      )}
      <div className="space-y-1">
        {items.map((r) => {
          const isSel = selected === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              className={`w-full rounded-md border p-2 text-left transition ${
                isSel ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-xs font-medium">{r.name}</div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  load {r.workload}
                </Badge>
              </div>
              <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                {r.reasons.join(" · ")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

