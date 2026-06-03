import { listOperations, pendingOperations } from '../_domain.mjs';
import { handleOptions, methodNotAllowed, sendJson } from '../_http.mjs';

export default async function handler(req, res) {
  try {
    if (handleOptions(req, res)) return;

    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET', 'OPTIONS']);
      return;
    }

    const userId = String(req.query.userId ?? '');
    const operations = pendingOperations(await listOperations(), userId);
    sendJson(res, 200, { userId, operations });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
