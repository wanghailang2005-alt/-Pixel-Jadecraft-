import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, freshState, validateState } from './state.js';
import {
  CRAFT_SIZE, createDraft, getCraftSurface, applyStroke, beginStroke, endStroke, stageMetrics,
} from './craft-model.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

function newGame(disk = memoryStorage()) {
  const game = new GameStore(disk);
  game.startNew();
  return { game, disk };
}

function reload(disk) {
  const game = new GameStore(disk);
  assert.equal(game.error, '');
  game.resume();
  assert.equal(game.active, true);
  return game;
}

function sweep(draft, tool, left = -8, right = CRAFT_SIZE + 8) {
  beginStroke(draft);
  for (let y = 0; y <= CRAFT_SIZE; y += 7) applyStroke(draft, { x: left, y }, { x: right, y }, tool, 5);
  endStroke(draft);
}

function readyStage(game) {
  const draft = structuredClone(game.state.crafting.artisan);
  if (draft.stage === 'shape') {
    sweep(draft, 'rough');
    sweep(draft, 'fine', -8, 25);
  } else if (draft.stage === 'carve') {
    beginStroke(draft);
    for (const path of getCraftSurface(draft).guidePaths) {
      for (let index = 1; index < path.length; index++) applyStroke(draft, path[index - 1], path[index], 'engrave', 1.4);
    }
    endStroke(draft);
    sweep(draft, 'relief', -8, 25);
  } else {
    sweep(draft, 'sand');
    sweep(draft, 'polish', -8, 20);
  }
  assert.equal(stageMetrics(draft).ready, true, JSON.stringify(stageMetrics(draft)));
  assert.equal(game.updateArtisan(draft), true);
  return draft;
}

function finish(game) {
  while (game.state.crafting) {
    readyStage(game);
    assert.equal(game.advanceCrafting(), true);
  }
}

function makePiece(game, id, shape = 'fish', inspirationId = null) {
  assert.equal(game.addMaterial('jadeite', id), true);
  if (inspirationId) {
    assert.equal(game.recordMuseumObservation(inspirationId, 0), true);
    assert.equal(game.collectInspiration(inspirationId), true);
  }
  assert.equal(game.startCrafting(id, shape, { artisan: true, inspirationId }), true);
  finish(game);
  return structuredClone(game.state.pieces.find(piece => piece.id === id));
}

test('twelve full works plus a reserved rework can export and reimport their own backup', () => {
  const { game } = newGame();
  const original=makePiece(game,'backup-0');
  const state=structuredClone(game.state);
  state.pieces=Array.from({length:12},(_,index)=>{const p=structuredClone(original);p.id=`backup-${index}`;p.artisan.material.id=p.id;return p;});
  game.importSave(JSON.stringify(state));
  assert.equal(game.reworkPiece('backup-0'),true);
  const serialized=game.exportSave();
  assert.ok(serialized.length<2_000_000);
  const {game:restored}=newGame();restored.importSave(serialized);
  assert.deepEqual(restored.state.pieces,game.state.pieces);
  assert.deepEqual(restored.state.crafting,game.state.crafting);
  assert.equal(restored.cancelCrafting(),true);assert.equal(restored.state.pieces.length,12);
});

test('artisan reservation, real strokes and completion preserve one material ID and exact surface', () => {
  const { game, disk } = newGame();
  const id = 'artisan-lifecycle';
  game.addMaterial('jadeite', id);
  game.recordMuseumObservation('heritage-jadeite-cabbage', 0);
  game.collectInspiration('heritage-jadeite-cabbage');
  assert.equal(game.startCrafting(id, 'fish', { artisan: true, inspirationId: 'heritage-jadeite-cabbage' }), true);
  assert.deepEqual(game.state.inventory, []);
  assert.equal(game.state.crafting.materialId, id);
  assert.equal(game.advanceCrafting(), false);
  assert.equal(game.addMaterial('jadeite', id), false);
  assert.equal(game.startCrafting(id, 'seal', { artisan: true }), false);
  readyStage(game);
  assert.equal(game.advanceCrafting(), true);
  readyStage(game);
  assert.equal(game.advanceCrafting(), true);
  const finalSurface = readyStage(game);
  assert.equal(game.advanceCrafting(), true);
  assert.equal(game.state.crafting, null);
  assert.equal(game.state.pieces.length, 1);
  assert.equal(game.state.pieces[0].id, id);
  assert.equal(game.state.pieces[0].inspirationId, 'heritage-jadeite-cabbage');
  assert.equal(game.state.pieces[0].artisan.completed, true);
  for (const key of ['base', 'height', 'carve', 'roughness']) assert.deepEqual(game.state.pieces[0].artisan[key], finalSurface[key]);
  assert.ok(game.state.pieces[0].artisan.carve.some(Boolean));
  assert.deepEqual(game.state.discoveries, ['fish']);
  assert.equal(game.advanceCrafting(), false);
  assert.equal(game.addMaterial('jadeite', id), false);
  assert.deepEqual(reload(disk).state.pieces, game.state.pieces);
});

