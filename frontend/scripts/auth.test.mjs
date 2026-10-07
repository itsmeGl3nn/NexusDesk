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
  const newerClaims = { ...valid, name: 'New session', exp: valid.exp + 60 };
  const newerTokens = { ...tokens, idToken: jwt(newerClaims), accessToken: jwt(newerClaims) };
  const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  localStorage.setItem(SESSION_KEY, '{broken');
  assert.equal(readSession(), null);
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  assert.throws(() => saveSession({ ...tokens, idToken: jwt({ ...valid, exp: 1 }) }, true));
  for (const oldSession of ['{broken', JSON.stringify({ ...tokens, idToken: jwt({ ...valid, exp: 1 }) })]) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(newerTokens));
    sessionStorage.setItem(SESSION_KEY, oldSession);
    assert.equal(readSession().tokens.accessToken, newerTokens.accessToken);
    assert.equal(sessionStorage.getItem(SESSION_KEY), null);
    assert.ok(localStorage.getItem(SESSION_KEY));
  }
  auth.getState().logout();
  apiClient.defaults.adapter = async (config) => response(config, tokens);
  await auth.getState().login('admin@example.test', 'password', false);
  assert.equal(auth.getState().user.name, 'José');
  assert.ok(sessionStorage.getItem(SESSION_KEY));
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  auth.getState().logout();
  await auth.getState().login('admin@example.test', 'password', true);
  assert.ok(localStorage.getItem(SESSION_KEY));
  assert.equal(sessionStorage.getItem(SESSION_KEY), null);
  const originalTicket = { ticketId: 'save-ticket', description: 'Before', status: 'OPEN' };
  const untouchedTicket = { ticketId: 'other-ticket', status: 'OPEN' };
  const savedTicket = { ...originalTicket, description: 'Saved description', status: 'IN_PROGRESS' };
  tickets.setState({ tickets: [originalTicket, untouchedTicket] });
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.method, 'put');
    assert.equal(config.url, '/ticket/save-ticket');
    return response(config, savedTicket);
  };
  await tickets.getState().updateTicket(originalTicket.ticketId, { description: savedTicket.description, status: savedTicket.status });
  assert.deepEqual(tickets.getState().tickets, [savedTicket, untouchedTicket]);
  for (const change of ['logout', 'new-session']) {
    saveSession(tokens, true);
    auth.getState().syncSession();
    tickets.setState({ tickets: [originalTicket] });
    let releaseSave;
    apiClient.defaults.adapter = (config) => new Promise((resolve) => { releaseSave = () => resolve(response(config, savedTicket)); });
    const pendingSave = tickets.getState().updateTicket(originalTicket.ticketId, { status: savedTicket.status });
    await new Promise(setImmediate);
    if (change === 'logout') auth.getState().logout();
    else { saveSession(newerTokens, true); auth.getState().syncSession(); }
    releaseSave();
    await assert.rejects(pendingSave, /Session changed/);
    assert.deepEqual(tickets.getState().tickets, []);
  }
  saveSession(tokens, true);
  auth.getState().syncSession();
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
  saveSession(tokens, true);
  auth.getState().syncSession();
  tickets.setState({ tickets: [{ ticketId: 'cached-old-session-ticket' }] });
  const ticketsFromOldSession = tickets.getState().fetchTickets();
  await new Promise(setImmediate);
  saveSession(newerTokens, true);
  auth.getState().syncSession();
  assert.deepEqual(tickets.getState().tickets, []);
  assert.equal(tickets.getState().isLoading, false);
  release();
  await ticketsFromOldSession;
  assert.deepEqual(tickets.getState().tickets, []);
  auth.getState().logout();
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { release = () => resolve(response(config, tokens)); });
  const pendingLogin = auth.getState().login('admin@example.test', 'password');
  await new Promise(setImmediate);
  auth.getState().logout();
  release();
  await assert.rejects(pendingLogin, /cancelled/);
  assert.equal(readSession(), null);
  const switchedLogin = auth.getState().login('admin@example.test', 'password');
  await new Promise(setImmediate);
  const otherClaims = { ...valid, sub: 'different-user', email: 'other@example.test' };
  const otherTokens = { ...tokens, idToken: jwt(otherClaims), accessToken: jwt(otherClaims) };
  saveSession(otherTokens, true);
  auth.getState().syncSession();
  assert.equal(auth.getState().isLoading, false);
  release();
  await assert.rejects(switchedLogin, /cancelled/);
  assert.equal(auth.getState().user.id, 'different-user');
  assert.equal(readSession().tokens.accessToken, otherTokens.accessToken);
  saveSession(tokens, true);
  auth.getState().syncSession();
  window.addEventListener(SESSION_EXPIRED, auth.getState().logout);
  apiClient.defaults.adapter = (config) => new Promise((_resolve, reject) => {
    release = () => reject({ isAxiosError: true, config, response: { status: 401, data: { message: 'Expired' } } });
  });
  const staleRequest = api.get('/users');
  await new Promise(setImmediate);
  saveSession(newerTokens, true);
  auth.getState().syncSession();
  release();
  await assert.rejects(staleRequest, /Expired/);
  assert.equal(auth.getState().isAuthenticated, true);
  assert.equal(readSession().tokens.accessToken, newerTokens.accessToken);
  saveSession(tokens, true);
  auth.getState().syncSession();
  apiClient.defaults.adapter = async (config) => {
    throw { isAxiosError: true, config, response: { status: 401, data: { message: 'Expired' } } };
  };
  await assert.rejects(api.get('/users'), /Expired/);
  assert.equal(auth.getState().isAuthenticated, false);
  apiClient.defaults.adapter = async (config) => {
    throw { isAxiosError: true, config, response: { status: 403, data: { message: 'Missing Authentication Token' } } };
  };
  await assert.rejects(api.get('/tickets'), /API route unavailable/);
  saveSession(tokens, true);
  auth.getState().syncSession();
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.url, '/auth/logout');
    assert.equal(config.headers.Authorization, `Bearer ${tokens.accessToken}`);
    return response(config, { message: 'Signed out' });
  };
  await auth.getState().signOut();
  assert.equal(readSession(), null);
  saveSession(tokens, true);
  auth.getState().syncSession();
  apiClient.defaults.adapter = (config) => new Promise((resolve) => { release = () => resolve(response(config, {})); });
  const pendingLogout = auth.getState().signOut();
  await new Promise(setImmediate);
  saveSession(newerTokens, true);
  auth.getState().syncSession();
  release();
  await pendingLogout;
  assert.equal(readSession().tokens.accessToken, newerTokens.accessToken, 'Old logout must not clear a new session');
  console.log('PASS: stored-session recovery, Unicode, remember me, request auth, ticket saves, logout, same-user session changes, late login/data responses, stale/current 401 and route errors');
} finally {
  await rm(directory, { recursive: true, force: true });
}
