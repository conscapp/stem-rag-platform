"""Interpreter Agent — plain intuition to technical search language."""

from __future__ import annotations

import re

from app.agents.state import PipelineState
from app.config import get_settings
from app.constants import DOMAIN_LABELS
from app.services.llm import chat_completion_tight

INTERPRETER_SYSTEM = r"""You are the conscRAG Interpreter Agent.

The user writes a plain idea, question, hunch, or intuition — often without STEM vocabulary.
Your job is to translate it into language our retrieval system can search.

Output EXACTLY this format (no extra sections):

TECHNICAL_QUERY: <one paragraph of precise STEM search text for vector retrieval>
SEARCH_TERMS: <comma-separated list of 3-6 ontology-friendly terms>
RESTATEMENT: <one friendly sentence telling the user how you understood their idea>

RULES:
- Do not judge whether the idea is possible or impossible.
- Expand lay phrases (e.g. "room temperature nuclear" → fusion plasma temperature, cold fusion approaches, isotope choice).
- Domain context guides emphasis but cross-STEM links are welcome.
- Keep RESTATEMENT accessible — no jargon wall.
"""

TECHNICAL_QUERY_RE = re.compile(r"TECHNICAL_QUERY:\s*(.+?)(?=SEARCH_TERMS:|$)", re.DOTALL | re.IGNORECASE)
SEARCH_TERMS_RE = re.compile(r"SEARCH_TERMS:\s*(.+?)(?=RESTATEMENT:|$)", re.DOTALL | re.IGNORECASE)
RESTATEMENT_RE = re.compile(r"RESTATEMENT:\s*(.+?)$", re.DOTALL | re.IGNORECASE)


def _parse_interpreter_output(text: str) -> tuple[str, list[str], str]:
    tq = TECHNICAL_QUERY_RE.search(text)
    st = SEARCH_TERMS_RE.search(text)
    rs = RESTATEMENT_RE.search(text)

    technical_query = tq.group(1).strip() if tq else text.strip()
    raw_terms = st.group(1).strip() if st else ""
    terms = [t.strip() for t in re.split(r"[,;]", raw_terms) if t.strip()][:6]
    restatement = rs.group(1).strip() if rs else technical_query[:200]

    return technical_query, terms, restatement


async def run_interpreter(state: PipelineState) -> PipelineState:
    settings = get_settings()
    domain_label = DOMAIN_LABELS.get(state.domain, state.domain)

    user_content = f"""DOMAIN: {domain_label}
USER INPUT (plain language):
{state.query}"""

    model = "deepseek-reasoner" if state.proof_mode else "deepseek-chat"
    raw = await chat_completion_tight(
        [{"role": "system", "content": INTERPRETER_SYSTEM}, {"role": "user", "content": user_content}],
        model=model,
        max_tokens=600,
    )

    technical_query, search_terms, restatement = _parse_interpreter_output(raw)
    state.technical_query = technical_query
    state.search_terms = search_terms
    state.user_restatement = restatement

    terms_preview = ", ".join(search_terms[:4]) if search_terms else "general STEM"
    state.add_trace(
        agent="Interpreter",
        role="Plain → Technical",
        summary=f"Understood: {restatement[:120]}{'…' if len(restatement) > 120 else ''} · Terms: {terms_preview}",
    )
    return state
