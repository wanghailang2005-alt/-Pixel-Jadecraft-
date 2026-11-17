import test from 'node:test';
import assert from 'node:assert/strict';
import { museumArtProfile, museumCasePositions } from './museum-art.js';

test('museum art profiles are deterministic and keyed by the exhibit identity', () => {
  const first = museumArtProfile({ id: 'heritage-jadeite-cabbage', shape: 'cabbage' });
  const repeat = museumArtProfile({ id: 'heritage-jadeite-cabbage', shape: 'cabbage' });
  const other = museumArtProfile({ id: 'heritage-yu-mountain', shape: 'mountain' });

  assert.deepEqual(first, repeat);
  assert.notEqual(first.seed, other.seed);
  assert.equal(first.texture, 'carved-relief');
  assert.equal(first.optics, 'pixel-side-light-scatter');
  assert.ok(Number.isInteger(first.version));
});

test('raw material profiles retain mineral grain while carved forms use relief texture', () => {
  assert.equal(museumArtProfile({ id: 'material-jadeite', shape: 'stone' }).texture, 'mineral-grain');
  assert.equal(museumArtProfile({ id: 'heritage-cong-king', shape: 'cong' }).texture, 'carved-relief');
  assert.equal(museumArtProfile().shape, 'stone');
});

test('museum case layout keeps the compact six-slot contract', () => {
  assert.equal(museumCasePositions(3).length, 3);
  assert.deepEqual(museumCasePositions(2), [{ x: 123, y: 139 }, { x: 356, y: 139 }]);
  assert.equal(museumCasePositions(9).length, 6);
});
