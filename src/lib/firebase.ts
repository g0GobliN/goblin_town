import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  type Firestore,
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

// Never throw at module load: the game page imports this module, so an
// uncaught error here (getAuth asserts the API key) freezes the whole town
// on the intro screen. On bad/missing PUBLIC_FIREBASE_* vars, warn and export
// inert handles — every consumer already treats failed requests as "no data".
let _db: Firestore | null = null;
let _auth: Auth | null = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  _db = getFirestore(app);
  _auth = getAuth(app);
} catch (error) {
  console.warn("Firebase unavailable — check PUBLIC_FIREBASE_* vars in .env.local:", error);
}
export const db = _db as Firestore;
export const auth = _auth as Auth;

export async function getDbProjects(): Promise<Project[]> {
  try {
    const q = query(collection(db, "projects"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Project;
      return { ...data, slug: data.slug || d.id };
    });
  } catch (error) {
    console.warn("Failed to fetch projects:", error);
    return [];
  }
}

export async function getDbProject(slug: string): Promise<Project | null> {
  try {
    const snap = await getDoc(doc(db, "projects", slug));
    if (snap.exists()) {
      const data = snap.data() as Project;
      return { ...data, slug: data.slug || snap.id };
    }
    const all = await getDbProjects();
    return all.find((p) => p.slug === slug) ?? null;
  } catch (error) {
    console.warn("Failed to fetch project:", error);
    return null;
  }
}

export async function getDbBlogs(): Promise<Blog[]> {
  try {
    const q = query(collection(db, "blogs"), orderBy("publishedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Blog;
      return { ...data, slug: data.slug || d.id };
    });
  } catch (error) {
    console.warn("Failed to fetch blogs:", error);
    return [];
  }
}

export async function getDbBlog(slug: string): Promise<Blog | null> {
  try {
    const snap = await getDoc(doc(db, "blogs", slug));
    if (snap.exists()) {
      const data = snap.data() as Blog;
      return { ...data, slug: data.slug || snap.id };
    }
    const all = await getDbBlogs();
    return all.find((b) => b.slug === slug) ?? null;
  } catch (error) {
    console.warn("Failed to fetch blog:", error);
    return null;
  }
}

const DOODLE_PROJECT = import.meta.env.PUBLIC_DOODLE_PROJECT_ID as string;

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
    const documents: Array<Record<string, unknown>> = [];
    let pageToken = "";
    // Pull a few pages so the gallery isn't empty after older doodles.
    for (let page = 0; page < 4; page++) {
      const params = new URLSearchParams({ pageSize: "50" });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${DOODLE_PROJECT}/databases/(default)/documents/doodles?${params}`,
      );
      if (!res.ok) {
        console.warn("Doodle fetch failed:", res.status, await res.text());
        break;
      }
      const data = await res.json();
      documents.push(...((data.documents || []) as Array<Record<string, unknown>>));
      pageToken = data.nextPageToken || "";
      if (!pageToken) break;
    }

    const doodles = documents.map((docData) => {
      const name = docData.name as string;
      const id = name.split("/").pop() as string;
      const fields = (docData.fields || {}) as Record<string, Record<string, unknown>>;
      const parsed: Record<string, unknown> = { id };
      for (const [key, val] of Object.entries(fields)) {
        parsed[key] = parseFirestoreValue(val);
      }
      const doodle = parsed as Doodle;
      // Doodle strings are rendered as raw <img src>, so anything but an
      // inline image (e.g. a remote tracking-pixel URL) must be dropped here.
      if (doodle.doodle && !doodle.doodle.startsWith("data:image/")) {
        delete doodle.doodle;
      }
      return doodle;
    });

    doodles.sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
    return doodles;
  } catch (err) {
    console.warn("Failed to fetch doodles:", err);
    return [];
  }
}

export type CommunityPost = {
  id: string;
  name?: string;
  message?: string;
  timestamp?: string;
  parentId?: string;
};

// Community comments live in the main Firebase project (not the doodle one).
export async function getCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const q = query(collection(db, "community"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as Omit<CommunityPost, "id">), id: d.id }));
  } catch (err) {
    console.warn("Failed to fetch community posts:", err);
    return [];
  }
}

export async function saveCommunityPost(data: {
  name: string;
  message: string;
  timestamp: string;
  parentId?: string;
}): Promise<void> {
  const post: Record<string, string> = {
    name: data.name,
    message: data.message,
    timestamp: data.timestamp,
  };
  if (data.parentId) post.parentId = data.parentId;
  await addDoc(collection(db, "community"), post);
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
