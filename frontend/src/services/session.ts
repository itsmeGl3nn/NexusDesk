import type { User } from '../types/user';
import type { AuthTokens } from './authService';

export const SESSION_KEY = 'nexusdesk.session';
export const SESSION_EXPIRED = 'nexusdesk:session-expired';

function claims(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid session token');
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))));
}

// Decoding restores UI state only. The backend must verify JWT signatures and permissions.
export function sessionFromTokens(tokens: AuthTokens) {
  const id = claims(tokens.idToken);
  const access = claims(tokens.accessToken);
  const expiresAt = Math.min(id.exp, access.exp) * 1000;
  if (!id.sub || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error('Session expired. Please sign in again.');
  }
  const groups = Array.isArray(id['cognito:groups']) ? id['cognito:groups'] : [];
  const user: User = {
    id: id.sub,
    name: id.name || id.email?.split('@')[0] || 'User',
    email: id.email || '',
    role: groups.includes('admin') ? 'admin' : groups.includes('supervisor') ? 'supervisor' : 'agent',
  };
  return { tokens, user, expiresAt };
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of [SESSION_KEY, 'accessToken', 'idToken', 'refreshToken']) storage.removeItem(key);
  }
}

export function readSession() {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(SESSION_KEY);
      if (raw) return sessionFromTokens(JSON.parse(raw));
    } catch { /* Discard only the invalid record; another storage may hold a newer session. */ }
    for (const key of [SESSION_KEY, 'accessToken', 'idToken', 'refreshToken']) storage.removeItem(key);
  }
  return null;
}

export function saveSession(tokens: AuthTokens, remember: boolean) {
  const session = sessionFromTokens(tokens);
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(tokens));
  return session;
}
