"""BM25 sparse index for hybrid retrieval (persisted alongside Qdrant)."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from rank_bm25 import BM25Okapi

from app.config import get_settings

_TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text) if len(t) > 1]


class BM25Index:
    def __init__(self) -> None:
        self.chunk_ids: list[str] = []
        self.corpus_texts: list[str] = []
        self._bm25: BM25Okapi | None = None

    @property
    def size(self) -> int:
        return len(self.chunk_ids)

    def build(self, chunk_ids: list[str], texts: list[str]) -> None:
        if len(chunk_ids) != len(texts):
            raise ValueError("chunk_ids and texts length mismatch")
        self.chunk_ids = list(chunk_ids)
        self.corpus_texts = list(texts)
        tokenized = [_tokenize(t) for t in texts]
        self._bm25 = BM25Okapi(tokenized) if tokenized else None

    def add(self, chunk_id: str, text: str) -> None:
        self.chunk_ids.append(chunk_id)
        self.corpus_texts.append(text)
        tokenized = [_tokenize(t) for t in self.corpus_texts]
        self._bm25 = BM25Okapi(tokenized)

    def search(self, query: str, top_k: int = 20) -> list[tuple[str, float]]:
        if not self._bm25 or not self.chunk_ids:
            return []
        tokens = _tokenize(query)
        if not tokens:
            return []
        scores = self._bm25.get_scores(tokens)
        ranked = sorted(
            zip(self.chunk_ids, scores),
            key=lambda x: x[1],
            reverse=True,
        )
        return [(cid, float(s)) for cid, s in ranked[:top_k] if s > 0]

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {"chunk_ids": self.chunk_ids, "corpus_texts": self.corpus_texts}
        path.write_text(json.dumps(data), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> BM25Index:
        index = cls()
        if not path.exists():
            return index
        data = json.loads(path.read_text(encoding="utf-8"))
        index.build(data.get("chunk_ids", []), data.get("corpus_texts", []))
        return index


def _resolve_index_path() -> Path:
    settings = get_settings()
    path = Path(settings.bm25_index_path)
    if path.is_absolute():
        return path
    project_root = Path(__file__).resolve().parents[3]
    return project_root / "data" / "index" / "bm25_corpus.json"


@lru_cache
def get_bm25_index() -> BM25Index:
    path = _resolve_index_path()
    return BM25Index.load(path)


def save_bm25_index(index: BM25Index) -> None:
    path = _resolve_index_path()
    index.save(path)
    get_bm25_index.cache_clear()
