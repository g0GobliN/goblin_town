import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

export type Project = {
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
};

export type Blog = {
  slug: string;
  title: string;
  tagline: string;
  content: string;
  publishedAt: string;
  coverImage?: string;
  tags: string[];
};

export type Doodle = {
  id: string;
  name?: string;
  doodle?: string;
  text?: string;
  timestamp?: string;
  createInDarkMode?: boolean;
};

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export async function getDbProjects(): Promise<Project[]> {
  try {
    const q = query(collection(db, "projects"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Project);
  } catch (error) {
    console.warn("Failed to fetch projects:", error);
    return [];
  }
}

export async function getDbBlogs(): Promise<Blog[]> {
  try {
    const q = query(collection(db, "blogs"), orderBy("publishedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Blog);
  } catch (error) {
    console.warn("Failed to fetch blogs:", error);
    return [];
  }
}

const DOODLE_PROJECT =
  import.meta.env.PUBLIC_DOODLE_PROJECT_ID || "doodlenotepad-4d983";

function parseFirestoreValue(value: Record<string, unknown>): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return parseInt(value.integerValue as string, 10);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const arr = value.arrayValue as { values?: Array<Record<string, unknown>> };
    return (arr.values || []).map(parseFirestoreValue);
  }
  if ("mapValue" in value) {
    const map = value.mapValue as { fields?: Record<string, Record<string, unknown>> };
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(map.fields || {})) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return undefined;
}

export async function getDoodles(): Promise<Doodle[]> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${DOODLE_PROJECT}/databases/(default)/documents/doodles?pageSize=50`,
    );
    if (!res.ok) {
      console.warn("Doodle fetch failed:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const documents = (data.documents || []) as Array<Record<string, unknown>>;
    return documents.map((docData) => {
      const name = docData.name as string;
      const id = name.split("/").pop() as string;
      const fields = (docData.fields || {}) as Record<string, Record<string, unknown>>;
      const parsed: Record<string, unknown> = { id };
      for (const [key, val] of Object.entries(fields)) {
        parsed[key] = parseFirestoreValue(val);
      }
      return parsed as Doodle;
    });
  } catch (err) {
    console.warn("Failed to fetch doodles:", err);
    return [];
  }
}

export async function saveDoodle(data: {
  name: string;
  text: string;
  doodle: string;
  timestamp: string;
  createInDarkMode: boolean;
}): Promise<void> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${DOODLE_PROJECT}/databases/(default)/documents/doodles`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          name: { stringValue: data.name },
          text: { stringValue: data.text },
          doodle: { stringValue: data.doodle },
          timestamp: { stringValue: data.timestamp },
          createInDarkMode: { booleanValue: data.createInDarkMode },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Failed to save doodle: ${await res.text()}`);
}
