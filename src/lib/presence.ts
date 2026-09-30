/**
 * Ghost visitors — see other travelers walking the town, live.
 *
 * Each browser writes a heartbeat (x position + a stable random id) to the
 * `ghosts` collection every few seconds and listens to the collection via
 * onSnapshot. Stale ghosts (no heartbeat for GHOST_TTL_MS) are filtered out
 * client-side, so departed visitors fade away without needing deletes.
 * Everything is anonymous and ephemeral — no names, no history.
 */
import { collection, onSnapshot, doc, setDoc, getFirestore } from "firebase/firestore";
import { db } from "./firebase";
import { devWarn } from "./log";

export type Ghost = { id: string; x: number; seenAt: number };

const GHOST_TTL_MS = 12_000;
const HEARTBEAT_MS = 4_000;
const GHOST_ID_KEY = "gt-ghost-id";

/** Live x value used by the heartbeat (set every frame by the game). */
let latestX = 0;
export function setGhostX(x: number) {
  latestX = x;
}

function ghostId(): string {
  try {
    const existing = localStorage.getItem(GHOST_ID_KEY);
    if (existing) return existing;
    const fresh = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(GHOST_ID_KEY, fresh);
    return fresh;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function startPresence(onChange: (ghosts: Ghost[]) => void): () => void {
  if (!db) {
    // Firebase unavailable — run inert.
    onChange([]);
    return () => undefined;
  }

  const id = ghostId();
  const ghostsCol = collection(getFirestore(), "ghosts");
  const meRef = doc(getFirestore(), "ghosts", id);

  const positions = new Map<string, number>();
  const times = new Map<string, number>();
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const emit = () => {
    const now = Date.now();
    const ghosts: Ghost[] = [];
    for (const [gid, x] of positions) {
      const at = times.get(gid) ?? 0;
      if (now - at > GHOST_TTL_MS) {
        positions.delete(gid);
        times.delete(gid);
        continue;
      }
      if (gid === id) continue; // never render yourself
      ghosts.push({ id: gid, x, seenAt: at });
    }
    onChange(ghosts);
  };

  // Live feed of everyone's position
  const unsubscribe = onSnapshot(
    ghostsCol,
    (snap) => {
      const now = Date.now();
      for (const change of snap.docChanges()) {
        if (change.type === "removed") {
          positions.delete(change.doc.id);
          times.delete(change.doc.id);
        }
      }
      for (const d of snap.docs) {
        const data = d.data() as { x?: number; at?: number };
        if (typeof data.x === "number" && data.x >= 0) {
          positions.set(d.id, data.x);
          times.set(d.id, data.at || now);
        }
      }
      emit();
    },
    (err) => devWarn("presence listener unavailable:", err),
  );

  const beat = () => {
    if (stopped) return;
    setDoc(meRef, { x: latestX, at: Date.now() }).catch(() => {
      /* offline or rules reject — ghosts are best-effort */
    });
  };

  const startBeats = () => {
    if (timer) return;
    beat();
    timer = setInterval(beat, HEARTBEAT_MS);
  };

  // Give the game a moment to boot, then start heartbeating.
  setTimeout(() => {
    if (!stopped) startBeats();
  }, 3_000);

  window.addEventListener("beforeunload", () => {
    stopped = true;
    if (timer) clearInterval(timer);
    // x: -1 marks this ghost as gone; the listener drops it.
    setDoc(meRef, { x: -1, at: 0 }).catch(() => undefined);
  });

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    unsubscribe();
    setDoc(meRef, { x: -1, at: 0 }).catch(() => undefined);
  };
}
