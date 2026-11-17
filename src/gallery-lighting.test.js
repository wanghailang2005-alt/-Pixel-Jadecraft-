import test from 'node:test';
import assert from 'node:assert/strict';
import { GALLERY_SPOTLIGHTS, spotlightFrame } from './gallery-lighting.js';

test('gallery keeps three spotlight cones aligned with the three display plinths', () => {
  assert.equal(GALLERY_SPOTLIGHTS.length, 3);
  assert.deepEqual(GALLERY_SPOTLIGHTS.map(({ x, bottom }) => [x, bottom]), [[320, 310], [480, 380], [640, 310]]);
  assert.ok(GALLERY_SPOTLIGHTS.every(light => light.top < light.bottom && light.width > 0));
});

test('gallery spotlight breathing wraps safely and keeps reduced-motion baseline stable', () => {
  assert.equal(spotlightFrame(0), 1);
  assert.equal(spotlightFrame(4), spotlightFrame(0));
  assert.equal(spotlightFrame(-1), .88);
  assert.ok(spotlightFrame(2) < 1);
});
