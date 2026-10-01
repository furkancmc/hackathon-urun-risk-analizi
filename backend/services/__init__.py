"""Uygulama servisleri ve bunların oluşturulması."""
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from config import Settings
    from services.embedding_indexer import EmbeddingIndexer
    from services.gemini_service import GeminiService
    from services.rag_service import RAGService

logger = logging.getLogger(__name__)


@dataclass
class Services:
    rag: "RAGService | None" = None
    gemini: "GeminiService | None" = None
    indexer: "EmbeddingIndexer | None" = None


def build_services(settings: "Settings") -> Services:
    """Servisleri oluşturur. Başlatılamayan servis None olarak bırakılır ve
    ilgili endpoint'ler 503 döndürür; diğer servisler çalışmaya devam eder."""
    from db import Database
    from services.embedding_indexer import EmbeddingIndexer
    from services.embedding_service import EmbeddingService
    from services.gemini_service import GeminiService
    from services.rag_service import RAGService

    services = Services()
    db = Database(settings.db_params)

    try:
        embedder = EmbeddingService(settings.embedding_model)
        services.rag = RAGService(db, embedder, settings.search_min_similarity)
        services.indexer = EmbeddingIndexer(db, embedder)
    except Exception:
        logger.exception("Embedding modeli yüklenemedi; arama servisleri devre dışı")

    try:
        services.gemini = GeminiService(settings.gemini_api_key, settings.gemini_model)
    except Exception:
        logger.exception("Gemini servisi başlatılamadı; AI özellikleri devre dışı")

    return services
