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
  ChevronRight,
  Search,
  Menu,
  X,
  BarChart3,
  MapPin,
  Clock,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Users,
  TrendingUp,
  Download,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIRIKSHA — Government Inspection Intelligence Platform" },
      {
        name: "description",
        content:
          "NIRIKSHA digitizes the end-to-end inspection lifecycle for regulatory departments — assignment, field inspection, evidence verification, AI-assisted risk analysis, and supervisory review.",
      },
      { property: "og:title", content: "NIRIKSHA — Government Inspection Intelligence" },
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

/* ===================================================================
   Landing Page — NIRIKSHA
   GovTech Design System: Institutional · Enterprise · Data-Centric
   =================================================================== */

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <UtilityBar />
      <Navigation />
      <main>
        <HeroSection />
        <StatsBar />
        <QuickAccess />
        <WorkflowSection />
        <AgenticAISection />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Utility Bar ---------- */

function UtilityBar() {
  return (
    <div className="hidden border-b border-border/60 bg-primary/95 text-primary-foreground md:block">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-4 text-[11px] font-medium text-primary-foreground/70">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            All systems operational
          </span>
          <span className="text-primary-foreground/20">|</span>
          <span>Government of India</span>
        </div>
        <div />
      </div>
    </div>
  );
}

/* ---------- Navigation ---------- */

