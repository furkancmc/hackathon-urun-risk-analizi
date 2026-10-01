"""Ürün arama (RAG retrieval katmanı) ve ürün verisi erişimi.

Arama, pgvector üzerinde kosinüs mesafesi ile yapılır. Her ürün kategorisi
ayrı bir kaynak tabloda tutulur ve her birinin `<tablo>_embeddings` adında
bir vektör tablosu bulunur.
"""
import logging
from typing import Any

from psycopg2 import sql

from db import (
    EMBEDDING_TABLE_SUFFIX,
    Database,
    embedding_table_name,
    identifier,
    list_embedding_tables,
    primary_key_column,
    table_columns,
)
from services.embedding_service import EmbeddingService
from services.risk_scoring import (
    build_risk_analysis,
    neutral_risk_analysis,
    quick_risk_score,
    to_float,
)

logger = logging.getLogger(__name__)

NAME_COLUMNS = ("name", "product_name", "title")


class RAGService:
    def __init__(self, db: Database, embedder: EmbeddingService, min_similarity: float = 0.05):
        self.db = db
        self.embedder = embedder
        self.min_similarity = min_similarity

    # ------------------------------------------------------------------
    # Tablo keşfi
    # ------------------------------------------------------------------
    def get_available_tables(self) -> list[str]:
        """Mevcut embedding tablolarının adları."""
        with self.db.connection() as conn, conn.cursor() as cur:
            return list_embedding_tables(cur)

    def get_source_tables(self) -> list[str]:
        """Aranabilir (embedding tablosu bulunan) ürün tabloları."""
        return [t[: -len(EMBEDDING_TABLE_SUFFIX)] for t in self.get_available_tables()]

    def _require_source_table(self, source_table: str) -> None:
        if source_table not in self.get_source_tables():
            raise ValueError(f"Geçersiz kaynak tablo: {source_table}")

    # ------------------------------------------------------------------
    # Arama
    # ------------------------------------------------------------------
    def search_products(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """Sorguya anlamsal olarak en yakın ürünleri tüm kategorilerde arar."""
        query_vector = self.embedder.encode(query)
        results: list[dict[str, Any]] = []

        with self.db.connection(vector=True) as conn, conn.cursor() as cur:
            for table in list_embedding_tables(cur):
                try:
                    cur.execute(
                        sql.SQL(
                            """
                            SELECT product_id, product_name, combined_text,
                                   1 - (embedding <=> %s) AS similarity
                            FROM {table}
                            WHERE embedding IS NOT NULL
                            ORDER BY embedding <=> %s
                            LIMIT %s
                            """
                        ).format(table=identifier(table)),
                        (query_vector, query_vector, limit),
                    )
                except Exception:
                    logger.exception("Arama sırasında %s tablosu okunamadı", table)
                    continue

                source_table = table[: -len(EMBEDDING_TABLE_SUFFIX)]
                for product_id, product_name, combined_text, similarity in cur.fetchall():
                    if similarity is None or similarity < self.min_similarity:
                        continue
                    results.append({
                        "product_id": product_id,
                        "product_name": product_name,
                        "combined_text": combined_text,
                        "similarity": float(similarity),
                        "source_table": source_table,
                    })

        results.sort(key=lambda r: r["similarity"], reverse=True)
        return results[:limit]

    def search_with_filters(self, query: str, filters: dict[str, Any] | None = None,
                            limit: int = 10) -> list[dict[str, Any]]:
        """Anlamsal arama sonuçlarını ürün detaylarıyla zenginleştirir ve filtreler.

        Desteklenen filtreler: price_min, price_max, rating_min, brands (liste).
        """
        filters = filters or {}
        candidates = self.search_products(query, limit=limit * 3 if filters else limit)
        if not candidates:
            return []

        results = []
        with self.db.connection() as conn, conn.cursor() as cur:
            for candidate in candidates:
                try:
                    details = self._fetch_product(cur, candidate["product_id"], candidate["source_table"])
                except Exception:
                    logger.exception("Ürün detayı alınamadı: %s", candidate["product_id"])
                    details = None

                if filters and (details is None or not _passes_filters(details, filters)):
                    continue

                candidate["product_details"] = details or {}
                results.append(candidate)
                if len(results) >= limit:
                    break

        return results

    # ------------------------------------------------------------------
    # Ürün detayı ve risk analizi
    # ------------------------------------------------------------------
    def get_product_details(self, product_id: str, source_table: str) -> dict[str, Any] | None:
        self._require_source_table(source_table)
        with self.db.connection() as conn, conn.cursor() as cur:
            return self._fetch_product(cur, product_id, source_table)

    def _fetch_product(self, cur, product_id: str, source_table: str) -> dict[str, Any] | None:
        """Ürünün kaynak tablodaki tüm sütunlarını ve risk analizini döndürür.

        Kayıt kaynak tabloda yoksa embedding tablosundaki özet bilgiye düşülür.
        """
        pk = primary_key_column(cur, source_table)
        cur.execute(
            sql.SQL("SELECT * FROM {table} WHERE {pk}::text = %s LIMIT 1").format(
                table=identifier(source_table), pk=identifier(pk)
            ),
            (str(product_id),),
        )
        row = cur.fetchone()
        if row:
            product = dict(zip([col.name for col in cur.description], row))
            product.pop("embedding", None)
            if not product.get("name"):
                product["name"] = next((product[c] for c in NAME_COLUMNS if product.get(c)), None)
            product["risk_analysis"] = self._risk_analysis(cur, source_table, product)
            return product

        cur.execute(
            sql.SQL(
                """
                SELECT product_id, product_name, combined_text, created_at
                FROM {table}
                WHERE product_id = %s
                LIMIT 1
                """
            ).format(table=identifier(embedding_table_name(source_table))),
            (str(product_id),),
        )
        row = cur.fetchone()
        if not row:
            return None

        return {
            "product_id": row[0],
            "name": row[1],
            "description": row[2],
            "created_at": row[3],
            "source": "embedding_table",
            "risk_analysis": neutral_risk_analysis(
                "Kaynak tabloda kayıt bulunamadı; risk skorları varsayılan değerlerdir."
            ),
        }

    def _risk_analysis(self, cur, source_table: str, product: dict[str, Any]) -> dict[str, Any]:
        price = to_float(product.get("price"))
        rating = to_float(product.get("rating"))
        brand = str(product.get("brand") or "").strip()
        table = identifier(source_table)

        avg_price = None
        if "price" in product:
            try:
                cur.execute(sql.SQL("SELECT AVG(price) FROM {t} WHERE price > 0").format(t=table))
                avg_price = to_float(cur.fetchone()[0], None)
            except Exception:
                logger.warning("Kategori ortalama fiyatı hesaplanamadı: %s", source_table)

        brand_count = None
        if brand and "brand" in product:
            try:
                cur.execute(
                    sql.SQL("SELECT COUNT(*) FROM {t} WHERE LOWER(brand) = LOWER(%s)").format(t=table),
                    (brand,),
                )
                brand_count = cur.fetchone()[0]
            except Exception:
                logger.warning("Marka rekabet sayısı hesaplanamadı: %s", source_table)

        return build_risk_analysis(price, rating, avg_price, brand_count)

    # ------------------------------------------------------------------
    # Dashboard verileri
    # ------------------------------------------------------------------
    def get_table_stats(self) -> dict[str, dict[str, Any]]:
        """Her kategori için ürün sayısı, embedding kapsamı ve ortalamalar."""
        stats: dict[str, dict[str, Any]] = {}
        with self.db.connection() as conn, conn.cursor() as cur:
            for emb_table in list_embedding_tables(cur):
                source_table = emb_table[: -len(EMBEDDING_TABLE_SUFFIX)]
                columns = table_columns(cur, source_table)
                if not columns:
                    logger.warning("Kaynak tablo bulunamadı: %s", source_table)
                    continue
                try:
                    cur.execute(sql.SQL("SELECT COUNT(*) FROM {t}").format(t=identifier(emb_table)))
                    embedding_count = cur.fetchone()[0]

                    avg_price = sql.SQL("AVG(CASE WHEN price > 0 THEN price END)") \
                        if "price" in columns else sql.SQL("NULL")
                    avg_rating = sql.SQL("AVG(CASE WHEN rating > 0 THEN rating END)") \
                        if "rating" in columns else sql.SQL("NULL")
                    cur.execute(
                        sql.SQL("SELECT COUNT(*), {p}, {r} FROM {t}").format(
                            p=avg_price, r=avg_rating, t=identifier(source_table)
                        )
                    )
                    total, price, rating = cur.fetchone()
                except Exception:
                    logger.exception("İstatistik hesaplanamadı: %s", source_table)
                    continue

                if not total:
                    continue
                stats[source_table] = {
                    "total_products": total,
                    "embeddings_count": embedding_count,
                    "avg_price": to_float(price),
                    "avg_rating": to_float(rating),
                    "embedding_coverage": round(embedding_count / total * 100, 2),
                }
        return stats

    def get_all_brands(self) -> list[str]:
        brands: set[str] = set()
        with self.db.connection() as conn, conn.cursor() as cur:
            for source_table in self._tables_with_column(cur, "brand"):
                try:
                    cur.execute(
                        sql.SQL(
                            """
                            SELECT DISTINCT brand FROM {t}
                            WHERE brand IS NOT NULL AND brand <> '' AND LOWER(brand) <> 'null'
                            """
                        ).format(t=identifier(source_table))
                    )
                    brands.update(row[0] for row in cur.fetchall())
                except Exception:
                    logger.exception("Markalar alınamadı: %s", source_table)
        return sorted(brands)

    def get_sales_data_for_dashboard(self, per_table: int = 10) -> list[dict[str, Any]]:
        """Her kategoriden en yüksek fiyatlı ürünler ve hızlı risk skorları."""
        wanted = ("brand", "price", "rating", "seller_name", "stock_status", "availability")
        sales: list[dict[str, Any]] = []

        with self.db.connection() as conn, conn.cursor() as cur:
            for source_table in self._tables_with_column(cur, "price"):
                columns = table_columns(cur, source_table)
                name_col = next((c for c in NAME_COLUMNS if c in columns), None)
                selected = [c for c in (name_col, *wanted) if c and c in columns]
                try:
                    cur.execute(
                        sql.SQL(
                            "SELECT {cols} FROM {t} WHERE price > 0 ORDER BY price DESC LIMIT %s"
                        ).format(
                            cols=sql.SQL(", ").join(identifier(c) for c in selected),
                            t=identifier(source_table),
                        ),
                        (per_table,),
                    )
                    rows = [dict(zip(selected, row)) for row in cur.fetchall()]
                except Exception:
                    logger.exception("Satış verisi alınamadı: %s", source_table)
                    continue

                for row in rows:
                    price = to_float(row.get("price"))
                    rating = to_float(row.get("rating"))
                    sales.append({
                        "product_name": (row.get(name_col) if name_col else None) or "Bilinmeyen Ürün",
                        "brand": row.get("brand") or "Bilinmeyen Marka",
                        "price": price,
                        "rating": rating,
                        "seller": row.get("seller_name") or "Bilinmeyen Satıcı",
                        "stock_status": row.get("stock_status") or "Bilinmiyor",
                        "availability": row.get("availability") or "Bilinmiyor",
                        "source_table": source_table,
                        "risk_score": quick_risk_score(price, rating),
                    })

        sales.sort(key=lambda item: item["price"], reverse=True)
        return sales

    def _tables_with_column(self, cur, column: str) -> list[str]:
        tables = []
        for emb_table in list_embedding_tables(cur):
            source_table = emb_table[: -len(EMBEDDING_TABLE_SUFFIX)]
            if column in table_columns(cur, source_table):
                tables.append(source_table)
        return tables


def _passes_filters(details: dict[str, Any], filters: dict[str, Any]) -> bool:
    price = to_float(details.get("price"), None)
    rating = to_float(details.get("rating"), None)

    if "price_min" in filters and price is not None and price < float(filters["price_min"]):
        return False
    if "price_max" in filters and price is not None and price > float(filters["price_max"]):
        return False
    if "rating_min" in filters and rating is not None and rating < float(filters["rating_min"]):
        return False

    brands = filters.get("brands")
    if brands:
        if isinstance(brands, str):
            brands = [brands]
        wanted = {str(b).strip().lower() for b in brands}
        if str(details.get("brand") or "").strip().lower() not in wanted:
            return False

    return True
