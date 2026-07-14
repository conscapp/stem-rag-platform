"""Polymath pipeline: Interpreter → Navigator → Connector → Synthesizer."""

from __future__ import annotations

from app.agents.connector import run_connector, run_connector_supplement
from app.agents.interpreter import run_interpreter
from app.agents.navigator import run_navigator, supplement_evidence
from app.agents.parsing import parse_retrieval_gaps
from app.agents.state import PipelineState
from app.agents.synthesizer import run_synthesizer
from app.config import get_settings
from app.models.schemas import AgentStep, SourceChunk


async def run_multi_agent_pipeline(
    query: str,
    domain: str,
    subject: str | None = None,
    proof_mode: bool = False,
) -> tuple[str, str, list[SourceChunk], list[AgentStep], str]:
    settings = get_settings()
    state = PipelineState(
        query=query,
        domain=domain,
        subject=subject,
        proof_mode=proof_mode,
    )

    # 1. Plain language → technical search terms
    state = await run_interpreter(state)

    # 2. Deep multi-query retrieval
    state = await run_navigator(state)

    # 3. Cross-STEM connection + gaps
    state = await run_connector(state)

    # 4. Supplemental RAG if Connector flagged gaps
    if settings.enable_supplemental_retrieval:
        gaps = parse_retrieval_gaps(state.audit_report)[: settings.max_retrieval_gaps]
        if gaps:
            state = await supplement_evidence(state, gaps)
            state = await run_connector_supplement(state)

    # 5. Polymath synthesis
    state = await run_synthesizer(state)

    trace = [AgentStep(agent=t.agent, role=t.role, summary=t.summary) for t in state.trace]
    restatement = state.user_restatement or state.technical_query
    return state.final_answer, state.model, state.chunks, trace, restatement
