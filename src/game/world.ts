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

/** Real crate art = jumpable ledge */
function crate(x: number) {
  props.push({ img: "crate", x, y: GROUND_Y - 35 });
  platforms.push({ x: x + 2, y: GROUND_Y - 35, w: 34, h: 8 });
}
function crateStack(x: number) {
  props.push({ img: "crate-stack", x, y: GROUND_Y - 68 });
  platforms.push({ x: x + 6, y: GROUND_Y - 68, w: 58, h: 8 });
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

export const PROPS: Prop[] = props;
export const PLATFORMS: Rect[] = platforms;
export const LADDERS: Rect[] = ladders;

/** Wells restore HP on SPACE when nearby */
export const HEALS: Rect[] = [
  { x: 620, y: GROUND_Y - 50, w: 65, h: 50 },
  { x: 3960, y: GROUND_Y - 50, w: 65, h: 50 },
];

/** Soul shards — walk over to collect (drawn in-engine, gothic gold) */
export type Pickup = { id: string; x: number; y: number; taken: boolean };

export function createPickups(): Pickup[] {
  const xs = [
    250, 500, 900, 1100, 1400, 1750, 2000, 2300, 2600, 2900, 3200, 3500, 3800, 4100, 4400,
    4700, 5000, 5300,
  ];
  return xs.map((x, i) => ({
    id: `gem-${i}`,
    x,
    y: GROUND_Y - 4,
    taken: false,
  }));
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
    sheetIdle: "bearded-idle",
    sheetWalk: "bearded-walk",
    idleFrames: 5,
    walkFrames: 6,
    fw: 40,
    fh: 47,
    x: 320,
    y: GROUND_Y,
    facing: 1,
    line: "Goblin keeps a diary in that house. Ghouls crept in from the church — clear the east road if you can.",
  },
  {
    sheetIdle: "hat-man-idle",
    sheetWalk: "hat-man-walk",
    idleFrames: 4,
    walkFrames: 6,
    fw: 39,
    fh: 52,
    x: 1000,
    y: GROUND_Y,
    facing: -1,
    line: "Workshop's open. Jump the crates, kick the ghouls. Wells heal you — drink with SPACE.",
  },
  {
    sheetIdle: "oldman-idle",
    sheetWalk: "oldman-walk",
    idleFrames: 8,
    walkFrames: 12,
    fw: 34,
    fh: 42,
    x: 1450,
    y: GROUND_Y,
    facing: 1,
    line: "Floating soul gems along the street? Grab them — mana for the long walk east.",
  },
  {
    sheetIdle: "woman-idle",
    sheetWalk: "woman-walk",
    idleFrames: 7,
    walkFrames: 6,
    fw: 37,
    fh: 46,
    x: 1900,
    y: GROUND_Y,
    facing: -1,
    line: "Sketch Alley's ahead — leave a doodle if you like. Market past that gets rough.",
  },
  {
    sheetIdle: "bearded-idle",
    sheetWalk: "bearded-walk",
    idleFrames: 5,
    walkFrames: 6,
    fw: 40,
    fh: 47,
    x: 3400,
    y: GROUND_Y,
    facing: -1,
    line: "East market's haunted. Clear the path and the church gate feels a little friendlier.",
  },
  {
    sheetIdle: "hat-man-idle",
    sheetWalk: "hat-man-walk",
    idleFrames: 4,
    walkFrames: 6,
    fw: 39,
    fh: 52,
    x: 4600,
    y: GROUND_Y,
    facing: 1,
    line: "Almost at the gate. If you want Goblin — email, GitHub, the plaque — he's listening.",
  },
];

export function zoneLabel(cameraCenterX: number): string {
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
