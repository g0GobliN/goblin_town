import { getEnv } from "./env";
import { verifyFirebaseIdToken, type VerifiedIdToken } from "./verify-id-token";

export type AdminResult =
  { ok: true; user: VerifiedIdToken } | { ok: false; status: number; error: string };

export async function requireAdmin(request: Request): Promise<AdminResult> {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return { ok: false, status: 401, error: "Missing Authorization bearer token" };
  }

  let user: VerifiedIdToken;
  try {
    user = await verifyFirebaseIdToken(match[1]!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("PUBLIC_FIREBASE_API_KEY") ||
      message.includes("FIREBASE_SERVICE_ACCOUNT")
    ) {
      return { ok: false, status: 500, error: message };
    }
    console.error("verifyIdToken failed:", message);
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  const adminEmail = getEnv("ADMIN_EMAIL")?.toLowerCase();
  const adminUid = getEnv("ADMIN_UID");

  if (!adminEmail && !adminUid) {
    return { ok: false, status: 500, error: "ADMIN_EMAIL or ADMIN_UID is not configured" };
  }

  const emailOk = adminEmail && user.email?.toLowerCase() === adminEmail;
  const uidOk = adminUid && user.uid === adminUid;
  if (!emailOk && !uidOk) {
    return { ok: false, status: 403, error: "Not authorized as admin" };
  }

  return { ok: true, user };
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonError(error: string, status: number) {
  return json({ error }, status);
}
