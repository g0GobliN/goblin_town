import {
  ATTACK_DURATION,
  ENEMY_MAX_HP,
  GROUND_Y,
  HURT_DURATION,
  INVULN_DURATION,
  PLAYER_MAX_HP,
} from "./constants";
import type { EnemyKind, EnemyState, PlayerState, Rect } from "./types";

function overlaps(a: Rect, b: Rect): boolean {
  return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
}

export function playerBody(player: PlayerState): Rect {
  const cx = player.x + player.w / 2;
  return { x: cx - 9, y: player.y + 14, w: 18, h: 26 };
}

export function attackBox(player: PlayerState): Rect | null {
  if (player.attackT <= 0) return null;
  const progress = 1 - player.attackT / ATTACK_DURATION;
  if (progress < 0.3 || progress > 0.75) return null;

  const reach = 26;
  const cx = player.x + player.w / 2;
  const x = player.facing > 0 ? cx + 4 : cx - 4 - reach;
  return { x, y: player.y + 12, w: reach, h: 24 };
}

export function enemyBody(enemy: EnemyState): Rect {
  if (enemy.kind === "ghost") {
    return { x: enemy.x + 8, y: enemy.y + 18, w: 20, h: 28 };
  }
  if (enemy.kind === "hound") {
    return { x: enemy.x + 28, y: enemy.y + 18, w: 40, h: 28 };
  }
  if (enemy.kind === "skeleton") {
    return { x: enemy.x + 10, y: enemy.y + 14, w: 22, h: 30 };
  }
  const cx = enemy.x + 28;
  return { x: cx - 10, y: enemy.y + 22, w: 20, h: 26 };
}

export function enemyFrameCount(kind: EnemyKind): number {
  if (kind === "ghost" || kind === "hound") return 4;
  return 8;
}

function spawn(
  id: string,
  kind: EnemyKind,
  x: number,
  patrol: number,
  speed: number,
  hp: number,
): EnemyState {
  const h = kind === "ghost" ? 56 : kind === "hound" ? 48 : 52;
  const w = kind === "hound" ? 80 : kind === "ghost" ? 40 : 48;
  return {
    id,
    kind,
    x,
    y: GROUND_Y - h,
    w,
    h,
    facing: -1,
    frame: 0,
    frameT: 0,
    alive: true,
    hp,
    maxHp: hp,
    hurtT: 0,
    minX: x - patrol,
    maxX: x + patrol,
    speed,
    dying: false,
    deathFrame: 0,
    deathT: 0,
  };
}

/** Mix of town ghouls + cemetery ghosts/skeletons/hound */
export function createEnemies(): EnemyState[] {
  // Keep patrols clear of townsfolk so they don't stack / block talk
  return [
    spawn("g1", "ghoul", 620, 50, 38, ENEMY_MAX_HP),
    spawn("g2", "skeleton", 1180, 70, 36, ENEMY_MAX_HP),
    spawn("g3", "ghoul", 1680, 70, 40, ENEMY_MAX_HP),
    spawn("g4", "ghost", 2150, 90, 50, 2),
    spawn("g5", "skeleton", 2550, 80, 40, ENEMY_MAX_HP),
    spawn("g6", "ghoul", 2950, 80, 48, 4),
    spawn("g7", "ghost", 3600, 90, 55, 2),
    spawn("g8", "skeleton", 4000, 80, 42, ENEMY_MAX_HP),
    spawn("g9", "ghoul", 4350, 80, 46, 4),
    spawn("g10", "ghost", 4800, 80, 52, 3),
    spawn("g11", "skeleton", 5100, 70, 44, 4),
    // Hell-gato — church gate boss: tankier, faster, wider patrol
    spawn("g12", "hound", 5350, 120, 78, 12),
  ];
}

export function enemiesKilled(enemies: EnemyState[]): number {
  return enemies.filter((e) => !e.alive || e.dying).length;
}

export type CombatEvent = "hit" | "hurt" | "kill" | null;

export function resolveCombat(player: PlayerState, enemies: EnemyState[], dt: number): CombatEvent {
  let event: CombatEvent = null;

  if (player.invulnT > 0) player.invulnT -= dt;

  const atk = attackBox(player);
  if (atk && !player.attackHit) {
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.dying || enemy.hurtT > 0) continue;
      if (!overlaps(atk, enemyBody(enemy))) continue;

      player.attackHit = true;
      enemy.hp -= 1;
      enemy.hurtT = 0.25;
      enemy.x += player.facing * 18;
      event = "hit";

      if (enemy.hp <= 0) {
        enemy.dying = true;
        enemy.deathFrame = 0;
        enemy.deathT = 0;
        event = "kill";
      }
      break;
    }
  }

  if (player.invulnT > 0 || player.hurtT > 0) return event;

  const body = playerBody(player);
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.dying) continue;
    if (!overlaps(body, enemyBody(enemy))) continue;

    const dmg = enemy.kind === "hound" ? 2 : 1;
    player.hp = Math.max(0, player.hp - dmg);
    player.hurtT = HURT_DURATION;
    player.invulnT = INVULN_DURATION;
    player.attackT = 0;
    player.climbing = false;
    player.vx = -player.facing * (enemy.kind === "hound" ? 160 : 120);
    player.vy = -180;
    player.anim = "hurt";
    player.frame = 0;
    return "hurt";
  }

  return event;
}

export function makePlayer(): PlayerState {
  return {
    x: 180,
    y: GROUND_Y - 50,
    vx: 0,
    vy: 0,
    w: 28,
    h: 44,
    facing: 1,
    onGround: false,
    climbing: false,
    anim: "idle",
    frame: 0,
    frameT: 0,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    attackT: 0,
    hurtT: 0,
    invulnT: 0,
    attackHit: false,
  };
}
