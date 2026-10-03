import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

// Exercise the real ticket handlers, service, schemas, and repository with an in-memory SDK transport.
// JWT verification has its own regression; this transport injects trusted authenticated context.
const tables = new Map();
const commands = [];
let changeBeforeWrite = false;
let rejectAuditWrite = false;
const records = (table) => {
  if (!tables.has(table)) tables.set(table, new Map());
  return tables.get(table);
};
const key = (item) => `${item.PK}|${item.SK}`;
const clone = (item) => item && structuredClone(item);
const cancelled = (reasonIndex) => Object.assign(new Error('Transaction cancelled'), {
  name: 'TransactionCanceledException',
  CancellationReasons: Array.from({ length: 2 }, (_, index) => ({ Code: index === reasonIndex ? 'ConditionalCheckFailed' : 'None' })),
});

globalThis.__ticketTestDocClient = {
  async send(command) {
    const input = command.input;
    commands.push(input);
    if (command.constructor.name === 'GetCommand') return { Item: clone(records(input.TableName).get(key(input.Key))) };
    if (command.constructor.name === 'QueryCommand') {
      const all = [...records(input.TableName).values()].filter((item) =>
        item.PK === input.ExpressionAttributeValues[':pk'] && item.SK.startsWith('TICKET#'))
        .sort((a, b) => a.SK.localeCompare(b.SK));
      const offset = input.ExclusiveStartKey ? all.findIndex((item) => key(item) === key(input.ExclusiveStartKey)) + 1 : 0;
      const evaluated = all.slice(offset, offset + input.Limit);
      const items = evaluated.filter((item) =>
        (!input.FilterExpression?.includes('#status') || item.status === input.ExpressionAttributeValues[':status']) &&
        (!input.FilterExpression?.includes('#assignedTo') || item.assignedTo === input.ExpressionAttributeValues[':assignedTo']));
      const last = evaluated.at(-1);
      return { Items: clone(items), ...(last && offset + evaluated.length < all.length && { LastEvaluatedKey: { PK: last.PK, SK: last.SK } }) };
    }
    assert.equal(command.constructor.name, 'TransactWriteCommand');
    assert.equal(input.TransactItems.length, 2, 'Each mutation and audit log share one transaction');
    if (rejectAuditWrite) throw cancelled(1);
    const mutation = input.TransactItems[0].Put ?? input.TransactItems[0].Delete;
    const itemKey = key(mutation.Item ?? mutation.Key);
    const current = records(mutation.TableName).get(itemKey);
    if (changeBeforeWrite && current) {
      current.updatedAt = new Date(Date.parse(current.updatedAt) + 10).toISOString();
      changeBeforeWrite = false;
    }
    const expected = mutation.ExpressionAttributeValues?.[':previousUpdatedAt'];
    if ((expected === undefined && current) || (expected !== undefined && current?.updatedAt !== expected)) throw cancelled(0);
    const audit = input.TransactItems[1].Put;
    assert.equal(audit.Item.tenantId, (mutation.Item ?? current).tenantId);
    assert.equal(typeof audit.Item.actorId, 'string');
    if (input.TransactItems[0].Put) records(mutation.TableName).set(itemKey, clone(mutation.Item));
    else records(mutation.TableName).delete(itemKey);
    records(audit.TableName).set(key(audit.Item), clone(audit.Item));
    return {};
  },
};

