import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore } from './state.js';
import { generateMine, createMining, TILE, validDigTarget, moveMiner, keyboardDigTarget } from './mining.js';
import { seamPoint, aimsAtSeam, excavationStroke, nearbySurveyCluster, minePairProgress, mineRouteHint } from './mine-exploration.js';

function session() {
  const data = new Map();
  const disk = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const store = new GameStore(disk);
  store.startNew(); store.navigate('mine');
  const world = generateMine();
  return { store, world, disk, mining: createMining(store, world) };
}

function hitFor(mining, body, target, milliseconds) {
  const hits = [];
  for (let remaining = milliseconds; remaining > 0;) {
    const delta = Math.min(16, remaining);
    const hit = mining.update(body, target, true, delta);
    if (hit) hits.push(hit);
    remaining -= delta;
  }
  return hits;
}

test('survey: only near the actual rock face; top corridor and inactive scene do not reveal it', () => {
  const { store, world, mining } = session();
  assert.equal(nearbySurveyCluster(world, { x: 240, y: 192 }), null);
  assert.equal(mining.observe(world.spawn), null);
  const body = { x: 240, y: 384 };
  assert.equal(mining.observe(body).cluster.id, 'C1');
  assert.equal(mining.observed('C1'), true);
  assert.equal(mining.observe(body).first, false);
  store.navigate('workshop');
  assert.equal(mining.observe(body), null);
});

test('survey and a waiting stone survive disk reload without duplicating the finite source', () => {
  const { store, world, disk, mining } = session();
  world.map[11][9] = TILE.AIR; world.map[10][9] = TILE.AIR;
  const body = { x: 304, y: 384 }, vein = world.veins[0];
  mining.observe(body);
  const target = { column: 10, row: 11, source: 'mouse', aim: seamPoint(vein) };
  hitFor(mining, body, target, 320);
  const restored = new GameStore(disk);
  restored.resume();
  assert.deepEqual(restored.state.mineSurvey, ['C1']);
  assert.equal(restored.state.pendingDrops.length, 1);
  const nextWorld = generateMine({ mineVeins: restored.state.mineVeins });
  const next = createMining(restored, nextWorld);
  assert.equal(next.observed('C1'), true);
  assert.equal(nextWorld.map[11][10], TILE.AIR);
  assert.equal(next.drops.size, 1);
  assert.equal(next.update(body, target, true, 50), null);
  assert.equal(restored.state.mineVeins[0][0], true);
  assert.equal(store.state.inventory.length, 0);
});

test('tools: heavy rock removal is quicker, while unobserved jade keeps old fine-stroke timing', () => {
  assert.deepEqual(excavationStroke('STONE', 'heavy'), { tool: 'heavy', duration: 520, strength: 3, seam: false });
  assert.equal(excavationStroke('JADE_VEIN', 'heavy', true).strength, 1);
  const { world, mining } = session();
  const body = { x: 276, y: 384 };
  const target = { column: 9, row: 11, source: 'mouse' };
  assert.equal(validDigTarget(world, body, target), true);
  mining.setTool('heavy');
  assert.equal(hitFor(mining, body, target, 519).length, 0);
  assert.equal(mining.update(body, target, true, 1).broken, true);
  assert.equal(world.map[11][9], TILE.AIR);
});

test('precision: observation plus a visible seam hit releases jade in one stroke; blind/wide aim takes three', () => {
  for (const mode of ['blind', 'wide', 'seam']) {
    const { world, mining } = session();
    world.map[11][9] = TILE.AIR; world.map[10][9] = TILE.AIR;
    const body = { x: 304, y: 384 };
    const vein = world.veins[0];
    const point = seamPoint(vein);
    const target = { column: 10, row: 11, source: 'mouse', aim: { x: point.x + (mode === 'wide' ? 12 : 0), y: point.y } };
    if (mode !== 'blind') mining.observe(body);
    const hits = hitFor(mining, body, target, 320);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].broken, mode === 'seam');
    assert.equal(hits[0].seam, mode === 'seam');
    assert.equal(mining.drops.size, mode === 'seam' ? 1 : 0);
  }
});

