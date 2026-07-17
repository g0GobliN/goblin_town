import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";

export type AdminResult =
  { ok: true; user: DecodedIdToken } | { ok: false; status: number; error: string };

export async function requireAdmin(request: Request): Promise<AdminResult> {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return { ok: false, status: 401, error: "Missing Authorization bearer token" };
  }

  let user: DecodedIdToken;
  try {
    user = await adminAuth().verifyIdToken(match[1]!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("FIREBASE_SERVICE_ACCOUNT")) {
      return { ok: false, status: 500, error: "FIREBASE_SERVICE_ACCOUNT is not set" };
    }
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  const adminEmail = (import.meta.env.ADMIN_EMAIL as string | undefined)?.toLowerCase();
  const adminUid = import.meta.env.ADMIN_UID as string | undefined;

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
