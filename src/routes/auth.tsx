import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminCount, bootstrapFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Home, ArrowRight, Lock, Mail, User } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — NIRIKSHA Admin" }] }),
  component: AuthPage,
});

/** Fetch the primary role for a signed-in user from user_roles table. */
async function getUserRole(userId: string): Promise<"admin" | "inspector" | "supervisor" | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as "admin" | "inspector" | "supervisor";
}

/** Return the correct dashboard path for a given role. */
function dashboardPath(role: "admin" | "inspector" | "supervisor" | null): string {
  if (role === "supervisor") return "/supervisor";
  if (role === "inspector") return "/inspector";
  return "/admin"; // default for admin and unknown roles
}

function AuthPage() {
  const navigate = useNavigate();
  const adminCountFn = useServerFn(getAdminCount);
  const bootstrapFn = useServerFn(bootstrapFirstAdmin);
  const { data: countData, refetch } = useQuery({
    queryKey: ["admin_count"],
    queryFn: () => adminCountFn(),
  });
  const needsBootstrap = countData?.count === 0;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const role = await getUserRole(data.user.id);
      navigate({ to: dashboardPath(role) });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-secondary/60 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full border border-white/10" />
          <div className="absolute top-1/3 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full border border-white/5" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">NIRIKSHA</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Pragati Admin Console</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Government inspections,<br />reimagined with explainable AI.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Sign in to configure departments, assign inspections, and monitor the
            full compliance lifecycle across every field team.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { k: "Modules", v: "4" },
              { k: "Departments", v: "5+" },
              { k: "Auditability", v: "100%" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <div className="text-xl font-semibold tabular-nums">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/60">{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-white/50">
          © {new Date().getFullYear()} NIRIKSHA · Restricted access
        </div>
      </aside>

      {/* Form side */}
      <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
        {/* Home button */}
        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
          aria-label="Back to landing page"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-base font-semibold">NIRIKSHA</div>
            </div>
          </div>

          {needsBootstrap ? (
            <BootstrapCard onDone={() => refetch()} bootstrapFn={bootstrapFn} />
          ) : (
            <SignInCard />
          )}
        </div>
      </main>
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
      {children}
    </div>
  );
}

function SignInCard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Look up the user's role to determine which dashboard to open
    try {
      const role = await getUserRole(signInData.user.id);
      toast.success("Signed in");
      navigate({ to: dashboardPath(role) });
    } catch {
      // Role lookup failed — still signed in, fall back to admin dashboard
      toast.success("Signed in");
      navigate({ to: "/admin" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your administrator credentials to continue.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
          <div className="relative">
            <FieldIcon><Mail className="h-4 w-4" /></FieldIcon>
            <Input
              id="email" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@niriksha.gov.in"
              className="h-11 rounded-lg pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</Label>
          <div className="relative">
            <FieldIcon><Lock className="h-4 w-4" /></FieldIcon>
            <Input
              id="password" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-lg pl-9"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="group h-11 w-full rounded-lg text-sm font-semibold">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
          {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Protected portal. Access is logged and audited.
        </p>
      </form>
    </div>
  );
}

function BootstrapCard({ onDone, bootstrapFn }: { onDone: () => void; bootstrapFn: any }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await bootstrapFn({ data: { name, email, password } });
      toast.success("Administrator created. You can sign in now.");
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create administrator");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create first administrator</h2>
        <p className="mt-1 text-sm text-muted-foreground">No administrator exists yet. Set one up to begin.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full name</Label>
          <div className="relative">
            <FieldIcon><User className="h-4 w-4" /></FieldIcon>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-lg pl-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
          <div className="relative">
            <FieldIcon><Mail className="h-4 w-4" /></FieldIcon>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-lg pl-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password (min 8)</Label>
          <div className="relative">
            <FieldIcon><Lock className="h-4 w-4" /></FieldIcon>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-lg pl-9" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg text-sm font-semibold">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create administrator
        </Button>
      </form>
    </div>
  );
}
