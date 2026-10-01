from datetime import datetime
from decimal import Decimal

from services.prompts import build_chat_context, build_product_context


def test_product_context_includes_risk_and_fields():
    product = {
        "name": "Klima A",
        "brand": "Marka",
        "price": Decimal("25999.90"),
        "rating": Decimal("4.3"),
        "created_at": datetime(2025, 8, 1, 12, 0),
        "embedding": [0.1, 0.2],
        "risk_analysis": {"overall_risk": 4.33, "risk_level": "DÜŞÜK RİSK"},
    }
    context = build_product_context(product)

    assert "Klima A" in context
    assert "Genel risk: 4.33" in context
    assert "25999.9" in context
    assert "2025-08-01T12:00:00" in context
    assert "embedding" not in context


def test_chat_context_without_results():
    assert "bulunamadı" in build_chat_context([])
