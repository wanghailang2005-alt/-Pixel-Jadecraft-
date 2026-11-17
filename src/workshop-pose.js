export const WORKSHOP_POSES = Object.freeze([
  Object.freeze({ lift: 0, masterY: 1, impact: true }),
  Object.freeze({ lift: -2, masterY: 0, impact: false }),
  Object.freeze({ lift: -4, masterY: 0, impact: false }),
  Object.freeze({ lift: -1, masterY: 0, impact: false }),
]);

export function workshopPose(phase = 0) {
  const index = ((Number(phase) % WORKSHOP_POSES.length) + WORKSHOP_POSES.length) % WORKSHOP_POSES.length;
  return WORKSHOP_POSES[index];
}
