import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRAFT_SIZE, createDraft, getCraftSurface, applyStroke, beginStroke, endStroke,
  stageMetrics, advanceStage, createFinishedPiece,
} from './craft-model.js';
import { CREATIVE_COMMISSIONS, evaluateCommission, evaluateExhibition } from './commissions.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';

function sweep(draft, tool, left = -8, right = CRAFT_SIZE + 8) {
  beginStroke(draft);
  for (let y = 0; y <= CRAFT_SIZE; y += 7) applyStroke(draft, { x: left, y }, { x: right, y }, tool, 5);
  endStroke(draft);
}

function finished(shape, inspirationId, { shallow = false, layout = {}, polishRight } = {}) {
  const material = { id: `commission-${shape}`, material: 'jadeite' };
  const draft = createDraft(material, shape, layout);
  sweep(draft, 'rough');
  assert.equal(advanceStage(draft), true);
  beginStroke(draft);
  for (const path of getCraftSurface(draft).guidePaths) {
    for (let index = 1; index < path.length; index++) applyStroke(draft, path[index - 1], path[index], 'engrave', 1.4);
  }
  endStroke(draft);
  if (shallow) {
    const surface = getCraftSurface(draft);
    for (let index = 0; index < surface.target.length && stageMetrics(draft).relief < .08; index++) {
      if (!surface.target[index] || surface.guide[index]) continue;
      const point = { x: index % CRAFT_SIZE + .5, y: Math.floor(index / CRAFT_SIZE) + .5 };
      applyStroke(draft, point, point, 'relief', .55);
    }
    endStroke(draft);
  } else sweep(draft, 'relief', -8, 25);
  assert.equal(advanceStage(draft), true, JSON.stringify(stageMetrics(draft)));
  sweep(draft, 'sand');
  sweep(draft, 'polish', -8, polishRight ?? (shape === 'bi' ? 14 : 20));
  assert.equal(advanceStage(draft), true, JSON.stringify(stageMetrics(draft)));
  return { id: material.id, material: material.material, shape, inspirationId, artisan: createFinishedPiece(draft) };
}

function stateWith(pieces) {
  const inspirations = [...new Set(pieces.map(piece => piece.inspirationId).filter(Boolean))];
  return {
    pieces, exhibits: pieces.map(piece => piece.id),
    museum: { theme: 'craft', inspirations, observations: Object.fromEntries(inspirations.map(id => [id, [0]])) },
  };
}

const bi = finished('bi', 'heritage-liangzhu-bi');
const fish = finished('fish', 'heritage-jadeite-cabbage');
const seal = finished('seal', 'master-daiyue');

test('each story can be fulfilled by real strokes and only its intended shape matches', () => {
  for (const [piece, commissionId] of [[bi, 'moon-gift'], [fish, 'river-fish'], [seal, 'mountain-seal']]) {
    const state = stateWith([piece]);
    const before = structuredClone(state);
    const results = evaluateCommission(piece, state);
    assert.deepEqual(results.filter(result => result.fulfilled).map(result => result.id), [commissionId]);
    assert.match(results.find(result => result.fulfilled).feedback, /刻线覆盖\d+%.*浮雕\d+%.*亮面\d+%/);
    assert.deepEqual(state, before);
  }
});

test('a completed seal with shallow relief gets a specific compositional request', () => {
  const piece = finished('seal', 'master-daiyue', { shallow: true });
  assert.ok(stageMetrics(piece.artisan).relief >= .055);
  assert.ok(stageMetrics(piece.artisan).relief < .12);
  const result = evaluateCommission(piece, stateWith([piece])).find(item => item.id === 'mountain-seal');
  assert.equal(result.fulfilled, false);
  assert.match(result.feedback, /浮雕覆盖至少12%/);
});

test('a valid bright jade disk is a different design from the requested soft moon', () => {
  const piece = finished('bi', 'heritage-liangzhu-bi', { polishRight: 20 });
  const metrics = stageMetrics(piece.artisan);
  assert.ok(metrics.gloss > .30 && metrics.gloss <= .55);
  const result = evaluateCommission(piece, stateWith([piece])).find(item => item.id === 'moon-gift');
  assert.equal(result.fulfilled, false);
  assert.match(result.feedback, /保留至少38%柔光面/);
  const display = evaluateExhibition(stateWith([piece]));
  assert.ok(display.observations[0].includes(`亮面${Math.round(metrics.gloss * 100)}%`));
});

