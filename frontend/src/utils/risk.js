// Backend'in döndürdüğü risk seviyesi metnine göre etiket rengi.
export const getRiskLevelColor = (riskLevel = '') => {
  if (riskLevel.includes('YÜKSEK')) return 'red';
  if (riskLevel.includes('ORTA')) return 'orange';
  if (riskLevel.includes('DÜŞÜK')) return 'green';
  return 'default';
};

// 0-10 aralığındaki risk skoruna göre etiket rengi.
export const getRiskScoreColor = (score) => {
  if (score >= 7) return 'red';
  if (score >= 5) return 'orange';
  return 'green';
};
