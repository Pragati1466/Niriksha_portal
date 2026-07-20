import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSystemSettings, updateSystemSetting } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "System Configuration — NIRIKSHA Admin" }] }),
  component: SettingsPage,
});

type Setting = {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
};

const LABELS: Record<string, string> = {
  ai: "AI Integration",
  storage: "Storage",
  auth: "Authentication Policy",
  notifications: "Notifications",
};

function SettingsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSystemSettings);
  const updateFn = useServerFn(updateSystemSetting);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: () => listFn(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">System Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide settings. Values are JSON; edit carefully.
        </p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {(rows as Setting[]).map((s) => (
          <SettingCard
            key={s.key}
            setting={s}
            onSave={async (v) => {
              await updateFn({ data: { key: s.key, value: v } });
              qc.invalidateQueries({ queryKey: ["system-settings"] });
              toast.success(`${LABELS[s.key] ?? s.key} saved`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SettingCard({ setting, onSave }: { setting: Setting; onSave: (v: unknown) => Promise<void> }) {
  const [text, setText] = useState(() => JSON.stringify(setting.value, null, 2));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(setting.value, null, 2));
  }, [setting.value]);

  const save = useMutation({
    mutationFn: async () => {
      let parsed: unknown;
      try { parsed = JSON.parse(text); }
      catch (e: any) { throw new Error(`Invalid JSON: ${e.message}`); }
      await onSave(parsed);
    },
    onError: (e: any) => { setErr(e.message); toast.error(e.message); },
    onSuccess: () => setErr(null),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{LABELS[setting.key] ?? setting.key}</span>
          <code className="text-[10px] font-normal text-muted-foreground">{setting.key}</code>
        </CardTitle>
        {setting.description && <CardDescription>{setting.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={10}
          className="font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {err && <div className="text-xs text-destructive">{err}</div>}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Updated {new Date(setting.updated_at).toLocaleString()}
          </span>
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
