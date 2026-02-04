import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  updateRole: (userId, role) => api.put(`/users/${userId}/role?role=${role}`),
  delete: (userId) => api.delete(`/users/${userId}`),
};

// Caisson
export const caissonAPI = {
  get: () => api.get('/caisson'),
  create: (data) => api.post('/caisson', data),
  update: (id, data) => api.put(`/caisson/${id}`, data),
};

// Equipments
export const equipmentsAPI = {
  getAll: (params) => api.get('/equipments', { params }),
  getById: (id) => api.get(`/equipments/${id}`),
  create: (data) => api.post('/equipments', data),
  update: (id, data) => api.put(`/equipments/${id}`, data),
  delete: (id) => api.delete(`/equipments/${id}`),
};

// Work Orders
export const workOrdersAPI = {
  getAll: (params) => api.get('/work-orders', { params }),
  getById: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  delete: (id) => api.delete(`/work-orders/${id}`),
};

// Interventions
export const interventionsAPI = {
  getAll: (params) => api.get('/interventions', { params }),
  getById: (id) => api.get(`/interventions/${id}`),
  create: (data) => api.post('/interventions', data),
};

// Inspections
export const inspectionsAPI = {
  getAll: () => api.get('/inspections'),
  getById: (id) => api.get(`/inspections/${id}`),
  create: (data) => api.post('/inspections', data),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  delete: (id) => api.delete(`/inspections/${id}`),
};

// Spare Parts
export const sparePartsAPI = {
  getAll: (params) => api.get('/spare-parts', { params }),
  getById: (id) => api.get(`/spare-parts/${id}`),
  create: (data) => api.post('/spare-parts', data),
  update: (id, data) => api.put(`/spare-parts/${id}`, data),
  delete: (id) => api.delete(`/spare-parts/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getAlerts: () => api.get('/dashboard/alerts'),
  getUpcomingMaintenance: () => api.get('/dashboard/upcoming-maintenance'),
};

// Export
export const exportAPI = {
  csv: (collection) => api.get(`/export/csv/${collection}`, { responseType: 'blob' }),
  sql: () => api.get('/export/sql', { responseType: 'blob' }),
  json: () => api.get('/export/json', { responseType: 'blob' }),
};

export default api;
