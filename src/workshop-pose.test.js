import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOP_BENCH, WORKSHOP_MASTER } from './workshop-pose.js';

test('the table edge occludes the bottom of the standing portrait', () => {
  const [[left, bottom], [right, top]] = WORKSHOP_BENCH;
  const rearEdgeY = x => bottom + (top - bottom) * (x - left) / (right - left);
  const { x, y, width, height } = WORKSHOP_MASTER;
  assert.ok(x > left && x + width < right);
  assert.ok(y < rearEdgeY(x + width));
  assert.ok(y + height > rearEdgeY(x));
});
