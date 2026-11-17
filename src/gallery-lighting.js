export const GALLERY_SPOTLIGHTS = Object.freeze([
  Object.freeze({ x: 320, top: 96, bottom: 310, width: 64 }),
  Object.freeze({ x: 480, top: 132, bottom: 380, width: 78 }),
  Object.freeze({ x: 640, top: 96, bottom: 310, width: 64 }),
]);

const BREATH = Object.freeze([1, .86, .94, .88]);

export function spotlightFrame(phase = 0) {
  const index = ((Number(phase) % BREATH.length) + BREATH.length) % BREATH.length;
  return BREATH[index];
}
