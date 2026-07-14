"""Shared state passed between conscRAG agents."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.schemas import SourceChunk


@dataclass
class AgentTrace:
    agent: str
    role: str
    summary: str


@dataclass
class PipelineState:
    query: str
    domain: str
    subject: str | None = None
    proof_mode: bool = False

    # Interpreter output
    technical_query: str = ""
    search_terms: list[str] = field(default_factory=list)
    user_restatement: str = ""

    matched_concepts: list[str] = field(default_factory=list)
    expanded_subjects: list[str] = field(default_factory=list)
    chunks: list[SourceChunk] = field(default_factory=list)
    evidence_digest: str = ""

    audit_report: str = ""
    supplemental_audit: str = ""

    draft_answer: str = ""
    final_answer: str = ""
    model: str = "deepseek-chat"

    trace: list[AgentTrace] = field(default_factory=list)

    def add_trace(self, agent: str, role: str, summary: str) -> None:
        self.trace.append(AgentTrace(agent=agent, role=role, summary=summary))

    @property
    def full_audit(self) -> str:
        if self.supplemental_audit:
            return f"{self.audit_report}\n\n{self.supplemental_audit}"
        return self.audit_report

    @property
    def retrieval_query(self) -> str:
        return self.technical_query or self.query
