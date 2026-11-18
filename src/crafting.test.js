import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, freshState, validateState, tasks } from './state.js';

const COVERAGE = '/'.repeat(9600);

test('legacy placeholder work can be ended explicitly while keeping its inventory intact', () => {
  const { store } = setup();
  const legacy = freshState();
  legacy.inventory = [{ id: 'legacy-raw', material: 'jadeite' }];
  legacy.crafting = { materialId: 'legacy-raw', step: 'polish', progress: 80, tool: 'cloth' };
  store.importSave(JSON.stringify(legacy));
  assert.equal(store.clearLegacyCrafting(), true);
  assert.equal(store.state.crafting, null);
  assert.deepEqual(store.state.inventory.slice(0, 1), legacy.inventory);
  assert.equal(store.startCrafting('legacy-raw', 'fish'), true);
  assert.equal(store.clearLegacyCrafting(), false);
});

function setup() {
  const data = new Map();
  const disk = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const store = new GameStore(disk);
  store.startNew();
  store.state.inventory.pop();
  assert.equal(store.addMaterial('nephrite', 'raw-1'), true);
  return { store, disk };
}

function finishStep(store) {
  assert.equal(store.updateCrafting(75, COVERAGE), true);
  assert.equal(store.advanceCrafting(), true);
}

test('crafting allocates a unique work ID without consuming the chosen material', () => {
  const { store } = setup();
  const revision = store.sessionRevision;
  assert.equal(store.startCrafting('missing'), false);
  assert.equal(store.startCrafting('raw-1'), true);
  assert.equal(store.state.inventory.length, 12);
  const { materialId } = store.state.crafting;
  assert.notEqual(materialId, 'raw-1');
  assert.deepEqual(store.state.crafting, {
    materialId, material: 'nephrite', shape: 'bi', reusable: true,
    step: 'shape', progress: 0, tool: 'chisel', coverage: '',
  });
  const before = store.exportSave();
  assert.equal(store.startCrafting('raw-1'), false);
  assert.equal(store.exportSave(), before);
  assert.equal(store.sessionRevision, revision);
});

test('crafting mutations require an active workshop and keep unsupported legacy work readable', () => {
  const { store } = setup();
  store.navigate('gallery');
  assert.equal(store.startCrafting('raw-1'), false);
  store.navigate('workshop');
  assert.equal(store.startCrafting('raw-1'), true);
  store.menu();
  assert.equal(store.updateCrafting(75, COVERAGE), false);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.cancelCrafting(), false);
  store.resume();
  store.navigate('gallery');
  assert.equal(store.updateCrafting(75, COVERAGE), false);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.cancelCrafting(), false);

  const legacy = freshState();
  legacy.crafting = { materialId: 'legacy-raw', step: 'polish', progress: 80, tool: 'cloth' };
  store.importSave(JSON.stringify(legacy));
  assert.deepEqual(store.state.crafting, legacy.crafting);
  const before = store.exportSave();
  assert.equal(store.updateCrafting(90, COVERAGE), false);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.cancelCrafting(), false);
  assert.equal(store.exportSave(), before);
});

test('crafting validates coverage/progress and unchanged updates avoid another disk write', () => {
  const { store, disk } = setup();
  store.startCrafting('raw-1');
  const before = store.exportSave();
  for (const progress of [-1, 101, 1.5, NaN, Infinity, '75', null]) {
    assert.equal(store.updateCrafting(progress, COVERAGE), false);
  }
  for (const coverage of [null, [], 'invalid', 'A'.repeat(9599), '?'.repeat(9600), `${'A'.repeat(9599)}=`]) {
    assert.equal(store.updateCrafting(75, coverage), false);
  }
  assert.equal(store.updateCrafting(75, ''), false);
  assert.equal(store.exportSave(), before);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.updateCrafting(74, COVERAGE), true);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.updateCrafting(75, COVERAGE), true);
  const saved = disk.getItem(SAVE_KEY);
  let writes = 0;
  const write = disk.setItem;
  disk.setItem = (key, value) => { writes++; write(key, value); };
  assert.equal(store.updateCrafting(75, COVERAGE), true);
  assert.equal(writes, 0);
  assert.equal(disk.getItem(SAVE_KEY), saved);
});

test('crafting completes three distinct stages and settles one piece using the draft ID', () => {
  const { store, disk } = setup();
  store.startCrafting('raw-1');
  const { materialId } = store.state.crafting;
  finishStep(store);
  assert.equal(store.state.crafting.step, 'carve');
  assert.equal(store.state.crafting.progress, 0);
  assert.equal(store.state.crafting.coverage, '');
  assert.equal(store.advanceCrafting(), false);
  finishStep(store);
  assert.equal(store.state.crafting.step, 'polish');
  assert.equal(store.state.crafting.tool, 'cloth');
  finishStep(store);
  assert.equal(store.state.crafting, null);
  assert.deepEqual(store.state.pieces, [{ id: materialId, material: 'nephrite', shape: 'bi' }]);
  assert.deepEqual(store.state.discoveries, ['bi']);
  assert.equal(store.state.inventory.length, 12);
  const saved = disk.getItem(SAVE_KEY);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.cancelCrafting(), false);
  assert.equal(disk.getItem(SAVE_KEY), saved);
  assert.deepEqual(new GameStore(disk).state.pieces, store.state.pieces);
});

