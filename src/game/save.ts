/** Remove saves written by earlier game versions now that each visit starts fresh. */
const SAVE_KEY = "gt-save-v1";

export function clearGameSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore unavailable storage (private mode, blocked storage, etc.).
  }
}
