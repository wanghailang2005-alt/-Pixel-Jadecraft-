import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readPngSize = relative => {
  const bytes = fs.readFileSync(new URL(relative, import.meta.url));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

test('formal mine atlas contains four variants for five tile frames', () => {
  const { width, height } = readPngSize('./assets/tiles-mine.png');
  assert.equal(width, 80);
  assert.equal(height, 64);
  assert.equal((width / 16) * (height / 16), 20);
});

test('mine player atlas keeps the authored 18-frame layout', () => {
  const { width, height } = readPngSize('./assets/player-32x48.png');
  assert.equal(width, 192);
  assert.equal(height, 144);
  assert.equal((width / 32) * (height / 48), 18);
});