test('precision: changing aim or tool cancels unfinished charge without undoing completed damage', () => {
  const { world, mining } = session();
  world.map[11][9] = TILE.AIR; world.map[10][9] = TILE.AIR;
  const body = { x: 304, y: 384 }, vein = world.veins[0];
  mining.observe(body);
  const target = { column: 10, row: 11, source: 'mouse', aim: seamPoint(vein) };
  hitFor(mining, body, target, 300);
  mining.update(body, { ...target, aim: { x: 350, y: 380 } }, true, 20);
  assert.equal(mining.swing.elapsed, 20);
  mining.setTool('heavy');
  assert.equal(mining.swing, null);
  assert.equal(hitFor(mining, body, target, 520)[0].hits, 1);
  mining.setTool('fine');
  assert.equal(mining.damage.get('10,11'), 1);
  assert.equal(hitFor(mining, body, target, 320)[0].broken, true);
  assert.equal(aimsAtSeam(target, vein), true);
  assert.equal(aimsAtSeam({ ...target, aim: { x: NaN, y: 0 } }, vein), false);
});

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

test('keyboard: after opening the lower wall E targets the overhead cell that still blocks walking', () => {
  const { world, mining } = session();
  const body = { x: 276, y: 384 };
  mining.setTool('heavy');
  const first = keyboardDigTarget(world, body, 1);
  assert.deepEqual(first, { column: 9, row: 11, source: 'keyboard' });
  hitFor(mining, body, first, 520);
  const second = keyboardDigTarget(world, body, 1);
  assert.deepEqual(second, { column: 9, row: 10, source: 'keyboard' });
  hitFor(mining, body, second, 520);
  assert.equal(world.canStand(304, 384), true);
});

test('six real landings: clear two-high access, precisely extract and collect both finite stones', () => {
  const { store, world, mining } = session();
  for (const cluster of world.clusters) {
    let body = { x: (cluster.column - 3) * 32 + 16, y: (cluster.row + 1) * 32, velocityY: 0, climbing: false };
    assert.equal(world.canStand(body.x, body.y), true);
    assert.equal(mining.observe(body).cluster.id, cluster.id);
    // Walk to the wall, then open head and foot clearance without changing floors.
    for (let frame = 0; frame < 30; frame++) body = moveMiner(body, { x: 1, y: 0 }, 16, world);
    for (const column of [cluster.column - 1, cluster.column, cluster.column + 1]) {
      const head = { column, row: cluster.row - 1, source: 'mouse' };
      mining.setTool('heavy');
      assert.equal(validDigTarget(world, body, head), true, `${cluster.id}: head ${column}`);
      assert.equal(hitFor(mining, body, head, 520).at(-1)?.broken, true);
      const target = { column, row: cluster.row, source: 'mouse' };
      if (column >= cluster.column) {
        const vein = world.veins.find(item => item.column === column && item.row === cluster.row);
        target.aim = seamPoint(vein); mining.setTool('fine');
      }
      assert.equal(validDigTarget(world, body, target), true, `${cluster.id}: foot ${column}`);
      assert.equal(hitFor(mining, body, target, mining.tool === 'fine' ? 320 : 520).at(-1)?.broken, true);
      for (let frame = 0; frame < 12; frame++) { body = moveMiner(body, { x: 1, y: 0 }, 16, world); mining.pickup(body); }
    }
    assert.equal(minePairProgress(store.state, cluster.id).recovered, 2);
  }
  assert.equal(store.state.inventory.length, 12);
  assert.equal(world.map.flat().filter(tile => tile === TILE.JADE_VEIN).length, 0);
  assert.equal(mining.drops.size, 0);
});
