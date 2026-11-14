import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, freshState, validateState, tasks } from './state.js';

function setup() {
  const initial = freshState();
  initial.pieces = [
    { id: 'bi-1', shape: 'bi', material: 'nephrite' },
    { id: 'fish-1', shape: 'fish', material: 'jadeite' },
    { id: 'seal-1', shape: 'seal', material: 'nephrite' },
  ];
  const data = new Map([[SAVE_KEY, JSON.stringify(initial)]]);
  const disk = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const store = new GameStore(disk);
  store.resume();
  return { store, disk, initial };
}

const CUSTOMIZATION = { pattern: 'dragon', color: 'celadon', blessing: '平安喜乐' };

test('legacy pieces retain their shape while customization persists explicit optional fields', () => {
  const { store, disk, initial } = setup();
  assert.deepEqual(store.state.pieces, initial.pieces);
  assert.equal(store.customizePiece('bi-1', { ...CUSTOMIZATION, blessing: '  平安喜乐  ' }), true);
  assert.deepEqual(store.state.pieces[0], { ...initial.pieces[0], ...CUSTOMIZATION });
  assert.deepEqual(new GameStore(disk).state.pieces[0], store.state.pieces[0]);
  assert.deepEqual(store.state.pieces[1], initial.pieces[1]);
  const exported = store.exportSave();
  store.importSave(exported);
  assert.deepEqual(store.state.pieces[0], { ...initial.pieces[0], ...CUSTOMIZATION });
});

test('customization rejects invalid choices, controls and unavailable pieces without saving', () => {
  const { store } = setup();
  const before = store.exportSave();
  for (const customization of [
    null, undefined, [], {},
    { ...CUSTOMIZATION, pattern: 'unknown' },
    { ...CUSTOMIZATION, color: 'unknown' },
    { ...CUSTOMIZATION, blessing: null },
    { ...CUSTOMIZATION, blessing: '福'.repeat(25) },
    { ...CUSTOMIZATION, blessing: '平安\n喜乐' },
    { ...CUSTOMIZATION, blessing: '\t平安' },
    { ...CUSTOMIZATION, blessing: '\u007f' },
  ]) assert.equal(store.customizePiece('bi-1', customization), false);
  assert.equal(store.customizePiece('missing', CUSTOMIZATION), false);
  assert.equal(store.exportSave(), before);
  store.navigate('gallery');
  assert.equal(store.customizePiece('bi-1', CUSTOMIZATION), false);
  store.navigate('workshop');
  store.menu();
  assert.equal(store.customizePiece('bi-1', CUSTOMIZATION), false);
});

test('blessings count Unicode code points and identical customization performs no writes', () => {
  const { store, disk } = setup();
  const blessing = '🌿'.repeat(24);
  assert.equal(store.customizePiece('bi-1', { ...CUSTOMIZATION, blessing }), true);
  assert.equal(store.customizePiece('bi-1', { ...CUSTOMIZATION, blessing: `${blessing}🌿` }), false);
  let writes = 0;
  const write = disk.setItem;
  disk.setItem = (key, value) => { writes++; write(key, value); };
  assert.equal(store.customizePiece('bi-1', { ...CUSTOMIZATION, blessing: ` ${blessing} ` }), true);
  assert.equal(writes, 0);
});

test('optional piece customization fields are validated independently in old and new saves', () => {
  const { initial } = setup();
  for (const fields of [
    { pattern: 'cloud' }, { color: 'natural' }, { blessing: '' }, CUSTOMIZATION,
  ]) {
    const value = structuredClone(initial);
    Object.assign(value.pieces[0], fields);
    assert.doesNotThrow(() => validateState(value));
  }
  for (const fields of [
    { pattern: null }, { pattern: 'other' }, { color: 'red' }, { color: 1 },
    { blessing: null }, { blessing: [] }, { blessing: '玉'.repeat(25) }, { blessing: '\u0085' },
  ]) {
    const value = structuredClone(initial);
    Object.assign(value.pieces[0], fields);
    assert.throws(() => validateState(value));
  }
});

test('exhibits place, move, replace and remove real pieces while preserving unique references', () => {
  const { store, disk } = setup();
  store.navigate('gallery');
  assert.equal(store.placeExhibit(0, 'bi-1'), true);
  assert.equal(store.placeExhibit(1, 'fish-1'), true);
  assert.equal(store.placeExhibit(2, 'seal-1'), true);
  assert.equal(tasks(store.state)[3].done, true);
  assert.equal(store.placeExhibit(1, 'bi-1'), true);
  assert.deepEqual(store.state.exhibits, [null, 'bi-1', 'seal-1']);
  assert.equal(tasks(store.state)[3].done, false);
  assert.equal(store.state.pieces.length, 3);
  assert.equal(store.placeExhibit(1, null), true);
  assert.deepEqual(store.state.exhibits, [null, null, 'seal-1']);
  assert.deepEqual(new GameStore(disk).state.exhibits, store.state.exhibits);
});

test('exhibit validation rejects wrong locations, missing pieces and bad slots; unchanged input does not save', () => {
  const { store, disk } = setup();
  assert.equal(store.placeExhibit(0, 'bi-1'), false);
  store.navigate('gallery');
  const before = store.exportSave();
  for (const slot of [-1, 3, 0.5, '0', null, NaN]) assert.equal(store.placeExhibit(slot, 'bi-1'), false);
  for (const piece of ['missing', '', 1, undefined]) assert.equal(store.placeExhibit(0, piece), false);
  assert.equal(store.exportSave(), before);
  assert.equal(store.placeExhibit(0, 'bi-1'), true);
  let writes = 0;
  const write = disk.setItem;
  disk.setItem = (key, value) => { writes++; write(key, value); };
  assert.equal(store.placeExhibit(0, 'bi-1'), true);
  assert.equal(store.placeExhibit(1, null), true);
  assert.equal(writes, 0);
  store.menu();
  assert.equal(store.placeExhibit(0, null), false);
});

test('customization and exhibit write failures keep recoverable dirty progress without duplicate pieces', () => {
  const { store, disk } = setup();
  const write = disk.setItem;
  disk.setItem = () => { throw new Error('quota'); };
  assert.equal(store.customizePiece('bi-1', CUSTOMIZATION), true);
  assert.equal(store.dirty, true);
  store.navigate('gallery');
  assert.equal(store.placeExhibit(2, 'bi-1'), true);
  assert.equal(store.placeExhibit(0, 'bi-1'), true);
  assert.deepEqual(store.state.exhibits, ['bi-1', null, null]);
  assert.equal(store.state.pieces.length, 3);
  disk.setItem = write;
  assert.equal(store.retrySave(), true);
  const restored = new GameStore(disk);
  assert.deepEqual(restored.state.exhibits, store.state.exhibits);
  assert.deepEqual(restored.state.pieces[0], store.state.pieces[0]);
});

test('adding a material with the ID reserved by crafting returns false without mutating the session', () => {
  const { store } = setup();
  store.addMaterial('jadeite', 'reserved-ore');
  store.startCrafting('reserved-ore');
  const before = store.exportSave();
  assert.doesNotThrow(() => assert.equal(store.addMaterial('jadeite', 'reserved-ore'), false));
  assert.equal(store.exportSave(), before);
  assert.equal(store.state.inventory.length, 0);
});
