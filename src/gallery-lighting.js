export const GALLERY_SPOTLIGHTS = Object.freeze([
  Object.freeze({ x: 320, top: 96, bottom: 310, width: 64 }),
  Object.freeze({ x: 480, top: 132, bottom: 380, width: 78 }),
  Object.freeze({ x: 640, top: 96, bottom: 310, width: 64 }),
]);

export const GALLERY_CASES = Object.freeze([
  Object.freeze({ index: 0, x: 320, y: 310 }),
  Object.freeze({ index: 1, x: 480, y: 380 }),
  Object.freeze({ index: 2, x: 640, y: 310 }),
]);

const SHAPES = Object.freeze({ bi: '玉璧', fish: '玉鱼佩', seal: '玉印' });

export function galleryPlaqueData(piece, materials = {}) {
  if (!piece) return Object.freeze({ title: '空展位', meta: '尚未陈列', finish: '选择作品陈列' });
  const material = String(materials[piece.material]?.name ?? materials[piece.material] ?? '玉材').replace(/原石$/u, '');
  const finish = piece.artisan?.finish === 'satin' ? '柔光抛磨' : piece.artisan?.finish === 'gloss' ? '高光推亮' : '雕纹成器';
  return Object.freeze({
    title: `${material} · ${SHAPES[piece.shape] ?? '玉器'}`,
    meta: `${material} · ${SHAPES[piece.shape] ?? '玉器'}`,
    finish,
  });
}

const BREATH = Object.freeze([1, .86, .94, .88]);

export function spotlightFrame(phase = 0) {
  const index = ((Number(phase) % BREATH.length) + BREATH.length) % BREATH.length;
  return BREATH[index];
}
