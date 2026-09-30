import assert from "node:assert/strict";
import test from "node:test";
import {
  attackBox,
  createEnemies,
  enemiesKilled,
  enemyBody,
  makePlayer,
  playerBody,
  resolveCombat,
} from "../src/game/combat.ts";
import { ATTACK_DURATION, ENEMY_MAX_HP } from "../src/game/constants.ts";

function rectOverlap(a, b) {
  return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
}

test("makePlayer starts at full health on the ground", () => {
  const p = makePlayer();
  assert.equal(p.hp, p.maxHp);
  assert.ok(p.maxHp > 0);
  assert.equal(p.onGround, false);
});

test("playerBody is inside the player bounds", () => {
  const p = makePlayer();
  const body = playerBody(p);
  assert.ok(body.x >= p.x);
  assert.ok(body.x + body.w <= p.x + p.w + 1);
  assert.ok(body.h > 0 && body.w > 0);
});

test("attackBox is null outside the active attack window", () => {
  const p = makePlayer();
  assert.equal(attackBox(p), null, "no attack → no box");
  p.attackT = ATTACK_DURATION; // just started (progress 0 < 0.3)
  assert.equal(attackBox(p), null, "startup frames have no box");
  p.attackT = ATTACK_DURATION * 0.5; // mid-swing
  assert.ok(attackBox(p), "mid-swing has a box");
  p.attackT = 0.01; // recovery (progress > 0.75)
  assert.equal(attackBox(p), null, "recovery frames have no box");
});

test("createEnemies spawns the full roster with positive hp", () => {
  const enemies = createEnemies();
  assert.ok(enemies.length >= 10);
  for (const e of enemies) {
    assert.ok(e.hp > 0);
    assert.ok(e.alive);
    assert.ok(e.w > 0 && e.h > 0);
  }
  // exactly one boss (hound)
  assert.equal(enemies.filter((e) => e.kind === "hound").length, 1);
});

test("enemiesKilled counts dying and dead enemies", () => {
  const enemies = createEnemies();
  assert.equal(enemiesKilled(enemies), 0);
  enemies[0].dying = true;
  assert.equal(enemiesKilled(enemies), 1);
  enemies[1].alive = false;
  assert.equal(enemiesKilled(enemies), 2);
});

test("resolveCombat kills an enemy after ENEMY_MAX_HP hits", () => {
  const p = makePlayer();
  const enemies = createEnemies();
  const ghoul = enemies.find((e) => e.kind === "ghoul");
  // Position so the attack box (reach 26 in front) overlaps the ghoul body
  const body = enemyBody(ghoul);
  p.x = body.x - 10;
  p.y = body.y - 12;
  p.facing = 1;

  const events = new Set();
  for (let i = 0; i < ENEMY_MAX_HP + 2; i++) {
    p.attackT = ATTACK_DURATION * 0.5;
    p.attackHit = false;
    p.hurtT = 0; // ignore knockback between swings
    p.invulnT = 0;
    // re-place the ghoul after each knockback so hits keep connecting
    ghoul.x = 200;
    ghoul.hurtT = 0;
    ghoul.minX = 100;
    ghoul.maxX = 400;
    p.x = enemyBody(ghoul).x - 10;
    events.add(resolveCombat(p, enemies, 1 / 60));
  }
  assert.ok(events.has("hit"), "at least one hit landed");
  assert.equal(ghoul.dying, true, "ghoul dies after enough hits");
  assert.ok(events.has("kill"), "a kill event fired");
});

test("resolveCombat hurts the player on enemy contact", () => {
  const p = makePlayer();
  const enemies = createEnemies();
  const ghoul = enemies.find((e) => e.kind === "ghoul");
  // Player body overlaps enemy body
  p.x = enemyBody(ghoul).x;
  p.y = enemyBody(ghoul).y;
  const hpBefore = p.hp;
  const event = resolveCombat(p, enemies, 1 / 60);
  assert.equal(event, "hurt");
  assert.ok(p.hp < hpBefore);
  assert.ok(p.invulnT > 0);
});

test("invulnerable player takes no contact damage", () => {
  const p = makePlayer();
  const enemies = createEnemies();
  const ghoul = enemies.find((e) => e.kind === "ghoul");
  p.x = enemyBody(ghoul).x;
  p.y = enemyBody(ghoul).y;
  p.invulnT = 5;
  const hpBefore = p.hp;
  const event = resolveCombat(p, enemies, 1 / 60);
  assert.notEqual(event, "hurt");
  assert.equal(p.hp, hpBefore);
});
