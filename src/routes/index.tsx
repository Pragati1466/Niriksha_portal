import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  ArrowRight,
  ClipboardCheck,
  Camera,
  Brain,
  FileText,
  UserCheck,
  Lock,
  Database,
  Layers,
  GitBranch,
  Fingerprint,
  Building2,
  Flame,
  HeartPulse,
  Factory,
  Wind,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIRIKSHA — Explainable Agentic AI for Government Inspections" },
      {
        name: "description",
        content:
          "NIRIKSHA digitizes the end-to-end inspection lifecycle for regulatory departments — assignment, field inspection, evidence verification, AI-assisted risk analysis, and supervisory review.",
      },
      { property: "og:title", content: "NIRIKSHA — Explainable Agentic AI for Government Inspections" },
      {
        property: "og:description",
        content:
          "Unified inspection workflow across Food Safety, Fire, Healthcare, Factory Safety and Pollution Control — with explainable AI decision support and full traceability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <Workflow />
        <AgenticAI />
        <MultiDepartment />
        <Explainability />
        <Traceability />
        <Architecture />
        <Security />
        <Differentiators />
        <LoginNote />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Header ---------- */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.18em]">NIRIKSHA</div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
              Government Inspection Intelligence
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-xs uppercase tracking-wider opacity-90 md:flex">
          <a href="#problem" className="hover:opacity-100">Problem</a>
          <a href="#workflow" className="hover:opacity-100">Workflow</a>
          <a href="#agents" className="hover:opacity-100">AI Agents</a>
          <a href="#architecture" className="hover:opacity-100">Architecture</a>
        </nav>
        <Link
          to="/auth"
          className="rounded-md bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-accent-foreground hover:opacity-90"
        >
          Government Login
        </Link>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Regulatory Technology · Agentic AI
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Modernizing Government Inspections with{" "}
            <span className="text-primary">Explainable Agentic AI</span>.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            NIRIKSHA digitizes the complete inspection lifecycle — from assignment and field
            inspection to AI-assisted risk analysis, evidence verification, report generation, and
            supervisory review.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-secondary"
            >
              Explore Platform <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              View Workflow
            </a>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Government Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Problem / Solution ---------- */

