/**
 * Astro 7 + @astrojs/cloudflare emits:
 *   dist/client/  ← real site (HTML, _astro, public assets)
 *   dist/server/  ← worker (not used by Cloudflare Pages static publish)
 *
 * Cloudflare Pages for this project is locked to output dir `dist`.
 * Copy client → dist root so deploys replace the live site (not /client/…).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const clientDir = "dist/client";
const distDir = "dist";

if (!existsSync(clientDir)) {
  console.error("flatten-for-pages: missing dist/client — run astro build first");
  process.exit(1);
}

const staging = "dist/.pages-staging";
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
cpSync(clientDir, staging, { recursive: true });

for (const name of readdirSync(distDir)) {
  if (name === ".pages-staging") continue;
  rmSync(join(distDir, name), { recursive: true, force: true });
}

for (const name of readdirSync(staging)) {
  cpSync(join(staging, name), join(distDir, name), { recursive: true });
}
rmSync(staging, { recursive: true, force: true });

// Astro leaves a Workers redirect here; Pages deploy must not follow it.
rmSync(".wrangler/deploy", { recursive: true, force: true });

const hasIndex = existsSync(join(distDir, "index.html"));
const hasAstro = existsSync(join(distDir, "_astro"));
if (!hasIndex || !hasAstro) {
  console.error("flatten-for-pages: expected index.html and _astro/ at dist/");
  process.exit(1);
}

console.log("flatten-for-pages: dist/ is ready for Cloudflare Pages");
