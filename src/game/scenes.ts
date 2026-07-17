import { GROUND_Y, WORLD_W } from "./constants";
import type { Crumb, Npc, Prop, Rect, SectionKey } from "./types";
import { CRUMBS, LADDERS, NPCS, PLATFORMS, PROPS } from "./world";

export type SceneId = "town" | SectionKey;

export type SceneVibe = "town" | "home" | "workshop" | "library" | "gallery" | "sketch" | "church";

export interface Scene {
  id: SceneId;
  label: string;
  vibe: SceneVibe;
  worldW: number;
  props: Prop[];
  platforms: Rect[];
  ladders: Rect[];
  npcs: Npc[];
  crumbs: Crumb[];
  spawnX: number;
  showEnemies: boolean;
  showColumns: boolean;
  churchMode: boolean;
  /** rgba tint washed over the view */
  tint: string;
  sky: string;
  tagline: string;
}

function ground(): Rect {
  return { x: 0, y: GROUND_Y, w: 1400, h: 48 };
}

function exitCrumb(key: SectionKey, x = 36): Crumb {
  return {
    id: `exit-${key}`,
    key,
    label: "Town gate",
    x,
    y: GROUND_Y - 48,
    w: 48,
    h: 48,
    hint: "SPACE — return to Goblin Town",
  };
}

function plat(x: number, y: number, w: number): Rect {
  return { x, y, w, h: 12 };
}

const TOWN: Scene = {
  id: "town",
  label: "GOBLIN TOWN",
  vibe: "town",
  worldW: WORLD_W,
  props: PROPS,
  platforms: PLATFORMS,
  ladders: LADDERS,
  npcs: NPCS,
  crumbs: CRUMBS,
  spawnX: 180,
  showEnemies: true,
  showColumns: true,
  churchMode: false,
  tint: "transparent",
  sky: "",
  tagline: "",
};

