// core/api/index.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine the correct base URL based on the running platform.
function getBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:8002/api';
  }

  // expo-constants exposes the Metro host — derive the Django host from it
  const hostUri =
    Constants.expoConfig?.hostUri ??         // SDK 49+
    Constants.manifest2?.extra?.expoGo?.debuggerHost ?? // older
    Constants.manifest?.debuggerHost;        // SDK 48 and below

  if (hostUri) {
    // hostUri looks like "192.168.1.195:8081" — grab everything before the colon
    const host = hostUri.split(':')[0];
    const url = `http://${host}:8002/api`;
    console.log('[API] resolved BASE_URL from hostUri:', url);
    return url;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8002/api';
  }

  // Fallback: update this if your local IP changes
  const fallback = 'http://192.168.1.195:8002/api';
  console.log('[API] using fallback BASE_URL:', fallback);
  return fallback;
}

const BASE_URL = getBaseUrl();
console.log('[API] BASE_URL =', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) { }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await AsyncStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
        await AsyncStorage.setItem('access_token', data.access);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
        return api(original);
      } catch (err) {
        // Refresh failed — could force logout here
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (data) => api.post('/auth/register/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
};

export const userAPI = {
  getProfile: () => api.get('/user/profile/'),
  updateProfile: (data) => api.patch('/user/profile/', data),
};

export const workspaceAPI = {
  list: () => api.get('/workspaces/'),
  create: (data) => api.post('/workspaces/', data),
  invite: (id, email) => api.post(`/workspaces/${id}/members/invite/`, { email }),
  members: (id) => api.get(`/workspaces/${id}/members/`),
};

export const categoryAPI = {
  list: () => api.get('/categories/'),
  create: (data) => api.post('/categories/', data),
};

export const accountAPI = {
  list: () => api.get('/accounts/'),
  create: (data) => api.post('/accounts/', data),
  get: (id) => api.get(`/accounts/${id}/`),
  update: (id, data) => api.put(`/accounts/${id}/`, data),
  delete: (id) => api.delete(`/accounts/${id}/`),
};

export const paymentAPI = {
  list: () => api.get('/payment-methods/'),
  create: (data) => api.post('/payment-methods/', data),
  update: (id, data) => api.put(`/payment-methods/${id}/`, data),
  delete: (id) => api.delete(`/payment-methods/${id}/`),
};

export const transactionAPI = {
  list: (params) => api.get('/transactions/', { params }),
  create: (data) => api.post('/transactions/', data),
  get: (id) => api.get(`/transactions/${id}/`),
  update: (id, data) => api.put(`/transactions/${id}/`, data),
  delete: (id) => api.delete(`/transactions/${id}/`),
};

export const statisticsAPI = {
  summary: (params) => api.get('/statistics/summary/', { params }),
  byCategory: (params) => api.get('/statistics/by-category/', { params }),
  timeseries: (params) => api.get('/statistics/timeseries/', { params }),
};

export default api;
