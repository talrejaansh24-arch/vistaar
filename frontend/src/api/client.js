import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

export const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/static/')) return `${API_ORIGIN}${url}`;
  if (url.startsWith('static/')) return `${API_ORIGIN}/${url}`;
  return url;
};

const api = axios.create({ baseURL: API_ORIGIN });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vistaarwater_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vistaarwater_token');
      localStorage.removeItem('vistaarwater_user');
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  sendOtp: (data) => api.post('/api/auth/send-otp', data),
  verifyOtp: (data) => api.post('/api/auth/verify-otp', data),
  googleLogin: (data) => api.post('/api/auth/google', data),
  getMe: () => api.get('/api/auth/me'),
};

export const designAPI = {
  generate: (data) => api.post('/api/designs/generate', data),
  generateAI: (data) => api.post('/api/designs/generate-ai', data),
  save: (data) => api.post('/api/designs/save', data),
  list: () => api.get('/api/designs'),
  get: (id) => api.get(`/api/designs/${id}`),
  delete: (id) => api.delete(`/api/designs/${id}`),
};

export const orderAPI = {
  create: (data) => api.post('/api/orders', data),
  list: () => api.get('/api/orders'),
  get: (id) => api.get(`/api/orders/${id}`),
};

export const productAPI = {
  list: () => api.get('/api/products'),
  calculatePrice: (data) => api.post('/api/products/calculate-price', data),
};

export const inquiryAPI = {
  create: (data) => api.post('/api/inquiries', data),
};

export const adminAPI = {
  getOrders: (status) => api.get('/api/admin/orders', { params: { status } }),
  updateOrder: (id, data) => api.patch(`/api/admin/orders/${id}`, data),
  getDesigns: () => api.get('/api/admin/designs'),
  getInquiries: (status) => api.get('/api/admin/inquiries', { params: { status } }),
  createProduct: (data) => api.post('/api/admin/products', data),
  updateProduct: (id, data) => api.patch(`/api/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/api/admin/products/${id}`),
  getUsers: () => api.get('/api/admin/users'),
  updateUserStatus: (id, isSuspended) => api.patch(`/api/admin/users/${id}/status`, { is_suspended: isSuspended }),
  getMetrics: () => api.get('/api/admin/metrics'),
  changePassword: (data) => api.post('/api/admin/change-password', data),
  getTemplates: () => api.get('/api/admin/templates'),
  createTemplate: (data) => api.post('/api/admin/templates', data),
  deleteTemplate: (id) => api.delete(`/api/admin/templates/${id}`),
  uploadTemplate: (formData) => api.post('/api/admin/templates/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getUploads: () => api.get('/api/admin/uploads'),
  uploadFile: (formData) => api.post('/api/admin/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteUpload: (id) => api.delete(`/api/admin/uploads/${id}`),
};

export const configAPI = {
  get: () => api.get('/api/config'),
  update: (configs) => api.post('/api/config/admin', { configs }),
};

export default api;
