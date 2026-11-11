// The same grid drives visible surface removal and progress, including the hole.
export const SURFACE_SIZE = 240;
export const FINISH_THRESHOLD = 0.75;

export class PolishingSurface {
  constructor() {
    this.valid = new Uint8Array(SURFACE_SIZE * SURFACE_SIZE);
    this.covered = new Uint8Array(this.valid.length);
    this.total = 0;
    this.count = 0;
    for (let y = 0; y < SURFACE_SIZE; y++) {
      for (let x = 0; x < SURFACE_SIZE; x++) {
        const radius = Math.hypot(x + 0.5 - 120, y + 0.5 - 120);
        if (radius >= 39 && radius <= 106) {
          this.valid[y * SURFACE_SIZE + x] = 1;
          this.total++;
        }
      }
    }
  }

  get progress() { return this.count / this.total; }

  reset() {
    this.covered.fill(0);
    this.count = 0;
  }

  stroke(from, to, radius = 12) {
    if (![from.x, from.y, to.x, to.y, radius].every(Number.isFinite) || radius <= 0) return;
    const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
    const right = Math.min(SURFACE_SIZE - 1, Math.ceil(Math.max(from.x, to.x) + radius));
    const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
    const bottom = Math.min(SURFACE_SIZE - 1, Math.ceil(Math.max(from.y, to.y) + radius));
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const index = y * SURFACE_SIZE + x;
        if (!this.valid[index] || this.covered[index]) continue;
        const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
          ((x + 0.5 - from.x) * dx + (y + 0.5 - from.y) * dy) / lengthSquared));
        const distance = Math.hypot(x + 0.5 - from.x - projection * dx, y + 0.5 - from.y - projection * dy);
        if (distance <= radius) {
          this.covered[index] = 1;
          this.count++;
        }
      }
    }
  }
}
