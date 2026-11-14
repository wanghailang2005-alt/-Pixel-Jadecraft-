import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, BACKUP_KEY, PREV_BACKUP_KEY, freshState, validateState, tasks } from './state.js';
import { PauseGate } from './pause.js';
import { INSPECTION_QUESTIONS } from './inspection.js';

function storage(raw = null) {
  const data = new Map(raw === null ? [] : [[SAVE_KEY, raw]]);
  return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
}

test('inspection answers migrate old saves while preserving existing observation progress', () => {
  const legacy = freshState();
  delete legacy.inspectionAnswers;
  legacy.observations = 3;
  legacy.inventory.push({ id: 'legacy-ore', material: 'nephrite' });
  const game = new GameStore(storage(JSON.stringify(legacy)));
  game.resume();
  assert.deepEqual(game.state.inspectionAnswers, []);
  assert.equal(game.state.observations, 3);
  const question = INSPECTION_QUESTIONS[0];
  assert.deepEqual(game.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: false });
  assert.equal(game.state.observations, 4);
  assert.equal(game.state.inventory.length, 1);
});

test('inspection requires an active workshop and material; wrong and illegal choices preserve state', () => {
  const game = new GameStore(storage());
  const question = INSPECTION_QUESTIONS[0];
  const rejected = { correct: false, alreadyAnswered: false };
  assert.deepEqual(game.answerInspection(question.id, question.answer), rejected);
  game.startNew();
  assert.deepEqual(game.answerInspection(question.id, question.answer), rejected);
  game.addMaterial('jadeite', 'inspection-ore');
  game.navigate('mine');
  assert.deepEqual(game.answerInspection(question.id, question.answer), rejected);
  game.navigate('workshop');
  const before = game.exportSave();
  for (const index of [-1, 3, 0.5, NaN, Infinity, '1', null, undefined]) {
    assert.deepEqual(game.answerInspection(question.id, index), rejected);
  }
  assert.deepEqual(game.answerInspection('unknown', 0), rejected);
  assert.deepEqual(game.answerInspection(question.id, (question.answer + 1) % 3), rejected);
  assert.equal(game.exportSave(), before);
});

test('inspection correct answers count once across repeated clicks, reload and save export/import', () => {
  const disk = storage();
  const game = new GameStore(disk);
  game.startNew();
  game.addMaterial('nephrite', 'inspection-ore');
  for (const question of INSPECTION_QUESTIONS.slice(0, 3)) {
    assert.deepEqual(game.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: false });
    const saved = disk.getItem(SAVE_KEY);
    assert.deepEqual(game.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: true });
    assert.equal(disk.getItem(SAVE_KEY), saved);
  }
  assert.equal(game.state.observations, 3);
  assert.equal(tasks(game.state)[1].done, true);
  assert.equal(game.state.inventory.length, 1);
  const restored = new GameStore(disk);
  restored.resume();
  const question = INSPECTION_QUESTIONS[0];
  assert.deepEqual(restored.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: true });
  assert.equal(restored.state.observations, 3);
  restored.importSave(game.exportSave());
  assert.deepEqual(restored.state.inspectionAnswers, game.state.inspectionAnswers);
  assert.deepEqual(restored.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: true });
  restored.startNew();
  assert.deepEqual(restored.state.inspectionAnswers, []);
  assert.equal(restored.state.observations, 0);
});

test('inspection schema rejects malformed or repeated answer IDs without replacing an imported save', () => {
  const game = new GameStore(storage());
  game.startNew();
  const before = game.exportSave();
  const questionId = INSPECTION_QUESTIONS[0].id;
  for (const inspectionAnswers of [null, {}, 'done', [questionId, questionId], ['unknown'], [1], [undefined], Array(1)]) {
    assert.throws(() => validateState({ ...freshState(), inspectionAnswers }));
    assert.throws(() => game.importSave(JSON.stringify({ ...freshState(), inspectionAnswers })));
    assert.equal(game.exportSave(), before);
  }
});

