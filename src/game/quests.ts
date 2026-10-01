/**
 * Side quest — "Restless Flames"
 *
 * The gravedigger (old man by the church) asks you to catch 3 ghost flames —
 * wisps that drift around the cemetery and flee when you get close. Reward:
 * gems (spend on hats). One-shot quest; state lives in the save.
 */

import type { GhostFlame } from "./types.ts";

export const FLAMES_REQUIRED = 3;

export type QuestState = {
  /** flames caught so far */
  caught: number;
  /** quest finished + reward claimed */
  done: boolean;
  /** gem payout already handed over (survives reloads — no infinite gems) */
  rewarded: boolean;
};

let state: QuestState = { caught: 0, done: false, rewarded: false };

export function questState(): QuestState {
  return state;
}

export function loadQuest(save: {
  questCaught?: number;
  questDone?: boolean;
  questRewarded?: boolean;
}): void {
  state = {
    caught: typeof save.questCaught === "number" ? save.questCaught : 0,
    done: save.questDone === true,
    rewarded: save.questRewarded === true,
  };
}

export function saveQuest(): { questCaught: number; questDone: boolean; questRewarded: boolean } {
  return { questCaught: state.caught, questDone: state.done, questRewarded: state.rewarded };
}

export function resetQuestFlames(flames: GhostFlame[]): void {
  if (!state.done) {
    for (const f of flames) f.caught = false;
  }
}

/** Mark the gravedigger's gem payout as handed over. */
export function questRewardPaid(): void {
  state.rewarded = true;
}

/** Catch the nearest uncaught flame within radius. Returns true if caught. */
export function catchFlame(flames: GhostFlame[], px: number, py: number): GhostFlame | null {
  if (state.done) return null;
  for (const f of flames) {
    if (f.caught) continue;
    const dx = f.x - px;
    const dy = f.y - py;
    if (dx * dx + dy * dy < 30 * 30) {
      f.caught = true;
      state.caught += 1;
      if (state.caught >= FLAMES_REQUIRED) state.done = true;
      return f;
    }
  }
  return null;
}

export function flamesRemaining(): number {
  return Math.max(0, FLAMES_REQUIRED - state.caught);
}
