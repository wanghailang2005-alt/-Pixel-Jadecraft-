import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOP_POSES, workshopPose } from './workshop-pose.js';

test('workshop pose table keeps four contact phases and wraps safely', () => {
  assert.equal(WORKSHOP_POSES.length, 4);
  assert.deepEqual(workshopPose(0), { lift: 0, masterY: 1, impact: true });
  assert.equal(workshopPose(4), workshopPose(0));
  assert.equal(workshopPose(-1), workshopPose(3));
});

test('only the contact phase emits a jade chip impact', () => {
  assert.equal(WORKSHOP_POSES.filter(pose => pose.impact).length, 1);
  assert.deepEqual(WORKSHOP_POSES.map(pose => pose.lift), [0, -2, -4, -1]);
});
