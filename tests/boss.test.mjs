import assert from "node:assert/strict";
import test from "node:test";
import { tickBoss } from "../src/game/boss.ts";
import { createEnemies, makePlayer } from "../src/game/combat.ts";
import { GROUND_Y } from "../src/game/constants.ts";
import { BOSS_ARENA } from "../src/game/world.ts";

function bossAndPlayer(playerX) {
  const boss = createEnemies().find((enemy) => enemy.kind === "hound");
  const player = makePlayer();
  player.x = playerX;
  player.y = GROUND_Y - player.h;
  return { boss, player };
}

test("Hell-gato keeps closing in when the player is within 70px", () => {
  const { boss, player } = bossAndPlayer(5445);
  boss.x = 5400;
  const startX = boss.x;

  for (let i = 0; i < 30; i++) tickBoss(boss, player, 1 / 60);

  assert.ok(boss.x > startX, "boss pursues instead of staying idle at close range");
});

test("Hell-gato can pursue across its arena and stays inside the arena bounds", () => {
  const { boss, player } = bossAndPlayer(5550);
  boss.x = 5250;
  boss.minX = 5230;
  boss.maxX = 5470;

  for (let i = 0; i < 180; i++) {
    tickBoss(boss, player, 1 / 60);
    assert.ok(boss.x >= BOSS_ARENA.minX);
    assert.ok(boss.x + boss.w <= BOSS_ARENA.maxX);
  }
  assert.ok(boss.x > 5250, "boss is not constrained to its spawn patrol range");
});
