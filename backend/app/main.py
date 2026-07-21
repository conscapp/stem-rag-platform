from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.limiter import limiter
from app.models.schemas import HealthResponse
from app.routes import admin, posts, query
from app.services.database import get_supabase_client
from app.services.retriever import get_qdrant_client
from app.services.startup import ensure_bm25_ready, warm_embedding_model

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    warm_embedding_model()
    ensure_bm25_ready()
    yield


app = FastAPI(
    title="conscRAG API",
    description="conscRAG API — The consc company · aerospace, nanotechnology, nuclear fusion",
    version="0.2.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_kwargs: dict = {
    "allow_origins": settings.cors_origin_list,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.cors_origin_regex:
    _cors_kwargs["allow_origin_regex"] = settings.cors_origin_regex

app.add_middleware(CORSMiddleware, **_cors_kwargs)

app.include_router(query.router)
app.include_router(posts.router)
app.include_router(admin.router)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    qdrant_status = "ok"
    try:
        client = get_qdrant_client()
        client.get_collections()
    except Exception:
        qdrant_status = "error"

    supabase_status = "not_configured"
    client = get_supabase_client()
    if client is not None:
        try:
            client.table("public_posts").select("id").limit(1).execute()
            supabase_status = "ok"
        except Exception:
            supabase_status = "error"

    overall = "ok"
    if qdrant_status != "ok" or supabase_status == "error":
        overall = "degraded"
    if supabase_status == "not_configured":
        overall = "degraded"

    return HealthResponse(
        status=overall,
        qdrant=qdrant_status,
        supabase=supabase_status,
    )


@app.get("/")
async def root():
    return {"message": "conscRAG API", "docs": "/docs"}
