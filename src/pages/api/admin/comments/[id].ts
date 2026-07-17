import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../../lib/admin-auth";
import { firestoreDelete, firestoreList } from "../../../../lib/firestore-rest";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const id = params.id?.trim();
    if (!id) return jsonError("comment id is required", 400);

    // Cascade: delete replies that point at this comment, then the comment itself.
    const posts = await firestoreList("community");
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const post of posts) {
        const parentId = post.data.parentId;
        if (typeof parentId === "string" && toDelete.has(parentId) && !toDelete.has(post.id)) {
          toDelete.add(post.id);
          changed = true;
        }
      }
    }

    await Promise.all([...toDelete].map((docId) => firestoreDelete("community", docId)));
    return json({ ok: true, deleted: [...toDelete] });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Delete failed", 500);
  }
};
