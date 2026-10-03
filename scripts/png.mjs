// PNG without packages: only what the slices need. An image is read into raw rows, and a slice of the rows is written as a new image.
// It only cuts along the height, so every pixel in a slice is the same as in the original.

import { closeSync, existsSync, openSync, readSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// Channels per colour type: greyscale, RGB, palette, greyscale with alpha, RGB with alpha.
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, content) {
  const b = Buffer.alloc(12 + content.length);
  b.writeUInt32BE(content.length, 0);
  b.write(type, 4, "latin1");
  content.copy(b, 8);
  b.writeUInt32BE(crc(b.subarray(4, 8 + content.length)), 8 + content.length);
  return b;
}

// Width and height are in the file's first 24 bytes. null if the file is not a PNG.
export function imageSize(file) {
  const b = Buffer.alloc(24), fd = openSync(file, "r");
  try { readSync(fd, b, 0, 24, 0); } finally { closeSync(fd); }
  return b.subarray(0, 8).equals(SIGNATURE) && b.toString("latin1", 12, 16) === "IHDR" ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } : null;
}

// Reads a PNG into raw rows (without filter). The palette and colour information come along, so a slice looks like the original.
export function readPng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("the file is not a PNG");
  let header = null;
  const data = [], others = [];
  for (let p = 8; p + 12 <= buf.length;) {
    const length = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8);
    if (type === "IEND") break;
    if (type === "IHDR") header = buf.subarray(p + 8, p + 8 + length);
    else if (type === "IDAT") data.push(buf.subarray(p + 8, p + 8 + length));
    else if (!data.length) others.push(buf.subarray(p, p + 12 + length));
    p += 12 + length;
  }
  if (!header || header.length < 13 || !data.length) throw new Error("the PNG file is missing its header or image data");
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4), bits = header[8], colour = header[9];
  if (!(colour in CHANNELS)) throw new Error(`unknown colour type (${colour})`);
  if (header[12]) throw new Error("the image is saved with interlace and cannot be cut");
  const bitsPerPixel = CHANNELS[colour] * bits, bpp = Math.max(1, bitsPerPixel >> 3), row = Math.ceil((width * bitsPerPixel) / 8);
  const raw = inflateSync(Buffer.concat(data));
  if (raw.length < height * (row + 1)) throw new Error("the image data is shorter than the image's size");
  const pixels = Buffer.alloc(height * row);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (row + 1)], from = y * (row + 1) + 1, to = y * row, above = to - row;
    if (filter > 4) throw new Error(`unknown filter (${filter}) in row ${y}`);
    for (let x = 0; x < row; x++) {
      // a is the pixel to the left, b the pixel above, c the pixel above to the left. Outside the image they are 0.
      const a = x >= bpp ? pixels[to + x - bpp] : 0, b = y ? pixels[above + x] : 0;
      let v = raw[from + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const c = x >= bpp && y ? pixels[above + x - bpp] : 0, p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[to + x] = v;
    }
  }
  return { width, height, row, bpp, header, others, pixels };
}

// Writes the rows from `from` up to (not including) `to` as a PNG. Each row gets whichever of the filters none, left and above gives the smallest numbers.
export function writePng(png, from = 0, to = png.height) {
  const { row, bpp, pixels } = png, height = to - from;
  if (!(from >= 0 && to <= png.height && height > 0)) throw new Error(`the slice ${from} to ${to} lies outside the image (${png.height} px tall)`);
  const raw = Buffer.alloc(height * (row + 1)), f = [Buffer.alloc(row), Buffer.alloc(row), Buffer.alloc(row)];
  const weight = (v) => (v < 128 ? v : 256 - v);
  for (let y = 0; y < height; y++) {
    const start = (from + y) * row;
    let s0 = 0, s1 = 0, s2 = 0;
    for (let x = 0; x < row; x++) {
      // The first row in the slice has no row above it, even when the original has.
      const v = pixels[start + x], v1 = (v - (x >= bpp ? pixels[start + x - bpp] : 0)) & 255, v2 = (v - (y ? pixels[start - row + x] : 0)) & 255;
      f[0][x] = v; f[1][x] = v1; f[2][x] = v2;
      s0 += weight(v); s1 += weight(v1); s2 += weight(v2);
    }
    const best = s1 <= s0 && s1 <= s2 ? 1 : s2 <= s0 ? 2 : 0;
    raw[y * (row + 1)] = best;
    f[best].copy(raw, y * (row + 1) + 1);
  }
  const header = Buffer.from(png.header);
  header.writeUInt32BE(height, 4);
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), ...png.others, chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- slices ----------

// A slice must be viewable without being scaled down: about 1.15 million pixels and at most 1500 px on the long side.
// That gives slices at most 800 px tall of a 1440 px image and at most 1500 px of a 390 px one.
export const OVERLAP = 100;
export const sliceHeight = (width) => Math.min(1500, Math.max(600, Math.round(1_150_000 / width / 100) * 100));
// Where the image is cut: [from, to] from top to bottom. The slices are equally tall, each begins 100 px before the previous one ends,
// so nothing is only half seen, and the last ends at the bottom. An image at most one and a half times as tall as a slice is not cut.
export function slicePlan(width, height) {
  const h = sliceHeight(width);
  if (height <= 1.5 * h) return [];
  const count = Math.ceil((height - OVERLAP) / (h - OVERLAP)), each = Math.ceil((height + (count - 1) * OVERLAP) / count);
  return Array.from({ length: count }, (_, i) => { const from = Math.min(i * (each - OVERLAP), height - each); return [from, from + each]; });
}
// The slices in <out>/slices for an image, from top to bottom.
export function slicesOf(out, image) {
  const folder = join(out, "slices"), stem = `${image.replace(/\.png$/i, "")}-`;
  if (!existsSync(folder)) return [];
  const nr = (f) => Number(f.slice(stem.length, -4));
  return readdirSync(folder).filter((f) => f.startsWith(stem) && /^\d+\.png$/.test(f.slice(stem.length))).sort((a, b) => nr(a) - nr(b));
}
