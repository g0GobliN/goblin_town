import { env as cfEnv } from "cloudflare:workers";

/** Collect all non-empty values for a key (Cloudflare runtime, process, Vite). */
export function getEnvCandidates(name: string): string[] {
  const out: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim().length > 0) out.push(v);
  };

  try {
    add((cfEnv as Record<string, unknown>)[name]);
  } catch {
    /* cloudflare:workers unavailable locally sometimes */
  }

  try {
    add(process.env[name]);
  } catch {
    /* process may be unavailable */
  }

  add((import.meta.env as Record<string, string | undefined>)[name]);

  return out;
}

/** Read env from Cloudflare bindings, then process.env, then Vite/Astro. */
export function getEnv(name: string): string | undefined {
  return getEnvCandidates(name)[0];
}
