import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminCount, bootstrapFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Home, ArrowRight, Lock, Mail, User, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — NIRIKSHA" }] }),
  component: AuthPage,
});


/** Fetch the primary role for a signed-in user from user_roles table. */
async function getUserRole(
  userId: string
): Promise<"admin" | "inspector" | "supervisor" | null> {
  console.log("[AUTH] getUserRole called for userId:", userId);

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("[AUTH] user_roles query result — data:", data, "| error:", error);

  if (error) {
    console.warn("[AUTH] user_roles query error:", error.message, "| code:", error.code);
  }
  if (!data) {
    console.warn("[AUTH] No role row found for userId:", userId, "— defaulting to null");
  }

  const role = (data?.role ?? null) as "admin" | "inspector" | "supervisor" | null;
  console.log("[AUTH] Resolved role:", role);
  return role;
}

function dashboardPath(
  role: "admin" | "inspector" | "supervisor" | null
): string {
  if (role === "supervisor") return "/supervisor";
  if (role === "inspector") return "/inspector";
  // null role falls through to /admin — potential silent failure point
  console.log("[AUTH] dashboardPath called with role:", role, "→ resolving to:", role === null ? "/admin (FALLBACK — role was null!)" : "/admin");
  return "/admin";
}

async function redirectAfterLogin(navigate: any, userId: string) {
  console.log("[AUTH] redirectAfterLogin — userId:", userId);
  const role = await getUserRole(userId);
  const path = dashboardPath(role);
  console.log("[AUTH] Redirect decision — role:", role, "| path:", path);
  navigate({ to: path });
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
  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      console.log("[AUTH] Already signed in on mount — userId:", data.user.id, "| email:", data.user.email);
      redirectAfterLogin(navigate, data.user.id);
    } else {
      console.log("[AUTH] No active session on mount — showing login form");
    }
  });
}, [navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <aside className="relative hidden w-[520px] shrink-0 overflow-hidden bg-primary lg:flex lg:flex-col">
        {/* Decorative grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }} />
        </div>

        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-secondary/40 blur-[120px]" />
          <div className="absolute -bottom-48 -right-24 h-[450px] w-[450px] rounded-full bg-accent/25 blur-[120px]" />
          <div className="absolute top-1/4 left-1/3 h-[300px] w-[300px] rounded-full border border-white/[0.06]" />
          <div className="absolute top-1/4 left-1/3 h-[450px] w-[450px] -translate-x-1/4 rounded-full border border-white/[0.04]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex min-h-full flex-col">
          {/* Logo area */}
          <div className="px-10 pt-10">
            <div className="inline-flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/[0.08]">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-white">NIRIKSHA</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Pragati Admin Console</div>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="flex flex-1 items-center px-10">
            <div className="max-w-sm">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Secure Government Portal
              </div>
              <h1 className="mt-4 text-[32px] font-semibold leading-tight tracking-tight text-white">
                Government inspections,<br />reimagined with&nbsp;AI.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Sign in to configure departments, assign inspections, and monitor the
                full compliance lifecycle across every field team.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="px-10 pb-10">
            <div className="inline-flex gap-3">
              {[
                { k: "Modules", v: "4" },
                { k: "Departments", v: "5+" },
                { k: "Auditability", v: "100%" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 backdrop-blur-sm">
                  <div className="text-xl font-semibold tracking-tight text-white tabular-nums">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">{s.k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-10 py-4">
            <div className="flex items-center justify-between text-[11px] text-white/40">
              <span>© {new Date().getFullYear()} NIRIKSHA · Restricted access</span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-1 items-center justify-center px-8 py-12">
        {/* Home button */}
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
          aria-label="Back to landing page"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">NIRIKSHA</div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Admin Console</div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground lg:flex">
            <span>NIRIKSHA</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Sign in</span>
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
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

setLoading(false);

if (error) {
  console.error("[AUTH] signInWithPassword error:", error.message);
  toast.error(error.message);
  return;
}

console.log("[AUTH] signInWithPassword succeeded");
console.log("[AUTH] Authenticated user id:", data.user?.id ?? "(none)");
console.log("[AUTH] User email:", data.user?.email ?? "(none)");

toast.success("Signed in");

if (data.user) {
  console.log("[AUTH] Calling redirectAfterLogin for user:", data.user.id);
  redirectAfterLogin(navigate, data.user.id);
} else {
  console.warn("[AUTH] data.user is null after signInWithPassword — falling back to /admin");
  navigate({ to: "/admin" });
}
  }

  return (
    <div className="mt-6 lg:mt-8">
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Sign in with your administrator credentials to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email address
              </Label>
              <div className="relative">
                <FieldIcon><Mail className="h-4 w-4" /></FieldIcon>
                <Input
                  id="email" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@niriksha.gov.in"
                  className="h-11 rounded-xl border-border/60 bg-background pl-9 text-sm shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <FieldIcon><Lock className="h-4 w-4" /></FieldIcon>
                <Input
                  id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 rounded-xl border-border/60 bg-background pl-9 text-sm shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="group h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign in
              {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">Protected portal</span>
              </div>
            </div>

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Access is logged and audited. Unauthorized access is prohibited.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Trust indicators */}
      <div className="mt-6 flex items-center justify-center gap-6 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-emerald-500/60" />
          Encrypted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-emerald-500/60" />
          Audited
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-emerald-500/60" />
          Gov Grade
        </span>
      </div>
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
    <div className="mt-6 lg:mt-8">
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create first administrator</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              No administrator exists yet. Set one up to begin.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="b-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full name</Label>
              <div className="relative">
                <FieldIcon><User className="h-4 w-4" /></FieldIcon>
                <Input
                  id="b-name" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="h-11 rounded-xl border-border/60 bg-background pl-9 text-sm shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
              <div className="relative">
                <FieldIcon><Mail className="h-4 w-4" /></FieldIcon>
                <Input
                  id="b-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@niriksha.gov.in"
                  className="h-11 rounded-xl border-border/60 bg-background pl-9 text-sm shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password (min 8)</Label>
              <div className="relative">
                <FieldIcon><Lock className="h-4 w-4" /></FieldIcon>
                <Input
                  id="b-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-11 rounded-xl border-border/60 bg-background pl-9 text-sm shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create administrator
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}