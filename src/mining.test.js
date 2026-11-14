import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, validateState } from './state.js';
import { placeholderMineWorld, readTiledMine } from './mine-map.js';
import { generateMine, MINE_CLUSTERS, TILE, TILE_RULES, SWING_MS, createMining,
  advanceSwing, moveMiner, canStand, validDigTarget, facingTarget, firstSolid } from './mining.js';

function setup(tile = TILE.STONE) {
  const data = new Map();
  const disk = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const store = new GameStore(disk); store.startNew(); store.navigate('mine');
  const world = generateMine();
  for (let row = 1; row < 31; row++) for (let column = 1; column < 59; column++) world.map[row][column] = TILE.AIR;
  const target = { column: 10, row: 11, source: 'mouse' };
  world.map[11][10] = tile;
  const body = { x: 304, y: 384, velocityY: 0, climbing: false };
  return { disk, store, world, target, body, mining: createMining(store, world) };
}
function advance(mining, body, target, duration) {
  const hits = [];
  while (duration > 0) {
    const delta = Math.min(duration, 16);
    const hit = mining.update(body, target, true, delta);
    if (hit) hits.push(hit);
    duration -= delta;
  }
  return hits;
}

function tiledFixture() {
  return {
    orientation: 'orthogonal', tilewidth: 16, tileheight: 16, width: 60, height: 32,
    tilesets: [{ firstgid: 1, tilewidth: 16, tileheight: 16, tilecount: 5, columns: 5,
      tiles: TILE_RULES.map((rule, id) => ({ id, properties: [
        { name: 'kind', value: rule.kind }, { name: 'hardness', value: rule.hardness },
      ] })) }],
    layers: [{ name: 'spawn', type: 'objectgroup', objects: [{ name: 'PlayerSpawn', point: true, x: 80, y: 416 }] }],
  };
}

test('route: cluster ladders rise far enough to walk onto the main corridor floor', () => {
  const world = generateMine();
  for (const ladder of world.ladders.filter(item => item.id !== 'entrance')) {
    let body = { x: ladder.x, y: ladder.bottom, velocityY: 0, climbing: false };
    for (let frame = 0; frame < 500; frame++) {
      body = moveMiner(body, { x: 0, y: -1, jump: false }, 16, world);
    }
    assert.equal(body.y, ladder.top);
    for (let frame = 0; frame < 30; frame++) {
      body = moveMiner(body, { x: 1, y: 0, jump: false }, 16, world);
    }
    assert.ok(body.x > ladder.x + 60, `${ladder.id} cannot leave its shaft`);
    assert.ok(body.y <= 288.01, `${ladder.id} fell below the corridor`);
  }
});

test('terrain: deterministic seed, independent mutable arrays, exact twelve stable sources', () => {
  const first = generateMine(), second = generateMine();
  assert.deepEqual(first.map, second.map);
  assert.equal(first.map.length, 32);
  assert.ok(first.map.every(row => row.length === 60));
  assert.equal(first.seed, 20261111);
  assert.equal(first.map.flat().filter(tile => tile === TILE.JADE_VEIN).length, 12);
  assert.equal(new Set(first.veins.map(v => v.id)).size, 12);
  for (const material of ['nephrite', 'jadeite']) assert.equal(first.veins.filter(v => v.material === material).length, 6);
  first.map[1][1] = TILE.STONE;
  assert.equal(second.map[1][1], TILE.AIR);
  assert.notDeepEqual(generateMine({ seed: 1 }).map, second.map);
});

