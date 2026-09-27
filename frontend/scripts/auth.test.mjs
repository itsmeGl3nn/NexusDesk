import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.window = new EventTarget();
const directory = await mkdtemp(join(tmpdir(), 'nexusdesk-auth-'));
try {
  const outfile = join(directory, 'auth.cjs');
  await build({
    stdin: { contents: `export * from './src/store/authStore'; export * from './src/store/ticketStore'; export * from './src/services/session'; export * from './src/services/api';`, resolveDir: process.cwd(), loader: 'ts' },
    outfile, bundle: true, platform: 'node', format: 'cjs', define: { 'import.meta.env': '{}' },
  });
  const { useAuthStore: auth, useTicketStore: tickets, apiClient, api, readSession, saveSession, SESSION_KEY, SESSION_EXPIRED } = createRequire(import.meta.url)(outfile);
  const jwt = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
  const valid = { sub: 'demo-user', email: 'admin@example.test', name: 'José', exp: Math.floor(Date.now() / 1000) + 3600, 'cognito:groups': ['admin'] };
  const tokens = { idToken: jwt(valid), accessToken: jwt(valid), refreshToken: 'refresh', expiresIn: 3600 };
  const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  localStorage.setItem(SESSION_KEY, '{broken');
  assert.equal(readSession(), null);
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  assert.throws(() => saveSession({ ...tokens, idToken: jwt({ ...valid, exp: 1 }) }, true));
  apiClient.defaults.adapter = async (config) => response(config, tokens);
  await auth.getState().login('admin@example.test', 'password', false);
  assert.equal(auth.getState().user.name, 'José');
  assert.ok(sessionStorage.getItem(SESSION_KEY));
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  auth.getState().logout();
  await auth.getState().login('admin@example.test', 'password', true);
  assert.ok(localStorage.getItem(SESSION_KEY));
  assert.equal(sessionStorage.getItem(SESSION_KEY), null);
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, `Bearer ${tokens.accessToken}`);
    return response(config, []);
  };
  await api.get('/tickets');
  let release;
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { release = () => resolve(response(config, [{ ticketId: 'old-user-ticket' }])); });
  const pendingTickets = tickets.getState().fetchTickets();
  await new Promise(setImmediate);
  auth.getState().logout();
  release();
  await pendingTickets;
  assert.equal(auth.getState().isAuthenticated, false);
  assert.equal(readSession(), null);
  assert.deepEqual(tickets.getState().tickets, []);
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { release = () => resolve(response(config, tokens)); });
  const pendingLogin = auth.getState().login('admin@example.test', 'password');
  await new Promise(setImmediate);
  auth.getState().logout();
  release();
  await assert.rejects(pendingLogin, /cancelled/);
  assert.equal(readSession(), null);
  saveSession(tokens, true);
  auth.getState().syncSession();
  window.addEventListener(SESSION_EXPIRED, auth.getState().logout);
  apiClient.defaults.adapter = async (config) => {
    throw { isAxiosError: true, config, response: { status: 401, data: { message: 'Expired' } } };
  };
  await assert.rejects(api.get('/users'), /Expired/);
  assert.equal(auth.getState().isAuthenticated, false);
  apiClient.defaults.adapter = async (config) => {
    throw { isAxiosError: true, config, response: { status: 403, data: { message: 'Missing Authentication Token' } } };
  };
  await assert.rejects(api.get('/tickets'), /API route unavailable/);
  console.log('PASS: corrupt/expired tokens, Unicode, remember me, request auth, logout, late login/data responses, 401 and route errors');
} finally {
  await rm(directory, { recursive: true, force: true });
}
