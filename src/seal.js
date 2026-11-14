import { CRAFT_SIZE, getCraftSurface, localToCraftPoint } from './craft-model.js';

/** The rectangular foot is the contact face. A print flips this face horizontally. */
export const SEAL_FACE = Object.freeze({ left: -.28, right: .28, top: .025, bottom: .25 });
const SQUARE_FACE = Object.freeze({ left: -.30, right: .30, top: -.30, bottom: .30 });

export function createSealImpression(draft) {
  if (draft?.shape !== 'seal') throw new Error('只有玉印可以试印。');
  const surface = getCraftSurface(draft), size = CRAFT_SIZE, face = draft.sealFace ? SQUARE_FACE : SEAL_FACE;
  const ink = Array(size * size).fill(0);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const local = {
      x: face.right - (x + .5) / size * (face.right - face.left),
      y: face.top + (y + .5) / size * (face.bottom - face.top),
    };
    const world = localToCraftPoint(draft, local), px = Math.floor(world.x), py = Math.floor(world.y);
    if (px < 0 || px >= size || py < 0 || py >= size) continue;
    const index = py * size + px;
    ink[y * size + x] = Number(Boolean(surface.target[index] && surface.base[index] && surface.height[index] >= 5 && !surface.carve[index]));
  }
  return { size, ink, mirrored: true, carvedCells: draft.carve.filter(Boolean).length,
    coverage: ink.reduce((sum, value) => sum + value, 0) / ink.length };
}

/** Pixel rendering is shared by the preview and exported PNG album. */
export function drawSealImpression(context, impression, { x = 0, y = 0, size = 240, paper = true } = {}) {
  context.save();
  context.imageSmoothingEnabled = false;
  if (paper) { context.fillStyle = '#e8d1a0'; context.fillRect(x, y, size, size); }
  context.fillStyle = '#a53725';
  for (let py = 0; py < impression.size; py++) for (let px = 0; px < impression.size; px++) {
    if (!impression.ink[py * impression.size + px]) continue;
    const left = Math.round(x + px * size / impression.size), top = Math.round(y + py * size / impression.size);
    context.fillRect(left, top, Math.round(x + (px + 1) * size / impression.size) - left, Math.round(y + (py + 1) * size / impression.size) - top);
  }
  context.restore();
}

export function drawSealAlbum(canvas, impressions, title = '我的玉印 · 试印谱') {
  const proofs = impressions.slice(-4), count = Math.max(1, proofs.length);
  canvas.width = 320 * count + 64; canvas.height = 416;
  const c = canvas.getContext('2d');
  c.fillStyle = '#563723'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#e8d1a0'; c.fillRect(12, 12, canvas.width - 24, canvas.height - 24);
  c.strokeStyle = '#9f7642'; c.lineWidth = 3; c.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  c.fillStyle = '#4b3323'; c.font = '22px serif'; c.fillText(title, 44, 59);
  proofs.forEach((proof, index) => {
    drawSealImpression(c, proof, { x: 48 + index * 320, y: 86, size: 256 });
    c.fillStyle = '#65432e'; c.font = '16px serif'; c.fillText(`第 ${index + 1} 次 · 实际刀痕的镜像`, 48 + index * 320, 373);
  });
}
