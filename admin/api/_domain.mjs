import { readBody } from './_http.mjs';
import { readRows, writeRows } from './_store.mjs';

export function publicLetter(message) {
  return {
    id: message.id,
    body: message.body,
    sig: message.sig || '— 소박이',
    createdAt: message.createdAt,
    target: message.target,
  };
}

export async function listMessages() {
  return readRows('messages');
}

export async function listOperations() {
  return readRows('operations');
}

export async function createMessage(req) {
  const body = await readBody(req);
  const title = String(body.title ?? '').trim();
  const letterBody = String(body.body ?? '').trim();
  const target = body.target === 'user' ? 'user' : 'all';
  const targetUserId = target === 'user' ? String(body.targetUserId ?? '').trim() : undefined;

  if (!title || !letterBody) {
    return { error: { status: 400, body: { error: 'title and body are required' } } };
  }
  if (target === 'user' && !targetUserId) {
    return { error: { status: 400, body: { error: 'targetUserId is required for user target' } } };
  }

  const now = new Date().toISOString();
  const message = {
    id: `admin-letter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body: letterBody,
    sig: String(body.sig ?? '— 소박이').trim() || '— 소박이',
    target,
    targetUserId,
    createdAt: now,
    updatedAt: now,
  };

  const rows = await listMessages();
  await writeRows('messages', [message, ...rows]);
  return { message };
}

export async function deleteMessage(id) {
  const rows = await listMessages();
  await writeRows('messages', rows.filter((message) => message.id !== id));
}

export async function createOperation(req) {
  const body = await readBody(req);
  const type = String(body.type ?? '').trim();
  const target = body.target === 'user' ? 'user' : 'all';
  const targetUserId = target === 'user' ? String(body.targetUserId ?? '').trim() : undefined;
  const payload = typeof body.payload === 'object' && body.payload !== null ? body.payload : {};

  if (!type) {
    return { error: { status: 400, body: { error: 'type is required' } } };
  }
  if (target === 'user' && !targetUserId) {
    return { error: { status: 400, body: { error: 'targetUserId is required for user target' } } };
  }

  const operation = {
    id: `admin-op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    target,
    targetUserId,
    payload,
    createdAt: new Date().toISOString(),
  };

  const rows = await listOperations();
  await writeRows('operations', [operation, ...rows]);
  return { operation };
}

export function pendingOperations(rows, userId) {
  return rows
    .filter((op) => op.target === 'all' || (op.target === 'user' && op.targetUserId === userId))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}
