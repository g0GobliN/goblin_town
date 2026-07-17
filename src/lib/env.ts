import { env as cfEnv } from "cloudflare:workers";

/** Read env from Cloudflare bindings first, then Vite/Astro import.meta.env. */
export function getEnv(name: string): string | undefined {
  try {
    const v = (cfEnv as Record<string, unknown>)[name];
    if (typeof v === "string" && v.length > 0) return v;
  } catch {
    /* cloudflare:workers unavailable in some local contexts */
  }

  const meta = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof meta === "string" && meta.length > 0 ? meta : undefined;
}
