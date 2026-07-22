import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api };

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

// Open a stored file (PDF/image) in the in-app viewer. Dispatches an event that
// the PdfViewerHost (mounted once in Layout) listens to. The host fetches the
// file as a blob and renders it in an <iframe>, which always displays inside the
// app regardless of ingress cache headers or browser "download PDF" settings.
export const openStoredFile = (fileUrl, filename) => {
  window.dispatchEvent(
    new CustomEvent('emergent:open-pdf', { detail: { url: fileUrl, filename } })
  );
};

// Open an already-fetched PDF blob in a new browser tab (print/download).
// Falls back to a direct download if the popup is blocked.
export const openBlobPdf = (data, filename) => {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const w = window.open(url, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// Auth
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getPending: () => api.get('/users/pending'),
  getTechnicians: () => api.get('/users/technicians'),
  create: (userData) => api.post('/users/create', userData),
  updateRole: (userId, role) => api.put(`/users/${userId}/role?role=${role}`),
  approve: (userId) => api.put(`/users/${userId}/approve`),
  reject: (userId) => api.put(`/users/${userId}/reject`),
  suspend: (userId) => api.put(`/users/${userId}/suspend`),
  activate: (userId) => api.put(`/users/${userId}/activate`),
  delete: (userId) => api.delete(`/users/${userId}`),
  getPermissions: () => api.get('/users/permissions'),
  changeMyPassword: (currentPassword, newPassword) => 
    api.put('/users/me/change-password', { current_password: currentPassword, new_password: newPassword }),
  updateProfile: (nom, prenom) => api.put('/users/me/profile', { nom, prenom }),
  adminChangePassword: (userId, newPassword) => 
    api.put(`/users/${userId}/password`, { new_password: newPassword }),
  getResetRequests: () => api.get('/users/reset-requests'),
  sendTempPassword: (userId) => api.post(`/users/${userId}/send-temp-password`),
  dismissResetRequest: (requestId) => api.delete(`/users/reset-requests/${requestId}`),
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
  deleteDocument: (id, docUrl) => api.delete(`/equipments/${id}/documents?doc_url=${encodeURIComponent(docUrl)}`),
  deletePhoto: (id, photoUrl) => api.delete(`/equipments/${id}/photos?photo_url=${encodeURIComponent(photoUrl)}`),
  getHistory: (id) => api.get(`/equipments/${id}/history`),
};

// Equipment Types
export const equipmentTypesAPI = {
  getAll: () => api.get('/equipment-types'),
  create: (data) => api.post('/equipment-types', data),
  update: (id, data) => api.put(`/equipment-types/${id}`, data),
  delete: (id) => api.delete(`/equipment-types/${id}`),
  cleanup: () => api.post('/equipment-types/cleanup'),
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
  getHistory: (id) => api.get(`/subequipments/${id}/history`),
};

// Work Orders
export const workOrdersAPI = {
  getAll: (params) => api.get('/work-orders', { params }),
  getById: (id) => api.get(`/work-orders/${id}`),
  getSuggestedPieces: (id) => api.get(`/work-orders/${id}/suggested-pieces`),
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
  complete: (id, data) => api.post(`/work-orders/${id}/complete`, data),
};

// Planning / Calendrier
export const planningAPI = {
  getEvents: (start, end, equipmentId) => api.get('/planning/events', { params: { start, end, ...(equipmentId ? { equipment_id: equipmentId } : {}) } }),
  getSummary: (year, equipmentId) => api.get('/planning/summary', { params: { year, ...(equipmentId ? { equipment_id: equipmentId } : {}) } }),
  reschedule: (data) => api.post('/planning/reschedule', data),
};

// Recherche globale
export const searchAPI = {
  search: (q) => api.get('/search', { params: { q } }),
};

// Interventions
export const interventionsAPI = {
  getAll: (params) => api.get('/interventions', { params }),
  getById: (id) => api.get(`/interventions/${id}`),
  create: (data) => api.post('/interventions', data),
  update: (id, data) => api.put(`/interventions/${id}`, data),
  delete: (id) => api.delete(`/interventions/${id}`),
  cleanupFakeCorrective: () => api.post('/admin/cleanup-fake-corrective'),
  uploadDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/interventions/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteDocument: (id, docUrl) => api.delete(`/interventions/${id}/documents?doc_url=${encodeURIComponent(docUrl)}`),
};

// Formations (créneaux de formation)
export const formationsAPI = {
  getAll: () => api.get('/formations'),
  create: (data) => api.post('/formations', data),
  update: (id, data) => api.put(`/formations/${id}`, data),
  delete: (id) => api.delete(`/formations/${id}`),
};

// Inspections
export const inspectionsAPI = {
  getAll: () => api.get('/inspections'),
  getById: (id) => api.get(`/inspections/${id}`),
  create: (data) => api.post('/inspections', data),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  renew: (id, data) => api.post(`/inspections/${id}/renew`, data),
  getHistory: (id) => api.get(`/inspections/${id}/history`),
  getControlTypes: () => api.get('/control-types'),
  createControlType: (label) => api.post('/control-types', { label }),
  deleteControlType: (id) => api.delete(`/control-types/${id}`),
  delete: (id) => api.delete(`/inspections/${id}`),
  uploadProcedure: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/inspections/${id}/procedures`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteProcedure: (id, docUrl) => api.delete(`/inspections/${id}/procedures?doc_url=${encodeURIComponent(docUrl)}`),
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
  getAdminRequests: () => api.get('/dashboard/admin-requests'),
};

// Alerts / Notifications
export const alertsAPI = {
  checkAndSend: () => api.post('/alerts/check'),
  testEmail: () => api.post('/alerts/test'),
};

// Export
export const exportAPI = {
  collectionXlsx: (collection) => api.get(`/export/xlsx/${collection}`, { responseType: 'blob' }),
  sql: () => api.get('/export/sql', { responseType: 'blob' }),
  json: () => api.get('/export/json', { responseType: 'blob' }),
  excel: () => api.get('/export/excel', { responseType: 'blob' }),
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
  
  // PDF Reports
  statisticsPDF: () => api.get('/reports/pdf/statistics', { responseType: 'blob' }),
  maintenancePDF: (startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/pdf/maintenance', { params, responseType: 'blob' });
  },
  equipmentPDF: (equipmentId) => api.get(`/reports/pdf/equipment/${equipmentId}`, { responseType: 'blob' }),
  interventionsPDF: (startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get('/reports/pdf/interventions', { params, responseType: 'blob' });
  },
  planningPDF: () => api.get('/reports/pdf/planning', { responseType: 'blob' }),
  airRespirablePDF: (payload) => api.post('/reports/pdf/air-respirable', payload, { responseType: 'blob' }),
  planMaintenancePDF: (year) => api.get(`/reports/pdf/plan-maintenance/${year}`, { responseType: 'blob' }),
  checkListePDF: (year, month) => api.get(`/reports/pdf/check-liste/${year}/${month}`, { responseType: 'blob' }),
  pvMensuelPDF: (year, month) => api.get(`/reports/pdf/pv-controle-mensuel/${year}/${month}`, { responseType: 'blob' }),
  pvAnnuelPDF: (year) => api.get(`/reports/pdf/pv-controle-annuel/${year}`, { responseType: 'blob' }),
  registreControlesPDF: () => api.get('/reports/pdf/registre-controles', { responseType: 'blob' }),
};

// ==================== NEW APIs ====================

// Contractors (Prestataires)
export const contractorsAPI = {
  getAll: () => api.get('/contractors'),
  getById: (id) => api.get(`/contractors/${id}`),
  create: (data) => api.post('/contractors', data),
  update: (id, data) => api.put(`/contractors/${id}`, data),
  delete: (id) => api.delete(`/contractors/${id}`),
};

// Gas Cylinders (Bouteilles de gaz)
export const gasCylindersAPI = {
  getAll: (params) => api.get('/gas-cylinders', { params }),
  getById: (id) => api.get(`/gas-cylinders/${id}`),
  getAlerts: () => api.get('/gas-cylinders/alerts'),
  create: (data) => api.post('/gas-cylinders', data),
  update: (id, data) => api.put(`/gas-cylinders/${id}`, data),
  getGasTypes: () => api.get('/gas-types'),
  createGasType: (label) => api.post('/gas-types', { label }),
  refill: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post(`/gas-cylinders/${id}/refill`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/gas-cylinders/${id}`),
};

