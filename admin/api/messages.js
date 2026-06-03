import { createMessage, listMessages } from './_domain.mjs';
import { handleOptions, methodNotAllowed, requireAdmin, sendJson } from './_http.mjs';

export default async function handler(req, res) {
  try {
    if (handleOptions(req, res)) return;
    if (!requireAdmin(req, res)) return;

    if (req.method === 'GET') {
      sendJson(res, 200, { messages: await listMessages() });
      return;
    }

    if (req.method === 'POST') {
      const result = await createMessage(req);
      if (result.error) {
        sendJson(res, result.error.status, result.error.body);
        return;
      }
      sendJson(res, 201, { message: result.message });
      return;
    }

    methodNotAllowed(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
