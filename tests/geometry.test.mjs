import test from "node:test";
import assert from "node:assert/strict";

import { makePlayer } from "../src/game/combat.ts";
import { GROUND_Y } from "../src/game/constants.ts";
import { movePlayer } from "../src/game/physics.ts";
import { LADDERS, ledgeAt, PLATFORMS } from "../src/game/world.ts";

const DT = 1 / 60;
const PW = 28; // player width (makePlayer)

/** Run N frames of real physics with the given held keys; returns the player. */
function simulate(x, keys = new Set(), frames = 90, y = GROUND_Y - 50) {
  const p = makePlayer();
  p.x = x;
  p.y = y;
  p.onGround = true; // boot-restore settle flag
  for (let i = 0; i < frames; i++) movePlayer(p, keys, DT);
  return p;
}

function hasPlatform(x, y, w) {
  return PLATFORMS.some((pl) => pl.x === x && pl.y === y && pl.w === w);
}

// Sprite art bounds measured from public/img/gothicvania/town/*.png via
// canvas getImageData (opaque alpha > 24), relative to each prop's draw origin.
//   crate.png        39×35, top row spans x 0..33
//   crate-stack.png  73×68, top rows span x 17..55, bottom rows full width
//   sign.png         37×45, board top edge = row 10 (chain occupies rows 0..9)
//   wagon.png        93×75, cover hem / body shoulder = row 29 (full width 0..92)

test("colliders match measured art — no platform floats above visible pixels", () => {
  const crates = PLATFORMS.filter((p) => p.y === GROUND_Y - 35 && p.w === 34);
  assert.ok(crates.length >= 7, "every crate has a top ledge");
  for (const c of crates) assert.ok(c.x % 10 === 2, "crate ledge inset matches art");

  // crate-stack: solid base (row 29+, full width) + standable top box (x 17..55)
  assert.ok(hasPlatform(2141, GROUND_Y - 35, 70), "stack base blocks walking");
  assert.ok(hasPlatform(2157, GROUND_Y - 68, 38), "stack top box is standable");

  // sign: board top edge (row 10) == prop y + 10
  assert.ok(hasPlatform(1082, GROUND_Y - 54, 32), "sign ledge on the board top");

  // wagon: hem/shoulder row 29 == prop y + 29 = GROUND_Y - 35, width inside 0..92
  for (const wx of [1680, 3320]) {
    assert.ok(hasPlatform(wx + 2, GROUND_Y - 35, 88), `wagon ${wx} standable shoulder`);
  }

  // the old phantom rects are gone
  assert.ok(!PLATFORMS.some((p) => p.x === 3316), "old canopy-height wagon rect removed");
  assert.ok(
    !PLATFORMS.some((p) => p.w === 70 && p.y === GROUND_Y - 68),
    "old over-wide stack top removed",
  );
  assert.equal(LADDERS.length, 0, "no invisible ladders");
});

test("standing still settles onto visible surfaces only", () => {
  const ground = simulate(754);
  assert.equal(ground.y, GROUND_Y - 44, "ground level");
  assert.equal(ground.onGround, true);

  // falling onto the stack from above lands on the top box
  const stackTop = simulate(2160, new Set(), 90, 100);
  assert.equal(stackTop.y, GROUND_Y - 68 - 44, "on top crate");
  assert.equal(stackTop.onGround, true);

  // spawning inside the stack's lower volume rests on the bottom crate top
  const stackBase = simulate(2160);
  assert.equal(stackBase.y, GROUND_Y - 35 - 44, "on bottom crate");
  assert.equal(stackBase.onGround, true);

  const wagon = simulate(3350);
  assert.equal(wagon.y, GROUND_Y - 35 - 44, "on wagon shoulder, not canopy");
  assert.equal(wagon.onGround, true);
});

test("boot restore places the player on the exact ledge they saved on", () => {
  const topLedge = ledgeAt(2160 + PW / 2);
  assert.ok(topLedge, "stack top ledge found");
  assert.equal(topLedge.y, GROUND_Y - 68);
  assert.equal(topLedge.x, 2157);

  const wagonLedge = ledgeAt(3350 + PW / 2);
  assert.ok(wagonLedge, "wagon shoulder found");
  assert.equal(wagonLedge.y, GROUND_Y - 35);

  assert.equal(ledgeAt(754 + PW / 2), null, "open street has no ledge");
});

test("walking right is blocked by solid art (stack + wagon act as walls)", () => {
  const toStack = simulate(2050, new Set(["d"]), 180);
  assert.ok(toStack.x > 2100, "approaches the stack");
  assert.ok(toStack.x <= 2141 - PW, "stops at the stack's base face");

  const toWagon = simulate(3250, new Set(["d"]), 180);
  assert.ok(toWagon.x > 3280, "approaches the wagon");
  assert.ok(toWagon.x <= 3322 - PW, "stops at the wagon body");
});
