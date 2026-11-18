import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, freshState, validateState, workshopMaterials } from './state.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';
import { workCaption } from './work-caption.js';
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

function addLegacyStone(game, material, id) {
  game.state.inventory.pop();
  return game.addMaterial(material, id);
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
  assert.equal(addLegacyStone(game, 'jadeite', id), true);
  if (inspirationId) {
    assert.equal(game.recordMuseumObservation(inspirationId, 0), true);
    assert.equal(game.collectInspiration(inspirationId), true);
  }
  assert.equal(game.startCrafting(id, shape, { artisan: true, inspirationId }), true);
  const workId = game.state.crafting.materialId;
  finish(game);
  return structuredClone(game.state.pieces.find(piece => piece.id === workId));
}

test('twelve full works plus a reserved rework can export and reimport their own backup', () => {
  const { game } = newGame();
  const original=makePiece(game,'backup-source');
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

test('artisan strokes and completion preserve one work ID and exact surface without consuming the source', () => {
  const { game, disk } = newGame();
  const id = 'artisan-lifecycle';
  addLegacyStone(game, 'jadeite', id);
  game.recordMuseumObservation('heritage-jadeite-cabbage', 0);
  game.collectInspiration('heritage-jadeite-cabbage');
  assert.equal(game.startCrafting(id, 'fish', { artisan: true, inspirationId: 'heritage-jadeite-cabbage' }), true);
  assert.deepEqual(game.state.inventory.filter(item => !item.variety), [{ id, material: 'jadeite' }]);
  const workId = game.state.crafting.materialId;
  assert.notEqual(workId, id);
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
  assert.equal(game.state.pieces[0].id, workId);
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
  addLegacyStone(game, 'nephrite', 'refresh-work');
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
  assert.equal(restored.state.pieces[0].id, saved.materialId);
  assert.equal(restored.state.pieces[0].material, 'nephrite');
});

test('cancelling each artisan stage leaves the source untouched across reload', () => {
  for (let stage = 0; stage < 3; stage++) {
    const { game, disk } = newGame();
    addLegacyStone(game, 'jadeite', `cancel-${stage}`);
    game.startCrafting(`cancel-${stage}`, 'fish', { artisan: true });
    for (let index = 0; index < stage; index++) {
      readyStage(game);
      game.advanceCrafting();
    }
    const restored = reload(disk);
    assert.equal(restored.cancelCrafting(), true);
    assert.deepEqual(restored.state.inventory.filter(item => !item.variety), [{ id: `cancel-${stage}`, material: 'jadeite' }]);
    assert.equal(restored.state.crafting, null);
    assert.deepEqual(restored.state.pieces, []);
    assert.equal(restored.cancelCrafting(), false);
    assert.deepEqual(reload(disk).state.inventory, restored.state.inventory);
  }
});

test('rework cancellation after refresh restores the original finished surface, blessing and display slot', () => {
  const { game, disk } = newGame();
  const original = makePiece(game, 'rework-original', 'fish', 'heritage-jadeite-cabbage');
  game.customizePiece(original.id, { pattern: 'cloud', color: 'natural', blessing: '把河带回家' });
  original.blessing = game.state.pieces[0].blessing;
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
  assert.deepEqual(restored.state.inventory.filter(item => !item.variety), [{ id: 'rework-original', material: 'jadeite' }]);
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
  assert.deepEqual(game.state.inventory.filter(item => !item.variety), [{ id: 'rework-one-id', material: 'jadeite' }]);
  assert.deepEqual(new Set(game.state.discoveries), new Set(['fish', 'seal']));
  assert.equal(game.addMaterial('jadeite', original.id), false);
  assert.deepEqual(reload(disk).state.pieces, game.state.pieces);
});

test('malformed rework backups cannot be imported and later break cancellation', () => {
  const { game, disk } = newGame();
  const original = makePiece(game, 'rework-validated', 'fish');
  game.reworkPiece(original.id, 'seal');
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
  addLegacyStone(game, 'jadeite', 'protected-id');
  game.startCrafting('protected-id', 'fish', { artisan: true });
  const before = game.exportSave(), saved = disk.getItem(SAVE_KEY);
  for (const draft of [
    null,
    { completed: true },
    createDraft({ id: 'foreign-id', material: 'jadeite' }, 'fish'),
    createDraft({ id: game.state.crafting.materialId, material: 'jadeite' }, 'seal'),
    createDraft({ id: game.state.crafting.materialId, material: 'nephrite' }, 'fish'),
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
  // Add new catalogue entries to a notebook saved before the expansion.
  const expanded = reload(disk);
  for (const newId of ['material-turquoise', 'heritage-empress-seal', 'heritage-tongyin']) {
    assert.equal(expanded.recordMuseumObservation(newId, 2), true);
    assert.equal(expanded.collectInspiration(newId), true);
  }
  const restored = reload(disk);
  assert.deepEqual(restored.state.museum.observations[id], [1]);
  assert.deepEqual(restored.state.museum.inspirations, [id, 'material-turquoise', 'heritage-empress-seal', 'heritage-tongyin']);
  for (const museum of [
    { ...game.state.museum, observations: { unknown: [0] } },
    { ...game.state.museum, observations: { [id]: [0, 0] } },
    { ...game.state.museum, inspirations: [id, id] },
    { ...game.state.museum, inspirations: ['unknown'] },
  ]) assert.throws(() => validateState({ ...freshState(), museum }));
});

test('each exhibit can be collected for creation and survives the first material handoff', () => {
  for (const exhibit of MUSEUM_EXHIBITS) {
    const { game, disk } = newGame();
    const other = MUSEUM_EXHIBITS.find(item => item.id !== exhibit.id);
    game.recordMuseumObservation(other.id, 0);
    game.collectInspiration(other.id);
    assert.equal(game.collectInspiration(exhibit.id, { forCreation: true }), true);
    assert.equal(game.collectInspiration(exhibit.id, { forCreation: true }), true);
    assert.deepEqual(game.state.museum.inspirations, [other.id, exhibit.id]);
    assert.equal(game.state.museum.observations[exhibit.id], undefined);
    assert.equal(workshopMaterials(game.state).length, 12);
    assert.equal(game.startCrafting('stock-green-stream', 'fish', { artisan: true }), false);
    assert.equal(game.collectInspiration('unknown', { forCreation: true }), false);

    const restored = reload(disk);
    assert.equal(restored.state.museum.pendingInspirationId, exhibit.id);
    assert.equal(restored.acknowledgeOpening(), true);
    assert.equal(restored.state.museum.pendingInspirationId, exhibit.id);
    const picked = workshopMaterials(restored.state).find(material => material.id === 'stock-green-stream');
    assert.equal(restored.startCrafting(picked.id, 'fish', { artisan: true }), true);
    assert.equal(restored.state.crafting.inspirationId, exhibit.id);
    assert.equal(restored.state.museum.pendingInspirationId, null);
  }
});

test('a completed inspired work cites its actual color band and carved motif after reload', () => {
  const { game, disk } = newGame();
  const id = 'heritage-jadeite-cabbage';
  assert.equal(game.collectInspiration(id, { forCreation: true }), true);
  assert.equal(game.acknowledgeOpening(), true);
  assert.equal(game.startCrafting('stock-green-stream', 'fish', { artisan: true,
    motifs: [{ id: 'm1', kind: 'wave', x: 0, y: 0, rotation: 0, scale: 1, mirror: false }] }), true);
  finish(game);
  const piece = reload(disk).state.pieces[0];
  const surface = getCraftSurface(piece.artisan);
  const bandCells = surface.base.filter((cell, index) => cell && surface.colorBand[index]).length;
  const share = Math.round(bandCells / surface.base.filter(Boolean).length * 100);
  assert.ok(share > 0 && share < 100);
  assert.match(workCaption(piece)[0], /翠玉白菜.*顺色取形/);
  assert.match(workCaption(piece)[1], new RegExp(`浅色带.*${share}%`));
  assert.match(workCaption(piece)[2], /实际刻下了水波/);

  const noEvidence = structuredClone(piece);
  noEvidence.artisan.carve.fill(0);
  noEvidence.artisan.base = surface.base.map((cell, index) => surface.colorBand[index] ? 0 : cell);
  assert.deepEqual(workCaption(noEvidence), [workCaption(piece)[0]]);
  assert.deepEqual(workCaption({ id: 'old', inspirationId: 'unknown' }), []);
  const companionStory = { returned: true, delivery: { route: 'companion', pieceId: piece.id,
    material: piece.material, finish: piece.artisan.finish, motifs: ['wave'] } };
  assert.match(workCaption(piece, companionStory).at(-1), /阿宁回访.*水纹/);
  assert.equal(workCaption({ ...piece, id: 'another' }, companionStory).length, 3);
});

test('explicit free creation clears the pending reference without rewriting an existing draft', () => {
  const { game } = newGame();
  game.acknowledgeOpening();
  const material = workshopMaterials(game.state)[0];
  game.startCrafting(material.id, 'fish', { artisan: true });
  const exhibit = MUSEUM_EXHIBITS[0];
  game.collectInspiration(exhibit.id, { forCreation: true });
  assert.equal(game.state.crafting.inspirationId, undefined);
  assert.equal(game.state.museum.pendingInspirationId, exhibit.id);
  game.cancelCrafting();
  game.startCrafting(material.id, 'fish', { artisan: true, inspirationId: '' });
  assert.equal(game.state.crafting.inspirationId, undefined);
  assert.equal(game.state.museum.pendingInspirationId, null);
  assert.deepEqual(game.state.museum.inspirations, [exhibit.id]);
});

test('starter stones have different design palettes and survive repeated selection and reload', () => {
  const { game, disk } = newGame();
  const inventory = structuredClone(game.state.inventory);
  const colorMaps = new Set();
  for (const stone of inventory) {
    assert.equal(game.startCrafting(stone.id, 'bi', { artisan: true }), true);
    const draft = game.state.crafting.artisan;
    assert.equal(draft.material.variety, stone.variety);
    assert.equal(reload(disk).state.crafting.artisan.material.variety, stone.variety);
    colorMaps.add(getCraftSurface(draft).colors.join(''));
    assert.equal(game.cancelCrafting(), true);
  }
  assert.equal(colorMaps.size, 12);
  assert.deepEqual(game.state.inventory, inventory);
  assert.equal(game.state.opening.introduced, false);
});

test('six base codex shapes and four related studies can be collected', () => {
  const { game, disk } = newGame();
  assert.equal(game.collectCodex('jue'), false);
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
  for (const id of ['gui','zhang','jue','cicada']) {
    assert.equal(game.collectCodex(id), true);
    assert.equal(game.collectCodex(id), false);
  }
  assert.equal(game.state.discoveries.length, 10);
  assert.deepEqual(reload(disk).state.discoveries, game.state.discoveries);
});
