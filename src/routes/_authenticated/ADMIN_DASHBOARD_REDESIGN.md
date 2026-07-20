# NIRIKSHA Admin Dashboard — Enterprise Redesign

> **Document for:** IBM Hackathon Judges  
> **Role:** Principal Product Designer, IBM — Senior UX Architect  
> **Product:** NIRIKSHA — AI-Powered Inspection Intelligence Platform  
> **Design Language:** GovTech Enterprise (Inspired by IBM watsonx, Palantir Gotham, Datadog, Microsoft Security Center)

---

## 1. Color Palette — GovTech Enterprise

```
Primary Navy       #0D2D63   — Trust, authority, government-grade
Royal Blue          #2F6FED   — Interactive elements, links, selected states
Sky Blue            #6BA8FF   — Accents, highlights, data viz light tones
Emerald Green       #10B981   — Compliance OK, operational, healthy
Amber               #F59E0B   — Warnings, moderate risk, attention needed
Crimson Red         #DC2626   — High risk, violations, alerts, non-compliance
Slate Gray          #64748B   — Secondary text, metadata, subtle labels
White               #FFFFFF   — Card surfaces
Off-White           #F8FAFC   — Page background
Charcoal            #1E293B   — Dashboard header text
```

### Semantic Mappings

| Data Point | Color |
|---|---|
| Platform healthy / operational | Emerald #10B981 |
| Moderate risk / warnings | Amber #F59E0B |
| High risk / critical alerts | Crimson #DC2626 |
| AI confidence high (≥80%) | Emerald |
| AI confidence medium (50-79%) | Amber |
| AI confidence low (<50%) | Crimson |
| Compliance ≥90% | Emerald |
| Compliance 70-89% | Sky Blue |
| Compliance <70% | Crimson |
| Agent heartbeat | Primary Navy dot with Emerald pulse |

---

## 2. Dashboard Sections (Reordered by Information Hierarchy)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SECTION 0 — TOP NAV BAR (compact)                                          │
│  [NIRIKSHA] [Inspection Intelligence Platform]    [v1.0] [Last sync: 2m ago]│
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTION 1 — HERO METRICS ROW [5 cards, 5-second impact]                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ Platform │ │ Active   │ │ AI       │ │ Risk     │ │ Compliance   │    │
│  │ Health   │ │ Inspect. │ │ Decisions│ │ Exposure │ │ Index        │    │
│  │  98.2%   │ │   47     │ │  92.4%   │ │  Medium  │ │   84.7%      │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTION 2 — AI AGENT INTELLIGENCE PANEL (3 columns, orchestration view)   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │ Risk Prioritiz.  │ │ Evidence Verify  │ │ Report Generate  │           │
│  │ Agent ● Active   │ │ Agent ● Active   │ │ Agent ● Standby  │           │
│  │ Last: 12m ago    │ │ Last: 8m ago     │ │ Last: 34m ago    │           │
│  │ Confidence: 87%  │ │ Confidence: 94%  │ │ Confidence: 91%  │           │
│  │ Tasks: 3 pending │ │ Tasks: 1 flagged │ │ Tasks: 2 queued  │           │
│  │ ▶ View Details   │ │ ▶ View Details   │ │ ▶ View Details   │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTION 3 — INSPECTION ANALYTICS GRID                                      │
│  ┌─────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │  Inspection Status Distribution │ │  Risk Level Breakdown            │  │
│  │  [Donut chart]                  │ │  [Horizontal stacked bar]        │  │
│  │  Pending: 32  In-Progress: 15  │ │  High: 12  Moderate: 28  Low: 31 │  │
│  │  Completed: 41                  │ │                                   │  │
│  └─────────────────────────────────┘ └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTION 4 — COMPLIANCE & DEPARTMENT OVERVIEW                               │
│  ┌─────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │  Compliance Trend (6 months)    │ │  Department-wise Volume          │  │
│  │  [Line chart, sparklines]       │ │  [Horizontal bar chart]          │  │
│  │  ▲ 2.3% from last month         │ │  Health Dept: 18   Education: 12│  │
│  │                                  │ │  Fire Dept: 9     Food Safety: 7│  │
│  └─────────────────────────────────┘ └──────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTION 5 — AI RECOMMENDATIONS (Decision Support Panel)                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 High-risk inspection #IN-0392 requires immediate review           │  │
│  │ 🟡 Health Department — 3 consecutive compliance declines detected    │  │
│  │ 🟢 Recommended: Allocate 2 additional inspectors to Food Safety      │  │
│  │ 🟡 Evidence flagged as suspicious in inspection #IN-0217            │  │
│  │ 🔴 Pending supervisor approval for 4 completed inspections           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTION 6 — SYSTEM STATUS & RECENT ACTIVITY                               │
│  ┌─────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │  System Health                  │ │  Recent Platform Activity        │  │
│  │  ● Backend API      Operational│ │  • Inspection completed (2m ago) │  │
│  │  ● Database         Operational│ │  • Inspector assigned (8m ago)   │  │
│  │  ● AI Services      Operational│ │  • Risk score updated (15m ago)  │  │
│  │  ● Notifications    Operational│ │  • Evidence flagged (28m ago)    │  │
│  └─────────────────────────────────┘ └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Widget Hierarchy & Space Allocation

