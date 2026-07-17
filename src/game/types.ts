export type SectionKey = "about" | "work" | "blog" | "gallery" | "doodle" | "contact";

export type AnimName = "idle" | "walk" | "jump" | "fall" | "attack" | "hurt";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Collision only — do not draw coded bar */
  hidden?: boolean;
}

export interface Prop {
  img: string;
  x: number;
  y: number;
  flip?: boolean;
}

export interface Crumb {
  id: string;
  key: SectionKey;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hint: string;
}

export interface Npc {
  sheetIdle: string;
  sheetWalk: string;
  idleFrames: number;
  walkFrames: number;
  fw: number;
  fh: number;
  x: number;
  y: number;
  facing: 1 | -1;
  line: string;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  onGround: boolean;
  climbing: boolean;
  anim: AnimName;
  frame: number;
  frameT: number;
  hp: number;
  maxHp: number;
  attackT: number;
  hurtT: number;
  invulnT: number;
  attackHit: boolean;
}

export type EnemyKind = "ghoul" | "ghost" | "skeleton" | "hound";

export interface EnemyState {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  frame: number;
  frameT: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  hurtT: number;
  minX: number;
  maxX: number;
  speed: number;
  dying: boolean;
  deathFrame: number;
  deathT: number;
}

export interface Assets {
  bg: HTMLImageElement;
  mg: HTMLImageElement;
  churchBg: HTMLImageElement;
  graveyardBg: HTMLImageElement;
  column: HTMLImageElement;
  tileset: HTMLImageElement;
  props: Record<string, HTMLImageElement>;
  sheets: Record<string, HTMLImageElement>;
  player: Record<AnimName, HTMLImageElement[]>;
  ghoul: HTMLImageElement[];
  ghost: HTMLImageElement[];
  skeleton: HTMLImageElement[];
  hound: HTMLImageElement[];
  death: HTMLImageElement[];
  cemDeath: HTMLImageElement[];
  pickup: HTMLImageElement[];
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  assets: Assets;
  cameraX: number;
  player: PlayerState;
  enemies: EnemyState[];
  found: Set<string>;
  inTown: boolean;
  pickups: { id: string; x: number; y: number; taken: boolean }[];
}
