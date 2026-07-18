import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../../lib/admin-auth";
import { firestoreDelete, firestoreList } from "../../../../lib/firestore-rest";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    // trailingSlash: always can leave a slash on the param
    const id = params.id?.trim().replace(/\/+$/, "");
    if (!id) return jsonError("comment id is required", 400);

    const toDelete = new Set<string>([id]);

    // Cascade: delete replies that point at this comment (best-effort list).
    try {
      const posts = await firestoreList("community");
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
    } catch (err) {
      console.error("community list for cascade failed:", err);
    }

    // Delete the root comment first so a cascade-list failure can't block it.
    await firestoreDelete("community", id);
    const others = [...toDelete].filter((docId) => docId !== id);
    if (others.length) {
      await Promise.allSettled(others.map((docId) => firestoreDelete("community", docId)));
    }

    return json({ ok: true, deleted: [...toDelete] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    console.error("comment delete failed:", message);
    return jsonError(message, 500);
  }
};
