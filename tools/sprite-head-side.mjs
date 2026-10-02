// Dev utility: report which side of its bounding box a sprite's HEAD sits on.
//
//   node tools/sprite-head-side.mjs
//
// A side-view character looks the way its head is offset: head mass to the
// right of the body centre => art faces RIGHT. Works for bipeds (ghoul,
// skeleton, townsfolk) and quadrupeds (hell-gato) alike, and is far more
// reliable than eyeballing a walk cycle.
//
// The player goblin is the calibration reference: its art is known to face
// right, so a positive number here means "same side as the player".
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

/**
 * Head-side score for one frame, as a fraction of the opaque bbox width.
 * Positive => head sits right of centre, negative => left of centre.
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
    if (v > 24) {
      a[p] = v;
      const x = p % width;
      const y = (p / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const centre = minX + (bw - 1) / 2;

  // The head is the top slice of the silhouette.
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
  return { score: (sx / n - centre) / bw, bw, bh, headRows };
}

const BASE = "public/img/gothicvania";
const SHEETS = {
  "player idle  (reference)": [4, `${BASE}/player/goblin/idle`],
  "player walk  (reference)": [8, `${BASE}/player/goblin/walk`],
  ghoul: [8, `${BASE}/church/ghoul/burning-ghoul`],
  ghost: [4, `${BASE}/cemetery/ghost/ghost-`],
  skeleton: [8, `${BASE}/cemetery/skeleton/skeleton-`],
  hound: [4, `${BASE}/cemetery/hell-gato/hell-gato-`],
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

for (const [name, [count, prefix]] of Object.entries(SHEETS)) {
  const scores = [];
  for (let i = 1; i <= count; i++) {
    const s = headSide(decodePng(readFileSync(`${prefix}${i}.png`)));
    if (s) scores.push(s);
  }
  if (!scores.length) continue;
  const m = mean(scores.map((s) => s.score));
  // Sign agreement across frames tells us how trustworthy the reading is.
  const agree = scores.filter((s) => Math.sign(s.score) === Math.sign(m)).length / scores.length;
  const pct = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
  console.log(
    `${name.padEnd(26)} n=${scores.length} bbox=${scores[0].bw}x${scores[0].bh} ` +
      `headSide mean=${pct(m).padStart(6)}  frames=[${scores.map((s) => pct(s.score)).join(" ")}]  ` +
      `agree=${(agree * 100).toFixed(0)}%  => ${m > 0 ? "faces RIGHT" : "faces LEFT"}`,
  );
}
