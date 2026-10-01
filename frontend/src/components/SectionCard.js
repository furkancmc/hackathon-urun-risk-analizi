import React from 'react';
import { Card } from 'antd';

// Sol kenarı renkli, başlıklı içerik kartı. Detay ve analiz ekranlarında ortak kullanılır.
const SectionCard = ({ title, color, children, style }) => (
  <Card
    title={<span className="section-card-title" style={{ color }}>{title}</span>}
    size="small"
    className="analysis-card ai-analysis-card"
    style={{ borderLeft: `4px solid ${color}`, ...style }}
  >
    {children}
  </Card>
);

export default SectionCard;
