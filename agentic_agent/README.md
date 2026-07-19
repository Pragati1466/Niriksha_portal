# NIRIKSHA — Agentic AI Decision Intelligence Module

> *Where inspection data stops being paperwork, and starts being intelligence.*

This is the AI core of **NIRIKSHA** — a multi-agent system that takes raw inspection submissions and turns them into risk-scored, evidence-verified, action-ready compliance reports. It doesn't just digitize inspections; it reasons about them.

---

## Table of Contents

- [What This Module Does](#what-this-module-does)
- [Architecture Overview](#architecture-overview)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [The Agents — How Each One Works](#the-agents--how-each-one-works)
  - [1. Risk Prioritization Agent](#1-risk-prioritization-agent)
  - [2. Evidence Verification Agent](#2-evidence-verification-agent)
  - [3. Report Generation Agent](#3-report-generation-agent)
- [LangGraph Orchestration](#langgraph-orchestration)
- [API Endpoints](#api-endpoints)
- [Running the Server](#running-the-server)
- [Testing](#testing)
- [Integration Contract](#integration-contract)

---

## What This Module Does

Pragati's frontend collects an inspection (checklist, photos, inspector notes) and submits it here. This module then:

1. **Scores the risk** of the establishment based on history, complaints, and violations
2. **Verifies the evidence** — checks if uploaded photos actually match what the inspector wrote
3. **Generates a structured report** — summary, violation notice, and recommended/corrective actions

All of this is produced by three cooperating AI agents, orchestrated through a LangGraph workflow, and exposed as REST APIs that Mridu's supervisor dashboard consumes.

---

## Architecture Overview
┌───────────────────────┐
                │  Inspection Submitted │
                │   (from Pragati's API)│
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │     LangGraph Entry    │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Risk Agent Node      │
                │  (score + explanation) │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Evidence Agent Node   │
                │ (vision verification)  │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Report Agent Node    │
                │ (synthesizes findings) │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Structured Report    │
                │  → sent to Dashboard   │
                └───────────────────────┘

---

## Requirements

- **Python** 3.11+
- **uv** (package manager) — https://docs.astral.sh/uv/getting-started/installation/
- **Groq API key** (free tier) — from console.groq.com
- Windows PowerShell / any terminal

### Python packages

| Package | Purpose |
|---|---|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server to run FastAPI |
| `langgraph` | Multi-agent orchestration |
| `langchain-groq` | Groq LLM integration (text + vision) |
| `pydantic` | Data validation & schemas |
| `python-dotenv` | Environment variable loading |

---

## Installation & Setup

```powershell
# 1. Clone / navigate to the project
cd Niriksha-ai-core

# 2. Install dependencies with uv
uv add fastapi uvicorn langgraph langchain-groq pydantic python-dotenv

# 3. Create a .env file in the project root
```

**`.env` file contents:**

GROQ_API_KEY=your_groq_api_key_here
Get your free key from console.groq.com → API Keys → Create Key.

---

## Project Structure
Niriksha-ai-core/
├── .env                        # API keys (not committed to git)
├── main.py                     # FastAPI app — exposes the 4 owned endpoints
├── graph.py                    # LangGraph workflow definition
├── schemas.py                  # Pydantic models — the data contract
├── mock_data.py                # Sample inspections (high/moderate/low risk)
├── agents/
│   ├── risk_agent.py           # Risk Prioritization Agent
│   ├── evidence_agent.py       # Evidence Verification Agent
│   └── report_agent.py         # Report Generation Agent
├── test_risk_score.py          # Standalone test for Risk Agent
├── test_evidence.py            # Standalone test for Evidence Agent
├── test_report.py              # Standalone test for Report Agent
└── test_graph.py               # Full pipeline test (all 3 agents via LangGraph)

---

## The Agents — How Each One Works

### 1. Risk Prioritization Agent
**File:** `agents/risk_agent.py`

Works in two layers:

- **Deterministic scoring** (pure Python, no LLM): calculates a 0–100 risk score from complaint count, previous violations, and failed checklist items. This keeps the score consistent and auditable — not a black-box guess.
- **LLM explanation** (Groq, `llama-3.3-70b-versatile`): takes the score plus the raw inspection facts and writes a specific, evidence-grounded explanation — citing exact violations, dates, and failed items rather than generic text.

**Output:** `risk_score`, `risk_level` (low/moderate/high), and a natural-language `explanation`.

### 2. Evidence Verification Agent
**File:** `agents/evidence_agent.py`

Uses a **vision-capable** Groq model (`meta-llama/llama-4-scout-17b-16e-instruct`) to:

- Look at the actual uploaded inspection images
- Compare what's visually present against the inspector's written observations and checklist responses
- Detect mismatches — e.g. inspector claims a violation the photo doesn't support, or vice versa
- Produce a `confidence_score` and a `flagged_suspicious` boolean when evidence and report don't align

This is the agent that keeps inspectors honest — it doesn't just trust the text report, it independently checks the visual proof.

### 3. Report Generation Agent
**File:** `agents/report_agent.py`

Takes the **outputs of the Risk and Evidence agents** (not raw data directly) and synthesizes them into one coherent report using Groq (`llama-3.3-70b-versatile`):

- A structured `report_summary`
- A formal `violation_notice` (if risk is moderate/high)
- `recommended_actions` for supervisors
- `corrective_actions` for the establishment

This agent can run standalone (`run_report_agent`, which calls the other two agents internally) or as part of the LangGraph pipeline (`generate_report_from_results`, which accepts already-computed risk/evidence results — used by the graph to avoid redundant LLM calls).

---

## LangGraph Orchestration

**File:** `graph.py`

The three agents are wired into an explicit, visualizable LangGraph workflow:
risk_agent  →  evidence_agent  →  report_agent  →  END
### Graph State

A `TypedDict` called `GraphState` carries data between nodes:

```python
class GraphState(TypedDict):
    inspection_data: InspectionSubmission
    risk_result: Optional[RiskScoreResponse]
    evidence_result: Optional[EvidenceVerificationResponse]
    report_result: Optional[GeneratedReportResponse]
```

Each node reads what it needs from the state and writes its result back into it, so by the time execution reaches `report_agent`, the full context (original data + risk findings + evidence findings) is available for the final synthesis — without recomputing anything.

### How it runs

```python
from graph import run_full_pipeline
from mock_data import get_sample_inspection_high_risk

result = run_full_pipeline(get_sample_inspection_high_risk())
# result["risk_result"], result["evidence_result"], result["report_result"]
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/risk-score` | Runs only the Risk Agent |
| `POST` | `/verify-evidence` | Runs only the Evidence Agent |
| `POST` | `/generate-report` | Runs the full LangGraph pipeline, returns the final report |
| `POST` | `/recommend-action` | Runs the full pipeline, returns just the recommended + corrective actions |

All endpoints accept the same request body: an `InspectionSubmission` JSON object (see `schemas.py`).

---

## Running the Server

```powershell
uv run uvicorn main:app --reload
```

- API base: `http://127.0.0.1:8000`
- Interactive docs (test endpoints directly in browser): `http://127.0.0.1:8000/docs`

---

## Testing

Each agent has a standalone test script that runs against mock data (no dependency on Pragati's API being ready):

```powershell
uv run python test_risk_score.py
uv run python test_evidence.py
uv run python test_report.py
uv run python test_graph.py
```

---

## Integration Contract

- **Pragati's module** sends inspection data to this module's endpoints as an `InspectionSubmission` JSON payload.
- **Mridu's dashboard** consumes the JSON responses from `/generate-report` and `/recommend-action` to populate risk scores, reports, and approval workflows.

See `schemas.py` for the exact field definitions of both the request and response models.
