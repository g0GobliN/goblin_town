import { getEnvCandidates } from "./env";

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

function unwrapQuotes(text: string): string {
  let t = text.trim().replace(/^\uFEFF/, "");
  for (let i = 0; i < 3; i++) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      const q = t[0]!;
      const inner = t.slice(1, -1);
      if (q === '"') {
        try {
          const once = JSON.parse(t) as unknown;
          t = typeof once === "string" ? once.trim() : inner.trim();
          continue;
        } catch {
          t = inner.trim();
          continue;
        }
      }
      t = inner.trim();
      continue;
    }
    break;
  }
  if (t.startsWith("'") && !t.endsWith("'")) t = t.slice(1).trim();
  return t;
}

/** First complete `{...}` object (drops duplicated paste garbage after it). */
function firstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) return text;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

function repairPrivateKeyNewlines(text: string): string {
  return text.replace(/"private_key"\s*:\s*"([\s\S]*?)"\s*,/, (_m, pk: string) => {
    const one = pk.replace(/\r?\n/g, "\\n").replace(/(?<!\\)"/g, '\\"');
    return `"private_key":"${one}",`;
  });
}

export function parseServiceAccount(raw: string): ServiceAccount {
  let text = unwrapQuotes(raw);
  text = firstJsonObject(text);

  let sa: ServiceAccount | undefined;
  const attempts = [text, repairPrivateKeyNewlines(text)];
  for (const attempt of attempts) {
    try {
      sa = JSON.parse(attempt) as ServiceAccount;
      break;
    } catch {
      /* try next */
    }
  }
  if (!sa) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON (Cloudflare secret must be raw one-line JSON, no quotes around it)",
    );
  }
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error("Service account JSON missing project_id, client_email, or private_key");
  }
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

export function getMainServiceAccount(): ServiceAccount {
  const candidates = getEnvCandidates("FIREBASE_SERVICE_ACCOUNT");
  if (!candidates.length) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  let lastErr: Error | undefined;
  for (const raw of candidates) {
    try {
      return parseServiceAccount(raw);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
}

export function getDoodleServiceAccount(): ServiceAccount | null {
  const candidates = getEnvCandidates("DOODLE_SERVICE_ACCOUNT");
  if (!candidates.length) return null;
  let lastErr: Error | undefined;
  for (const raw of candidates) {
    try {
      return parseServiceAccount(raw);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error("DOODLE_SERVICE_ACCOUNT is not valid JSON");
}

const tokenCache = new Map<string, { token: string; exp: number }>();

/** OAuth access token from a Google service account (Workers-safe, no Node gRPC). */
export async function getGoogleAccessToken(
  sa: ServiceAccount,
  scopes = ["https://www.googleapis.com/auth/cloud-platform"],
): Promise<string> {
  const cacheKey = `${sa.client_email}|${scopes.join(" ")}`;
  const hit = tokenCache.get(cacheKey);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache.set(cacheKey, {
    token: data.access_token,
    exp: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}
