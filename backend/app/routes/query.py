from fastapi import APIRouter, HTTPException, Request

from app.constants import VALID_DOMAINS, VALID_SUBJECTS, normalize_domain
from app.limiter import limiter
from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag import generate_multi_agent_answer

router = APIRouter(prefix="/api", tags=["query"])


@router.post("/query", response_model=QueryResponse)
@limiter.limit("10/hour")
async def query_rag(request: Request, body: QueryRequest) -> QueryResponse:
    domain = normalize_domain(body.domain)
    subject = body.subject.lower() if body.subject else None

    if domain not in VALID_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"domain must be one of {sorted(VALID_DOMAINS)}",
        )
    if subject and subject not in VALID_SUBJECTS:
        raise HTTPException(
            status_code=400,
            detail=f"subject must be one of {sorted(VALID_SUBJECTS)}",
        )

    answer, model, chunks, trace, restatement = await generate_multi_agent_answer(
        body.query,
        domain=domain,
        subject=subject,
        proof_mode=body.proof_mode,
    )

    return QueryResponse(
        answer=answer,
        sources=chunks,
        model=model,
        agents=trace,
        interpreter_restatement=restatement,
    )