// Maintenance Contracts (Contrats)
export const contractsAPI = {
  getAll: () => api.get('/contracts'),
  getById: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
};

// Documents (Gestion documentaire)
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  create: (data) => api.post('/documents', data),
  upload: (file, data) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/documents/${id}`),
};

// Budget
export const budgetAPI = {
  getAll: (params) => api.get('/budget', { params }),
  getSummary: (annee) => api.get(`/budget/summary/${annee}`),
  getForecast: (annee) => api.get(`/budget/forecast/${annee}`),
  exportForecast: (annee) => api.get(`/budget/forecast/${annee}/export`, { responseType: 'blob' }),
  create: (data) => api.post('/budget', data),
  update: (id, data) => api.put(`/budget/${id}`, data),
  delete: (id) => api.delete(`/budget/${id}`),
};

// Report Templates (Modèles de PV)
export const reportTemplatesAPI = {
  getAll: () => api.get('/report-templates'),
  create: (data) => api.post('/report-templates', data),
};

// Control Reports (PV de contrôle)
export const controlReportsAPI = {
  getAll: (params) => api.get('/control-reports', { params }),
  create: (data) => api.post('/control-reports', data),
};

// Import Excel
export const importAPI = {
  excel: (file, importType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('import_type', importType);
    return api.post('/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  initDefaultData: () => api.post('/init/default-data'),
  resetHistory: () => api.post('/admin/reset-history?confirm=RESET'),
  resetHistoryStatus: () => api.get('/admin/reset-history-status'),
  correlateInterventions: (apply = false) => api.post(`/admin/correlate-interventions?apply=${apply}`),
  transferCandidates: (q = '') => api.get(`/admin/transfer-candidates?q=${encodeURIComponent(q)}`),
  transferToInspections: (workOrderIds) => api.post('/admin/transfer-to-inspections', { work_order_ids: workOrderIds }),
  inspectionCandidates: (q = '') => api.get(`/admin/inspection-candidates?q=${encodeURIComponent(q)}`),
  transferToMaintenances: (inspectionIds) => api.post('/admin/transfer-to-maintenances', { inspection_ids: inspectionIds }),
};

export default api;
