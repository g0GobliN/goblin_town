import assert from "node:assert/strict";
import test from "node:test";

import { npcArtFlip } from "../src/game/scenes.ts";
import { NPCS } from "../src/game/world.ts";

/**
 * NPC art is not authored facing a single direction: the bearded neighbour,
 * hat guy and woman are drawn facing left, the old man faces right. Mirroring
 * on `facing` alone turned the old man inside out, so every NPC definition is
 * checked here to make sure it ends up facing the way its `facing` asks for.
 */

/** Art direction per character, mirroring NPC_ART_FACES_LEFT in scenes.ts. */
const FACES_LEFT = {
  bearded: true,
  "hat-man": true,
  oldman: false,
  woman: true,
};

/**
 * Which way a sprite ends up looking, given its art direction and whether it
 * was mirrored. Left-facing art mirrored points right, and vice versa, so the
 * two agreeing means it now looks right.
 */
function appearsFacing(facesLeft, flip) {
  return facesLeft === flip ? "RIGHT" : "LEFT";
}

test("npcArtFlip mirrors left-facing art to face right", () => {
  for (const who of ["bearded", "hat-man", "woman"]) {
    assert.equal(
      npcArtFlip(`${who}-idle`, 1),
      true,
      `${who} art faces left, so facing right must mirror it`,
    );
    assert.equal(
      npcArtFlip(`${who}-idle`, -1),
      false,
      `${who} art faces left, so facing left must not mirror it`,
    );
  }
});

test("npcArtFlip leaves right-facing art alone when facing right", () => {
  assert.equal(npcArtFlip("oldman-idle", 1), false);
  assert.equal(npcArtFlip("oldman-idle", -1), true);
});

test("one art-direction entry covers a character's idle and walk sheets", () => {
  // Both sheets of a character are drawn the same way, so the flip must match
  // regardless of which sheet is being drawn.
  for (const who of Object.keys(FACES_LEFT)) {
    for (const facing of [1, -1]) {
      assert.equal(
        npcArtFlip(`${who}-walk`, facing),
        npcArtFlip(`${who}-idle`, facing),
        `${who} idle and walk art must be treated the same`,
      );
    }
  }
});

test("every NPC faces the direction its facing asks for", () => {
  for (const npc of NPCS) {
    const who = npc.sheetIdle.replace(/-idle$/, "");
    const facesLeft = FACES_LEFT[who];
    assert.equal(typeof facesLeft, "boolean", `no expected art direction recorded for "${who}"`);
    const flip = npcArtFlip(npc.sheetIdle, npc.facing);
    const want = npc.facing === 1 ? "RIGHT" : "LEFT";
    assert.equal(appearsFacing(facesLeft, flip), want, `${npc.name} (${who}) should look ${want}`);
  }
});

test("unknown NPC sheets default to unflipped right-facing art", () => {
  // A newly added character must still render, unflipped, until it is
  // measured — rather than silently mirroring.
  assert.equal(npcArtFlip("brand-new-sheet", 1), false);
  assert.equal(npcArtFlip("brand-new-sheet", -1), true);
});
