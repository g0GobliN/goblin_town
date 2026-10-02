// Dev utility: is the NPC facing verdict robust, or an artifact of one
// arbitrary measurement parameter?
//
//   node tools/sprite-npc-sensitivity.mjs
//
// The head-side metric needs a "how much of the top counts as the head"
// fraction. That choice is arbitrary, so a verdict that only holds for one
// value of it is not trustworthy. This sweeps the fraction and reports how
// many settings agree with the character's overall reading, per sheet.
//
// A sheet whose verdict survives the sweep can be acted on. One that flips
// sign as the window changes is genuinely ambiguous and needs a human look.
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

/** Head-side score for one frame at a given head-window fraction. */
function headSide(img, headFraction) {
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
  const headRows = Math.max(1, Math.round(bh * headFraction));
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
const CHARACTERS = {
  "player idle (reference)": { file: null, fw: 0, fh: 0, count: 4, ref: "goblin/idle" },
  bearded: { fw: 40, fh: 47, idle: 5, walk: 6 },
  "hat-man": { fw: 39, fh: 52, idle: 4, walk: 6 },
  oldman: { fw: 34, fh: 42, idle: 8, walk: 12 },
  woman: { fw: 37, fh: 46, idle: 7, walk: 6 },
};

const FRACTIONS = [0.12, 0.16, 0.2, 0.22, 0.26, 0.3, 0.34, 0.4];
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const pct = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

// Calibration reference: the player goblin, one file per frame, known RIGHT.
function reference() {
  const out = [];
  for (const f of FRACTIONS) {
    const vals = [];
    for (let i = 1; i <= 4; i++) {
      const s = headSide(
        decodePng(readFileSync("public/img/gothicvania/player/goblin/idle" + i + ".png")),
        f,
      );
      if (s !== null) vals.push(s);
    }
    out.push(mean(vals));
  }
  return out;
}

const ref = reference();
const refSign = Math.sign(mean(ref));
console.log("player idle (reference, known RIGHT):");
console.log("  " + FRACTIONS.map((f, i) => `${f}:${pct(ref[i])}`).join("  "));
console.log();

for (const [name, geo] of Object.entries(CHARACTERS)) {
  if (geo.ref) continue;
  for (const kind of ["idle", "walk"]) {
    const img = decodePng(readFileSync(`${BASE}/${name}-${kind}.png`));
    const count = kind === "idle" ? geo.idle : geo.walk;
    const readings = FRACTIONS.map((f) => {
      const vals = [];
      for (let i = 0; i < count; i++) {
        const s = headSide(sliceFrame(img, i, geo.fw, geo.fh), f);
        if (s !== null) vals.push(s);
      }
      return mean(vals);
    });
    const m = mean(readings);
    const agree = readings.filter((r) => Math.sign(r) === Math.sign(m)).length;
    const sameAsRef = readings.filter((r) => Math.sign(r) === refSign).length;
    const verdict = m > 0 ? "RIGHT" : "LEFT";
    const robust = agree === readings.length;
    console.log(
      `${(name + "-" + kind).padEnd(14)} ${verdict.padEnd(5)} ` +
        `${agree}/${readings.length} settings agree  ` +
        `${sameAsRef}/${readings.length} match player  ` +
        `${robust ? "ROBUST" : "UNSTABLE"}  [${readings.map(pct).join(" ")}]`,
    );
  }
}
