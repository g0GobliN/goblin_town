import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../lib/admin-auth";
import { firestoreCreate } from "../../../lib/firestore-rest";

export const prerender = false;

/** Fixed host voice for admin replies — bypasses goblin name claims. */
const ADMIN_REPLY_NAME = "goblin";
const MAX_MESSAGE = 280;

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const message = String(body.message || "").trim();
    const parentId = String(body.parentId || "").trim();

    if (!message) return jsonError("message is required", 400);
    if (message.length > MAX_MESSAGE) {
      return jsonError(`message must be ≤ ${MAX_MESSAGE} characters`, 400);
    }
    if (!parentId) return jsonError("parentId is required", 400);
    if (parentId.length > 128) return jsonError("parentId is too long", 400);

    const id = await firestoreCreate("community", {
      name: ADMIN_REPLY_NAME,
      message,
      timestamp: new Date().toISOString(),
      parentId,
    });

    return json({ ok: true, id, name: ADMIN_REPLY_NAME });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Reply failed", 500);
  }
};
