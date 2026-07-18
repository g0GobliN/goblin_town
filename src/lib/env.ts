import { env as cfEnv } from "cloudflare:workers";

/** Read env from Cloudflare bindings, then Vite/Astro, then process.env (local .env). */
export function getEnv(name: string): string | undefined {
  try {
    const v = (cfEnv as Record<string, unknown>)[name];
    if (typeof v === "string" && v.length > 0) return v;
  } catch {
    /* cloudflare:workers unavailable in some local contexts */
  }

  const meta = (import.meta.env as Record<string, string | undefined>)[name];
  if (typeof meta === "string" && meta.length > 0) return meta;

  try {
    const fromProcess = process.env[name];
    if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;
  } catch {
    /* process may be unavailable */
  }

  return undefined;
}
