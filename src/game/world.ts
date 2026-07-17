import { GROUND_Y, WORLD_W } from "./constants";
import type { Crumb, Npc, Prop, Rect } from "./types";

/**
 * Town layout — add props / crates / wells here to grow the run.
 * Crates become real hop platforms (matching sprite tops).
 * Repeat house/lamp/barrel placements to lengthen a zone.
 */

const props: Prop[] = [];
const platforms: Rect[] = [{ x: 0, y: GROUND_Y, w: WORLD_W, h: 48 }];
const ladders: Rect[] = [];

function lamp(x: number) {
  props.push({ img: "street-lamp", x, y: GROUND_Y - 96 });
}
function barrel(x: number) {
  props.push({ img: "barrel", x, y: GROUND_Y - 30 });
}
/** Hanging shop sign — climbable, stand on the board */
function sign(x: number) {
  const y = GROUND_Y - 64;
  props.push({ img: "sign", x, y });
  ladders.push({ x: x + 11, y, w: 14, h: 64 });
  platforms.push({ x: x + 2, y: y + 10, w: 32, h: 8, hidden: true });
}
function well(x: number) {
  props.push({ img: "well", x, y: GROUND_Y - 48 });
}
function wagon(x: number) {
  props.push({ img: "wagon", x, y: GROUND_Y - 64 });
}
function houseA(x: number) {
  props.push({ img: "house-a", x, y: GROUND_Y - 175 });
}
function houseB(x: number) {
  props.push({ img: "house-b", x, y: GROUND_Y - 230 });
}
function houseC(x: number) {
  props.push({ img: "house-c", x, y: GROUND_Y - 175 });
}

/** Real crate art = jumpable ledge (collision only — no coded bar) */
function crate(x: number) {
  props.push({ img: "crate", x, y: GROUND_Y - 35 });
  platforms.push({ x: x + 2, y: GROUND_Y - 35, w: 34, h: 8, hidden: true });
}
function crateStack(x: number) {
  props.push({ img: "crate-stack", x, y: GROUND_Y - 68 });
  platforms.push({ x: x + 6, y: GROUND_Y - 68, w: 58, h: 8, hidden: true });
}
function tree(x: number, variant: 1 | 2 | 3 = 1) {
  const h = variant === 3 ? 171 : 117;
  props.push({ img: `tree-${variant}`, x, y: GROUND_Y - h });
}
function bush(x: number, large = false) {
  const img = large ? "bush-large" : "bush-small";
  const h = large ? 65 : 29;
  props.push({ img, x, y: GROUND_Y - h });
}
function stone(x: number, n: 1 | 2 | 3 | 4 = 1) {
  const heights = { 1: 39, 2: 40, 3: 33, 4: 38 };
  props.push({ img: `stone-${n}`, x, y: GROUND_Y - heights[n] });
}
function statue(x: number) {
  props.push({ img: "statue", x, y: GROUND_Y - 75 });
}

// ── TOWN SQUARE ──────────────────────────────────────────
crateStack(40);
lamp(120);
barrel(200);
barrel(228);
houseA(360);
well(620);
lamp(720);

// ── HOME → WORKSHOP ──────────────────────────────────────
crate(780);
houseB(860);
sign(1080);
crate(1140);
lamp(1180);

// ── LIBRARY LANE ─────────────────────────────────────────
houseC(1280);
lamp(1500);
barrel(1540);
crate(1600);

// ── GALLERY ROW ──────────────────────────────────────────
wagon(1680);
sign(1820);
lamp(1880);
houseA(1960);
crateStack(2140);

// ── SKETCH ALLEY ─────────────────────────────────────────
barrel(2280);
barrel(2310);
lamp(2400);
crate(2460);
sign(2580);
crateStack(2680);
lamp(2780);

// ── EAST MARKET (cemetery mix-in) ────────────────────────
houseC(2880);
bush(3050, true);
stone(3100, 1);
barrel(3120);
tree(3140, 1);
crate(3180);
lamp(3240);
wagon(3320);
statue(3400);
sign(3480);
bush(3520);
crateStack(3560);
tree(3620, 2);
houseA(3680);
stone(3860, 2);
lamp(3880);
well(3960);
bush(4020);
crate(4080);
barrel(4140);
tree(4180, 3);
houseB(4240);
stone(4460, 3);
lamp(4480);
statue(4520);
crateStack(4560);
bush(4640, true);
sign(4680);
tree(4740, 1);

// ── CHURCH / GRAVEYARD APPROACH ──────────────────────────
stone(4850, 4);
lamp(4900);
tree(4920, 2);
barrel(4980);
bush(5020);
statue(5040);
crate(5080);
stone(5140, 1);
sign(5200);
tree(5240, 3);
bush(5320, true);
lamp(5350);
stone(5420, 2);
// Exit gate pillars (drawn with bars in render)
lamp(5620);
stone(5800, 3);
bush(5900);

export const PROPS: Prop[] = props;
export const PLATFORMS: Rect[] = platforms;
export const LADDERS: Rect[] = ladders;

