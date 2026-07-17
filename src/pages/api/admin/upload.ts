import type { APIRoute } from "astro";
import { json, jsonError, requireAdmin } from "../../../lib/admin-auth";
import { getEnv } from "../../../lib/env";
import { getGoogleAccessToken, getMainServiceAccount } from "../../../lib/google-auth";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
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

    const sa = getMainServiceAccount();
    const bucket = getEnv("PUBLIC_FIREBASE_STORAGE_BUCKET") || `${sa.project_id}.appspot.com`;
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const objectName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "png"}`;

    const token = await getGoogleAccessToken(sa, [
      "https://www.googleapis.com/auth/devstorage.full_control",
      "https://www.googleapis.com/auth/cloud-platform",
    ]);

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}&predefinedAcl=publicRead`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: await file.arrayBuffer(),
    });
    if (!uploadRes.ok) {
      return jsonError(`Upload failed: ${await uploadRes.text()}`, 500);
    }

    const url = `https://storage.googleapis.com/${bucket}/${objectName}`;
    return json({ ok: true, url });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Upload failed", 500);
  }
};
