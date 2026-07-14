from app.agents.orchestrator import run_multi_agent_pipeline
from app.models.schemas import SourceChunk
from app.services.llm import chat_completion
from app.services.prompt import build_messages


async def generate_rag_answer(
    query: str,
    chunks: list[SourceChunk],
    proof_mode: bool = False,
    domain: str | None = None,
) -> tuple[str, str]:
    """Legacy single-call RAG (fallback)."""
    messages = build_messages(query, chunks, domain=domain)
    model = "deepseek-reasoner" if proof_mode else "deepseek-chat"
    answer = await chat_completion(messages, model=model)
    return answer, model


async def generate_multi_agent_answer(
    query: str,
    domain: str,
    subject: str | None = None,
    proof_mode: bool = False,
):
    """Polymath pipeline: Interpreter → Navigator → Connector → Synthesizer."""
    return await run_multi_agent_pipeline(
        query=query,
        domain=domain,
        subject=subject,
        proof_mode=proof_mode,
    )
