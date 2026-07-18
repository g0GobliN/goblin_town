import type { SectionKey } from "./types";

export const SECTION_KEYS: SectionKey[] = ["about", "work", "blog", "gallery", "doodle", "contact"];

export const SECTION_ICONS: Record<SectionKey, string> = {
  about: "⌂",
  work: "⚒",
  blog: "❒",
  gallery: "▦",
  doodle: "▣",
  contact: "⚑",
};

export function titleFor(key: SectionKey): string {
  switch (key) {
    case "about":
      return "House Diary";
    case "work":
      return "Workshop";
    case "blog":
      return "Library";
    case "gallery":
      return "Gallery Wall";
    case "doodle":
      return "Sketch Alley";
    case "contact":
      return "Church Gate";
  }
}