function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#platform", label: "Platform" },
    { href: "#workflow", label: "Workflow" },
    { href: "#agents", label: "AI Agents" },
    { href: "#departments", label: "Departments" },
    { href: "#architecture", label: "Architecture" },
    { href: "#resources", label: "Resources" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 overflow-hidden rounded-lg">
              <img src="/logo.png" alt="NIRIKSHA" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-foreground">NIRIKSHA</div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Government Inspection Intelligence
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button className="hidden rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            Search
            <kbd className="rounded border border-border/40 bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
          </button>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          >
            Sign In
            <ArrowRight className="h-3 w-3" />
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-white px-6 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 border-t border-border/40 pt-2">
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                Sign In to Admin Console
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ---------- Hero Section ---------- */

function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/95">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <div className="h-full w-full" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
      </div>

      {/* Glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-secondary/30 blur-[140px]" />
        <div className="absolute -bottom-48 -right-48 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full border border-white/[0.06]" />
        <div className="absolute top-1/3 right-1/4 h-[450px] w-[450px] -translate-x-1/3 -translate-y-1/4 rounded-full border border-white/[0.04]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          {/* Left column */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Regulatory Technology · Agentic AI
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              Modernizing Government{" "}
              <span className="text-accent">Inspections</span> with{" "}
              <span className="text-accent">Explainable AI</span>.
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/65 md:text-base">
              NIRIKSHA digitizes the complete inspection lifecycle — from assignment and field
              inspection to AI-assisted risk analysis, evidence verification, report generation, and
              supervisory review — across all regulatory departments.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-xl active:scale-[0.98]"
              >
                Access Platform
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.15] bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/[0.12] active:scale-[0.98]"
              >
                View Workflow
              </a>
              <a
                href="#departments"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-6 py-3 text-sm font-medium text-white/60 backdrop-blur-sm transition-all hover:border-white/[0.2] hover:text-white"
              >
                Departments
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-6 border-t border-white/[0.08] pt-6">
              {[
                { label: "Gov Grade Security", icon: Lock },
                { label: "Full Audit Trail", icon: Fingerprint },
                { label: "Multi-Dept", icon: Building2 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-accent/70" />
                  <span className="text-[11px] font-medium text-white/50">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — Dashboard preview card */}
          <div className="hidden md:block">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] p-1 backdrop-blur-sm">
              <div className="rounded-xl bg-white/95 p-5 shadow-2xl">
                {/* Card header */}
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Inspection Dashboard</div>
                      <div className="text-[9px] text-muted-foreground">Live · Updated in real-time</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600">Live</span>
                  </div>
                </div>

                {/* KPI row */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "Active Inspections", value: "247", trend: "+12%", icon: Activity },
                    { label: "Officers Deployed", value: "89", trend: "+4", icon: Users },
                    { label: "Compliance Rate", value: "94.2%", trend: "+2.1%", icon: TrendingUp },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border border-border/40 bg-muted/30 p-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                        <kpi.icon className="h-3 w-3 text-primary" />
                        {kpi.label}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-bold tabular-nums text-foreground">{kpi.value}</span>
                        <span className="text-[10px] font-semibold text-emerald-600">{kpi.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table preview */}
                <div className="space-y-1.5">
                  {[
                    { dept: "Food Safety", location: "Sector 14, Gandhinagar", status: "In Progress", priority: "High", risk: "78" },
                    { dept: "Fire Safety", location: "Industrial Zone B", status: "Assigned", priority: "Critical", risk: "92" },
                    { dept: "Healthcare", location: "District Hospital", status: "Review", priority: "Medium", risk: "45" },
                    { dept: "Pollution Control", location: "Riverbed Zone 3", status: "Completed", priority: "Low", risk: "22" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-border/20 bg-background px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          row.priority === "Critical" ? "bg-destructive" :
                          row.priority === "High" ? "bg-orange-500" :
                          row.priority === "Medium" ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                        <span className="text-xs font-medium text-foreground">{row.dept}</span>
                        <span className="text-[10px] text-muted-foreground">{row.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          row.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                          row.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                          row.status === "Review" ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {row.status}
                        </span>
                        <span className={`text-[11px] font-semibold tabular-nums ${
                          parseInt(row.risk) >= 80 ? "text-destructive" :
                          parseInt(row.risk) >= 50 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {row.risk}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats Bar ---------- */

function StatsBar() {
  const stats = [
    { value: "500+", label: "Inspections Monthly", icon: ClipboardCheck },
    { value: "5+", label: "Regulatory Departments", icon: Building2 },
    { value: "99.9%", label: "Audit Traceability", icon: Fingerprint },
    { value: "24/7", label: "Platform Availability", icon: Clock },
  ];

  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-6 py-5 md:py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-base font-bold tabular-nums text-foreground md:text-lg">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground md:text-xs">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Quick Access ---------- */

function QuickAccess() {
  const services = [
    {
      icon: ClipboardCheck,
      label: "Inspection Dashboard",
      desc: "Real-time monitoring of all active inspections with live status updates, priority alerts, and department-wide compliance overview.",
      accent: "border-blue-200 bg-blue-50 text-blue-700",
      iconColor: "text-blue-600",
      lightBg: "bg-blue-50/50",
      pattern: "M0 40 L20 20 L40 40 L60 20 L80 40",
      href: "#workflow",
    },
    {
      icon: BarChart3,
      label: "Risk Analytics",
      desc: "AI-powered risk scoring engine that analyzes complaints, inspection history, and compliance data to prioritize high-risk establishments.",
      accent: "border-indigo-200 bg-indigo-50 text-indigo-700",
      iconColor: "text-indigo-600",
      lightBg: "bg-indigo-50/50",
      pattern: "M0 20 L15 40 L30 20 L45 40 L60 20 L75 40 L90 20",
      href: "#agents",
    },
    {
      icon: MapPin,
      label: "GIS Mapping",
      desc: "Geographic visualization of inspection zones, establishment locations, and field team deployment across regulatory jurisdictions.",
      accent: "border-teal-200 bg-teal-50 text-teal-700",
      iconColor: "text-teal-600",
      lightBg: "bg-teal-50/50",
      pattern: "M10 50 L30 10 L50 50 L70 10 L90 50",
      href: "#departments",
    },
    {
      icon: FileCheck,
      label: "Report Generation",
      desc: "Automated generation of regulatory-grade inspection reports with structured findings, evidence references, and AI-assisted recommendations.",
      accent: "border-sky-200 bg-sky-50 text-sky-700",
      iconColor: "text-sky-600",
      lightBg: "bg-sky-50/50",
      pattern: "M5 35 L20 10 L35 35 L50 10 L65 35 L80 10 L95 35",
      href: "#agents",
    },
    {
      icon: Database,
      label: "Compliance Data",
      desc: "Centralized repository for all inspection evidence, documents, photographs, and compliance records with advanced search and retrieval.",
      accent: "border-slate-200 bg-slate-50 text-slate-700",
      iconColor: "text-slate-600",
      lightBg: "bg-slate-50/50",
      pattern: "M5 50 L15 20 L25 50 L35 20 L45 50 L55 20 L65 50 L75 20 L85 50 L95 20",
      href: "#architecture",
    },
    {
      icon: UserCheck,
      label: "Officer Management",
      desc: "Assign and track inspection teams across departments with workload balancing, jurisdiction matching, and performance monitoring.",
      accent: "border-cyan-200 bg-cyan-50 text-cyan-700",
      iconColor: "text-cyan-600",
      lightBg: "bg-cyan-50/50",
      pattern: "M5 60 L20 30 L35 60 L50 30 L65 60 L80 30 L95 60",
      href: "#platform",
    },
  ];

  return (
    <section id="platform" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            01 · Quick Access
          </div>
          <h2 className="mt-4 text-[32px] font-bold tracking-tight text-[#0B1E3A] md:text-[40px]">
            Platform Overview
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Centralized tools for inspection management, risk analysis, and compliance monitoring across all regulatory departments.
          </p>
        </div>

        {/* 2×3 Premium Card Grid */}
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc, i) => (
              <a
                key={svc.label}
                href={svc.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300/60 hover:-translate-y-0.5"
              >
                {/* Hover gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/0 to-slate-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Isometric geometric illustration */}
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 opacity-[0.04]">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                    <path d={svc.pattern} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-800" />
                    <rect x="60" y="40" width="30" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-slate-600" fill="none" />
                    <circle cx="20" cy="25" r="8" stroke="currentColor" strokeWidth="1.5" className="text-slate-500" fill="none" />
                    <line x1="55" y1="75" x2="85" y2="75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400" />
                  </svg>
                </div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl border ${svc.accent} shadow-sm`}>
                    <svc.icon className={`h-6 w-6 ${svc.iconColor}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-[15px] font-bold text-[#0B1E3A]">{svc.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{svc.desc}</p>

                  {/* Learn more link */}
                  <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5">
                    <span>Learn more</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom trust indicator */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Enterprise-grade security
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Real-time data
            </span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Multi-department
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Workflow ---------- */

function WorkflowSection() {
  const steps = [
    { 
      title: "System Configuration", 
      desc: "Configure departments, inspection templates, digital checklists, user roles, jurisdictions, and inspection scopes before field operations begin.",
      icon: SettingsIcon,
      emoji: "⚙️",
      color: "bg-blue-500",
      lightBg: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
      ringColor: "ring-blue-200",
      position: "top",
    },
    { 
      title: "Inspection Assignment", 
      desc: "Automatically assign inspections to the appropriate inspectors and supervisors based on jurisdiction, department, workload, and inspection priority.",
      icon: SendIcon,
      emoji: "📋",
      color: "bg-indigo-500",
      lightBg: "bg-indigo-50",
      borderColor: "border-indigo-200",
      textColor: "text-indigo-600",
      ringColor: "ring-indigo-200",
      position: "bottom",
    },
    { 
      title: "Field Inspection", 
      desc: "Inspectors conduct on-site inspections using the mobile application while recording checklist responses and compliance observations in real time.",
      icon: MapPin,
      emoji: "📍",
      color: "bg-violet-500",
      lightBg: "bg-violet-50",
      borderColor: "border-violet-200",
      textColor: "text-violet-600",
      ringColor: "ring-violet-200",
      position: "top",
    },
    { 
      title: "Evidence Collection", 
      desc: "Securely upload photographs, videos, documents, GPS coordinates, timestamps, and supporting evidence directly from the inspection site.",
      icon: Camera,
      emoji: "📸",
      color: "bg-amber-500",
      lightBg: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-600",
      ringColor: "ring-amber-200",
      position: "bottom",
    },
    { 
      title: "AI Analysis", 
      desc: "Specialized AI agents verify evidence, detect anomalies, calculate risk scores, validate compliance, and prepare inspection recommendations.",
      icon: Brain,
      emoji: "🤖",
      color: "bg-purple-500",
      lightBg: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-600",
      ringColor: "ring-purple-200",
      position: "top",
    },
    { 
      title: "Supervisor Review", 
      desc: "Supervisors review findings, verify evidence, approve AI recommendations, and request revisions before finalizing the inspection.",
      icon: UserCheck,
      emoji: "🛡",
      color: "bg-rose-500",
      lightBg: "bg-rose-50",
      borderColor: "border-rose-200",
      textColor: "text-rose-600",
      ringColor: "ring-rose-200",
      position: "bottom",
    },
    { 
      title: "Inspection Closure", 
      desc: "Digitally sign the inspection report, archive all records with a complete audit trail, and automatically trigger corrective actions and notifications.",
      icon: CheckCircle2,
      emoji: "✅",
      color: "bg-emerald-500",
      lightBg: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-600",
      ringColor: "ring-emerald-200",
      position: "top",
    },
  ];

  return (
    <section id="workflow" className="relative overflow-hidden bg-white">
      {/* Subtle blueprint grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02]">
        <div className="h-full w-full" style={{
          backgroundImage: `linear-gradient(#2563EB 1px, transparent 1px), linear-gradient(90deg, #2563EB 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            03 · Platform Workflow
          </div>
          <h2 className="mt-4 text-[32px] font-bold tracking-tight text-[#0F172A] md:text-[40px]">
            The Inspection Lifecycle,{" "}
            <span className="text-[#2563EB]">End to End</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-[17px] leading-relaxed text-[#64748B]">
            NIRIKSHA is structured around business responsibilities rather than application screens.
            Every inspection progresses through a predefined, fully auditable workflow where each
            transition is securely recorded, time-stamped, and traceable.
          </p>
        </div>

        {/* Desktop: Alternating Enterprise Timeline */}
        <div className="relative mt-20 hidden md:block">
          {/* Main timeline line - 4px #CBD5E1 */}
          <div className="absolute left-[72px] right-[72px] top-[50px] h-1 bg-[#CBD5E1] rounded-full" />
          {/* Animated progress overlay */}
          <div className="absolute left-[72px] top-[50px] h-1 bg-[#2563EB] rounded-full transition-all duration-1000" style={{ width: 'calc(100% - 144px)' }} />

          <div className="relative grid grid-cols-7 gap-0">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                {/* Content - alternating top/bottom */}
                <div className={`w-full px-1 ${s.position === "top" ? "order-1 mb-0" : "order-3 mt-0"}`}>
                  <div className={`${s.position === "top" ? "mb-5" : "mt-5"}`}>
                    <div className="mx-auto max-w-[220px] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-[#2563EB]/30 hover:-translate-y-0.5">
                      {/* Step badge */}
                      <div className={`inline-flex items-center gap-1.5 rounded-full ${s.lightBg} ${s.textColor} px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider`}>
                        <span>{s.emoji}</span>
                        Step {String(i + 1).padStart(2, "0")}
                      </div>
                      {/* Title */}
                      <div className="mt-3 text-sm font-bold text-[#0F172A] leading-tight flex items-center gap-2">
                        {s.title}
                      </div>
                      {/* Description */}
                      <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                <div className={`order-2 flex flex-col items-center ${s.position === "top" ? "justify-end" : "justify-start"}`}>
                  <div className={`w-0.5 h-4 ${s.lightBg}`} />
                </div>

                {/* Milestone Node - 60px outer, 40px inner */}
                <div className="order-2 relative z-10 flex flex-col items-center">
                  {/* Outer circle 60px */}
                  <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-[#CBD5E1] bg-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-xl hover:border-[#2563EB]/60`}>
                    {/* Inner circle 40px */}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${s.color} shadow-inner ring-2 ring-white/50`}>
                      <s.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  {/* Step number */}
                  <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0F172A] text-[9px] font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* KPI Summary Strip */}
          <div className="mt-16 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {[
                { icon: CheckCircle2, label: "7 Workflow Stages", color: "text-emerald-500", bg: "bg-emerald-50" },
                { icon: GitBranch, label: "End-to-End Digital Lifecycle", color: "text-blue-500", bg: "bg-blue-50" },
                { icon: Brain, label: "AI-Assisted Intelligence", color: "text-purple-500", bg: "bg-purple-50" },
                { icon: Fingerprint, label: "Complete Audit Trail", color: "text-indigo-500", bg: "bg-indigo-50" },
                { icon: Clock, label: "Every Transition Logged", color: "text-amber-500", bg: "bg-amber-50" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} shadow-sm`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="mt-14 md:hidden">
          {/* Vertical connector */}
          <div className="absolute left-[30px] top-0 bottom-0 w-1 bg-[#CBD5E1] rounded-full" />
          
          <div className="relative space-y-6">
            {steps.map((s, i) => (
              <div key={i} className="group relative flex gap-4">
                {/* Node */}
                <div className="relative z-10 flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-2 border-[#CBD5E1] bg-white shadow-md">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${s.color} shadow-inner ring-2 ring-white/50`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F172A] text-[7px] font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-[#2563EB]/20">
                  <div className={`inline-flex items-center gap-1 rounded-full ${s.lightBg} ${s.textColor} px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider`}>
                    <span className="text-[10px]">{s.emoji}</span>
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-2 text-sm font-bold text-[#0F172A]">{s.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Simple inline icons for workflow */
function SettingsIcon() { return <Layers className="h-5 w-5" />; }
function SendIcon() { return <ArrowRight className="h-5 w-5" />; }

/* ---------- Agentic AI ---------- */

function AgenticAISection() {
  const agents = [
    {
      tag: "NETRA",
      name: "Risk Prioritization",
      desc: "Analyzes complaints, history & compliance data to generate risk scores with explainable factors.",
      icon: ShieldCheck,
      accent: "bg-blue-500",
      lightBg: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
      input: "Complaints + History",
      output: "Risk Score + Factors",
    },
    {
      tag: "DARPAN",
      name: "Evidence Verification",
      desc: "Validates uploaded evidence against findings, detects inconsistencies, and flags anomalies.",
      icon: Camera,
      accent: "bg-violet-500",
      lightBg: "bg-violet-50",
      borderColor: "border-violet-200",
      textColor: "text-violet-600",
      input: "Images + Findings",
      output: "Verification Report",
    },
    {
      tag: "LEKHAK",
      name: "Report Generation",
      desc: "Converts structured inspection data and AI analysis into regulatory-grade government reports.",
      icon: FileText,
      accent: "bg-emerald-500",
      lightBg: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-600",
      input: "Inspection Data",
      output: "Regulatory Report",
    },
  ];

  return (
    <section id="agents" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            04 · Why Agentic AI
          </div>
          <h2 className="mt-4 text-[32px] font-bold tracking-tight text-[#0B1E3A] md:text-[40px]">
            Three Specialized <span className="text-primary">AI Agents</span> Working Together
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            NIRIKSHA augments officers with explainable AI agents. Every recommendation remains advisory until explicitly approved by an authorized government officer.
          </p>
        </div>

        {/* Compact Three-Layer Pipeline — Desktop */}
        <div className="relative mt-12 hidden md:block">
          {/* Layer 1: Data Pipeline */}
          <div className="mb-4 text-center">
            <div className="mx-auto inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 shadow-sm">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-[#0B1E3A]">Inspection Data Pipeline</span>
              <span className="text-[10px] text-slate-400">Complaints · Evidence · Checklists · Reports</span>
            </div>
            <div className="flex justify-center py-2">
              <ChevronRight className="h-4 w-4 rotate-90 text-slate-300" />
            </div>
          </div>

          {/* Layer 2: Three Agent Cards in a Row */}
          <div className="grid grid-cols-3 gap-4">
            {agents.map((a, i) => (
              <div key={a.tag} className="group">
                <div className={`rounded-xl border-2 ${a.borderColor} bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden`}>
                  {/* Header */}
                  <div className={`${a.lightBg} px-4 py-3 border-b ${a.borderColor}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.accent} shadow-sm`}>
                        <a.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className={`text-[9px] font-bold tracking-[0.15em] ${a.textColor}`}>{a.tag}</div>
                        <div className="text-xs font-bold text-[#0B1E3A]">{a.name}</div>
                      </div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="px-4 py-3">
                    <p className="text-xs leading-relaxed text-slate-500">{a.desc}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        <span className="text-slate-400">In: {a.input}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${a.accent}`} />
                        <span className={`${a.textColor} font-medium`}>Out: {a.output}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Arrow between cards */}
                {i < agents.length - 1 && (
                  <div className="hidden xl:flex justify-center -mt-1">
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Layer 3: Human Approval + Final Decision */}
          <div className="mt-4 text-center">
            <div className="flex justify-center py-2">
              <ChevronRight className="h-4 w-4 rotate-90 text-slate-300" />
            </div>
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 px-5 py-3 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 shadow-sm">
                  <UserCheck className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700">Human-in-the-Loop</span>
                    <span className="text-xs font-medium text-[#0B1E3A]">Officer Review</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">AI recommendations are advisory. Approve · Reject · Modify.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {["✓", "✗", "✎"].map((action) => (
                    <span key={action} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm">{action}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg border-2 border-primary/20 bg-primary/[0.04] px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold text-[#0B1E3A]">Final Decision</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom metrics */}
          <div className="mt-5 text-center">
            <div className="inline-flex items-center gap-4 rounded-full border border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5"><Brain className="h-3 w-3 text-primary" /> 3 AI Agents</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-emerald-500" /> Real-Time Intelligence</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5"><UserCheck className="h-3 w-3 text-amber-500" /> Human-in-the-Loop</span>
            </div>
          </div>
        </div>

        {/* Mobile version */}
        <div className="mt-10 md:hidden">
          <div className="space-y-3">
            {agents.map((a) => (
              <div key={a.tag} className={`rounded-xl border-2 ${a.borderColor} bg-white shadow-sm overflow-hidden`}>
                <div className={`${a.lightBg} px-4 py-2.5 border-b ${a.borderColor}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.accent} shadow-sm`}>
                      <a.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className={`text-[8px] font-bold tracking-[0.15em] ${a.textColor}`}>{a.tag}</div>
                      <div className="text-xs font-bold text-[#0B1E3A]">{a.name}</div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2.5">
                  <p className="text-xs text-slate-500">{a.desc}</p>
                  <div className="mt-2 flex items-center justify-between text-[9px]">
                    <span className="text-slate-400">In: {a.input}</span>
                    <span className={`${a.textColor} font-medium`}>Out: {a.output}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 p-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-[#0B1E3A]">Human-in-the-Loop · All AI outputs are advisory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Modal ---------- */

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 ring-1 ring-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-[#0B1E3A]">{title}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-slate-300 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Content */}
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- Documentation Content ---------- */

function DocumentationContent() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-bold text-[#0B1E3A]">Platform Overview</h4>
        <p className="text-sm leading-relaxed text-slate-600">
          NIRIKSHA is a comprehensive government inspection intelligence platform that digitizes the end-to-end inspection lifecycle for regulatory departments. The platform leverages explainable AI agents to assist officers in risk prioritization, evidence verification, and report generation while maintaining complete human oversight.
        </p>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold text-[#0B1E3A]">Getting Started</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span><strong>Administrator Setup</strong> — Configure departments, inspection templates, user roles, and jurisdiction rules.</span></li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span><strong>Inspector Onboarding</strong> — Deploy the mobile inspection application to field teams with digital checklists.</span></li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span><strong>AI Configuration</strong> — Configure risk thresholds, evidence verification rules, and report templates.</span></li>
        </ul>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold text-[#0B1E3A]">Key Features</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>Multi-department inspection workflow management</span></li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>AI-powered risk scoring with explainable factors</span></li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>Automated evidence verification and anomaly detection</span></li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>Regulatory-grade report generation</span></li>
          <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>End-to-end audit trail with full traceability</span></li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Department Content ---------- */

const departmentContent = {
  "Food Safety": {
    title: "Food Safety Inspection",
    description: "NIRIKSHA provides a comprehensive digital inspection workflow for Food Safety regulatory departments. The platform enables inspectors to conduct thorough food establishment inspections, track compliance with food safety standards, and generate regulatory-grade reports with AI-assisted analysis.",
    workflows: [
      "Schedule and conduct unannounced food safety inspections",
      "Digital checklists aligned with FSSAI and state food safety regulations",
      "Photographic evidence capture with automatic geo-tagging",
      "Temperature and storage condition verification",
      "HACCP compliance tracking and audit trails",
    ],
    metrics: ["Covered Establishments", "Monthly Inspections", "Compliance Rate", "Avg. Report Time"],
    metricsValues: ["12,500+", "1,200+", "87.3%", "2.4 hrs"],
  },
  "Fire Safety": {
    title: "Fire Safety Inspection",
    description: "NIRIKSHA digitizes fire safety compliance inspections for commercial, industrial, and residential establishments. The platform helps fire departments conduct systematic inspections, identify violations, and ensure timely corrective actions.",
    workflows: [
      "Fire NOC verification and renewal tracking",
      "Equipment and extinguisher compliance checks",
      "Emergency exit and evacuation plan verification",
      "Electrical safety and fire load assessment",
      "Fire drill and training compliance monitoring",
    ],
    metrics: ["Covered Establishments", "Monthly Inspections", "Compliance Rate", "Avg. Report Time"],
    metricsValues: ["8,700+", "850+", "82.1%", "3.1 hrs"],
  },
  "Healthcare": {
    title: "Healthcare Inspection",
    description: "NIRIKSHA enables healthcare regulatory authorities to inspect hospitals, clinics, diagnostic centers, and pharmacies with digital precision. The platform ensures compliance with clinical standards, infection control protocols, and patient safety requirements.",
    workflows: [
      "Hospital licensing and accreditation verification",
      "Infection control and sterilization protocol audits",
      "Pharmacy drug storage and dispensing compliance",
      "Medical equipment calibration and maintenance checks",
      "Patient safety and clinical standards assessment",
    ],
    metrics: ["Covered Facilities", "Monthly Inspections", "Compliance Rate", "Avg. Report Time"],
    metricsValues: ["6,300+", "720+", "90.5%", "2.8 hrs"],
  },
  "Factory Safety": {
    title: "Factory Safety Inspection",
    description: "NIRIKSHA provides industrial safety inspectors with a comprehensive digital platform for factory compliance inspections. The system covers occupational safety, machinery safety, worker welfare, and environmental health standards.",
    workflows: [
      "Factory Act compliance and registration verification",
      "Machinery safety and guarding inspections",
      "Worker safety equipment and training verification",
      "Hazardous material storage and handling audits",
      "Welfare facility compliance (canteen, restrooms, first aid)",
    ],
    metrics: ["Covered Factories", "Monthly Inspections", "Compliance Rate", "Avg. Report Time"],
    metricsValues: ["4,200+", "560+", "78.9%", "3.5 hrs"],
  },
  "Pollution Control": {
    title: "Pollution Control Inspection",
    description: "NIRIKSHA empowers pollution control boards to monitor and enforce environmental compliance across industries. The platform streamlines emission testing, effluent monitoring, waste management verification, and environmental clearance tracking.",
    workflows: [
      "Environmental clearance and consent verification",
      "Emission stack monitoring and air quality testing",
      "Effluent treatment plant (ETP) operation verification",
      "Hazardous waste management and disposal audits",
      "Noise pollution and environmental impact assessments",
    ],
    metrics: ["Covered Units", "Monthly Inspections", "Compliance Rate", "Avg. Report Time"],
    metricsValues: ["5,800+", "680+", "84.7%", "3.2 hrs"],
  },
};

function DepartmentModalContent({ department }: { department: string }) {
  const data = departmentContent[department as keyof typeof departmentContent];
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm leading-relaxed text-slate-600">{data.description}</p>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold text-[#0B1E3A]">Inspection Workflows</h4>
        <ul className="space-y-2">
          {data.workflows.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-bold text-[#0B1E3A]">Key Metrics</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.metrics.map((metric, i) => (
            <div key={metric} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <div className="text-lg font-bold text-primary">{data.metricsValues[i]}</div>
              <div className="text-[10px] font-medium text-slate-500">{metric}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Legal Content ---------- */

function PrivacyPolicyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
      <p>NIRIKSHA is committed to protecting the privacy and security of government inspection data. This Privacy Policy outlines how we collect, use, store, and safeguard information processed through the platform.</p>
      <p><strong>Data Collection:</strong> The platform collects inspection-related data including establishment information, inspection findings, photographic evidence, officer credentials, and compliance records. All data is collected solely for regulatory inspection purposes.</p>
      <p><strong>Data Storage:</strong> All data is encrypted at rest and in transit using industry-standard encryption protocols. Data is stored within secure government-grade infrastructure with strict access controls.</p>
      <p><strong>Data Retention:</strong> Inspection records are retained in accordance with applicable regulatory requirements and government data retention policies. Records are permanently deleted upon expiration of the mandated retention period.</p>
      <p><strong>Contact:</strong> For privacy-related inquiries, contact the NIRIKSHA data protection officer at privacy@niriksha.gov.in.</p>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
      <p>These Terms of Service govern the use of the NIRIKSHA Government Inspection Intelligence Platform. By accessing or using the platform, you agree to be bound by these terms.</p>
      <p><strong>Acceptance:</strong> Use of the platform constitutes acceptance of these terms. Authorized government officers and administrators may access the platform in accordance with their designated roles and permissions.</p>
      <p><strong>Usage:</strong> The platform is provided for official government inspection purposes only. Unauthorized access, data extraction, or misuse is strictly prohibited and may result in legal action.</p>
      <p><strong>Limitations:</strong> AI-generated recommendations are advisory and must be reviewed by authorized officers before any final decision. NIRIKSHA is not liable for decisions made based on platform recommendations.</p>
    </div>
  );
}

function SecurityContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
      <p>NIRIKSHA employs enterprise-grade security measures to protect government inspection data and ensure platform integrity.</p>
      <p><strong>Encryption:</strong> End-to-end encryption for all data in transit (TLS 1.3) and at rest (AES-256).</p>
      <p><strong>Access Control:</strong> Role-based access control (RBAC) with granular permissions per department, role, and data scope. Multi-factor authentication (MFA) required for all administrator accounts.</p>
      <p><strong>Audit Logging:</strong> Comprehensive audit trail recording all platform actions including data access, modifications, and administrative changes with timestamps and actor identification.</p>
      <p><strong>Infrastructure:</strong> Deployed on government-approved secure infrastructure with regular security assessments, penetration testing, and compliance audits.</p>
    </div>
  );
}

function ComplianceContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
      <p>NIRIKSHA is designed to meet the highest standards of regulatory compliance for government inspection platforms.</p>
      <p><strong>Regulatory Framework:</strong> The platform aligns with government IT policies, data protection regulations, and departmental compliance requirements across Food Safety, Fire Safety, Healthcare, Factory Safety, and Pollution Control.</p>
      <p><strong>Data Governance:</strong> All inspection data is managed in accordance with government data classification policies, retention schedules, and disposal procedures.</p>
      <p><strong>Audit Readiness:</strong> Every inspection record maintains a complete, immutable audit trail suitable for regulatory review and legal proceedings.</p>
    </div>
  );
}

function AccessibilityContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
      <p>NIRIKSHA is committed to ensuring digital accessibility for all government officers, including those with disabilities. We strive to meet WCAG 2.1 AA standards.</p>
      <p><strong>Standards:</strong> The platform is designed to comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, ensuring compatibility with screen readers and assistive technologies.</p>
      <p><strong>Features:</strong> Keyboard navigation, high-contrast modes, screen reader support, and scalable typography are supported across all platform interfaces.</p>
      <p><strong>Feedback:</strong> If you encounter accessibility barriers, please contact accessibility@niriksha.gov.in for assistance.</p>
    </div>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; content: React.ReactNode }>({ isOpen: false, title: "", content: null });

  const openModal = (title: string, content: React.ReactNode) => setModalState({ isOpen: true, title, content });
  const closeModal = () => setModalState({ isOpen: false, title: "", content: null });

  const columns = [
    {
      title: "Platform",
      icon: Layers,
      links: [
        { label: "Inspection Dashboard", href: "#platform", action: undefined },
        { label: "AI Agents", href: "#agents", action: undefined },
        { label: "Platform Workflow", href: "#workflow", action: undefined },
        { label: "Risk Analytics", href: "#agents", action: undefined },
        { label: "GIS Mapping", href: "#platform", action: undefined },
      ],
    },
    {
      title: "Departments",
      icon: Building2,
      links: [
        { label: "Food Safety", href: "#", action: () => openModal("Food Safety", <DepartmentModalContent department="Food Safety" />) },
        { label: "Fire Safety", href: "#", action: () => openModal("Fire Safety", <DepartmentModalContent department="Fire Safety" />) },
        { label: "Healthcare", href: "#", action: () => openModal("Healthcare", <DepartmentModalContent department="Healthcare" />) },
        { label: "Factory Safety", href: "#", action: () => openModal("Factory Safety", <DepartmentModalContent department="Factory Safety" />) },
        { label: "Pollution Control", href: "#", action: () => openModal("Pollution Control", <DepartmentModalContent department="Pollution Control" />) },
      ],
    },
    {
      title: "Quick Links",
      icon: FileText,
      links: [
        { label: "Platform Overview", href: "#platform", action: undefined },
        { label: "Workflow", href: "#workflow", action: undefined },
        { label: "AI Agents", href: "#agents", action: undefined },
        { label: "Sign In", href: "/auth", action: undefined },
        { label: "Documentation", href: "#", action: () => openModal("Documentation", <DocumentationContent />) },
      ],
    },
    {
      title: "Legal",
      icon: ShieldCheck,
      links: [
        { label: "Privacy Policy", href: "#", action: () => openModal("Privacy Policy", <PrivacyPolicyContent />) },
        { label: "Terms of Service", href: "#", action: () => openModal("Terms of Service", <TermsContent />) },
        { label: "Security", href: "#", action: () => openModal("Security", <SecurityContent />) },
        { label: "Compliance", href: "#", action: () => openModal("Compliance", <ComplianceContent />) },
        { label: "Accessibility", href: "#", action: () => openModal("Accessibility", <AccessibilityContent />) },
      ],
    },
  ];

  return (
    <footer className="relative bg-[#0F172A] text-[#F8FAFC]">
      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div className="h-full w-full" style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.15) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
        {/* Top divider */}
        <div className="mb-12 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Main grid */}
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <a href="#hero" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 overflow-hidden rounded-lg ring-1 ring-white/10">
                <img src="/logo.png" alt="NIRIKSHA" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-[#F8FAFC] group-hover:text-[#60A5FA] transition-colors">NIRIKSHA</div>
                <div className="text-[8px] uppercase tracking-[0.18em] text-[#94A3B8]">Government Inspection Intelligence</div>
              </div>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#94A3B8]">
              Digitizing the end-to-end inspection lifecycle for regulatory departments with explainable AI decision support and complete auditability.
            </p>
            {/* Social icons */}
            <div className="mt-6 flex items-center gap-3">
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#94A3B8] transition-all hover:border-[#60A5FA]/40 hover:text-[#60A5FA] hover:bg-[#2563EB]/10" aria-label="LinkedIn">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#94A3B8] transition-all hover:border-[#60A5FA]/40 hover:text-[#60A5FA] hover:bg-[#2563EB]/10" aria-label="GitHub">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>
              <a href="mailto:contact@niriksha.gov.in" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#94A3B8] transition-all hover:border-[#60A5FA]/40 hover:text-[#60A5FA] hover:bg-[#2563EB]/10" aria-label="Email">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div className="flex items-center gap-2 mb-4">
                <col.icon className="h-3.5 w-3.5 text-[#60A5FA]/60" />
                <div className="text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
                  {col.title}
                </div>
              </div>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.action ? (
                      <button onClick={link.action} className="text-sm text-[#94A3B8] transition-all duration-200 hover:text-[#60A5FA] hover:translate-x-0.5 inline-block text-left">
                        {link.label}
                      </button>
                    ) : (
                      <a href={link.href} className="text-sm text-[#94A3B8] transition-all duration-200 hover:text-[#60A5FA] hover:translate-x-0.5 inline-block">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/[0.06]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Status indicator */}
            <a href="#" className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 hover:bg-emerald-500/10 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-medium text-emerald-400/80">All Systems Operational</span>
            </a>

            {/* Info */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#64748B]">
              <span>© {new Date().getFullYear()} NIRIKSHA</span>
              <span className="hidden md:inline text-white/[0.06]">|</span>
              <span>Government Inspection Intelligence Platform</span>
              <span className="hidden md:inline text-white/[0.06]">|</span>
              <a href="#" className="hover:text-[#60A5FA] transition-colors">Version 1.0</a>
              <span className="hidden md:inline text-white/[0.06]">|</span>
              <a href="#hero" className="hover:text-[#60A5FA] transition-colors">Back to Top ↑</a>
            </div>
          </div>
        </div>
      </div>
      {/* Modal */}
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>
        {modalState.content}
      </Modal>
    </footer>
  );
}

/* ---------- Utility ---------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/10">
      {children}
    </div>
  );
}