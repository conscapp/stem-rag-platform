"""Parse PDFs and markdown into structured documents with metadata."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from pypdf import PdfReader

from app.services.ontology import parse_frontmatter


@dataclass
class DocumentRecord:
    source_path: str
    title: str
    text: str
    source_type: str = "seed"
    source_tier: str = "premium"
    subject: str = "engineering"
    domains: list[str] = field(default_factory=list)
    concepts: list[str] = field(default_factory=list)
    authors: list[str] = field(default_factory=list)
    year: int | None = None
    document_id: str = ""
    outcome: str = "unknown"  # success | failed | inconclusive | unknown
    publisher: str = ""
    extra: dict = field(default_factory=dict)


def _guess_source_type(path: Path) -> str:
    parts = {p.lower() for p in path.parts}
    if "ntrs" in parts or "nasa" in parts:
        return "ntrs"
    if "academic" in parts or "arxiv" in parts:
        return "academic"
    if "patent" in parts or "patents" in parts:
        return "patent"
    if "failed_research" in parts or "failed" in parts:
        return "failed_research"
    return "seed"


def _guess_outcome(meta: dict, source_type: str) -> str:
    if meta.get("outcome"):
        return str(meta["outcome"]).lower()
    if source_type == "failed_research":
        return "failed"
    return "unknown"


def parse_markdown_file(path: Path, root: Path | None = None) -> DocumentRecord:
    raw = path.read_text(encoding="utf-8", errors="replace")
    frontmatter, body = parse_frontmatter(raw)
    rel = str(path.relative_to(root)) if root and path.is_relative_to(root) else str(path)

    source_type = str(frontmatter.get("source_type") or _guess_source_type(path))
    domains = frontmatter.get("domains") or []
    if isinstance(domains, str):
        domains = [domains]
    concepts = frontmatter.get("concepts") or []
    if isinstance(concepts, str):
        concepts = [concepts]
    authors = frontmatter.get("authors") or []
    if isinstance(authors, str):
        authors = [a.strip() for a in authors.split(",") if a.strip()]

    year = frontmatter.get("year")
    try:
        year = int(year) if year is not None else None
    except (TypeError, ValueError):
        year = None

    title = str(frontmatter.get("title") or _extract_title(body) or path.stem.replace("_", " "))
    subject = str(frontmatter.get("subject") or "engineering").lower()

    return DocumentRecord(
        source_path=rel.replace("\\", "/"),
        title=title,
        text=body.strip(),
        source_type=source_type,
        source_tier=str(frontmatter.get("source_tier") or "premium"),
        subject=subject,
        domains=[str(d).lower() for d in domains],
        concepts=[str(c) for c in concepts],
        authors=authors,
        year=year,
        document_id=str(frontmatter.get("document_id") or frontmatter.get("id") or ""),
        outcome=_guess_outcome(frontmatter, source_type),
        publisher=str(frontmatter.get("publisher") or ""),
        extra={k: v for k, v in frontmatter.items() if k not in {"title", "concepts", "domains"}},
    )


def _extract_title(text: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def parse_pdf_file(path: Path, root: Path | None = None) -> DocumentRecord:
    reader = PdfReader(str(path))
    meta = reader.metadata or {}
    title = str(meta.get("/Title") or meta.get("title") or path.stem.replace("_", " "))

    pages: list[str] = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            pages.append(t)
    body = "\n\n".join(pages)

    rel = str(path.relative_to(root)) if root and path.is_relative_to(root) else str(path)
    source_type = _guess_source_type(path)

    # Heuristic document id from NASA reports
    doc_id = ""
    id_match = re.search(r"\b(20\d{6,8})\b", path.stem)
    if id_match:
        doc_id = id_match.group(1)

    return DocumentRecord(
        source_path=rel.replace("\\", "/"),
        title=title,
        text=body,
        source_type=source_type,
        source_tier="premium",
        subject="engineering",
        document_id=doc_id,
        publisher=str(meta.get("/Producer") or ""),
    )
