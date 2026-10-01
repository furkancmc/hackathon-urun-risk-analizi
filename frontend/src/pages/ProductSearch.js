import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Input, message, Row, Select, Slider, Space, Spin, Tag } from 'antd';
import {
  DollarOutlined,
  ExperimentOutlined,
  EyeOutlined,
  SearchOutlined,
  StarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ProductDetailModal from '../components/ProductDetailModal';
import RiskAnalysisModal from '../components/RiskAnalysisModal';
import { apiService } from '../services/api';
import { formatPrice, formatTableName } from '../utils/format';
import { getRiskLevelColor } from '../utils/risk';

const { Search } = Input;

const PRICE_MAX = 100000;
const DEFAULT_FILTERS = { price_range: [0, PRICE_MAX], min_rating: 0, brands: [] };
const ANALYSIS_QUESTION = 'Bu ürün için satıcı risk analizi yap';

// Arayüzdeki filtre durumunu backend'in beklediği formata dönüştürür.
const toApiFilters = (filters) => {
  const apiFilters = {};
  const [minPrice, maxPrice] = filters.price_range;
  if (minPrice > 0) apiFilters.price_min = minPrice;
  if (maxPrice < PRICE_MAX) apiFilters.price_max = maxPrice;
  if (filters.min_rating > 0) apiFilters.rating_min = filters.min_rating;
  if (filters.brands.length > 0) apiFilters.brands = filters.brands;
  return apiFilters;
};

// Ad, fiyat, puan ve marka bilgisinin hiçbiri olmayan boş kayıtları eler.
const hasUsefulContent = (product) => {
  if (!product.name || !product.name.trim()) return false;
  const details = product.details;
  if (!details || Object.keys(details).length === 0) return true;
  return parseFloat(details.price) > 0 || parseFloat(details.rating) > 0 || Boolean(details.brand);
};

const ProductSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, product: null });
  const [analysisModal, setAnalysisModal] = useState({ open: false, product: null, analysis: null });
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    setBrandsLoading(true);
    apiService
      .getBrands()
      .then((response) => setBrands(response.data.data || []))
      .catch((error) => console.error('Marka listesi yüklenemedi:', error))
      .finally(() => setBrandsLoading(false));
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      message.warning('Lütfen bir arama terimi girin');
      return;
    }

    setLoading(true);
    setSearchQuery(query);
    try {
      const response = await apiService.searchProducts(query, toApiFilters(filters), 10);
      const products = response.data.data.filter(hasUsefulContent);
      setResults(products);
      message.success(`${products.length} ürün bulundu`);
    } catch (error) {
      message.error(`Arama hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showProductDetails = async (product) => {
    try {
      const response = await apiService.getProductDetails(product.id, product.source_table);
      setDetailModal({ open: true, product: { ...product, fullDetails: response.data.data } });
    } catch (error) {
      message.error(`Ürün detayları yüklenemedi: ${error.message}`);
    }
  };

  const showRiskAnalysis = async (product) => {
    setAnalysisModal({ open: true, product, analysis: null });
    setAnalysisLoading(true);
    try {
      const response = await apiService.analyzeProduct(product.id, product.source_table, ANALYSIS_QUESTION);
      setAnalysisModal((prev) => ({ ...prev, analysis: response.data.data }));
    } catch (error) {
      message.error(`Risk analizi yapılamadı: ${error.message}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    message.info('Filtreler temizlendi');
  };

  return (
    <div>
      <Card title="Ürün Risk Analizi ve Arama" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={18}>
            <Search
              placeholder="Örn: Samsung inverter klima, kablosuz kulaklık, oyun bilgisayarı..."
              enterButton={<Button type="primary" icon={<SearchOutlined />}>Risk Analizi Yap</Button>}
              size="large"
              onSearch={handleSearch}
              loading={loading}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button size="large" block onClick={resetFilters}>
              Filtreleri Temizle
            </Button>
          </Col>
        </Row>

        <Card size="small" title="Gelişmiş Filtreler" style={{ marginTop: 16 }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} md={8}>
              <label>Fiyat Aralığı (₺)</label>
              <Slider
                range
                min={0}
                max={PRICE_MAX}
                step={1000}
                value={filters.price_range}
                onChange={(value) => setFilters((prev) => ({ ...prev, price_range: value }))}
                tooltip={{ formatter: formatPrice }}
              />
            </Col>
            <Col xs={24} md={8}>
              <label>Minimum Müşteri Puanı</label>
              <Slider
                min={0}
                max={5}
                step={0.1}
                value={filters.min_rating}
                onChange={(value) => setFilters((prev) => ({ ...prev, min_rating: value }))}
                tooltip={{ formatter: (value) => `${value} / 5` }}
              />
            </Col>
            <Col xs={24} md={8}>
              <label>Marka</label>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="Tüm markalar"
                loading={brandsLoading}
                value={filters.brands}
                onChange={(value) => setFilters((prev) => ({ ...prev, brands: value }))}
                options={brands.map((brand) => ({ label: brand, value: brand }))}
                style={{ width: '100%', marginTop: 8 }}
                maxTagCount="responsive"
              />
            </Col>
          </Row>
        </Card>
      </Card>

      {loading && (
        <Card>
          <div className="loading-state">
            <Spin size="large" />
            <p>Ürünler aranıyor ve risk skorları hesaplanıyor...</p>
          </div>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <Card title={`Bulunan Ürünler (${results.length})`}>
          <Row gutter={[16, 16]}>
            {results.map((product, index) => (
              <Col span={24} key={`${product.source_table}-${product.id}`}>
                <Card
                  className="search-result"
                  hoverable
                  actions={[
                    <Button key="details" icon={<EyeOutlined />} onClick={() => showProductDetails(product)}>
                      Detayları Gör
                    </Button>,
                    <Button
                      key="analysis"
                      type="primary"
                      icon={<ExperimentOutlined />}
                      onClick={() => showRiskAnalysis(product)}
                    >
                      Risk Analizi
                    </Button>,
                  ]}
                >
                  <Row gutter={[16, 8]}>
                    <Col xs={24} md={16}>
                      <h3>{index + 1}. {product.name}</h3>
                      <Space wrap>
                        {product.details?.brand && <Tag color="blue">{product.details.brand}</Tag>}
                        {parseFloat(product.details?.price) > 0 && (
                          <Tag color="green" icon={<DollarOutlined />}>{formatPrice(product.details.price)}</Tag>
                        )}
                        {parseFloat(product.details?.rating) > 0 && (
                          <Tag color="gold" icon={<StarOutlined />}>
                            {parseFloat(product.details.rating).toFixed(1)} / 5
                          </Tag>
                        )}
                        <Tag color="purple">{formatTableName(product.source_table)}</Tag>
                      </Space>
                    </Col>
                    <Col xs={24} md={8} className="result-scores">
                      <div className="similarity-score">%{(product.similarity * 100).toFixed(1)} benzerlik</div>
                      {product.risk_analysis?.overall_risk !== undefined && (
                        <Tag
                          color={getRiskLevelColor(product.risk_analysis.risk_level)}
                          icon={<WarningOutlined />}
                          style={{ marginTop: 8 }}
                        >
                          Risk: {product.risk_analysis.overall_risk} / 10 - {product.risk_analysis.risk_level}
                        </Tag>
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {!loading && results.length === 0 && searchQuery && (
        <Card>
          <Empty
            description={
              <span>
                Arama kriterlerinize uygun ürün bulunamadı.
                <br />
                Daha genel bir terim deneyin veya filtreleri gevşetin.
              </span>
            }
          />
        </Card>
      )}

      <ProductDetailModal
        product={detailModal.product}
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, product: null })}
      />

      <RiskAnalysisModal
        product={analysisModal.product}
        analysis={analysisModal.analysis}
        loading={analysisLoading}
        open={analysisModal.open}
        onClose={() => setAnalysisModal({ open: false, product: null, analysis: null })}
      />
    </div>
  );
};

export default ProductSearch;
