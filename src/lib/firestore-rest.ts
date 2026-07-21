import { getEnv } from "./env";
import {
  getDoodleServiceAccount,
  getGoogleAccessToken,
  getMainServiceAccount,
  type ServiceAccount,
} from "./google-auth";

function docPath(projectId: string, collection: string, id: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
}

function colPath(projectId: string, collection: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
}

/** Prefer PUBLIC_* project id so SA credentials hit the same DB the site reads. */
function projectIdFor(sa: ServiceAccount, publicEnvKey?: string): string {
  if (publicEnvKey) {
    const fromEnv = getEnv(publicEnvKey)?.trim();
    if (fromEnv) return fromEnv;
  }
  return sa.project_id;
}

function mainProjectId(sa: ServiceAccount): string {
  return projectIdFor(sa, "PUBLIC_FIREBASE_PROJECT_ID");
}

async function authedFetch(sa: ServiceAccount, url: string, init: RequestInit = {}) {
  const token = await getGoogleAccessToken(sa, [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore REST ${init.method || "GET"} ${res.status}: ${body.slice(0, 400)}`);
  }
  return res;
}

/** Convert a plain JS value to a Firestore REST field value. */
function toField(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toField) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      fields[k] = toField(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/** Convert a plain data object into Firestore REST `fields`, dropping undefined values. */
function buildFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    fields[k] = toField(v);
  }
  return fields;
}

function fromFields(fields: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(fields)) {
    const v = raw as Record<string, unknown>;
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = v.doubleValue;
    else if ("nullValue" in v) out[k] = null;
    else if ("arrayValue" in v) {
      const values = ((v.arrayValue as { values?: unknown[] })?.values || []) as Record<
        string,
        unknown
      >[];
      out[k] = values.map((item) => {
        const one = fromFields({ x: item });
        return one.x;
      });
    } else if ("mapValue" in v) {
      out[k] = fromFields(
        ((v.mapValue as { fields?: Record<string, unknown> })?.fields || {}) as Record<
          string,
          unknown
        >,
      );
    }
  }
  return out;
}

export async function firestoreDelete(
  collection: string,
  id: string,
  sa: ServiceAccount = getMainServiceAccount(),
  projectId = mainProjectId(sa),
) {
  const token = await getGoogleAccessToken(sa, [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/cloud-platform",
  ]);
  const url = docPath(projectId, collection, id);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 404 = already gone (fine for cascade deletes)
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(
      `Firestore DELETE ${res.status} (${projectId}/${collection}/${id}): ${body.slice(0, 400)}`,
    );
  }
}

export async function firestoreSet(
  collection: string,
  id: string,
  data: Record<string, unknown>,
  sa: ServiceAccount = getMainServiceAccount(),
) {
  const fields = buildFields(data);
  const keys = Object.keys(fields);
  const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const url = `${docPath(mainProjectId(sa), collection, id)}?${mask}`;
  await authedFetch(sa, url, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

/** Create a document with an auto-generated id. Returns the new id. */
export async function firestoreCreate(
  collection: string,
  data: Record<string, unknown>,
  sa: ServiceAccount = getMainServiceAccount(),
): Promise<string> {
  const fields = buildFields(data);
  const res = await authedFetch(sa, colPath(mainProjectId(sa), collection), {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  const body = (await res.json()) as { name?: string };
  const id = body.name?.split("/").pop();
  if (!id) throw new Error("Firestore CREATE returned no document id");
  return id;
}

export async function firestoreList(
  collection: string,
  sa: ServiceAccount = getMainServiceAccount(),
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const res = await authedFetch(sa, `${colPath(mainProjectId(sa), collection)}?pageSize=300`);
  const body = (await res.json()) as {
    documents?: Array<{ name: string; fields?: Record<string, unknown> }>;
  };
  return (body.documents || []).map((doc) => {
    const id = doc.name.split("/").pop() || "";
    return { id, data: fromFields(doc.fields) };
  });
}

export async function firestoreDeleteDoodle(id: string) {
  const sa = getDoodleServiceAccount();
  if (!sa) throw new Error("DOODLE_SERVICE_ACCOUNT is not set");
  const projectId = projectIdFor(sa, "PUBLIC_DOODLE_PROJECT_ID");
  await firestoreDelete("doodles", id, sa, projectId);
}
