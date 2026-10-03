import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

// JWT verification has its own auth regression. This check exercises permissions,
// tenant keys, request validation, ownership, and atomic domain/audit transactions.
const records = new Map();
const key = (table, item) => `${table}/${item.PK}/${item.SK}`;
const save = (table, item) => records.set(key(table, item), structuredClone(item));
const rows = (table, prefix) => [...records.entries()]
  .filter(([id, item]) => id.startsWith(`${table}/`) && item.SK.startsWith(prefix))
  .map(([, item]) => item);
let failAudit = false;
let beforeTransaction;
globalThis.__phase6Db = { send: async ({ input }) => {
  if (input.TransactItems) {
    beforeTransaction?.();
    beforeTransaction = undefined;
    if (failAudit && input.TransactItems.some((operation) => operation.Put?.Item.SK.startsWith('LOG#'))) {
      throw Object.assign(new Error('Injected audit failure'), { name: 'InternalServerError' });
    }
    for (const operation of input.TransactItems) {
      const write = operation.ConditionCheck ?? operation.Put ?? operation.Delete;
      const itemKey = write.Key ?? write.Item;
      const current = records.get(key(write.TableName, itemKey));
      const condition = write.ConditionExpression ?? '';
      const values = write.ExpressionAttributeValues ?? {};
      const rejected = (condition.includes('attribute_not_exists') && current)
        || (condition.includes('attribute_exists') && !current)
        || (condition.includes('#version') && current?.version !== values[':version'])
        || (condition.includes('#status') && current?.status !== values[':active']);
      if (rejected) throw Object.assign(new Error('Conditional write rejected'), { name: 'TransactionCanceledException' });
    }
    for (const operation of input.TransactItems) {
      if (operation.Put) save(operation.Put.TableName, operation.Put.Item);
      if (operation.Delete) records.delete(key(operation.Delete.TableName, operation.Delete.Key));
    }
    return {};
  }
  if (input.Key) return { Item: structuredClone(records.get(key(input.TableName, input.Key))) };
  if (input.Item) {
    assert.equal(records.has(key(input.TableName, input.Item)), false, 'Logs cannot be overwritten');
    save(input.TableName, input.Item);
    return {};
  }
  const values = input.ExpressionAttributeValues;
  let matching = rows(input.TableName, values[':prefix']).filter((item) => item.PK === values[':pk']);
  matching.sort((a, b) => b.SK.localeCompare(a.SK));
  if (input.ExclusiveStartKey) {
    const index = matching.findIndex((item) => item.SK === input.ExclusiveStartKey.SK);
    matching = matching.slice(index + 1);
  }
  const evaluated = matching.slice(0, input.Limit);
  const last = evaluated.at(-1);
  return {
    Items: structuredClone(evaluated.filter((item) => !values[':ticketId'] || item.ticketId === values[':ticketId'])),
    ...(matching.length > input.Limit ? { LastEvaluatedKey: { PK: last.PK, SK: last.SK } } : {}),
  };
} };

