import test from "node:test";
import assert from "node:assert/strict";

import {
  newRun,
  waveComposition,
  waveSpeed,
  spawnInterval,
  tickWaves,
  nextSpawn,
} from "../src/game/arcade.ts";

test("newRun starts a clean wave-1 run with an opening grace", () => {
  const run = newRun();
  assert.equal(run.active, true);
  assert.equal(run.wave, 1);
  assert.equal(run.score, 0);
  assert.equal(run.hp, 5);
  assert.equal(run.graceT, 2.5);
});

test("wave 1 is light: 3 enemies, no ghosts or hounds", () => {
  const comp = waveComposition(1);
  const total = comp.reduce((sum, c) => sum + c.count, 0);
  assert.equal(total, 3);
  assert.ok(!comp.some((c) => c.kind === "ghost"));
  assert.ok(!comp.some((c) => c.kind === "hound"));
});

test("ghosts join from wave 2, hounds from wave 4", () => {
  assert.ok(!waveComposition(1).some((c) => c.kind === "ghost"));
  assert.ok(waveComposition(2).some((c) => c.kind === "ghost"));
  assert.ok(!waveComposition(3).some((c) => c.kind === "hound"));
  assert.ok(waveComposition(4).some((c) => c.kind === "hound"));
});

test("waves escalate: count grows, speed grows, spawns tighten to a floor", () => {
  const count = (w) => waveComposition(w).reduce((s, c) => s + c.count, 0);
  assert.ok(count(5) > count(1), "later waves have more enemies");
  assert.ok(waveSpeed(5) > waveSpeed(1), "later waves are faster");
  assert.ok(spawnInterval(5) < spawnInterval(1), "later waves spawn tighter");
  assert.equal(spawnInterval(100), 0.35, "spawn interval clamps at the floor");
});

test("wave advances only after a cleared field stays clear for the respite", () => {
  const run = newRun();
  // enemies alive → nothing happens
  for (let i = 0; i < 200; i++) tickWaves(run, 2, true, 0.1);
  assert.equal(run.wave, 1);
  // bag not empty → nothing happens
  for (let i = 0; i < 200; i++) tickWaves(run, 0, false, 0.1);
  assert.equal(run.wave, 1);
  // field clear + bag empty → advances after the 2.2s respite
  for (let i = 0; i < 22; i++) tickWaves(run, 0, true, 0.1);
  assert.equal(run.wave, 2, "wave increments after ~2.2s of clear field");
  // touching an enemy resets the respite timer
  for (let i = 0; i < 5; i++) tickWaves(run, 0, true, 0.1);
  tickWaves(run, 1, true, 0.1);
  for (let i = 0; i < 10; i++) tickWaves(run, 0, true, 0.1);
  assert.equal(run.wave, 2, "respite restarts after enemy contact");
  for (let i = 0; i < 22; i++) tickWaves(run, 0, true, 0.1);
  assert.equal(run.wave, 3);
});

test("nextSpawn drains the bag in order and reports empty", () => {
  const run = newRun();
  const bag = ["ghoul", "skeleton"];
  assert.equal(nextSpawn(run, bag), "ghoul");
  assert.equal(nextSpawn(run, bag), "skeleton");
  assert.equal(nextSpawn(run, bag), null);
});
