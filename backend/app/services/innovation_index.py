"""Index approved innovations into Qdrant for duplicate detection."""

from app.services.novelty import index_approved_innovation as _index

__all__ = ["index_approved_innovation"]


def index_approved_innovation(post_id: str, title: str, content: str, disciplines: list[str]) -> None:
    _index(post_id, title, content, disciplines)
