import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMine, moveMiner } from './mining.js';
import { minePairProgress, mineRouteHint } from './mine-exploration.js';

test('pairs: inventory, finished work and work in progress retain the same source identity', () => {
  const state = { inventory: [{ id: 'C1-L' }], pieces: [], crafting: { materialId: 'C1-R' }, mineVeins: [[true, true]], pendingDrops: [] };
  assert.equal(minePairProgress(state, 'C1').recovered, 2);
  state.crafting = null; state.pieces = [{ id: 'C1-R' }];
  assert.equal(minePairProgress(state, 'C1').recovered, 2);
  state.pieces = []; state.pendingDrops = [{ id: 'C1-R' }];
  assert.deepEqual(minePairProgress(state, 'C1'), { extracted: 2, recovered: 1, pending: 1, stones: [{ id: 'C1-L', recovered: true }, { id: 'C1-R', recovered: false }] });
});

test('route hints: entrance, upper passage and destination ladder give walkable directions', () => {
  const world = generateMine(), cluster = world.clusters[0];
  assert.match(mineRouteHint(world, world.spawn, cluster), /↑/);
  assert.match(mineRouteHint(world, { x: 176, y: 192 }, cluster), /→/);
  assert.match(mineRouteHint(world, { x: 240, y: 192 }, cluster), /↓/);
  assert.match(mineRouteHint(world, { x: 240, y: 384 }, cluster), /侧灯观察/);
});

test('main catwalk: all intervening shafts can be crossed and S still descends at the selected ladder', () => {
  const world = generateMine();
  for (const ladder of world.ladders.filter(item => item.id !== 'entrance')) {
    let body = { x: 176, y: 192, velocityY: 0, climbing: true };
    const frames = Math.round((ladder.x - 176) / (176 * .016));
    for (let frame = 0; frame < frames; frame++) body = moveMiner(body, { x: 1, y: 0 }, 16, world);
    assert.ok(Math.abs(body.x - ladder.x) < 2, `${ladder.id} x=${body.x}`);
    assert.ok(body.y <= 288, `${ladder.id} fell into an earlier shaft`);
    for (let frame = 0; frame < 450; frame++) body = moveMiner(body, { x: 0, y: 1 }, 16, world);
    assert.equal(body.x, ladder.x);
    assert.equal(body.y, ladder.bottom);
    assert.equal(world.canStand(body.x, body.y), true);
  }
  const jumped = moveMiner({ x: 816, y: 288, velocityY: 0, climbing: false }, { x: 0, y: 0, jump: true }, 16, world);
  assert.ok(jumped.y < 288 && jumped.velocityY < 0);
});
