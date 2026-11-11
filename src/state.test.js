import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, SAVE_KEY, BACKUP_KEY, freshState, validateState, tasks } from './state.js';
import { PauseGate } from './pause.js';

function storage(raw = null) {
  const data = new Map(raw === null ? [] : [[SAVE_KEY, raw]]);
  return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
}

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
test('schema rejects illegal references, non-finite values, duplicate IDs and future crafting data', () => {
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
