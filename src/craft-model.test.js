import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRAFT_SIZE, LAYOUT_PRESETS, createDraft, getCraftSurface, applyStroke, beginStroke,
  endStroke, undoStroke, resetStage, stageMetrics, advanceStage, validateDraft,
  serializeDraft, deserializeDraft, createFinishedPiece,
} from './craft-model.js';
import { MINE_CLUSTERS } from './mining.js';

const raw = { id: 'C2-L', material: 'jadeite' };

function sweep(draft, tool, left = -8, right = CRAFT_SIZE + 8) {
  beginStroke(draft);
  for (let y = 0; y <= CRAFT_SIZE; y += 7) applyStroke(draft, { x: left, y }, { x: right, y }, tool, 5);
  endStroke(draft);
}

function shape(draft) {
  sweep(draft, 'rough');
  assert.equal(stageMetrics(draft).ready, true);
  assert.equal(advanceStage(draft), true);
}

function carve(draft) {
  beginStroke(draft);
  for (const path of getCraftSurface(draft).guidePaths) {
    for (let index = 1; index < path.length; index++) applyStroke(draft, path[index - 1], path[index], 'engrave', 1.4);
  }
  endStroke(draft);
  // The line is retained above a selectively lowered surrounding ground.
  sweep(draft, 'relief', -8, 25);
  assert.equal(stageMetrics(draft).ready, true, JSON.stringify(stageMetrics(draft)));
  assert.equal(advanceStage(draft), true);
}

function finish(draft) {
  sweep(draft, 'sand');
  sweep(draft, 'polish', -8, 20);
  assert.equal(stageMetrics(draft).ready, true, JSON.stringify(stageMetrics(draft)));
  assert.equal(advanceStage(draft), true);
}

test('material features remain stable across reload and layout choices change retained features', () => {
  const first = createDraft(raw, 'fish', LAYOUT_PRESETS.color);
  const second = createDraft(raw, 'fish', LAYOUT_PRESETS.light);
  const a = getCraftSurface(first), b = getCraftSurface(second);
  assert.deepEqual(a.colors, b.colors);
  assert.deepEqual(a.colorBand, b.colorBand);
  assert.notDeepEqual(a.target, b.target);
  assert.notDeepEqual(a.target.map((cell, i) => cell ? a.colors[i] : null), b.target.map((cell, i) => cell ? b.colors[i] : null));
  assert.deepEqual(getCraftSurface(deserializeDraft(serializeDraft(first))).colors, a.colors);
  assert.notDeepEqual(getCraftSurface(createDraft({ ...raw, id: 'C2-R' }, 'fish')).colors, a.colors);
});

test('shaping removes actual surplus and the bi inner hole while protecting chosen jade', () => {
  const draft = createDraft(raw, 'bi');
  const before = draft.base.slice();
  assert.equal(before[32 * CRAFT_SIZE + 32], 1);
  sweep(draft, 'rough');
  const surface = getCraftSurface(draft);
  assert.equal(draft.base[32 * CRAFT_SIZE + 32], 0);
  assert.ok(draft.base.reduce((sum, value) => sum + value, 0) < before.reduce((sum, value) => sum + value, 0));
  assert.ok(surface.target.every((inside, index) => !inside || draft.base[index] === 1));
  assert.equal(stageMetrics(draft).ready, true);
  assert.equal(draft.stage, 'shape');
});

test('progress stays below 100 until the visible next-stage requirement is actually reached', () => {
  const draft = createDraft(raw, 'fish');
  const { original, target } = getCraftSurface(draft);
  const waste = original.flatMap((present, index) => present && !target[index] ? [index] : []);
  const removeCount = Math.ceil(waste.length * .90) - 1;
  for (const index of waste.slice(0, removeCount)) {
    const point = { x: index % CRAFT_SIZE + .5, y: Math.floor(index / CRAFT_SIZE) + .5 };
    applyStroke(draft, point, point, 'rough', .5);
  }
  const almost = stageMetrics(draft);
  assert.equal(almost.ready, false);
  assert.equal(almost.progress, 99);
  const next = waste[removeCount], point = { x: next % CRAFT_SIZE + .5, y: Math.floor(next / CRAFT_SIZE) + .5 };
  applyStroke(draft, point, point, 'rough', .5);
  assert.equal(stageMetrics(draft).ready, true);
  assert.equal(stageMetrics(draft).progress, 100);
});

