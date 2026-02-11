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
  getPending: () => api.get('/users/pending'),
  getTechnicians: () => api.get('/users/technicians'),
  updateRole: (userId, role) => api.put(`/users/${userId}/role?role=${role}`),
  approve: (userId) => api.put(`/users/${userId}/approve`),
  reject: (userId) => api.put(`/users/${userId}/reject`),
  suspend: (userId) => api.put(`/users/${userId}/suspend`),
  activate: (userId) => api.put(`/users/${userId}/activate`),
  delete: (userId) => api.delete(`/users/${userId}`),
  getPermissions: () => api.get('/users/permissions'),
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
  updateCompteurHoraire: (id, data) => api.put(`/equipments/${id}/compteur-horaire`, data),
  // File uploads
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/equipments/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/equipments/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletePhoto: (id, photoUrl) => api.delete(`/equipments/${id}/photos?photo_url=${encodeURIComponent(photoUrl)}`),
  deleteDocument: (id, docUrl) => api.delete(`/equipments/${id}/documents?doc_url=${encodeURIComponent(docUrl)}`),
};

// Equipment Types
export const equipmentTypesAPI = {
  getAll: () => api.get('/equipment-types'),
  create: (data) => api.post('/equipment-types', data),
  update: (id, data) => api.put(`/equipment-types/${id}`, data),
  delete: (id) => api.delete(`/equipment-types/${id}`),
};

// Sub-Equipments
export const subEquipmentsAPI = {
  getAll: (params) => api.get('/subequipments', { params }),
  getById: (id) => api.get(`/subequipments/${id}`),
  create: (data) => api.post('/subequipments', data),
  update: (id, data) => api.put(`/subequipments/${id}`, data),
  delete: (id) => api.delete(`/subequipments/${id}`),
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/subequipments/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/subequipments/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletePhoto: (id, photoUrl) => api.delete(`/subequipments/${id}/photos?photo_url=${encodeURIComponent(photoUrl)}`),
  deleteDocument: (id, docUrl) => api.delete(`/subequipments/${id}/documents?doc_url=${encodeURIComponent(docUrl)}`),
};

// Work Orders
export const workOrdersAPI = {
  getAll: (params) => api.get('/work-orders', { params }),
  getById: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  delete: (id) => api.delete(`/work-orders/${id}`),
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/work-orders/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/work-orders/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletePhoto: (id, photoUrl) => api.delete(`/work-orders/${id}/photos?photo_url=${encodeURIComponent(photoUrl)}`),
  deleteDocument: (id, docUrl) => api.delete(`/work-orders/${id}/documents?doc_url=${encodeURIComponent(docUrl)}`),
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
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/spare-parts/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/spare-parts/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletePhoto: (id, photoUrl) => api.delete(`/spare-parts/${id}/photos?photo_url=${encodeURIComponent(photoUrl)}`),
  deleteDocument: (id, docUrl) => api.delete(`/spare-parts/${id}/documents?doc_url=${encodeURIComponent(docUrl)}`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getAlerts: () => api.get('/dashboard/alerts'),
  getUpcomingMaintenance: () => api.get('/dashboard/upcoming-maintenance'),
  getCalendar: () => api.get('/dashboard/calendar'),
};

// Export
export const exportAPI = {
  csv: (collection) => api.get(`/export/csv/${collection}`, { responseType: 'blob' }),
  sql: () => api.get('/export/sql', { responseType: 'blob' }),
  json: () => api.get('/export/json', { responseType: 'blob' }),
};

// Reports
export const reportsAPI = {
  getMaintenanceReport: (startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/maintenance', { params });
  },
  exportMaintenanceCSV: (startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/maintenance/csv', { params, responseType: 'blob' });
  },
  getStatistics: () => api.get('/reports/statistics'),
  exportStatisticsCSV: () => api.get('/reports/statistics/csv', { responseType: 'blob' }),
};

export default api;
