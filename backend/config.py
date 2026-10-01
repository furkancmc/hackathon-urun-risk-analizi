"""Uygulama yapılandırması.

Tüm ayarlar ortam değişkenlerinden (veya kök dizindeki .env dosyasından) okunur.
Örnek değerler için `.env.example` dosyasına bakın.
"""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    database_url: str | None
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str

    gemini_api_key: str | None
    gemini_model: str

    embedding_model: str
    search_min_similarity: float

    api_host: str
    api_port: int
    debug: bool
    cors_origins: str

    @property
    def db_params(self) -> dict:
        """psycopg2.connect() için bağlantı parametreleri."""
        if self.database_url:
            return {"dsn": self.database_url}
        return {
            "host": self.db_host,
            "port": self.db_port,
            "dbname": self.db_name,
            "user": self.db_user,
            "password": self.db_password,
        }


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_settings() -> Settings:
    load_dotenv(PROJECT_ROOT / ".env")
    return Settings(
        database_url=os.getenv("DATABASE_URL") or None,
        db_host=os.getenv("DB_HOST", "localhost"),
        db_port=int(os.getenv("DB_PORT", "5432")),
        db_name=os.getenv("DB_NAME", "urun_risk_analiz"),
        db_user=os.getenv("DB_USER", "postgres"),
        db_password=os.getenv("DB_PASSWORD", ""),
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        embedding_model=os.getenv(
            "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        ),
        search_min_similarity=float(os.getenv("SEARCH_MIN_SIMILARITY", "0.05")),
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "5000")),
        debug=_env_bool("FLASK_DEBUG"),
        cors_origins=os.getenv("CORS_ORIGINS", "*"),
    )
