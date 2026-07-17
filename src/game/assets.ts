import { ASSET_BASE } from "./constants";
import type { Assets } from "./types";

const TOWN_PROPS = [
  "house-a",
  "house-b",
  "house-c",
  "barrel",
  "crate",
  "crate-stack",
  "sign",
  "street-lamp",
  "wagon",
  "well",
] as const;

const CEM_PROPS = [
  "tree-1",
  "tree-2",
  "tree-3",
  "bush-large",
  "bush-small",
  "statue",
  "stone-1",
  "stone-2",
  "stone-3",
  "stone-4",
] as const;

const SHEET_NAMES = [
  "bearded-idle",
  "bearded-walk",
  "hat-man-idle",
  "hat-man-walk",
  "oldman-idle",
  "oldman-walk",
  "woman-idle",
  "woman-walk",
] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

export async function loadAssets(): Promise<Assets> {
  const base = ASSET_BASE;
  const cem = `${base}/cemetery`;

  const images = await Promise.all([
    loadImage(`${base}/town/background.png`),
    loadImage(`${base}/town/middleground.png`),
    loadImage(`${base}/church/backgrounds.png`),
    loadImage(`${cem}/graveyard.png`),
    loadImage(`${base}/church/column.png`),
    loadImage(`${base}/town/tileset.png`),
    ...TOWN_PROPS.map((n) => loadImage(`${base}/town/${n}.png`)),
    ...CEM_PROPS.map((n) => loadImage(`${cem}/props/${n}.png`)),
    ...SHEET_NAMES.map((n) => loadImage(`${base}/town/${n}.png`)),
    ...range(4).map((i) => loadImage(`${base}/player/goblin/idle${i}.png`)),
    ...range(8).map((i) => loadImage(`${base}/player/goblin/walk${i}.png`)),
    ...range(2).map((i) => loadImage(`${base}/player/goblin/jump${i}.png`)),
    ...range(2).map((i) => loadImage(`${base}/player/goblin/fall${i}.png`)),
    ...range(8).map((i) => loadImage(`${base}/player/goblin/attack${i}.png`)),
    ...range(4).map((i) => loadImage(`${base}/player/goblin/hurt${i}.png`)),
    ...range(8).map((i) => loadImage(`${base}/church/ghoul/burning-ghoul${i}.png`)),
    ...range(4).map((i) => loadImage(`${cem}/ghost/ghost-${i}.png`)),
    ...range(8).map((i) => loadImage(`${cem}/skeleton/skeleton-${i}.png`)),
    ...range(4).map((i) => loadImage(`${cem}/hell-gato/hell-gato-${i}.png`)),
    ...range(9).map((i) => loadImage(`${base}/church/fx/enemy-death${i}.png`)),
    ...range(5).map((i) => loadImage(`${cem}/fx/enemy-death-${i}.png`)),
    loadImage(`${base}/ui/pickup/gem-1.png`),
    loadImage(`${base}/ui/pickup/gem-2.png`),
  ]);

  const [bg, mg, churchBg, graveyardBg, column, tileset, ...rest] = images;

  const props: Record<string, HTMLImageElement> = {};
  let i = 0;
  for (const name of TOWN_PROPS) props[name] = rest[i++]!;
  for (const name of CEM_PROPS) props[name] = rest[i++]!;

  const sheets: Record<string, HTMLImageElement> = {};
  for (const name of SHEET_NAMES) sheets[name] = rest[i++]!;

  const player = {
    idle: rest.slice(i, i + 4) as HTMLImageElement[],
    walk: rest.slice(i + 4, i + 12) as HTMLImageElement[],
    jump: rest.slice(i + 12, i + 14) as HTMLImageElement[],
    fall: rest.slice(i + 14, i + 16) as HTMLImageElement[],
    attack: rest.slice(i + 16, i + 24) as HTMLImageElement[],
    hurt: rest.slice(i + 24, i + 28) as HTMLImageElement[],
  };
  i += 28;

  const ghoul = rest.slice(i, i + 8) as HTMLImageElement[];
  i += 8;
  const ghost = rest.slice(i, i + 4) as HTMLImageElement[];
  i += 4;
  const skeleton = rest.slice(i, i + 8) as HTMLImageElement[];
  i += 8;
  const hound = rest.slice(i, i + 4) as HTMLImageElement[];
  i += 4;
  const death = rest.slice(i, i + 9) as HTMLImageElement[];
  i += 9;
  const cemDeath = rest.slice(i, i + 5) as HTMLImageElement[];
  i += 5;
  const pickup = rest.slice(i, i + 2) as HTMLImageElement[];

  return {
    bg: bg!,
    mg: mg!,
    churchBg: churchBg!,
    graveyardBg: graveyardBg!,
    column: column!,
    tileset: tileset!,
    props,
    sheets,
    player,
    ghoul,
    ghost,
    skeleton,
    hound,
    death,
    cemDeath,
    pickup,
  };
}
