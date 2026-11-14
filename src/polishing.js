// The same grid drives visible surface removal and progress, including the hole.
export const SURFACE_SIZE = 240;
export const FINISH_THRESHOLD = 0.75;

const SHAPE_MASKS = {
  bi: (x, y) => {
    const radius = Math.hypot(x - 120, y - 120);
    return radius >= 39 && radius <= 106;
  },
  fish: (x, y) => {
    const body = ((x - 100) / 74) ** 2 + ((y - 120) / 55) ** 2 <= 1;
    const tail = x >= 157 && x <= 220 && Math.abs(y - 120) <= (x - 157) * 55 / 63;
    return body || tail;
  },
  seal: (x, y) => {
    const base = x >= 45 && x <= 195 && y >= 128 && y <= 205;
    const knob = x >= 85 && x <= 155 && y >= 55 && y <= 130;
    return base || knob;
  },
};

export class PolishingSurface {
  constructor(shape = 'bi') {
    this.shape = Object.hasOwn(SHAPE_MASKS, shape) ? shape : 'bi';
    this.valid = new Uint8Array(SURFACE_SIZE * SURFACE_SIZE);
    this.covered = new Uint8Array(this.valid.length);
    this.total = 0;
    this.count = 0;
    for (let y = 0; y < SURFACE_SIZE; y++) {
      for (let x = 0; x < SURFACE_SIZE; x++) {
        if (SHAPE_MASKS[this.shape](x + 0.5, y + 0.5)) {
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
