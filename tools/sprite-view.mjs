// Dev utility: print every frame of a sheet as a downsampled ASCII silhouette,
// stacked vertically, so facing can be judged by eye.
//
//   node tools/sprite-view.mjs <png> [frameWidth] [step]
//
// Statistics have repeatedly disagreed with the eye on this art, so this just
// draws the pixels. Uses alpha only (no shading) because these sprites are dark
// and luminance shading made them unreadable.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

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
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
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

const CH = [" ", ".", ":", "*", "#", "@"];

const [file, fwArg, stepArg, mirrorArg] = process.argv.slice(2);
if (!file) {
  console.error("usage: node tools/sprite-view.mjs <png> [frameWidth] [step] [--mirror]");
  process.exit(1);
}
let img = decodePng(readFileSync(file));
if (mirrorArg === "--mirror") img = mirror(img);
const fw = Number(fwArg) || img.width;
const step = Math.max(1, Number(stepArg) || 2);
const cols = Math.max(1, Math.floor(img.width / fw));

console.log(
  `${file}${mirrorArg === "--mirror" ? " (mirrored)" : ""}  ${img.width}x${img.height}  fw=${fw} cols=${cols} step=${step}`,
);

for (let f = 0; f < cols; f++) {
  const sx0 = f * fw;
  console.log(`\n--- frame ${f} ---`);
  for (let y = 0; y < img.height; y += step) {
    let line = "";
    for (let x = sx0; x < sx0 + fw && x < img.width; x += step) {
      let best = 0;
      for (let dy = 0; dy < step && y + dy < img.height; dy++) {
        for (let dx = 0; dx < step && x + dx < img.width && sx0 + x + dx < img.width; dx++) {
          const p = (y + dy) * img.width + (sx0 + x + dx);
          const a = img.channels === 4 ? img.data[p * 4 + 3] : 255;
          if (a > best) best = a;
        }
      }
      line += CH[Math.min(CH.length - 1, Math.floor((best / 255) * CH.length))];
    }
    console.log(line.replace(/\s+$/, ""));
  }
}