Object.assign(process.env, { TICKETS_TABLE: 'TicketTest', USERS_TABLE: 'UserTest', LOGS_TABLE: 'LogTest' });
const directory = await mkdtemp(join(tmpdir(), 'nexusdesk-tickets-'));
try {
  const outfile = join(directory, 'tickets.cjs');
  const rolesPath = resolve('src/core/auth/roles.ts').replaceAll('\\', '/');
  await build({
    entryPoints: ['src/module/ticket/ticket.handler.ts'], outfile, bundle: true, platform: 'node', format: 'cjs',
    plugins: [{
      name: 'ticket-transport',
      setup(builder) {
        builder.onLoad({ filter: /[\\/]services[\\/]dynamodb\.ts$/ }, () => ({ contents: 'export const docClient = globalThis.__ticketTestDocClient;', loader: 'ts' }));
        builder.onLoad({ filter: /[\\/]core[\\/]auth[\\/]authorize\.ts$/ }, () => ({
          contents: `import { hasPermission } from ${JSON.stringify(rolesPath)};
            export const authorize = (handler, permission) => async (event) =>
              hasPermission(event.auth.role, permission) ? handler(event) : { statusCode: 403, body: '{"message":"Insufficient permissions"}' };`, loader: 'ts',
        }));
        builder.onLoad({ filter: /[\\/]ticket\.ai\.ts$/ }, () => ({ contents: 'export async function indexResolvedTicket() {}', loader: 'ts' }));
      },
    }],
  });
  const handlers = createRequire(import.meta.url)(outfile);
  const auth = { tenantId: 'tenant-a', sub: 'agent-a', role: 'agent' };
  const invoke = (handler, body, options = {}) => handler({ auth, headers: {}, body: body === undefined ? null : JSON.stringify(body), ...options });
  const decode = (response) => JSON.parse(response.body);
  const ticketInput = { customerName: ' Customer ', customerEmail: 'customer@example.test', subject: ' Test ', description: 'Description' };
  const create = () => invoke(handlers.createTicketHandler, ticketInput);
  const auditCount = () => records('LogTest').size;

  for (const body of [{ ...ticketInput, customerEmail: 'invalid' }, { ...ticketInput, tenantId: 'spoofed' }, []]) {
    assert.equal((await invoke(handlers.createTicketHandler, body)).statusCode, 400);
  }
  assert.equal(records('TicketTest').size, 0);
  const created = await create();
  assert.equal(created.statusCode, 201);
  const ticket = decode(created);
  assert.equal(ticket.customerName, 'Customer');
  assert.equal(ticket.subject, 'Test');
  assert.equal(ticket.status, 'open');
  assert.equal(ticket.tenantId, 'tenant-a');
  assert.equal(auditCount(), 1);
  assert.equal([...records('LogTest').values()][0].actorId, 'agent-a');
  const ticketPath = { pathParameters: { id: ticket.ticketId } };
  const update = (body, options = {}) => invoke(handlers.updateTicketHandler, body, { ...ticketPath, ...options });
  assert.equal((await invoke(handlers.getTicketHandler, undefined, ticketPath)).statusCode, 200);
  assert.equal((await invoke(handlers.getTicketHandler, undefined, { ...ticketPath, auth: { ...auth, tenantId: 'tenant-b' } })).statusCode, 404);
  assert.equal((await update({})).statusCode, 400);
  assert.equal((await update({ status: 'resolved' })).statusCode, 400);
  assert.equal((await update({ status: 'resolved', resolution: 'Fixed' })).statusCode, 409);
  assert.equal((await update({ assignedTo: 'other-agent' })).statusCode, 403);
  assert.equal((await update({ assignedTo: 'missing-user' }, { auth: { ...auth, role: 'admin' } })).statusCode, 400);
  records('UserTest').set('TENANT#tenant-a|USER#agent-a', { PK: 'TENANT#tenant-a', SK: 'USER#agent-a', tenantId: 'tenant-a', userId: 'agent-a', status: 'active' });
  const progress = await update({ status: 'in_progress', assignedTo: 'agent-a' });
  assert.equal(progress.statusCode, 200);
  assert.equal(decode(progress).assignedTo, 'agent-a');
  assert.ok(decode(progress).updatedAt > ticket.updatedAt);
  const auditsBeforeConflict = auditCount();
  changeBeforeWrite = true;
  assert.equal((await update({ status: 'resolved', resolution: 'Fixed' })).statusCode, 409);
  assert.equal(auditCount(), auditsBeforeConflict, 'Rejected stale update creates no audit or status change');
  assert.equal(records('TicketTest').get(key(ticket)).status, 'in_progress');
  assert.equal((await update({ status: 'resolved', resolution: 'Fixed', assignedTo: null })).statusCode, 200);
  assert.equal(records('TicketTest').get(key(ticket)).assignedTo, undefined);

  const ticketsBeforeAuditFailure = records('TicketTest').size;
  rejectAuditWrite = true;
  await assert.rejects(create(), { name: 'TransactionCanceledException' });
  rejectAuditWrite = false;
  assert.equal(records('TicketTest').size, ticketsBeforeAuditFailure, 'Audit failure rolls back mutation');
  await create();
  await create();
  const list = (queryStringParameters = {}, options = {}) => invoke(handlers.getTicketsHandler, undefined, { queryStringParameters, ...options });
  const first = decode(await list({ limit: '1' }));
  assert.equal(first.items.length, 1);
  assert.ok(first.nextToken);
  const second = decode(await list({ limit: '1', nextToken: first.nextToken }));
  assert.equal(second.items.length, 1);
  assert.notEqual(second.items[0].ticketId, first.items[0].ticketId);
  for (const parameters of [{ limit: '2' }, { limit: '1', status: 'open' }, { limit: '1', assignedTo: 'agent-a' }]) {
    assert.equal((await list({ ...parameters, nextToken: first.nextToken })).statusCode, 400);
  }
  assert.equal((await list({ limit: '1', nextToken: first.nextToken }, { auth: { ...auth, tenantId: 'tenant-b' } })).statusCode, 400);
  const tampered = JSON.parse(Buffer.from(first.nextToken, 'base64url').toString());
  tampered.key.PK = 'TENANT#tenant-b';
  assert.equal((await list({ limit: '1', nextToken: Buffer.from(JSON.stringify(tampered)).toString('base64url') })).statusCode, 400);
  assert.equal((await list({ limit: '101' })).statusCode, 400);
  const emptyPage = decode(await list({ limit: '1', status: 'closed', assignedTo: 'agent-a' }));
  assert.equal(emptyPage.items.length, 0);
  assert.ok(emptyPage.nextToken, 'Filtered empty page still exposes DynamoDB continuation');
  const query = commands.at(-1);
  assert.equal(query.FilterExpression, '#status = :status AND #assignedTo = :assignedTo');
  assert.equal(query.Limit, 1);

  const auditsBeforeDelete = auditCount();
  assert.equal((await invoke(handlers.deleteTicketHandler, undefined, ticketPath)).statusCode, 403);
  assert.equal(auditCount(), auditsBeforeDelete);
  assert.equal((await invoke(handlers.deleteTicketHandler, undefined, { ...ticketPath, auth: { ...auth, role: 'supervisor' } })).statusCode, 200);
  assert.equal(auditCount(), auditsBeforeDelete + 1);
  assert.equal((await invoke(handlers.getTicketHandler, undefined, ticketPath)).statusCode, 404);
  console.log('PASS: ticket validation, tenant isolation, audited CRUD, assignment RBAC, stale write rejection, filtered pagination and cursor scope');
} finally {
  delete globalThis.__ticketTestDocClient;
  const resolvedDirectory = resolve(directory);
  assert.ok(resolvedDirectory.startsWith(`${resolve(tmpdir())}\\`) || resolvedDirectory.startsWith(`${resolve(tmpdir())}/`));
  await rm(resolvedDirectory, { recursive: true, force: true });
}
