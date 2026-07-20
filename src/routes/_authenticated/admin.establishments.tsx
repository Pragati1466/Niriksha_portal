import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listEstablishments, upsertEstablishment, deleteEstablishment, listDepartments, setEstablishmentStatus,
  validateEstablishment,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFormDraft, hasDraft, clearDraft, confirmDiscardOrKeep } from "@/hooks/use-form-draft";

const draftKey = (id: string | undefined) => `est:${id ?? "new"}`;


export const Route = createFileRoute("/_authenticated/admin/establishments")({
  head: () => ({ meta: [{ title: "Establishments — NIRIKSHA Admin" }] }),
  component: EstablishmentsPage,
});

type Dept = { id: string; name: string };
type EstStatus = "active" | "suspended" | "archived";
type Est = {
  id: string; name: string; registration_no: string | null; category: string | null;
  address: string | null; state: string | null; district: string | null;
  department_id: string; contact_name: string | null; contact_phone: string | null;
  status: EstStatus;
};

function EstablishmentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEstablishments);
  const listDeptFn = useServerFn(listDepartments);
  const upsertFn = useServerFn(upsertEstablishment);
  const delFn = useServerFn(deleteEstablishment);
  const statusFn = useServerFn(setEstablishmentStatus);

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["establishments"], queryFn: () => listFn() });
  const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: () => listDeptFn() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Est | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["establishments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      clearDraft(draftKey(editing?.id));
      setOpen(false);
      toast.success(editing ? "Establishment updated" : "Establishment created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tryClose = () => {
    if (hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setOpen(false); setEditing(null);
  };
  const trySwitch = (row: Est | null) => {
    if (open && hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setEditing(row); setOpen(true);
  };
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["establishments"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: EstStatus }) => statusFn({ data: v }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["establishments"] });
      toast.success(`Marked ${v.status}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Establishments</h1>
          <p className="text-sm text-muted-foreground">Entities registered for inspection.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); else tryClose(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => trySwitch(null)}><Plus className="mr-2 h-4 w-4" />Add establishment</Button>
          </DialogTrigger>
          <EstForm key={editing?.id ?? "new"} editing={editing} depts={depts as Dept[]} onSubmit={(v) => save.mutate(v)} submitting={save.isPending} />
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Reg. No.</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (rows as Est[]).length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No establishments yet.</TableCell></TableRow>)}
            {(rows as Est[]).map((e) => {
              const dept = (depts as Dept[]).find((d) => d.id === e.department_id);
              const statusColor =
                e.status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : e.status === "suspended" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-muted text-muted-foreground";
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell><code className="text-xs">{e.registration_no ?? "—"}</code></TableCell>
                  <TableCell>{dept?.name ?? "—"}</TableCell>
                  <TableCell>{e.category ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{[e.district, e.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={e.status}
                      onValueChange={(v) => changeStatus.mutate({ id: e.id, status: v as EstStatus })}
                    >
                      <SelectTrigger className="h-8">
                        <Badge className={statusColor} variant="secondary">{e.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => trySwitch(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete establishment?</AlertDialogTitle>
                          <AlertDialogDescription>Inspections referencing this establishment will block deletion.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(e.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function EstForm({ editing, depts, onSubmit, submitting }: { editing: Est | null; depts: Dept[]; onSubmit: (v: any) => void; submitting: boolean; }) {
  const { values: f, set } = useFormDraft(draftKey(editing?.id), {
    name: editing?.name ?? "",
    registration_no: editing?.registration_no ?? "",
    category: editing?.category ?? "",
    department_id: editing?.department_id ?? "",
    address: editing?.address ?? "",
    state: editing?.state ?? "",
    district: editing?.district ?? "",
    contact_name: editing?.contact_name ?? "",
    contact_phone: editing?.contact_phone ?? "",
  });

  const validateFn = useServerFn(validateEstablishment);
  const [warnings, setWarnings] = useState<Array<{ severity: "warn" | "error"; message: string }>>([]);

  useEffect(() => {
    if (!f.name.trim() || f.name.trim().length < 3) { setWarnings([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await validateFn({
          data: {
            name: f.name.trim(),
            registration_number: f.registration_no?.trim() || undefined,
            exclude_id: editing?.id,
          },
        });
        setWarnings(res.warnings);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [f.name, f.registration_no, editing?.id, validateFn]);

  const hasError = warnings.some((w) => w.severity === "error");

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit establishment" : "New establishment"}</DialogTitle></DialogHeader>
      <form onSubmit={(ev) => {
        ev.preventDefault();
        if (hasError) { toast.error("Resolve duplicate errors before saving"); return; }
        onSubmit({ id: editing?.id, ...f });
      }} className="space-y-3">
        <div className="space-y-2"><Label>Name</Label><Input required value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Registration No.</Label><Input value={f.registration_no} onChange={(e) => set("registration_no", e.target.value)} /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Restaurant" /></div>
        </div>

        {warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
            {warnings.map((w, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs ${w.severity === "error" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}
        {warnings.length === 0 && f.name.trim().length >= 3 && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> No duplicates detected.
          </div>
        )}

        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={f.department_id || undefined} onValueChange={(v) => set("department_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Address</Label><Textarea rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>District</Label><Input value={f.district} onChange={(e) => set("district", e.target.value)} /></div>
          <div className="space-y-2"><Label>State</Label><Input value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Contact name</Label><Input value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></div>
          <div className="space-y-2"><Label>Contact phone</Label><Input value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={submitting || hasError}>{editing ? "Save" : "Create"}</Button></DialogFooter>
      </form>
    </DialogContent>

  );
}