test('terrain: bedrock wins, spawn falls one cell, and all cluster rings survive carving', () => {
  const world = generateMine();
  for (let row = 0; row < 32; row++) for (let column = 0; column < 60; column++) {
    if (row === 0 || row === 31 || column === 0 || column === 59) assert.equal(world.map[row][column], TILE.BEDROCK);
  }
  assert.deepEqual(world.spawn, { x: 160, y: 832 });
  assert.equal(world.canStand(160, 832), true);
  assert.equal(world.canStand(160, 864), true);
  assert.equal(world.canStand(160, 865), false);
  for (let row = 23; row <= 26; row++) for (let column = 1; column <= 8; column++) assert.equal(world.map[row][column], TILE.AIR);
  for (let column = 1; column <= 8; column++) assert.equal(world.map[27][column], TILE.STONE);
  for (const cluster of MINE_CLUSTERS) {
    for (let row = cluster.row - 1; row <= cluster.row + 1; row++) {
      for (let column = cluster.column - 1; column <= cluster.column + 2; column++) {
        assert.equal(world.map[row][column], row === cluster.row && [cluster.column, cluster.column + 1].includes(column) ? TILE.JADE_VEIN : TILE.STONE, `${column},${row}`);
      }
    }
  }
});

test('terrain: route shafts and landing boxes are clear, collisions read current array', () => {
  const world = generateMine();
  assert.equal(world.ladders.length, 7);
  for (const ladder of world.ladders) {
    for (let y = ladder.top; y <= ladder.bottom; y += 8) assert.equal(world.canStand(ladder.x, y), true, `${ladder.id} y=${y}`);
  }
  assert.equal(world.canStand(-20, 200), false);
  assert.equal(world.canStand(160, NaN), false);
  world.map[25][5] = TILE.STONE;
  assert.equal(world.canStand(160, 832), false);
  world.map[25][5] = TILE.AIR;
  assert.equal(world.canStand(160, 832), true);
});

test('terrain: only consumed veins rebuild as stone', () => {
  const flags = Array.from({ length: 6 }, () => [false, false]); flags[0][0] = true;
  const world = generateMine({ mineVeins: flags });
  assert.equal(world.map[11][10], TILE.STONE);
  assert.equal(world.map[11][11], TILE.JADE_VEIN);
  assert.equal(world.map.flat().filter(tile => tile === TILE.JADE_VEIN).length, 11);
});

test('metadata: kind maps frame IDs independently of terrain IDs, logical spawn doubles', () => {
  const data = tiledFixture();
  const world = readTiledMine(data), fallback = placeholderMineWorld();
  assert.deepEqual(world.map, fallback.map);
  assert.deepEqual(world.spawn, { x: 160, y: 832 });
  assert.deepEqual(world.frames, [0, 1, 2, 3, 4]);
  data.tilesets[0].tiles.forEach(tile => { tile.id = 4 - tile.id; });
  assert.deepEqual(readTiledMine(data).frames, [4, 3, 2, 1, 0]);
});

test('metadata: rejects stale layouts, bad hardness, duplicate kinds and invalid spawn', () => {
  for (const mutate of [
    d => { d.width = 30; }, d => { d.infinite = true; },
    d => { d.tilesets[0].tiles[1].properties[1].value = 3; },
    d => { d.tilesets[0].tiles[1].properties[0].value = 'AIR'; },
    d => { d.tilesets[0].tiles.pop(); },
    d => { d.tilesets[0].source = 'external.tsx'; },
    d => { d.tilesets[0].spacing = 1; },
    d => { d.layers.push({ name: 'walls', type: 'tilelayer', data: [] }); },
    d => { d.layers[0].objects[0].x = 0; },
    d => { d.layers[0].objects[0].point = false; },
    d => { d.layers[0].objects[0].width = 16; },
  ]) {
    const data = tiledFixture(); mutate(data);
    assert.throws(() => readTiledMine(data), /Tiled 矿洞元数据无效/);
  }
});