/** Wells restore HP on SPACE when nearby */
export const HEALS: Rect[] = [
  { x: 620, y: GROUND_Y - 50, w: 65, h: 50 },
  { x: 3960, y: GROUND_Y - 50, w: 65, h: 50 },
];

/** Soul gems + limited heart pickups (heal +1, once each). */
export type Pickup = {
  id: string;
  x: number;
  y: number;
  taken: boolean;
  kind: "soul" | "heart";
};

/** Open-road gem spots (not inside crates / barrels). */
export const SOUL_GEM_TOTAL = 12;
export const GEMS_TO_OPEN_GATE = SOUL_GEM_TOTAL;

export function createPickups(): Pickup[] {
  // Clear walkable X positions along the street
  const souls = [280, 540, 840, 1240, 1520, 1840, 2360, 2740, 3040, 3920, 4320, 4980].map(
    (x, i) => ({
      id: `gem-${i}`,
      x,
      y: GROUND_Y - 18,
      taken: false,
      kind: "soul" as const,
    }),
  );

  const hearts = [1320, 2500, 3700, 4500].map((x, i) => ({
    id: `heart-${i}`,
    x,
    y: GROUND_Y - 18,
    taken: false,
    kind: "heart" as const,
  }));

  return [...souls, ...hearts];
}

/** Hell-gato arena — hearts only spawn here while the boss lives. */
export const BOSS_ARENA = { minX: 5180, maxX: 5660 };

const BOSS_HEART_MAX_TOTAL = 8;
const BOSS_HEART_INTERVAL = 2.4;

let bossHeartsSpawned = 0;
let bossHeartTimer = 0;

/**
 * One heart at a time in the Hell-gato arena — only when HP is low (1–2).
 * No drops at full / healthy start of the fight.
 */
export function tickBossHeartSpawns(
  pickups: Pickup[],
  dt: number,
  bossAlive: boolean,
  playerX: number,
  playerHp: number,
): void {
  if (!bossAlive) {
    bossHeartTimer = 0;
    return;
  }

  // Only while you're in the fight zone and critically low
  if (playerX < BOSS_ARENA.minX - 80 || playerX > BOSS_ARENA.maxX + 40) return;
  if (playerHp > 2 || playerHp <= 0) {
    bossHeartTimer = 0;
    return;
  }

  const activeInArena = pickups.filter(
    (p) => p.kind === "heart" && !p.taken && p.x >= BOSS_ARENA.minX && p.x <= BOSS_ARENA.maxX,
  ).length;
  // One at a time — wait until collected before another can spawn
  if (activeInArena >= 1) {
    bossHeartTimer = 0;
    return;
  }

  bossHeartTimer += dt;
  if (bossHeartTimer < BOSS_HEART_INTERVAL) return;
  bossHeartTimer = 0;

  if (bossHeartsSpawned >= BOSS_HEART_MAX_TOTAL) return;
  if (Math.random() > 0.8) return;

  bossHeartsSpawned += 1;
  const x = BOSS_ARENA.minX + 40 + Math.random() * (BOSS_ARENA.maxX - BOSS_ARENA.minX - 80);
  pickups.push({
    id: `boss-heart-${bossHeartsSpawned}`,
    x,
    y: GROUND_Y - 2,
    taken: false,
    kind: "heart",
  });
}

export const CRUMBS: Crumb[] = [
  {
    id: "house-diary",
    key: "about",
    label: "House",
    x: 400,
    y: GROUND_Y - 40,
    w: 100,
    h: 40,
    hint: "SPACE — open the house diary",
  },
  {
    id: "npc-about",
    key: "about",
    label: "Townsfolk",
    x: 300,
    y: GROUND_Y - 40,
    w: 50,
    h: 40,
    hint: "SPACE — ask who lives here",
  },
  {
    id: "workshop",
    key: "work",
    label: "Workshop",
    x: 900,
    y: GROUND_Y - 40,
    w: 120,
    h: 40,
    hint: "SPACE — enter the workshop",
  },
  {
    id: "work-sign",
    key: "work",
    label: "Project sign",
    x: 1070,
    y: GROUND_Y - 40,
    w: 50,
    h: 40,
    hint: "SPACE — read the project board",
  },
  {
    id: "library",
    key: "blog",
    label: "Library house",
    x: 1300,
    y: GROUND_Y - 40,
    w: 110,
    h: 40,
    hint: "SPACE — browse the library",
  },
  {
    id: "bench-note",
    key: "blog",
    label: "Torn page",
    x: 1580,
    y: GROUND_Y - 30,
    w: 40,
    h: 30,
    hint: "SPACE — read a torn page",
  },
  {
    id: "gallery-wagon",
    key: "gallery",
    label: "Gallery wagon",
    x: 1680,
    y: GROUND_Y - 40,
    w: 100,
    h: 40,
    hint: "SPACE — view the gallery wall",
  },
  {
    id: "gallery-sign",
    key: "gallery",
    label: "Gallery sign",
    x: 1820,
    y: GROUND_Y - 40,
    w: 50,
    h: 40,
    hint: "SPACE — study a street sketch",
  },
  {
    id: "sketch-hut",
    key: "doodle",
    label: "Sketch crates",
    x: 2180,
    y: GROUND_Y - 40,
    w: 90,
    h: 40,
    hint: "SPACE — open the sketch pad",
  },
  {
    id: "paint-pot",
    key: "doodle",
    label: "Paint pot",
    x: 2580,
    y: GROUND_Y - 40,
    w: 60,
    h: 40,
    hint: "SPACE — dip into the paint pots",
  },
  {
    id: "church-gate",
    key: "contact",
    label: "Church gate",
    x: 5400,
    y: GROUND_Y - 50,
    w: 100,
    h: 50,
    hint: "SPACE — approach the church gate",
  },
  {
    id: "church-plaque",
    key: "contact",
    label: "Plaque",
    x: 5200,
    y: GROUND_Y - 40,
    w: 80,
    h: 40,
    hint: "SPACE — read the gate plaque",
  },
];

