"""Ürün tabloları için embedding tablolarını oluşturur veya tamamlar.

Kullanım (backend dizininden):
    python -m scripts.create_embeddings                 # tüm tablolarda eksikleri tamamla
    python -m scripts.create_embeddings --table telefon_urunleri
    python -m scripts.create_embeddings --rebuild       # embedding tablolarını sıfırdan üret
"""
import argparse
import logging

from config import load_settings
from db import Database
from services.embedding_indexer import EmbeddingIndexer
from services.embedding_service import EmbeddingService


def main() -> None:
    parser = argparse.ArgumentParser(description="Ürün embedding'lerini oluşturur.")
    parser.add_argument("--table", action="append", dest="tables",
                        help="Yalnızca belirtilen kaynak tabloyu işle (birden çok kez verilebilir)")
    parser.add_argument("--rebuild", action="store_true",
                        help="Mevcut embedding tablolarını silip yeniden oluştur")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = load_settings()

    indexer = EmbeddingIndexer(Database(settings.db_params), EmbeddingService(settings.embedding_model))
    summary = indexer.run(rebuild=args.rebuild, tables=args.tables)

    for table, count in summary.items():
        print(f"{table}: {count} embedding")
    print(f"Toplam: {sum(summary.values())} embedding")


if __name__ == "__main__":
    main()
