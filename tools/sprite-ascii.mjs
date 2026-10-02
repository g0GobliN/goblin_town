// Dev utility: print sprite frames as ASCII art so facing can be judged by eye.
//
//   node tools/sprite-ascii.mjs <png> [frameWidth] [cols]
//
// Statistics have repeatedly disagreed with the eye on this art, so this just
// draws the pixels. Shading: darker = denser, ' ' = transparent.
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

const RAMP = " .:-=+*#%@";

const [file, fwArg, colsArg] = process.argv.slice(2);
if (!file) {
  console.error("usage: node tools/sprite-ascii.mjs <png> [frameWidth] [maxCols]");
  process.exit(1);
}
const img = decodePng(readFileSync(file));
const fw = Number(fwArg) || img.width;
const cols = Number(colsArg) || Math.floor(img.width / fw);
console.log(`${file}  ${img.width}x${img.height}  frameWidth=${fw}  cols=${cols}`);

for (let f = 0; f < cols; f++) {
  const sx0 = f * fw;
  if (sx0 >= img.width) break;
  console.log(`\n--- frame ${f} ---`);
  for (let y = 0; y < img.height; y++) {
    let line = "";
    for (let x = sx0; x < sx0 + fw && x < img.width; x++) {
      const p = y * img.width + x;
      let a;
      let lum;
      if (img.channels === 4) {
        a = img.data[p * 4 + 3];
        lum =
          (img.data[p * 4] * 0.3 + img.data[p * 4 + 1] * 0.59 + img.data[p * 4 + 2] * 0.11) / 255;
      } else {
        a = 255;
        lum =
          (img.data[p * 3] * 0.3 + img.data[p * 3 + 1] * 0.59 + img.data[p * 3 + 2] * 0.11) / 255;
      }
      if (a <= 24) {
        line += " ";
        continue;
      }
      const v = Math.min(9, Math.round(lum * 9 * Math.min(1, a / 255)));
      line += RAMP[v];
    }
    console.log(line.replace(/\s+$/, ""));
  }
}
