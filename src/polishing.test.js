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

test('fish surface includes the body and tail while keeping surrounding space outside', () => {
  const surface = new PolishingSurface('fish');
  const valid = (x, y) => surface.valid[y * 240 + x];
  assert.equal(valid(100, 120), 1);
  assert.equal(valid(210, 80), 1);
  assert.equal(valid(210, 160), 1);
  assert.equal(valid(25, 120), 0);
  assert.equal(valid(180, 60), 0);
  assert.equal(valid(120, 30), 0);
});

test('seal surface includes the rectangular base and knob with empty shoulders', () => {
  const surface = new PolishingSurface('seal');
  const valid = (x, y) => surface.valid[y * 240 + x];
  assert.equal(valid(120, 80), 1);
  assert.equal(valid(60, 180), 1);
  assert.equal(valid(180, 180), 1);
  assert.equal(valid(60, 80), 0);
  assert.equal(valid(200, 180), 0);
  assert.equal(valid(120, 210), 0);
});

for (const shape of ['fish', 'seal']) {
  test(`${shape} repeated strokes preserve counts and full coverage keeps its mask on restore`, () => {
    const surface = new PolishingSurface(shape);
    const from = { x: 20, y: 120 }, to = { x: 220, y: 120 };
    surface.stroke(from, to);
    const count = surface.count;
    surface.stroke(from, to);
    surface.stroke(to, from);
    assert.equal(surface.count, count);
    for (let y = 0; y <= 240; y += 12) surface.stroke({ x: -12, y }, { x: 252, y });
    assert.equal(surface.progress, 1);
    assert.equal(surface.covered.length, 57600);
    assert.equal(surface.covered.some((covered, index) => covered && !surface.valid[index]), false);
    const packed = new Uint8Array(7200);
    surface.covered.forEach((covered, index) => {
      if (covered) packed[index >> 3] |= 1 << (index & 7);
    });
    const restored = new PolishingSurface(shape);
    restored.valid.forEach((valid, index) => {
      if (valid && packed[index >> 3] & (1 << (index & 7))) {
        restored.covered[index] = 1;
        restored.count++;
      }
    });
    assert.deepEqual(restored.covered, surface.covered);
    assert.equal(restored.progress, 1);
    restored.reset();
    assert.equal(restored.progress, 0);
  });
}
