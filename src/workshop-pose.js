export const WORKSHOP_POSES = Object.freeze([
  Object.freeze({ lift: 0, masterY: 1, impact: true }),
  Object.freeze({ lift: -2, masterY: 0, impact: false }),
  Object.freeze({ lift: -4, masterY: 0, impact: false }),
  Object.freeze({ lift: -1, masterY: 0, impact: false }),
]);

// The authored v1 background has one readable jade contact on the bench. Keep
// the overlay and the four pose phases tied to this anchor so future portrait
// swaps cannot reintroduce a floating chisel or detached hand.
export const WORKSHOP_CONTACT = Object.freeze({
  x: 355,
  y: 307,
  shadowX: 337,
  shadowY: 310,
  shadowWidth: 37,
  tableEdgeY: 324,
});

// The source portrait is a transparent bust. These display metrics keep its
// feet/hands anchored to the authored jade while giving the master enough
// weight to read as the person leaning over the bench at 800×700.
export const WORKSHOP_PORTRAIT = Object.freeze({
  x: WORKSHOP_CONTACT.x,
  y: WORKSHOP_CONTACT.y,
  width: 68,
  height: 124,
  rotation: -.12,
});

export function workshopPose(phase = 0) {
  const index = ((Number(phase) % WORKSHOP_POSES.length) + WORKSHOP_POSES.length) % WORKSHOP_POSES.length;
  return WORKSHOP_POSES[index];
}
