import type { APIRoute } from "astro";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { json, jsonError, requireAdmin } from "../../../../lib/admin-auth";

export const prerender = false;

function getDoodleAdminApp(): App | null {
  const raw = import.meta.env.DOODLE_SERVICE_ACCOUNT as string | undefined;
  if (!raw) return null;
  const existing = getApps().find((a) => a.name === "doodle-admin");
  if (existing) return existing;
  const sa = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key.replace(/\\n/g, "\n"),
      }),
    },
    "doodle-admin",
  );
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await requireAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const id = params.id?.trim();
  if (!id) return jsonError("doodle id is required", 400);

  const doodleApp = getDoodleAdminApp();
  if (doodleApp) {
    await getFirestore(doodleApp).collection("doodles").doc(id).delete();
    return json({ ok: true });
  }

  const projectId = import.meta.env.PUBLIC_DOODLE_PROJECT_ID as string | undefined;
  const apiKey =
    (import.meta.env.DOODLE_API_KEY as string | undefined) ||
    (import.meta.env.PUBLIC_DOODLE_API_KEY as string | undefined);
  if (!projectId || !apiKey) {
    return jsonError(
      "Set DOODLE_SERVICE_ACCOUNT (recommended) or DOODLE_API_KEY + PUBLIC_DOODLE_PROJECT_ID",
      500,
    );
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/doodles/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    return jsonError(`Failed to delete doodle: ${text}`, res.status);
  }

  return json({ ok: true });
};
