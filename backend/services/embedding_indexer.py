"""Ürün tablolarından vektör (embedding) tablolarını üreten indeksleyici.

Her kaynak tablo için ürünün metin ve analiz sütunları tek bir dokümanda
birleştirilir, embedding modeliyle kodlanır ve `<tablo>_embeddings`
tablosuna yazılır. Varsayılan olarak yalnızca eksik kayıtlar işlenir.
"""
import logging
import threading
from typing import Any

from psycopg2 import sql
from psycopg2.extras import execute_values

from db import (
    Database,
    embedding_table_name,
    identifier,
    list_source_tables,
    primary_key_column,
    table_columns,
)
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

# Ürünü tanımlayan temel metin sütunları (öncelik sırasıyla).
PRIMARY_TEXT_COLUMNS = (
    "product_name", "name", "title", "brand", "category", "description",
    "seller_description", "technical_summary", "search_keywords",
)

# Veri hazırlama aşamasında üretilen satıcı analizi sütunları.
ANALYSIS_TEXT_COLUMNS = (
    "seller_summary", "executive_summary", "profitability_analysis", "sales_performance",
    "competitive_positioning", "inventory_strategy", "pricing_opportunities",
    "customer_insights", "marketing_angles", "risk_management", "operational_advice",
    "financial_projections", "seller_action_plan",
)

NAME_COLUMNS = ("product_name", "name", "title")
MAX_FIELD_CHARS = 500
MAX_DOCUMENT_CHARS = 4000


def build_document(row: dict[str, Any], text_columns: list[str]) -> tuple[str, str]:
    """Bir ürün satırından (ürün adı, birleşik metin) çifti üretir."""
    parts = []
    product_name = ""
    for column in text_columns:
        value = row.get(column)
        if value is None:
            continue
        text = str(value).strip()
        if not text or text.lower() in {"none", "null"}:
            continue
        text = text[:MAX_FIELD_CHARS]
        parts.append(f"{column}: {text}")
        if not product_name and column in NAME_COLUMNS:
            product_name = text[:200]
    return product_name, " | ".join(parts)[:MAX_DOCUMENT_CHARS]


class EmbeddingIndexer:
    def __init__(self, db: Database, embedder: EmbeddingService, batch_size: int = 64):
        self.db = db
        self.embedder = embedder
        self.batch_size = batch_size
        self._lock = threading.Lock()

    @property
    def is_running(self) -> bool:
        return self._lock.locked()

    def start_in_background(self, rebuild: bool = False) -> bool:
        """İndekslemeyi arka planda başlatır. Zaten çalışıyorsa False döner."""
        if not self._lock.acquire(blocking=False):
            return False

        def worker():
            try:
                self._run_all(rebuild)
            except Exception:
                logger.exception("Arka plan embedding işlemi başarısız oldu")
            finally:
                self._lock.release()

        threading.Thread(target=worker, name="embedding-indexer", daemon=True).start()
        return True

    def run(self, rebuild: bool = False, tables: list[str] | None = None) -> dict[str, int]:
        with self._lock:
            return self._run_all(rebuild, tables)

    def _run_all(self, rebuild: bool, tables: list[str] | None = None) -> dict[str, int]:
        with self.db.connection() as conn, conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            source_tables = tables or list_source_tables(cur)

        summary = {}
        for table in source_tables:
            try:
                summary[table] = self.index_table(table, rebuild=rebuild)
            except Exception:
                logger.exception("%s tablosu indekslenemedi", table)
                summary[table] = 0
        logger.info("Embedding özeti: %s", summary)
        return summary

    def index_table(self, table: str, rebuild: bool = False) -> int:
        emb_table = embedding_table_name(table)

        with self.db.connection(vector=True, autocommit=False) as conn, conn.cursor() as cur:
            columns = table_columns(cur, table)
            text_columns = [c for c in (*PRIMARY_TEXT_COLUMNS, *ANALYSIS_TEXT_COLUMNS) if c in columns]
            if not text_columns:
                logger.warning("%s tablosunda metin sütunu bulunamadı, atlanıyor", table)
                return 0

            if rebuild:
                cur.execute(sql.SQL("DROP TABLE IF EXISTS {t}").format(t=identifier(emb_table)))
            self._ensure_embedding_table(cur, emb_table)
            conn.commit()

            pk = primary_key_column(cur, table)
            select_cols = sql.SQL(", ").join(identifier(c) for c in [pk, *text_columns])
            cur.execute(
                sql.SQL(
                    """
                    SELECT {cols} FROM {src} s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM {emb} e WHERE e.product_id = s.{pk}::text
                    )
                    ORDER BY s.{pk}
                    """
                ).format(cols=select_cols, src=identifier(table), emb=identifier(emb_table),
                         pk=identifier(pk)),
            )
            pending = [dict(zip([pk, *text_columns], row)) for row in cur.fetchall()]
            logger.info("%s: %d kayıt indekslenecek", table, len(pending))

            processed = 0
            for start in range(0, len(pending), self.batch_size):
                batch = pending[start:start + self.batch_size]
                documents = []
                for row in batch:
                    name, text = build_document(row, text_columns)
                    if text:
                        documents.append((str(row[pk]), name or str(row[pk]), text))
                if not documents:
                    continue

                vectors = self.embedder.encode_batch([doc[2] for doc in documents])
                execute_values(
                    cur,
                    sql.SQL(
                        """
                        INSERT INTO {emb} (id, product_id, product_name, combined_text, embedding)
                        VALUES %s
                        ON CONFLICT (id) DO NOTHING
                        """
                    ).format(emb=identifier(emb_table)).as_string(cur),
                    [
                        (f"{table}_{product_id}", product_id, name, text, vector)
                        for (product_id, name, text), vector in zip(documents, vectors)
                    ],
                )
                conn.commit()
                processed += len(documents)
                logger.info("%s: %d/%d kayıt işlendi", table, processed, len(pending))

            return processed

    def _ensure_embedding_table(self, cur, emb_table: str) -> None:
        dimension = int(self.embedder.dimension)
        cur.execute(
            sql.SQL(
                """
                CREATE TABLE IF NOT EXISTS {emb} (
                    id            VARCHAR(255) PRIMARY KEY,
                    product_id    VARCHAR(255) NOT NULL,
                    product_name  TEXT,
                    combined_text TEXT,
                    embedding     VECTOR({dim}),
                    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            ).format(emb=identifier(emb_table), dim=sql.Literal(dimension))
        )
        cur.execute(
            sql.SQL("CREATE INDEX IF NOT EXISTS {idx} ON {emb} (product_id)").format(
                idx=identifier(f"{emb_table}_product_id_idx"), emb=identifier(emb_table)
            )
        )
        cur.execute(
            sql.SQL(
                "CREATE INDEX IF NOT EXISTS {idx} ON {emb} USING hnsw (embedding vector_cosine_ops)"
            ).format(idx=identifier(f"{emb_table}_embedding_idx"), emb=identifier(emb_table))
        )
