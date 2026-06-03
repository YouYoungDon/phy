import { deleteMessage } from '../_domain.mjs';
import { handleOptions, methodNotAllowed, requireAdmin, sendJson } from '../_http.mjs';

export default async function handler(req, res) {
  try {
    if (handleOptions(req, res)) return;
    if (!requireAdmin(req, res)) return;

    if (req.method !== 'DELETE') {
      methodNotAllowed(res, ['DELETE', 'OPTIONS']);
      return;
    }

    const id = String(req.query.id ?? '');
    await deleteMessage(id);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
