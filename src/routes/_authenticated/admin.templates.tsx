import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTemplates, upsertTemplate, deleteTemplate, listDepartments } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFormDraft, hasDraft, clearDraft, confirmDiscardOrKeep } from "@/hooks/use-form-draft";

const draftKey = (id: string | undefined) => `tpl:${id ?? "new"}`;

export const Route = createFileRoute("/_authenticated/admin/templates")({
  head: () => ({ meta: [{ title: "Checklist Templates — NIRIKSHA Admin" }] }),
  component: TemplatesPage,
});

type Dept = { id: string; name: string };
type Tpl = {
  id: string; name: string; version: number; is_active: boolean;
  department_id: string; schema: any;
};

const EXAMPLE = {
  sections: [
    {
      title: "Hygiene",
      items: [
        { id: "h1", label: "Kitchen surfaces clean", type: "yes_no", required: true },
        { id: "h2", label: "Staff wearing gloves", type: "yes_no", required: true },
      ],
    },
  ],
};

function TemplatesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTemplates);
  const listDeptFn = useServerFn(listDepartments);
  const upsertFn = useServerFn(upsertTemplate);
  const delFn = useServerFn(deleteTemplate);

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["templates"], queryFn: () => listFn() });
  const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: () => listDeptFn() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      clearDraft(draftKey(editing?.id));
      setOpen(false);
      toast.success(editing ? "Template updated" : "Template created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tryClose = () => {
    if (hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setOpen(false); setEditing(null);
  };
  const trySwitch = (row: Tpl | null) => {
    if (open && hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setEditing(row); setOpen(true);
  };
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Checklist Templates</h1>
          <p className="text-sm text-muted-foreground">Define JSON-schema checklists per department.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); else tryClose(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => trySwitch(null)}><Plus className="mr-2 h-4 w-4" />New template</Button>
          </DialogTrigger>
          <TplForm key={editing?.id ?? "new"} editing={editing} depts={depts as Dept[]} onSubmit={(v) => save.mutate(v)} submitting={save.isPending} />
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (rows as Tpl[]).length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No templates yet.</TableCell></TableRow>)}
            {(rows as Tpl[]).map((t) => {
              const dept = (depts as Dept[]).find((d) => d.id === t.department_id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{dept?.name ?? "—"}</TableCell>
                  <TableCell>v{t.version}</TableCell>
                  <TableCell>{t.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Draft</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => trySwitch(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete template?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(t.id)}>Delete</AlertDialogAction>
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

function TplForm({ editing, depts, onSubmit, submitting }: { editing: Tpl | null; depts: Dept[]; onSubmit: (v: any) => void; submitting: boolean; }) {
  const { values: f, set } = useFormDraft(draftKey(editing?.id), {
    name: editing?.name ?? "",
    departmentId: editing?.department_id ?? "",
    version: editing?.version ?? 1,
    isActive: editing?.is_active ?? true,
    schemaText: JSON.stringify(editing?.schema ?? EXAMPLE, null, 2),
  });
  const { name, departmentId, version, isActive, schemaText } = f;
  const [err, setErr] = useState<string | null>(null);

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit template" : "New checklist template"}</DialogTitle>
        <DialogDescription>Provide checklist structure as JSON.</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => {
        e.preventDefault();
        try {
          const schema = JSON.parse(schemaText);
          setErr(null);
          onSubmit({ id: editing?.id, name, department_id: departmentId, version: Number(version), is_active: isActive, schema });
        } catch (er: any) {
          setErr("Invalid JSON: " + er.message);
        }
      }} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-2"><Label>Version</Label><Input type="number" min={1} value={version} onChange={(e) => set("version", Number(e.target.value))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId || undefined} onValueChange={(v) => set("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={isActive ? "active" : "draft"} onValueChange={(v) => set("isActive", v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Schema (JSON)</Label>
          <Textarea rows={16} className="font-mono text-xs" value={schemaText} onChange={(e) => set("schemaText", e.target.value)} />
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter><Button type="submit" disabled={submitting}>{editing ? "Save" : "Create"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
