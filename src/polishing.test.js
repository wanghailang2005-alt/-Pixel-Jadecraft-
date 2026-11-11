import test from 'node:test';
import assert from 'node:assert/strict';
import { PolishingSurface, FINISH_THRESHOLD } from './polishing.js';

test('polishing excludes the hole and the area outside the jade', () => {
  const surface = new PolishingSurface();
  surface.stroke({ x: 120, y: 120 }, { x: 120, y: 120 });
  surface.stroke({ x: 0, y: 0 }, { x: 0, y: 0 });
  assert.equal(surface.progress, 0);
  surface.stroke({ x: 190, y: 120 }, { x: 190, y: 120 });
  assert.ok(surface.progress > 0);
});

test('repeated strokes do not add progress and reset removes all coverage', () => {
  const surface = new PolishingSurface();
  const from = { x: 120, y: 30 }, to = { x: 120, y: 210 };
  surface.stroke(from, to);
  const count = surface.count;
  surface.stroke(from, to);
  surface.stroke(to, from);
  assert.equal(surface.count, count);
  surface.reset();
  assert.equal(surface.count, 0);
  assert.equal(surface.covered.some(Boolean), false);
});

test('fast continuous strokes cover the same grid as subdivided strokes', () => {
  const fast = new PolishingSurface(), slow = new PolishingSurface();
  fast.stroke({ x: -30, y: 70 }, { x: 270, y: 70 });
  for (let x = -30; x < 270; x += 10) {
    slow.stroke({ x, y: 70 }, { x: x + 10, y: 70 });
  }
  assert.deepEqual(fast.covered, slow.covered);
});

test('full sweep reaches exactly 100 percent and invalid strokes are ignored', () => {
  const surface = new PolishingSurface();
  surface.stroke({ x: NaN, y: 0 }, { x: 10, y: 10 });
  surface.stroke({ x: 0, y: 0 }, { x: 10, y: 10 }, -2);
  assert.equal(surface.count, 0);
  for (let y = 0; y <= 240; y += 12) {
    surface.stroke({ x: -12, y }, { x: 252, y });
  }
  assert.equal(surface.count, surface.total);
  assert.equal(surface.progress, 1);
  assert.ok(surface.progress >= FINISH_THRESHOLD);
});
