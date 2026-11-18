import test from 'node:test';
import assert from 'node:assert/strict';
import { memorialCardLayout } from './memorial-card.js';

test('memorial card uses named finishes and keeps a 24-code-point blessing inside four lines', () => {
  const layout = memorialCardLayout({ artisan: { finish: 'satin' }, blessing: '山水有印月照玉心云起松间' });
  assert.equal(layout.finish, '温润柔光');
  assert.deepEqual(layout.blessingLines, ['山水有印月照', '玉心云起松间']);
  assert.ok(layout.blessingLines.every(line => [...line].length <= 6));
  assert.equal(layout.seal.size, 40);
  assert.equal(layout.blessingLineHeight, 15);
  assert.equal(layout.footerTop, 414);
});

test('memorial card truncates overlong Unicode blessings and adapts the seal size', () => {
  const layout = memorialCardLayout({ artisan: { finish: 'contrast' }, blessing: '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏' });
  assert.equal(layout.finish, '凝光点睛');
  assert.equal([...layout.blessingLines.join('')].length, 24);
  assert.equal(layout.blessingLines.length, 4);
  assert.equal(layout.seal.size, 34);
  assert.equal(layout.footerTop, 424);
  assert.equal(memorialCardLayout({ blessing: '玉心' }).seal.size, 40);
});
