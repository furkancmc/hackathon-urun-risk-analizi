import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Descriptions, Divider, message, Modal, Progress, Row } from 'antd';
import { BugOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import { formatTableName } from '../utils/format';

const SERVICE_LABELS = {
  rag_service: 'Arama (RAG) Servisi',
  gemini_service: 'Gemini AI',
  embedding_indexer: 'Embedding İndeksleyici',
};

const StatusBadge = ({ status }) => {
  if (status === true || status === 'ok') return <Badge status="success" text="Çalışıyor" />;
  if (status === 'error') return <Badge status="error" text="Hata" />;
  return <Badge status="default" text="Kullanılamıyor" />;
};

const SystemManagement = ({ systemHealth, onHealthUpdate }) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const [coverage, setCoverage] = useState(null);

  const loadCoverage = useCallback(async () => {
    try {
      const response = await apiService.getTableStats();
      const stats = response.data.data;
      const products = stats.reduce((sum, t) => sum + t.total_products, 0);
      const embeddings = stats.reduce((sum, t) => sum + t.embeddings_count, 0);
      setCoverage({ products, embeddings, percent: products ? Math.round((embeddings / products) * 100) : 0 });
    } catch {
      setCoverage(null);
    }
  }, []);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  const runSystemTests = async () => {
    setTesting(true);
    try {
      const response = await apiService.testServices();
      setTestResults(response.data.data);
      message.success('Sistem testleri tamamlandı');
    } catch (error) {
      message.error(`Test hatası: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const refresh = () => {
    onHealthUpdate();
    loadCoverage();
  };

  const createEmbeddings = () => {
    Modal.confirm({
      title: 'Embedding Oluşturma',
      content: 'Embedding tablosunda bulunmayan ürünler vektörleştirilecek. İşlem arka planda çalışır ve '
        + 'veri miktarına göre uzun sürebilir. Devam edilsin mi?',
      okText: 'Başlat',
      cancelText: 'İptal',
      onOk: async () => {
        setIndexing(true);
        try {
          const response = await apiService.createEmbeddings();
          message.success(response.data.message);
          setTimeout(refresh, 2000);
        } catch (error) {
          message.error(`Embedding oluşturulamadı: ${error.message}`);
        } finally {
          setIndexing(false);
        }
      },
    });
  };

  return (
    <div>
      <h2>Sistem Yönetimi</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Servis Durumu" style={{ height: '100%' }}>
            {systemHealth ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Genel Durum">
                  {systemHealth.status === 'healthy'
                    ? <Badge status="success" text="Sağlıklı" />
                    : <Badge status="warning" text="Kısmi hizmet" />}
                </Descriptions.Item>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <Descriptions.Item key={key} label={label}>
                    <StatusBadge status={systemHealth.services[key]} />
                  </Descriptions.Item>
                ))}
                {systemHealth.indexing && (
                  <Descriptions.Item label="İndeksleme">
                    <Badge status="processing" text="Devam ediyor" />
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Alert message="Servis durumu alınamadı" description="Backend bağlantısını kontrol edin."
                type="error" showIcon />
            )}

            <Divider />

            <Button type="primary" icon={<BugOutlined />} onClick={runSystemTests} loading={testing} block
              style={{ marginBottom: 8 }}>
              Sistem Testlerini Çalıştır
            </Button>
            <Button icon={<ReloadOutlined />} onClick={refresh} block>
              Durumu Yenile
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Test Sonuçları" style={{ height: '100%' }}>
            {testResults ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label={SERVICE_LABELS.rag_service}>
                  <StatusBadge status={testResults.rag_service?.status} />
                  {testResults.rag_service?.tables !== undefined && ` (${testResults.rag_service.tables} tablo)`}
                </Descriptions.Item>
                <Descriptions.Item label={SERVICE_LABELS.gemini_service}>
                  <StatusBadge status={testResults.gemini_service?.status} />
                </Descriptions.Item>
                {testResults.rag_service?.table_names?.length > 0 && (
                  <Descriptions.Item label="Embedding Tabloları">
                    {testResults.rag_service.table_names.map(formatTableName).join(', ')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Alert message="Henüz test çalıştırılmadı" type="info" showIcon />
            )}

            <Divider />

            <Button icon={<DatabaseOutlined />} onClick={createEmbeddings} loading={indexing} block>
              Eksik Embedding'leri Oluştur
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Embedding Kapsamı" style={{ textAlign: 'center' }}>
            {coverage ? (
              <>
                <Progress type="circle" percent={coverage.percent} />
                <p style={{ marginTop: 16 }}>
                  {coverage.embeddings.toLocaleString('tr-TR')} / {coverage.products.toLocaleString('tr-TR')} ürün
                </p>
              </>
            ) : (
              <Alert message="Kapsam bilgisi alınamadı" type="warning" showIcon />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Aktif Servisler" style={{ textAlign: 'center' }}>
            <div className="big-number">
              {systemHealth ? Object.values(systemHealth.services).filter(Boolean).length : 0}
              {' / '}
              {Object.keys(SERVICE_LABELS).length}
            </div>
            <p>Servis çalışıyor</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemManagement;
