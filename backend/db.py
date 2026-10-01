"""PostgreSQL bağlantı yönetimi ve şema yardımcıları."""
from contextlib import contextmanager
from typing import Iterator

import psycopg2
from pgvector.psycopg2 import register_vector
from psycopg2 import sql

EMBEDDING_TABLE_SUFFIX = "_embeddings"


class Database:
    """Her işlem için kısa ömürlü bağlantı açan basit bağlantı yöneticisi."""

    def __init__(self, params: dict):
        self._params = params

    @contextmanager
    def connection(self, *, vector: bool = False, autocommit: bool = True) -> Iterator:
        """Bağlantı açar ve iş bitince kapatır.

        Okuma sorgularında autocommit açık tutulur; böylece bir tablodaki hata
        aynı bağlantı üzerindeki sonraki sorguları etkilemez.
        """
        conn = psycopg2.connect(**self._params)
        try:
            conn.autocommit = autocommit
            if vector:
                register_vector(conn)
            yield conn
        finally:
            conn.close()


def embedding_table_name(source_table: str) -> str:
    return f"{source_table}{EMBEDDING_TABLE_SUFFIX}"


def list_embedding_tables(cur) -> list[str]:
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE %s
        ORDER BY table_name
        """,
        (f"%{EMBEDDING_TABLE_SUFFIX}",),
    )
    return [row[0] for row in cur.fetchall()]


def list_source_tables(cur) -> list[str]:
    """Embedding tablosu olmayan, ürün verisi içeren tabloları listeler."""
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE %s
          AND table_name <> 'spatial_ref_sys'
        ORDER BY table_name
        """,
        (f"%{EMBEDDING_TABLE_SUFFIX}",),
    )
    return [row[0] for row in cur.fetchall()]


def table_columns(cur, table: str) -> list[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    )
    return [row[0] for row in cur.fetchall()]


def primary_key_column(cur, table: str) -> str:
    """Tablonun kayıt kimliği olarak kullanılacak sütununu bulur.

    Öncelik sırası: `id` sütunu, birincil anahtar, ilk sütun. Embedding
    tablolarındaki `product_id` değeri bu sütundan üretilir.
    """
    columns = table_columns(cur, table)
    if "id" in columns:
        return "id"

    cur.execute(
        """
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = %s
          AND tc.constraint_type = 'PRIMARY KEY'
        LIMIT 1
        """,
        (table,),
    )
    row = cur.fetchone()
    if row:
        return row[0]
    if columns:
        return columns[0]
    raise ValueError(f"Tablo bulunamadı veya sütunu yok: {table}")


def identifier(name: str) -> sql.Identifier:
    return sql.Identifier(name)
