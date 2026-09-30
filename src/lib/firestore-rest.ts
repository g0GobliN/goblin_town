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

// ── Server-side public readers ─────────────────────────────────────────
// These use the anonymous public REST API (no service account needed) so
// Astro pages can server-render content that crawlers can see. Results are
// cached in-memory with a short TTL — enough to absorb request bursts on
// Cloudflare Workers while keeping content fresh within a couple of minutes.

const publicCache = new Map<string, { at: number; value: unknown }>();
const PUBLIC_CACHE_TTL_MS = 60_000;

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = publicCache.get(key);
  if (hit && Date.now() - hit.at < PUBLIC_CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  publicCache.set(key, { at: Date.now(), value });
  return value;
}

function publicProjectId(): string | null {
  return getEnv("PUBLIC_FIREBASE_PROJECT_ID")?.trim() || null;
}

/** Firestore REST value → plain JS (same shapes as lib/firebase.ts parsing). */
function fromPublicFields(fields: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(fields)) {
    const v = raw as Record<string, unknown>;
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = v.doubleValue;
    else if ("nullValue" in v) out[k] = null;
    else if ("timestampValue" in v) out[k] = v.timestampValue;
    else if ("arrayValue" in v) {
      const values = ((v.arrayValue as { values?: unknown[] })?.values || []) as Record<
        string,
        unknown
      >[];
      out[k] = values.map((item) => fromPublicFields({ x: item }).x);
    } else if ("mapValue" in v) {
      out[k] = fromPublicFields(
        ((v.mapValue as { fields?: Record<string, unknown> })?.fields || {}) as Record<
          string,
          unknown
        >,
      );
    }
  }
  return out;
}

interface PublicDoc {
  name?: string;
  fields?: Record<string, Record<string, unknown>>;
}

async function publicListRaw(collection: string, pageSize: number): Promise<PublicDoc[]> {
  const projectId = publicProjectId();
  if (!projectId) return [];
  const res = await fetch(`${colPath(projectId, collection)}?pageSize=${pageSize}`);
  if (!res.ok) throw new Error(`Firestore public list ${collection}: ${res.status}`);
  const body = (await res.json()) as { documents?: PublicDoc[] };
  return body.documents || [];
}

async function publicGetRaw(collection: string, id: string): Promise<PublicDoc | null> {
  const projectId = publicProjectId();
  if (!projectId) return null;
  const res = await fetch(docPath(projectId, collection, id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore public get ${collection}/${id}: ${res.status}`);
  return (await res.json()) as PublicDoc;
}

export type RestProject = {
  slug: string;
  name: string;
  tagline: string;
  year: string;
  role: string;
  stack: string[];
  links?: { label: string; href: string }[];
  summary: string;
  highlights: string[];
  coverImage?: string;
  updatedAt?: string;
};

export type RestBlog = {
  slug: string;
  title: string;
  tagline: string;
  content: string;
  publishedAt: string;
  coverImage?: string;
  tags: string[];
};

export async function fetchProjectsSsr(): Promise<RestProject[]> {
  return cached("projects", async () => {
    try {
      const docs = await publicListRaw("projects", 200);
      const projects = docs.map((doc) => {
        const id = doc.name?.split("/").pop() || "";
        const data = fromPublicFields(doc.fields) as Record<string, unknown>;
        return { ...data, slug: (data.slug as string) || id } as RestProject;
      });
      projects.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      return projects;
    } catch {
      return [];
    }
  });
}

export async function fetchProjectSsr(slug: string): Promise<RestProject | null> {
  const listed = await fetchProjectsSsr();
  return listed.find((p) => p.slug === slug) ?? null;
}

export async function fetchBlogsSsr(): Promise<RestBlog[]> {
  return cached("blogs", async () => {
    try {
      const docs = await publicListRaw("blogs", 200);
      const blogs = docs.map((doc) => {
        const id = doc.name?.split("/").pop() || "";
        const data = fromPublicFields(doc.fields) as Record<string, unknown>;
        return { ...data, slug: (data.slug as string) || id } as RestBlog;
      });
      blogs.sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
      return blogs;
    } catch {
      return [];
    }
  });
}

export async function fetchBlogSsr(slug: string): Promise<RestBlog | null> {
  try {
    const doc = await publicGetRaw("blogs", slug);
    if (doc?.fields) {
      const data = fromPublicFields(doc.fields) as Record<string, unknown>;
      return { ...data, slug: (data.slug as string) || slug } as RestBlog;
    }
  } catch {
    /* fall through to list lookup */
  }
  const listed = await fetchBlogsSsr();
  return listed.find((b) => b.slug === slug) ?? null;
}