test('inspection save failure retains a deduplicated session and retry persists the answer', () => {
  const disk = storage();
  const game = new GameStore(disk);
  game.startNew();
  game.addMaterial('nephrite', 'inspection-ore');
  const write = disk.setItem;
  disk.setItem = () => { throw new Error('quota'); };
  const question = INSPECTION_QUESTIONS[0];
  assert.deepEqual(game.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: false });
  assert.equal(game.dirty, true);
  assert.ok(game.error);
  assert.equal(game.state.observations, 1);
  assert.deepEqual(game.answerInspection(question.id, question.answer), { correct: true, alreadyAnswered: true });
  disk.setItem = write;
  assert.equal(game.retrySave(), true);
  assert.equal(game.dirty, false);
  assert.deepEqual(new GameStore(disk).state.inspectionAnswers, [question.id]);
});

test('opening practice is saved independently from the main quest and is idempotent', () => {
  const disk = storage(), game = new GameStore(disk);
  game.startNew();
  assert.deepEqual(game.state.opening, { introduced: false, polished: false });
  assert.equal(game.completeOpeningPolish(), false);
  assert.equal(game.acknowledgeOpening(), true);
  assert.equal(game.completeOpeningPolish(), true);
  const saved = disk.getItem(SAVE_KEY);
  assert.equal(game.completeOpeningPolish(), false);
  assert.equal(disk.getItem(SAVE_KEY), saved);
  assert.ok(tasks(game.state).every(task => !task.done));
  assert.deepEqual(new GameStore(disk).state.opening, { introduced: true, polished: true });
  game.startNew();
  assert.deepEqual(game.state.opening, { introduced: false, polished: false });
});

test('legacy saves continue with normalized opening fields and malformed fields are rejected', () => {
  const legacy = freshState();
  delete legacy.opening;
  const game = new GameStore(storage(JSON.stringify(legacy)));
  game.resume();
  assert.equal(game.active, true);
  assert.deepEqual(game.state.opening, { introduced: true, polished: false });
  for (const opening of [null, {}, { introduced: true }, { introduced: 'yes', polished: false }, { introduced: false, polished: true }]) {
    assert.throws(() => validateState({ ...freshState(), opening }));
  }
});

