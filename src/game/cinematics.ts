export type CineKind = "intro" | "credits";

export interface CineSlide {
  kicker?: string;
  title: string;
  body: string[];
}

export interface CreditBlock {
  role?: string;
  name: string;
  lines?: string[];
  gap?: "sm" | "md" | "lg";
}

/** Short open — after boot shutters, before play. */
export const INTRO_SLIDES: CineSlide[] = [
  {
    kicker: "WELCOME",
    title: "GOBLIN TOWN",
    body: ["This little town is my portfolio.", "Walk around, open doors, stay a while."],
  },
  {
    kicker: "THE BUILDER",
    title: "VISHAL · GOBLIN",
    body: ["Grew up in Nepal, living in Tokyo.", "IT engineer who builds things for fun."],
  },
  {
    kicker: "HOW TO WALK",
    title: "CONTROLS",
    body: ["Walk A/D · run SHIFT · jump W", "Attack J/X · talk & heal SPACE · menu M"],
  },
  {
    kicker: "READY",
    title: "ENTER THE TOWN",
    body: ["Collect every purple gem on the road.", "Beat Hell-gato to open the church gate."],
  },
];

/** Same slide, phone edition — stick + JUMP/HIT/ACT buttons. */
const TOUCH_CONTROLS_BODY = [
  "Stick to walk — push far to run",
  "JUMP to jump · HIT to attack · ACT to talk",
];

/** Closing movie roll — scrolls upward. */
export const CREDIT_BLOCKS: CreditBlock[] = [
  { name: "GOBLIN TOWN", lines: ["A playable portfolio"], gap: "lg" },
  {
    role: "THE END?",
    name: "CHURCH GATE CLEAR",
    lines: ["The road is quiet.", "The gate stays open."],
    gap: "lg",
  },

  {
    role: "BUILT BY",
    name: "VISHAL GURUNG",
    lines: ["Online · goblin · g0GobliN", "東京 · 2026"],
    gap: "md",
  },

  {
    role: "STARRING",
    name: "THE GREEN TRAVELER",
    lines: ["One goblin. Many side quests."],
    gap: "sm",
  },
  { role: "TOWNSFOLK", name: "BEARDED GUIDE", lines: ["Points you toward the diary."] },
  { role: "TOWNSFOLK", name: "HAT MAN", lines: ["Keeps the workshop rumors warm."] },
  { role: "TOWNSFOLK", name: "OLD MAN", lines: ["Knows every lamp on the street."] },
  {
    role: "TOWNSFOLK",
    name: "WOMAN OF THE SQUARE",
    lines: ["Watches the gems float by."],
    gap: "md",
  },

  { role: "FOES OF THE EAST ROAD", name: "BURNING GHOULS", lines: ["Church ash and bad manners."] },
  { role: "FOES", name: "SKELETON PATROL", lines: ["Bones with a schedule."] },
  { role: "FOES", name: "CEMETERY GHOSTS", lines: ["Soft float. Hard poke."] },
  {
    role: "FINAL GUARDIAN",
    name: "HELL-GATO",
    lines: ["Last stand at the church gate."],
    gap: "lg",
  },

  {
    role: "PIXEL ART",
    name: "GOTHICVANIA TOWN",
    lines: ["Luis Zuno · ansimuz", "Town streets, houses, lamps"],
  },
  {
    role: "PIXEL ART",
    name: "GOTHICVANIA CHURCH",
    lines: ["Luis Zuno · ansimuz", "Gate, tiles, night sky"],
  },
  {
    role: "PIXEL ART",
    name: "GOTHICVANIA CEMETERY",
    lines: ["Luis Zuno · ansimuz", "Ghosts, skeletons, props"],
  },
  {
    role: "PIXEL ART",
    name: "THE GOBLIN",
    lines: ["Monsters Creatures Fantasy", "LuizMelo · CC0"],
    gap: "md",
  },

  {
    role: "MUSIC",
    name: "TOWN LOOP",
    lines: ["Pascal Belisle · thetoadz", "patreon.com/thetoadz"],
  },
  {
    role: "MUSIC",
    name: "CREDITS THEME",
    lines: ["forgotten path · johndekale", "OpenGameArt · CC0"],
  },
  {
    role: "SOUND",
    name: "UI & COMBAT SFX",
    lines: ["Kenney.nl · UI, RPG + Digital Audio", "CC0"],
    gap: "md",
  },

  { role: "PICKUPS & UI", name: "SOUL GEMS", lines: ["OpenGameArt pack"] },
  { role: "UI", name: "PRESS-KEY ART", lines: ["Gothicvania UI pack"], gap: "md" },

  { role: "ENGINE", name: "ASTRO + TYPESCRIPT", lines: ["Canvas town. No framework in the loop."] },
  { role: "DATA", name: "FIREBASE", lines: ["Workshop, library, visitor wall"] },
  {
    role: "SIDE QUEST",
    name: "REALITYMAP",
    lines: ["npmjs.com/package/reality-map", "A map I wished existed."],
    gap: "lg",
  },

  {
    role: "THANKS",
    name: "YOU",
    lines: ["For clearing the road.", "For opening the doors.", "For leaving a doodle — or not."],
  },
  { role: "THANKS", name: "OPEN GAME ART", lines: ["Free pixels keep nights lit."] },
  { role: "THANKS", name: "TOKYO NIGHTS", lines: ["Nepal → here. Still building."], gap: "lg" },

  {
    role: "FAREWELL",
    name: "SEE YOU AT THE GATE",
    lines: ["Hire · collab · or just say hi.", "The street stays open."],
    gap: "lg",
  },
  { name: "— GOBLIN TOWN —", lines: ["fin"], gap: "lg" },
];

export function slidesFor(kind: CineKind, touch = false): CineSlide[] {
  if (kind !== "intro") return [];
  if (!touch) return INTRO_SLIDES;
  return INTRO_SLIDES.map((slide) =>
    slide.title === "CONTROLS" ? { ...slide, body: TOUCH_CONTROLS_BODY } : slide,
  );
}

/** Pre-fight banter when you first face Hell-gato. */
export type BossLine = {
  speaker: "boss" | "player";
  name: string;
  line: string;
};

export const BOSS_INTRO: BossLine[] = [
  {
    speaker: "boss",
    name: "HELL-GATO",
    line: "Another green spark at my gate… Do you even know what waits beyond?",
  },
  {
    speaker: "player",
    name: "GOBLIN",
    line: "I walked the whole street for this. Move — or get moved.",
  },
  {
    speaker: "boss",
    name: "HELL-GATO",
    line: "Bold words. I am Hell-gato — last fang of this yard. Cross me and burn.",
  },
  {
    speaker: "player",
    name: "GOBLIN",
    line: "Then let's settle it. Tokyo nights taught me worse than you.",
  },
  {
    speaker: "boss",
    name: "HELL-GATO",
    line: "Good. Show me your heart… before I take it.",
  },
];

export function creditRollHtml(): string {
  return CREDIT_BLOCKS.map((block) => {
    const gap =
      block.gap === "lg" ? " credits-gap-lg" : block.gap === "md" ? " credits-gap-md" : "";
    const role = block.role ? `<p class="credits-role">${block.role}</p>` : "";
    const lines = (block.lines ?? []).map((line) => `<p class="credits-line">${line}</p>`).join("");
    return `<div class="credits-block${gap}">${role}<p class="credits-name">${block.name}</p>${lines}</div>`;
  }).join("");
}
