import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../../lib/admin-auth";
import { firestoreDelete, firestoreList } from "../../../../lib/firestore-rest";

export const prerender = false;

function collectDescendants(
  rootId: string,
  docs: Array<{ id: string; data: Record<string, unknown> }>,
): string[] {
  const children = new Map<string, string[]>();
  for (const doc of docs) {
    const parent = typeof doc.data.parentId === "string" ? doc.data.parentId : "";
    if (!parent) continue;
    const list = children.get(parent) || [];
    list.push(doc.id);
    children.set(parent, list);
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const stack = [...(children.get(rootId) || [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    const kids = children.get(id);
    if (kids) stack.push(...kids);
  }
  return out;
}

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const id = params.id?.trim().replace(/\/+$/, "");
    if (!id) return jsonError("comment id is required", 400);

    // Cascade: delete replies that point at this comment (best-effort list).
    const toDelete = new Set<string>([id]);
    try {
      const docs = await firestoreList("community");
      for (const descendantId of collectDescendants(id, docs)) {
        toDelete.add(descendantId);
      }
    } catch (err) {
      console.error("community list for cascade failed:", err);
    }

    // Delete the root comment first so a cascade-list failure can't block it.
    await firestoreDelete("community", id);
    const others = [...toDelete].filter((docId) => docId !== id);
    if (others.length) {
      const results = await Promise.allSettled(
        others.map((docId) => firestoreDelete("community", docId)),
      );
      for (const [i, result] of results.entries()) {
        if (result.status === "rejected") {
          console.error(`cascade delete failed for ${others[i]}:`, result.reason);
        }
      }
    }

    return json({ ok: true, deleted: [...toDelete] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    console.error("comment delete failed:", message);
    return jsonError(message, 500);
  }
};
