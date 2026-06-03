import { listMessages, publicLetter } from './_domain.mjs';
import { handleOptions, methodNotAllowed, sendJson } from './_http.mjs';

export default async function handler(req, res) {
  try {
    if (handleOptions(req, res)) return;

    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET', 'OPTIONS']);
      return;
    }

    const userId = String(req.query.userId ?? '');
    const rows = await listMessages();
    const letters = rows
      .filter((message) => message.target === 'all' || (message.target === 'user' && message.targetUserId === userId))
      .map(publicLetter);
    sendJson(res, 200, { userId, letters });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