function ProblemSolution() {
  const rows: [string, string][] = [
    ["Paper-based inspection reports", "Digital inspection workflow"],
    ["Manual prioritization", "AI-assisted risk prioritization"],
    ["Separate departmental systems", "Unified inspection platform"],
    ["Manual report writing", "AI-generated structured reports"],
    ["Difficult evidence verification", "AI-assisted evidence consistency checks"],
  ];
  return (
    <section id="problem" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>02 · The Problem We Solve</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Why does NIRIKSHA exist?
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Regulatory inspections across departments still depend on paper, spreadsheets and
          disconnected systems. NIRIKSHA replaces that with a single, auditable digital workflow.
        </p>

        <div className="mt-10 overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-2 border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <div className="p-4">Current Inspection Process</div>
            <div className="border-l border-border p-4 text-primary">With NIRIKSHA</div>
          </div>
          {rows.map(([a, b], i) => (
            <div
              key={i}
              className={`grid grid-cols-2 text-sm ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="p-4 text-muted-foreground line-through decoration-destructive/60">
                {a}
              </div>
              <div className="border-l border-border p-4 font-medium text-foreground">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Workflow ---------- */

function Workflow() {
  const steps = [
    { title: "System Configuration", desc: "Admin sets up departments, checklists, users, and inspection scopes." },
    { title: "Inspection Assignment", desc: "Assignments dispatched to inspectors and supervisors with jurisdiction match." },
    { title: "Field Inspection", desc: "Inspector executes the digital checklist on site." },
    { title: "Evidence Collection", desc: "Photographs, documents, and structured findings uploaded from the field." },
    { title: "AI Analysis", desc: "Risk scoring, evidence verification, and report drafting by agents." },
    { title: "Supervisor Review", desc: "Supervisor validates findings, evidence, and AI recommendations." },
    { title: "Inspection Closure", desc: "Final report stored, audit trail sealed, actions dispatched." },
  ];
  return (
    <section id="workflow" className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>03 · Platform Workflow</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          The inspection lifecycle, end to end.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          NIRIKSHA is structured around business responsibilities, not UI screens. Every inspection
          moves through a fixed sequence of states — each one recorded and auditable.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex gap-4 rounded-lg border border-border bg-background p-5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold tabular-nums text-primary-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {s.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Agentic AI ---------- */

function AgenticAI() {
  const agents = [
    {
      icon: Brain,
      name: "Risk Prioritization Agent",
      responsibility: "Identifies establishments requiring urgent attention.",
      input: "Complaints + Inspection History + Compliance Data",
      output: "Risk Score with contributing factors",
    },
    {
      icon: Camera,
      name: "Evidence Verification Agent",
      responsibility: "Checks whether uploaded evidence supports inspector findings.",
      input: "Findings + Images + Compliance Data",
      output: "Verification Summary with flagged inconsistencies",
    },
    {
      icon: FileText,
      name: "Report Generation Agent",
      responsibility: "Converts structured inspection data into regulatory reports.",
      input: "Inspection Record + AI Analysis",
      output: "Structured Inspection Report",
    },
  ];

  return (
    <section id="agents" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>04 · Why Agentic AI</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Three agents. Clear responsibilities.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          NIRIKSHA uses agents where a human alone cannot keep pace with the data — but never in
          place of the officer's judgement. Each agent has a defined input, output and boundary.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {agents.map((a) => (
            <div key={a.name} className="rounded-lg border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <a.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-semibold uppercase tracking-wider">{a.name}</div>
              <p className="mt-2 text-sm text-muted-foreground">{a.responsibility}</p>
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Input
                  </dt>
                  <dd className="mt-0.5 text-foreground">{a.input}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-muted-foreground">
                    Output
                  </dt>
                  <dd className="mt-0.5 text-foreground">{a.output}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Multi-Department ---------- */

function MultiDepartment() {
  const depts = [
    { icon: ClipboardCheck, name: "Food Safety" },
    { icon: Flame, name: "Fire Safety" },
    { icon: HeartPulse, name: "Healthcare" },
    { icon: Factory, name: "Factory Safety" },
    { icon: Wind, name: "Pollution Control" },
  ];
  const shared = ["Shared AI Engine", "Shared Inspection Workflow", "Shared Reporting"];
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>05 · Multi-Department Architecture</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          One platform. Every regulator.
        </h2>

        <div className="mt-10 rounded-lg border border-border bg-background p-8">
          <div className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            NIRIKSHA
          </div>
          <div className="my-6 h-px w-full bg-border" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {depts.map((d) => (
              <div
                key={d.name}
                className="flex flex-col items-center gap-2 rounded-md border border-border bg-card p-4 text-center"
              >
                <d.icon className="h-5 w-5 text-primary" />
                <div className="text-xs font-medium">{d.name}</div>
              </div>
            ))}
          </div>
          <div className="my-6 h-px w-full bg-border" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {shared.map((s) => (
              <div
                key={s}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Explainability ---------- */

function Explainability() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div>
            <SectionLabel>06 · Explainable Decision Support</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Every recommendation carries its reasoning.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every AI recommendation generated by NIRIKSHA is accompanied by an explanation
              describing the factors influencing the decision — no black boxes, no unverifiable
              scores. Officers see <em>why</em>, not just <em>what</em>.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Risk Assessment · Sample</span>
              <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive">HIGH</span>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Risk Level
                </div>
                <div className="mt-1 text-lg font-semibold text-destructive">High</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contributing Factors
                </div>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    <span>12 unresolved complaints in the last 90 days</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    <span>Last inspection overdue by 47 days</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    <span>Compliance score below departmental threshold</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Traceability ---------- */

function Traceability() {
  const steps = [
    "Inspection Created",
    "Assigned",
    "Inspection Started",
    "Evidence Uploaded",
    "AI Risk Generated",
    "Evidence Verified",
    "Report Generated",
    "Supervisor Approved",
    "Inspection Closed",
  ];
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>07 · Inspection Traceability</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Every inspection, auditable end to end.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every state transition is written to the audit log with a timestamp, actor and record
          reference. Nothing is inferred. Nothing is mocked.
        </p>

        <div className="mt-10 overflow-x-auto">
          <ol className="flex min-w-max items-center gap-2">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <div className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-0.5 text-foreground">{s}</div>
                </div>
                {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Architecture ---------- */

function Architecture() {
  const layers = [
    { icon: Database, label: "Database", note: "Departments · Establishments · Inspections · Audit Logs" },
    { icon: ShieldCheck, label: "Admin (Pragati)", note: "Configuration · Assignment · Governance" },
    { icon: ClipboardCheck, label: "Inspector (Darpan)", note: "Field checklist · Evidence capture" },
    { icon: Brain, label: "AI Engine (Netra)", note: "Risk · Evidence · Report generation" },
    { icon: UserCheck, label: "Supervisor (Samiksha)", note: "Review · Approval · Closure" },
    { icon: FileText, label: "Final Inspection Report", note: "Regulator-grade, immutable output" },
  ];
  return (
    <section id="architecture" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>08 · System Architecture</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Simple. Layered. Auditable.
        </h2>

        <div className="mt-10 mx-auto max-w-2xl">
          {layers.map((l, i) => (
            <div key={l.label} className="flex flex-col items-center">
              <div className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <l.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{l.label}</div>
                  <div className="text-xs text-muted-foreground">{l.note}</div>
                </div>
              </div>
              {i < layers.length - 1 && (
                <div className="my-1 h-6 w-px bg-border" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Security ---------- */

function Security() {
  const items = [
    { icon: Lock, label: "Role-Based Access Control" },
    { icon: Layers, label: "Department Isolation" },
    { icon: Fingerprint, label: "Inspection Audit Trail" },
    { icon: ShieldCheck, label: "Secure Authentication" },
    { icon: GitBranch, label: "Centralized Administration" },
  ];
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>09 · Security & Governance</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Built for government trust boundaries.
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-5 text-center"
            >
              <it.icon className="h-5 w-5 text-primary" />
              <div className="text-xs font-medium">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Differentiators ---------- */

function Differentiators() {
  const rows: [string, string][] = [
    ["Single inspection workflow across departments", "Standardizes regulatory processes"],
    ["Explainable AI recommendations", "Improves transparency in government decisions"],
    ["Evidence verification", "Supports higher-quality inspection reviews"],
    ["Digital reports", "Reduces manual documentation effort"],
    ["Modular architecture", "Easily extensible to additional departments"],
  ];
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>10 · What Makes NIRIKSHA Different</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Capability, not marketing.
        </h2>

        <div className="mt-10 overflow-hidden rounded-lg border border-border bg-card">
          <div className="grid grid-cols-[1.2fr_1fr] border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <div className="p-4">Capability</div>
            <div className="border-l border-border p-4">Why It Matters</div>
          </div>
          {rows.map(([a, b], i) => (
            <div
              key={i}
              className={`grid grid-cols-[1.2fr_1fr] text-sm ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="p-4 font-medium">{a}</div>
              <div className="border-l border-border p-4 text-muted-foreground">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Login Note ---------- */

function LoginNote() {
  return (
    <section className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
            11 · Unified Government Login
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            One credential. Role resolved automatically.
          </h2>
          <p className="mt-3 max-w-xl text-sm opacity-85">
            Officers sign in with their government-issued credential. NIRIKSHA retrieves the role
            from the identity record and routes to the correct workspace — no role selector, no
            client-side privilege choice.
          </p>
        </div>
        <div className="rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 p-6">
          <ol className="space-y-2 text-sm">
            {["Employee ID", "Password", "Authenticate", "Role Retrieved", "Redirect Automatically"].map(
              (s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded bg-accent text-[10px] font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ),
            )}
          </ol>
          <Link
            to="/auth"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Government Login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>© NIRIKSHA · Government Inspection Intelligence Platform</div>
        <div className="flex items-center gap-4">
          <span>Pragati · Darpan · Samiksha · Netra</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Utility ---------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
      {children}
    </div>
  );
}
