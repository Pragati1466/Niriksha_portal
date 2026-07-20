import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — NIRIKSHA Admin" }] }),
  component: AuditPage,
});

type Log = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
};

const ENTITY_OPTIONS = ["all", "departments", "user_roles", "profiles", "checklist_templates", "establishments", "inspections", "auth.users"];
const ACTION_OPTIONS = ["all", "INSERT", "UPDATE", "DELETE", "CUSTOM"];

function actionColor(a: string) {
  if (a === "INSERT") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (a === "UPDATE") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (a === "DELETE") return "bg-destructive/15 text-destructive";
  return "bg-muted text-muted-foreground";
}

function AuditPage() {
  const listFn = useServerFn(listAuditLogs);
  const [entity, setEntity] = useState<string>("all");
  const [action, setAction] = useState<string>("all");

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", entity, action],
    queryFn: () =>
      listFn({
        data: {
          entity_type: entity === "all" ? undefined : entity,
          action: action === "all" ? undefined : action,
          limit: 300,
        },
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit &amp; System Logs</h1>
          <p className="text-sm text-muted-foreground">
            Immutable log of platform activity. Read-only for administrators.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e === "all" ? "All entities" : e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">When</TableHead>
              <TableHead className="w-24">Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-16 text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>)}
            {!isLoading && (rows as Log[]).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No log entries.</TableCell></TableRow>
            )}
            {(rows as Log[]).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell><Badge className={actionColor(r.action)} variant="secondary">{r.action}</Badge></TableCell>
                <TableCell>
                  <div className="font-medium">{r.entity_type}</div>
                  {r.entity_id && <code className="text-[10px] text-muted-foreground">{r.entity_id.slice(0, 8)}…</code>}
                </TableCell>
                <TableCell className="text-xs">{r.actor_email ?? <span className="text-muted-foreground">system</span>}</TableCell>
                <TableCell className="text-sm">{r.summary ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader><DialogTitle>Log #{r.id}</DialogTitle></DialogHeader>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-medium text-muted-foreground">Old</div>
                          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-2 text-[10px]">{JSON.stringify(r.old_data, null, 2) ?? "null"}</pre>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-medium text-muted-foreground">New</div>
                          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-2 text-[10px]">{JSON.stringify(r.new_data, null, 2) ?? "null"}</pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