test('carving the whole face does not satisfy the engraving precision requirement', () => {
  for (const shapeName of ['bi', 'fish', 'seal']) {
    const draft = createDraft(raw, shapeName);
    shape(draft);
    sweep(draft, 'engrave');
    sweep(draft, 'relief');
    const metrics = stageMetrics(draft);
    assert.equal(metrics.guideCoverage, 1);
    assert.ok(metrics.precision < .55);
    assert.equal(metrics.ready, false);
    assert.equal(advanceStage(draft), false);
    assert.equal(resetStage(draft), true);
    assert.ok(draft.carve.every(value => value === 0));
    carve(draft);
  }
});

test('all three shapes and all three patterns can reach a real sculpted and locally polished result', () => {
  for (const shapeName of ['bi', 'fish', 'seal']) for (const pattern of ['cloud', 'dragon', 'grain']) {
    const draft = createDraft(raw, shapeName, {}, { pattern });
    shape(draft);
    carve(draft);
    const beforeFinish = draft.carve.slice();
    finish(draft);
    const finished = createFinishedPiece(draft);
    assert.equal(finished.completed, true);
    assert.equal(finished.material.id, raw.id);
    assert.equal(finished.undo, null);
    assert.equal(finished.checkpoint, null);
    assert.deepEqual(finished.carve, beforeFinish);
    assert.ok(finished.height.some(value => value === 4));
    assert.ok(finished.roughness.some(value => value === 0));
    assert.ok(finished.roughness.some(value => value === 2));
    assert.deepEqual(validateDraft(finished), finished);
    assert.equal(advanceStage(draft), false);
  }
});

test('swept strokes and repeated input are independent of event frequency', () => {
  const whole = createDraft(raw, 'fish');
  const split = createDraft(raw, 'fish');
  const from = { x: 2.25, y: 9.375 }, to = { x: 61.25, y: 12.125 };
  applyStroke(whole, from, to, 'rough', 3.125);
  for (let index = 0; index < 16; index++) {
    const point = t => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    applyStroke(split, point(index / 16), point((index + 1) / 16), 'rough', 3.125);
  }
  assert.deepEqual(whole.base, split.base);
  const before = cloneGrid(whole);
  applyStroke(whole, from, to, 'rough', 3.125);
  assert.deepEqual(cloneGrid(whole), before);
});

function cloneGrid(draft) {
  return structuredClone({ base: draft.base, height: draft.height, carve: draft.carve, roughness: draft.roughness });
}

test('undo restores the whole current stroke and stage reset preserves previous-stage work', () => {
  const draft = createDraft(raw, 'fish');
  const original = cloneGrid(draft);
  beginStroke(draft);
  applyStroke(draft, { x: 3, y: 32 }, { x: 20, y: 32 }, 'rough', 5);
  applyStroke(draft, { x: 20, y: 32 }, { x: 32, y: 3 }, 'rough', 5);
  endStroke(draft);
  assert.notDeepEqual(cloneGrid(draft), original);
  assert.equal(undoStroke(draft), true);
  assert.deepEqual(cloneGrid(draft), original);
  assert.equal(undoStroke(draft), false);
  shape(draft);
  const shaped = cloneGrid(draft);
  sweep(draft, 'relief');
  assert.notDeepEqual(draft.height, shaped.height);
  assert.equal(resetStage(draft), true);
  assert.deepEqual(cloneGrid(draft), shaped);
});

test('polishing requires preparation and mixed finish; over-polishing can be repaired without material loss', () => {
  const draft = createDraft(raw, 'fish');
  shape(draft); carve(draft);
  const base = draft.base.slice();
  sweep(draft, 'polish');
  assert.equal(stageMetrics(draft).gloss, 0);
  sweep(draft, 'sand');
  assert.equal(stageMetrics(draft).ready, false);
  sweep(draft, 'polish');
  assert.equal(stageMetrics(draft).gloss, 1);
  assert.equal(stageMetrics(draft).ready, false);
  sweep(draft, 'sand', 25, CRAFT_SIZE + 8);
  assert.equal(stageMetrics(draft).ready, true);
  assert.deepEqual(draft.base, base);
});

test('satin and contrast styles ask for different visible distributions of gloss', () => {
  const draft = createDraft(raw, 'fish', {}, { finish: 'satin' });
  shape(draft); carve(draft);
  sweep(draft, 'sand');
  applyStroke(draft, { x: 20, y: 30 }, { x: 24, y: 30 }, 'polish', 2);
  endStroke(draft);
  assert.equal(stageMetrics(draft).ready, true, JSON.stringify(stageMetrics(draft)));
  const contrast = structuredClone(draft);
  contrast.finish = 'contrast';
  assert.equal(stageMetrics(contrast).ready, false);
});

