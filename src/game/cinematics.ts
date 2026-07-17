export type CineKind = "intro" | "credits";

export interface CineSlide {
  kicker?: string;
  title: string;
  body: string[];
}

/** Opening tour — every street / door in Goblin Town. */
export const INTRO_SLIDES: CineSlide[] = [
  {
    kicker: "CHAPTER 0",
    title: "GOBLIN TOWN",
    body: [
      "A playable portfolio.",
      "Night lamps, open doors, one green traveler.",
    ],
  },
  {
    kicker: "THE BUILDER",
    title: "VISHAL · GOBLIN",
    body: [
      "Nepal → Tokyo.",
      "Engineer by day. Side quests by night.",
    ],
  },
  {
    kicker: "HOME STREET",
    title: "HOUSE DIARY",
    body: ["Who lives here.", "Open the diary to read his path."],
  },
  {
    kicker: "WORKSHOP",
    title: "SELECTED BUILDS",
    body: ["Apps, tools, packages on the board.", "Flip a card — see what shipped."],
  },
  {
    kicker: "LIBRARY LANE",
    title: "NOTES & POSTS",
    body: ["Quiet shelves.", "Write-ups land when the ink is ready."],
  },
  {
    kicker: "GALLERY ROW",
    title: "VISITOR WALL",
    body: ["Sketches left by travelers.", "Yours can hang here too."],
  },
  {
    kicker: "SKETCH ALLEY",
    title: "LEAVE A MARK",
    body: ["Paint pots. Open crates.", "Draw something. Save it to the wall."],
  },
  {
    kicker: "CHURCH GATE",
    title: "SAY HELLO",
    body: ["End of the road.", "Email · GitHub · hire · wave from the gate."],
  },
  {
    kicker: "HOW TO WALK",
    title: "CONTROLS",
    body: [
      "A/D move · Shift run · W jump",
      "J/X attack · Space talk / heal · M menu",
    ],
  },
  {
    kicker: "READY",
    title: "ENTER THE TOWN",
    body: ["Walk up to doors and townsfolk.", "Soul gems light the street. Stay sharp."],
  },
];

/** Closing roll — people, art, thanks. */
export const CREDIT_SLIDES: CineSlide[] = [
  {
    kicker: "THE END?",
    title: "GOBLIN TOWN",
    body: ["Thanks for walking the street.", "The gate stays open."],
  },
  {
    kicker: "BUILT BY",
    title: "VISHAL GURUNG",
    body: ["Online: goblin · g0GobliN", "東京 · 2026"],
  },
  {
    kicker: "PIXEL ART",
    title: "GOTHICVANIA",
    body: [
      "Town & cemetery · ansimuz",
      "opengameart.org / itch.io",
    ],
  },
  {
    kicker: "PIXEL ART",
    title: "THE GOBLIN",
    body: [
      "Monsters Creatures Fantasy",
      "LuizMelo · CC0",
    ],
  },
  {
    kicker: "ALSO",
    title: "PICKUPS & UI",
    body: ["Soul gems · OpenGameArt", "Press-key art · pack UI"],
  },
  {
    kicker: "SIDE QUEST",
    title: "REALITYMAP",
    body: ["npmjs.com/package/reality-map", "A map I wished existed."],
  },
  {
    kicker: "FAREWELL",
    title: "SEE YOU AT THE GATE",
    body: [
      "Hire · collab · or just say hi.",
      "ENTER — return to town",
    ],
  },
];

export function slidesFor(kind: CineKind): CineSlide[] {
  return kind === "intro" ? INTRO_SLIDES : CREDIT_SLIDES;
}
