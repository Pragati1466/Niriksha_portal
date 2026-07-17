import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDepartments, upsertDepartment, deleteDepartment } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFormDraft, hasDraft, clearDraft, confirmDiscardOrKeep } from "@/hooks/use-form-draft";

const draftKey = (id: string | undefined) => `dept:${id ?? "new"}`;

export const Route = createFileRoute("/_authenticated/admin/departments")({
  head: () => ({ meta: [{ title: "Departments — NIRIKSHA Admin" }] }),
  component: DepartmentsPage,
});

type Dept = { id: string; name: string; code: string; description: string | null };

function DepartmentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDepartments);
  const upsertFn = useServerFn(upsertDepartment);
  const delFn = useServerFn(deleteDepartment);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["departments"], queryFn: () => listFn(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      clearDraft(draftKey(editing?.id));
      setOpen(false);
      toast.success(editing ? "Department updated" : "Department created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tryClose = () => {
    if (hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return false;
    setOpen(false); setEditing(null); return true;
  };
  const trySwitch = (row: Dept | null) => {
    if (open && hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setEditing(row); setOpen(true);
  };
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">Regulatory departments participating in inspections.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); else tryClose(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => trySwitch(null)}><Plus className="mr-2 h-4 w-4" />Add department</Button>
          </DialogTrigger>
          <DeptForm key={editing?.id ?? "new"} editing={editing} onSubmit={(v) => save.mutate(v)} submitting={save.isPending} />
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && rows.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No departments yet.</TableCell></TableRow>)}
            {(rows as Dept[]).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{d.code}</code></TableCell>
                <TableCell className="text-muted-foreground">{d.description ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => trySwitch(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete department?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone. Establishments linked to this department will block deletion.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(d.id)}>Delete</AlertDialogAction>
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

function DeptForm({ editing, onSubmit, submitting }: { editing: Dept | null; onSubmit: (v: any) => void; submitting: boolean }) {
  const { values: f, set } = useFormDraft(draftKey(editing?.id), {
    name: editing?.name ?? "",
    code: editing?.code ?? "",
    description: editing?.description ?? "",
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
        <DialogDescription>Configure a regulatory department.</DialogDescription>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ id: editing?.id, name: f.name, code: f.code, description: f.description || null }); }} className="space-y-4">
        <div className="space-y-2"><Label>Name</Label><Input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Food Safety" /></div>
        <div className="space-y-2"><Label>Code</Label><Input required value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. FSSAI" /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} /></div>
        <DialogFooter><Button type="submit" disabled={submitting}>{editing ? "Save changes" : "Create"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
