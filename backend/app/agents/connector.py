"""Connector Agent — cross-STEM evidence links and gap identification."""

from __future__ import annotations

from app.agents.state import PipelineState
from app.config import get_settings
from app.constants import DOMAIN_LABELS
from app.services.llm import chat_completion_tight

CONNECTOR_SYSTEM = r"""You are the conscRAG Connector Agent — cross-STEM evidence linker.

Review the user's idea against the evidence package. Do NOT write the final synthesis.
NEVER say an idea is possible, impossible, Pass, Fail, or Incomplete.

FORMAT (strict, concise):
## What the Evidence Connects
(max 180 words — cross-STEM links, cite [n])

## What's Still Missing
(bullet list of specific data not in sources, or "none identified")

RETRIEVAL_GAPS: term1, term2
(or RETRIEVAL_GAPS: none)

RULES:
- Evidence only. Missing data → list under What's Still Missing.
- No invented numbers or materials.
- Do not conclude whether the idea can work — only what sources contain vs lack.
- End with RETRIEVAL_GAPS line (max 3 search terms for a second retrieval pass).
"""

SUPPLEMENT_SYSTEM = r"""You are the Connector Agent. Supplemental evidence was retrieved for prior gaps.

Add only:
## Supplemental Connections
(max 120 words, cite new [n] only)

Update What's Still Missing if new evidence fills gaps. Keep RETRIEVAL_GAPS: none unless critical data is still absent.
Never use possible/impossible/Pass/Fail/Incomplete.
"""


async def run_connector(state: PipelineState) -> PipelineState:
    settings = get_settings()
    domain_label = DOMAIN_LABELS.get(state.domain, state.domain)

    user_content = f"""DOMAIN: {domain_label}
USER IDEA: {state.query}
INTERPRETED AS: {state.user_restatement or state.technical_query}

EVIDENCE:
{state.evidence_digest}"""

    model = "deepseek-reasoner" if state.proof_mode else "deepseek-chat"
    report = await chat_completion_tight(
        [{"role": "system", "content": CONNECTOR_SYSTEM}, {"role": "user", "content": user_content}],
        model=model,
        max_tokens=settings.auditor_max_tokens,
    )

    state.audit_report = report
    state.model = model
    state.add_trace(
        agent="Connector",
        role="Cross-STEM Links",
        summary=_summarize_gaps(report),
    )
    return state


async def run_connector_supplement(state: PipelineState) -> PipelineState:
    settings = get_settings()
    user_content = f"""PRIOR CONNECTION REPORT:
{state.audit_report}

NEW EVIDENCE:
{state.evidence_digest}

Connect only what the new evidence adds."""

    model = "deepseek-reasoner" if state.proof_mode else "deepseek-chat"
    supplement = await chat_completion_tight(
        [{"role": "system", "content": SUPPLEMENT_SYSTEM}, {"role": "user", "content": user_content}],
        model=model,
        max_tokens=600,
    )

    state.supplemental_audit = supplement
    state.add_trace(
        agent="Connector",
        role="Supplemental Links",
        summary="Extended connections from second-pass retrieval.",
    )
    return state


def _summarize_gaps(report: str) -> str:
    lower = report.lower()
    if "retrieval_gaps:" in lower and "none" not in lower.split("retrieval_gaps:")[-1][:20]:
        return "Mapped evidence connections; flagged topics for deeper search."
    if "what's still missing" in lower:
        return "Mapped cross-STEM connections from retrieved evidence."
    return "Linked evidence across STEM subjects."


# Backward-compatible aliases
run_auditor = run_connector
run_auditor_supplement = run_connector_supplement
