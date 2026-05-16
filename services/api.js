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
    const detail = error?.response?.data?.detail;
    let message;
    if (Array.isArray(detail)) {
      message = detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (detail) {
      message = JSON.stringify(detail);
    } else if (!error?.response) {
      // No response at all — server unreachable or request timed out
      message = error?.code === 'ECONNABORTED'
        ? 'Request timed out. Check your internet connection.'
        : 'Cannot reach server. Check your internet connection.';
    } else {
      message =
        error?.response?.data?.message ||
        `Server error (${status})`;
    }
    return Promise.reject(new Error(message));
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  /**
   * Send OTP to mobile number
   * POST /auth/send-otp
   * Body: { mobile: "9876543210" }
   */
  sendOTP: (mobile) => api.post('/auth/send-otp', { mobile }),

  /**
   * Verify OTP and get JWT token
   * POST /auth/verify-otp
   * Body: { mobile, otp }
   * Returns: { token, access_token, token_type, user: { id, role, name, mobile } }
   */
  verifyOTP: (mobile, otp) => api.post('/auth/verify-otp', { mobile, otp }),

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  getMe: () => api.get('/auth/me'),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksAPI = {
  /**
   * List tasks with optional filters
   * GET /tasks?skip=0&limit=100&status=pending&search=...
   * Returns: { tasks: TaskOut[], meta: { total, pending, active, efficiency } }
   */
  list: (params = {}) => api.get('/tasks', { params }),

  /**
   * Create a new task (OWNER/MANAGER only)
   * POST /tasks
   */
  create: (data) => api.post('/tasks', data),

  /**
   * Update a task
   * PATCH /tasks/:id
   */
  update: (id, data) => api.patch(`/tasks/${id}`, data),

  /**
   * Delete a task (OWNER/MANAGER only)
   * DELETE /tasks/:id
   */
  delete: (id) => api.delete(`/tasks/${id}`),

  /**
   * Submit a task record (field agent completion)
   * POST /tasks/:id/records
   */
  submitRecord: (taskId, data) => api.post(`/tasks/${taskId}/records`, data),

  /**
   * Get records for a task
   * GET /tasks/:id/records
   */
  getRecords: (taskId) => api.get(`/tasks/${taskId}/records`),

  /**
   * Get a single task by ID
   * GET /tasks/:id
   */
  getById: (id) => api.get(`/tasks/${id}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardAPI = {
  /**
   * Get dashboard KPIs
   * GET /dashboard
   */
  getKPIs: () => api.get('/dashboard'),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersAPI = {
  /**
   * List users (OWNER/MANAGER only)
   * GET /users?role=FIELD
   */
  list: (params = {}) => api.get('/users', { params }),

  /**
   * Get a specific user
   * GET /users/:id
   */
  get: (id) => api.get(`/users/${id}`),

  /**
   * Create user (OWNER only)
   * POST /users
   */
  create: (data) => api.post('/users', data),

  /**
   * Update user (OWNER only)
   * PATCH /users/:id
   */
  update: (id, data) => api.patch(`/users/${id}`, data),

  /**
   * Get all FIELD users with their active task workload
   * GET /users/field-workload
   */
  fieldWorkload: () => api.get('/users/field-workload'),
};

// ─── Activity Types ───────────────────────────────────────────────────────────
export const activityTypesAPI = {
  /**
   * List departments with activity counts
   * GET /activity-types/departments
   */
  departments: () => api.get('/activity-types/departments'),

  /**
   * List activity types, optionally filtered by department/season
   * GET /activity-types?department=Production&season=Post-Season
   */
  list: (params = {}) => api.get('/activity-types', { params }),
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const attendanceAPI = {
  /**
   * Get today's attendance record
   * GET /attendance/today
   */
  getToday: () => api.get('/attendance/today'),

  /**
   * Check in
   * POST /attendance/check-in
   * Body: { lat, lng, address? }
   */
  checkIn: (data) => api.post('/attendance/check-in', data),

  /**
   * Check out
   * POST /attendance/check-out
   * Body: { lat, lng, address? }
   */
  checkOut: (data) => api.post('/attendance/check-out', data),

  /**
   * List attendance history
   * GET /attendance?month=2025-05
   */
  list: (params = {}) => api.get('/attendance', { params }),

  /**
   * Get attendance report
   * GET /attendance/report?month=2025-05
   */
  report: (params = {}) => api.get('/attendance/report', { params }),

  /**
   * Team attendance (OWNER/MANAGER) — single date
   * GET /attendance/team?date=2025-05-05
   */
  team: (params = {}) => api.get('/attendance/team', { params }),

  /**
   * Full team attendance history for a month (OWNER/MANAGER)
   * GET /attendance/team/monthly?month=2025-05
   * Returns all records for the month grouped by date, sorted date desc
   */
  teamMonthly: (params = {}) => api.get('/attendance/team/monthly', { params }),

  /**
   * Add a GPS waypoint for live tracking
   * POST /attendance/waypoints
   * Body: { lat, lng, type? }
   */
  addWaypoint: (data) => api.post('/attendance/waypoints', data),

  /**
   * Get all GPS waypoints for an attendance record (OWNER/MANAGER only)
   * GET /attendance/:id/waypoints
   * Only call this when km >= 5 — client-side gate to reduce API calls
   */
  getWaypoints: (attendanceId) => api.get(`/attendance/${attendanceId}/waypoints`),

  /**
   * Get road-snapped route polyline for an attendance record (OWNER/MANAGER only)
   * GET /attendance/:id/route
   * Returns { polyline: [{lat, lng}, ...], waypoint_count: N }
   * Backend applies RDP simplification + Google Directions API road-snapping.
   * Only call this when km >= 5 — client-side gate to reduce API calls.
   */
  getRoute: (attendanceId) => api.get(`/attendance/${attendanceId}/route`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsAPI = {
  /**
   * List notifications
   * GET /notifications?unread=true
   */
  list: (params = {}) => api.get('/notifications', { params }),

  /**
   * Mark notification as read
   * PATCH /notifications/:id/read
   */
  markRead: (id) => api.patch(`/notifications/${id}/read`),

  /**
   * Mark multiple as read
   * POST /notifications/mark-read
   */
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
  /**
   * Get live positions of all checked-in field staff (OWNER/MANAGER only)
   * GET /tracking/live
   */
  getLive: () => api.get('/tracking/live'),
};

// ─── Feedback / Field Data Entry ─────────────────────────────────────────────
export const feedbackAPI = {
  /**
   * Get dynamic form attributes for an activity type
   * GET /feedback/activity-types/:id/attributes
   */
  getAttributes: (activityTypeId) =>
    api.get(`/feedback/activity-types/${activityTypeId}/attributes`),

  /**
   * Submit a farmer feedback record with all field responses
   * POST /feedback/submissions
   * Body: { activity_type_id, farmer_name, farmer_phone?, village?, responses: [{field_key, value_text?, value_json?}] }
   */
  submit: (data) => api.post('/feedback/submissions', data),

  /**
   * List submissions for current user
   * GET /feedback/submissions?activity_type_id=&skip=0&limit=50
   */
  listSubmissions: (params = {}) => api.get('/feedback/submissions', { params }),

  /**
   * Get single submission with all responses
   * GET /feedback/submissions/:id
   */
  getSubmission: (id) => api.get(`/feedback/submissions/${id}`),

  /**
   * Upload a media file for a submission
   * POST /feedback/media/upload (multipart)
   */
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
   * Download today's submitted feedback forms as a CSV string.
   * GET /feedback/submissions/export/csv
   * Returns the raw CSV text (responseType: 'text').
   */
  exportTodayCSV: () =>
    api.get('/feedback/submissions/export/csv', { responseType: 'text' }),
};

export default api;
