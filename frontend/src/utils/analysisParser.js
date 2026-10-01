// Gemini'nin Markdown formatındaki analiz raporunu başlıklara göre bölümlere ayırır.

const SECTION_COLORS = [
  [['risk', 'kritik'], '#d32f2f'],
  [['fiyat', 'rekabet'], '#ff9800'],
  [['kârlılık', 'karlılık', 'satış'], '#4caf50'],
  [['pazarlama', 'müşteri', 'seo'], '#9c27b0'],
  [['operasyon', 'lojistik'], '#607d8b'],
  [['eylem', 'strateji'], '#2196f3'],
  [['karar', 'özet'], '#ff5722'],
];

const DEFAULT_COLOR = '#1976d2';

const getSectionColor = (title) => {
  const normalized = title.toLocaleLowerCase('tr-TR');
  const match = SECTION_COLORS.find(([keywords]) => keywords.some((k) => normalized.includes(k)));
  return match ? match[1] : DEFAULT_COLOR;
};

// Markdown vurgularını ve başlıktaki olası sembolleri temizler.
const cleanText = (text) => text.replace(/\*\*|__/g, '').trim();
const cleanTitle = (text) => cleanText(text.replace(/^#+/, '')).replace(/^[^\p{L}\p{N}]+/u, '');

const parseLine = (rawLine) => {
  const line = rawLine.trim();
  if (!line) return null;
  if (/^#{3,}\s/.test(line)) return { type: 'heading', text: cleanTitle(line) };
  if (/^[-*•]\s+/.test(line)) return { type: 'bullet', text: cleanText(line.replace(/^[-*•]\s+/, '')) };
  return { type: 'text', text: cleanText(line) };
};

export const parseAnalysisSections = (text) => {
  if (!text) return [];

  return text
    .split(/^(?=##\s)/m)
    .map((block, index) => {
      const lines = block.trim().split('\n');
      const hasHeading = /^##\s/.test(lines[0]);
      const title = hasHeading ? cleanTitle(lines[0]) : 'Genel Değerlendirme';
      const body = (hasHeading ? lines.slice(1) : lines).map(parseLine).filter(Boolean);
      return { key: `section-${index}`, title, color: getSectionColor(title), lines: body };
    })
    .filter((section) => section.lines.length > 0);
};
