"""Debate step — resolve Architect vs Auditor conflicts."""

from __future__ import annotations

from app.agents.parsing import extract_verdict
from app.agents.state import PipelineState
from app.config import get_settings
from app.services.llm import chat_completion_tight

DEBATE_SYSTEM = r"""You are the conscRAG debate moderator between Auditor and Architect.

Output ONLY:
## Debate Resolution
(max 100 words)

State the binding Feasibility Verdict (Pass | Fail | Incomplete) and what the Architect must remove or fix.
No new science. No new numbers.
"""


async def run_debate(state: PipelineState, conflict: str) -> PipelineState:
    settings = get_settings()
    auditor_v = extract_verdict(state.full_audit) or "Unknown"
    architect_v = extract_verdict(state.draft_answer) or "Unknown"

    user_content = f"""CONFLICT: {conflict}

AUDITOR VERDICT: {auditor_v}
ARCHITECT VERDICT: {architect_v}

AUDITOR EXCERPT:
{state.full_audit[:1500]}

ARCHITECT VERDICT SECTION:
{state.draft_answer[-800:]}"""

    model = "deepseek-reasoner" if state.proof_mode else "deepseek-chat"
    notes = await chat_completion_tight(
        [{"role": "system", "content": DEBATE_SYSTEM}, {"role": "user", "content": user_content}],
        model=model,
        max_tokens=settings.debate_max_tokens,
    )

    state.debate_notes = notes
    state.add_trace(
        agent="Debate",
        role="Verdict Alignment",
        summary=f"Resolved mismatch: Auditor {auditor_v} vs Architect {architect_v}.",
    )
    return state
