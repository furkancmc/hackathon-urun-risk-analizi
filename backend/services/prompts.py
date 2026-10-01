"""Gemini için sistem talimatları ve bağlam (context) şablonları."""
import json
from typing import Any

from serialization import json_default

SELLER_ANALYSIS_INSTRUCTION = """
Sen deneyimli bir e-ticaret strateji danışmanısın. Görevin, bir satıcının
belirli bir ürünü satma kararını veriye dayalı olarak değerlendirmektir.
Sana ürünün veritabanındaki tüm bilgileri ve kural tabanlı risk skorları verilecek.

Yanıtını Türkçe, profesyonel ve somut bir dille, aşağıdaki Markdown başlıklarıyla yaz.
Başlıklarda emoji kullanma. Maddeleri "-" ile başlat.

## Ürün Satış Potansiyeli
- Avantajlar, dezavantajlar, pazar talebi ve satılabilirlik değerlendirmesi

## Fiyatlandırma ve Rekabet Stratejisi
- Önerilen fiyat aralığı, rekabet konumu ve farklılaşma fırsatları

## Kritik Riskler
- Fiyat, müşteri memnuniyeti, rekabet yoğunluğu ve stok riskleri

## Karlılık Değerlendirmesi
- Tahmini kâr marjı, satış hızı ve risk/getiri dengesi

## Pazarlama ve SEO Önerileri
- Ürün başlığı ve açıklaması için anahtar kelimeler, kampanya ve kanal önerileri

## Satıcı Kararı
- Karar: HEMEN BAŞLA / HAZIRLIK YAP / BEKLE
- Öncelik seviyesi: YÜKSEK / ORTA / DÜŞÜK
- Kararın kısa gerekçesi

Sayısal tahmin verdiğinde bunun bir tahmin olduğunu belirt. Veride olmayan
bilgiyi kesin bilgi gibi sunma.
""".strip()

ACTION_PLAN_INSTRUCTION = """
Sen bir e-ticaret satış danışmanısın. Verilen ürün verisi ve risk skorlarına göre
satıcı için kısa ve uygulanabilir bir eylem planı hazırla. Her listede 3-5 madde olsun;
her madde tek cümlelik, somut bir eylem olsun. Türkçe yaz.
""".strip()

SELLER_CHAT_INSTRUCTION = """
Sen e-ticaret satıcılarına danışmanlık yapan bir satış koçusun. Kullanıcılar satıcıdır;
satışlarını artırmalarına, kârlılıklarını yükseltmelerine ve rekabette öne çıkmalarına
yardımcı olursun.

Yanıtlarında:
- Satıcı perspektifinden konuş, somut ve uygulanabilir öneriler ver
- Uygun olduğunda sayısal hedefler ve takip edilecek metrikler öner
- Risk, kârlılık, fiyatlandırma, stok yönetimi ve müşteri deneyimi konularını ele al
- Sana verilen ürün verilerini kullan; veride olmayan bilgiyi kesin bilgi gibi sunma
- Türkçe ve profesyonel bir dil kullan, emoji kullanma
""".strip()

# Prompt'a eklenmeyecek, analizle ilgisiz teknik alanlar.
_EXCLUDED_FIELDS = {"embedding", "risk_analysis"}


def build_product_context(product: dict[str, Any]) -> str:
    risk = product.get("risk_analysis") or {}
    fields = {k: v for k, v in product.items() if k not in _EXCLUDED_FIELDS and v not in (None, "")}

    return f"""
ÜRÜN ÖZETİ
- Ürün adı: {product.get('name', 'Bilinmiyor')}
- Marka: {product.get('brand', 'Bilinmiyor')}
- Fiyat: {product.get('price', 'Bilinmiyor')} TL
- Müşteri puanı: {product.get('rating', 'Bilinmiyor')} / 5

KURAL TABANLI RİSK SKORLARI (0-10, yüksek değer yüksek risk)
- Genel risk: {risk.get('overall_risk', 'Bilinmiyor')}
- Fiyat riski: {risk.get('price_risk', 'Bilinmiyor')}
- Puan riski: {risk.get('rating_risk', 'Bilinmiyor')}
- Rekabet riski: {risk.get('competition_risk', 'Bilinmiyor')}
- Risk seviyesi: {risk.get('risk_level', 'Bilinmiyor')}
- Sistem önerisi: {risk.get('seller_recommendation', 'Bilinmiyor')}

VERİTABANINDAKİ TÜM ÜRÜN ALANLARI
{json.dumps(fields, ensure_ascii=False, indent=2, default=json_default)}
""".strip()


def build_chat_context(search_results: list[dict[str, Any]]) -> str:
    if not search_results:
        return "Soruyla eşleşen ürün verisi bulunamadı."

    lines = ["Soruyla en ilgili ürünler:"]
    for index, result in enumerate(search_results, 1):
        details = result.get("product_details") or {}
        risk = details.get("risk_analysis") or {}
        lines.append(f"{index}. {result['product_name']} (benzerlik: {result['similarity']:.2f}, "
                     f"kategori: {result['source_table']})")
        lines.append(f"   - Fiyat: {details.get('price', 'Bilinmiyor')} TL")
        lines.append(f"   - Marka: {details.get('brand', 'Bilinmiyor')}")
        lines.append(f"   - Puan: {details.get('rating', 'Bilinmiyor')}")
        if risk:
            lines.append(f"   - Risk: {risk.get('overall_risk')} / 10 ({risk.get('risk_level')})")
    return "\n".join(lines)