| Priority | Widget | Row Height | Width | Rationale |
|---|---|---|---|---|
| **P0** | Hero Metrics (5 KPIs) | 120px | Full | 5-second credibility. Judges immediately see "this is a live platform" |
| **P0** | Agent Intelligence Panel (3 columns) | 180px | Full | Differentiator — visually proves agentic AI orchestration |
| **P1** | Inspection Status Distribution | 280px | 50% | Core domain metric, shows pipeline health |
| **P1** | Risk Level Breakdown | 280px | 50% | Risk awareness is the #1 government concern |
| **P1** | Compliance Trend | 260px | 50% | Shows improvement/deterioration over time |
| **P1** | Department-wise Volume | 260px | 50% | Operational lens for resource allocation |
| **P2** | AI Recommendations | 200px | Full | Decision support — proves AI isn't just analytics |
| **P3** | System Health | 180px | 50% | Trust signal — platform reliability |
| **P3** | Recent Activity | 180px | 50% | Humanizes the dashboard with real events |

---

## 4. Recommended Charts & Rationale

### Chart 1: Inspection Status Distribution
**Type:** Donut chart (center shows total count)
**Why:** Instantly communicates pipeline health. If "Pending" is too large relative to "Completed", the platform is bottlenecked.
**Data source:** `getDashboardOverview()` → kpis.pending, kpis.inProgress, kpis.completed

### Chart 2: Risk Level Breakdown
**Type:** Horizontal stacked bar with segments (High / Moderate / Low)
**Why:** Risk distribution is the #1 mental model for government oversight. A single bar immediately shows whether risk profile is improving or worsening.
**Data source:** Aggregated from `inspections` table where `risk_score_at_inspection` is populated, OR from AI `/risk-score` endpoint responses

### Chart 3: Compliance Trend (6-month rolling)
**Type:** Sparkline with min/max range (small line chart)
**Why:** Shows direction of compliance health. Upward trend = system working. Downward trend = red flag.
**Data source:** Historical `inspections` table, grouped by month, averaging `risk_score_at_inspection` inverted (100 - avg_risk = compliance proxy)

### Chart 4: Department-wise Inspection Volume
**Type:** Horizontal bar chart (sorted descending)
**Why:** Operational transparency. Shows which departments are most/least active. Helps judges understand scale of operations.
**Data source:** `inspections` table grouped by `department_id`, joined with `departments` table

