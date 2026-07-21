import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../lib/admin-auth";
import { firestoreDelete, firestoreSet } from "../../../lib/firestore-rest";
import { pingIndexNow } from "../../../lib/indexnow";
import type { Project } from "../../../lib/firebase";

export const prerender = false;

function parseProject(body: Record<string, unknown>): Project | null {
  const slug = String(body.slug || "").trim();
  const name = String(body.name || "").trim();
  if (!slug || !name) return null;

  const stack = Array.isArray(body.stack)
    ? body.stack.map(String)
    : String(body.stack || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const highlights = Array.isArray(body.highlights)
    ? body.highlights.map(String)
    : String(body.highlights || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

  let links: Project["links"];
  if (Array.isArray(body.links)) {
    links = body.links as Project["links"];
  } else {
    links = String(body.links || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, href] = line.split("|").map((s) => s.trim());
        return { label: label || href || "", href: href || label || "" };
      })
      .filter((l) => l.label && l.href);
  }

  return {
    slug,
    name,
    tagline: String(body.tagline || ""),
    year: String(body.year || ""),
    role: String(body.role || ""),
    stack,
    links,
    summary: String(body.summary || ""),
    highlights,
    coverImage: body.coverImage ? String(body.coverImage) : undefined,
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

    const project = parseProject(body);
    if (!project) return jsonError("slug and name are required", 400);

    await firestoreSet("projects", project.slug, {
      ...project,
      updatedAt: new Date().toISOString(),
    });

    await pingIndexNow(`https://g0.monster/work/${project.slug}/`);
    return json({ ok: true, slug: project.slug });
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

    await firestoreDelete("projects", slug);
    await pingIndexNow(`https://g0.monster/work/${slug}/`);
    return json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Delete failed", 500);
  }
};
