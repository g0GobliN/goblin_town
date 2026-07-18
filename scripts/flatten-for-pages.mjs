/**
 * Astro 7 + @astrojs/cloudflare emits:
 *   dist/client/  ← real site (HTML, _astro, public assets)
 *   dist/server/  ← worker (SSR pages + /api/* routes)
 *
 * Cloudflare Pages for this project is locked to output dir `dist`.
 * Copy client → dist root, and server → dist/_worker.js so Pages runs the
 * worker in advanced mode (needed for /api/admin/* and SSR blog/work pages).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

const clientDir = "dist/client";
const serverDir = "dist/server";
const distDir = "dist";

if (!existsSync(clientDir) || !existsSync(serverDir)) {
  console.error("flatten-for-pages: missing dist/client or dist/server — run astro build first");
  process.exit(1);
}

const staging = "dist/.pages-staging";
const workerStaging = "dist/.worker-staging";
rmSync(staging, { recursive: true, force: true });
rmSync(workerStaging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
cpSync(clientDir, staging, { recursive: true });

// Worker: everything except the prerender scratch dir and the generated wrangler config.
cpSync(serverDir, workerStaging, {
  recursive: true,
  filter: (src) => {
    const name = basename(src);
    return name !== ".prerender" && name !== "wrangler.json";
  },
});
renameSync(join(workerStaging, "entry.mjs"), join(workerStaging, "index.js"));

for (const name of readdirSync(distDir)) {
  if (name === ".pages-staging" || name === ".worker-staging") continue;
  rmSync(join(distDir, name), { recursive: true, force: true });
}

for (const name of readdirSync(staging)) {
  cpSync(join(staging, name), join(distDir, name), { recursive: true });
}
cpSync(workerStaging, join(distDir, "_worker.js"), { recursive: true });
rmSync(staging, { recursive: true, force: true });
rmSync(workerStaging, { recursive: true, force: true });

// Astro leaves a Workers redirect here; Pages deploy must not follow it.
rmSync(".wrangler/deploy", { recursive: true, force: true });

const hasIndex = existsSync(join(distDir, "index.html"));
const hasAstro = existsSync(join(distDir, "_astro"));
const hasWorker = existsSync(join(distDir, "_worker.js", "index.js"));
if (!hasIndex || !hasAstro || !hasWorker) {
  console.error("flatten-for-pages: expected index.html, _astro/ and _worker.js/index.js at dist/");
  process.exit(1);
}

console.log("flatten-for-pages: dist/ is ready for Cloudflare Pages (with worker)");
