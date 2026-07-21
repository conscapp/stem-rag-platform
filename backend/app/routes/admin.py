from datetime import datetime, timezone
from secrets import compare_digest
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException

from app.config import get_settings
from app.models.schemas import PostResponse, PostReviewAction, PostStatus
from app.routes.posts import _row_to_post
from app.services.database import get_supabase_client
from app.services.innovation_index import index_approved_innovation

router = APIRouter(prefix="/api/admin", tags=["admin"])


def verify_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    settings = get_settings()
    expected = settings.admin_api_key or ""
    if not expected or not compare_digest(x_admin_key, expected):
        raise HTTPException(status_code=403, detail="Invalid admin key")

@router.get("/pending", response_model=list[PostResponse])
async def list_pending(_: None = Depends(verify_admin)) -> list[PostResponse]:
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    result = (
        client.table("public_posts")
        .select("*")
        .eq("status", PostStatus.pending.value)
        .order("novelty_score", desc=True)
        .execute()
    )
    return [_row_to_post(row) for row in result.data]


@router.post("/posts/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: UUID,
    body: PostReviewAction,
    _: None = Depends(verify_admin),
) -> PostResponse:
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    existing = client.table("public_posts").select("*").eq("id", str(post_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Post not found")

    row = existing.data[0]
    if row.get("status") != PostStatus.pending.value:
        raise HTTPException(status_code=400, detail="Post is not pending review")

    update = {
        "status": PostStatus.approved.value,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "rejection_reason": None,
    }
    if body.review_notes:
        update["review_notes"] = body.review_notes

    result = client.table("public_posts").update(update).eq("id", str(post_id)).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to approve")

    approved = _row_to_post(result.data[0])
    index_approved_innovation(
        post_id=str(approved.id),
        title=approved.title,
        content=approved.content_markdown,
        disciplines=approved.disciplines,
    )
    return approved


@router.post("/posts/{post_id}/reject", response_model=PostResponse)
async def reject_post(
    post_id: UUID,
    body: PostReviewAction,
    _: None = Depends(verify_admin),
) -> PostResponse:
    client = get_supabase_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    existing = client.table("public_posts").select("*").eq("id", str(post_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Post not found")

    if existing.data[0].get("status") != PostStatus.pending.value:
        raise HTTPException(status_code=400, detail="Post is not pending review")

    reason = body.review_notes or "Did not meet innovation standards."
    result = (
        client.table("public_posts")
        .update({
            "status": PostStatus.rejected.value,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason,
        })
        .eq("id", str(post_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to reject")
    return _row_to_post(result.data[0])
