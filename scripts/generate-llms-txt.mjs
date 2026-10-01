import { writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Generates two machine-readable files at build time:
 *
 *   dist/client/llms.txt  — markdown index for AI tools (llmstxt.org spec):
 *                           who Vishal is plus every live project and post URL
 *                           with a one-line summary.
 *   dist/client/rss.xml   — RSS 2.0 feed of blog posts (readers + AI pick
 *                           these up; also a second sitemap-like discovery
 *                           path for post URLs).
 *
 * Reads the public Firestore REST API (no credentials — projects/blogs are
 * public-read), matching the data the SSR pages use. Runs after `astro
 * build`; the checked-in public/llms.txt remains the evergreen fallback.
 */

const SITE = "https://v1.monster";
const projectId = process.env.PUBLIC_FIREBASE_PROJECT_ID;

async function listDocs(collection) {
  if (!projectId) return [];
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=200`,
    );
    if (!res.ok) throw new Error(`${collection}: HTTP ${res.status}`);
    const body = await res.json();
    return (body.documents || []).map((doc) => {
      const fields = {};
      for (const [k, v] of Object.entries(doc.fields || {})) {
        if (v.stringValue !== undefined) fields[k] = v.stringValue;
        else if (v.arrayValue?.values)
          fields[k] = v.arrayValue.values.map((x) => x.stringValue).filter(Boolean);
      }
      return { id: doc.name.split("/").pop(), fields };
    });
  } catch (err) {
    console.warn(`[llms-txt] could not fetch ${collection}, skipping:`, err.message);
    return [];
  }
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const projects = await listDocs("projects");
const blogs = await listDocs("blogs");
blogs.sort((a, b) =>
  String(b.fields.publishedAt || "").localeCompare(String(a.fields.publishedAt || "")),
);

// ── llms.txt ──────────────────────────────────────────────
const lines = [
  "# Goblin Town — Vishal Gurung",
  "",
  "> Playable portfolio of Vishal Gurung, an IT engineer based in Tokyo, Japan. The homepage (https://v1.monster/) is the text portfolio; the portfolio also exists as a pixel-art browser game at https://v1.monster/game/.",
  "",
  "## Who",
  "",
  "- Name: Vishal Gurung",
  "- Role: IT Engineer",
  "- Location: Tokyo, Japan",
  "- Focus: web development, WebRTC, system development (システム開発), cameras, game development",
  "- Creator of reality-map",
  "",
  "## Pages",
  "",
  "- [Home / About](https://v1.monster/): Text summary of who Vishal is, selected work, notes, and contact info — the best page to read for facts about him.",
  "- [Playable town](https://v1.monster/game/): The interactive pixel-art portfolio game.",
  "- [Contact](https://v1.monster/contact/): Email, GitHub (g0GobliN), and Instagram (@goblin01_).",
  "- [Privacy](https://v1.monster/privacy/): No cookies, no trackers, no analytics.",
  "- [Terms](https://v1.monster/terms/): Terms of use.",
  "- [RSS feed](https://v1.monster/rss.xml): Blog posts as RSS 2.0.",
];

if (projects.length) {
  lines.push("", `## Projects (${projects.length})`, "");
  for (const p of projects) {
    const slug = p.fields.slug || p.id;
    const name = p.fields.name || slug;
    const desc = (p.fields.tagline || p.fields.summary || "").replaceAll("\n", " ").slice(0, 160);
    lines.push(`- [${name}](https://v1.monster/work/${encodeURIComponent(slug)}/): ${desc}`);
  }
}

if (blogs.length) {
  lines.push("", `## Blog posts (${blogs.length})`, "");
  for (const b of blogs) {
    const slug = b.fields.slug || b.id;
    const title = b.fields.title || slug;
    const desc = (b.fields.tagline || "").replaceAll("\n", " ").slice(0, 160);
    const date = (b.fields.publishedAt || "").slice(0, 10);
    lines.push(
      `- [${title}](https://v1.monster/blog/${encodeURIComponent(slug)}/): ${desc}${date ? ` (${date})` : ""}`,
    );
  }
}

lines.push(
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} from the live content database.`,
);

// ── rss.xml ───────────────────────────────────────────────
const rssItems = blogs
  .map((b) => {
    const slug = b.fields.slug || b.id;
    const title = b.fields.title || slug;
    const url = `https://v1.monster/blog/${encodeURIComponent(slug)}/`;
    const date = b.fields.publishedAt ? new Date(b.fields.publishedAt).toUTCString() : "";
    const desc = esc((b.fields.tagline || "").slice(0, 300));
    return `    <item>
      <title>${esc(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${date ? `<pubDate>${date}</pubDate>` : ""}
      ${desc ? `<description>${desc}</description>` : ""}
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Goblin Town — Vishal Gurung</title>
    <link>https://v1.monster/</link>
    <description>Notes and projects from Vishal Gurung's playable pixel-art portfolio.</description>
    <language>en</language>
    <atom:link href="https://v1.monster/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>
`;

// Runs after flatten-for-pages, so write to the final dist root that gets
// deployed (dist/client is consumed/moved by the flatten step).
writeFileSync(join("dist", "llms.txt"), lines.join("\n") + "\n");
writeFileSync(join("dist", "rss.xml"), rss);
console.log(
  `[llms-txt] wrote llms.txt (${projects.length} projects, ${blogs.length} posts) + rss.xml`,
);
