export const formatPrice = (value) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? `₺${number.toLocaleString('tr-TR')}` : '-';
};

export const formatRating = (value) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? `${number.toFixed(1)} / 5` : '-';
};

export const formatScore = (value) => {
  const number = parseFloat(value);
  return Number.isFinite(number) ? `${number.toFixed(1)} / 10` : '-';
};

// "telefon_urunleri_embeddings" -> "TELEFON URUNLERI"
export const formatTableName = (name = '') =>
  name.replace(/_embeddings$/, '').replace(/_/g, ' ').toLocaleUpperCase('tr-TR');

export const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Bilgi yok';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
