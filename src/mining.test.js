import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, tasks } from './state.js';
import { placeholderMineWorld, readTiledMine } from './mine-map.js';
import { CELL_SIZE, MINE_MAP, MINE_NODES, PLAYER_START, COOLDOWN_MS, REGEN_MS, SWING_MS, WORLD_WIDTH, WORLD_HEIGHT, canStand, createMining, advanceSwing, moveMiner } from './mining.js';

function setup() {
  const data = new Map();
  const disk = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const store = new GameStore(disk); store.startNew(); store.navigate('mine');
  const nodes = new Map();
  const mining = createMining(store, nodes); mining.reset(0);
  return { disk, store, nodes, mining };
}

test('mining: completed scene swing settles even if wall clock advanced only one millisecond', () => {
  const { store, mining } = setup();
  assert.equal(mining.begin('ore-1', 1000), 'started');
  assert.equal(mining.hit('ore-1', 1001), true);
  assert.equal(store.state.inventory.length, 1);
  assert.equal(mining.status('ore-1', 1001).phase, 'empty');
});

test('mining: every failed settlement or cancellation releases the node for another swing', () => {
  for (const failure of ['inactive', 'full', 'rejected', 'cancel', 'wrong-phase', 'unknown-node']) {
    const { store, mining, nodes } = setup();
    if (failure !== 'unknown-node') mining.begin('ore-1', 1000);
    const addMaterial = store.addMaterial;
    if (failure === 'inactive') store.active = false;
    if (failure === 'full') store.state.inventory = Array.from({ length: 12 }, (_, index) => ({ id: `ore-${index}`, material: 'jadeite' }));
    if (failure === 'rejected') store.addMaterial = () => false;
    if (failure === 'cancel') mining.cancel('ore-1', 1001);
    if (failure === 'wrong-phase') nodes.get('ore-1').phase = 'cracked';
    if (failure === 'unknown-node') nodes.set('unknown', { phase: 'mining', changedAt: 1000 });
    const id = failure === 'unknown-node' ? 'unknown' : 'ore-1';
    assert.equal(mining.hit(id, 1001), false, failure);
    assert.notEqual(nodes.get(id).phase, 'mining', failure);
    assert.equal(nodes.get(id).changedAt, 1001, failure);
    store.active = true; store.state.inventory = []; store.addMaterial = addMaterial;
    assert.equal(mining.begin('ore-1', 1002), 'started', failure);
  }
});

test('mining: pure swing advancement clamps seven frames and freezes across pause', () => {
  let swing = { id: 'ore-1', elapsed: 0 };
  const original = swing;
  for (let frame = 0; frame < 6; frame++) swing = advanceSwing(swing, 1000, 50);
  assert.equal(swing.elapsed, 300);
  assert.ok(swing.elapsed < SWING_MS);
  const paused = advanceSwing(swing, 60_000, 0);
  assert.deepEqual(paused, swing);
  swing = advanceSwing(paused, 1000, 50);
  assert.equal(swing.elapsed, 350);
  assert.ok(swing.elapsed >= SWING_MS);
  assert.deepEqual(original, { id: 'ore-1', elapsed: 0 });
  assert.equal(advanceSwing(null, 16, 50), null);
});

test('mining: repeated collection settles each swing exactly once and completes the first task', () => {
  const { store, mining } = setup();
  assert.equal(mining.begin('ore-1', 400), 'started');
  assert.equal(mining.begin('ore-1', 400), 'cooldown');
  assert.equal(mining.hit('ore-1', 720), true);
  assert.equal(mining.hit('ore-1', 720), false);
  assert.equal(store.state.inventory.length, 1);
  assert.equal(tasks(store.state)[0].done, true);
  assert.equal(store.state.stamina, 100);
});

test('mining: twelve-slot capacity rejects the next swing without consuming the node', () => {
  const { store, mining } = setup();
  for (let index = 0; index < 12; index++) assert.equal(store.addMaterial('jadeite', `existing-${index}`), true);
  assert.equal(mining.begin('ore-1', 400), 'full');
  assert.equal(mining.status('ore-1', 400).phase, 'ready');
  assert.equal(mining.hit('ore-1', 720), false);
  assert.equal(store.state.inventory.length, 12);
});

