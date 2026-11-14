import test from 'node:test';
import assert from 'node:assert/strict';
import { INSPECTION_QUESTIONS, MATERIAL_GUIDES } from './inspection.js';

test('inspection content has six stable questions with valid choices and traceable sources', () => {
  assert.equal(INSPECTION_QUESTIONS.length, 6);
  assert.equal(new Set(INSPECTION_QUESTIONS.map(question => question.id)).size, 6);
  for (const question of INSPECTION_QUESTIONS) {
    assert.ok(question.id && question.prompt && question.explanation);
    assert.equal(question.choices.length, 3);
    assert.equal(new Set(question.choices).size, 3);
    assert.ok(Number.isInteger(question.answer));
    assert.ok(question.answer >= 0 && question.answer < question.choices.length);
    assert.ok(question.source.title);
    assert.equal(new URL(question.source.url).protocol, 'https:');
    assert.ok(Object.isFrozen(question));
    assert.ok(Object.isFrozen(question.choices));
  }
});

test('both collectible materials have three distinct observation hotspots and sources', () => {
  assert.deepEqual(Object.keys(MATERIAL_GUIDES).sort(), ['jadeite', 'nephrite']);
  for (const guide of Object.values(MATERIAL_GUIDES)) {
    assert.ok(guide.name && guide.description);
    assert.equal(guide.hotspots.length, 3);
    assert.equal(new Set(guide.hotspots.map(hotspot => hotspot.id)).size, 3);
    assert.ok(guide.hotspots.every(hotspot => hotspot.label && hotspot.text));
    assert.ok(guide.source.title);
    assert.equal(new URL(guide.source.url).protocol, 'https:');
  }
});
