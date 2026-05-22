export * from './theme';

// Task status labels and colors — matches both DB values (assigned/running) and mobile filter values
export const TASK_STATUS = {
  // DB values
  assigned: { label: 'Assigned', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  running:  { label: 'Active',   color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  completed: { label: 'Completed', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  hold:      { label: 'On Hold',  color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  // Aliases used by filter chips
  pending: { label: 'Assigned', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  active:  { label: 'Active',   color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
};

// User roles — handles both uppercase (normalized) and lowercase (legacy)
export const USER_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Owner',
  MANAGER: 'Manager',
  FIELD: 'Field Agent',
  ACCOUNTS: 'Accounts',
  super_admin: 'Super Admin',
  owner: 'Owner',
  manager: 'Manager',
  field: 'Field Agent',
  accounts: 'Accounts',
};

// API base URL — controlled entirely by EXPO_PUBLIC_API_URL in .env
// Local dev:  http://192.168.x.x:8000/api/v1   (LAN IP of the machine running the backend)
// Production: https://api.yourdomain.com/api/v1
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.prabhuseeds.com/api/v1';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
};