const SCENES: Record<SectionKey, Scene> = {
  about: {
    id: "about",
    label: "HOME STREET",
    vibe: "home",
    worldW: 960,
    sky: "#1a1220",
    tint: "rgba(80, 40, 30, 0.18)",
    tagline: "Vishal · goblin · from Nepal to Tokyo",
    spawnX: 160,
    showEnemies: false,
    showColumns: false,
    churchMode: false,
    platforms: [ground(), plat(280, 170, 72), plat(400, 140, 56), plat(720, 165, 80)],
    ladders: [
      { x: 298, y: 140, w: 18, h: GROUND_Y - 140 },
      { x: 738, y: 165, w: 18, h: GROUND_Y - 165 },
    ],
    props: [
      { img: "street-lamp", x: 70, y: GROUND_Y - 96 },
      { img: "house-a", x: 220, y: GROUND_Y - 175 },
      { img: "well", x: 480, y: GROUND_Y - 48 },
      { img: "barrel", x: 560, y: GROUND_Y - 28 },
      { img: "barrel", x: 588, y: GROUND_Y - 28 },
      { img: "crate", x: 640, y: GROUND_Y - 28 },
      { img: "house-c", x: 700, y: GROUND_Y - 175 },
      { img: "street-lamp", x: 880, y: GROUND_Y - 96 },
    ],
    npcs: [
      {
        name: "NEIGHBOR",
        sheetIdle: "bearded-idle",
        sheetWalk: "bearded-walk",
        idleFrames: 5,
        walkFrames: 6,
        fw: 40,
        fh: 47,
        x: 360,
        y: GROUND_Y,
        facing: -1,
        line: "This is Goblin's house. Press SPACE to read about him.",
      },
    ],
    crumbs: [exitCrumb("about")],
  },

  work: {
    id: "work",
    label: "WORKSHOP",
    vibe: "workshop",
    worldW: 1100,
    sky: "#141018",
    tint: "rgba(40, 55, 90, 0.22)",
    tagline: "Projects I've built",
    spawnX: 140,
    showEnemies: false,
    showColumns: false,
    churchMode: false,
    platforms: [ground(), plat(320, 165, 96), plat(520, 135, 64), plat(780, 155, 88)],
    ladders: [
      { x: 340, y: 165, w: 18, h: GROUND_Y - 165 },
      { x: 538, y: 135, w: 18, h: GROUND_Y - 135 },
    ],
    props: [
      { img: "crate-stack", x: 60, y: GROUND_Y - 70 },
      { img: "sign", x: 180, y: GROUND_Y - 64 },
      { img: "house-b", x: 280, y: GROUND_Y - 230 },
      { img: "barrel", x: 520, y: GROUND_Y - 28 },
      { img: "crate", x: 560, y: GROUND_Y - 28 },
      { img: "crate-stack", x: 620, y: GROUND_Y - 70 },
      { img: "street-lamp", x: 720, y: GROUND_Y - 96 },
      { img: "sign", x: 820, y: GROUND_Y - 64 },
      { img: "wagon", x: 900, y: GROUND_Y - 64 },
      { img: "street-lamp", x: 1040, y: GROUND_Y - 96 },
    ],
    npcs: [
      {
        name: "HAT GUY",
        sheetIdle: "hat-man-idle",
        sheetWalk: "hat-man-walk",
        idleFrames: 4,
        walkFrames: 6,
        fw: 39,
        fh: 52,
        x: 480,
        y: GROUND_Y,
        facing: 1,
        line: "These are Goblin's projects. Have a look around.",
      },
    ],
    crumbs: [exitCrumb("work")],
  },

  blog: {
    id: "blog",
    label: "LIBRARY LANE",
    vibe: "library",
    worldW: 1000,
    sky: "#120e18",
    tint: "rgba(55, 35, 70, 0.28)",
    tagline: "Notes and posts",
    spawnX: 150,
    showEnemies: false,
    showColumns: false,
    churchMode: false,
    platforms: [ground(), plat(260, 160, 80), plat(420, 130, 72), plat(700, 150, 96)],
    ladders: [
      { x: 278, y: 160, w: 18, h: GROUND_Y - 160 },
      { x: 718, y: 150, w: 18, h: GROUND_Y - 150 },
    ],
    props: [
      { img: "street-lamp", x: 80, y: GROUND_Y - 96 },
      { img: "house-c", x: 200, y: GROUND_Y - 175 },
      { img: "sign", x: 400, y: GROUND_Y - 64 },
      { img: "crate", x: 480, y: GROUND_Y - 28 },
      { img: "house-a", x: 560, y: GROUND_Y - 175 },
      { img: "barrel", x: 780, y: GROUND_Y - 28 },
      { img: "street-lamp", x: 860, y: GROUND_Y - 96 },
      { img: "well", x: 920, y: GROUND_Y - 48 },
    ],
    npcs: [
      {
        name: "OLD MAN",
        sheetIdle: "oldman-idle",
        sheetWalk: "oldman-walk",
        idleFrames: 8,
        walkFrames: 12,
        fw: 34,
        fh: 42,
        x: 520,
        y: GROUND_Y,
        facing: -1,
        line: "Blog posts show up here when Goblin writes them.",
      },
    ],
    crumbs: [exitCrumb("blog")],
  },

  gallery: {
    id: "gallery",
    label: "GALLERY ROW",
    vibe: "gallery",
    worldW: 1040,
    sky: "#18101a",
    tint: "rgba(90, 30, 50, 0.2)",
    tagline: "Visitor doodles",
    spawnX: 140,
    showEnemies: false,
    showColumns: false,
    churchMode: false,
    platforms: [ground(), plat(300, 155, 88), plat(540, 125, 64), plat(800, 160, 72)],
    ladders: [{ x: 318, y: 155, w: 18, h: GROUND_Y - 155 }],
    props: [
      { img: "street-lamp", x: 60, y: GROUND_Y - 96 },
      { img: "wagon", x: 220, y: GROUND_Y - 64 },
      { img: "barrel", x: 400, y: GROUND_Y - 28 },
      { img: "crate", x: 440, y: GROUND_Y - 28 },
      { img: "sign", x: 520, y: GROUND_Y - 64 },
      { img: "wagon", x: 640, y: GROUND_Y - 64 },
      { img: "crate-stack", x: 820, y: GROUND_Y - 70 },
      { img: "street-lamp", x: 940, y: GROUND_Y - 96 },
    ],
    npcs: [
      {
        name: "WOMAN",
        sheetIdle: "woman-idle",
        sheetWalk: "woman-walk",
        idleFrames: 7,
        walkFrames: 6,
        fw: 37,
        fh: 46,
        x: 500,
        y: GROUND_Y,
        facing: 1,
        line: "People leave drawings here. Yours can too.",
      },
    ],
    crumbs: [exitCrumb("gallery")],
  },

  doodle: {
    id: "doodle",
    label: "SKETCH ALLEY",
    vibe: "sketch",
    worldW: 1080,
    sky: "#2a1a14",
    tint: "rgba(255, 200, 120, 0.12)",
    tagline: "Draw something",
    spawnX: 150,
    showEnemies: false,
    showColumns: false,
    churchMode: false,
    platforms: [
      ground(),
      plat(280, 168, 64),
      plat(480, 140, 80),
      plat(720, 155, 96),
      plat(900, 120, 56),
    ],
    ladders: [
      { x: 498, y: 140, w: 18, h: GROUND_Y - 140 },
      { x: 918, y: 120, w: 18, h: GROUND_Y - 120 },
    ],
    props: [
      { img: "crate-stack", x: 50, y: GROUND_Y - 70 },
      { img: "barrel", x: 160, y: GROUND_Y - 28 },
      { img: "sign", x: 220, y: GROUND_Y - 64 },
      { img: "crate", x: 320, y: GROUND_Y - 28 },
      { img: "crate", x: 360, y: GROUND_Y - 28 },
      { img: "street-lamp", x: 440, y: GROUND_Y - 96 },
      { img: "wagon", x: 560, y: GROUND_Y - 64 },
      { img: "barrel", x: 740, y: GROUND_Y - 28 },
      { img: "crate-stack", x: 800, y: GROUND_Y - 70 },
      { img: "street-lamp", x: 980, y: GROUND_Y - 96 },
    ],
    npcs: [
      {
        name: "WOMAN",
        sheetIdle: "woman-idle",
        sheetWalk: "woman-walk",
        idleFrames: 7,
        walkFrames: 6,
        fw: 37,
        fh: 46,
        x: 420,
        y: GROUND_Y,
        facing: -1,
        line: "Pick a color, draw, then press SAVE.",
      },
    ],
    crumbs: [exitCrumb("doodle")],
  },

  contact: {
    id: "contact",
    label: "CHURCH YARD",
    vibe: "church",
    worldW: 1000,
    sky: "#0c0812",
    tint: "rgba(30, 20, 50, 0.35)",
    tagline: "Say hello",
    spawnX: 160,
    showEnemies: false,
    showColumns: true,
    churchMode: true,
    platforms: [ground(), plat(360, 160, 72), plat(560, 130, 64), plat(760, 150, 80)],
    ladders: [{ x: 378, y: 160, w: 18, h: GROUND_Y - 160 }],
    props: [
      { img: "street-lamp", x: 80, y: GROUND_Y - 96 },
      { img: "sign", x: 200, y: GROUND_Y - 64 },
      { img: "barrel", x: 300, y: GROUND_Y - 28 },
      { img: "crate", x: 480, y: GROUND_Y - 28 },
      { img: "street-lamp", x: 640, y: GROUND_Y - 96 },
      { img: "sign", x: 820, y: GROUND_Y - 64 },
      { img: "well", x: 900, y: GROUND_Y - 48 },
    ],
    npcs: [
      {
        name: "NEIGHBOR",
        sheetIdle: "bearded-idle",
        sheetWalk: "bearded-walk",
        idleFrames: 5,
        walkFrames: 6,
        fw: 40,
        fh: 47,
        x: 520,
        y: GROUND_Y,
        facing: 1,
        line: "Want to contact Goblin? Open the gate with SPACE.",
      },
    ],
    crumbs: [exitCrumb("contact")],
  },
};

let active: Scene = TOWN;

export function getActiveScene(): Scene {
  return active;
}

export function isInTown(): boolean {
  return active.id === "town";
}

export function enterTownScene(): Scene {
  active = TOWN;
  return active;
}

export function enterSectionScene(key: SectionKey): Scene {
  active = SCENES[key];
  return active;
}

export function getScenePlatforms(): Rect[] {
  return active.platforms;
}

export function getSceneLadders(): Rect[] {
  return active.ladders;
}

export function getSceneWorldW(): number {
  return active.worldW;
}
