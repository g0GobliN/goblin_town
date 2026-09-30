import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml, markdownToHtml, renderInline } from "../src/lib/markdown.ts";

test("paragraphs split on blank lines and keep soft line breaks", () => {
  const html = markdownToHtml("first line\nsecond line\n\nanother paragraph");
  assert.match(html, /^<p>first line<br \/>second line<\/p>\n<p>another paragraph<\/p>$/);
});

test("headings map to h2..h5 and keep inline formatting", () => {
  const html = markdownToHtml("# Title\n## Sub **bold**\n### Sub sub\n#### Deep _em_");
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<h3>Sub <strong>bold<\/strong><\/h3>/);
  assert.match(html, /<h4>Sub sub<\/h4>/);
  assert.match(html, /<h5>Deep <em>em<\/em><\/h5>/);
});

test("trailing hashes on headings are stripped", () => {
  assert.match(markdownToHtml("## Closed ###"), /<h3>Closed<\/h3>/);
});

test("fenced code is escaped verbatim with language class", () => {
  const html = markdownToHtml('```ts\nconst a = "<b>&</b>";\n```');
  assert.match(
    html,
    /<pre><code class="language-ts">const a = &quot;&lt;b&gt;&amp;&lt;\/b&gt;&quot;;<\/code><\/pre>/,
  );
});

test("unterminated fence still renders collected lines", () => {
  const html = markdownToHtml("```\nalpha\nbeta");
  assert.match(html, /<pre><code>alpha\nbeta<\/code><\/pre>/);
});

test("inline code, bold, italic, strikethrough, and links", () => {
  const html = renderInline("`c` **b** *i* _u_ ~~s~~ [t](https://e.x)");
  assert.equal(
    html,
    '<code>c</code> <strong>b</strong> <em>i</em> <em>u</em> <del>s</del> <a href="https://e.x" target="_blank" rel="noopener noreferrer">t</a>',
  );
});

test("javascript: hrefs are dropped", () => {
  const html = renderInline("[click](javascript:alert(1))");
  assert.match(html, /^<a>click<\/a>$/);
});

test("unordered, ordered, and adjacent lists", () => {
  const html = markdownToHtml("- a\n- b\n\n1. c\n2. d");
  assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(html, /<ol><li>c<\/li><li>d<\/li><\/ol>/);
});

test("list items keep inline formatting", () => {
  const html = markdownToHtml("- item with **bold** and `code`");
  assert.match(html, /<li>item with <strong>bold<\/strong> and <code>code<\/code><\/li>/);
});

test("three-space indentation does not turn a paragraph into a list", () => {
  const html = markdownToHtml("   indented continuation text");
  assert.match(html, /^<p>indented continuation text<\/p>$/);
});

test("blockquotes render their contents as blocks", () => {
  const html = markdownToHtml("> quoted **line**\n> second");
  assert.match(
    html,
    /<blockquote><p>quoted <strong>line<\/strong><br \/>second<\/p><\/blockquote>/,
  );
});

test("thematic breaks render as hr", () => {
  assert.match(markdownToHtml("para\n\n---\n\nnext"), /<hr \/>/);
});

test("hr must be a full line, not inline dashes", () => {
  assert.equal(markdownToHtml("a - b"), "<p>a - b</p>");
});

test("untrusted HTML in paragraphs is escaped", () => {
  const html = markdownToHtml('hello <script>alert(1)</script> & "quotes" <img src=x onerror=1>');
  assert.equal(
    html,
    "<p>hello &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot; &lt;img src=x onerror=1&gt;</p>",
  );
});

test("html in headings, list items, and quotes is escaped", () => {
  assert.match(markdownToHtml("## <b>hi</b>"), /<h3>&lt;b&gt;hi&lt;\/b&gt;<\/h3>/);
  assert.match(markdownToHtml("- <b>hi</b>"), /<li>&lt;b&gt;hi&lt;\/b&gt;<\/li>/);
  assert.match(
    markdownToHtml("> <b>hi</b>"),
    /<blockquote><p>&lt;b&gt;hi&lt;\/b&gt;<\/p><\/blockquote>/,
  );
});

test("html inside inline code is escaped", () => {
  assert.match(renderInline("`<script>`"), /^<code>&lt;script&gt;<\/code>$/);
});

test("escaping survives round trips for entity-lookalike text", () => {
  assert.equal(renderInline("a &amp; b"), "a &amp;amp; b");
  assert.equal(escapeHtml("<>&\"'"), "&lt;&gt;&amp;&quot;&#39;");
});

test("CRLF input is normalized", () => {
  const html = markdownToHtml("para one\r\n\r\npara two");
  assert.equal(html, "<p>para one</p>\n<p>para two</p>");
});

test("empty input renders as empty output", () => {
  assert.equal(markdownToHtml(""), "");
  assert.equal(markdownToHtml("\n\n"), "");
});

test("mermaid fences become language-mermaid code blocks (mermaid.ts upgrades these)", () => {
  const html = markdownToHtml("```mermaid\nflowchart LR\n  A[x] --> B[y]\n```");
  assert.match(
    html,
    /<pre><code class="language-mermaid">flowchart LR\n  A\[x\] --&gt; B\[y\]<\/code><\/pre>/,
  );
});

test("mermaid diagram source is escaped like any code block", () => {
  const html = markdownToHtml('```mermaid\nA["<script>alert(1)</script>"] --> B\n```');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("a non-mermaid fence never gets the mermaid class", () => {
  const html = markdownToHtml("```text\nflowchart LR\n```");
  assert.match(html, /<code class="language-text">/);
  assert.doesNotMatch(html, /language-mermaid/);
});