test('JSON restore preserves partly carved sculpture, undo and bounded storage', () => {
  const draft = createDraft(raw, 'seal');
  shape(draft);
  sweep(draft, 'relief', -8, 30);
  const serialized = serializeDraft(draft);
  assert.ok(serialized.length < 110000, `${serialized.length} bytes`);
  const restored = deserializeDraft(serialized);
  assert.deepEqual(restored, draft);
  assert.equal(undoStroke(restored), true);
  assert.deepEqual(restored.height, restored.checkpoint.height);
  restored.height[0] = 99;
  assert.throws(() => validateDraft(restored));
  assert.throws(() => deserializeDraft('x'.repeat(180001)));
});

test('validation rejects lost material, sparse grids, invalid layouts and forged completion', () => {
  const original = createDraft(raw, 'fish');
  const targetCell = getCraftSurface(original).target.findIndex(Boolean);
  const lost = structuredClone(original);
  lost.base[targetCell] = 0;
  assert.throws(() => validateDraft(lost));
  const sparse = structuredClone(original);
  delete sparse.height[10];
  assert.throws(() => validateDraft(sparse));
  const invalidLayout = structuredClone(original);
  invalidLayout.layout.scale = 999;
  assert.throws(() => validateDraft(invalidLayout));
  const forged = { ...structuredClone(original), stage: 'polish', completed: true, checkpoint: null };
  assert.throws(() => validateDraft(forged));
  // Even a valid-looking polish distribution cannot bypass shaping and engraving.
  for (let index = 0; index < forged.base.length; index++) {
    if (forged.base[index]) forged.roughness[index] = index % 5 === 0 ? 0 : 2;
  }
  assert.throws(() => validateDraft(forged));
  assert.throws(() => createFinishedPiece(original));
  assert.throws(() => createDraft(raw, 'dragon'));
});

test('invalid input or a tool from another stage does not change the work', () => {
  const draft = createDraft(raw, 'bi');
  const before = structuredClone(draft);
  applyStroke(draft, { x: NaN, y: 5 }, { x: 4, y: 5 }, 'rough');
  applyStroke(draft, { x: 5, y: 5 }, { x: 40, y: 5 }, 'engrave');
  applyStroke(draft, { x: 5, y: 5 }, { x: 40, y: 5 }, 'rough', -1);
  assert.deepEqual(draft, before);
});

test('all twelve mined stones can complete every shape, pattern and finish in both design layouts', t => {
  const failures = [];
  let completed = 0;
  for (const cluster of MINE_CLUSTERS) for (const side of ['L', 'R']) {
    const material = { id: `${cluster.id}-${side}`, material: cluster.material };
    const results = [];
    for (const shapeName of ['bi', 'fish', 'seal']) for (const pattern of ['cloud', 'dragon', 'grain']) {
      for (const finishStyle of ['satin', 'contrast']) for (const [layoutName, layout] of Object.entries(LAYOUT_PRESETS)) {
        const label = `${material.id}/${shapeName}/${pattern}/${finishStyle}/${layoutName}`;
        try {
          const draft = createDraft(material, shapeName, layout, { pattern, finish: finishStyle });
          shape(draft);
          carve(draft);
          sweep(draft, 'sand');
          const surface = getCraftSurface(draft);
          // Ordinary 1.3-grid brush touches, not direct state injection. Stop with visible local highlights.
          const targetGloss = finishStyle === 'satin' ? .05 : .18;
          beginStroke(draft);
          for (let index = 0; index < surface.target.length && stageMetrics(draft).gloss < targetGloss; index++) {
            if (!surface.target[index]) continue;
            const point = { x: index % CRAFT_SIZE + .5, y: Math.floor(index / CRAFT_SIZE) + .5 };
            applyStroke(draft, point, point, 'polish', 1.3);
          }
          endStroke(draft);
          const metrics = stageMetrics(draft);
          assert.equal(metrics.ready, true, JSON.stringify(metrics));
          assert.equal(advanceStage(draft), true);
          const piece = createFinishedPiece(draft);
          assert.equal(piece.material.id, material.id);
          assert.deepEqual(deserializeDraft(serializeDraft(piece)), piece);
          results.push(metrics);
          completed++;
        } catch (error) { failures.push(`${label}: ${error.message}`); }
      }
    }
    const minimum = key => Math.round(Math.min(...results.map(result => result[key])) * 1000) / 10;
    t.diagnostic(`${material.id} ${material.material}: ${results.length}/36 finished; minimum guide ${minimum('guideCoverage')}%, precision ${minimum('precision')}%, relief ${minimum('relief')}%`);
  }
  t.diagnostic(`Matrix evidence: ${completed}/432 real-tool workflows completed and serialized.`);
  assert.deepEqual(failures, []);
  assert.equal(completed, 432);
});