### Chart 5: AI Decision Accuracy
**Type:** Gauge chart (0-100%) with threshold markers
**Why:** Critical for Explainable AI. Shows what percentage of AI recommendations were accepted by supervisors. Proves AI is trustworthy.
**Data source:** Track `recommendation_accepted` boolean field (you'd add a simple tracking table, or estimate from supervisor actions)

### Chart 6: Agent Utilization
**Type:** Small horizontal bar showing busy/idle ratio per agent
**Why:** Visually proves autonomous AI orchestration. Judges see agents actively working.

### Chart 7: Monthly Inspection Timeline
**Type:** Bar chart — inspections scheduled per month (6 months)
**Why:** Shows workload trends and seasonal patterns. Important for capacity planning.

---

## 5. Agent Intelligence Panel — Detailed Design

### Visual Specification
- **3-column grid**, equal width
- **Each agent card** = Glass-morphism card (white bg, subtle border, small shadow)
- **Agent header**: Agent name + status badge (Live dot + "Active"/"Standby")
- **Status indicator**: Animated pulsing green dot when active, static gray when standby
- **Metrics row**: Compact grid of 4 mini stats
- **Confidence bar**: Thin horizontal progress bar (green if ≥80%, amber if 50-79%, red if <50%)

### Agent 1: Risk Prioritization Agent
```
┌──────────────────────────────────────────┐
│ ● Active   RISK PRIORITIZATION AGENT     │
│ ──────────────────────────────────────── │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │
│ │Tasks  │ │Last  │ │Conf. │ │Avg Score │ │
│ │ 3 pend│ │12m   │ │ 87%  │ │   72     │ │
│ └──────┘ └──────┘ └──────┘ └──────────┘ │
│ ████████████████░░░░ 87% Confidence      │
│ Last recommendation: Review IN-0392      │
│                                         │
│ [▶ View Details]                         │
└──────────────────────────────────────────┘
```

### Agent 2: Evidence Verification Agent
```
┌──────────────────────────────────────────┐
│ ● Active   EVIDENCE VERIFICATION AGENT   │
│ ──────────────────────────────────────── │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │
│ │Flagged│ │Last  │ │Conf. │ │Mismatch  │ │
│ │  1    │ │8m    │ │ 94%  │ │   2      │ │
│ └──────┘ └──────┘ └──────┘ └──────────┘ │
│ ████████████████████░░ 94% Confidence     │
│ Alert: IN-0217 flagged suspicious         │
│                                          │
│ [▶ View Details]                          │
└──────────────────────────────────────────┘
```

### Agent 3: Report Generation Agent
```
┌──────────────────────────────────────────┐
│ ○ Standby  REPORT GENERATION AGENT       │
│ ──────────────────────────────────────── │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │
│ │Queued │ │Last  │ │Conf. │ │Reports   │ │
│ │  2    │ │34m   │ │ 91%  │ │  47      │ │
│ └──────┘ └──────┘ └──────┘ └──────────┘ │
│ ████████████████████░░ 91% Confidence     │
│ Generated: Completed reports ready for    │
│ supervisor review                         │
│                                          │
│ [▶ View Details]                          │
└──────────────────────────────────────────┘
```

---

## 6. AI Recommendation Cards — Design Spec

### Card Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AI RECOMMENDATIONS                                    [▶ View All]          │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔴 HIGH PRIORITY                                                            │
│   Inspection #IN-0392 assigned to South Zone Food Safety has a risk score   │
│   of 87/100. Requires immediate supervisor review.  → Review Now            │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🟡 MODERATE PRIORITY                                                        │
│   Health Department shows 3 consecutive months of compliance decline.       │
│   Recommend targeted training for inspectors in this department.  → Analyze │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🟢 INFORMATION                                                              │
│   Food Safety Department volume increased 40% this quarter. Consider        │
│   reallocating 2 inspectors from Fire Dept.  → Adjust Resources             │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🟡 MODERATE PRIORITY                                                        │
│   Evidence Verification Agent flagged IN-0217 as suspicious (confidence     │
│   47%). Manual verification required.  → Verify Evidence                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🔴 HIGH PRIORITY                                                            │
│   4 completed inspections pending supervisor approval for >48 hours.        │
│   Bottleneck detected in approval workflow.  → Approve Now                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Priority Color Coding
| Level | Icon | Left Border | Background |
|---|---|---|---|
| 🔴 High Priority | AlertTriangle icon (red) | 3px red border | Red/50 bg |
| 🟡 Moderate Priority | AlertCircle icon (amber) | 3px amber border | Amber/50 bg |
| 🟢 Information | Info icon (blue) | 3px blue border | Blue/50 bg |

---

## 7. Icon Strategy

### Hero/Navigation Icons (Outline style, 18-20px)
| Icon | Used For |
|---|---|
| `Shield` | Platform Health |
| `Search` (with magnifying glass + document) | Active Inspections |
| `Brain` | AI Decisions |
| `AlertTriangle` | Risk Exposure |
| `CheckCircle` | Compliance Index |
| `Bot` (custom icon) | Agent Intelligence |
| `BarChart3` | Analytics |
| `FileText` | Reports |
| `Users` | User Management |
| `Settings` | Configuration |

### Status Icons
| Icon | Color | Meaning |
|---|---|---|
| `Circle` filled | Green | Operational / Healthy / Active |
| `Circle` filled | Red | Critical / High Risk / Down |
| `Circle` filled | Amber | Warning / Moderate |
| `Circle` filled | Gray | Inactive / Standby |

### Chart Icon Set
| Icon | Chart |
|---|---|
| `PieChart` | Donut for status distribution |
| `BarChartHorizontal` | Bar charts for dept volume |
| `TrendingUp` | Line chart for compliance trend |
| `Gauge` | Gauge for AI accuracy |

---

## 8. Typography System

| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Dashboard Title | Inter | 24px | 600 (Semibold) | 1.2 |
| Section Headers | Inter | 11px | 600 | Uppercase, 1.5 tracking |
| Hero Metric Value | Inter | 32px | 700 (Bold) | Tight | 
| Hero Metric Label | Inter | 10px | 600 | Uppercase, 0.14em tracking |
| KPI Card Value | Inter | 28px | 700 | Tabular nums |
| KPI Card Label | Inter | 10px | 600 | Uppercase |
| Agent Name | Inter | 13px | 600 | — |
| Agent Stat Label | Inter | 9px | 600 | Uppercase |
| Agent Stat Value | Inter | 16px | 700 | Tabular nums |
| Recommendation Text | Inter | 13px | 400 | 1.4 |
| Recommendation Meta | Inter | 11px | 500 | 1.4 |
| Badge / Chip | Inter | 10px | 600 | Uppercase |
| System Health Label | Inter | 12px | 500 | — |

---

## 9. Four Screenshot Strategy — IBM Hackathon PPT

### Screenshot 1: Executive Dashboard Overview
**Zoom Level:** 100% (full page view, no scroll)
**Visible Widgets:**
- Top navbar with "NIRIKSHA — Inspection Intelligence Platform"
- 5 Hero Metric cards (Platform Health, Active Inspections, AI Decision Accuracy, Risk Exposure, Compliance Index)
- Agent Intelligence Panel (3 columns, all 3 agents with live status)
- Maybe partial of charts below

**Why This Screenshot:**
This is the money shot. In 5 seconds, judges see:
- 🏛️ Government-grade visual design (navy + clean layout)
- 🤖 Three AI agents actively working (agentic orchestration)
- 📊 Real metrics (not placeholder data)
- 🔒 Professional enterprise UI

**Highlight:** Glow/highlight around the 3 Agent cards with a tooltip or annotation saying "3 Autonomous AI Agents Orchestrating Inspections"

**Judges understand in 5 seconds:**
> "This is a live, AI-powered inspection intelligence platform with autonomous agents, not a CRUD app."

---

### Screenshot 2: AI Agent Intelligence & Decision Support
**Zoom Level:** Zoom to middle 60% of dashboard
**Visible Widgets:**
- Full Agent Intelligence Panel (3 columns, expanded)
- AI Recommendations section (5 recommendation cards)

**Why This Screenshot:**
This screenshot proves the AI is real, autonomous, and generating actionable intelligence. Judges see:
- Agent statuses with confidence scores
- Each agent has different tasks (risk scoring, evidence verification, report generation)
- AI recommendations are specific, actionable, and prioritized (High/Moderate/Information)

**Highlight:** Put a callout box next to the Evidence Verification Agent showing "Suspicious Inspection Flagged — AI detected inconsistency"

**Judges understand in 5 seconds:**
> "Multiple AI agents work autonomously — risk scoring, verifying evidence, generating reports — and their outputs drive decision recommendations."

---

### Screenshot 3: Inspection Analytics & Compliance Insights
**Zoom Level:** Zoom to bottom ~45% of dashboard
**Visible Widgets:**
- Inspection Status Distribution (donut chart)
- Risk Level Breakdown (stacked bar)
- Compliance Trend (line chart with sparklines)
- Department-wise Inspection Volume (horizontal bar chart)

**Why This Screenshot:**
Shows the data depth beyond AI. Judges see:
- Real inspection pipeline data (not fake)
- Risk distribution across the system
- Trend showing improvement over time
- Department-level operational view

**Highlight:** Draw a trend arrow on the Compliance Trend chart showing "+2.3% improvement"

**Judges understand in 5 seconds:**
> "The platform provides rich visual analytics — inspection health, risk patterns, compliance trends, and departmental performance — all from real data."

---

### Screenshot 4: Platform Governance & System Health
**Zoom Level:** Full page but show a combined view with System Health on left and Recent Activity on right
**Visible Widgets:**
- System Health (4 services, all operational)
- Recent Platform Activity (timeline of events)
- Platform version info
- Maybe bottom section showing "Configuration" or "User Management" link

**Why This Screenshot:**
Reinforces enterprise-grade governance. Shows:
- All backend services are healthy (operational credibility)
- Real activity events prove the system is live
- Platform versioning shows it's a maintained product

**Highlight:** Show the "All systems operational" badge in green

**Judges understand in 5 seconds:**
> "This is a reliable, enterprise-grade platform with full operational transparency and governance."

---

## 10. Final Layout — Complete Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  NIRIKSHA                      Inspection Intelligence Platform     v1.0    Live │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─── HERO METRICS ──────────────────────────────────────────────────────────┐  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─┤  │
│  │  │ ██ Platform   │  │ ██ Active    │  │ ██ AI        │  │ ██ Risk      │  │█│  │
│  │  │ ██ Health     │  │ ██ Inspect.  │  │ ██ Decisions │  │ ██ Exposure  │  │█│  │
│  │  │    98.2%      │  │    47        │  │    92.4%     │  │   Medium     │  │█│  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └─┤  │
│  │                                                              ┌──────────────┐ │  │
│  │                                                              │ Compliance   │ │  │
│  │                                                              │ Index 84.7%  │ │  │
│  │                                                              └──────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  AGENT INTELLIGENCE                                                               │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐ │
│  │ ● Risk Prioritization  │  │ ● Evidence Verification│  │ ○ Report Generation │ │
│  │   Agent                │  │   Agent                │  │   Agent              │ │
│  │  ┌──┐┌──┐┌──┐┌────┐  │  │  ┌──┐┌──┐┌──┐┌────┐  │  │  ┌──┐┌──┐┌──┐┌────┐  │ │
│  │  │3 ││12││87││ 72 │  │  │  │1 ││8 ││94││ 2  │  │  │  │2 ││34││91││ 47 │  │ │
│  │  └──┘└──┘└──┘└────┘  │  │  └──┘└──┘└──┘└────┘  │  │  └──┘└──┘└──┘└────┘  │ │
│  │  ████████████░░ 87%   │  │  ████████████████░ 94%│  │  ██████████████░░ 91%│ │
│  │  Review IN-0392       │  │  Flagged IN-0217     │  │  47 reports gen.     │ │
│  │  [▶ View]             │  │  [▶ View]            │  │  [▶ View]            │ │
│  └────────────────────────┘  └────────────────────────┘  └──────────────────────┘ │
│                                                                                   │
│  ANALYTICS                                                                        │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  Inspection Status Distribution    │  │  Risk Level Breakdown              │  │
│  │        ╭──────╮                    │  │  ┌──────────────────────────────┐  │  │
│  │       ╱  41   ╲                   │  │  │ ████ High: 12                │  │  │
│  │      │   Total │                  │  │  │ ████████████ Moderate: 28    │  │  │
│  │       ╲       ╱  Completed        │  │  │ ██████████████████ Low: 31   │  │  │
│  │        ╰──────╯  Pending: 32      │  │  └──────────────────────────────┘  │  │
│  │                  In Progress: 15  │  │                                     │  │
│  └────────────────────────────────────┘  └────────────────────────────────────┘  │
│                                                                                   │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  Compliance Trend (6 months)       │  │  Department-wise Volume            │  │
│  │  ╱╲    ╱╲    ╱╲                   │  │  ┌──────────────────────────────┐  │  │
│  │ ╱  ╲  ╱  ╲  ╱  ╲  ▲ 2.3%         │  │  │ Health Dept         ████████│  │  │
│  │╱    ╲╱    ╲╱    ╲                 │  │  │ Education Dept      ██████  │  │  │
│  │ Jan  Feb  Mar  Apr  May  Jun       │  │  │ Fire Dept           ████    │  │  │
│  └────────────────────────────────────┘  │  │ Food Safety         ███     │  │  │
│                                          └────────────────────────────────────┘  │
│                                                                                   │
│  AI RECOMMENDATIONS                                                                │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 IN-0392: High-risk inspection requires immediate review    [Review Now] │  │
│  │ 🟡 Health Dept: 3 consecutive compliance declines detected    [Analyze]    │  │
│  │ 🟢 Reallocate: Add 2 inspectors to Food Safety               [Adjust]     │  │
│  │ 🟡 IN-0217: Evidence flagged as suspicious by AI             [Verify]     │  │
│  │ 🔴 4 inspections pending approval >48 hours                   [Approve]   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  System Health                     │  │  Recent Activity                   │  │
│  │  ● Backend API        ● All Good  │  │  ● Inspection completed (2m ago)   │  │
│  │  ● Database           ● All Good  │  │  ● Inspector assigned (8m ago)     │  │
│  │  ● AI Services        ● All Good  │  │  ● Risk score updated (15m ago)    │  │
│  │  ● Notifications      ● All Good  │  │  ● Evidence flagged (28m ago)      │  │
│  └────────────────────────────────────┘  └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Key Design Decisions & Rationale (for Judges)

### Why Navy + Royal Blue?
Navy (#0D2D63) is the color of government trust worldwide (think FBI, CIA, Interpol, IBM). It communicates authority, security, and institutional credibility. Combined with Royal Blue for interactivity, it feels modern but not frivolous.

### Why 5 Hero Metrics Instead of 7-9?
Cognitive science: humans can hold 4-6 chunks in working memory. 5 hero metrics gives judges all the key signals without information overload. Each metric answers a specific question: Is the platform healthy? Is it being used? Is the AI working? Are risks managed? Is compliance improving?

### Why 3 AI Agent Cards?
The agentic AI panel is the **strategic differentiator** for the hackathon. Most teams show AI results (recommendations, scores). NIRIKSHA shows AI *process* — three specialized agents working autonomously. This proves the system isn't just a simple ML model but a true multi-agent orchestration system.

### Why AI Recommendations Below Charts?
The visual story flows: metrics → agents → analytics → decisions. Charts provide the data evidence, recommendations provide the decision support. This mirrors IBM's design principle of "Data → Insight → Action."

### Why Not Multiple Charts on Same Row?
Each chart has a distinct purpose. Grouping too many charts creates noise. By giving each chart its defined space, we communicate that each data point is intentional and meaningful.

### Why System Health at Bottom?
By the time judges reach the bottom, they've seen metrics, agents, analytics, and decisions. System Health at the bottom provides a reassuring "closing" — the platform powering all this intelligence is reliable and operational.

---

## 12. Implementation Notes

### What to Modify
1. **`admin.index.tsx`**: Complete rewrite of the DashboardPage component
2. **`admin.tsx`**: Minor update to header branding (add "Inspection Intelligence Platform" subtitle)
3. **`admin.functions.ts`**: Add `getAgentMetrics()` and `getComplianceTrend()` functions
4. **No new NPM packages** — all icons from lucide-react already included, charts via existing recharts/chart.js configuration

### New Data Functions Needed
```typescript
// Proposed additions to admin.functions.ts
getAgentMetrics() → Returns status per agent (active/standby, last run, confidence, tasks)
getComplianceTrend() → Returns 6-month compliance data grouped by month
getRiskDistribution() → Returns count per risk level (high/moderate/low)
getDeptInspectionVolume() → Returns inspections per department
getAIRecommendations() → Returns 5 prioritized recommendations
```

### Chart Library
Use existing `recharts` or `@/components/ui/chart.tsx` (which wraps recharts). The shadcn chart component supports donut, bar, line, and area charts out of the box.

### Load Strategy
- Keep existing `getDashboardOverview()` for KPIs and recent activity
- Add parallel queries for agent data, compliance trend, risk distribution
- Use `useQueries` or `Promise.all` — all load simultaneously
- Show skeleton loading state matching final layout dimensions

---

## 13. Checklist: What Judges Evaluate

| Criteria | How NIRIKSHA Scores |
|---|---|
| Visual Design | GovTech enterprise, navy + royal blue, clean whitespace, premium feel |
| AI Integration | 3 agent cards + AI recommendations + confidence scores |
| Data Authenticity | All metrics from actual Supabase queries, no hardcoded dummy data |
| Explainable AI | Confidence bars, explanations, traceable agent outputs |
| Information Hierarchy | Hero KPIs → Agents → Analytics → Recommendations → System Health |
| Government Relevance | Risk distribution, compliance index, department oversight, audit trail |
| Decision Support | 5 contextual AI recommendations with priority and action buttons |
| Scalability | Grid layout scales from 1024px to 2560px monitors |
| Accessibility | High contrast ratios, semantic colors, clear typography hierarchy |
| Innovation | Agentic orchestration panel — judges haven't seen this in other govtech platforms |