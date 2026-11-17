import fs from 'node:fs/promises';
import zlib from 'node:zlib';

const WIDTH = 80, HEIGHT = 64, TILE_SIZE = 16;
const palettes = {
  dirt: ['#25333a', '#344447', '#3d5150', '#50615a', '#202e35'],
  stone: ['#182832', '#2b3a42', '#374a53', '#4a5a62', '#101c27'],
  jade: ['#102f2b', '#287d5a', '#42be84', '#8ce8a9', '#d2f4c9'],
  bedrock: ['#101c25', '#182a34', '#20353f', '#29424b', '#111f28'],
};

const rgba = hex => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16)).concat(255);
const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
const set = (x, y, color) => {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 4; pixels.set(rgba(color), i);
};
const rect = (x, y, width, height, color) => {
  for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) set(xx, yy, color);
};
const hash = (x, y, variant, tile) => (Math.imul(x + 157 + variant * 11, 374761393) ^ Math.imul(y + 29 + tile * 17, 668265263)) >>> 0;

for (let variant = 0; variant < 4; variant++) {
  for (let tile = 0; tile < 5; tile++) {
    const ox = tile * TILE_SIZE, oy = variant * TILE_SIZE;
    if (tile === 0) continue;
    const key = tile === 1 ? 'dirt' : tile === 2 ? 'stone' : tile === 3 ? 'jade' : 'bedrock';
    const colors = palettes[key];
    rect(ox, oy, TILE_SIZE, TILE_SIZE, colors[0]);
    for (let band = 0; band < 4; band++) {
      const seed = hash(band * 3, variant * 5, variant, tile);
      const x = ox + (seed % 9) - 1, y = oy + band * 4 + (seed % 2);
      rect(x, y, 5 + seed % 6, 2, colors[1 + seed % 2]);
      rect(x + 2, y + 2, 4 + seed % 5, 1, colors[3]);
      if (seed % 3 === 0) rect(x + 7, y + 3, 2, 1, colors[4]);
    }
    for (let y = 1; y < TILE_SIZE; y += 3) for (let x = 1; x < TILE_SIZE; x += 3) {
      const seed = hash(x, y, variant, tile);
      if (seed % 19 === 0) rect(ox + x, oy + y, seed % 3 + 1, 1, colors[2]);
    }
    if (tile === 3) {
      rect(ox + 2, oy + 10, 3, 3, colors[1]); rect(ox + 5, oy + 6, 3, 5, colors[2]);
      rect(ox + 8, oy + 3, 3, 4, colors[3]); rect(ox + 10, oy + 2, 2, 2, colors[4]);
      rect(ox + 8, oy + 9, 4, 2, colors[2]); rect(ox + 6, oy + 11, 3, 2, colors[3]);
    }
    if (tile === 1 && variant % 2 === 0) { rect(ox, oy, TILE_SIZE, 2, '#6e8950'); rect(ox + 2, oy + 2, 5, 2, '#3e6b45'); }
    if (tile === 4 && variant === 3) { rect(ox + 2, oy + 2, 2, 2, colors[3]); rect(ox + 11, oy + 11, 3, 2, colors[1]); }
  }
}

const chunk = (type, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); return Buffer.concat([length, Buffer.from(type), data, crc(Buffer.concat([Buffer.from(type), data]) )]); };
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(data) { let c = 0xffffffff; for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); const result = Buffer.alloc(4); result.writeUInt32BE((c ^ 0xffffffff) >>> 0); return result; }
const scanlines = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
for (let y = 0; y < HEIGHT; y++) { scanlines[y * (WIDTH * 4 + 1)] = 0; Buffer.from(pixels.buffer, y * WIDTH * 4, WIDTH * 4).copy(scanlines, y * (WIDTH * 4 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(WIDTH, 0); ihdr.writeUInt32BE(HEIGHT, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'binary'), chunk('IHDR', ihdr), chunk('tEXt', Buffer.from('Software\0Pixel Jadecraft deterministic atlas generator')), chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
await fs.writeFile(new URL('../src/assets/tiles-mine.png', import.meta.url), png);
console.log(`generated ${WIDTH}x${HEIGHT} atlas (${png.length} bytes, 20 frames)`);
