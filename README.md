# 🤖 AI Destekli Satıcı Risk Analiz Sistemi

Bu proje, e-ticaret satıcıları için yapay zeka destekli risk analizi ve satış stratejisi önerileri sunan kapsamlı bir web uygulamasıdır.

## 🚀 Özellikler

### 📊 **Ürün Analizi**
- Gelişmiş ürün arama ve filtreleme
- Detaylı ürün bilgileri görüntüleme
- Fiyat ve rating analizi
- Marka bazlı kategorilendirme

### 🤖 **AI Destekli Risk Analizi**
- Ürün bazlı risk skorlaması
- Satış potansiyeli değerlendirmesi
- Rekabet analizi
- Karlılık tahminleri
- Pazar trend analizi

### 💬 **AI Sohbet Asistanı**
- Satıcı odaklı soru-cevap
- Strateji önerileri
- Pazar analizi
- Risk değerlendirmesi

### 📈 **Dashboard**
- Sistem istatistikleri
- Tablo durumları
- Embedding kapsamı
- Performans metrikleri

## 🛠️ Teknolojiler

### Backend
- **Python 3.8+**
- **Flask** - Web framework
- **PostgreSQL** - Veritabanı
- **pgvector** - Vektör veritabanı
- **Google Gemini AI** - AI servisleri
- **Sentence Transformers** - Embedding modeli

### Frontend
- **React 18**
- **Ant Design** - UI framework
- **Axios** - HTTP client
- **Recharts** - Grafik kütüphanesi

## 📋 Gereksinimler

### Sistem Gereksinimleri
- Python 3.8 veya üzeri
- Node.js 16 veya üzeri
- PostgreSQL 13 veya üzeri
- 8GB RAM (minimum)
- 10GB disk alanı

### API Gereksinimleri
- Google Gemini API anahtarı
- PostgreSQL veritabanı bağlantısı

## 🚀 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/furkancmc/HACKATHON-AI-URUN-RISK-ANALIZI.git
cd hackathon
```

### 2. Backend Kurulumu
```bash
# Sanal ortam oluşturun
python -m venv .venv

# Sanal ortamı etkinleştirin
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Gereksinimleri yükleyin
pip install -r requirements.txt
```

### 3. Frontend Kurulumu
```bash
cd frontend
npm install
```

### 4. Veritabanı Kurulumu
```bash
# PostgreSQL'de veritabanı oluşturun
createdb ai_seller_analysis

# pgvector uzantısını etkinleştirin
psql -d ai_seller_analysis -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 5. Ortam Değişkenleri
`.env` dosyası oluşturun:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ai_seller_analysis

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Flask
FLASK_ENV=development
FLASK_DEBUG=True
```

## 🎯 Kullanım

### Hızlı Başlatma
```bash
# Windows
start_system.bat

# Linux/Mac
./start_system.sh

# PowerShell
.\start_system.ps1
```

### Manuel Başlatma
```bash
# Backend (Terminal 1)
cd backend
python app.py

# Frontend (Terminal 2)
cd frontend
npm start
```

### Erişim
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📖 API Dokümantasyonu

### Temel Endpoint'ler

#### Health Check
```http
GET /api/health
```

#### Ürün Arama
```http
POST /api/search
Content-Type: application/json

{
  "query": "samsung telefon",
  "filters": {
    "price_range": [0, 5000],
    "min_rating": 4.0,
    "brands": ["Samsung"]
  },
  "limit": 10
}
```

#### AI Analiz
```http
POST /api/ai/analyze
Content-Type: application/json

{
  "product_id": "12345",
  "source_table": "telephone_products",
  "query": "Bu ürün için risk analizi yap"
}
```

#### AI Sohbet
```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Samsung telefonları için satış stratejisi öner"
}
```

## 🗂️ Proje Yapısı

```
HACKATHON-AI-URUN-RISK-ANALIZI/
├── .github/                         # GitHub workflows
├── backend/
│   ├── app.py                      # Flask uygulaması
│   └── requirements.txt           # Backend bağımlılıkları
├── frontend/                       # React frontend (iç yapısı burada gizlenmiş)
├── .env                            # Ortam değişkenleri (gitignore içinde)
├── .gitignore                      # Yoksayılacak dosyalar
├── Dockerfile                      # Docker yapılandırması
├── LICENSE                         # MIT Lisansı
├── README.md                       # Proje tanıtımı
├── create_missing_embeddings.py    # Eksik embedding üretici
├── db_config.txt                   # Veritabanı yapılandırması (örnek)
├── docker-compose.yml              # Docker çoklu servis tanımı
├── embedding_service.py            # Embedding işlemleri
├── gemini_service.py               # Google Gemini API entegrasyonu
├── rag_service.py                  # RAG (retrieval-augmented generation) servisi
├── requirements.txt                # Ortak Python bağımlılıkları
├── setup_pgvector.py               # pgvector kurulum scripti
└── test_system.py                  # Sistem testi

```

## 🔧 Konfigürasyon

### Veritabanı Ayarları
`db_config.txt` dosyasında veritabanı bağlantı bilgilerini düzenleyin:
```
host=localhost
port=5432
database=ai_seller_analysis
user=your_username
password=your_password
```

### AI Model Ayarları
`gemini_service.py` dosyasında AI model parametrelerini düzenleyin:
- Model adı
- Sıcaklık değeri
- Token limiti

## 🧪 Test

### Sistem Testi
```bash
python test_system.py
```

### API Testi
```bash
curl http://localhost:5000/api/health
```

### Frontend Testi
```bash
cd frontend
npm test
```

## 📊 Performans


### Optimizasyon İpuçları
- Embedding'leri önceden oluşturun
- Veritabanı indekslerini optimize edin
- CDN kullanın (production)
- Caching mekanizmaları ekleyin

## 🐛 Sorun Giderme

### Yaygın Sorunlar

#### Backend Bağlantı Hatası
```bash
# Sanal ortamı kontrol edin
.venv\Scripts\activate

# Gereksinimleri yeniden yükleyin
pip install -r requirements.txt

# Port kontrolü
netstat -an | findstr :5000
```

#### Frontend Bağlantı Hatası
```bash
# Node modüllerini temizleyin
cd frontend
rm -rf node_modules package-lock.json
npm install

# Port kontrolü
netstat -an | findstr :3000
```

#### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL servisini kontrol edin
sudo systemctl status postgresql

# Bağlantıyı test edin
psql -h localhost -U username -d ai_seller_analysis
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 👥 Geliştiriciler

- **Ana Geliştiriciler**: [FURKAN CAMCIOĞLU VE MUHAMMED AKAY]
- **Frontend**: [MUHAMMED AKAY]
- **Backend**: [FURKAN CAMCIOĞLU]

## 📞 İletişim

- **Email**: [furkancamcioglu@outlook.com.tr]
- **GitHub**: [github.com/furkancmc]
- **LinkedIn**: [https://www.linkedin.com/in/furkan-camcıoğlu-972a22378] ve [https://www.linkedin.com/in/muhammed-akay-aa21b7331]

## 🙏 Teşekkürler

- Google Gemini AI ekibine
- PostgreSQL ve pgvector geliştiricilerine
- Tüm katkıda bulunanlara

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! 