test('swing: exact active time is 640ms for dirt and 960ms for stone/jade', () => {
  for (const tile of [TILE.DIRT, TILE.STONE, TILE.JADE_VEIN]) {
    const { mining, world, body, target } = setup(tile);
    const duration = TILE_RULES[tile].hardness * SWING_MS;
    const hits = advance(mining, body, target, duration - 1);
    assert.equal(hits.length, TILE_RULES[tile].hardness - 1);
    assert.equal(world.map[11][10], tile);
    assert.equal(mining.update(body, target, true, 1).broken, true);
    assert.equal(world.map[11][10], TILE.AIR);
    assert.equal(mining.drops.size, tile === TILE.JADE_VEIN ? 1 : 0);
    assert.equal(mining.update(body, target, true, 5000), null);
  }
});

test('swing: release/target/source changes cancel only unfinished time and clamp huge deltas', () => {
  const { mining, body, target, world } = setup();
  advance(mining, body, target, 420);
  assert.equal(mining.damage.get('10,11'), 1);
  mining.update(body, target, false, 5000);
  assert.equal(mining.swing, null);
  assert.equal(advance(mining, body, target, 319).length, 0);
  assert.equal(mining.update(body, target, true, 1).hits, 2);
  world.map[10][10] = TILE.STONE;
  advance(mining, body, target, 200);
  mining.update(body, { column: 10, row: 10, source: 'mouse' }, true, 16);
  assert.equal(mining.swing.elapsed, 16);
  mining.update(body, { column: 10, row: 10, source: 'keyboard' }, true, 16);
  assert.equal(mining.swing.elapsed, 16);
  mining.cancel();
  mining.update(body, target, true, 60000);
  assert.equal(mining.swing.elapsed, 50);
  const before = mining.swing.elapsed;
  mining.update(body, target, true, 0);
  assert.equal(mining.swing.elapsed, before);
  assert.equal(advanceSwing(null, 1), null);
  assert.equal(advanceSwing({ elapsed: 100 }, 9999, 0).elapsed, 100);
});

test('aim: 48px uses nearest tile point, first wall blocks, bedrock and outside reject', () => {
  const { body, world, target } = setup();
  assert.equal(validDigTarget(world, body, target), true);
  assert.equal(validDigTarget(world, { ...body, x: 272 }, target), true);
  assert.equal(validDigTarget(world, { ...body, x: 271 }, target), false);
  world.map[11][9] = TILE.STONE;
  assert.equal(validDigTarget(world, { ...body, x: 272 }, target), false);
  assert.equal(validDigTarget(world, body, { column: 0, row: 0 }), false);
  assert.equal(validDigTarget(world, body, { column: 10.5, row: 11 }), false);
  assert.deepEqual(facingTarget(body, 1), { column: 10, row: 11, source: 'keyboard' });
  assert.deepEqual(facingTarget(body, -1), { column: 8, row: 11, source: 'keyboard' });
  assert.equal(facingTarget({ x: 160, y: 864 }, 1).column, 6);
});

test('ray: diagonal corner walls block both dig and pickup paths', () => {
  const { world } = setup();
  world.map[5][6] = TILE.STONE;
  assert.deepEqual(firstSolid(world.map, { x: 176, y: 176 }, { x: 208, y: 208 }), { column: 6, row: 5 });
});

test('pickup: broken jade settles once by source ID and survives disk reload', () => {
  const { mining, body, target, store, disk } = setup(TILE.JADE_VEIN);
  advance(mining, body, target, 960);
  assert.equal(store.state.inventory.length, 0);
  assert.equal(store.state.mineVeins[0][0], true);
  assert.equal(mining.drops.get('C1-L').id, 'C1-L');
  assert.equal(mining.pickup(body).collected.length, 1);
  assert.equal(mining.pickup(body).collected.length, 0);
  assert.deepEqual(new GameStore(disk).state.inventory, [{ id: 'C1-L', material: 'nephrite' }]);
});

