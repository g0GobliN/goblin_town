import { enemyFrameCount } from "./combat";
import {
  ATTACK_DURATION,
  CLIMB_SPEED,
  GRAVITY,
  GROUND_Y,
  HURT_DURATION,
  JUMP_V,
  MOVE_SPEED,
  RUN_SPEED,
  VIEW_W,
} from "./constants";
import { getSceneLadders, getScenePlatforms, getSceneWorldW } from "./scenes";
import type { EnemyState, PlayerState, Rect } from "./types";

export function solidAt(x: number, y: number, w: number, h: number): Rect | null {
  for (const platform of getScenePlatforms()) {
    const overlaps =
      x + w > platform.x &&
      x < platform.x + platform.w &&
      y + h > platform.y &&
      y < platform.y + platform.h;

    if (overlaps) return platform;
  }
  return null;
}

export function ladderAt(x: number, y: number, w: number, h: number): Rect | null {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pad = 6;

  for (const ladder of getSceneLadders()) {
    if (
      cx > ladder.x - pad &&
      cx < ladder.x + ladder.w + pad &&
      cy > ladder.y &&
      cy < ladder.y + ladder.h
    ) {
      return ladder;
    }
  }
  return null;
}

export function tryJump(player: PlayerState): boolean {
  if (player.attackT > 0 || player.hurtT > 0) return false;

  if (player.climbing) {
    player.climbing = false;
    player.vy = JUMP_V * 0.75;
    return true;
  }

  if (!player.onGround) return false;
  player.vy = JUMP_V;
  player.onGround = false;
  return true;
}

export function tryAttack(player: PlayerState): boolean {
  if (player.attackT > 0 || player.hurtT > 0 || player.climbing) return false;
  player.attackT = ATTACK_DURATION;
  player.attackHit = false;
  player.anim = "attack";
  player.frame = 0;
  player.frameT = 0;
  return true;
}

export function movePlayer(player: PlayerState, keys: Set<string>, dt: number): void {
  if (player.hurtT > 0) {
    player.hurtT -= dt;
    player.anim = "hurt";
    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    resolveGround(player);
    tickAnim(player, dt, 0.1);
    return;
  }

  let move = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) move -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) move += 1;
  const running = keys.has("Shift");
  const speed = running ? RUN_SPEED : MOVE_SPEED;

  // Attack while moving — keep slash anim, still honor left/right
  if (player.attackT > 0) {
    player.attackT -= dt;
    player.anim = "attack";
    player.vx = move * speed;
    if (move) player.facing = move > 0 ? 1 : -1;
    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.x = Math.max(8, Math.min(getSceneWorldW() - player.w - 8, player.x));
    let hit = solidAt(player.x, player.y + 4, player.w, player.h - 8);
    if (hit && player.vx !== 0) {
      player.x = player.vx > 0 ? hit.x - player.w : hit.x + hit.w;
    }
    player.y += player.vy * dt;
    resolveGround(player);
    const kickFrames = 8;
    player.frame = Math.min(
      kickFrames - 1,
      Math.floor(((ATTACK_DURATION - player.attackT) / ATTACK_DURATION) * kickFrames),
    );
    return;
  }

  const ladder = ladderAt(player.x, player.y, player.w, player.h);
  const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W");
  const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S");

  // only climb while holding W/S — no floating stuck on walls
  if (ladder && (up || down)) {
    player.climbing = true;
    player.onGround = false;
    player.vx = 0;
    player.x = ladder.x + ladder.w / 2 - player.w / 2;

    const climb = up ? -1 : 1;
    player.vy = climb * CLIMB_SPEED;
    player.y += player.vy * dt;

    // step onto the ledge at the top of the climb (sign board)
    if (up && player.y + player.h <= ladder.y + 12) {
      const ledge = solidAt(ladder.x, ladder.y, ladder.w, 16);
      const top = ledge ? ledge.y : ladder.y + 10;
      player.y = top - player.h;
      player.x = ladder.x + ladder.w / 2 - player.w / 2;
      player.climbing = false;
      player.onGround = true;
      player.vy = 0;
      player.anim = "idle";
      return;
    }

    // back to ground at bottom
    if (player.y + player.h >= ladder.y + ladder.h) {
      player.y = GROUND_Y - player.h;
      player.climbing = false;
      player.onGround = true;
      player.vy = 0;
      player.anim = "idle";
      return;
    }

    player.anim = "walk";
    tickAnim(player, dt, 0.1);
    return;
  }

  player.climbing = false;

  player.vx = move * speed;
  if (move) player.facing = move > 0 ? 1 : -1;

  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.x = Math.max(8, Math.min(getSceneWorldW() - player.w - 8, player.x));

  let hit = solidAt(player.x, player.y + 4, player.w, player.h - 8);
  if (hit && player.vx !== 0) {
    player.x = player.vx > 0 ? hit.x - player.w : hit.x + hit.w;
  }

  player.y += player.vy * dt;
  resolveGround(player);

  if (!player.onGround) {
    player.anim = player.vy < 0 ? "jump" : "fall";
  } else if (Math.abs(player.vx) > 10) {
    player.anim = "walk";
  } else {
    player.anim = "idle";
  }

  const walkRate = running && Math.abs(player.vx) > 10 ? 0.07 : 0.1;
  tickAnim(player, dt, player.anim === "walk" ? walkRate : 0.16);
}

function resolveGround(player: PlayerState) {
  player.onGround = false;
  const hit = solidAt(player.x + 2, player.y, player.w - 4, player.h);
  if (hit && player.vy >= 0) {
    player.y = hit.y - player.h;
    player.vy = 0;
    player.onGround = true;
  } else if (hit && player.vy < 0) {
    player.y = hit.y + hit.h;
    player.vy = 0;
  }
}

function tickAnim(player: PlayerState, dt: number, rate: number) {
  player.frameT += dt;
  if (player.frameT > rate) {
    player.frameT = 0;
    player.frame++;
  }
}

export function updateEnemy(enemy: EnemyState, dt: number): void {
  if (enemy.dying) {
    enemy.deathT += dt;
    if (enemy.deathT > 0.08) {
      enemy.deathT = 0;
      enemy.deathFrame++;
      const deathMax = enemy.kind === "ghoul" ? 9 : 5;
      if (enemy.deathFrame >= deathMax) {
        enemy.alive = false;
        enemy.dying = false;
      }
    }
    return;
  }

  if (!enemy.alive) return;

  if (enemy.hurtT > 0) {
    enemy.hurtT -= dt;
  } else {
    enemy.x += enemy.facing * enemy.speed * dt;
    // Clamp at patrol ends — bare flip causes stuck jitter on the edge
    if (enemy.x <= enemy.minX) {
      enemy.x = enemy.minX;
      enemy.facing = 1;
    } else if (enemy.x >= enemy.maxX) {
      enemy.x = enemy.maxX;
      enemy.facing = -1;
    }
  }

  enemy.frameT += dt;
  if (enemy.frameT > 0.12) {
    enemy.frameT = 0;
    enemy.frame = (enemy.frame + 1) % enemyFrameCount(enemy.kind);
  }
}

export function cameraFollow(player: PlayerState): number {
  const target = player.x + player.w / 2 - VIEW_W / 2;
  return Math.max(0, Math.min(getSceneWorldW() - VIEW_W, target));
}

export { HURT_DURATION };
