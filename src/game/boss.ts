/**
 * Hell-gato phase AI — turns the tanky walker into a real fight.
 *
 * Phases: pursue → windup → charge (fast dash, hurts on contact) |
 *                        → leap (jumps at player, slam shockwave on land)
 *         → recover (brief vulnerable pause — your punish window)
 *
 * HP thresholds escalate: below 66% adds the leap, below 33% everything's
 * faster and charges chain twice. State lives on the enemy object so save/
 * load and reset stay trivial.
 */

import { GROUND_Y } from "./constants.ts";
import type { EnemyState, PlayerState } from "./types.ts";

export type BossPhase = "pursue" | "windup" | "charge" | "leap" | "slam" | "recover";

// Stored on the enemy via id-keyed WeakMap — keeps EnemyState untouched for
// save compatibility while giving the boss extra runtime state.
interface BossRuntime {
  phase: BossPhase;
  phaseT: number;
  chargesLeft: number;
  lungeVx: number;
  slamVy: number;
  slamX: number;
}

const runtimes = new WeakMap<EnemyState, BossRuntime>();

function runtimeFor(enemy: EnemyState): BossRuntime {
  let rt = runtimes.get(enemy);
  if (!rt) {
    rt = { phase: "pursue", phaseT: 0, chargesLeft: 0, lungeVx: 0, slamVy: -520, slamX: 0 };
    runtimes.set(enemy, rt);
  }
  return rt;
}

export function bossPhase(enemy: EnemyState): BossPhase {
  return runtimeFor(enemy).phase;
}

/** Shockwave rectangles produced by the last slam (screen-space world x). */
export type Shockwave = { x: number; w: number; t: number };
const shockwaves: Shockwave[] = [];

export function activeShockwaves(): Shockwave[] {
  return shockwaves;
}

export function tickShockwaves(dt: number): void {
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    shockwaves[i]!.t -= dt;
    if (shockwaves[i]!.t <= 0) shockwaves.splice(i, 1);
  }
}

export function resetBoss(enemy: EnemyState): void {
  runtimes.delete(enemy);
  shockwaves.length = 0;
}

const CHASE_SPEED = 78;
const CHARGE_SPEED = 330;
const WINDUP_TIME = 0.55;
const RECOVER_TIME = 0.9;
const LEAP_AIR_TIME = 0.62;

/**
 * Per-frame boss brain. Returns "hit" when the boss's body damages the
 * player this frame (charge contact / slam shockwave), else null. Actual
 * damage application stays in combat.ts via the normal contact path —
 * this only reports so room.ts can shake/flash.
 */
export function tickBoss(enemy: EnemyState, player: PlayerState, dt: number): "hit" | null {
  if (!enemy.alive || enemy.dying) {
    return null;
  }

  const rt = runtimeFor(enemy);
  rt.phaseT += dt;

  const enraged = enemy.hp <= enemy.maxHp * 0.33;
  const toPlayer = player.x + player.w / 2 - (enemy.x + enemy.w / 2);
  const dir = toPlayer > 0 ? 1 : -1;
  const dist = Math.abs(toPlayer);

  switch (rt.phase) {
    case "pursue": {
      enemy.facing = dir as 1 | -1;
      enemy.speed = enraged ? CHASE_SPEED * 1.3 : CHASE_SPEED;
      // walk toward the player within patrol bounds
      const next = enemy.x + dir * enemy.speed * dt;
      if (next > enemy.minX - 60 && next < enemy.maxX + 60) enemy.x = next;

      const ranged = dist < 240 && dist > 70;
      const think = enraged ? 0.8 : 1.4;
      if (rt.phaseT > think && ranged) {
        // pick: leap if unlocked and player is far-ish, else charge
        if (enemy.hp <= enemy.maxHp * 0.66 && Math.random() < 0.45) {
          rt.phase = "windup";
          rt.phaseT = 0;
          rt.slamX = player.x + player.w / 2;
        } else {
          rt.phase = "windup";
          rt.phaseT = 0;
          rt.chargesLeft = enraged ? 2 : 1;
        }
      }
      break;
    }

    case "windup": {
      enemy.facing = dir as 1 | -1;
      enemy.speed = 0;
      if (rt.phaseT > WINDUP_TIME) {
        if (rt.slamX !== 0 && enemy.hp <= enemy.maxHp * 0.66 && Math.random() < 0.5) {
          rt.phase = "leap";
        } else {
          rt.phase = "charge";
        }
        rt.phaseT = 0;
        rt.lungeVx = dir * CHARGE_SPEED * (enraged ? 1.25 : 1);
        enemy.facing = dir as 1 | -1;
      }
      break;
    }

    case "charge": {
      enemy.x += rt.lungeVx * dt;
      enemy.x = Math.max(enemy.minX - 80, Math.min(enemy.maxX + 80, enemy.x));
      // contact damage reported by normal overlap; end charge on wall/time
      if (rt.phaseT > 0.55 || enemy.x <= enemy.minX - 80 || enemy.x >= enemy.maxX + 80) {
        rt.phase = "recover";
        rt.phaseT = 0;
        rt.slamX = 0;
      }
      break;
    }

    case "leap": {
      // ballistic arc toward slamX
      const t = rt.phaseT / LEAP_AIR_TIME;
      enemy.y = GROUND_Y - enemy.h - Math.sin(Math.min(1, t) * Math.PI) * 90;
      enemy.x += ((rt.slamX ?? player.x) - (enemy.x + enemy.w / 2)) * dt * 2.4;
      enemy.facing = ((rt.slamX ?? player.x) > enemy.x ? 1 : -1) as 1 | -1;
      if (t >= 1) {
        enemy.y = GROUND_Y - enemy.h;
        rt.phase = "slam";
        rt.phaseT = 0;
        shockwaves.push({ x: enemy.x - 30, w: enemy.w + 60, t: 0.42 });
        rt.slamX = 0;
      }
      break;
    }

    case "slam": {
      // shockwave does its own damage via activeShockwaves(); boss rests a beat
      if (rt.phaseT > 0.4) {
        rt.phase = "recover";
        rt.phaseT = 0;
      }
      break;
    }

    case "recover": {
      enemy.speed = 0;
      if (rt.phaseT > (enraged ? RECOVER_TIME * 0.6 : RECOVER_TIME)) {
        rt.phase = "pursue";
        rt.phaseT = 0;
      }
      break;
    }
  }

  // charge contact check (leap handled by shockwave + normal contact)
  if (rt.phase === "charge") {
    const overlapX = player.x + player.w > enemy.x + 6 && player.x < enemy.x + enemy.w - 6;
    const overlapY = player.y + player.h > enemy.y && player.y < enemy.y + enemy.h;
    if (overlapX && overlapY) return "hit";
  }

  return null;
}