test('session replacement advances revision and practice save failures remain recoverable', () => {
  const disk = storage(), game = new GameStore(disk);
  const initialRevision = game.sessionRevision;
  game.startNew();
  assert.equal(game.sessionRevision, initialRevision + 1);
  const beforeImport = game.sessionRevision;
  assert.throws(() => game.importSave('broken'));
  assert.equal(game.sessionRevision, beforeImport);
  game.importSave(JSON.stringify(freshState()));
  assert.equal(game.sessionRevision, beforeImport + 1);
  game.acknowledgeOpening();
  disk.setItem = () => { throw new Error('quota'); };
  assert.equal(game.completeOpeningPolish(), true);
  assert.equal(game.state.opening.polished, true);
  assert.equal(game.dirty, true);
  game.navigate('mine');
  assert.equal(game.completeOpeningPolish(), false);
});
test('new game, movement, settings, inventory and refresh round-trip', () => {
  const disk = storage(), game = new GameStore(disk);
  assert.equal(game.hasSave, false);
  game.configure({ muted: true, volume: .2 }); game.startNew();
  assert.equal(game.state.settings.muted, true);
  assert.equal(game.addMaterial('jadeite', 'ore-1'), true);
  game.navigate('mine');
  const restored = new GameStore(disk); restored.resume();
  assert.equal(restored.active, true); assert.equal(restored.state.location, 'mine');
  assert.deepEqual(restored.state.inventory, [{ id:'ore-1', material:'jadeite' }]);
  assert.equal(tasks(restored.state)[0].done, true);
  restored.state.stamina = 0; restored.navigate('workshop');
  assert.equal(restored.state.stamina, 100);
});
test('inventory rejects unknown material, duplicate settlements and capacity overflow', () => {
  const game = new GameStore(storage()); game.startNew();
  assert.equal(game.addMaterial('unknown', 'bad'), false);
  for(let i=0;i<12;i++) assert.equal(game.addMaterial('nephrite', `ore-${i}`), true);
  const before = game.exportSave();
  assert.equal(game.addMaterial('jadeite', 'ore-0'), false);
  assert.equal(game.addMaterial('jadeite', 'overflow'), false);
  assert.equal(game.exportSave(), before);
});
test('damaged save is retained and cannot be resumed or silently rewritten', () => {
  const disk = storage('{broken'), game = new GameStore(disk);
  assert.ok(game.error); assert.equal(game.hasSave, true);
  game.resume(); assert.equal(game.active, false);
  assert.equal(disk.getItem(SAVE_KEY), '{broken');
  assert.equal(game.exportOriginal(), '{broken');
});
test('invalid import leaves memory and disk intact; valid import restores both', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  const before = game.exportSave(), saved = disk.getItem(SAVE_KEY);
  for (const raw of ['bad', JSON.stringify({ version:2 }), 'x'.repeat(2_000_001)]) {
    assert.throws(() => game.importSave(raw));
    assert.equal(game.exportSave(), before); assert.equal(disk.getItem(SAVE_KEY), saved);
  }
  const backup = freshState(); backup.location = 'gallery'; backup.settings.muted = true;
  game.importSave(JSON.stringify(backup));
  assert.equal(game.state.location, 'gallery'); assert.equal(game.active, true);
  assert.equal(new GameStore(disk).state.settings.muted, true);
});
test('write failure preserves imported state and exposes automatic-save failure', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  const before = game.exportSave(), saved = disk.getItem(SAVE_KEY);
  disk.setItem = () => { throw new Error('quota'); };
  assert.throws(() => game.importSave(JSON.stringify(freshState())));
  assert.equal(game.exportSave(), before); assert.equal(disk.getItem(SAVE_KEY), saved);
  game.navigate('mine'); assert.ok(game.error); assert.equal(game.state.location, 'mine');
  assert.equal(disk.getItem(SAVE_KEY), saved);
});
test('schema rejects illegal references, non-finite values, duplicate IDs and malformed crafting data', () => {
  const invalid = [
    { exhibits:['missing',null,null] }, { settings:{muted:false,volume:NaN} },
    { stamina:-1 }, { observations:1.5 }, { crafting:{} },
    { inventory:[{id:'same',material:'jadeite'},{id:'same',material:'jadeite'}] },
    { discoveries:['fake'] }, { location:'__proto__' },
  ];
  for(const change of invalid) assert.throws(() => validateState({ ...freshState(), ...change }));
});
test('exhibition task requires three distinct shapes and actual display references', () => {
  const state = freshState();
  state.pieces = ['bi','fish','seal'].map((shape,i)=>({id:`p${i}`,shape,material:'jadeite'}));
  assert.equal(tasks(state)[2].done, true); assert.equal(tasks(state)[3].done, false);
  state.exhibits = ['p0','p1','p2'];
  assert.equal(tasks(validateState(state))[3].done, true);
  state.exhibits = ['p0','p0','p2']; assert.throws(() => validateState(state));
});
test('menu preferences persist independently without replacing a damaged game save', () => {
  const disk = storage('{damaged'), game = new GameStore(disk);
  game.configure({ muted:true, volume:.65 });
  assert.equal(disk.getItem(SAVE_KEY), '{damaged');
  const restored = new GameStore(disk);
  assert.equal(restored.state.settings.muted, true);
  assert.equal(restored.state.settings.volume, .65);
  assert.equal(restored.hasSession, false);
  assert.equal(restored.retrySave(), false);
  assert.ok(restored.error);
});
test('a valid checkpoint recovers after primary save corruption', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  game.addMaterial('nephrite', 'checkpoint-ore');
  game.navigate('mine');
  assert.equal(JSON.parse(disk.getItem(BACKUP_KEY)).inventory.length, 1);
  disk.setItem(SAVE_KEY, '{corrupt');
  const damaged = new GameStore(disk);
  assert.ok(damaged.error); assert.equal(damaged.recovery().inventory.length, 1);
  damaged.recover();
  assert.equal(damaged.active, true); assert.equal(damaged.error, '');
  assert.equal(damaged.state.inventory[0].id, 'checkpoint-ore');
  assert.equal(new GameStore(disk).hasSession, true);
});
test('failed saves remain playable after returning to menu, and retry clears dirty status', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  const write = disk.setItem; disk.setItem = () => { throw new Error('full'); };
  game.navigate('mine'); assert.equal(game.dirty, true);
  game.menu(); game.resume(); assert.equal(game.active, true); assert.equal(game.state.location, 'mine');
  disk.setItem = write;
  assert.equal(game.retrySave(), true); assert.equal(game.dirty, false); assert.equal(game.error, '');
  assert.equal(new GameStore(disk).state.location, 'mine');
});
test('pause reasons compose and clearing a panel never resumes a hidden tab', () => {
  const gate = new PauseGate();
  gate.set('overlay', true); gate.set('hidden', true);
  gate.set('overlay', false); assert.equal(gate.paused, true);
  gate.set('hidden', false); assert.equal(gate.paused, false);
  gate.set('overlay', true); gate.set('overlay', true); gate.set('overlay', false);
  assert.equal(gate.paused, false);
});

