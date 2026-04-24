import axios from 'axios';
import { authStorage } from '../auth/authStorage';

let isHandlingUnauthorized = false;

// Setup once (import this file in main.tsx)
axios.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    const hasAuthHeader =
      !!(config.headers as any)?.Authorization || !!(config.headers as any)?.authorization;
    if (!hasAuthHeader) {
      (config.headers as any) = { ...(config.headers as any), Authorization: `Bearer ${token}` };
    }
  }
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      authStorage.clear();
      // allow future 401 handling after current tick
      setTimeout(() => {
        isHandlingUnauthorized = false;
      }, 0);
    }
    return Promise.reject(error);
  }
);

