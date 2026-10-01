import React from 'react';
import { Col, Row } from 'antd';
import { formatScore } from '../utils/format';

const SCORES = [
  { key: 'overall_risk', label: 'Genel Risk Skoru', color: '#ff7043' },
  { key: 'price_risk', label: 'Fiyat Riski', color: '#ab47bc' },
  { key: 'rating_risk', label: 'Değerlendirme Riski', color: '#66bb6a' },
  { key: 'competition_risk', label: 'Rekabet Riski', color: '#42a5f5' },
];

const RiskScoreGrid = ({ riskAnalysis }) => (
  <Row gutter={[16, 16]}>
    {SCORES.map(({ key, label, color }) => (
      <Col xs={12} md={6} key={key}>
        <div className="risk-score-card" style={{ borderColor: color }}>
          <div className="risk-score-value" style={{ color }}>
            {formatScore(riskAnalysis?.[key])}
          </div>
          <div className="risk-score-label">{label}</div>
        </div>
      </Col>
    ))}
  </Row>
);

export default RiskScoreGrid;
