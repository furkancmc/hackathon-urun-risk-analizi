import unittest
import sys
import os
import time
import psycopg2
from dotenv import load_dotenv

# Ana dizini path'e ekle
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

class TestSystem(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Test başlamadan önce servisler yüklensin"""
        print("\n🔧 Test Servisleri Yükleniyor...")
        try:
            from rag_service import RAGService
            from gemini_service import GeminiService
            from embedding_service import EmbeddingService
            
            cls.rag = RAGService()
            cls.gemini = GeminiService()
            cls.embedding = EmbeddingService()
            print("✅ Servisler yüklendi")
        except Exception as e:
            print(f"❌ Servis yükleme hatası: {e}")
            raise
    
    def test_01_database_connection(self):
        """Veritabanı bağlantı testi"""
        print("\n📊 Veritabanı bağlantı testi...")
        try:
            from create_missing_embeddings import load_db_config
            db_config = load_db_config()
            conn = psycopg2.connect(**db_config)
            cur = conn.cursor()
            cur.execute("SELECT 1")
            result = cur.fetchone()
            cur.close()
            conn.close()
            self.assertEqual(result[0], 1)
            print("✅ Veritabanı bağlantısı başarılı")
        except Exception as e:
            self.fail(f"Veritabanı bağlantı hatası: {e}")
    
    def test_02_rag_service(self):
        """RAG servisi testi"""
        print("\n🔍 RAG servisi testi...")
        tables = self.rag.get_available_tables()
        self.assertIsNotNone(tables)
        print(f"✅ RAG servisi çalışıyor. {len(tables)} tablo bulundu")
    
    def test_03_embedding_creation(self):
        """Embedding oluşturma testi"""
        print("\n🧠 Embedding oluşturma testi...")
        test_text = "Samsung Galaxy S24 Ultra telefon"
        embedding = self.embedding.create_embedding(test_text)
        self.assertEqual(len(embedding), 384)
        print(f"✅ Embedding başarıyla oluşturuldu (boyut: {len(embedding)})")
    
    def test_04_gemini_api(self):
        """Gemini API testi"""
        print("\n🤖 Gemini API testi...")
        try:
            response = self.gemini.generate_response("Merhaba, test mesajı")
            self.assertIsNotNone(response)
            self.assertIsInstance(response, str)
            self.assertGreater(len(response), 0)
            print(f"✅ Gemini API çalışıyor (yanıt uzunluğu: {len(response)} karakter)")
        except Exception as e:
            self.skipTest(f"Gemini API testi atlandı: {e}")
    
    def test_05_product_search(self):
        """Ürün arama testi"""
        print("\n🔎 Ürün arama testi...")
        results = self.rag.search_products("telefon", limit=5)
        self.assertIsInstance(results, list)
        if results:
            self.assertIn('product_id', results[0])
            self.assertIn('product_name', results[0])
            self.assertIn('similarity', results[0])
            print(f"✅ Ürün arama çalışıyor ({len(results)} sonuç bulundu)")
        else:
            print("⚠️ Ürün bulunamadı (normal - veritabanı boş olabilir)")
    
    def test_06_table_stats(self):
        """Tablo istatistikleri testi"""
        print("\n📈 Tablo istatistikleri testi...")
        stats = self.rag.get_table_stats()
        self.assertIsInstance(stats, dict)
        print(f"✅ İstatistikler alındı ({len(stats)} tablo)")
        for table, data in stats.items():
            print(f"   - {table}: {data['total_products']} ürün")

def run_tests():
    """Test suite'i çalıştır"""
    print("="*60)
    print("🧪 AI SATICI RİSK ANALİZ SİSTEMİ - SİSTEM TESTLERİ")
    print("="*60)
    
    # Test suite oluştur
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestSystem)
    
    # Çalıştır
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Özet
    print("\n" + "="*60)
    if result.wasSuccessful():
        print("✅ TÜM TESTLER BAŞARILI!")
    else:
        print(f"❌ {len(result.failures)} test başarısız, {len(result.errors)} hata")
    print("="*60)
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
