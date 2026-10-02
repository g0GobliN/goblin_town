// Dev utility: REPORT how each character sprite is drawn relative to the
// direction it moves, using the game's own flip rules.
//
//   node tools/verify-facing.mjs
//
// IMPORTANT: this is a report, not a gate. It always exits 0 on purpose.
//
// The silhouette metric below disagrees with itself on high-contrast or
// hunched art. It read the ghoul as both left- and right-facing depending on
// the parameters, and a half-cycle ordering test wrongly flagged the player
// walk sheet - the known-good control - as reversed. Statistics cannot settle
// facing for this art; only looking at it can.
//
// So the authoritative record of art direction is ART_FACES_LEFT in
// src/game/combat.ts and NPC_ART_FACES_LEFT in src/game/scenes.ts. Run this
// after editing those tables or replacing a sprite, and eyeball any row marked
// DISAGREES: it means the measured silhouette leans the other way, which is
// worth a human look but is not proof of a bug.
//
// For enemies this applies enemyArtFlip() from src/game/combat.ts to each
// sheet and re-measures the result.
//
// For townsfolk it applies npcArtFlip() from src/game/scenes.ts the same way.
// NPC sheets are one multi-column image per character, so they are sliced into
// frames first. NPCs stand still, so the check is that they face the way their
// `facing` asks rather than that they match a direction of travel.
//
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { enemyArtFlip } from "../src/game/combat.ts";
import { npcArtFlip } from "../src/game/scenes.ts";

/** Minimal PNG decoder: 8-bit truecolor (2) or truecolor+alpha (6). */
function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`bit depth ${depth} unsupported`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`color type ${colorType} unsupported`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/** Horizontally mirror an image in place, mirroring every channel of a pixel. */
function mirror(img) {
  const { width, height, channels, data } = img;
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * channels;
      const to = (y * width + (width - 1 - x)) * channels;
      for (let c = 0; c < channels; c++) out[to + c] = data[from + c];
    }
  }
  return { width, height, channels, data: out };
}

/**
 * Which side of its bounding box the head sits on, as a fraction of the bbox
 * width. Positive => the head is right of centre, so the art faces right.
 */
function headSide(img) {
  const { width, height, channels, data } = img;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const a = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const v = channels === 4 ? data[p * 4 + 3] : 255;
    if (v <= 24) continue;
    a[p] = v;
    const x = p % width;
    const y = (p / width) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX < minX) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const centre = minX + (bw - 1) / 2;
  const headRows = Math.max(1, Math.round(bh * 0.22));
  let sx = 0;
  let n = 0;
  for (let y = minY; y < minY + headRows; y++) {
    for (let x = 0; x < width; x++) {
      const v = a[y * width + x];
      if (v) {
        sx += x * v;
        n += v;
      }
    }
  }
  if (!n) return null;
  return (sx / n - centre) / bw;
}

const BASE = "public/img/gothicvania";
const SHEETS = {
  ghoul: [8, `${BASE}/church/ghoul/burning-ghoul`],
  ghost: [4, `${BASE}/cemetery/ghost/ghost-`],
  skeleton: [8, `${BASE}/cemetery/skeleton/skeleton-`],
  hound: [4, `${BASE}/cemetery/hell-gato/hell-gato-`],
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
let disagreements = 0;

for (const [kind, [count, prefix]] of Object.entries(SHEETS)) {
  const raw = [];
  for (let i = 1; i <= count; i++) {
    raw.push(decodePng(readFileSync(`${prefix}${i}.png`)));
  }
  for (const facing of [1, -1]) {
    // Exactly what the renderer does before drawing.
    const drawn = raw.map((img) => (enemyArtFlip(kind, facing) ? mirror(img) : img));
    const score = mean(drawn.map(headSide).filter((v) => v !== null));
    const want = facing === 1 ? "RIGHT" : "LEFT";
    const got = score > 0 ? "RIGHT" : "LEFT";
    const ok = got === want;
    if (!ok) disagreements++;
    console.log(
      `${kind.padEnd(9)} moving ${facing === 1 ? "RIGHT" : "LEFT "}  ` +
        `flip=${String(enemyArtFlip(kind, facing)).padEnd(5)} ` +
        `headSide=${(score * 100).toFixed(1).padStart(6)}%  draws ${got}  ` +
        `${ok ? "OK" : "DISAGREES"}`,
    );
  }
}

console.log(
  disagreements === 0
    ? "\nNo disagreements: every enemy sprite leans the way it moves."
    : `\n${disagreements} enemy row(s) DISAGREE with the art-direction table — worth an eyeball.`,
);

// ── Townsfolk NPCs ─────────────────────────────────────────────────────────
// Their sheets are a single multi-column image, so slice before measuring.
// Frame geometry mirrors the Npc definitions in src/game/{scenes,world}.ts.
const TOWN = `${BASE}/town`;
const NPC_SHEETS = {
  "bearded-idle": [5, 40, 47],
  "bearded-walk": [6, 40, 47],
  "hat-man-idle": [4, 39, 52],
  "hat-man-walk": [6, 39, 52],
  "oldman-idle": [8, 34, 42],
  "oldman-walk": [12, 34, 42],
  "woman-idle": [7, 37, 46],
  "woman-walk": [6, 37, 46],
};

/** Cut frame `index` out of a multi-column sheet. */
function sliceFrame(img, index, fw, fh) {
  const cols = Math.max(1, Math.floor(img.width / fw));
  const sx = (index % cols) * fw;
  const w = Math.min(fw, img.width - sx);
  const h = Math.min(fh, img.height);
  if (w <= 0 || h <= 0) return null;
  const { channels, data } = img;
  const out = Buffer.alloc(w * h * channels);
  for (let y = 0; y < h; y++) {
    const from = (y * img.width + sx) * channels;
    data.copy(out, y * w * channels, from, from + w * channels);
  }
  return { width: w, height: h, channels, data: out };
}

console.log("\nTownsfolk NPCs:");
for (const [sheet, [count, fw, fh]] of Object.entries(NPC_SHEETS)) {
  const img = decodePng(readFileSync(`${TOWN}/${sheet}.png`));
  const raw = [];
  for (let i = 0; i < count; i++) {
    const frame = sliceFrame(img, i, fw, fh);
    if (frame) raw.push(frame);
  }
  for (const facing of [1, -1]) {
    const drawn = raw.map((f) => (npcArtFlip(sheet, facing) ? mirror(f) : f));
    const score = mean(drawn.map(headSide).filter((v) => v !== null));
    const want = facing === 1 ? "RIGHT" : "LEFT";
    const got = score > 0 ? "RIGHT" : "LEFT";
    const ok = got === want;
    if (!ok) disagreements++;
    console.log(
      `${sheet.padEnd(13)} facing ${facing === 1 ? "RIGHT" : "LEFT "}  ` +
        `flip=${String(npcArtFlip(sheet, facing)).padEnd(5)} ` +
        `headSide=${(score * 100).toFixed(1).padStart(6)}%  draws ${got}  ` +
        `${ok ? "OK" : "DISAGREES"}`,
    );
  }
}

console.log(
  disagreements === 0
    ? "\nNo disagreements: every character sprite leans the way it should."
    : `\n${disagreements} row(s) DISAGREE with the art-direction table — worth an eyeball.`,
);

// Reporting only: never fail a build on a metric known to be unreliable.
process.exit(0);
