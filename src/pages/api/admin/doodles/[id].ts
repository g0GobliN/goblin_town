import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../../lib/admin-auth";
import { getEnv } from "../../../../lib/env";
import { firestoreDeleteDoodle } from "../../../../lib/firestore-rest";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const id = params.id?.trim().replace(/\/+$/, "");
    if (!id) return jsonError("doodle id is required", 400);

    try {
      await firestoreDeleteDoodle(id);
      return json({ ok: true });
    } catch (err) {
      // Fallback: API key delete (only works if rules allow)
      const projectId = getEnv("PUBLIC_DOODLE_PROJECT_ID");
      const apiKey = getEnv("DOODLE_API_KEY") || getEnv("PUBLIC_DOODLE_API_KEY");
      if (!projectId || !apiKey) {
        throw err;
      }
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/doodles/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        return jsonError(`Failed to delete doodle: ${await res.text()}`, res.status);
      }
      return json({ ok: true });
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Delete failed", 500);
  }
};
