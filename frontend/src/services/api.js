import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Gemini çağrıları standart isteklerden uzun sürebildiği için ayrı zaman aşımı kullanılır.
const DEFAULT_TIMEOUT = 30000;
const AI_TIMEOUT = 120000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject(new Error(error.response.data?.error || 'Sunucu hatası'));
    }
    if (error.request) {
      return Promise.reject(new Error('Sunucuya bağlanılamadı. Backend çalışıyor mu?'));
    }
    return Promise.reject(new Error('Beklenmeyen bir hata oluştu'));
  },
);

export const apiService = {
  checkHealth: () => apiClient.get('/health'),

  testServices: () => apiClient.get('/test', { timeout: AI_TIMEOUT }),

  getTableStats: () => apiClient.get('/tables/stats'),

  getBrands: () => apiClient.get('/brands'),

  getSalesData: () => apiClient.get('/dashboard/sales-data'),

  searchProducts: (query, filters = {}, limit = 10) =>
    apiClient.post('/search', { query, filters, limit }),

  getProductDetails: (productId, sourceTable) =>
    apiClient.get(`/product/${encodeURIComponent(productId)}/details`, {
      params: { source_table: sourceTable },
    }),

  analyzeProduct: (productId, sourceTable, query) =>
    apiClient.post(
      '/ai/analyze',
      { product_id: productId, source_table: sourceTable, query },
      { timeout: AI_TIMEOUT },
    ),

  chatWithAI: (message) => apiClient.post('/ai/chat', { message }, { timeout: AI_TIMEOUT }),

  createEmbeddings: () => apiClient.post('/embeddings/create'),
};

export default apiService;
