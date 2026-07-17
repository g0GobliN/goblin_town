import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../lib/admin-auth";
import { firestoreDelete, firestoreSet } from "../../../lib/firestore-rest";
import type { Blog } from "../../../lib/firebase";

export const prerender = false;

function parseBlog(body: Record<string, unknown>): Blog | null {
  const slug = String(body.slug || "").trim();
  const title = String(body.title || "").trim();
  if (!slug || !title) return null;

  const tags = Array.isArray(body.tags)
    ? body.tags.map(String)
    : String(body.tags || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    slug,
    title,
    tagline: String(body.tagline || ""),
    content: String(body.content || ""),
    publishedAt: String(body.publishedAt || new Date().toISOString().slice(0, 10)),
    coverImage: body.coverImage ? String(body.coverImage) : undefined,
    tags,
  };
}

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

    const blog = parseBlog(body);
    if (!blog) return jsonError("slug and title are required", 400);

    await firestoreSet("blogs", blog.slug, { ...blog });
    return json({ ok: true, slug: blog.slug });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Save failed", 500);
  }
};

export const PUT: APIRoute = async (ctx) => POST(ctx);

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const slug = String(body.slug || "").trim();
    if (!slug) return jsonError("slug is required", 400);

    await firestoreDelete("blogs", slug);
    return json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Delete failed", 500);
  }
};
