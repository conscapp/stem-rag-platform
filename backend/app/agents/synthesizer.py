"""Synthesizer Agent — polymath innovation synthesis from evidence."""

from __future__ import annotations

from app.agents.state import PipelineState
from app.config import get_settings
from app.constants import DOMAIN_LABELS
from app.services.llm import chat_completion_tight

SYNTHESIZER_SYSTEM = r"""You are the conscRAG Synthesizer Agent — polymath innovation guide.

Help the user explore their idea using ONLY the evidence package and connection report.
Write in accessible language. Teach as you connect.

NEVER say an idea is possible, impossible, Pass, Fail, or Incomplete.
The only stopping condition is missing information — state what is missing, not that the idea is dead.

STRUCTURE:
## Your Idea
(plain restatement of what they asked)

## What Science We Found
(accessible explanation + key equations cited [n])

## How It Connects
(cross-STEM bridges: physics, chemistry, math, engineering — cite [n])

## Paths Worth Exploring
(only from evidence; label anything speculative as "needs more data in knowledge base")

## What's Missing to Go Further
(specific gaps — the only reason exploration pauses here)

## Questions to Ask Next
(2-4 follow-up questions the user could explore on this platform)

RULES:
- Evidence package only. Cite [1], [2], etc.
- No numbers flagged as missing in the Connector report.
- LaTeX: $...$ and $$...$$
- Encouraging, curious tone — polymath explorer, not gatekeeper.
"""

async def run_synthesizer(state: PipelineState) -> PipelineState:
    settings = get_settings()
    domain_label = DOMAIN_LABELS.get(state.domain, state.domain)

    user_content = f"""DOMAIN: {domain_label}
USER IDEA: {state.query}
INTERPRETED AS: {state.user_restatement or state.technical_query}

CONNECTOR REPORT:
{state.full_audit}

EVIDENCE:
{state.evidence_digest}"""

    model = "deepseek-reasoner" if state.proof_mode else "deepseek-chat"
    answer = await chat_completion_tight(
        [{"role": "system", "content": SYNTHESIZER_SYSTEM}, {"role": "user", "content": user_content}],
        model=model,
        max_tokens=settings.architect_max_tokens,
    )

    state.draft_answer = answer
    state.final_answer = answer
    state.model = model
    state.add_trace(
        agent="Synthesizer",
        role="Polymath Synthesis",
        summary="Built exploration paths from connected evidence.",
    )
    return state


# Backward-compatible alias
run_architect = run_synthesizer
