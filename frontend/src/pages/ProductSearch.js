import React, { useState } from 'react';
import { 
  Input, 
  Button, 
  Card, 
  Row, 
  Col, 
  Slider, 
  Select, 
  message, 
  Spin, 
  Tag, 
  Modal,
  Alert,
  Space,
  Collapse,
  List
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  ExperimentOutlined,
  DollarOutlined,
  StarOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api';

const { Search } = Input;

const ProductSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    price_range: [0, 100000],
    min_rating: 0,
    brands: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [detailModal, setDetailModal] = useState({ visible: false, product: null });
  const [analysisModal, setAnalysisModal] = useState({ visible: false, product: null, analysis: null });
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [brands, setBrands] = useState([]);

  // İngilizce alan adlarını Türkçeye çevir
  const getTurkishFieldName = (fieldName) => {
    const translations = {
      'barrier_to_entry': 'Pazara Giriş Engeli',
      'break_even_time': 'Başabaş Noktası',
      'cash_flow_impact': 'Nakit Akışı Etkisi',
      'competition_level': 'Rekabet Seviyesi',
      'confidence_level': 'Güven Skoru',
      'cost_optimization': 'Maliyet Optimizasyonu',
      'customer_satisfaction_risk': 'Müşteri Memnuniyeti Riski',
      'decision': 'Karar',
      'differentiation_opportunity': 'Farklılaşma Fırsatı',
      'estimated_monthly_sales': 'Tahmini Aylık Satış',
      'executive_summary': 'Satıcı Özeti',
      'exit_strategy': 'Çıkış Stratejisi',
      'future_outlook': 'Gelecek Beklentisi',
      'growth_potential': 'Büyüme Potansiyeli',
      'growth_strategies': 'Büyüme Stratejileri',
      'immediate_actions': 'Acil Eylemler',
      'innovation_impact': 'Yenilik Etkisi',
      'inventory_recommendation': 'Stok Tavsiyesi',
      'last_updated': 'Son Güncelleme',
      'logistics_complexity': 'Lojistik Karmaşıklığı',
      'main_risks': 'Ana Riskler',
      'market_demand': 'Pazar Talebi',
      'market_saturation': 'Pazar Doygunluğu',
      'marketing_focus': 'Pazarlama Odağı',
      'mitigation_strategies': 'Azaltım Stratejileri',
      'monthly_revenue_estimate': 'Aylık Gelir Tahmini',
      'overall_rating': 'Genel Derecelendirme',
      'overall_risk_score': 'Risk Skoru',
      'platform': 'Satış Platformu',
      'price_category': 'Fiyat Segmenti',
      'price_competitiveness': 'Fiyat Rekabeti',
      'price_trend': 'Fiyat Eğilimi',
      'priority_level': 'Öncelik Seviyesi',
      'product_id': 'Ürün Kimliği',
      'product_url': 'Ürün Linki',
      'profit_margin_estimate': 'Kâr Marjı Tahmini',
      'purchase_motivation': 'Satın Alma Motivasyonu',
      'return_risk': 'İade Riski',
      'roi_potential': 'Yatırım Geri Dönüş Potansiyeli',
      'sales_velocity': 'Satış Hızı',
      'search_keywords': 'Arama Etiketleri',
      'seasonality': 'Sezonsallık',
      'supplier_reliability': 'Tedarikçi Güvenilirliği',
      'support_requirements': 'Destek Gereksinimi',
      'target_customer': 'Hedef Müşteri',
      'technical_summary': 'Teknik Özellikler',
      'technology_lifecycle': 'Teknoloji Ömrü',
      'trending_status': 'Trend Durumu',
      'updated_at': 'Son Güncellenme',
      'competitive_positioning': 'Rekabet Konumu',
      'customer_insights': 'Müşteri Analizi',
      'financial_projections': 'Mali Tahminler',
      'inventory_strategy': 'Stok Stratejisi',
      'marketing_angles': 'Pazarlama Açısı',
      'operational_advice': 'Operasyon Tavsiyeleri',
      'pricing_opportunities': 'Fiyatlandırma Fırsatları',
      'profitability_analysis': 'Karlılık Analizi',
      'risk_management': 'Risk Yönetimi',
      'sales_performance': 'Satış Performansı',
      'sales_volume': 'Satış Hacmi',
      'seller_action_plan': 'Satıcı Eylem Planı',
      'seller_description': 'Satıcı Açıklaması',
      'seller_summary': 'Satıcı Özeti'
    };
    
    return translations[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Markaları yükle
  const loadBrands = async () => {
    try {
      setBrandsLoading(true);
      const response = await apiService.getBrands();
      if (response.data.success) {
        setBrands(response.data.data);
      }
    } catch (error) {
      console.error('Marka yükleme hatası:', error);
    } finally {
      setBrandsLoading(false);
    }
  };

  // Component mount olduğunda markaları yükle
  React.useEffect(() => {
    loadBrands();
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      message.warning('Lütfen arama terimi girin');
      return;
    }

    setLoading(true);
    setSearchQuery(query);

    try {
      const searchFilters = {};
      
      if (filters.price_range[0] > 0 || filters.price_range[1] < 100000) {
        searchFilters.price_min = filters.price_range[0];
        searchFilters.price_max = filters.price_range[1];
      }
      
      if (filters.min_rating > 0) {
        searchFilters.rating_min = filters.min_rating;
      }
      
      if (filters.brands.length > 0) {
        searchFilters.brands = filters.brands;
      }

      const response = await apiService.searchProducts(query, searchFilters, 10);
      
      if (response.data.success) {
        // Boş içerikli ürünleri filtrele
        const filteredResults = response.data.data.filter(product => {
          // Ürün adı kontrolü
          if (!product.name || product.name.trim() === '') return false;
          
          // Detay kontrolü
          if (product.details) {
            const hasValidPrice = product.details.price && parseFloat(product.details.price) > 0;
            const hasValidRating = product.details.rating && parseFloat(product.details.rating) > 0;
            const hasValidBrand = product.details.brand && product.details.brand.trim() !== '';
            
            // En az bir geçerli alan olmalı
            return hasValidPrice || hasValidRating || hasValidBrand;
          }
          
          return true; // Detay yoksa kabul et
        });
        
        setResults(filteredResults);
        message.success(`${filteredResults.length} ürün bulundu!`);
      } else {
        message.error('Arama başarısız');
      }
    } catch (error) {
      message.error(`Arama hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showProductDetails = async (product) => {
    try {
      const response = await apiService.getProductDetails(product.id, product.source_table);
      
      if (response.data.success) {
        setDetailModal({
          visible: true,
          product: {
            ...product,
            fullDetails: response.data.data
          }
        });
      } else {
        message.error('Ürün detayları yüklenemedi: ' + (response.data.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Product details error:', error);
      message.error(`Detay hatası: ${error.message}`);
    }
  };

  const showAIAnalysis = async (product) => {
    setAnalysisModal({ visible: true, product, analysis: null });
    setAnalysisLoading(true);

    try {
      const response = await apiService.analyzeProduct(product.id, product.source_table, 'Bu ürün için satıcı risk analizi yap');
      
      if (response.data.success) {
        setAnalysisModal(prev => ({
          ...prev,
          analysis: response.data.data
        }));
      } else {
        message.error('AI analizi başarısız: ' + (response.data.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      message.error(`AI analiz hatası: ${error.message}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    if (!riskLevel) return 'default';
    
    if (riskLevel.includes('YÜKSEK')) return 'red';
    if (riskLevel.includes('ORTA')) return 'orange';
    if (riskLevel.includes('DÜŞÜK')) return 'green';
    return 'default';
  };

  const getRiskIcon = (riskScore) => {
    if (riskScore >= 7) return '🔴';
    if (riskScore >= 5) return '🟡';
    if (riskScore >= 3) return '🟢';
    return '✅';
  };

  const parseAIAnalysisToCards = (analysisText) => {
    if (!analysisText) return null;

    const cards = [];
    
    // AI analiz metnini bölümlere ayır
    const sections = analysisText.split(/(?=## )/);
    
    sections.forEach((section, index) => {
      if (!section.trim()) return;
      
      const lines = section.trim().split('\n');
      const titleLine = lines[0];
      const content = lines.slice(1).join('\n').trim();
      
      if (!titleLine || !content) return;
      
      // Başlıktan ikonu ve metni çıkar
      const titleMatch = titleLine.match(/##\s*([^\n]+)/);
      if (!titleMatch) return;
      
      const fullTitle = titleMatch[1].trim();
      const iconMatch = fullTitle.match(/^([^\s]+)\s+(.+)$/);
      
      let icon = '📋';
      let title = fullTitle;
      
      if (iconMatch) {
        icon = iconMatch[1];
        title = iconMatch[2];
      }
      
      // Başlığa göre renk belirle
      let color = '#1976d2';
      if (title.includes('Risk') || title.includes('Kritik')) color = '#d32f2f';
      else if (title.includes('Fiyat') || title.includes('Rekabet')) color = '#ff9800';
      else if (title.includes('Karlılık') || title.includes('Satış')) color = '#4caf50';
      else if (title.includes('Pazarlama') || title.includes('Müşteri')) color = '#9c27b0';
      else if (title.includes('Operasyon') || title.includes('Lojistik')) color = '#607d8b';
      else if (title.includes('Eylem') || title.includes('Strateji')) color = '#2196f3';
      else if (title.includes('Karar') || title.includes('Özet')) color = '#ff5722';
      
      cards.push(
        <Card 
          key={`section-${index}`}
          title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{icon} {title}</span>}
          style={{ 
            marginBottom: 16, 
            borderLeft: `4px solid ${color}`
          }}
          size="small"
          bordered
          hoverable
          className="analysis-card ai-analysis-card"
          data-index={index}
        >
          <div style={{ 
            lineHeight: '1.6',
            fontSize: '14px',
            color: '#e0e0e0',
            padding: '8px',
            background: '#262626',
            borderRadius: '4px',
            border: '1px solid #444'
          }}>
            {content.split('\n').map((line, lineIndex) => {
              // Liste öğelerini özel olarak formatla
              if (line.trim().startsWith('-')) {
                return (
                  <div key={lineIndex} style={{ marginBottom: '8px', paddingLeft: '16px' }}>
                    <span style={{ color: '#4caf50' }}>•</span> {line.trim().substring(1).trim()}
                  </div>
                );
              }
              // Alt başlıkları vurgula
              else if (line.trim().startsWith('--')) {
                return (
                  <div key={lineIndex} style={{ 
                    marginTop: '12px', 
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: '#ff9800'
                  }}>
                    {line.trim().substring(2).trim()}
                  </div>
                );
              }
              // Normal metin
              else if (line.trim()) {
                return (
                  <div key={lineIndex} style={{ marginBottom: '8px' }}>
                    {line}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </Card>
      );
    });
    
    return cards;
  };

  // IntersectionObserver için useEffect
  React.useEffect(() => {
    if ((analysisModal.visible && analysisModal.analysis) || detailModal.visible) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-on-scroll');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        }
      );

      // Tüm analiz kartlarını gözlemle
      const cards = document.querySelectorAll('.analysis-card');
      cards.forEach((card) => {
        observer.observe(card);
      });

      return () => {
        cards.forEach((card) => {
          observer.unobserve(card);
        });
      };
    }
  }, [analysisModal.visible, analysisModal.analysis, detailModal.visible]);

  return (
    <div>
      <Card title="🔍 Ürün Risk Analizi ve Arama" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col span={18}>
            <Search
              placeholder="Örn: Samsung inverter klima, iPhone kulaklık, LG buzdolabı..."
              enterButton={
                <Button type="primary" icon={<SearchOutlined />}>
                  Risk Analizi Yap
                </Button>
              }
              size="large"
              onSearch={handleSearch}
              loading={loading}
            />
          </Col>
          <Col span={6}>
            <Button 
              type="default" 
              size="large" 
              style={{ width: '100%' }}
              onClick={() => {
                setFilters({ price_range: [0, 100000], min_rating: 0, brands: [] });
                message.info('Filtreler temizlendi');
              }}
            >
              Filtreleri Temizle
            </Button>
          </Col>
        </Row>

        {/* Filtreler */}
        <Card size="small" title="🔧 Gelişmiş Filtreler" style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <label>💰 Fiyat Aralığı (₺)</label>
              <Slider
                range
                min={0}
                max={100000}
                step={1000}
                value={filters.price_range}
                onChange={(value) => setFilters(prev => ({ ...prev, price_range: value }))}
                tooltip={{ formatter: (value) => `₺${value.toLocaleString()}` }}
              />
            </Col>
            <Col span={8}>
              <label>⭐ Minimum Rating</label>
              <Slider
                min={0}
                max={5}
                step={0.1}
                value={filters.min_rating}
                onChange={(value) => setFilters(prev => ({ ...prev, min_rating: value }))}
                tooltip={{ formatter: (value) => `${value}/5` }}
              />
            </Col>

          </Row>
        </Card>
      </Card>

      {/* Arama Sonuçları */}
      {loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>🤖 AI risk analizi yapıyor...</p>
          </div>
        </Card>
      )}

      {results.length > 0 && !loading && (
        <Card title={`📊 Bulunan Ürünler (${results.length})`}>
          <Row gutter={[16, 16]}>
            {results.map((product, index) => (
              <Col span={24} key={product.id}>
                <Card 
                  className="search-result"
                  hoverable
                  actions={[
                    <Button 
                      icon={<EyeOutlined />} 
                      onClick={() => showProductDetails(product)}
                    >
                      Detayları Gör
                    </Button>,
                    <Button 
                      type="primary" 
                      icon={<ExperimentOutlined />}
                      onClick={() => showAIAnalysis(product)}
                    >
                      Risk Analizi
                    </Button>
                  ]}
                >
                  <Row>
                    <Col span={16}>
                      <h3>#{index + 1} {product.name}</h3>
                      
                      {product.details && (
                        <Space>
                          {product.details.brand && (
                            <Tag color="blue">🏷️ {product.details.brand}</Tag>
                          )}
                          {product.details.price && (
                            <Tag color="green" icon={<DollarOutlined />}>
                              ₺{parseFloat(product.details.price).toLocaleString()}
                            </Tag>
                          )}
                          {product.details.rating && (
                            <Tag color="gold" icon={<StarOutlined />}>
                              {parseFloat(product.details.rating).toFixed(1)}/5
                            </Tag>
                          )}
                          <Tag color="purple">📦 {product.source_table.replace('_', ' ').toUpperCase()}</Tag>
                        </Space>
                      )}
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                      <div className="similarity-score">
                        %{(product.similarity * 100).toFixed(1)} uygun
                      </div>
                      
                      {product.risk_analysis && (
                        <div style={{ marginTop: 8 }}>
                          <Tag 
                            color={getRiskColor(product.risk_analysis.risk_level)}
                            icon={<WarningOutlined />}
                          >
                            {getRiskIcon(product.risk_analysis.overall_risk)} 
                            Risk: {product.risk_analysis.overall_risk}/10
                          </Tag>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Ürün Detayları Modal */}
      <Modal
        title={`📋 ${detailModal.product?.name} - Detaylı Ürün Bilgileri`}
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, product: null })}
        width={1200}
        footer={null}
        style={{ top: 20 }}
      >
        {detailModal.product?.fullDetails && (
          <div className="analysis-modal-content">
            {/* Risk Analizi Bölümü */}
            {detailModal.product.fullDetails.risk_analysis && (
              <Card 
                title={<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>⚠️ Risk Analizi</span>}
                style={{ marginBottom: 24, borderLeft: '4px solid #d32f2f' }}
                size="small"
                className="analysis-card ai-analysis-card"
              >
                <Row gutter={[24, 16]}>
                  <Col span={6}>
                    <div className="risk-score-card" style={{ background: '#fff3e0' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
                        {detailModal.product.fullDetails.risk_analysis.overall_risk}/10
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Genel Risk Skoru</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="risk-score-card" style={{ background: '#f3e5f5' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                        {detailModal.product.fullDetails.risk_analysis.price_risk?.toFixed(1)}/10
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Fiyat Riski</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="risk-score-card" style={{ background: '#e8f5e8' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                        {detailModal.product.fullDetails.risk_analysis.rating_risk?.toFixed(1)}/10
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Değerlendirme Riski</div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="risk-score-card" style={{ background: '#e3f2fd' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                        {detailModal.product.fullDetails.risk_analysis.competition_risk?.toFixed(1)}/10
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Rekabet Riski</div>
                    </div>
                  </Col>
                  <Col span={24}>
                    <Alert
                      message="💡 Satıcı Eylem Planı"
                      description={detailModal.product.fullDetails.risk_analysis.seller_recommendation}
                      type="info"
                      showIcon
                      style={{ marginTop: '12px' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            <Row gutter={[16, 16]}>
              {/* Ürün Kimliği ve Temel Bilgiler */}
              <Col span={12}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>📦 Ürün Kimliği ve Temel Bilgiler</span>}
                  style={{ height: '100%', borderLeft: '4px solid #1976d2' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <div className="product-info-row">
                    {detailModal.product.fullDetails.name && (
                      <div><strong>Ürün Adı:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.name}</span></div>
                    )}
                    {detailModal.product.fullDetails.brand && (
                      <div><strong>Marka:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.brand}</span></div>
                    )}
                    {detailModal.product.fullDetails.model && (
                      <div><strong>Model:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.model}</span></div>
                    )}
                    {detailModal.product.fullDetails.category && (
                      <div><strong>Kategori:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.category}</span></div>
                    )}
                    {detailModal.product.fullDetails.color && (
                      <div><strong>Renk:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.color}</span></div>
                    )}
                    {detailModal.product.fullDetails.platform && (
                      <div><strong>Platform:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.platform}</span></div>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Kârlılık ve Satış Analizi */}
              <Col span={12}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#4caf50' }}>💰 Kârlılık ve Satış Analizi</span>}
                  style={{ height: '100%', borderLeft: '4px solid #4caf50' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <div className="product-info-row">
                    {detailModal.product.fullDetails.price && (
                      <div><strong>Fiyat:</strong> <span style={{ marginLeft: '8px', color: '#4caf50', fontWeight: 'bold' }}>₺{parseFloat(detailModal.product.fullDetails.price).toLocaleString()}</span></div>
                    )}
                    {detailModal.product.fullDetails.rating && (
                      <div><strong>Müşteri Puanı:</strong> <span style={{ marginLeft: '8px', color: '#ff9800', fontWeight: 'bold' }}>{parseFloat(detailModal.product.fullDetails.rating).toFixed(1)} ⭐</span></div>
                    )}
                    {detailModal.product.fullDetails.sales_volume && (
                      <div><strong>Satış Hacmi:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.sales_volume}</span></div>
                    )}
                    {detailModal.product.fullDetails.profit_margin_estimate && (
                      <div><strong>Kâr Marjı:</strong> <span style={{ marginLeft: '8px', color: '#4caf50' }}>{detailModal.product.fullDetails.profit_margin_estimate}</span></div>
                    )}
                    {detailModal.product.fullDetails.monthly_revenue_estimate && (
                      <div><strong>Aylık Gelir:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.monthly_revenue_estimate}</span></div>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Rekabet ve Konumlandırma */}
              <Col span={12}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff9800' }}>🎯 Rekabet ve Konumlandırma</span>}
                  style={{ height: '100%', borderLeft: '4px solid #ff9800' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <div className="product-info-row">
                    {detailModal.product.fullDetails.competitive_positioning && (
                      <div><strong>Rekabet Konumu:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.competitive_positioning}</span></div>
                    )}
                    {detailModal.product.fullDetails.price_competitiveness && (
                      <div><strong>Fiyat Rekabeti:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.price_competitiveness}</span></div>
                    )}
                    {detailModal.product.fullDetails.competition_level && (
                      <div><strong>Rekabet Seviyesi:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.competition_level}</span></div>
                    )}
                    {detailModal.product.fullDetails.market_demand && (
                      <div><strong>Pazar Talebi:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.market_demand}</span></div>
                    )}
                    {detailModal.product.fullDetails.growth_potential && (
                      <div><strong>Büyüme Potansiyeli:</strong> <span style={{ marginLeft: '8px', color: '#4caf50' }}>{detailModal.product.fullDetails.growth_potential}</span></div>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Pazarlama ve Müşteri Stratejisi */}
              <Col span={12}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#9c27b0' }}>📈 Pazarlama ve Müşteri Stratejisi</span>}
                  style={{ height: '100%', borderLeft: '4px solid #9c27b0' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <div className="product-info-row">
                    {detailModal.product.fullDetails.marketing_angles && (
                      <div><strong>Pazarlama Açısı:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.marketing_angles}</span></div>
                    )}
                    {detailModal.product.fullDetails.customer_insights && (
                      <div><strong>Müşteri Analizi:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.customer_insights}</span></div>
                    )}
                    {detailModal.product.fullDetails.target_customer && (
                      <div><strong>Hedef Müşteri:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.target_customer}</span></div>
                    )}
                    {detailModal.product.fullDetails.purchase_motivation && (
                      <div><strong>Satın Alma Motivasyonu:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.purchase_motivation}</span></div>
                    )}
                    {detailModal.product.fullDetails.trending_status && (
                      <div><strong>Trend Durumu:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.trending_status}</span></div>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Operasyon ve Lojistik */}
              <Col span={12}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#607d8b' }}>🚚 Operasyon ve Lojistik</span>}
                  style={{ height: '100%', borderLeft: '4px solid #607d8b' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <div className="product-info-row">
                    {detailModal.product.fullDetails.stock_status && (
                      <div><strong>Stok Durumu:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.stock_status}</span></div>
                    )}
                    {detailModal.product.fullDetails.availability && (
                      <div><strong>Tedarik Durumu:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.availability}</span></div>
                    )}
                    {detailModal.product.fullDetails.seller_name && (
                      <div><strong>Satıcı:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.seller_name}</span></div>
                    )}
                    {detailModal.product.fullDetails.shipping && (
                      <div><strong>Kargo:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.shipping}</span></div>
                    )}
                    {detailModal.product.fullDetails.logistics_complexity && (
                      <div><strong>Lojistik Karmaşıklığı:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.logistics_complexity}</span></div>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Genel Özet */}
              <Col span={12}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff5722' }}>📋 Genel Özet</span>}
                  style={{ height: '100%', borderLeft: '4px solid #ff5722' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <div className="product-info-row">
                    {detailModal.product.fullDetails.seller_summary && (
                      <div><strong>Satıcı Özeti:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.seller_summary}</span></div>
                    )}
                    {detailModal.product.fullDetails.seller_description && (
                      <div><strong>Satıcı Açıklaması:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.seller_description}</span></div>
                    )}
                    {detailModal.product.fullDetails.executive_summary && (
                      <div><strong>Yönetici Özeti:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.executive_summary}</span></div>
                    )}
                    {detailModal.product.fullDetails.created_at && (
                      <div><strong>Oluşturulma Tarihi:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.created_at}</span></div>
                    )}
                    {detailModal.product.fullDetails.last_updated && (
                      <div><strong>Son Güncelleme:</strong> <span style={{ marginLeft: '8px' }}>{detailModal.product.fullDetails.last_updated}</span></div>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Ürün Açıklaması */}
              {detailModal.product.fullDetails.description && (
                <Col span={24}>
                  <Card 
                    title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#455a64' }}>📝 Ürün Açıklaması</span>}
                    style={{ borderLeft: '4px solid #455a64' }}
                    size="small"
                    className="analysis-card ai-analysis-card"
                  >
                    <div style={{ 
                      lineHeight: '1.6', 
                      color: '#ffffff',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      padding: '8px',
                      background: '#262626',
                      borderRadius: '4px',
                      border: '1px solid #434343'
                    }}>
                      {detailModal.product.fullDetails.description}
                    </div>
                  </Card>
                </Col>
              )}

              {/* Diğer Bilgiler */}
              <Col span={24}>
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#616161' }}>🔧 Diğer Teknik Detaylar</span>}
                  style={{ borderLeft: '4px solid #616161' }}
                  size="small"
                  className="analysis-card ai-analysis-card"
                >
                  <Row gutter={[16, 8]}>
                    {Object.entries(detailModal.product.fullDetails)
                      .filter(([key]) => !['risk_analysis', 'name', 'brand', 'model', 'category', 'color', 'platform', 'price', 'rating', 'sales_volume', 'profit_margin_estimate', 'monthly_revenue_estimate', 'competitive_positioning', 'price_competitiveness', 'competition_level', 'market_demand', 'growth_potential', 'marketing_angles', 'customer_insights', 'target_customer', 'purchase_motivation', 'trending_status', 'stock_status', 'availability', 'seller_name', 'shipping', 'logistics_complexity', 'seller_summary', 'seller_description', 'executive_summary', 'created_at', 'last_updated', 'description'].includes(key))
                      .map(([key, value]) => (
                        <Col span={12} key={key}>
                          <div style={{ padding: '8px', background: '#262626', borderRadius: '4px', marginBottom: '4px', border: '1px solid #434343' }}>
                            <strong style={{ color: '#a6a6a6' }}>
                              {getTurkishFieldName(key)}:
                            </strong>
                            <div style={{ marginTop: '4px', color: '#ffffff', fontSize: '14px' }}>
                              {value ? String(value) : 'Bilgi yok'}
                            </div>
                          </div>
                        </Col>
                      ))}
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* AI Analiz Modal */}
      <Modal
        title={`🤖 ${analysisModal.product?.name} - Satıcı Risk Analizi`}
        open={analysisModal.visible}
        onCancel={() => setAnalysisModal({ visible: false, product: null, analysis: null })}
        width={1200}
        footer={null}
        style={{ top: 20 }}
      >
        {analysisLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>🧠 Risk analizi yapılıyor...</p>
          </div>
        ) : (
          analysisModal.analysis && (
            <div className="analysis-modal-content">
              {/* Risk Analizi Özeti */}
              {analysisModal.analysis.risk_analysis && (
                <Card 
                  title={<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>⚠️ Risk Analizi Özeti</span>}
                  style={{ marginBottom: 24, borderLeft: '4px solid #d32f2f' }}
                  size="small"
                  bordered
                  hoverable
                  className="analysis-card ai-analysis-card"
                >
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <div className="risk-score-card" style={{ 
                        background: '#fff3e0', 
                        border: '1px solid #e65100'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
                          {analysisModal.analysis.risk_analysis.overall_risk}/10
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Genel Risk Skoru</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="risk-score-card" style={{ 
                        background: '#f3e5f5', 
                        border: '1px solid #7b1fa2'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                          {analysisModal.analysis.risk_analysis.price_risk?.toFixed(1)}/10
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Fiyat Riski</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="risk-score-card" style={{ 
                        background: '#e8f5e8', 
                        border: '1px solid #2e7d32'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                          {analysisModal.analysis.risk_analysis.rating_risk?.toFixed(1)}/10
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Değerlendirme Riski</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="risk-score-card" style={{ 
                        background: '#e3f2fd', 
                        border: '1px solid #1976d2'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                          {analysisModal.analysis.risk_analysis.competition_risk?.toFixed(1)}/10
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Rekabet Riski</div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* AI Analizi Kartları */}
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                lineHeight: '1.6',
                fontSize: '14px',
                color: '#e0e0e0'
              }}>
                {parseAIAnalysisToCards(analysisModal.analysis.analysis)}
              </div>

              {/* AI Önerileri Kartı */}
              <Card 
                title={<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>🎯 AI Stratejik Önerileri</span>}
                style={{ marginTop: 24, borderLeft: '4px solid #4caf50' }}
                size="small"
                bordered
                hoverable
                className="analysis-card ai-analysis-card"
              >
                <Alert
                  message="💡 Satıcı Eylem Planı"
                  description={analysisModal.analysis.risk_analysis?.seller_recommendation || "Detaylı öneriler için analiz sonuçlarını inceleyin."}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Collapse defaultActiveKey={['1']} ghost className="analysis-collapse">
                  <Collapse.Panel 
                    header={<span style={{ color: '#4caf50', fontWeight: 'bold' }}>🚀 Acil Eylemler</span>} 
                    key="1"
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Fiyat optimizasyonu yapın",
                        "Stok durumunu kontrol edin",
                        "Müşteri yorumlarını analiz edin"
                      ]}
                      renderItem={(item) => (
                        <List.Item className="analysis-list-item">
                          <Tag color="red" className="analysis-tag">Acil</Tag> {item}
                        </List.Item>
                      )}
                    />
                  </Collapse.Panel>
                  <Collapse.Panel 
                    header={<span style={{ color: '#ff9800', fontWeight: 'bold' }}>📈 Bu Ay</span>} 
                    key="2"
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Pazarlama stratejisini güncelleyin",
                        "Rekabet analizi yapın",
                        "Satış hedeflerini belirleyin"
                      ]}
                      renderItem={(item) => (
                        <List.Item className="analysis-list-item">
                          <Tag color="orange" className="analysis-tag">Bu Ay</Tag> {item}
                        </List.Item>
                      )}
                    />
                  </Collapse.Panel>
                  <Collapse.Panel 
                    header={<span style={{ color: '#2196f3', fontWeight: 'bold' }}>🎯 Uzun Vade</span>} 
                    key="3"
                  >
                    <List
                      size="small"
                      dataSource={[
                        "Müşteri sadakat programı geliştirin",
                        "Yeni ürün kategorileri keşfedin",
                        "Tedarikçi ilişkilerini güçlendirin"
                      ]}
                      renderItem={(item) => (
                        <List.Item className="analysis-list-item">
                          <Tag color="blue" className="analysis-tag">Uzun Vade</Tag> {item}
                        </List.Item>
                      )}
                    />
                  </Collapse.Panel>
                </Collapse>
              </Card>

              {/* Debug Mod - Geliştirme Ortamında */}
              {process.env.NODE_ENV === 'development' && (
                <Card 
                  title={<span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff9800' }}>🔧 Debug - Ham Veri</span>}
                  style={{ marginTop: 24, borderLeft: '4px solid #ff9800' }}
                  size="small"
                  bordered
                  className="analysis-card debug-panel"
                >
                  <Collapse>
                    <Collapse.Panel header="JSON Verisi Göster" key="1">
                      <pre style={{ 
                        background: '#262626', 
                        padding: '16px', 
                        borderRadius: '4px', 
                        overflow: 'auto',
                        fontSize: '12px',
                        color: '#e0e0e0',
                        border: '1px solid #444'
                      }}>
                        {JSON.stringify(analysisModal.analysis, null, 2)}
                      </pre>
                    </Collapse.Panel>
                  </Collapse>
                </Card>
              )}
            </div>
          )
        )}
      </Modal>

      {results.length === 0 && !loading && searchQuery && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>🤔 Arama kriterlerinize uygun ürün bulunamadı.</p>
            <p>💡 <strong>Öneri:</strong> 'Samsung klima', 'iPhone kulaklık', 'LG buzdolabı' gibi spesifik terimler deneyin.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductSearch;
