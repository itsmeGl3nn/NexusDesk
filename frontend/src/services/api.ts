import axios from 'axios';
import { readSession, SESSION_EXPIRED } from './session';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  if (!config.url?.startsWith('/auth/')) {
    const session = readSession();
    if (session) config.headers.Authorization = `Bearer ${session.tokens.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use((response) => response, (error: unknown) => {
  if (!axios.isAxiosError(error)) return Promise.reject(error);
  const status = error.response?.status ?? 0;
  const message = error.response?.data?.message;
  const sentToken = error.config?.headers.Authorization;
  if (status === 401 && sentToken && sentToken === `Bearer ${readSession()?.tokens.accessToken}`) {
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }
  const detail = message === 'Missing Authentication Token'
    ? 'API route unavailable. Restart the UI after deploying the backend.'
    : typeof message === 'string' ? message
      : status ? `Request failed (${status}).` : 'Cannot reach the API. Check that the backend is running.';
  return Promise.reject(new ApiError(status, detail));
});

export const api = {
  get: async <T>(path: string): Promise<T> => (await apiClient.get<T>(path)).data,
  post: async <T>(path: string, body: unknown): Promise<T> => (await apiClient.post<T>(path, body)).data,
  patch: async <T>(path: string, body: unknown): Promise<T> => (await apiClient.patch<T>(path, body)).data,
  put: async <T>(path: string, body: unknown): Promise<T> => (await apiClient.put<T>(path, body)).data,
  delete: async <T>(path: string): Promise<T> => (await apiClient.delete<T>(path)).data,
};
