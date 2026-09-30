import { escapeHtml } from "./markdown";

/**
 * Single source of truth for rendering projects/blogs/doodles as HTML.
 * Consumed by the homepage SSR lists and the in-game modals so the two
 * surfaces can never drift apart again.
 */

export type ProjectLike = {
  slug: string;
  name?: string;
  tagline?: string;
  summary?: string;
  year?: string;
  role?: string;
  stack?: string[];
};

export type BlogLike = {
  slug: string;
  title?: string;
  tagline?: string;
  publishedAt?: string;
  tags?: string[];
};

export type DoodleLike = {
  id?: string;
  name?: string;
  doodle?: string;
};

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

/** itch-style homepage row (info.css) */
export function projectRowHtml(p: ProjectLike): string {
  const href = `/work/${encodeURIComponent(p.slug)}/`;
  const title = p.name || p.slug;
  const sub = [p.tagline || p.summary || "", p.role].filter(Boolean).join(" · ");
  const meta = p.year || "";
  return `<a class="info-row" href="${escapeAttr(href)}">
    <span class="info-row-main">
      <span class="info-row-title">${escapeHtml(title)}</span>
      ${sub ? `<span class="info-row-sub">${escapeHtml(sub)}</span>` : ""}
    </span>
    ${meta ? `<span class="info-row-meta">${escapeHtml(meta)}</span>` : ""}
  </a>`;
}

/** itch-style homepage row for blog posts */
export function blogRowHtml(b: BlogLike): string {
  const href = `/blog/${encodeURIComponent(b.slug)}/`;
  const meta = (b.publishedAt || "").slice(0, 10);
  return `<a class="info-row" href="${escapeAttr(href)}">
    <span class="info-row-main">
      <span class="info-row-title">${escapeHtml(b.title || b.slug)}</span>
      ${b.tagline ? `<span class="info-row-sub">${escapeHtml(b.tagline)}</span>` : ""}
    </span>
    ${meta ? `<span class="info-row-meta">${escapeHtml(meta)}</span>` : ""}
  </a>`;
}

/** In-game Workshop card (game modal, pixel style) */
export function projectCardHtml(p: ProjectLike): string {
  const href = `/work/${encodeURIComponent(p.slug)}/`;
  return `
    <a class="card card-link" href="${escapeAttr(href)}">
      <div class="accent">&gt; ${escapeHtml(p.name || p.slug)}</div>
      <p>${escapeHtml(p.tagline || p.summary || "")}</p>
      <p class="small">${escapeHtml([p.year, p.role].filter(Boolean).join(" · "))}</p>
      ${
        p.stack?.length ? `<p class="small">${escapeHtml(p.stack.slice(0, 6).join(" / "))}</p>` : ""
      }
      <p class="small card-open">Open page →</p>
    </a>`;
}

/** In-game Library card (game modal, pixel style) */
export function blogCardHtml(b: BlogLike): string {
  const href = `/blog/${encodeURIComponent(b.slug)}/`;
  return `
    <a class="card card-link" href="${escapeAttr(href)}">
      <div class="accent">&gt; ${escapeHtml(b.title || b.slug)}</div>
      <p>${escapeHtml(b.tagline || "")}</p>
      <p class="small">${escapeHtml(b.publishedAt || "")}${
        b.tags?.length ? ` · ${escapeHtml(b.tags.slice(0, 3).join(", "))}` : ""
      }</p>
      <p class="small card-open">Open page →</p>
    </a>`;
}

/** Doodle grid tile (identical markup on homepage and in-game gallery) */
export function doodleTileHtml(d: DoodleLike, opts: { lightbox?: boolean } = {}): string {
  const title = escapeHtml(d.name || "untitled");
  const titleAttr = escapeAttr(d.name || "untitled");
  const src = (d.doodle || "").replaceAll('"', "%22");
  if (!src) {
    return `<figure class="info-doodle"><div class="info-doodle-empty"></div><figcaption class="small">${title}</figcaption></figure>`;
  }
  const openable = opts.lightbox
    ? ` info-doodle-openable" role="button" tabindex="0" data-name="${titleAttr}" aria-label="View doodle by ${titleAttr}`
    : "";
  return `<figure class="info-doodle${openable}">
    <img src="${src}" alt="${title}" loading="lazy" />
    <figcaption class="small">${title}</figcaption>
  </figure>`;
}
