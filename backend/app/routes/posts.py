from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request

from app.constants import VALID_DOMAINS, normalize_domain
from app.limiter import limiter
from app.models.schemas import (
    NoveltyCheckRequest,
    NoveltyCheckResponse,
    PostCreate,
    PostResponse,
    PostStatus,
    SimilarInnovationResponse,
)
from app.services.database import get_supabase_client
from app.services.novelty import evaluate_novelty

router = APIRouter(prefix="/api", tags=["posts"])


def _row_to_post(row: dict) -> PostResponse:
    sources = row.get("sources") or []
    if not isinstance(sources, list):
        sources = []
    disciplines = row.get("disciplines") or []
    if not isinstance(disciplines, list):
        disciplines = []

    raw_status = row.get("status") or PostStatus.pending.value
    try:
        status = PostStatus(raw_status)
    except ValueError:
        status = PostStatus.pending

    created_at = row.get("created_at") or datetime.now(timezone.utc)

    return PostResponse(
        id=row["id"],
        author_name=row.get("author_name") or "anonymous",
        title=row.get("title") or "Untitled",
        content_markdown=row.get("content_markdown") or "",
        sources=sources,
        domain=row.get("domain"),
        status=status,
        novelty_score=row.get("novelty_score"),
        disciplines=disciplines,
        innovation_summary=row.get("innovation_summary"),
        rejection_reason=row.get("rejection_reason"),
        created_at=created_at,
        reviewed_at=row.get("reviewed_at"),
    )


@router.post("/posts/check-novelty", response_model=NoveltyCheckResponse)
@limiter.limit("20/hour")
async def check_novelty(request: Request, body: NoveltyCheckRequest) -> NoveltyCheckResponse:
    if body.domain.lower() not in VALID_DOMAINS and normalize_domain(body.domain) not in VALID_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"domain must be one of {sorted(VALID_DOMAINS)}",
        )
    report = evaluate_novelty(body.title, body.content_markdown, body.sources, domain=body.domain)
    return NoveltyCheckResponse(
        novelty_score=report.novelty_score,
        is_duplicate=report.is_duplicate,
        is_cross_disciplinary=report.is_cross_disciplinary,
        disciplines=report.disciplines,
        similar_innovations=[
            SimilarInnovationResponse(post_id=s.post_id, title=s.title, similarity=s.similarity)
            for s in report.similar_innovations
        ],
        rejection_reason=report.rejection_reason,
        recommendation=report.recommendation,
    )


@router.get("/posts", response_model=list[PostResponse])
@limiter.limit("120/hour")
async def list_posts(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[PostResponse]:
    """Public feed: only approved innovations."""
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    try:
        result = (
            client.table("public_posts")
            .select("*")
            .eq("status", PostStatus.approved.value)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = result.data or []
        return [_row_to_post(row) for row in rows]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Portfolio temporarily unavailable: {exc.__class__.__name__}",
        ) from exc


@router.get("/posts/{post_id}", response_model=PostResponse)
@limiter.limit("120/hour")
async def get_post(request: Request, post_id: UUID) -> PostResponse:
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    result = (
        client.table("public_posts")
        .select("*")
        .eq("id", str(post_id))
        .eq("status", PostStatus.approved.value)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Post not found")
    return _row_to_post(result.data[0])


@router.post("/posts", response_model=PostResponse, status_code=201)
@limiter.limit("5/hour")
async def submit_innovation(request: Request, body: PostCreate) -> PostResponse:
    """Submit innovation for review. Rejected immediately if not novel enough."""
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    if body.domain.lower() not in VALID_DOMAINS and normalize_domain(body.domain) not in VALID_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"domain must be one of {sorted(VALID_DOMAINS)}",
        )

    report = evaluate_novelty(body.title, body.content_markdown, body.sources, domain=body.domain)

    if report.recommendation == "reject":
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Innovation not accepted",
                "rejection_reason": report.rejection_reason,
                "novelty_report": report.to_dict(),
            },
        )

    payload = {
        "author_name": body.author_name,
        "title": body.title,
        "content_markdown": body.content_markdown,
        "domain": normalize_domain(body.domain),
        "sources": body.sources,
        "status": PostStatus.pending.value,
        "novelty_score": report.novelty_score,
        "disciplines": report.disciplines,
        "innovation_summary": body.innovation_summary,
        "terms_accepted_at": datetime.now(timezone.utc).isoformat(),
        "terms_version": body.terms_version,
        "publish_consent": body.publish_consent,
    }
    result = client.table("public_posts").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to submit innovation")
    return _row_to_post(result.data[0])