test('mining: all six node states occur in order and cooldown rejects collection', () => {
  const { mining } = setup();
  assert.equal(mining.status('ore-1', 0).phase, 'full');
  assert.equal(mining.status('ore-1', 200).phase, 'cracked');
  assert.equal(mining.status('ore-1', 400).phase, 'ready');
  assert.equal(mining.begin('ore-1', 400), 'started');
  assert.equal(mining.status('ore-1', 400).phase, 'mining');
  assert.equal(mining.hit('ore-1', 720), true);
  assert.equal(mining.status('ore-1', 720).phase, 'empty');
  assert.equal(mining.begin('ore-1', 720 + COOLDOWN_MS - 1), 'cooldown');
  assert.equal(mining.status('ore-1', 720 + COOLDOWN_MS).phase, 'regrowing');
  assert.equal(mining.begin('ore-1', 720 + COOLDOWN_MS + REGEN_MS - 1), 'cooldown');
  assert.equal(mining.begin('ore-1', 720 + COOLDOWN_MS + REGEN_MS), 'started');
  assert.equal(mining.hit('ore-1', 720 + COOLDOWN_MS + REGEN_MS + 320), true);
});

test('mining: six collected materials survive scene changes and save reload', () => {
  const { disk, store, mining } = setup();
  for (const node of MINE_NODES) {
    assert.equal(mining.begin(node.id, 400), 'started');
    assert.equal(mining.hit(node.id, 720), true);
  }
  store.navigate('workshop'); store.navigate('gallery'); store.navigate('mine');
  assert.equal(mining.begin('ore-1', 800), 'cooldown');
  const reloaded = new GameStore(disk); reloaded.resume();
  assert.deepEqual(reloaded.state.inventory, store.state.inventory);
  assert.equal(reloaded.state.inventory.filter(item => item.material === 'nephrite').length, 3);
  assert.equal(reloaded.state.inventory.filter(item => item.material === 'jadeite').length, 3);
  assert.equal(JSON.parse(disk.getItem(SAVE_KEY)).crafting, null);
  assert.equal(Object.hasOwn(JSON.parse(disk.getItem(SAVE_KEY)), 'mining'), false);
});

test('mining: interruption cancels pending settlement and full-at-impact preserves readiness', () => {
  const { store, mining } = setup();
  mining.begin('ore-1', 400); mining.cancel('ore-1');
  assert.equal(mining.hit('ore-1', 720), false);
  mining.begin('ore-1', 800);
  for (let index = 0; index < 12; index++) store.addMaterial('nephrite', `fill-${index}`);
  assert.equal(mining.hit('ore-1', 1120), false);
  assert.equal(mining.status('ore-1', 1120).phase, 'ready');
  mining.reset(1200);
  assert.equal(mining.status('ore-1', 1200).phase, 'full');
});

test('mining: map covers the whole world and all six nodes are reachable around rocks', () => {
  assert.equal(MINE_MAP.length, 32);
  assert.ok(MINE_MAP.every(row => row.length === 60));
  assert.equal(WORLD_WIDTH, 1920); assert.equal(WORLD_HEIGHT, 1024);
  assert.equal(canStand(0, 0), false);
  assert.equal(canStand(30 * CELL_SIZE, 20 * CELL_SIZE), false);
  const visited = new Set();
  const queue = [[Math.floor(PLAYER_START.x / CELL_SIZE), Math.floor(PLAYER_START.y / CELL_SIZE)]];
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const column = x + dx, row = y + dy, key = `${column},${row}`;
      if (visited.has(key) || !canStand(column * CELL_SIZE + 16, row * CELL_SIZE + 16)) continue;
      visited.add(key); queue.push([column, row]);
    }
  }
  for (const node of MINE_NODES) assert.ok(visited.has(`${node.column},${node.row}`), node.id);
});

