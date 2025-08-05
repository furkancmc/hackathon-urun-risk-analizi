import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import logging
import sys
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_pgvector(db_config):
    """PGVector extension'ı kur ve tabloları oluştur"""
    try:
        # Önce veritabanının var olduğundan emin ol
        conn = psycopg2.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Veritabanını oluştur (yoksa)
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_config['database']}'")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f"CREATE DATABASE {db_config['database']}")
            logger.info(f"✅ {db_config['database']} veritabanı oluşturuldu")
        
        cur.close()
        conn.close()
        
        # Ana veritabanına bağlan
        conn = psycopg2.connect(**db_config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # PGVector extension
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        logger.info("✅ PGVector extension kuruldu")
        
        # Ana ürün tabloları
        product_tables = {
            'telephone_products': """
                CREATE TABLE IF NOT EXISTS telephone_products (
                    id SERIAL PRIMARY KEY,
                    product_id VARCHAR(255) UNIQUE,
                    name TEXT,
                    title TEXT,
                    description TEXT,
                    brand VARCHAR(255),
                    model VARCHAR(255),
                    category VARCHAR(255),
                    price DECIMAL(10,2),
                    rating DECIMAL(3,2),
                    color VARCHAR(100),
                    seller_name TEXT,
                    stock_status VARCHAR(50),
                    availability VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """,
            'computer_products': """
                CREATE TABLE IF NOT EXISTS computer_products (
                    id SERIAL PRIMARY KEY,
                    product_id VARCHAR(255) UNIQUE,
                    name TEXT,
                    title TEXT,
                    description TEXT,
                    brand VARCHAR(255),
                    model VARCHAR(255),
                    category VARCHAR(255),
                    price DECIMAL(10,2),
                    rating DECIMAL(3,2),
                    color VARCHAR(100),
                    seller_name TEXT,
                    stock_status VARCHAR(50),
                    availability VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """,
            'klima_products': """
                CREATE TABLE IF NOT EXISTS klima_products (
                    id SERIAL PRIMARY KEY,
                    product_id VARCHAR(255) UNIQUE,
                    name TEXT,
                    title TEXT,
                    description TEXT,
                    brand VARCHAR(255),
                    model VARCHAR(255),
                    category VARCHAR(255),
                    price DECIMAL(10,2),
                    rating DECIMAL(3,2),
                    btu VARCHAR(50),
                    energy_class VARCHAR(10),
                    seller_name TEXT,
                    stock_status VARCHAR(50),
                    availability VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """,
            'kulaklık_products': """
                CREATE TABLE IF NOT EXISTS kulaklık_products (
                    id SERIAL PRIMARY KEY,
                    product_id VARCHAR(255) UNIQUE,
                    name TEXT,
                    title TEXT,
                    description TEXT,
                    brand VARCHAR(255),
                    model VARCHAR(255),
                    category VARCHAR(255),
                    price DECIMAL(10,2),
                    rating DECIMAL(3,2),
                    color VARCHAR(100),
                    connection_type VARCHAR(50),
                    seller_name TEXT,
                    stock_status VARCHAR(50),
                    availability VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
        }
        
        # Ana tabloları oluştur
        for table_name, create_sql in product_tables.items():
            cur.execute(create_sql)
            logger.info(f"✅ {table_name} tablosu oluşturuldu/kontrol edildi")
        
        # Embedding tabloları
        tables = ['telephone', 'computer', 'klima', 'kulaklık']
        
        for table in tables:
            create_embedding_table = f"""
            CREATE TABLE IF NOT EXISTS {table}_embeddings (
                id SERIAL PRIMARY KEY,
                product_id VARCHAR(255) UNIQUE NOT NULL,
                product_name TEXT,
                combined_text TEXT,
                embedding vector(384),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_{table}_embedding 
            ON {table}_embeddings USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
            """
            
            cur.execute(create_embedding_table)
            logger.info(f"✅ {table}_embeddings tablosu oluşturuldu")
        
        cur.close()
        conn.close()
        
        logger.info("✅ Tüm tablolar başarıyla oluşturuldu!")
        
    except Exception as e:
        logger.error(f"❌ Setup hatası: {e}")
        raise

if __name__ == "__main__":
    # db_config.txt dosyasını yükle
    from create_missing_embeddings import load_db_config
    
    try:
        db_config = load_db_config()
        setup_pgvector(db_config)
    except Exception as e:
        logger.error(f"❌ Konfigürasyon yükleme hatası: {e}")
        print("\n⚠️ db_config.txt dosyasını oluşturduğunuzdan emin olun!")
        print("Örnek içerik:")
        print("host=localhost")
        print("port=5432")
        print("database=ai_seller_analysis")
        print("user=postgres")
        print("password=your_password")
