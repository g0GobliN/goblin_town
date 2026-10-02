// Dev utility: which way are the townsfolk NPC sprites drawn?
//
//   node tools/sprite-npc-facing.mjs
//
// NPC sheets are single multi-column images, unlike the enemy sheets which are
// one file per frame, so they have to be sliced before measuring. Each
// character gets two independent readings — its idle sheet and its walk
// sheet — and the two are expected to agree, because both are drawn from the
// same source art. Agreement is what makes a verdict trustworthy here: the
// idle sheets alone were too ambiguous to act on.
//
// The head-side metric and the player goblin are the calibration: the goblin
// is known to face right, so a positive number means "same way as the player".
//
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

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

/**
 * Which side of its bounding box the head sits on, as a fraction of the bbox
 * width. Positive => head right of centre => art faces right.
 */
function headSide(img) {
  const { width, height, channels, data } = img;
  const a = new Float32Array(width * height);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
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

const BASE = "public/img/gothicvania/town";
// Frame geometry mirrors the Npc definitions in src/game/{scenes,world}.ts.
const CHARACTERS = {
  bearded: { fw: 40, fh: 47, idle: 5, walk: 6 },
  "hat-man": { fw: 39, fh: 52, idle: 4, walk: 6 },
  oldman: { fw: 34, fh: 42, idle: 8, walk: 12 },
  woman: { fw: 37, fh: 46, idle: 7, walk: 6 },
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const pct = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

function measure(sheet, count, geo) {
  const img = decodePng(readFileSync(`${BASE}/${sheet}.png`));
  const scores = [];
  for (let i = 0; i < count; i++) {
    const s = headSide(sliceFrame(img, i, geo.fw, geo.fh));
    if (s !== null) scores.push(s);
  }
  if (!scores.length) return null;
  const m = mean(scores);
  // Frame-to-frame agreement: how consistently the sign holds across the cycle.
  const agree = scores.filter((s) => Math.sign(s) === Math.sign(m)).length / scores.length;
  return { mean: m, agree, n: scores.length, scores };
}

for (const [name, geo] of Object.entries(CHARACTERS)) {
  const idle = measure(`${name}-idle`, geo.idle, geo);
  const walk = measure(`${name}-walk`, geo.walk, geo);
  if (!idle || !walk) {
    console.log(`${name}: missing data`);
    continue;
  }
  // Both sheets show the same character, so they should point the same way.
  const agree = Math.sign(idle.mean) === Math.sign(walk.mean);
  const combined = mean([idle.mean, walk.mean]);
  const strong = agree && Math.abs(combined) > 0.03;
  console.log(
    `${name.padEnd(8)} idle=${pct(idle.mean).padStart(6)} (${(idle.agree * 100).toFixed(0)}% agree)  ` +
      `walk=${pct(walk.mean).padStart(6)} (${(walk.agree * 100).toFixed(0)}% agree)  ` +
      `=> ${combined > 0 ? "faces RIGHT" : "faces LEFT"}` +
      `${strong ? "" : "   (sheets disagree - needs a human look)"}`,
  );
}
