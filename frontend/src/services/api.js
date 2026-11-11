import axios from 'axios';

const TOKEN_KEY = 'vl_token';
const USER_KEY = 'vl_user'; // cached profile so the app can still open offline (used more in Phase 6)

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  save: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  saveUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthForm = url.includes('/auth/login') || url.includes('/auth/register');
    if (err.response?.status === 401 && !isAuthForm) {
      session.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

// Turns any axios error into a message that is safe to show to a student.
export function getErrorMessage(err) {
  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : 'Cannot reach the server. Check your internet connection and that the backend is running.';
  }
  const data = err.response.data;
  if (Array.isArray(data?.details) && data.details.length && data.details[0]?.message) {
    return data.details.map((d) => d.message).join('. ');
  }
  return data?.message || 'Something went wrong. Please try again.';
}

export default api;
