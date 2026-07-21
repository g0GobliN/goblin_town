import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import basicSsl from "@vitejs/plugin-basic-ssl";

// work/[slug] and blog/[slug] are prerender=false (content is fetched from
// Firestore at request time), so the sitemap integration can't discover them
// from the filesystem. Fetch the published slugs at build time instead —
// projects/blogs are public-read in firestore.rules, so no auth is needed.
async function fetchSlugUrls(projectId, collection, pathPrefix) {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`,
    );
    if (!res.ok) throw new Error(`Firestore REST ${collection} ${res.status}`);
    const body = await res.json();
    return (body.documents || [])
      .map((doc) => doc.fields?.slug?.stringValue)
      .filter((slug) => typeof slug === "string" && slug.length > 0)
      .map((slug) => `https://g0.monster${pathPrefix}${slug}/`);
  } catch (err) {
    console.warn(`[sitemap] could not fetch ${collection} slugs, skipping:`, err.message);
    return [];
  }
}

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const firebaseProjectId = env.PUBLIC_FIREBASE_PROJECT_ID;

const dynamicPages = firebaseProjectId
  ? (
      await Promise.all([
        fetchSlugUrls(firebaseProjectId, "projects", "/work/"),
        fetchSlugUrls(firebaseProjectId, "blogs", "/blog/"),
      ])
    ).flat()
  : [];

export default defineConfig({
  site: "https://g0.monster",
  output: "static",
  trailingSlash: "always",
  adapter: cloudflare(),
  integrations: [
    sitemap({
      customPages: dynamicPages,
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/api/") &&
        !page.includes("/404") &&
        !page.includes("/500"),
    }),
  ],
  server: { port: 4321, host: true },
  // HTTPS so phone LAN testing can use Fullscreen API (blocked on plain http://)
  vite: {
    plugins: [basicSsl()],
  },
});
