# API Referansı

Tüm endpoint'ler `/api` önekiyle sunulur ve JSON döndürür. Başarılı yanıtlar
`{"success": true, "data": ...}`, hatalı yanıtlar `{"success": false, "error": "..."}`
biçimindedir.

| Durum kodu | Anlamı |
|---|---|
| 400 | Eksik veya geçersiz parametre |
| 404 | Ürün bulunamadı |
| 409 | Embedding işlemi zaten çalışıyor |
| 502 | Gemini API hatası |
| 503 | İlgili servis (arama veya Gemini) başlatılamadı |

## Sistem

### `GET /api/health`

Servislerin durumunu döndürür.

```json
{
  "status": "healthy",
  "services": { "rag_service": true, "gemini_service": true, "embedding_indexer": true },
  "indexing": false
}
```

### `GET /api/test`

Veritabanı ve Gemini bağlantısını canlı olarak test eder.

### `POST /api/embeddings/create`

Embedding tablosunda bulunmayan ürünleri arka planda vektörleştirir. `202 Accepted` döner.

## Veri

### `GET /api/tables/stats`

Her kategori için ürün sayısı, embedding sayısı, kapsama oranı, ortalama fiyat ve puan.

### `GET /api/brands`

Tüm kategorilerdeki benzersiz marka listesi.

### `GET /api/dashboard/sales-data`

Her kategoriden en yüksek fiyatlı ürünler ve hızlı risk skorları.

## Arama

### `POST /api/search`

```json
{
  "query": "sessiz çalışan inverter klima",
  "filters": { "price_min": 10000, "price_max": 40000, "rating_min": 4.0, "brands": ["Samsung"] },
  "limit": 10
}
```

`limit` en fazla 50 olabilir. Yanıttaki her sonuç benzerlik skoru, kategori, ürün
detayları ve risk analizini içerir:

```json
{
  "id": "142",
  "name": "...",
  "similarity": 0.71,
  "source_table": "klima_urunleri",
  "details": { "brand": "Samsung", "price": 32999.0, "rating": 4.6, "...": "..." },
  "risk_analysis": {
    "price_risk": 3.0,
    "rating_risk": 2.0,
    "competition_risk": 4.0,
    "overall_risk": 3.0,
    "risk_level": "DÜŞÜK RİSK",
    "seller_recommendation": "SATIŞ YAPILABİLİR - Makul risk seviyesi"
  }
}
```

### `GET /api/product/<product_id>/details?source_table=<tablo>`

Ürünün veritabanındaki tüm alanları ve risk analizi.

## Yapay Zeka

### `POST /api/ai/analyze`

```json
{ "product_id": "142", "source_table": "klima_urunleri", "query": "Bu ürünü satmalı mıyım?" }
```

Yanıt:

```json
{
  "analysis": "## Ürün Satış Potansiyeli\n- ...",
  "action_plan": {
    "immediate_actions": ["..."],
    "this_month": ["..."],
    "long_term": ["..."]
  },
  "product_details": { "...": "..." },
  "risk_analysis": { "...": "..." }
}
```

Eylem planı üretilemezse `action_plan` alanı `null` döner; rapor yine de iletilir.

### `POST /api/ai/chat`

```json
{ "message": "Kablosuz kulaklıkta rakiplerimden nasıl ayrışırım?" }
```

Yanıt, Gemini'nin cevabını ve bağlama eklenen ürün sayısını içerir:

```json
{ "response": "...", "context_products": 5 }
```