test('crafting schema round-trips every step and progress boundaries', () => {
  for (const step of ['shape', 'carve', 'polish']) {
    for (const progress of [0, 42, 100]) {
      const crafting = { step, progress, materialId: 'ore-1', tool: '' };
      const disk = storage(), game = new GameStore(disk);
      game.importSave(JSON.stringify({ ...freshState(), crafting }));
      assert.deepEqual(new GameStore(disk).state.crafting, crafting);
      assert.deepEqual(JSON.parse(game.exportSave()).crafting, crafting);
    }
  }
});

test('crafting schema rejects invalid fields with the existing Chinese error', () => {
  const valid = { step: 'carve', progress: 50, materialId: 'ore-1', tool: 'chisel' };
  const invalid = [undefined, false, [], 'carve', {},
    ...['step', 'progress', 'materialId', 'tool'].map(key => {
      const crafting = { ...valid }; delete crafting[key]; return crafting;
    }),
    ...['cut', null, 1].map(step => ({ ...valid, step })),
    ...[-1, 101, 1.5, NaN, Infinity, '50', null].map(progress => ({ ...valid, progress })),
    ...['', '   ', null, 1].map(materialId => ({ ...valid, materialId })),
    ...[null, 1, {}].map(tool => ({ ...valid, tool })),
  ];
  const disk = storage(), game = new GameStore(disk); game.startNew();
  const before = game.exportSave(), saved = disk.getItem(SAVE_KEY);
  for (const crafting of invalid) {
    const state = { ...freshState(), crafting };
    assert.throws(() => validateState(state), /存档格式不完整或版本不兼容，请选择有效的备份。/);
    assert.throws(() => game.importSave(JSON.stringify(state)), /存档格式不完整或版本不兼容，请选择有效的备份。/);
    assert.equal(game.exportSave(), before);
    assert.equal(disk.getItem(SAVE_KEY), saved);
  }
});

test('two consecutive new games retain the original nonempty save in the earlier backup', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  game.addMaterial('nephrite', 'original-ore');
  const original = JSON.parse(game.exportSave());
  game.startNew(); game.startNew();
  assert.equal(game.recovery().inventory.length, 0);
  assert.deepEqual(game.recovery(PREV_BACKUP_KEY), original);
  const reloaded = new GameStore(disk);
  reloaded.recover(PREV_BACKUP_KEY);
  assert.deepEqual(reloaded.state.inventory, original.inventory);
  assert.deepEqual(new GameStore(disk).state.inventory, original.inventory);
});

