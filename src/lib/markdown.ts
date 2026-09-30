// Tiny dependency-free Markdown renderer for Firestore-authored blog content.
//
// The blog composer is a plain textarea, so posts arrive as CommonMark-ish
// text (headings, fenced code, lists, quotes). The hand-rolled formatter in
// blog/[slug].astro only understood "#" headings, which dumped everything
// else — code fences, backticks, bold, lists, links — onto the page as raw
// text. This module turns that same text into safe HTML instead.
//
// Safety model: input is treated as untrusted plain text. renderInline escapes
// every text segment (and every rule capture) before emitting it, and only
// this module's own tags survive, so post content can't inject markup.
// It runs client-side, so the Cloudflare bundle stays slim.

const ESCAPE_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPE_ENTITIES[ch]!);
}

type InlineRule = {
  pattern: RegExp;
  render: (match: RegExpExecArray) => string;
};

// Applied in order; each rule consumes its match so later rules can't re-scan
// the inside of an earlier one (e.g. a bold span won't be re-linked).
const INLINE_RULES: InlineRule[] = [
  // `code` — no nested formatting inside code spans.
  {
    pattern: /`([^`\n]+)`/,
    render: (m) => `<code>${escapeHtml(m[1]!)}</code>`,
  },
  // [text](href) — allows one level of balanced parens in the URL (e.g.
  // wikipedia links). Only http(s), mailto, and in-page anchors are emitted.
  {
    pattern: /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/,
    render: (m) => {
      const href = m[2]!;
      const safe = /^(https?:\/\/|mailto:|#)/i.test(href) ? escapeHtml(href) : "";
      const attr = safe ? ` href="${safe}"` : "";
      const rel = /^https?:\/\//i.test(href) ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a${attr}${rel}>${escapeHtml(m[1]!)}</a>`;
    },
  },
  // **bold** (must run before *italic* so ** is not eaten as two empties).
  {
    pattern: /\*\*([^*\n](?:[^*\n]*[^*\n])?)\*\*/,
    render: (m) => `<strong>${escapeHtml(m[1]!)}</strong>`,
  },
  // *italic* / _italic_ (no intra-word matches, like CommonMark).
  {
    pattern: /(?<![\w*])\*([^*\n]+)\*(?![\w*])/,
    render: (m) => `<em>${escapeHtml(m[1]!)}</em>`,
  },
  {
    pattern: /(?<![\w_])_([^_\n]+)_(?![\w_])/,
    render: (m) => `<em>${escapeHtml(m[1]!)}</em>`,
  },
  // ~~strike~~
  {
    pattern: /~~([^~\n]+)~~/,
    render: (m) => `<del>${escapeHtml(m[1]!)}</del>`,
  },
];

export function renderInline(text: string): string {
  let out = "";
  let rest = text;
  while (rest.length > 0) {
    let best: { index: number; rule: InlineRule; match: RegExpExecArray } | null = null;
    for (const rule of INLINE_RULES) {
      const match = rule.pattern.exec(rest);
      if (match && (best === null || match.index < best.index)) {
        best = { index: match.index, rule, match };
      }
    }
    if (!best) {
      out += escapeHtml(rest);
      break;
    }
    out += escapeHtml(rest.slice(0, best.index));
    out += best.rule.render(best.match);
    rest = rest.slice(best.index + best.match[0].length);
  }
  return out;
}

const FENCE_RE = /^```(\S*)\s*$/;
// # → h2 … #### → h5: the page template owns the post-title <h1>.
const ATX_HEADING_RE = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const HR_RE = /^(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const UL_ITEM_RE = /^[ \t]{0,3}[-*+][ \t]+(.*)$/;
const OL_ITEM_RE = /^[ \t]{0,3}\d{1,9}[.)][ \t]+(.*)$/;
const BLOCKQUOTE_RE = /^[ \t]{0,3}>[ \t]?(.*)$/;

const isBlank = (line: string) => line.trim() === "";

function renderList(items: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const body = items.map((item) => `<li>${renderInline(item)}</li>`).join("");
  return `<${tag}>${body}</${tag}>`;
}

function extractFenceLanguage(line: string): string | undefined {
  const info = FENCE_RE.exec(line)?.[1] ?? "";
  return info.length > 0 ? info : undefined;
}

// Walk the line array, consuming blocks greedily. Blank lines separate
// paragraphs; fenced code is verbatim (escaped as a whole, so inline rules
// never run inside it). Input is raw, unescaped text.
export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    out.push(`<p>${para.map((l) => renderInline(l)).join("<br />")}</p>`);
    para = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (isBlank(line)) {
      flushPara();
      i += 1;
      continue;
    }

    // Fenced code block.
    if (FENCE_RE.test(line)) {
      flushPara();
      const language = extractFenceLanguage(line);
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i]!)) {
        codeLines.push(lines[i]!);
        i += 1;
      }
      i += 1; // skip closing fence (or runs past EOF for unterminated fences)
      out.push(
        `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
      );
      continue;
    }

    // ATX heading (# .. ####).
    const heading = ATX_HEADING_RE.exec(line.trim());
    if (heading) {
      flushPara();
      const level = heading[1]!.length + 1;
      out.push(`<h${level}>${renderInline(heading[2]!)}</h${level}>`);
      i += 1;
      continue;
    }

    // Thematic break.
    if (HR_RE.test(line.trim())) {
      flushPara();
      out.push("<hr />");
      i += 1;
      continue;
    }

    // Blockquote: gather consecutive ">" lines, render their text as blocks.
    if (BLOCKQUOTE_RE.test(line)) {
      flushPara();
      const quoted: string[] = [];
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i]!)) {
        quoted.push(BLOCKQUOTE_RE.exec(lines[i]!)![1]!);
        i += 1;
      }
      out.push(`<blockquote>${markdownToHtml(quoted.join("\n"))}</blockquote>`);
      continue;
    }

    // Lists: gather consecutive item lines of the same kind.
    const isOrdered = OL_ITEM_RE.test(line);
    const itemRe = isOrdered ? OL_ITEM_RE : UL_ITEM_RE;
    if (itemRe.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]!);
        if (!m) break;
        items.push(m[1]!);
        i += 1;
      }
      out.push(renderList(items, isOrdered));
      continue;
    }

    // Regular paragraph line.
    para.push(line.trim());
    i += 1;
  }
  flushPara();

  return out.join("\n");
}
