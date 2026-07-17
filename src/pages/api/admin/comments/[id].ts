import type { APIRoute } from "astro";
import { adminDb } from "../../../../lib/firebase-admin";
import { json, jsonError, requireAdmin } from "../../../../lib/admin-auth";

export const prerender = false;

// A comment's replies reference it via parentId; deleting a comment removes
// the whole subtree so no orphaned replies float up as top-level comments.
function collectSubtree(rootId: string, childrenOf: Map<string, string[]>): string[] {
  const toDelete: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.pop()!;
    toDelete.push(id);
    queue.push(...(childrenOf.get(id) || []));
  }
  return toDelete;
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const id = params.id?.trim();
  if (!id) return jsonError("comment id is required", 400);

  const db = adminDb();
  const snap = await db.collection("community").get();
  const childrenOf = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const parentId = doc.get("parentId") as string | undefined;
    if (parentId) childrenOf.set(parentId, [...(childrenOf.get(parentId) || []), doc.id]);
  }

  const toDelete = collectSubtree(id, childrenOf);
  await Promise.all(toDelete.map((docId) => db.collection("community").doc(docId).delete()));

  return json({ ok: true, deleted: toDelete.length });
};
