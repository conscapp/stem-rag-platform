"""Domain-aware semantic chunking for premium documents."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

DEFAULT_MAX_CHARS = 1200
DEFAULT_MIN_CHARS = 80
DEFAULT_OVERLAP_CHARS = 120

_SECTION_RE = re.compile(r"^(#{1,4}\s+.+|[A-Z][A-Z0-9 \-/]{8,})$", re.MULTILINE)
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


@dataclass
class TextChunk:
    text: str
    chunk_index: int
    section_heading: str = ""
    char_start: int = 0
    char_end: int = 0
    metadata: dict = field(default_factory=dict)


def _split_paragraphs(text: str) -> list[tuple[str, str]]:
    """Return (section_heading, paragraph) pairs."""
    sections: list[tuple[str, str]] = []
    current_heading = ""
    buffer: list[str] = []

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            if buffer:
                sections.append((current_heading, "\n".join(buffer).strip()))
                buffer = []
            continue
        if stripped.startswith("#") or _SECTION_RE.match(stripped):
            if buffer:
                sections.append((current_heading, "\n".join(buffer).strip()))
                buffer = []
            current_heading = stripped.lstrip("#").strip()
            continue
        buffer.append(stripped)

    if buffer:
        sections.append((current_heading, "\n".join(buffer).strip()))
    return [(h, p) for h, p in sections if len(p) >= 20]


def _split_oversized_paragraph(paragraph: str, max_chars: int, overlap: int) -> list[str]:
    if len(paragraph) <= max_chars:
        return [paragraph]

    sentences = _SENTENCE_END.split(paragraph)
    parts: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        add_len = len(sentence) + (1 if current else 0)
        if current_len + add_len > max_chars and current:
            parts.append(" ".join(current))
            tail = " ".join(current)[-overlap:] if overlap else ""
            current = [tail, sentence] if tail else [sentence]
            current_len = len(" ".join(current))
        else:
            current.append(sentence)
            current_len += add_len

    if current:
        parts.append(" ".join(current))
    return parts


def semantic_chunk_text(
    text: str,
    *,
    max_chars: int = DEFAULT_MAX_CHARS,
    min_chars: int = DEFAULT_MIN_CHARS,
    overlap_chars: int = DEFAULT_OVERLAP_CHARS,
    source_type: str | None = None,
) -> list[TextChunk]:
    """
    Chunk by section/paragraph boundaries, then sentence splits for long paragraphs.
    Patent and technical-report layouts get slightly smaller chunks.
    """
    if source_type == "patent":
        max_chars = min(max_chars, 900)
    elif source_type in ("ntrs", "academic"):
        max_chars = min(max_chars, 1400)

    normalized = re.sub(r"\n{3,}", "\n\n", text.strip())
    paragraphs = _split_paragraphs(normalized)

    raw_parts: list[tuple[str, str]] = []
    for heading, para in paragraphs:
        for piece in _split_oversized_paragraph(para, max_chars, overlap_chars):
            raw_parts.append((heading, piece))

    merged: list[tuple[str, str]] = []
    for heading, piece in raw_parts:
        if merged and len(merged[-1][1]) + len(piece) + 1 <= max_chars:
            prev_h, prev_t = merged[-1]
            merged[-1] = (prev_h or heading, f"{prev_t}\n\n{piece}")
        else:
            merged.append((heading, piece))

    chunks: list[TextChunk] = []
    cursor = 0
    for idx, (heading, body) in enumerate(merged):
        clean = " ".join(body.split())
        if len(clean) < min_chars:
            continue
        if heading:
            chunk_text = f"[{heading}]\n{clean}"
        else:
            chunk_text = clean
        chunks.append(
            TextChunk(
                text=chunk_text,
                chunk_index=idx,
                section_heading=heading,
                char_start=cursor,
                char_end=cursor + len(chunk_text),
            )
        )
        cursor += len(chunk_text)

    return chunks
