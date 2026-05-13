import { api } from './api';

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function loginApi(email: string, password: string): Promise<AuthTokens> {
  return api.post<AuthTokens>('/auth/login', { email, password });
}

export function refreshApi(refreshToken: string): Promise<AuthTokens> {
  return api.post<AuthTokens>('/auth/refresh', { refreshToken });
}