test('a partly carved draft, its checkpoint and undo survive refresh before finishing', () => {
  const { game, disk } = newGame();
  game.addMaterial('nephrite', 'refresh-work');
  game.startCrafting('refresh-work', 'fish', { artisan: true, layout: { rotation: 12 } });
  readyStage(game);
  game.advanceCrafting();
  const draft = structuredClone(game.state.crafting.artisan);
  const path = getCraftSurface(draft).guidePaths[0];
  for (let index = 1; index < 8; index++) applyStroke(draft, path[index - 1], path[index], 'engrave', 1.4);
  endStroke(draft);
  assert.equal(game.updateArtisan(draft), true);
  const saved = structuredClone(game.state.crafting);
  draft.carve.fill(0);
  assert.notDeepEqual(game.state.crafting.artisan.carve, draft.carve);
  const restored = reload(disk);
  assert.deepEqual(restored.state.crafting, saved);
  assert.ok(restored.state.crafting.artisan.undo);
  assert.equal(restored.state.crafting.artisan.layout.rotation, 12);
  finish(restored);
  assert.equal(restored.state.pieces[0].id, 'refresh-work');
  assert.equal(restored.state.pieces[0].material, 'nephrite');
});

test('cancelling each artisan stage returns the reserved stone exactly once across reload', () => {
  for (let stage = 0; stage < 3; stage++) {
    const { game, disk } = newGame();
    game.addMaterial('jadeite', `cancel-${stage}`);
    game.startCrafting(`cancel-${stage}`, 'fish', { artisan: true });
    for (let index = 0; index < stage; index++) {
      readyStage(game);
      game.advanceCrafting();
    }
    const restored = reload(disk);
    assert.equal(restored.cancelCrafting(), true);
    assert.deepEqual(restored.state.inventory, [{ id: `cancel-${stage}`, material: 'jadeite' }]);
    assert.equal(restored.state.crafting, null);
    assert.deepEqual(restored.state.pieces, []);
    assert.equal(restored.cancelCrafting(), false);
    assert.deepEqual(reload(disk).state.inventory, restored.state.inventory);
  }
});

test('rework cancellation after refresh restores the original finished surface, blessing and display slot', () => {
  const { game, disk } = newGame();
  makePiece(game, 'rework-original', 'fish', 'heritage-jadeite-cabbage');
  game.customizePiece('rework-original', { pattern: 'cloud', color: 'natural', blessing: '把河带回家' });
  const original = structuredClone(game.state.pieces[0]);
  game.navigate('gallery');
  game.placeExhibit(2, original.id);
  game.navigate('workshop');
  assert.equal(game.reworkPiece(original.id, 'seal'), true);
  assert.deepEqual(game.state.pieces, []);
  assert.deepEqual(game.state.exhibits, [null, null, null]);
  assert.deepEqual(game.state.crafting.originalSlots, [2]);
  readyStage(game);
  game.advanceCrafting();
  const restored = reload(disk);
  assert.equal(restored.cancelCrafting(), true);
  assert.deepEqual(restored.state.pieces, [original]);
  assert.deepEqual(restored.state.exhibits, [null, null, original.id]);
  assert.deepEqual(restored.state.inventory, []);
  assert.equal(restored.cancelCrafting(), false);
  assert.deepEqual(reload(disk).state.pieces, [original]);
});

