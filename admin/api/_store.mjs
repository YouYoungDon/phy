const keys = {
  messages: 'sobagi-admin:messages',
  operations: 'sobagi-admin:operations',
};

function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL ?? '').trim().replace(/\/$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN ?? '').trim();
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
  }
  return { url, token };
}

async function redis(command) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? `Upstash request failed (${response.status})`);
  }
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

export async function readRows(kind) {
  const raw = await redis(['GET', keys[kind]]);
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function writeRows(kind, rows) {
  await redis(['SET', keys[kind], JSON.stringify(rows)]);
}
