from unittest.mock import MagicMock

import pytest

from app import create_app
from services import Services
from services.gemini_service import GeminiError

PRODUCT = {
    "id": 7,
    "name": "Örnek Kulaklık",
    "brand": "Marka",
    "price": 1500.0,
    "rating": 4.6,
    "risk_analysis": {"overall_risk": 3.0, "risk_level": "DÜŞÜK RİSK"},
}


@pytest.fixture
def services():
    rag = MagicMock()
    rag.search_with_filters.return_value = [
        {
            "product_id": "7",
            "product_name": "Örnek Kulaklık",
            "similarity": 0.82,
            "source_table": "kulaklik_urunleri",
            "combined_text": "name: Örnek Kulaklık",
            "product_details": PRODUCT,
        }
    ]
    rag.get_product_details.return_value = PRODUCT

    gemini = MagicMock()
    gemini.analyze_product.return_value = "## Satıcı Kararı\n- Karar: HAZIRLIK YAP"
    gemini.generate_action_plan.return_value = {
        "immediate_actions": ["Fiyatı gözden geçirin"],
        "this_month": ["Kampanya planlayın"],
        "long_term": ["Tedarikçi çeşitlendirin"],
    }
    gemini.chat.return_value = "Öneri metni"

    indexer = MagicMock()
    indexer.is_running = False
    indexer.start_in_background.return_value = True

    return Services(rag=rag, gemini=gemini, indexer=indexer)


@pytest.fixture
def client(services):
    return create_app(services).test_client()


def test_health_reports_services(client):
    body = client.get("/api/health").get_json()
    assert body["status"] == "healthy"
    assert body["services"] == {"rag_service": True, "gemini_service": True, "embedding_indexer": True}


def test_health_degraded_when_service_missing():
    client = create_app(Services()).test_client()
    body = client.get("/api/health").get_json()
    assert body["status"] == "degraded"


def test_search_requires_query(client):
    response = client.post("/api/search", json={"query": "  "})
    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_search_returns_formatted_results(client, services):
    payload = {"query": "kulaklık", "filters": {"rating_min": 4}, "limit": 5}
    response = client.post("/api/search", json=payload)
    body = response.get_json()

    assert response.status_code == 200
    assert body["total"] == 1
    assert body["data"][0]["id"] == "7"
    assert body["data"][0]["risk_analysis"]["risk_level"] == "DÜŞÜK RİSK"
    services.rag.search_with_filters.assert_called_once_with("kulaklık", {"rating_min": 4}, 5)


def test_search_limit_is_clamped(client, services):
    client.post("/api/search", json={"query": "telefon", "limit": 1000})
    assert services.rag.search_with_filters.call_args.args[2] == 50


def test_product_details_requires_source_table(client):
    assert client.get("/api/product/7/details").status_code == 400


def test_product_details_not_found(client, services):
    services.rag.get_product_details.return_value = None
    response = client.get("/api/product/7/details?source_table=kulaklik_urunleri")
    assert response.status_code == 404


def test_invalid_source_table_returns_400(client, services):
    services.rag.get_product_details.side_effect = ValueError("Geçersiz kaynak tablo")
    response = client.get("/api/product/7/details?source_table=pg_user")
    assert response.status_code == 400


def test_analyze_returns_report_and_action_plan(client):
    response = client.post("/api/ai/analyze", json={"product_id": "7", "source_table": "kulaklik_urunleri"})
    data = response.get_json()["data"]

    assert response.status_code == 200
    assert data["analysis"].startswith("## Satıcı Kararı")
    assert data["action_plan"]["immediate_actions"] == ["Fiyatı gözden geçirin"]
    assert data["risk_analysis"]["overall_risk"] == 3.0


def test_analyze_survives_action_plan_failure(client, services):
    services.gemini.generate_action_plan.side_effect = GeminiError("hata")
    response = client.post("/api/ai/analyze", json={"product_id": "7", "source_table": "kulaklik_urunleri"})
    assert response.status_code == 200
    assert response.get_json()["data"]["action_plan"] is None


def test_gemini_failure_returns_502(client, services):
    services.gemini.analyze_product.side_effect = GeminiError("Gemini API hatası")
    response = client.post("/api/ai/analyze", json={"product_id": "7", "source_table": "kulaklik_urunleri"})
    assert response.status_code == 502


def test_chat_uses_related_products(client, services):
    response = client.post("/api/ai/chat", json={"message": "Kulaklık satmalı mıyım?"})
    body = response.get_json()

    assert response.status_code == 200
    assert body["data"] == {"response": "Öneri metni", "context_products": 1}
    context = services.gemini.chat.call_args.args[1]
    assert "Örnek Kulaklık" in context


def test_ai_endpoints_return_503_without_gemini(services):
    services.gemini = None
    client = create_app(services).test_client()
    response = client.post("/api/ai/chat", json={"message": "Merhaba"})
    assert response.status_code == 503


def test_embedding_creation_runs_in_background(client, services):
    assert client.post("/api/embeddings/create").status_code == 202
    services.indexer.start_in_background.return_value = False
    assert client.post("/api/embeddings/create").status_code == 409