test('inspiration must be real, observed, collected and relevant to the chosen story', () => {
  const state = stateWith([fish]);
  for (const invalid of [
    { ...state, museum: { ...state.museum, inspirations: [] } },
    { ...state, museum: { ...state.museum, observations: {} } },
    { ...state, museum: { ...state.museum, observations: { [fish.inspirationId]: [99] } } },
    undefined,
  ]) assert.equal(evaluateCommission(fish, invalid).some(item => item.fulfilled), false);
  const unrelated = { ...fish, inspirationId: 'master-daiyue' };
  assert.equal(evaluateCommission(unrelated, stateWith([unrelated])).some(item => item.fulfilled), false);
  const unknown = { ...fish, inspirationId: 'invented-exhibit' };
  assert.equal(evaluateCommission(unknown, stateWith([unknown])).some(item => item.fulfilled), false);
});

test('legacy, unfinished, malformed and mismatched works do not earn fabricated completion', () => {
  const invalid = [
    undefined,
    { id: 'old', shape: 'fish', material: 'jadeite' },
    { ...fish, artisan: createDraft({ id: 'unfinished', material: 'jadeite' }, 'fish') },
    { ...fish, artisan: { completed: true } },
    { ...fish, shape: 'seal' },
    { ...fish, material: 'nephrite' },
  ];
  for (const piece of invalid) {
    const results = evaluateCommission(piece, stateWith([fish]));
    assert.equal(results.length, 3);
    assert.equal(results.some(item => item.fulfilled), false);
    assert.ok(results.every(item => item.feedback.includes('完成可保留刀痕')));
  }
});

test('exhibition reads only uniquely displayed works and theme changes its concrete commentary', () => {
  const state = stateWith([bi, fish, seal]);
  state.exhibits = [fish.id, fish.id, 'missing-piece', null];
  const before = structuredClone(state);
  const craft = evaluateExhibition(state);
  assert.match(craft.summary, /^展出1件作品，1件保留实际刀痕，1件关联/);
  assert.match(craft.observations.join(''), /游鱼.*刻线覆盖/);
  assert.doesNotMatch(craft.observations.join(''), /印章|玉璧/);
  state.museum.theme = 'nature';
  const nature = evaluateExhibition(state);
  assert.match(nature.observations.join(''), /天然色带.*\d+%/);
  assert.match(nature.observations.join(''), /翠玉白菜/);
  state.museum.theme = 'journey';
  const journey = evaluateExhibition(state);
  assert.match(journey.observations.join(''), /先在《翠玉白菜》发现细节/);
  assert.match(journey.observations.join(''), /完整制作记录/);
  assert.notEqual(craft.title, nature.title);
  assert.notEqual(nature.title, journey.title);
  state.museum.theme = 'craft';
  assert.deepEqual(state, before);
});

test('empty and legacy exhibitions show their actual limits without invented technique ratios', () => {
  assert.deepEqual(evaluateExhibition(undefined).observations, []);
  assert.match(evaluateExhibition({ pieces: [fish], exhibits: [] }).summary, /展台还空着/);
  const legacy = { id: 'old', shape: 'bi', material: 'nephrite' };
  const state = stateWith([legacy]);
  const result = evaluateExhibition(state);
  assert.match(result.summary, /0件保留实际刀痕，0件关联/);
  assert.match(result.observations[0], /早期作品/);
  assert.doesNotMatch(result.observations[0], /\d+%/);
});

test('museum expansion has sixteen sourced exhibits and all commission inspirations resolve', () => {
  assert.equal(MUSEUM_EXHIBITS.length, 16);
  assert.equal(new Set(MUSEUM_EXHIBITS.map(exhibit => exhibit.id)).size, 16);
  for (const shape of ['bi', 'huang', 'cong', 'dragon']) assert.ok(MUSEUM_EXHIBITS.some(exhibit => exhibit.shape === shape));
  for (const commission of CREATIVE_COMMISSIONS) {
    assert.ok(commission.story && commission.goal);
    for (const id of commission.inspirationIds) assert.ok(MUSEUM_EXHIBITS.some(exhibit => exhibit.id === id));
  }
  for (const exhibit of MUSEUM_EXHIBITS) {
    assert.equal(exhibit.lookFor.length, 3);
    assert.ok(exhibit.technique.hint.startsWith('创作练习：'));
    assert.equal(new URL(exhibit.source.url).protocol, 'https:');
  }
});
