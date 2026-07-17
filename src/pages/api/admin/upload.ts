import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../lib/admin-auth";
import { adminBucket } from "../../../lib/firebase-admin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart form data", 400);
  }

  const file = form.get("file");
  const folder = String(form.get("folder") || "covers").replace(/[^a-z0-9-_]/gi, "");
  if (!(file instanceof File)) return jsonError("file is required", 400);
  if (file.size > 5 * 1024 * 1024) return jsonError("file too large (max 5MB)", 400);

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "png"}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = adminBucket();
  const object = bucket.file(path);

  await object.save(buffer, {
    metadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
  });
  await object.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
  return json({ ok: true, url });
};