test('completed rework changes shape without copying material or losing its collected inspiration', () => {
  const { game, disk } = newGame();
  const original = makePiece(game, 'rework-one-id', 'fish', 'heritage-jadeite-cabbage');
  game.customizePiece(original.id, { pattern: 'cloud', color: 'natural', blessing: '山水长存' });
  game.navigate('gallery');
  game.placeExhibit(1, original.id);
  game.navigate('workshop');
  assert.equal(game.reworkPiece(original.id, 'seal'), true);
  assert.equal(game.reworkPiece(original.id), false);
  finish(game);
  assert.equal(game.state.pieces.length, 1);
  const piece = game.state.pieces[0];
  assert.equal(piece.id, original.id);
  assert.equal(piece.shape, 'seal');
  assert.equal(piece.artisan.shape, 'seal');
  assert.equal(piece.blessing, '山水长存');
  assert.equal(piece.inspirationId, original.inspirationId);
  assert.notDeepEqual(piece.artisan.base, original.artisan.base);
  assert.deepEqual(game.state.inventory, []);
  assert.deepEqual(new Set(game.state.discoveries), new Set(['fish', 'seal']));
  assert.equal(game.addMaterial('jadeite', original.id), false);
  assert.deepEqual(reload(disk).state.pieces, game.state.pieces);
});

test('malformed rework backups cannot be imported and later break cancellation', () => {
  const { game, disk } = newGame();
  makePiece(game, 'rework-validated', 'fish');
  game.reworkPiece('rework-validated', 'seal');
  const originalSave = game.exportSave(), stored = disk.getItem(SAVE_KEY);
  for (const alter of [
    state => { state.crafting.originalPiece.blessing = 'x'.repeat(25); },
    state => { state.crafting.originalPiece.pattern = 'unknown'; },
    state => { state.crafting.originalPiece.color = 'unknown'; },
    state => { state.crafting.originalPiece.shape = 'bi'; },
    state => { state.crafting.originalSlots = [0, 0]; },
    state => { state.crafting.originalSlots = [0, 1]; },
  ]) {
    const corrupt = JSON.parse(originalSave); alter(corrupt);
    assert.throws(() => game.importSave(JSON.stringify(corrupt)));
    assert.equal(game.exportSave(), originalSave);
    assert.equal(disk.getItem(SAVE_KEY), stored);
  }
  assert.equal(game.cancelCrafting(), true);
  assert.equal(game.state.pieces[0].shape, 'fish');
});

test('artisan updates reject malformed, foreign and mismatched drafts without mutating memory or disk', () => {
  const { game, disk } = newGame();
  game.addMaterial('jadeite', 'protected-id');
  game.startCrafting('protected-id', 'fish', { artisan: true });
  const before = game.exportSave(), saved = disk.getItem(SAVE_KEY);
  for (const draft of [
    null,
    { completed: true },
    createDraft({ id: 'foreign-id', material: 'jadeite' }, 'fish'),
    createDraft({ id: 'protected-id', material: 'jadeite' }, 'seal'),
    createDraft({ id: 'protected-id', material: 'nephrite' }, 'fish'),
  ]) {
    assert.equal(game.updateArtisan(draft), false);
    assert.equal(game.exportSave(), before);
    assert.equal(disk.getItem(SAVE_KEY), saved);
  }
});

test('museum observations and inspirations reject invalid input and persist without duplication', () => {
  const { game, disk } = newGame();
  const id = 'heritage-songze-huang';
  const before = game.exportSave();
  assert.equal(game.collectInspiration(id), false);
  assert.equal(game.recordMuseumObservation('unknown', 0), false);
  assert.equal(game.collectInspiration('unknown'), false);
  for (const index of [-1, 3, .5, NaN, '0', null]) assert.equal(game.recordMuseumObservation(id, index), false);
  assert.equal(game.exportSave(), before);
  assert.equal(game.recordMuseumObservation(id, 1), true);
  assert.equal(game.collectInspiration(id), true);
  const saved = disk.getItem(SAVE_KEY);
  for (let repeat = 0; repeat < 3; repeat++) {
    assert.equal(game.recordMuseumObservation(id, 1), true);
    assert.equal(game.collectInspiration(id), true);
  }
  assert.equal(disk.getItem(SAVE_KEY), saved);
  assert.deepEqual(game.state.museum.observations[id], [1]);
  assert.deepEqual(game.state.museum.inspirations, [id]);
  assert.equal(game.configureExhibition('nature', 'moon'), true);
  assert.equal(game.configureExhibition('unknown', 'moon'), false);
  assert.deepEqual(reload(disk).state.museum, game.state.museum);
  for (const museum of [
    { ...game.state.museum, observations: { unknown: [0] } },
    { ...game.state.museum, observations: { [id]: [0, 0] } },
    { ...game.state.museum, inspirations: [id, id] },
    { ...game.state.museum, inspirations: ['unknown'] },
  ]) assert.throws(() => validateState({ ...freshState(), museum }));
});