test('pickup: full bag preserves drop, legal Store consumption permits later pickup', () => {
  const { mining, body, target, store } = setup(TILE.JADE_VEIN);
  for (let index = 0; index < 12; index++) store.addMaterial('jadeite', `existing-${index}`);
  advance(mining, body, target, 960);
  assert.equal(mining.pickup(body).full, true);
  assert.equal(mining.drops.size, 1);
  const next = structuredClone(store.state);
  const used = next.inventory.pop(); next.pieces.push({ ...used, shape: 'bi' });
  store.state = validateState(next); store.save();
  assert.equal(mining.pickup(body).collected.length, 1);
  assert.equal(store.state.inventory.length, 12);
  assert.equal(mining.drops.size, 0);
});

test('pickup: walls, distance and inactive scenes prevent collection or swings', () => {
  const { mining, body, target, world, store } = setup(TILE.JADE_VEIN);
  advance(mining, body, target, 960);
  world.map[11][9] = TILE.STONE;
  assert.equal(mining.pickup({ ...body, x: 285 }).collected.length, 0);
  world.map[11][9] = TILE.AIR;
  assert.equal(mining.pickup({ ...body, x: 250 }).collected.length, 0);
  store.navigate('workshop');
  assert.equal(mining.pickup(body).collected.length, 0);
  assert.equal(mining.update(body, target, true, 50), null);
  store.navigate('mine');
  assert.equal(mining.pickup(body).collected.length, 1);
});

test('physics: walk speed, jump arc, landing, head collision and current-map walls', () => {
  const { world } = setup();
  for (let column = 1; column < 59; column++) world.map[27][column] = TILE.STONE;
  let body = { x: 160, y: 864, velocityY: 0, climbing: false };
  body = moveMiner(body, { x: 1, y: 0 }, 50, world);
  assert.ok(Math.abs(body.x - 168.8) < .001);
  body = moveMiner(body, { x: 0, y: 0, jump: true }, 16, world);
  assert.ok(body.velocityY < 0 && body.y < 864);
  let highest = body.y;
  for (let frame = 0; frame < 80; frame++) {
    body = moveMiner(body, { x: 0, y: 0 }, 16, world); highest = Math.min(highest, body.y);
  }
  assert.ok(Math.abs(864 - highest - 73.5) < .1);
  assert.ok(Math.abs(body.y - 864) < .002);
  world.map[24][5] = TILE.STONE;
  body = moveMiner(body, { x: 0, y: 0, jump: true }, 50, world);
  assert.equal(body.velocityY, 0);
  assert.ok(body.y >= 856 - .002);
  world.map[24][5] = TILE.AIR;
  world.map[26][6] = TILE.STONE; world.map[25][6] = TILE.STONE;
  for (let frame = 0; frame < 50; frame++) body = moveMiner(body, { x: 1, y: 0 }, 1000, world);
  assert.ok(body.x <= 180.002);
  world.map[26][6] = TILE.AIR; world.map[25][6] = TILE.AIR;
  for (let frame = 0; frame < 5; frame++) body = moveMiner(body, { x: 1, y: 0 }, 50, world);
  assert.ok(body.x > 192);
  assert.deepEqual(moveMiner(body, { x: 1, y: 1 }, 0, world), body);
});

test('physics: ladder motion reads walls instead of teleporting through them', () => {
  const world = generateMine();
  let body = { x: 176, y: 864, velocityY: 0, climbing: false };
  for (let frame = 0; frame < 80; frame++) body = moveMiner(body, { x: 0, y: -1 }, 50, world);
  assert.ok(Math.abs(body.y - 288) < .002);
  body = moveMiner(body, { x: 0, y: 0 }, 50, world);
  assert.ok(Math.abs(body.y - 288) < .002);
  world.map[18][5] = TILE.STONE;
  body = { x: 176, y: 672, velocityY: 0, climbing: true };
  for (let frame = 0; frame < 30; frame++) body = moveMiner(body, { x: 0, y: -1 }, 50, world);
  assert.ok(body.y >= 664 - .002);
  assert.ok(canStand(body.x, body.y, world.map));
});