test('crafting resumes persisted progress and cancel retains the same raw material', () => {
  const { store, disk } = setup();
  store.startCrafting('raw-1');
  store.updateCrafting(43, COVERAGE);
  const restored = new GameStore(disk);
  restored.resume();
  assert.deepEqual(restored.state.crafting, store.state.crafting);
  assert.equal(restored.cancelCrafting(), true);
  assert.equal(restored.state.crafting, null);
  assert.deepEqual(restored.state.inventory.filter(item => !item.variety), [{ id: 'raw-1', material: 'nephrite' }]);
  assert.equal(restored.cancelCrafting(), false);
});

test('legacy reserved drafts retain work when a full bag cannot take the stone back', () => {
  const { store } = setup();
  const saved = structuredClone(store.state);
  saved.inventory = Array.from({ length: 12 }, (_, index) => ({ id: `extra-${index}`, material: 'jadeite' }));
  saved.crafting = { materialId: 'raw-1', material: 'nephrite', shape: 'bi', step: 'shape', progress: 0, tool: 'chisel', coverage: '' };
  store.importSave(JSON.stringify(saved));
  const before = store.exportSave();
  assert.equal(store.cancelCrafting(), false);
  assert.equal(store.exportSave(), before);
  const next = structuredClone(store.state);
  next.inventory.pop();
  store.state = validateState(next);
  assert.equal(store.cancelCrafting(), true);
  assert.equal(store.state.inventory.length, 12);
  assert.ok(store.state.inventory.some(item => item.id === 'raw-1'));
});

test('new crafting schema rejects partial fields, invalid material, coverage and duplicate identities', () => {
  const { store } = setup();
  store.startCrafting('raw-1');
  const valid = structuredClone(store.state);
  for (const changes of [
    { material: 'unknown' }, { shape: 'unknown' }, { coverage: null },
    { coverage: 'invalid' }, { progress: 10, coverage: '' },
  ]) {
    assert.throws(() => validateState({ ...valid, crafting: { ...valid.crafting, ...changes } }));
  }
  const partial = { materialId: 'raw-1', step: 'shape', progress: 0, tool: 'chisel', material: 'nephrite' };
  assert.throws(() => validateState({ ...valid, crafting: partial }));
  assert.throws(() => validateState({ ...valid, inventory: [{ id: valid.crafting.materialId, material: 'nephrite' }] }));
  assert.throws(() => validateState({ ...valid, pieces: [{ id: valid.crafting.materialId, material: 'nephrite', shape: 'bi' }] }));
});

test('crafting settlement keeps a single dirty result on write failure and persists on retry', () => {
  const { store, disk } = setup();
  store.startCrafting('raw-1');
  finishStep(store);
  finishStep(store);
  store.updateCrafting(100, COVERAGE);
  const write = disk.setItem;
  disk.setItem = () => { throw new Error('quota'); };
  assert.equal(store.advanceCrafting(), true);
  assert.equal(store.dirty, true);
  assert.equal(store.state.pieces.length, 1);
  assert.equal(store.advanceCrafting(), false);
  assert.equal(store.state.pieces.length, 1);
  disk.setItem = write;
  assert.equal(store.retrySave(), true);
  assert.equal(new GameStore(disk).state.pieces.length, 1);
});

test('all three supported shapes complete, unlock their codex entries and satisfy the three-piece task', () => {
  const { store, disk } = setup();
  const materials = ['raw-1', ...store.state.inventory.slice(0, 2).map(item => item.id)];
  const shapes = ['bi', 'fish', 'seal'];
  for (const [index, shape] of shapes.entries()) {
    assert.equal(store.startCrafting(materials[index], shape), true);
    assert.equal(store.state.crafting.shape, shape);
    assert.equal(validateState(store.state).crafting.shape, shape);
    finishStep(store);
    finishStep(store);
    finishStep(store);
    assert.equal(store.state.pieces[index].shape, shape);
    assert.ok(store.state.discoveries.includes(shape));
    assert.equal(tasks(store.state)[2].done, index === 2);
  }
  assert.equal(store.state.inventory.length, 12);
  assert.deepEqual(store.state.discoveries, shapes);
  const restored = new GameStore(disk);
  assert.deepEqual(restored.state.pieces.map(piece => piece.shape), shapes);
  assert.equal(tasks(restored.state)[2].done, true);
});

test('crafting rejects unsupported shapes before reserving material and keeps the default jade disc', () => {
  const { store } = setup();
  const before = store.exportSave();
  for (const shape of ['cong', 'dragon', 'unknown', '', null, 1]) {
    assert.equal(store.startCrafting('raw-1', shape), false);
    assert.equal(store.exportSave(), before);
  }
  assert.equal(store.startCrafting('raw-1'), true);
  assert.equal(store.state.crafting.shape, 'bi');
});
