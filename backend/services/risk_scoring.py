"""Satıcı odaklı kural tabanlı risk skorlama.

Tüm skorlar 0-10 aralığındadır; yüksek değer yüksek risk anlamına gelir.
Veri eksik olduğunda nötr skor (5.0) kullanılır.
"""
from typing import Any

NEUTRAL_RISK = 5.0


def to_float(value: Any, default: float | None = 0.0) -> float | None:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def price_risk(price: float, category_avg_price: float | None) -> float:
    """Ürün fiyatının kategori ortalamasına göre konumundan doğan risk."""
    if price <= 0 or not category_avg_price:
        return NEUTRAL_RISK
    if price > category_avg_price * 1.5:
        return 8.0
    if price > category_avg_price * 1.2:
        return 6.0
    if price < category_avg_price * 0.8:
        return 4.0
    return 3.0


def rating_risk(rating: float) -> float:
    """Müşteri puanından doğan risk (5 üzerinden puan)."""
    if rating <= 0:
        return NEUTRAL_RISK
    if rating >= 4.5:
        return 2.0
    if rating >= 4.0:
        return 3.0
    if rating >= 3.5:
        return 5.0
    if rating >= 3.0:
        return 7.0
    return 9.0


def competition_risk(same_brand_count: int | None) -> float:
    """Kategorideki aynı marka ürün sayısından doğan rekabet riski."""
    if same_brand_count is None:
        return NEUTRAL_RISK
    if same_brand_count > 50:
        return 8.0
    if same_brand_count > 20:
        return 6.0
    if same_brand_count > 10:
        return 4.0
    return 2.0


def risk_level(score: float) -> str:
    if score >= 7:
        return "YÜKSEK RİSK"
    if score >= 5:
        return "ORTA RİSK"
    if score >= 3:
        return "DÜŞÜK RİSK"
    return "ÇOK DÜŞÜK RİSK"


def seller_recommendation(score: float) -> str:
    if score >= 7:
        return "SATIŞ ÖNERİLMEZ - Yüksek risk faktörleri mevcut"
    if score >= 5:
        return "DİKKATLİ SATIŞ - Risk faktörlerini değerlendirin"
    if score >= 3:
        return "SATIŞ YAPILABİLİR - Makul risk seviyesi"
    return "ÖNERİLEN ÜRÜN - Düşük risk, yüksek potansiyel"


def build_risk_analysis(price: float, rating: float, category_avg_price: float | None,
                        same_brand_count: int | None) -> dict:
    scores = {
        "price_risk": price_risk(price, category_avg_price),
        "rating_risk": rating_risk(rating),
        "competition_risk": competition_risk(same_brand_count),
    }
    overall = round(sum(scores.values()) / len(scores), 2)
    return {
        **scores,
        "overall_risk": overall,
        "risk_level": risk_level(overall),
        "seller_recommendation": seller_recommendation(overall),
    }


def neutral_risk_analysis(note: str) -> dict:
    """Kaynak veriye ulaşılamadığında kullanılan nötr risk özeti."""
    return {
        "price_risk": NEUTRAL_RISK,
        "rating_risk": NEUTRAL_RISK,
        "competition_risk": NEUTRAL_RISK,
        "overall_risk": NEUTRAL_RISK,
        "risk_level": risk_level(NEUTRAL_RISK),
        "seller_recommendation": note,
    }


def quick_risk_score(price: float, rating: float) -> float:
    """Dashboard listesi için yalnızca fiyat ve puana dayalı hızlı skor."""
    price_component = min(10.0, price / 1000) if price > 0 else NEUTRAL_RISK
    rating_component = max(0.0, 10 - rating * 2) if rating > 0 else 10.0
    return round((price_component + rating_component) / 2, 1)
