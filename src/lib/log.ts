// Client-side debug logging. import.meta.env.DEV is statically replaced by
// Vite, so these calls (and their arguments) are dead-code-eliminated from
// the production bundle — nothing reaches a visitor's browser console.
export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) console.warn(...args);
}

export function devError(...args: unknown[]): void {
  if (import.meta.env.DEV) console.error(...args);
}
