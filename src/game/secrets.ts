/**
 * Secrets — things that exist because someone might find them.
 *
 *   1. Dev island — a ledge beyond the visible edge of the world (walk east
 *      past the gate, keep going). Graffiti + a golden gem worth 3.
 *   2. Vine alcove — a dense bush before the church hides a heart.
 *
 * Each is one-shot: found once, saved, a little fanfare. No map marker —
 * the fun is the rumor.
 */

import { GROUND_Y } from "./constants.ts";

export type SecretId = "dev-island" | "vine-alcove";

export type Secret = {
  id: SecretId;
  /** world x where the discovery triggers */
  x: number;
  /** trigger width */
  w: number;
  /** y range (rooftop is high up) */
  minY: number;
  maxY: number;
};

export const SECRETS: Secret[] = [
  // dev island: past the east gate (gate ~5660, world ends 6100)
  {
    id: "dev-island",
    x: 5940,
    w: 90,
    minY: GROUND_Y - 80,
    maxY: GROUND_Y,
  },
  // vine alcove: dense bushes around x=5060 (church approach)
  {
    id: "vine-alcove",
    x: 5055,
    w: 40,
    minY: GROUND_Y - 60,
    maxY: GROUND_Y,
  },
];

export type SecretState = {
  found: Set<SecretId>;
  /** golden gem collected (worth 3 souls, dev island) */
  goldenGem: boolean;
};

let state: SecretState = { found: new Set(), goldenGem: false };

export function secretState(): SecretState {
  return state;
}

export function loadSecrets(save: { secretsFound?: string[]; goldenGem?: boolean }): void {
  const valid = new Set(SECRETS.map((s) => s.id));
  state = {
    found: new Set(
      (save.secretsFound || []).filter((id): id is SecretId => valid.has(id as SecretId)),
    ),
    goldenGem: save.goldenGem === true,
  };
}

export function saveSecrets(): { secretsFound: string[]; goldenGem: boolean } {
  return { secretsFound: [...state.found], goldenGem: state.goldenGem };
}

/** Returns the secret if the player just discovered one, else null. */
export function checkSecrets(px: number, py: number): Secret | null {
  for (const s of SECRETS) {
    if (state.found.has(s.id)) continue;
    if (px >= s.x && px <= s.x + s.w && py >= s.minY && py <= s.maxY) {
      state.found.add(s.id);
      return s;
    }
  }
  return null;
}

export function hasSecret(id: SecretId): boolean {
  return state.found.has(id);
}

/** World positions of secret rewards (rendered by render.ts). */
export function goldenGemPos(): { x: number; y: number } {
  return { x: 6045, y: GROUND_Y - 18 };
}