const directory = await mkdtemp(join(tmpdir(), 'nexusdesk-phase6-'));
try {
  const outfile = join(directory, 'phase6.cjs');
  await build({
    stdin: { contents: `
      export * as calls from './module/call/call.service';
      export * as notes from './module/log/log.service';
      export * as callHandlers from './module/call/call.handler';
      export * as logHandlers from './module/log/log.handler';
    `, resolveDir: resolve('src'), loader: 'ts' },
    outfile, bundle: true, platform: 'node', format: 'cjs',
    plugins: [{ name: 'in-memory-dynamodb-and-auth', setup(builder) {
      builder.onLoad({ filter: /services[\\/]dynamodb\.ts$/ }, () => ({ contents: 'export const docClient = globalThis.__phase6Db;', loader: 'js' }));
      builder.onLoad({ filter: /core[\\/]auth[\\/]authorize\.ts$/ }, () => ({ contents: `
        import { hasPermission } from ${JSON.stringify(resolve('src/core/auth/roles.ts'))};
        import { errorResponse } from ${JSON.stringify(resolve('src/utils/response.ts'))};
        export function authorize(handler, required) {
          return async event => {
            if (!event.auth) return errorResponse(401, 'Missing Authentication');
            if (!hasPermission(event.auth.role, required)) return errorResponse(403, 'Insufficient permissions');
            try { return await handler(event); }
            catch { return errorResponse(500, 'Request failed'); }
          };
        }
      `, loader: 'js' }));
    } }],
  });
  const { calls, notes, callHandlers, logHandlers } = createRequire(import.meta.url)(outfile);
  const actor = { tenantId: 'tenant-one', sub: 'agent-one', role: 'agent' };
  const other = { ...actor, sub: 'agent-two' };
  const foreign = { ...actor, tenantId: 'tenant-two' };
  const supervisor = { ...other, role: 'supervisor' };
  const event = (auth, body, id, query = {}) => ({ auth, body: body === undefined ? null : JSON.stringify(body),
    pathParameters: id ? { id } : null, queryStringParameters: query });
  save('Tickets', { PK: 'TENANT#tenant-one', SK: 'TICKET#ticket-one', ticketId: 'ticket-one',
    customerName: 'Customer', customerEmail: 'customer@example.test' });
  const rejectStatus = (statusCode) => (error) => error.statusCode === statusCode;

  assert.equal((await callHandlers.startCallHandler(event(undefined, { ticketId: 'ticket-one' }))).statusCode, 401);
  assert.equal((await callHandlers.startCallHandler(event(actor, { ticketId: 'ticket-one', tenantId: 'tenant-two' }))).statusCode, 400);
  assert.equal((await logHandlers.createNoteHandler(event(actor, { ticketId: 'ticket-one', content: '  ' }))).statusCode, 400);
  assert.equal((await callHandlers.startCallHandler({ ...event(actor), body: '{broken' })).statusCode, 400);
  await assert.rejects(calls.startCall(foreign, 'ticket-one'), rejectStatus(404));
  await assert.rejects(notes.createNote(foreign, { ticketId: 'ticket-one', content: 'Cross tenant' }), rejectStatus(404));

  const call = await calls.startCall(actor, 'ticket-one');
  assert.equal(call.simulated, true);
  assert.equal(call.agentId, actor.sub);
  assert.equal(call.status, 'active');
  await assert.rejects(calls.endCall(other, call.callId), rejectStatus(403));
  await assert.rejects(calls.endCall(foreign, call.callId), rejectStatus(404));
  const ended = await calls.endCall(supervisor, call.callId);
  assert.equal(ended.status, 'ended');
  assert(ended.durationSeconds >= 0);
  assert(ended.endedAt);
  await assert.rejects(calls.endCall(actor, call.callId), rejectStatus(409));

  const first = await notes.createNote(actor, { ticketId: 'ticket-one', content: 'Initial note' });
  await assert.rejects(notes.updateNote(other, first.noteId, 'Forbidden edit'), rejectStatus(403));
  await assert.rejects(notes.deleteNote(other, first.noteId), rejectStatus(403));
  await assert.rejects(notes.deleteNote(foreign, first.noteId), rejectStatus(404));
  const edited = await notes.updateNote(actor, first.noteId, 'Owner edit');
  assert.equal(edited.version, 2);
  await notes.updateNote(supervisor, first.noteId, 'Supervisor edit');
  const second = await notes.createNote(other, { ticketId: 'ticket-one', content: 'Second note' });
  const page = await notes.listNotes(actor.tenantId, { limit: 1, ticketId: 'ticket-one' });
  assert.equal(page.items.length, 1);
  assert(page.nextToken);
  const next = await notes.listNotes(actor.tenantId, { limit: 1, ticketId: 'ticket-one', nextToken: page.nextToken });
  assert.equal(next.items.length, 1);
  assert.notEqual(next.items[0].noteId, page.items[0].noteId);
  await assert.rejects(notes.listNotes(foreign.tenantId, { limit: 1, ticketId: 'ticket-one', nextToken: page.nextToken }), rejectStatus(400));
  await assert.rejects(notes.listNotes(actor.tenantId, { limit: 1, ticketId: 'other-ticket', nextToken: page.nextToken }), rejectStatus(400));
  await assert.rejects(calls.listCalls(actor.tenantId, { limit: 1, ticketId: 'ticket-one', nextToken: page.nextToken }), rejectStatus(400));
  assert.equal((await logHandlers.listNotesHandler(event(actor, undefined, undefined, { limit: '101' }))).statusCode, 400);
  assert.equal((await logHandlers.getLogsHandler(event(actor))).statusCode, 403);
  assert.equal((await logHandlers.auditLogHandler(event(actor, { action: 'fake', entityType: 'ticket', entityId: 'ticket-one' }))).statusCode, 403);
  assert.equal((await logHandlers.auditLogHandler(event(supervisor, { action: 'fake', entityType: 'ticket', entityId: 'ticket-one', actorId: 'spoofed' }))).statusCode, 400);
  const manual = await logHandlers.auditLogHandler(event(supervisor, { action: 'checked', entityType: 'ticket', entityId: 'ticket-one' }));
  assert.equal(manual.statusCode, 201);
  assert.equal(JSON.parse(manual.body).actorId, supervisor.sub);
  assert.equal(JSON.parse(manual.body).action, 'manual.checked');

  const countBeforeFailure = records.size;
  failAudit = true;
  await assert.rejects(notes.createNote(actor, { ticketId: 'ticket-one', content: 'Audit must succeed' }));
  await assert.rejects(calls.startCall(actor, 'ticket-one'));
  await assert.rejects(notes.deleteNote(actor, first.noteId));
  assert.equal(records.size, countBeforeFailure, 'Failed audit must leave the domain record unchanged');
  failAudit = false;
  const auditCount = rows('Logs', 'LOG#').length;
  beforeTransaction = () => {
    const current = records.get(key('Logs', first));
    current.version++;
  };
  await assert.rejects(notes.updateNote(actor, first.noteId, 'Stale write'), rejectStatus(409));
  assert.equal(rows('Logs', 'LOG#').length, auditCount, 'Conflicting write must not create an audit');
  await notes.deleteNote(actor, first.noteId);
  await notes.deleteNote(supervisor, second.noteId);
  assert.equal(rows('Logs', 'NOTE#').length, 0);
  const logs = await notes.listLogs(actor.tenantId, { limit: 100, ticketId: 'ticket-one' });
  assert(logs.items.some((log) => log.action === 'call.started'));
  assert(logs.items.some((log) => log.action === 'call.ended'));
  assert(logs.items.some((log) => log.action === 'note.deleted'));
  assert(logs.items.every((log) => log.tenantId === actor.tenantId));
  console.log('PASS: Phase 6 request validation, tenant isolation, owner/role permissions, pagination scope, simulated call lifecycle, immutable logs, atomic audits, stale-write protection');
} finally {
  delete globalThis.__phase6Db;
  await rm(directory, { recursive: true, force: true });
}
