import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const outageApi = {
  getAll: () => api.get('/outages/'),
  getById: (id) => api.get(`/outages/${id}`),
  create: (data) => api.post('/outages/', data),
  update: (id, data) => api.put(`/outages/${id}`, data),
  delete: (id) => api.delete(`/outages/${id}`),
};

export const excelApi = {
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/excel/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  export: () => {
    window.open(`${API_URL}/excel/export`, '_blank');
  },
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
};

export const predictionApi = {
  predict: (targetDate) => api.post('/predictions/', { target_date: targetDate }),
};

export const trainingApi = {
  train: () => api.post('/training/train'),
};

export const evaluationApi = {
  getLogs: () => api.get('/evaluation/logs'),
  runEvaluation: () => api.post('/evaluation/run'),
  getMetrics: () => api.get('/evaluation/metrics'),
};

export default api;
