/**
 * Game progress persistence — the town remembers you.
 * Saved to localStorage after each meaningful event (gem, kill, door) and on
 * exit; loaded once at boot. Data lives per-browser, no accounts, no server.
 */

const SAVE_KEY = "gt-save-v1";

export type GameSave = {
  /** gem pickup ids already collected */
  gems: string[];
  /** heart pickup ids already collected */
  hearts: string[];
  /** enemy ids already defeated */
  kills: string[];
  /** crumb (door) ids discovered */
  doors: string[];
  /** last player x position */
  x: number;
  /** saw the credits roll at least once */
  finished: boolean;
  /** arcade mode high score (kills in one run) */
  arcadeBest: number;
  /** side quest: ghost flames caught / done */
  questCaught?: number;
  questDone?: boolean;
  /** gravedigger's gem reward has been paid out */
  questRewarded?: boolean;
  /** secrets discovered + golden gem */
  secretsFound?: string[];
  goldenGem?: boolean;
};

const EMPTY: GameSave = {
  gems: [],
  hearts: [],
  kills: [],
  doors: [],
  x: 0,
  finished: false,
  arcadeBest: 0,
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

/** Parse and validate a stored save; anything malformed returns empty. */
export function loadGameSave(): GameSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...EMPTY };
    const data = JSON.parse(raw) as Partial<GameSave> | null;
    if (!data || typeof data !== "object") return { ...EMPTY };
    return {
      gems: isStringArray(data.gems) ? data.gems : [],
      hearts: isStringArray(data.hearts) ? data.hearts : [],
      kills: isStringArray(data.kills) ? data.kills : [],
      doors: isStringArray(data.doors) ? data.doors : [],
      x: typeof data.x === "number" && Number.isFinite(data.x) ? data.x : 0,
      finished: data.finished === true,
      arcadeBest:
        typeof data.arcadeBest === "number" && Number.isFinite(data.arcadeBest)
          ? Math.max(0, Math.floor(data.arcadeBest))
          : 0,
      questCaught:
        typeof data.questCaught === "number" && Number.isFinite(data.questCaught)
          ? Math.max(0, Math.floor(data.questCaught))
          : 0,
      questDone: data.questDone === true,
      questRewarded: data.questRewarded === true,
      secretsFound: isStringArray(data.secretsFound) ? data.secretsFound : [],
      goldenGem: data.goldenGem === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveGameSave(save: GameSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // storage unavailable (private mode etc.) — progress just won't persist
  }
}

export function clearGameSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
