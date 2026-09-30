// Mermaid diagram support for markdown-rendered blog posts.
//
// markdownToHtml treats ```mermaid fences like any other code block. After
// the post HTML is in the DOM, renderMermaidBlocks() upgrades those blocks
// to diagrams. Mermaid is heavy (~1-2 MB), so it is dynamically imported
// only when a post actually contains a mermaid fence — posts without one
// never pay for it.
//
// Failure policy: mermaid.parse() runs before render. A bad diagram keeps
// its original <pre><code> form (still readable as source), and the failure
// is logged — a broken diagram never blank a section of the post.

import { devWarn } from "./log";

const MERMAID_SOURCE_SELECTOR = "pre > code.language-mermaid";

// Dark, monospace look matching the entry pages (see entry.css).
const MERMAID_THEME_VARIABLES = {
  background: "#0b1017",
  primaryColor: "#394758",
  primaryTextColor: "#fefeff",
  primaryBorderColor: "#455870",
  lineColor: "#aedeea",
  secondaryColor: "#2b3644",
  tertiaryColor: "#1a222c",
  fontFamily: 'Consolas, "Courier New", ui-monospace, monospace',
  fontSize: "14px",
};

let mermaidReady: Promise<MermaidApi | null> | null = null;

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  parse: (text: string) => Promise<unknown>;
  render: (id: string, text: string) => Promise<{ svg: string }>;
};

function loadMermaid(): Promise<MermaidApi | null> {
  if (!mermaidReady) {
    mermaidReady = (async () => {
      try {
        const mod = await import("mermaid");
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: MERMAID_THEME_VARIABLES,
        });
        return mermaid;
      } catch (error) {
        devWarn("Mermaid failed to load — diagrams stay as code blocks:", error);
        return null;
      }
    })();
  }
  return mermaidReady;
}

function unwrapSource(codeEl: Element): string | null {
  // Code content was HTML-escaped by markdownToHtml; read it back via
  // textContent so `&lt;` etc. become real characters again.
  const text = codeEl.textContent ?? "";
  return text.trim().length > 0 ? text : null;
}

// Replaces each <pre><code class="language-mermaid">…</code></pre> with a
// rendered diagram <div class="entry-mermaid">. Returns how many rendered.
export async function renderMermaidBlocks(root: HTMLElement): Promise<number> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(MERMAID_SOURCE_SELECTOR));
  if (blocks.length === 0) return 0;

  const mermaid = await loadMermaid();
  if (!mermaid) return 0;

  let rendered = 0;
  for (const [index, codeEl] of blocks.entries()) {
    const source = unwrapSource(codeEl);
    const pre = codeEl.parentElement;
    if (!source || !pre) continue;

    const id = `entry-mermaid-${index}`;
    try {
      await mermaid.parse(source);
      const { svg } = await mermaid.render(id, source);
      const holder = document.createElement("div");
      holder.className = "entry-mermaid";
      holder.innerHTML = svg; // mermaid "strict" security level sanitizes svg
      pre.replaceWith(holder);
      rendered += 1;
    } catch (error) {
      // Keep the original code block so the source stays readable.
      devWarn(`Mermaid diagram #${index + 1} failed to render — kept as code:`, error);
    }
  }
  return rendered;
}
