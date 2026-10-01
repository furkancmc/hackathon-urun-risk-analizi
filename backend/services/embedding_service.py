"""Metinleri vektöre dönüştüren embedding servisi.

Türkçe ürün metinleri için çok dilli bir Sentence Transformers modeli kullanılır.
Arama sorguları ile indekslenen ürünlerin aynı modelle kodlanması gerekir.
"""
import logging

import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str):
        # Ağır bağımlılık yalnızca servis oluşturulduğunda yüklenir.
        from sentence_transformers import SentenceTransformer

        logger.info("Embedding modeli yükleniyor: %s", model_name)
        self.model_name = model_name
        self._model = SentenceTransformer(model_name)
        self.dimension = self._model.get_sentence_embedding_dimension()
        logger.info("Embedding modeli hazır (boyut: %d)", self.dimension)

    def encode(self, text: str) -> np.ndarray:
        return self._model.encode(text, normalize_embeddings=True)

    def encode_batch(self, texts: list[str], batch_size: int = 32) -> np.ndarray:
        return self._model.encode(texts, batch_size=batch_size, normalize_embeddings=True)
