/**
 * Centralized API service layer
 * All HTTP calls go through this module.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';

// ─── Axios instance ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {
      // SecureStore unavailable (web/emulator) — continue without token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: normalize errors ──────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    // When responseType:'text' is used, data arrives as a raw string — try to parse it
    let data = error?.response?.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { /* keep as string */ }
    }
    const detail = data?.detail;
    let message;
    if (Array.isArray(detail)) {
      message = detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (detail) {
      message = JSON.stringify(detail);
    } else if (!error?.response) {
      message = error?.code === 'ECONNABORTED'
        ? 'Request timed out. Check your internet connection.'
        : 'Cannot reach server. Check your internet connection.';
    } else {
      message = data?.message || `Server error (${status})`;
    }
    return Promise.reject(new Error(message));
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  /**
   * Login with mobile number + password
   * POST /auth/login
   * Body: { mobile: "9876543210", password: "..." }
   * Returns: { token, access_token, token_type, user: { id, role, name, mobile } }
   */
  login: (mobile, password) =>
    api.post('/auth/login', { mobile, password }),

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  getMe: () => api.get('/auth/me'),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksAPI = {
  list: (params = {}) => api.get('/tasks/', { params }),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  submitRecord: (taskId, data) => api.post(`/tasks/${taskId}/records`, data),
  getRecords: (taskId) => api.get(`/tasks/${taskId}/records`),
  getById: (id) => api.get(`/tasks/${id}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard'),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersAPI = {
  list: (params = {}) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  fieldWorkload: () => api.get('/users/field-workload'),
};

// ─── Activity Types ───────────────────────────────────────────────────────────
export const activityTypesAPI = {
  departments: () => api.get('/activity-types/departments'),
  list: (params = {}) => api.get('/activity-types', { params }),
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const attendanceAPI = {
  getToday: () => api.get('/attendance/today'),
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  list: (params = {}) => api.get('/attendance', { params }),
  report: (params = {}) => api.get('/attendance/report', { params }),
  team: (params = {}) => api.get('/attendance/team', { params }),
  teamMonthly: (params = {}) => api.get('/attendance/team/monthly', { params }),
  addWaypoint: (data) => api.post('/attendance/waypoints', data),
  getWaypoints: (attendanceId) => api.get(`/attendance/${attendanceId}/waypoints`),
  getRoute: (attendanceId) => api.get(`/attendance/${attendanceId}/route`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsAPI = {
  list: (params = {}) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: (ids) => api.post('/notifications/mark-read', { notification_ids: ids }),
};

// ─── Leaves ───────────────────────────────────────────────────────────────────

export const leavesAPI = {
  list: (params = {}) => api.get('/leaves', { params }),
  apply: (data) => api.post('/leaves', data),
  update: (id, data) => api.patch(`/leaves/${id}`, data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsAPI = {
  get: (params = {}) => api.get('/analytics', { params }),
};

// ─── Live Tracking ───────────────────────────────────────────────────────────
export const trackingAPI = {
  getLive: () => api.get('/tracking/live'),
};

// ─── Feedback / Field Data Entry ─────────────────────────────────────────────
export const feedbackAPI = {
  getAttributes: (activityTypeId) =>
    api.get(`/feedback/activity-types/${activityTypeId}/attributes`),
  submit: (data) => api.post('/feedback/submissions', data),
  listSubmissions: (params = {}) => api.get('/feedback/submissions', { params }),
  getSubmission: (id) => api.get(`/feedback/submissions/${id}`),
  uploadMedia: (feedbackId, fieldKey, fileUri, mimeType = 'image/jpeg') => {
    const formData = new FormData();
    formData.append('feedback_id', String(feedbackId));
    formData.append('field_key', fieldKey);
    formData.append('file', { uri: fileUri, name: 'photo.jpg', type: mimeType });
    return api.post('/feedback/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /**
   * Fetch all feedback submissions and return them as a JSON array.
   * The backend has no /feedback/csv endpoint, so we paginate through
   * /feedback/submissions (max 200 per page) and filter on the client.
   *
   * @param {boolean} todayOnly  true → only today's submissions
   * @returns {Promise<{ data: object[] }>}  same shape as other API calls
   */
  exportCSV: async (todayOnly = false) => {
    const limit = 200;
    const MAX_PAGES = 50; // safety cap: 50 × 200 = 10,000 records max
    let skip = 0;
    let page = 0;
    const all = [];

    while (page < MAX_PAGES) {
      const res = await api.get('/feedback/submissions', { params: { skip, limit } });
      const batch = Array.isArray(res.data) ? res.data : [];
      all.push(...batch);
      if (batch.length < limit) break;
      skip += limit;
      page += 1;
    }

    // Client-side date filter
    let submissions = all;
    if (todayOnly) {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      submissions = all.filter(
        (s) => s.submitted_at && String(s.submitted_at).slice(0, 10) === today,
      );
    }

    return { data: submissions };
  },
  /** Summary stats — total_all_time, total_today */
  getStats: () => api.get('/feedback/stats'),
};

export default api;
