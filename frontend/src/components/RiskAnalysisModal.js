import React, { useMemo } from 'react';
import { Alert, Collapse, List, Modal, Spin, Tag } from 'antd';
import RiskScoreGrid from './RiskScoreGrid';
import SectionCard from './SectionCard';
import { parseAnalysisSections } from '../utils/analysisParser';

const ACTION_GROUPS = [
  { key: 'immediate_actions', label: 'Acil Eylemler', tag: 'Acil', color: 'red' },
  { key: 'this_month', label: 'Bu Ay', tag: 'Bu Ay', color: 'orange' },
  { key: 'long_term', label: 'Uzun Vade', tag: 'Uzun Vade', color: 'blue' },
];

const AnalysisSection = ({ section }) => (
  <SectionCard title={section.title} color={section.color} style={{ marginBottom: 16 }}>
    <div className="analysis-body">
      {section.lines.map((line, index) => {
        if (line.type === 'heading') {
          return <div key={index} className="analysis-subheading">{line.text}</div>;
        }
        if (line.type === 'bullet') {
          return <div key={index} className="analysis-bullet">{line.text}</div>;
        }
        return <p key={index}>{line.text}</p>;
      })}
    </div>
  </SectionCard>
);

const ActionPlan = ({ plan, recommendation }) => {
  const items = ACTION_GROUPS.map((group) => ({
    key: group.key,
    label: <span className="action-group-label">{group.label}</span>,
    children: (
      <List
        size="small"
        dataSource={plan?.[group.key] || []}
        locale={{ emptyText: 'Öneri bulunmuyor' }}
        renderItem={(item) => (
          <List.Item className="analysis-list-item">
            <Tag color={group.color} className="analysis-tag">{group.tag}</Tag> {item}
          </List.Item>
        )}
      />
    ),
  }));

  return (
    <SectionCard title="AI Stratejik Eylem Planı" color="#4caf50" style={{ marginTop: 24 }}>
      {recommendation && (
        <Alert message="Satıcı Önerisi" description={recommendation} type="success" showIcon
          style={{ marginBottom: 16 }} />
      )}
      {plan ? (
        <Collapse defaultActiveKey={['immediate_actions']} ghost className="analysis-collapse" items={items} />
      ) : (
        <Alert type="warning" showIcon message="Eylem planı bu analiz için oluşturulamadı." />
      )}
    </SectionCard>
  );
};

const RiskAnalysisModal = ({ product, analysis, loading, open, onClose }) => {
  const sections = useMemo(() => parseAnalysisSections(analysis?.analysis), [analysis]);

  return (
    <Modal
      title={`${product?.name || ''} - Satıcı Risk Analizi`}
      open={open}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
    >
      {loading && (
        <div className="loading-state">
          <Spin size="large" />
          <p>Risk analizi yapılıyor...</p>
        </div>
      )}

      {!loading && analysis && (
        <div className="analysis-modal-content">
          {analysis.risk_analysis && (
            <SectionCard title="Risk Skorları" color="#d32f2f" style={{ marginBottom: 24 }}>
              <RiskScoreGrid riskAnalysis={analysis.risk_analysis} />
            </SectionCard>
          )}

          {sections.map((section) => (
            <AnalysisSection key={section.key} section={section} />
          ))}

          <ActionPlan
            plan={analysis.action_plan}
            recommendation={analysis.risk_analysis?.seller_recommendation}
          />
        </div>
      )}
    </Modal>
  );
};

export default RiskAnalysisModal;