test('invalid earlier backups are unavailable and rejected without replacing progress', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  for (const raw of [null, '{broken', JSON.stringify({ version: 2 })]) {
    disk.setItem(PREV_BACKUP_KEY, raw);
    const saved = disk.getItem(SAVE_KEY), before = game.exportSave();
    assert.equal(game.recovery(PREV_BACKUP_KEY), null);
    assert.throws(() => game.recover(PREV_BACKUP_KEY), /没有可恢复的有效备份/);
    assert.equal(disk.getItem(SAVE_KEY), saved);
    assert.equal(game.exportSave(), before);
  }
});

test('backup rotation failure preserves primary save and supports retry', () => {
  const disk = storage(), game = new GameStore(disk); game.startNew();
  game.addMaterial('jadeite', 'retained-ore');
  const saved = disk.getItem(SAVE_KEY), backup = disk.getItem(BACKUP_KEY);
  const write = disk.setItem;
  disk.setItem = (key, value) => {
    if (key === PREV_BACKUP_KEY) throw new Error('quota');
    return write(key, value);
  };
  game.startNew();
  assert.equal(game.dirty, true);
  assert.equal(disk.getItem(SAVE_KEY), saved);
  assert.equal(disk.getItem(BACKUP_KEY), backup);
  disk.setItem = write;
  assert.equal(game.retrySave(), true);
  game.recover();
  assert.equal(game.state.inventory[0].id, 'retained-ore');
});

test('material IDs fall back when crypto or randomUUID is unavailable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    const game = new GameStore(storage()); game.startNew();
    for (const crypto of [undefined, {}]) {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto });
      assert.equal(game.addMaterial('jadeite'), true);
    }
    assert.equal(new Set(game.state.inventory.map(item => item.id)).size, 2);
    assert.ok(game.state.inventory.every(item => typeof item.id === 'string' && item.id.length > 0));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
  }
});

test('mine save migration preserves legacy inventory, expands clusters and rejects inconsistent flags', () => {
  const legacy = freshState(); delete legacy.mineVeins; delete legacy.mineClusters;
  legacy.inventory.push({ id: 'legacy-material', material: 'jadeite' });
  const normalized = validateState(legacy);
  assert.deepEqual(normalized.mineVeins, Array.from({ length: 6 }, () => [false, false]));
  assert.deepEqual(normalized.inventory, legacy.inventory);
  const clusters = { ...legacy, mineClusters: [true, false, false, false, false, true] };
  assert.deepEqual(validateState(clusters).mineVeins[0], [true, true]);
  assert.deepEqual(validateState(clusters).mineVeins[1], [false, false]);
  const malformed = [
    { mineVeins: Array(6) }, { mineClusters: Array(6) },
    { mineVeins: [] }, { mineVeins: Array(6).fill([true]) },
    { mineVeins: Array(6).fill([0, false]) },
    { mineClusters: Array(6).fill(0) }, { mineClusters: null },
    { mineVeins: Array(6).fill([true, true]), mineClusters: Array(6).fill(false) },
  ];
  for (const change of malformed) assert.throws(() => validateState({ ...freshState(), ...change }));
});

test('mine consumption is idempotent and save failures remain recoverable', () => {
  const disk = storage(), game = new GameStore(disk);game.startNew();game.navigate('mine');
  const write = disk.setItem;disk.setItem = () => { throw new Error('quota'); };
  assert.equal(game.consumeMineVein('C1-L'), true);
  assert.equal(game.consumeMineVein('C1-L'), false);
  assert.equal(game.consumeMineVein('C9-L'), false);
  assert.equal(game.state.mineClusters[0], false);
  assert.equal(game.dirty, true);
  assert.match(game.error, /保存失败/);
  disk.setItem = write;assert.equal(game.retrySave(), true);
  assert.deepEqual(new GameStore(disk).state.mineVeins[0], [true, false]);
  assert.equal(game.consumeMineVein('C1-R'), true);
  assert.equal(new GameStore(disk).state.mineClusters[0], true);
  game.navigate('workshop');assert.equal(game.consumeMineVein('C2-L'), false);
});
