# graph.py
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

from schemas import InspectionAnalysisRequest, RiskScoreResponse, EvidenceVerificationResponse, GeneratedReportResponse
from agents.risk_agent import run_risk_agent
from agents.evidence_agent import run_evidence_agent
from agents.report_agent import generate_report_from_results


class GraphState(TypedDict):
    inspection_data: InspectionAnalysisRequest
    risk_result: Optional[RiskScoreResponse]
    evidence_result: Optional[EvidenceVerificationResponse]
    report_result: Optional[GeneratedReportResponse]


def risk_node(state: GraphState) -> GraphState:
    state["risk_result"] = run_risk_agent(state["inspection_data"])
    return state


def evidence_node(state: GraphState) -> GraphState:
    state["evidence_result"] = run_evidence_agent(state["inspection_data"])
    return state


def report_node(state: GraphState) -> GraphState:
    state["report_result"] = generate_report_from_results(
        state["inspection_data"], state["risk_result"], state["evidence_result"]
    )
    return state


def build_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("risk_agent", risk_node)
    workflow.add_node("evidence_agent", evidence_node)
    workflow.add_node("report_agent", report_node)
    workflow.set_entry_point("risk_agent")
    workflow.add_edge("risk_agent", "evidence_agent")
    workflow.add_edge("evidence_agent", "report_agent")
    workflow.add_edge("report_agent", END)
    return workflow.compile()


def run_full_pipeline(data: InspectionAnalysisRequest) -> GraphState:
    graph = build_graph()
    initial_state: GraphState = {
        "inspection_data": data, "risk_result": None, "evidence_result": None, "report_result": None,
    }
    return graph.invoke(initial_state)