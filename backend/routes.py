"""REST API endpoint'leri."""
import logging

from flask import Blueprint, current_app, jsonify, request
from werkzeug.exceptions import HTTPException

from services import Services
from services.gemini_service import GeminiError
from services.prompts import build_chat_context, build_product_context

logger = logging.getLogger(__name__)

api = Blueprint("api", __name__, url_prefix="/api")

MAX_RESULTS = 50
DEFAULT_ANALYSIS_QUESTION = "Bu ürün için satıcı risk analizi yap"


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def _services() -> Services:
    return current_app.extensions["services"]


def _require(name: str):
    service = getattr(_services(), name)
    if service is None:
        raise ApiError(f"{name} servisi kullanılamıyor", 503)
    return service


def _json_body() -> dict:
    return request.get_json(silent=True) or {}


def _ok(data=None, status: int = 200, **extra):
    payload = {"success": True, **extra}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


@api.errorhandler(ApiError)
def _handle_api_error(error: ApiError):
    return jsonify({"success": False, "error": error.message}), error.status


@api.errorhandler(ValueError)
def _handle_value_error(error: ValueError):
    return jsonify({"success": False, "error": str(error)}), 400


@api.errorhandler(GeminiError)
def _handle_gemini_error(error: GeminiError):
    return jsonify({"success": False, "error": str(error)}), 502


@api.errorhandler(Exception)
def _handle_unexpected(error: Exception):
    if isinstance(error, HTTPException):
        return jsonify({"success": False, "error": error.description}), error.code
    logger.exception("Beklenmeyen API hatası")
    return jsonify({"success": False, "error": "Beklenmeyen bir sunucu hatası oluştu"}), 500


# ----------------------------------------------------------------------
# Sistem
# ----------------------------------------------------------------------
@api.get("/health")
def health():
    services = _services()
    status = {
        "rag_service": services.rag is not None,
        "gemini_service": services.gemini is not None,
        "embedding_indexer": services.indexer is not None,
    }
    return jsonify({
        "status": "healthy" if all(status.values()) else "degraded",
        "services": status,
        "indexing": bool(services.indexer and services.indexer.is_running),
    })


@api.get("/test")
def test_services():
    services = _services()
    results = {}

    if services.rag:
        try:
            tables = services.rag.get_available_tables()
            results["rag_service"] = {"status": "ok", "tables": len(tables), "table_names": tables}
        except Exception as exc:
            results["rag_service"] = {"status": "error", "error": str(exc)}
    else:
        results["rag_service"] = {"status": "not_available"}

    if services.gemini:
        try:
            results["gemini_service"] = {"status": "ok", "response_length": services.gemini.ping()}
        except Exception as exc:
            results["gemini_service"] = {"status": "error", "error": str(exc)}
    else:
        results["gemini_service"] = {"status": "not_available"}

    return _ok(results)


@api.post("/embeddings/create")
def create_embeddings():
    indexer = _require("indexer")
    if not indexer.start_in_background():
        raise ApiError("Embedding oluşturma işlemi zaten çalışıyor", 409)
    return _ok(status=202, message="Eksik embedding'lerin oluşturulması arka planda başlatıldı")


# ----------------------------------------------------------------------
# Veri ve dashboard
# ----------------------------------------------------------------------
@api.get("/tables/stats")
def table_stats():
    stats = _require("rag").get_table_stats()
    data = [
        {"name": table.replace("_", " ").title(), "table": table, **values}
        for table, values in stats.items()
    ]
    return _ok(data, total_tables=len(data))


@api.get("/brands")
def brands():
    return _ok(_require("rag").get_all_brands())


@api.get("/dashboard/sales-data")
def sales_data():
    return _ok(_require("rag").get_sales_data_for_dashboard())


# ----------------------------------------------------------------------
# Arama ve ürün detayı
# ----------------------------------------------------------------------
@api.post("/search")
def search():
    rag = _require("rag")
    body = _json_body()
    query = str(body.get("query", "")).strip()
    if not query:
        raise ApiError("Arama sorgusu (query) zorunludur")

    filters = body.get("filters") or {}
    if not isinstance(filters, dict):
        raise ApiError("filters bir nesne olmalıdır")
    limit = _parse_limit(body.get("limit", 10))

    results = rag.search_with_filters(query, filters, limit)
    data = [
        {
            "id": r["product_id"],
            "name": r["product_name"],
            "similarity": r["similarity"],
            "source_table": r["source_table"],
            "combined_text": r.get("combined_text", ""),
            "details": r.get("product_details", {}),
            "risk_analysis": r.get("product_details", {}).get("risk_analysis", {}),
        }
        for r in results
    ]
    return _ok(data, total=len(data), query=query, filters=filters)


@api.get("/product/<product_id>/details")
def product_details(product_id: str):
    product = _get_product(product_id, request.args.get("source_table"))
    return _ok(product)


# ----------------------------------------------------------------------
# Yapay zeka
# ----------------------------------------------------------------------
@api.post("/ai/analyze")
def ai_analyze():
    gemini = _require("gemini")
    body = _json_body()
    product = _get_product(body.get("product_id"), body.get("source_table"))
    question = str(body.get("query") or DEFAULT_ANALYSIS_QUESTION)

    context = build_product_context(product)
    analysis = gemini.analyze_product(question, context)

    try:
        action_plan = gemini.generate_action_plan(context)
    except GeminiError:
        logger.warning("Eylem planı üretilemedi; analiz eylem planı olmadan döndürülüyor")
        action_plan = None

    return _ok({
        "analysis": analysis,
        "action_plan": action_plan,
        "product_details": product,
        "risk_analysis": product.get("risk_analysis", {}),
    })


@api.post("/ai/chat")
def ai_chat():
    rag = _require("rag")
    gemini = _require("gemini")
    message = str(_json_body().get("message", "")).strip()
    if not message:
        raise ApiError("Mesaj (message) zorunludur")

    related = rag.search_with_filters(message, limit=5)
    response = gemini.chat(message, build_chat_context(related))
    return _ok({"response": response, "context_products": len(related)})


# ----------------------------------------------------------------------
# Yardımcılar
# ----------------------------------------------------------------------
def _get_product(product_id, source_table) -> dict:
    if not product_id or not source_table:
        raise ApiError("product_id ve source_table zorunludur")
    product = _require("rag").get_product_details(str(product_id), str(source_table))
    if not product:
        raise ApiError("Ürün bulunamadı", 404)
    return product


def _parse_limit(value) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        raise ApiError("limit bir tam sayı olmalıdır")
    return max(1, min(limit, MAX_RESULTS))
