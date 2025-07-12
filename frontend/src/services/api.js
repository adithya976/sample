import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Users API
export const usersAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  uploadProfilePhoto: (formData) => api.post('/users/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  browseUsers: (params) => api.get('/users/browse', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  searchUsers: (skill, params) => api.get(`/users/search/${skill}`, { params }),
};

// Skills API
export const skillsAPI = {
  getCategories: () => api.get('/skills/categories'),
  getSkills: (params) => api.get('/skills', { params }),
  searchSkills: (query) => api.get('/skills/search', { params: { q: query } }),
  addSkill: (skillData) => api.post('/skills', skillData),
  getMySkills: () => api.get('/skills/my-skills'),
  addUserSkill: (skillData) => api.post('/skills/my-skills', skillData),
  updateUserSkill: (id, skillData) => api.put(`/skills/my-skills/${id}`, skillData),
  deleteUserSkill: (id) => api.delete(`/skills/my-skills/${id}`),
  getStatistics: () => api.get('/skills/statistics'),
};

// Swaps API
export const swapsAPI = {
  createSwapRequest: (swapData) => api.post('/swaps', swapData),
  getMyRequests: (params) => api.get('/swaps/my-requests', { params }),
  updateSwapStatus: (id, statusData) => api.put(`/swaps/${id}/status`, statusData),
  completeSwap: (id) => api.put(`/swaps/${id}/complete`),
  cancelSwapRequest: (id) => api.delete(`/swaps/${id}`),
  submitFeedback: (id, feedbackData) => api.post(`/swaps/${id}/feedback`, feedbackData),
  getUserFeedback: (userId, params) => api.get(`/swaps/feedback/${userId}`, { params }),
  getSwapStatistics: () => api.get('/swaps/statistics'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  banUser: (userId, banData) => api.put(`/admin/users/${userId}/ban`, banData),
  getPendingSkills: (params) => api.get('/admin/skills/pending', { params }),
  approveSkill: (skillId, approvalData) => api.put(`/admin/skills/${skillId}/approve`, approvalData),
  getSwaps: (params) => api.get('/admin/swaps', { params }),
  createMessage: (messageData) => api.post('/admin/messages', messageData),
  getMessages: (params) => api.get('/admin/messages', { params }),
  updateMessage: (id, messageData) => api.put(`/admin/messages/${id}`, messageData),
  deleteMessage: (id) => api.delete(`/admin/messages/${id}`),
  generateReport: (params) => api.get('/admin/reports', { params }),
};

export default api;