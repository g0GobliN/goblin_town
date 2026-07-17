import {
  getDbBlogs,
  getDbProjects,
  getDoodles,
  type Blog,
  type Doodle,
  type Project,
} from "../lib/firebase";
import type { SectionKey } from "./types";

const WORK_PAGE = 2;
const BLOG_PAGE = 2;
const DOODLE_PAGE = 4;

let projectsCache: Project[] | null = null;
let blogsCache: Blog[] | null = null;
let doodlesCache: Doodle[] | null = null;

let workPage = 0;
let blogPage = 0;
let doodlePage = 0;

function setStatus(el: HTMLElement | null, text: string) {
  if (!el) return;
  el.textContent = text;
}

function bindPager(
  pagerId: string,
  page: number,
  totalPages: number,
  onChange: (next: number) => void,
) {
  const pager = document.getElementById(pagerId);
  if (!pager) return;

  if (totalPages <= 1) {
    pager.hidden = true;
    pager.innerHTML = "";
    return;
  }

  pager.hidden = false;
  pager.innerHTML = `
    <button type="button" class="pager-btn" data-dir="-1" aria-label="Previous">&lt;</button>
    <span class="pager-meta small">${page + 1}/${totalPages}</span>
    <button type="button" class="pager-btn" data-dir="1" aria-label="Next">&gt;</button>
  `;

  pager.querySelectorAll<HTMLButtonElement>(".pager-btn").forEach((btn) => {
    const dir = Number(btn.dataset.dir);
    const next = page + dir;
    btn.disabled = next < 0 || next >= totalPages;
    btn.addEventListener("click", () => {
      if (next < 0 || next >= totalPages) return;
      onChange(next);
    });
  });
}

export async function loadSectionContent(key: SectionKey) {
  if (key === "work") return renderWork();
  if (key === "blog") return renderBlog();
  if (key === "gallery" || key === "doodle") return renderDoodles();
}

async function renderWork() {
  const list = document.getElementById("work-list");
  const status = document.getElementById("work-status");
  if (!list) return;

  setStatus(status, "> unlocking the workshop...");
  if (!projectsCache) {
    projectsCache = await getDbProjects();
    workPage = 0;
  }
  const projects = projectsCache;

  if (!projects.length) {
    setStatus(status, "> forge is cold for now");
    list.innerHTML = emptyCard(
      "Board's empty tonight",
      "New builds land here when they're ready. Meanwhile — RealityMap is already on npm.",
    );
    bindPager("work-pager", 0, 0, () => undefined);
    return;
  }

  const totalPages = Math.ceil(projects.length / WORK_PAGE);
  workPage = Math.min(workPage, totalPages - 1);
  const slice = projects.slice(workPage * WORK_PAGE, workPage * WORK_PAGE + WORK_PAGE);

  setStatus(status, `> ${projects.length} project${projects.length === 1 ? "" : "s"}`);
  list.innerHTML = slice
    .map(
      (p) => `
      <a class="card card-link" href="/work/${encodeURIComponent(p.slug)}">
        <div class="accent">&gt; ${escapeHtml(p.name || p.slug)}</div>
        <p>${escapeHtml(p.tagline || p.summary || "")}</p>
        <p class="small">${escapeHtml([p.year, p.role].filter(Boolean).join(" · "))}</p>
        ${
          p.stack?.length
            ? `<p class="small">${escapeHtml(p.stack.slice(0, 6).join(" / "))}</p>`
            : ""
        }
        <p class="small card-open">Open page →</p>
      </a>`,
    )
    .join("");

  bindPager("work-pager", workPage, totalPages, (next) => {
    workPage = next;
    void renderWork();
  });
}

async function renderBlog() {
  const list = document.getElementById("blog-list");
  const status = document.getElementById("blog-status");
  if (!list) return;

  setStatus(status, "> lighting the reading lamps...");
  if (!blogsCache) {
    blogsCache = await getDbBlogs();
    blogPage = 0;
  }
  const blogs = blogsCache;

  if (!blogs.length) {
    setStatus(status, "> shelves waiting for ink");
    list.innerHTML = emptyCard(
      "No pages on the shelf yet",
      "Goblin's still drafting by lamplight. Notes show up here when they're ready to read.",
    );
    bindPager("blog-pager", 0, 0, () => undefined);
    return;
  }

  const totalPages = Math.ceil(blogs.length / BLOG_PAGE);
  blogPage = Math.min(blogPage, totalPages - 1);
  const slice = blogs.slice(blogPage * BLOG_PAGE, blogPage * BLOG_PAGE + BLOG_PAGE);

  setStatus(status, `> ${blogs.length} post${blogs.length === 1 ? "" : "s"}`);
  list.innerHTML = slice
    .map(
      (b) => `
      <a class="card card-link" href="/blog/${encodeURIComponent(b.slug)}">
        <div class="accent">&gt; ${escapeHtml(b.title)}</div>
        <p>${escapeHtml(b.tagline || "")}</p>
        <p class="small">${escapeHtml(b.publishedAt || "")}${
          b.tags?.length ? ` · ${escapeHtml(b.tags.slice(0, 3).join(", "))}` : ""
        }</p>
        <p class="small card-open">Open page →</p>
      </a>`,
    )
    .join("");

  bindPager("blog-pager", blogPage, totalPages, (next) => {
    blogPage = next;
    void renderBlog();
  });
}

export async function renderDoodles() {
  const grid = document.getElementById("doodle-grid");
  const status = document.getElementById("doodle-status");
  if (!grid) return;

  setStatus(status, "> dusting the wall...");
  if (!doodlesCache) {
    doodlesCache = await getDoodles();
    doodlePage = 0;
  }
  const doodles = doodlesCache;

  if (!doodles.length) {
    setStatus(status, "> blank wall — waiting for the first sketch");
    grid.innerHTML = emptyCard(
      "Wall's empty for now",
      "Head to Sketch Alley, draw something, hit SAVE — travelers leave marks here.",
    );
    bindPager("doodle-pager", 0, 0, () => undefined);
    return;
  }

  const totalPages = Math.ceil(doodles.length / DOODLE_PAGE);
  doodlePage = Math.min(doodlePage, totalPages - 1);
  const slice = doodles.slice(doodlePage * DOODLE_PAGE, doodlePage * DOODLE_PAGE + DOODLE_PAGE);

  setStatus(status, `> ${doodles.length} doodle${doodles.length === 1 ? "" : "s"}`);
  grid.innerHTML = slice
    .map((d) => {
      const title = escapeHtml(d.name || "untitled");
      const src = (d.doodle || "").replaceAll('"', "%22");
      const img = src
        ? `<img src="${src}" alt="${title}" loading="lazy" />`
        : `<div class="doodle-empty"></div>`;
      return `<figure class="doodle-card">${img}<figcaption class="small">${title}</figcaption></figure>`;
    })
    .join("");

  bindPager("doodle-pager", doodlePage, totalPages, (next) => {
    doodlePage = next;
    void renderDoodles();
  });
}

export function invalidateDoodleCache() {
  doodlesCache = null;
  doodlePage = 0;
}

function emptyCard(title: string, body: string) {
  return `
    <article class="card empty-card">
      <div class="accent">&gt; ${escapeHtml(title)}</div>
      <p class="small">${escapeHtml(body)}</p>
    </article>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
