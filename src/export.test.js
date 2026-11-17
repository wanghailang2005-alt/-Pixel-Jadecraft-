import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadBlob } from './export.js';

test('downloadBlob dispatches a download and revokes its object URL', () => {
  const events = [];
  const documentRef = { createElement: tag => ({ tag, click: () => events.push('click') }) };
  const urlRef = { createObjectURL: blob => { assert.equal(blob.type, 'image/png'); return 'blob:test'; }, revokeObjectURL: url => events.push(`revoke:${url}`) };
  assert.equal(downloadBlob({ type: 'image/png' }, 'jade.png', { documentRef, urlRef }), true);
  assert.deepEqual(events, ['click', 'revoke:blob:test']);
});

test('downloadBlob returns false when the browser cannot create an object URL', () => {
  const documentRef = { createElement: () => ({ click() { throw new Error('should not click'); } }) };
  assert.equal(downloadBlob({ type: 'image/png' }, 'jade.png', { documentRef, urlRef: {} }), false);
  assert.equal(downloadBlob(null, 'jade.png', { documentRef, urlRef: { createObjectURL() { return 'x'; } } }), false);
});

test('downloadBlob contains click and cleanup failures', () => {
  const documentRef = { createElement: () => ({ click() { throw new Error('blocked'); } }) };
  const urlRef = { createObjectURL: () => 'blob:blocked', revokeObjectURL: () => { throw new Error('blocked'); } };
  assert.equal(downloadBlob({ type: 'image/png' }, 'jade.png', { documentRef, urlRef }), false);
});
