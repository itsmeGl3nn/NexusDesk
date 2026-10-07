import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
let tenantId = 'trusted-tenant';
let getUserCalls = 0;
let revoked = false;
const profile = { PK: 'TENANT#trusted-tenant', SK: 'USER#cognito-sub', tenantId: 'trusted-tenant', userId: 'cognito-sub', cognitoSub: 'cognito-sub', email: 'admin@example.test', role: 'admin', status: 'active' };
const records = new Map([
  ['COGNITO#cognito-sub/IDENTITY', { tenantId: profile.tenantId, userId: profile.userId }],
  [`${profile.PK}/${profile.SK}`, profile],
]);
globalThis.__authDb = { send: async ({ input }) => ({ Item: records.get(`${input.Key.PK}/${input.Key.SK}`) }) };
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url.endsWith('/.well-known/jwks.json')) {
    response.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  assert.equal(request.headers['x-amz-target'], 'AWSCognitoIdentityProviderService.GetUser');
  getUserCalls++;
  if (revoked) {
    response.statusCode = 400;
    response.end(JSON.stringify({ __type: 'NotAuthorizedException', message: 'Access token revoked' }));
    return;
  }
  response.end(JSON.stringify({ UserAttributes: [
    { Name: 'sub', Value: 'cognito-sub' },
    { Name: 'email', Value: 'admin@example.test' },
    ...(tenantId ? [{ Name: 'custom:tenantId', Value: tenantId }] : []),
  ] }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const endpoint = `http://127.0.0.1:${server.address().port}`;
Object.assign(process.env, {
  AWS_ENDPOINT: endpoint,
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test',
  AWS_SECRET_ACCESS_KEY: 'test',
  COGNITO_USER_POOL_ID: 'us-east-1_TestPool',
  COGNITO_CLIENT_ID: 'test-client',
});
const directory = await mkdtemp(join(tmpdir(), 'nexusdesk-backend-auth-'));
try {
  const outfile = join(directory, 'auth.cjs');
  await build({ entryPoints: ['src/core/auth/authorize.ts'], outfile, bundle: true, platform: 'node', format: 'cjs',
    plugins: [{ name: 'profile-db', setup(builder) {
      builder.onLoad({ filter: /services[\\/]dynamodb\.ts$/ }, () => ({ contents: 'export const docClient = globalThis.__authDb;', loader: 'js' }));
    } }],
  });
  const { authorize } = createRequire(import.meta.url)(outfile);
  const handler = authorize(async ({ auth }) => ({ statusCode: 200, body: JSON.stringify(auth) }));
  const payload = {
    sub: 'cognito-sub', iss: `${endpoint}/us-east-1_TestPool`,
    token_use: 'access', client_id: 'test-client',
    exp: Math.floor(Date.now() / 1000) + 3600, 'cognito:groups': ['admin'],
  };
  const jwt = (claims, key = privateKey) => {
    const body = [
      { alg: 'RS256', kid: 'test-key' }, claims,
    ].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
    return `${body}.${sign('RSA-SHA256', Buffer.from(body), key).toString('base64url')}`;
  };
  const invoke = (token) => handler({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const success = await invoke(jwt(payload));
  assert.equal(success.statusCode, 200);
  assert.equal(JSON.parse(success.body).tenantId, 'trusted-tenant');
  assert.equal(JSON.parse(success.body).email, 'admin@example.test');
  assert.equal(JSON.parse(success.body).role, 'admin');
  const maliciousClaims = await invoke(jwt({ ...payload, 'custom:tenantId': 'other-tenant' }));
  assert.equal(JSON.parse(maliciousClaims.body).tenantId, 'trusted-tenant');
  const callsBeforeInvalidTokens = getUserCalls;
  const forgedKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  for (const token of [
    jwt(payload, forgedKey),
    jwt({ ...payload, exp: 1 }),
    jwt({ ...payload, iss: `${endpoint}/wrong-pool` }),
    jwt({ ...payload, client_id: 'wrong-client' }),
    jwt({ ...payload, token_use: 'id', aud: 'test-client' }),
  ]) assert.equal((await invoke(token)).statusCode, 401);
  assert.equal(getUserCalls, callsBeforeInvalidTokens, 'Reject invalid JWTs before requesting user attributes');
  assert.equal((await invoke()).statusCode, 401);
  tenantId = '';
  assert.equal((await invoke(jwt(payload))).statusCode, 200, 'Stored binding remains authoritative without a tenant claim');
  profile.role = 'agent';
  const adminHandler = authorize(async () => ({ statusCode: 200, body: '{}' }), 'user:manage');
  assert.equal((await adminHandler({ headers: { Authorization: `Bearer ${jwt(payload)}` } })).statusCode, 403, 'Stored role overrides stale admin JWT group');
  profile.status = 'inactive';
  assert.equal((await invoke(jwt(payload))).statusCode, 403);
  profile.status = 'active';
  revoked = true;
  assert.equal((await invoke(jwt(payload))).statusCode, 401, 'Revoked access token must fail despite a valid signature');
  revoked = false;
  records.clear();
  assert.equal((await invoke(jwt(payload))).statusCode, 403);
  console.log('PASS: JWT signature/expiry/issuer/client, stored tenant and role authority, inactive accounts, revoked tokens, missing profile');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
  delete globalThis.__authDb;
}
