import test from 'node:test';
import assert from 'node:assert/strict';
import { craftToolShortcutLabel, resolveCraftToolShortcut, resolveGlobalShortcut, shortcutKeyForAction } from './shortcuts.js';

test('global shortcuts resolve case-insensitively and ignore unknown keys', () => {
  assert.equal(resolveGlobalShortcut('B'), 'inventory');
  assert.equal(resolveGlobalShortcut('g'), 'codex');
  assert.equal(resolveGlobalShortcut('x'), null);
});

test('craft tool shortcuts map one-based keys to the current tool list', () => {
  const tools = [['rough'], ['fine']];
  assert.equal(craftToolShortcutLabel(0), '1');
  assert.deepEqual(resolveCraftToolShortcut('2', tools), ['fine']);
  assert.equal(resolveCraftToolShortcut('3', tools), null);
  assert.equal(resolveCraftToolShortcut('x', tools), null);
});

test('shortcut metadata exposes only real action keys for accessible hints', () => {
  assert.equal(shortcutKeyForAction('inventory'), 'B');
  assert.equal(shortcutKeyForAction('pickaxe'), null);
  assert.equal(shortcutKeyForAction('close'), null);
  assert.equal(shortcutKeyForAction(), null);
});
