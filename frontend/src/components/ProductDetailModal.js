import React from 'react';
import { Alert, Col, Modal, Row } from 'antd';
import RiskScoreGrid from './RiskScoreGrid';
import SectionCard from './SectionCard';
import { getFieldLabel } from '../constants/fieldLabels';
import { formatPrice, formatRating, formatValue } from '../utils/format';

// Ürün detay ekranındaki tematik bölümler ve her bölümde gösterilecek alanlar.
const DETAIL_SECTIONS = [
  {
    title: 'Ürün Kimliği ve Temel Bilgiler',
    color: '#1976d2',
    fields: ['name', 'brand', 'model', 'category', 'color', 'platform'],
  },
  {
    title: 'Kârlılık ve Satış Analizi',
    color: '#4caf50',
    fields: ['price', 'rating', 'sales_volume', 'profit_margin_estimate', 'monthly_revenue_estimate'],
  },
  {
    title: 'Rekabet ve Konumlandırma',
    color: '#ff9800',
    fields: ['competitive_positioning', 'price_competitiveness', 'competition_level', 'market_demand',
      'growth_potential'],
  },
  {
    title: 'Pazarlama ve Müşteri Stratejisi',
    color: '#9c27b0',
    fields: ['marketing_angles', 'customer_insights', 'target_customer', 'purchase_motivation',
      'trending_status', 'search_keywords'],
  },
  {
    title: 'Operasyon ve Lojistik',
    color: '#607d8b',
    fields: ['stock_status', 'availability', 'seller_name', 'shipping', 'logistics_complexity'],
  },
  {
    title: 'Genel Özet',
    color: '#ff5722',
    fields: ['seller_summary', 'seller_description', 'executive_summary', 'created_at', 'last_updated'],
  },
];

const FIELD_FORMATTERS = {
  price: formatPrice,
  rating: formatRating,
};

const HIDDEN_FIELDS = new Set([
  ...DETAIL_SECTIONS.flatMap((section) => section.fields),
  'risk_analysis',
  'description',
  'source',
  'embedding',
]);

const hasValue = (value) => value !== null && value !== undefined && value !== '';

const FieldRow = ({ field, value }) => (
  <div>
    <strong>{getFieldLabel(field)}:</strong>
    <span className="field-value">{(FIELD_FORMATTERS[field] || formatValue)(value)}</span>
  </div>
);

const ProductDetailModal = ({ product, open, onClose }) => {
  const details = product?.fullDetails;
  const otherFields = details
    ? Object.entries(details).filter(([field, value]) => !HIDDEN_FIELDS.has(field) && hasValue(value))
    : [];

  return (
    <Modal
      title={`${product?.name || ''} - Detaylı Ürün Bilgileri`}
      open={open}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
    >
      {details && (
        <div className="analysis-modal-content">
          {details.risk_analysis && (
            <SectionCard title="Risk Analizi" color="#d32f2f" style={{ marginBottom: 24 }}>
              <RiskScoreGrid riskAnalysis={details.risk_analysis} />
              <Alert
                message="Satıcı Önerisi"
                description={details.risk_analysis.seller_recommendation}
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </SectionCard>
          )}

          <Row gutter={[16, 16]}>
            {DETAIL_SECTIONS.map((section) => {
              const fields = section.fields.filter((field) => hasValue(details[field]));
              if (fields.length === 0) return null;
              return (
                <Col xs={24} lg={12} key={section.title}>
                  <SectionCard title={section.title} color={section.color} style={{ height: '100%' }}>
                    <div className="product-info-row">
                      {fields.map((field) => (
                        <FieldRow key={field} field={field} value={details[field]} />
                      ))}
                    </div>
                  </SectionCard>
                </Col>
              );
            })}

            {hasValue(details.description) && (
              <Col span={24}>
                <SectionCard title="Ürün Açıklaması" color="#455a64">
                  <div className="description-box">{details.description}</div>
                </SectionCard>
              </Col>
            )}

            {otherFields.length > 0 && (
              <Col span={24}>
                <SectionCard title="Diğer Detaylar" color="#616161">
                  <Row gutter={[16, 8]}>
                    {otherFields.map(([field, value]) => (
                      <Col xs={24} md={12} key={field}>
                        <div className="detail-field">
                          <strong>{getFieldLabel(field)}</strong>
                          <div>{formatValue(value)}</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </SectionCard>
              </Col>
            )}
          </Row>
        </div>
      )}
    </Modal>
  );
};

export default ProductDetailModal;
