import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listUsers, createUser, updateUser, deleteUser, listDepartments, resetUserPassword,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { useFormDraft, hasDraft, clearDraft, confirmDiscardOrKeep } from "@/hooks/use-form-draft";

const draftKey = (id: string | undefined) => `user:${id ?? "new"}`;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — NIRIKSHA Admin" }] }),
  component: UsersPage,
});

type Dept = { id: string; name: string; code: string };
type User = {
  id: string; name: string; email: string; phone: string | null; employee_id: string | null;
  jurisdiction: { state?: string | null; district?: string | null };
  is_active: boolean; department_id: string | null; roles: string[];
};

function UsersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const listDeptFn = useServerFn(listDepartments);
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);
  const delFn = useServerFn(deleteUser);
  const resetFn = useServerFn(resetUserPassword);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const { data: rows = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: () => listFn() });
  const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: () => listDeptFn() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => (editing ? updateFn({ data: { ...v, id: editing.id } }) : createFn({ data: v })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      clearDraft(draftKey(editing?.id));
      setOpen(false);
      toast.success(editing ? "User updated" : "User created");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const tryClose = () => {
    if (hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setOpen(false); setEditing(null);
  };
  const trySwitch = (row: User | null) => {
    if (open && hasDraft(draftKey(editing?.id)) && !confirmDiscardOrKeep()) return;
    setEditing(row); setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Inspectors, supervisors, and administrators.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); else tryClose(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => trySwitch(null)}><Plus className="mr-2 h-4 w-4" />Add user</Button>
          </DialogTrigger>
          <UserForm key={editing?.id ?? "new"} editing={editing} depts={depts as Dept[]} onSubmit={(v) => save.mutate(v)} submitting={save.isPending} />
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (rows as User[]).length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No users yet.</TableCell></TableRow>)}
            {(rows as User[]).map((u) => {
              const dept = (depts as Dept[]).find((d) => d.id === u.department_id);
              const j = u.jurisdiction || {};
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.roles.map((r) => <Badge key={r} variant="secondary" className="mr-1">{r}</Badge>)}</TableCell>
                  <TableCell>{dept?.name ?? "—"}</TableCell>
                  <TableCell>{u.employee_id ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{[j.state, j.district].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => trySwitch(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Reset password" onClick={() => { setResetTarget(u); setNewPwd(""); }}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently removes the account and profile.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(u.id)}>Delete</AlertDialogAction>
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

      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set a new password for <span className="font-medium text-foreground">{resetTarget?.email}</span>. Share it securely with the user.
            </p>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="text" minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="min 8 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button
              disabled={newPwd.length < 8}
              onClick={async () => {
                if (!resetTarget) return;
                try {
                  await resetFn({ data: { user_id: resetTarget.id, new_password: newPwd } });
                  toast.success("Password reset");
                  setResetTarget(null);
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({ editing, depts, onSubmit, submitting }: {
  editing: User | null; depts: Dept[]; onSubmit: (v: any) => void; submitting: boolean;
}) {
  const { values: f, set } = useFormDraft(draftKey(editing?.id), {
    name: editing?.name ?? "",
    email: editing?.email ?? "",
    password: "",
    role: editing?.roles[0] ?? "inspector",
    departmentId: editing?.department_id ?? "",
    phone: editing?.phone ?? "",
    empId: editing?.employee_id ?? "",
    state: editing?.jurisdiction?.state ?? "",
    district: editing?.jurisdiction?.district ?? "",
  });
  const { name, email, password, role, departmentId, phone, empId, state, district } = f;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => {
        e.preventDefault();
        const base: any = {
          name, phone: phone || null, employee_id: empId || null,
          department_id: departmentId || null,
          jurisdiction_state: state || null, jurisdiction_district: district || null,
          role,
        };
        onSubmit(editing ? base : { ...base, email, password });
      }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inspector">Inspector</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-2"><Label>Temp password</Label><Input type="text" required minLength={8} value={password} onChange={(e) => set("password", e.target.value)} placeholder="min 8 chars" /></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId || undefined} onValueChange={(v) => set("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Employee ID</Label><Input value={empId ?? ""} onChange={(e) => set("empId", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Phone</Label><Input value={phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Jurisdiction state</Label><Input value={state ?? ""} onChange={(e) => set("state", e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Jurisdiction district</Label><Input value={district ?? ""} onChange={(e) => set("district", e.target.value)} /></div>
        <DialogFooter><Button type="submit" disabled={submitting}>{editing ? "Save" : "Create user"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
