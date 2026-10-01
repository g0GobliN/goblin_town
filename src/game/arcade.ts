/**
 * Arcade — "Hell-gato Returns": endless wave defense in the cemetery.
 *
 * The player defends the church gate; ghouls/ghosts/skeletons spawn in
 * waves from both sides, escalating per wave. Score = kills; hearts drop
 * occasionally. Death ends the run, submits the score to the leaderboard
 * (Firestore `arcade` collection, anonymous) and shows the top 10.
 *
 * Completely separate state from the story town — entering arcade saves
 * your town progress and swaps the world; leaving restores it.
 */

import type { EnemyKind } from "./types.ts";

export type ArcadeWave = {
  wave: number;
  /** enemies remaining to spawn */
  toSpawn: number;
  /** enemies still alive */
  alive: number;
  spawnT: number;
};

export type ArcadeRun = {
  active: boolean;
  wave: number;
  score: number;
  hp: number;
  betweenT: number;
  /** spawn timer (seconds until next enemy) */
  spawnT: number;
  /** seconds of invulnerability after the run starts — time to read + move */
  graceT: number;
};

export type LeaderRow = {
  name: string;
  score: number;
  at: string;
  you?: boolean;
};

const SPAWN_INTERVAL = 1.3;

export function newRun(): ArcadeRun {
  return { active: true, wave: 1, score: 0, hp: 5, betweenT: 0, spawnT: 0, graceT: 2.5 };
}

/** Composition of a wave — mix shifts with depth. Wave 1 is deliberately light. */
export function waveComposition(wave: number): Array<{ kind: EnemyKind; count: number }> {
  const base = 2 + Math.floor(wave * 1.5);
  const comp: Array<{ kind: EnemyKind; count: number }> = [
    { kind: "ghoul", count: Math.ceil(base * 0.5) },
    { kind: "skeleton", count: Math.ceil(base * 0.3) },
  ];
  if (wave >= 2) comp.push({ kind: "ghost", count: Math.ceil(base * 0.25) });
  if (wave >= 4) comp.push({ kind: "hound", count: 1 }); // mini-hell-gato
  return comp;
}

export function waveSpeed(wave: number): number {
  return 40 + Math.min(60, wave * 5);
}

/** Next spawn from the wave bag. Returns null when the wave is cleared. */
export function nextSpawn(_run: ArcadeRun, bag: EnemyKind[]): EnemyKind | null {
  if (bag.length === 0) return null;
  return bag.shift()!;
}

export function spawnInterval(wave: number): number {
  return Math.max(0.35, SPAWN_INTERVAL - wave * 0.06);
}

/** Wave complete → brief respite, then next wave. */
export function tickWaves(run: ArcadeRun, aliveCount: number, bagEmpty: boolean, dt: number): void {
  if (aliveCount === 0 && bagEmpty) {
    run.betweenT += dt;
    if (run.betweenT > 2.2) {
      run.wave += 1;
      run.betweenT = 0;
    }
  } else {
    run.betweenT = 0;
  }
}

// ── leaderboard (Firestore REST, anonymous) ─────────────────────────────

const ARCADE_COLLECTION = "arcade";

function projectId(): string | null {
  const id = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

interface ArcadeDoc {
  name?: string;
  fields?: Record<string, { stringValue?: string; integerValue?: string }>;
}

/** Submit a score. Name is the goblin name (≤ 16 chars) or "traveler". */
export async function submitScore(
  name: string,
  score: number,
): Promise<{ rank: number; total: number } | null> {
  const pid = projectId();
  if (!pid || score <= 0) return null;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/${ARCADE_COLLECTION}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            name: { stringValue: name.slice(0, 16) || "traveler" },
            score: { integerValue: String(Math.floor(score)) },
            at: { stringValue: new Date().toISOString().slice(0, 10) },
          },
        }),
      },
    );
    if (!res.ok) return null;
    return await rankFor(score);
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const pid = projectId();
  if (!pid) return [];
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/${ARCADE_COLLECTION}?pageSize=200&orderBy=score%20desc`,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { documents?: ArcadeDoc[] };
    return (body.documents || [])
      .map((d) => ({
        name: (d.fields?.name?.stringValue || "traveler").slice(0, 16),
        score: Number(d.fields?.score?.integerValue || 0),
        at: d.fields?.at?.stringValue || "",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function rankFor(score: number): Promise<{ rank: number; total: number } | null> {
  const rows = await fetchLeaderboard(200);
  const total = rows.length;
  const rank = rows.filter((r) => r.score > score).length + 1;
  return { rank, total };
}
