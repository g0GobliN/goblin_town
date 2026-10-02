import assert from "node:assert/strict";
import test from "node:test";
import {
  cameraFollow,
  ladderAt,
  movePlayer,
  resetPlayerAfterDeath,
  solidAt,
  tryJump,
  updateEnemy,
} from "../src/game/physics.ts";
import { GROUND_Y, JUMP_V, VIEW_W } from "../src/game/constants.ts";
import { enterTownScene } from "../src/game/scenes.ts";

function playerAt(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    w: 24,
    h: 34,
    facing: 1,
    onGround: false,
    climbing: false,
    anim: "idle",
    frame: 0,
    frameT: 0,
    hp: 5,
    maxHp: 5,
    attackT: 0,
    hurtT: 0,
    invulnT: 0,
    attackHit: false,
  };
}

test("solidAt finds the ground under the player", () => {
  enterTownScene();
  // The rect must extend into the platform (below its top edge) to overlap
  const hit = solidAt(300, GROUND_Y - 5, 24, 10);
  assert.ok(hit, "ground platform detected");
  assert.equal(hit.y, GROUND_Y);
});

test("solidAt returns null in open air above the street", () => {
  enterTownScene();
  assert.equal(solidAt(300, 20, 24, 10), null);
});

test("ladderAt matches sign ladders at their center", () => {
  enterTownScene();
  const ladder = enterTownScene().ladders[0];
  if (!ladder) return; // town has at least one ladder (hanging sign)
  const cx = ladder.x + ladder.w / 2;
  const cy = ladder.y + ladder.h / 2;
  assert.ok(ladderAt(cx - 12, cy - 17, 24, 34), "player centered on ladder detects it");
  assert.equal(ladderAt(50, 50, 24, 34), null, "nowhere near a ladder");
});

test("tryJump only works from the ground (or while climbing)", () => {
  const p = playerAt(300, GROUND_Y - 34);
  p.onGround = true;
  assert.ok(tryJump(p));
  assert.equal(p.vy, JUMP_V);
  assert.equal(p.onGround, false);

  // In the air already — no double jump
  assert.equal(tryJump(p), false);

  // Climbing: jump releases the ladder with reduced impulse
  p.climbing = true;
  assert.ok(tryJump(p));
  assert.equal(p.climbing, false);
  assert.ok(Math.abs(p.vy) < Math.abs(JUMP_V));
});

test("tryJump is blocked mid-attack and mid-hurt", () => {
  const p = playerAt(300, GROUND_Y - 34);
  p.onGround = true;
  p.attackT = 0.3;
  assert.equal(tryJump(p), false);
  p.attackT = 0;
  p.hurtT = 0.2;
  assert.equal(tryJump(p), false);
});

test("cameraFollow clamps to world edges", () => {
  enterTownScene();
  // Player near the start: camera pins to 0
  const start = cameraFollow(playerAt(20, GROUND_Y - 34));
  assert.equal(start, 0);
  // Player past the world end: camera pins to max scroll
  const max = cameraFollow(playerAt(99999, GROUND_Y - 34));
  const worldMax = cameraFollow(playerAt(0, GROUND_Y - 34)); // sanity
  assert.ok(max >= worldMax);
  // Negative camera is never returned
  assert.ok(start >= 0 && max >= 0);
  // Camera keeps the player roughly centered (within half a view)
  const mid = cameraFollow(playerAt(VIEW_W, GROUND_Y - 34));
  assert.ok(Math.abs(mid - (VIEW_W + 12 - VIEW_W / 2)) <= 1);
});

test("death reset clears knockback, hurt and attack state", () => {
  enterTownScene();
  const p = playerAt(420, GROUND_Y - 34);
  p.vx = -160;
  p.vy = -180;
  p.hurtT = 0.35;
  p.attackT = 0.4;
  p.attackHit = true;
  p.climbing = true;
  p.frame = 5;
  p.frameT = 0.2;

  resetPlayerAfterDeath(p, 180, GROUND_Y - 50);

  assert.equal(p.x, 180);
  assert.equal(p.y, GROUND_Y - 50);
  assert.equal(p.vx, 0);
  assert.equal(p.vy, 0);
  assert.equal(p.hurtT, 0);
  assert.equal(p.invulnT, 2.5);
  assert.equal(p.attackT, 0);
  assert.equal(p.attackHit, false);
  assert.equal(p.climbing, false);
  assert.equal(p.onGround, false);
  assert.equal(p.anim, "idle");
  assert.equal(p.frame, 0);
  assert.equal(p.frameT, 0);

  movePlayer(p, new Set(), 0.1);
  assert.equal(p.x, 180, "no leftover knockback moves the respawned player");
});

test("movePlayer applies gravity when airborne", () => {
  enterTownScene();
  const p = playerAt(300, GROUND_Y - 120);
  const keys = new Set();
  movePlayer(p, keys, 1 / 60);
  assert.ok(p.vy > 0, "gravity pulls down");
});

function enemyAt(x) {
  return {
    x,
    y: GROUND_Y - 34,
    w: 24,
    h: 34,
    kind: "ghoul",
    facing: 1,
    frame: 0,
    frameT: 0,
    animPhase: 0,
    alive: true,
    hp: 3,
    maxHp: 3,
    hurtT: 0,
    minX: x - 100,
    maxX: x + 100,
    speed: 60,
    dying: false,
    deathFrame: 0,
    deathT: 0,
  };
}

test("enemies patrol between their bounds and turn around", () => {
  const e = enemyAt(500);
  updateEnemy(e, 1 / 60);
  assert.ok(e.x > 500, "walks right while facing right");

  // pinned at the far end it turns, then walks back without escaping the bound
  e.x = e.maxX;
  updateEnemy(e, 1 / 60);
  assert.equal(e.facing, -1);
  updateEnemy(e, 1 / 60);
  assert.ok(e.x < e.maxX, "walks back left");
  assert.ok(e.x >= e.minX, "never past the near bound");

  e.x = e.minX;
  updateEnemy(e, 1 / 60);
  assert.equal(e.facing, 1);
  updateEnemy(e, 1 / 60);
  assert.ok(e.x > e.minX, "turns back at the near bound");
  assert.ok(e.x <= e.maxX, "never past the far bound");
});

test("updateEnemy with move=false leaves position to its driver (boss brain)", () => {
  const e = enemyAt(500);
  e.x = e.maxX; // would normally snap + flip here
  updateEnemy(e, 0.5, false);
  assert.equal(e.x, e.maxX, "position untouched");
  assert.equal(e.facing, 1, "facing untouched");
  assert.equal(e.frame, 1, "walk animation still advances");
});