export const NPCS: Npc[] = [
  {
    name: "NEIGHBOR",
    sheetIdle: "bearded-idle",
    sheetWalk: "bearded-walk",
    idleFrames: 5,
    walkFrames: 6,
    fw: 40,
    fh: 47,
    x: 320,
    y: GROUND_Y,
    facing: 1,
    line: "That house is Goblin's. Walk up and press SPACE to open his diary.",
  },
  {
    name: "HAT GUY",
    sheetIdle: "hat-man-idle",
    sheetWalk: "hat-man-walk",
    idleFrames: 4,
    walkFrames: 6,
    fw: 39,
    fh: 52,
    x: 1000,
    y: GROUND_Y,
    facing: -1,
    line: "Workshop is next door — SPACE to go in. Hurt? Find a well and press SPACE to heal.",
  },
  {
    name: "OLD MAN",
    sheetIdle: "oldman-idle",
    sheetWalk: "oldman-walk",
    idleFrames: 8,
    walkFrames: 12,
    fw: 34,
    fh: 42,
    x: 1450,
    y: GROUND_Y,
    facing: 1,
    line: "Purple gems on the road — walk into them. Collect them all, then beat Hell-gato for the gate.",
  },
  {
    name: "WOMAN",
    sheetIdle: "woman-idle",
    sheetWalk: "woman-walk",
    idleFrames: 7,
    walkFrames: 6,
    fw: 37,
    fh: 46,
    x: 1900,
    y: GROUND_Y,
    facing: -1,
    line: "Up ahead you can draw a doodle. Further east it gets dangerous — watch for monsters.",
  },
  {
    name: "NEIGHBOR",
    sheetIdle: "bearded-idle",
    sheetWalk: "bearded-walk",
    idleFrames: 5,
    walkFrames: 6,
    fw: 40,
    fh: 47,
    x: 3400,
    y: GROUND_Y,
    facing: -1,
    line: "Monsters took the east road. Clear them if you want to reach the church gate.",
  },
  {
    name: "HAT GUY",
    sheetIdle: "hat-man-idle",
    sheetWalk: "hat-man-walk",
    idleFrames: 4,
    walkFrames: 6,
    fw: 39,
    fh: 52,
    x: 4600,
    y: GROUND_Y,
    facing: 1,
    line: "Church gate is that way. Open it with SPACE if you want Goblin's email or GitHub.",
  },
];

/** East exit — barred until Hell-gato falls. */
export const EAST_GATE = {
  /** Left edge of barred door (player blocked here when locked) */
  x: 5680,
  w: 52,
  h: 118,
  /** Column world X positions */
  colL: 5624,
  colR: 5728,
};

export function nearEastGate(px: number, py: number): boolean {
  return (
    px > EAST_GATE.x - 40 &&
    px < EAST_GATE.x + EAST_GATE.w + 40 &&
    py > GROUND_Y - 80 &&
    py < GROUND_Y + 10
  );
}

export function zoneLabel(cameraCenterX: number): string {
  if (cameraCenterX > 5750) return "ROAD'S END";
  if (cameraCenterX > 5000) return "CHURCH YARD";
  if (cameraCenterX > 4200) return "GRAVEYARD";
  if (cameraCenterX > 2800) return "EAST MARKET";
  if (cameraCenterX > 2100) return "SKETCH ALLEY";
  if (cameraCenterX > 1600) return "GALLERY ROW";
  if (cameraCenterX > 1200) return "LIBRARY LANE";
  if (cameraCenterX > 800) return "WORKSHOP";
  if (cameraCenterX > 300) return "HOME STREET";
  return "TOWN SQUARE";
}

export function nearHeal(px: number, py: number): Rect | null {
  for (const h of HEALS) {
    if (px > h.x - 8 && px < h.x + h.w + 8 && py > h.y - 20 && py < h.y + h.h) return h;
  }
  return null;
}
