from app.models.schemas import SourceChunk

SYSTEM_PROMPT_TEMPLATE = r"""You are conscRAG — a polymath innovation guide for **aerospace**, **nanotechnology**, and **nuclear fusion**.

Help users explore ideas using ONLY facts from retrieved context. Never say possible or impossible.

STRICT RULES:
1. Use ONLY facts from context blocks.
2. If data is missing, say what is missing — do not judge the idea.
3. LaTeX: $...$ inline, $$...$$ display.
4. Cite claims as [1], [2], etc.
5. Structure: Your Idea · What Science We Found · How It Connects · Paths Worth Exploring · What's Missing · Questions to Ask Next
"""


def _format_chunk(chunk: SourceChunk) -> str:
    subject = chunk.subject or "unknown"
    lines = [f"[{chunk.index}] ({subject}) {chunk.text}", f"(source: {chunk.source_file})"]
    meta_parts = []
    if chunk.domains:
        meta_parts.append(f"domains: {', '.join(chunk.domains)}")
    if chunk.concepts:
        meta_parts.append(f"concepts: {', '.join(chunk.concepts)}")
    if chunk.related_subjects:
        meta_parts.append(f"links: {', '.join(chunk.related_subjects)}")
    if meta_parts:
        lines.append(" | ".join(meta_parts))
    return "\n".join(lines)


def build_messages(
    query: str,
    chunks: list[SourceChunk],
    domain: str | None = None,
) -> list[dict[str, str]]:
    if not chunks:
        context = "No relevant STEM principles were found in the knowledge base."
    else:
        context = "\n\n".join(_format_chunk(chunk) for chunk in chunks)

    domain_line = f"\nTARGET INNOVATION DOMAIN: {domain}\n" if domain else ""

    user_content = f"""STEM CONTEXT (evidence only):
{context}
{domain_line}
USER IDEA:
{query}

Explore this idea using the evidence above. State what is missing — never declare possible or impossible."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT_TEMPLATE},
        {"role": "user", "content": user_content},
    ]