function tiledFixture() {
  const tileLayer = (name, data) => ({ name, type: 'tilelayer', width: 60, height: 32, data });
  return {
    type: 'map', orientation: 'orthogonal', tilewidth: 16, tileheight: 16, width: 60, height: 32,
    tilesets: [{ name: 'mine', firstgid: 1, tilewidth: 16, tileheight: 16, tilecount: 3, columns: 3, margin: 0, spacing: 0,
      tiles: [1, 2].map(id => ({ id, properties: [{ name: 'collides', type: 'bool', value: true }] })) }],
    layers: [
      tileLayer('ground', MINE_MAP.flat().map(() => 1)),
      tileLayer('walls', MINE_MAP.flat().map(cell => cell ? cell + 1 : 0)),
      tileLayer('decor', MINE_MAP.flat().map(() => 0)),
      { name: 'oreNodes', type: 'objectgroup', objects: MINE_NODES.map(node => ({ type: 'Ore', x: node.x / 2, y: node.y / 2,
        properties: [{ name: 'nodeId', value: node.id }, { name: 'material', value: node.material }] })) },
      { name: 'spawn', type: 'objectgroup', objects: [{ type: 'PlayerSpawn', x: PLAYER_START.x / 2, y: PLAYER_START.y / 2 }] },
    ],
  };
}

test('mining: Tiled and placeholder worlds expose equivalent nodes, spawn and collision', () => {
  const expected = placeholderMineWorld(), actual = readTiledMine(tiledFixture());
  assert.deepEqual(actual.nodes, expected.nodes);
  assert.deepEqual(actual.spawn, expected.spawn);
  for (let y = 16; y < WORLD_HEIGHT; y += 32) {
    for (let x = 16; x < WORLD_WIDTH; x += 32) assert.equal(actual.canStand(x, y), expected.canStand(x, y));
  }
  assert.equal(actual.canStand(-1, -1), false);
  const fixture = tiledFixture();
  fixture.layers[3].objects[0].x += 16;
  assert.equal(readTiledMine(fixture).nodes[0].x, MINE_NODES[0].x + 32);
});

test('mining: Tiled contract rejects bad dimensions, nodes, collision spawn and tilesets', () => {
  const mutations = [
    data => { data.tilewidth = 32; },
    data => { data.width = 30; },
    data => { data.layers[1].data = []; },
    data => { data.layers[1].data[0] = 99; },
    data => { data.layers[3].objects.pop(); },
    data => { data.layers[3].objects[1].properties[0].value = 'ore-1'; },
    data => { data.layers[3].objects[0].properties[1].value = 'unknown'; },
    data => { data.layers[4].objects[0].x = 0; },
    data => { data.tilesets[0].source = 'external.tsx'; },
    data => { data.tilesets[0].spacing = 1; },
  ];
  for (const mutate of mutations) {
    const data = tiledFixture(); mutate(data);
    assert.throws(() => readTiledMine(data), /Tiled 矿洞地图无效/);
  }
});


test('mining: side-view ground, walls and ladders keep all six deposits accessible', () => {
  const world = placeholderMineWorld();
  let body = { ...PLAYER_START, velocityY: 0, climbing: false };
  const walkTo = x => {
    for (let i = 0; i < 1200 && Math.abs(body.x - x) > 8; i++) body = moveMiner(body, { x: Math.sign(x - body.x), y: 0 }, 50, world);
    assert.ok(Math.abs(body.x - x) <= 8);
  };
  for (const node of MINE_NODES.slice(0, 4)) { walkTo(node.x); assert.ok(Math.abs(body.y - 928) < 2); }
  walkTo(944);
  for (let i = 0; i < 46; i++) body = moveMiner(body, { x: 0, y: -1 }, 50, world);
  assert.equal(body.y, 608);
  walkTo(MINE_NODES[4].x);
  walkTo(1104);
  for (let i = 0; i < 46; i++) body = moveMiner(body, { x: 0, y: -1 }, 50, world);
  assert.equal(body.y, 288);
  walkTo(MINE_NODES[5].x);
  assert.ok(Math.abs(body.y - 288) < 2);
  const frozen = moveMiner(body, { x: 0, y: 0 }, 0, world);
  assert.deepEqual(frozen, body);
  for (let i = 0; i < 300; i++) body = moveMiner(body, { x: -1, y: 0 }, 1000, world);
  assert.ok(body.x >= 44);
  assert.ok(body.y <= 929);
});
