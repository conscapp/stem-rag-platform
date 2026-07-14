from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SourceChunk(BaseModel):
    index: int
    text: str
    source_file: str
    subject: str | None = None
    chunk_index: int | None = None
    score: float | None = None
    concepts: list[str] = Field(default_factory=list)
    related_subjects: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000)
    domain: str = Field(..., description="aerospace, nanotechnology, or clean_energy")
    subject: str | None = Field(None, description="physics, chemistry, math, engineering")
    proof_mode: bool = Field(False, description="Use deepseek-reasoner for step-by-step proofs")


class AgentStep(BaseModel):
    agent: str
    role: str
    summary: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    model: str
    agents: list[AgentStep] = Field(default_factory=list)
    interpreter_restatement: str | None = None


class PostStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class NoveltyCheckRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content_markdown: str = Field(..., min_length=10)
    domain: str = Field(..., description="aerospace, nanotechnology, or clean_energy")
    sources: list[dict[str, Any]] = Field(default_factory=list)


class SimilarInnovationResponse(BaseModel):
    post_id: str
    title: str
    similarity: float


class NoveltyCheckResponse(BaseModel):
    novelty_score: float
    is_duplicate: bool
    is_cross_disciplinary: bool
    disciplines: list[str]
    similar_innovations: list[SimilarInnovationResponse]
    rejection_reason: str | None = None
    recommendation: str


class PostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content_markdown: str = Field(..., min_length=10)
    author_name: str = Field("anonymous", max_length=100)
    domain: str = Field(..., description="aerospace, nanotechnology, or clean_energy")
    sources: list[dict[str, Any]] = Field(default_factory=list)
    innovation_summary: str | None = Field(
        None,
        max_length=500,
        description="One sentence: what is new about this design?",
    )
    terms_accepted: bool = Field(..., description="User accepted Terms and Privacy Policy")
    terms_version: str = Field(..., min_length=1, max_length=32)
    publish_consent: bool = Field(
        ...,
        description="User consents to public portfolio publication if approved",
    )

    @field_validator("terms_accepted")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the Terms of Use and Privacy Policy")
        return v

    @field_validator("publish_consent")
    @classmethod
    def must_consent_to_publish(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must consent to public publication if the innovation is approved")
        return v


class PostResponse(BaseModel):
    id: UUID
    author_name: str
    title: str
    content_markdown: str
    sources: list[dict[str, Any]]
    domain: str | None = None
    status: PostStatus = PostStatus.pending
    novelty_score: float | None = None
    disciplines: list[str] = Field(default_factory=list)
    innovation_summary: str | None = None
    rejection_reason: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None


class PostReviewAction(BaseModel):
    review_notes: str | None = Field(None, max_length=1000)


class HealthResponse(BaseModel):
    status: str
    qdrant: str
    supabase: str
