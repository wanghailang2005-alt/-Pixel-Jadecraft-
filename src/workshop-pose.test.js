import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOP_CONTACT, WORKSHOP_POSES, WORKSHOP_PORTRAIT, workshopPose } from './workshop-pose.js';

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

test('workshop contact anchor keeps the overlay on the authored jade and table edge', () => {
  assert.deepEqual(WORKSHOP_CONTACT, {
    x: 355, y: 307, shadowX: 337, shadowY: 310, shadowWidth: 37, tableEdgeY: 324,
  });
  assert.ok(WORKSHOP_CONTACT.shadowX < WORKSHOP_CONTACT.x);
  assert.ok(WORKSHOP_CONTACT.shadowX + WORKSHOP_CONTACT.shadowWidth > WORKSHOP_CONTACT.x);
  assert.ok(WORKSHOP_CONTACT.tableEdgeY > WORKSHOP_CONTACT.y);
});

test('workshop portrait uses a larger anchored lean for the narrow first screen', () => {
  assert.deepEqual(WORKSHOP_PORTRAIT, { x: 355, y: 307, width: 68, height: 124, rotation: -.12 });
  assert.equal(WORKSHOP_PORTRAIT.y, WORKSHOP_CONTACT.y);
  assert.ok(WORKSHOP_PORTRAIT.height > WORKSHOP_PORTRAIT.width);
});