test('all six codex shapes can be collected through crafting and museum inspiration', () => {
  const { game, disk } = newGame();
  for (const shape of ['bi', 'fish', 'seal']) makePiece(game, `codex-${shape}`, shape);
  for (const [id, shape] of [
    ['heritage-cong-king', 'cong'], ['heritage-songze-huang', 'huang'], ['heritage-hongshan-dragon', 'dragon'],
  ]) {
    assert.equal(game.recordMuseumObservation(id, 0), true);
    assert.equal(game.collectInspiration(id), true);
    assert.ok(game.state.discoveries.includes(shape));
    assert.equal(game.collectInspiration(id), true);
  }
  assert.equal(game.state.discoveries.length, 6);
  assert.deepEqual(new Set(game.state.discoveries), new Set(['bi', 'fish', 'seal', 'cong', 'huang', 'dragon']));
  assert.deepEqual(reload(disk).state.discoveries, game.state.discoveries);
});

test('mine drops survive refresh and successful pickup clears them exactly once', () => {
  const { game, disk } = newGame();
  game.navigate('mine');
  assert.equal(game.consumeMineVein('C1-L', { material: 'jadeite', x: 450, y: 610 }), true);
  assert.equal(game.consumeMineVein('C1-L', { material: 'jadeite', x: 450, y: 610 }), false);
  assert.equal(game.state.inventory.length, 0);
  assert.deepEqual(game.state.pendingDrops, [{ id: 'C1-L', material: 'jadeite', x: 450, y: 610 }]);
  const restored = reload(disk);
  assert.deepEqual(restored.state.pendingDrops, game.state.pendingDrops);
  assert.deepEqual(restored.state.mineVeins[0], [true, false]);
  assert.equal(restored.addMaterial('jadeite', 'C1-L'), true);
  assert.deepEqual(restored.state.pendingDrops, []);
  assert.equal(restored.addMaterial('jadeite', 'C1-L'), false);
  assert.deepEqual(restored.state.inventory, [{ id: 'C1-L', material: 'jadeite' }]);
  const again = reload(disk);
  assert.deepEqual(again.state.pendingDrops, []);
  assert.equal(again.consumeMineVein('C1-L', { material: 'jadeite', x: 450, y: 610 }), false);
  assert.equal(again.state.inventory.length, 1);
});

test('full inventory leaves a pending drop available until space is freed', () => {
  const { game, disk } = newGame();
  for (let index = 0; index < 12; index++) game.addMaterial('nephrite', `full-${index}`);
  game.navigate('mine');
  game.consumeMineVein('C2-R', { material: 'jadeite', x: 900, y: 500 });
  assert.equal(game.addMaterial('jadeite', 'C2-R'), false);
  const restored = reload(disk);
  assert.equal(restored.state.pendingDrops.length, 1);
  restored.navigate('workshop');
  assert.equal(restored.startCrafting('full-0', 'fish', { artisan: true }), true);
  assert.equal(restored.addMaterial('jadeite', 'C2-R'), true);
  assert.equal(restored.state.inventory.length, 12);
  assert.deepEqual(restored.state.pendingDrops, []);
  assert.equal(reload(disk).state.crafting.materialId, 'full-0');
});

test('pending-drop validation rejects repeated IDs, inventory overlap and invalid positions', () => {
  const drop = { id: 'C1-L', material: 'jadeite', x: 400, y: 500 };
  for (const pendingDrops of [
    [drop, drop], [{ ...drop, id: 'C9-R' }], [{ ...drop, x: -1 }], [{ ...drop, y: 1025 }], [{ ...drop, material: 'unknown' }],
  ]) assert.throws(() => validateState({ ...freshState(), pendingDrops }));
  assert.throws(() => validateState({ ...freshState(), pendingDrops: [drop], inventory: [{ id: drop.id, material: drop.material }] }));
});
