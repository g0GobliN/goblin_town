import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("package scripts include lint, test, and build", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(typeof pkg.scripts.lint, "string");
  assert.equal(typeof pkg.scripts.test, "string");
  assert.equal(typeof pkg.scripts.build, "string");
});

test("core game and page entrypoints exist", () => {
  assert.ok(existsSync("src/game/room.ts"));
  assert.ok(existsSync("src/game/physics.ts"));
  assert.ok(existsSync("src/pages/index.astro"));
  assert.ok(existsSync("src/pages/info.astro"));
});

test("astro config is present", () => {
  assert.ok(existsSync("astro.config.mjs"));
  assert.ok(existsSync("tsconfig.json"));
});
