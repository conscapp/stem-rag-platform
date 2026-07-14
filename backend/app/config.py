from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    collection_name: str = "stem_vectors"
    innovation_collection_name: str = "innovation_vectors"

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"

    supabase_url: str = ""
    supabase_service_key: str = ""

    embedding_model: str = "BAAI/bge-large-en-v1.5"
    embedding_query_prefix: bool = True
    warm_embedding_on_startup: bool = False
    top_k: int = 5
    chunk_size: int = 1200
    chunk_overlap: int = 120
    max_output_tokens: int = 3000

    # Hybrid retrieval (dense + BM25 via reciprocal rank fusion)
    hybrid_search_enabled: bool = True
    hybrid_fetch_multiplier: int = 4
    hybrid_rrf_k: int = 60
    bm25_index_path: str = "data/index/bm25_corpus.json"

    agent_temperature: float = 0.05
    auditor_max_tokens: int = 1200
    architect_max_tokens: int = 2000
    debate_max_tokens: int = 500
    enable_supplemental_retrieval: bool = True
    enable_agent_debate: bool = False
    max_debate_rounds: int = 1
    max_retrieval_gaps: int = 3

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Preview / custom domains (Starlette regex). Example: https://.*\\.vercel\\.app
    cors_origin_regex: str = ""

    # Innovation / novelty gate
    admin_api_key: str = ""
    novelty_duplicate_threshold: float = 0.88
    novelty_auto_reject_score: float = 35.0
    novelty_min_disciplines: int = 2

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
