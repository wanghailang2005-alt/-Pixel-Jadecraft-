import { compositionPaths, validateMotifs } from './motifs.js';

/** Persistent, deterministic 2.5D jade work. All saved values are ordinary JSON. */
export const CRAFT_SIZE = 64;
export const LAYOUT_PRESETS = Object.freeze({
  color: Object.freeze({ x: -.04, y: -.015, rotation: -18, scale: .94 }),
  light: Object.freeze({ x: .04, y: .025, rotation: 22, scale: .86 }),
});

const LENGTH = CRAFT_SIZE * CRAFT_SIZE;
const SHAPES = ['bi', 'fish', 'seal'];
const PATTERNS = ['cloud', 'dragon', 'grain'];
const STAGES = ['shape', 'carve', 'polish'];
const FINISHES = ['satin', 'contrast'];
const GRID_LIMITS = { base: 1, height: 6, carve: 2, roughness: 3 };
const cache = new Map();
const clone = value => structuredClone(value);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const fail = () => { throw new Error('玉作数据不完整或超出可恢复范围。'); };

function seedFor(value) {
  let seed = 2166136261;
  for (const character of String(value)) seed = Math.imul(seed ^ character.codePointAt(0), 16777619);
  return seed >>> 0;
}

function materialFor(input) {
  const raw = typeof input === 'string' ? { material: input } : input;
  if (!raw || !['nephrite', 'jadeite'].includes(raw.material)) fail();
  const id = raw.id ?? raw.material;
  if (typeof id !== 'string' || !id || id.length > 160) fail();
  const seed = raw.seed ?? seedFor(`${raw.material}:${id}`);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail();
  return { id, material: raw.material, seed };
}

function layoutFor(input = {}) {
  const defaults = { x: 0, y: 0, rotation: 0, scale: 1 };
  const limits = { x: [-.045, .045], y: [-.045, .045], rotation: [-35, 35], scale: [.8, 1.02] };
  const result = {};
  for (const key of Object.keys(defaults)) {
    const value = input[key] ?? defaults[key];
    if (!Number.isFinite(value)) fail();
    result[key] = clamp(value, ...limits[key]);
  }
  return result;
}

function insideShape(x, y, shape, sealFace = false) {
  if (shape === 'bi') return Math.hypot(x, y) <= .34 && Math.hypot(x, y) >= .13;
  if (shape === 'fish') return ((x + .075) / .265) ** 2 + (y / .19) ** 2 <= 1
    || (x >= .14 && x <= .34 && Math.abs(y) <= (x - .14) * 1.0);
  if (sealFace) return Math.abs(x) <= .30 && Math.abs(y) <= .30;
  return (Math.abs(x) <= .28 && y >= .025 && y <= .25)
    || (Math.abs(x) <= .12 && y >= -.27 && y <= .045);
}

function localPoint(x, y, layout) {
  const angle = layout.rotation * Math.PI / 180;
  const px = (x / CRAFT_SIZE - .5 - layout.x) / layout.scale;
  const py = (y / CRAFT_SIZE - .5 - layout.y) / layout.scale;
  return { x: px * Math.cos(angle) + py * Math.sin(angle), y: -px * Math.sin(angle) + py * Math.cos(angle) };
}

function worldPoint(x, y, layout) {
  const angle = layout.rotation * Math.PI / 180;
  return {
    x: (.5 + layout.x + (x * Math.cos(angle) - y * Math.sin(angle)) * layout.scale) * CRAFT_SIZE,
    y: (.5 + layout.y + (x * Math.sin(angle) + y * Math.cos(angle)) * layout.scale) * CRAFT_SIZE,
  };
}

export function craftPointToLocal(draft, point) { return localPoint(point.x, point.y, draft.layout); }
export function localToCraftPoint(draft, point) { return worldPoint(point.x, point.y, draft.layout); }

function segmentDistance(x, y, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(((x - from.x) * dx + (y - from.y) * dy) / length, 0, 1) : 0;
  return Math.hypot(x - from.x - t * dx, y - from.y - t * dy);
}

function guidePaths(shape, pattern) {
  const points = [];
  if (shape === 'bi') {
    if (pattern === 'grain') {
      return Array.from({ length: 10 }, (_, index) => {
        const a = index * Math.PI / 5;
        return [{ x: .23 * Math.cos(a) - .012, y: .23 * Math.sin(a) - .012 },
          { x: .23 * Math.cos(a) + .012, y: .23 * Math.sin(a) + .012 }];
      });
    }
    for (let index = 0; index <= 80; index++) {
      const a = index / 80 * Math.PI * 2;
      const radius = pattern === 'dragon' ? .225 + .035 * Math.sin(a * 3) : .225 + .023 * Math.sin(a * 6);
      points.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) });
    }
  } else if (pattern === 'grain') {
    return Array.from({ length: 6 }, (_, index) => {
      const x = -.19 + (index % 3) * .17;
      const y = shape === 'seal' ? .105 + Math.floor(index / 3) * .085 : -.07 + Math.floor(index / 3) * .14;
      return [{ x: x - .016, y: y - .016 }, { x: x + .016, y: y + .016 }];
    });
  } else {
    for (let index = 0; index <= 64; index++) {
      const x = -.225 + index / 64 * .40;
      const center = shape === 'seal' ? .14 : 0;
      const amplitude = shape === 'seal' ? .045 : .075;
      points.push({ x, y: center + amplitude * Math.sin(index / 64 * Math.PI * (pattern === 'cloud' ? 4 : 2.5)) });
    }
  }
  return [points];
}

function geometry(draft) {
  const key = JSON.stringify([draft.material, draft.shape, draft.layout, draft.pattern, draft.motifs, draft.sealFace]);
  if (cache.has(key)) return cache.get(key);
  const target = Array(LENGTH).fill(0), original = Array(LENGTH).fill(0), guide = Array(LENGTH).fill(0);
  const colors = Array(LENGTH), crack = Array(LENGTH).fill(0), colorBand = Array(LENGTH).fill(0);
  const phase = (draft.material.seed % 997) / 997 * Math.PI * 2;
  const spot = { x: .12 * Math.sin(phase), y: .12 * Math.cos(phase * 1.7), radius: .045 };
  const paths = (draft.motifs ? compositionPaths(draft.motifs) : guidePaths(draft.shape, draft.pattern))
    .map(path => path.map(point => worldPoint(point.x, point.y, draft.layout)));
  for (let y = 0; y < CRAFT_SIZE; y++) for (let x = 0; x < CRAFT_SIZE; x++) {
    const index = y * CRAFT_SIZE + x;
    const px = (x + .5) / CRAFT_SIZE - .5, py = (y + .5) / CRAFT_SIZE - .5;
    const angle = Math.atan2(py, px);
    original[index] = Number(Math.hypot(px, py) < .475 + .006 * Math.sin(angle * 5 + phase));
    const local = localPoint(x + .5, y + .5, draft.layout);
    target[index] = Number(Boolean(original[index]) && insideShape(local.x, local.y, draft.shape, draft.sealFace));
    const band = Math.abs(px * .72 + py * .45 - .075 * Math.sin(py * 9 + phase)) < .075;
    const darkSpot = Math.hypot(px - spot.x, py - spot.y) < spot.radius;
    colorBand[index] = Number(band);
    crack[index] = Number(original[index] && px > .25 && Math.abs(py - .12 - .25 * px - .013 * Math.sin(px * 40 + phase)) < .008);
    const palette = draft.material.material === 'nephrite'
      ? darkSpot ? [100, 123, 85] : band ? [214, 221, 176] : [169, 190, 146]
      : darkSpot ? [35, 88, 66] : band ? [126, 191, 130] : [65, 134, 101];
    const grain = ((x * 13 + y * 7 + draft.material.seed % 23) % 9) - 4;
    colors[index] = '#' + palette.map(channel => clamp(channel + grain, 0, 255).toString(16).padStart(2, '0')).join('');
    if (target[index]) outer: for (const path of paths) for (let p = 1; p < path.length; p++) {
      if (segmentDistance(x + .5, y + .5, path[p - 1], path[p]) <= 1.65) { guide[index] = 1; break outer; }
    }
  }
  const result = { target, original, guide, colors, colorBand, crack, paths, spot };
  if (cache.size >= 64) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}

function snapshot(draft) {
  return { stage: draft.stage, ...Object.fromEntries(Object.keys(GRID_LIMITS).map(key => [key, draft[key].slice()])) };
}

/** Layout x/y are normalized offsets; rotation is degrees. Options may also be in layout. */
export function createDraft(material, shape = 'bi', layout = {}, options = {}) {
  if (!SHAPES.includes(shape)) fail();
  const pattern = options.pattern ?? layout.pattern ?? 'cloud';
  const finish = options.finish ?? layout.finish ?? 'contrast';
  if (!PATTERNS.includes(pattern) || !FINISHES.includes(finish)) fail();
  const draft = { version: 1, size: CRAFT_SIZE, material: materialFor(material), shape,
    layout: layoutFor(layout), pattern, finish, stage: 'shape', completed: false,
    base: [], height: [], carve: [], roughness: [], checkpoint: null, undo: null, strokeOpen: false };
  if (options.motifs !== undefined) {
    draft.motifs = validateMotifs(options.motifs);
    // A new composed seal is worked face-on. Existing side-view seals retain their geometry.
    if (shape === 'seal') {
      draft.sealFace = true;
      draft.sealCut = options.sealCut ?? 'intaglio';
      if (!['intaglio','relief'].includes(draft.sealCut)) fail();
    }
  }
  const { original } = geometry(draft);
  draft.base = original.slice();
  draft.height = original.map(value => value ? 6 : 0);
  draft.carve = Array(LENGTH).fill(0);
  draft.roughness = original.map(value => value ? 3 : 0);
  draft.checkpoint = snapshot(draft);
  return draft;
}

/** Arrays returned here are read-only views. The saved draft contains no derived textures. */
export function getCraftSurface(draft) {
  const { target, guide, colors, colorBand, crack, paths, original, spot } = geometry(draft);
  return { size: CRAFT_SIZE, base: draft.base, target, guide, height: draft.height,
    carve: draft.carve, roughness: draft.roughness, colors, colorBand, crack, guidePaths: paths, original, spot };
}

export function beginStroke(draft) {
  if (draft.completed || draft.strokeOpen) return false;
  draft.undo = snapshot(draft);
  draft.strokeOpen = true;
  return true;
}

export function endStroke(draft) { draft.strokeOpen = false; }

export function undoStroke(draft) {
  if (draft.completed || !draft.undo || draft.undo.stage !== draft.stage) return false;
  for (const key of Object.keys(GRID_LIMITS)) draft[key] = draft.undo[key].slice();
  draft.undo = null;
  draft.strokeOpen = false;
  return true;
}

export function resetStage(draft) {
  if (draft.completed || !draft.checkpoint || draft.checkpoint.stage !== draft.stage) return false;
  for (const key of Object.keys(GRID_LIMITS)) draft[key] = draft.checkpoint[key].slice();
  draft.undo = null;
  draft.strokeOpen = false;
  return true;
}

/** A trial print may send an unfinished piece back to the cutter, with every cut retained. */
export function reopenCarving(draft) {
  if (draft.completed || draft.stage !== 'polish') return false;
  draft.stage = 'carve';
  draft.roughness = draft.base.map(value => value ? 3 : 0);
  draft.undo = null;
  draft.strokeOpen = false;
  draft.checkpoint = snapshot(draft);
  return true;
}

/** A stroke applies a swept disk geometrically, independent of event frequency or frame time. */
export function applyStroke(draft, from, to, tool, radius = 3) {
  const toolName = typeof tool === 'string' ? tool : tool?.name;
  const depth = typeof tool === 'object' ? tool.depth ?? 1 : 1;
  const allowed = { shape: ['rough', 'fine'], carve: ['engrave', 'relief'], polish: ['sand', 'polish'] };
  if (draft.completed || !allowed[draft.stage]?.includes(toolName)) return stageMetrics(draft);
  if (!from || !to || ![from.x, from.y, to.x, to.y, radius, depth].every(Number.isFinite)
    || radius <= 0 || [from.x, from.y, to.x, to.y].some(value => Math.abs(value) > CRAFT_SIZE * 4)) return stageMetrics(draft);
  const r = clamp(radius, .5, 8);
  beginStroke(draft);
  const { target, guide } = geometry(draft);
  const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - r));
  const right = Math.min(CRAFT_SIZE - 1, Math.ceil(Math.max(from.x, to.x) + r));
  const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - r));
  const bottom = Math.min(CRAFT_SIZE - 1, Math.ceil(Math.max(from.y, to.y) + r));
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    const index = y * CRAFT_SIZE + x;
    if (!draft.base[index] || segmentDistance(x + .5, y + .5, from, to) > r) continue;
    if (draft.stage === 'shape') {
      if (!target[index]) {
        draft.base[index] = draft.height[index] = draft.carve[index] = draft.roughness[index] = 0;
      } else if (toolName === 'fine') {
        const edge = x === 0 || x === CRAFT_SIZE - 1 || y === 0 || y === CRAFT_SIZE - 1
          || !target[index - 1] || !target[index + 1] || !target[index - CRAFT_SIZE] || !target[index + CRAFT_SIZE];
        if (edge) draft.height[index] = Math.min(draft.height[index], 5);
      }
    } else if (draft.stage === 'carve' && target[index]) {
      if (toolName === 'engrave') {
        draft.carve[index] = Math.max(draft.carve[index], clamp(Math.round(depth), 1, 2));
        draft.height[index] = Math.min(draft.height[index], 5);
      } else if (!guide[index]) {
        // Lower the ground around retained lines; repeated events never excavate extra depth.
        draft.height[index] = Math.min(draft.height[index], depth >= 2 ? 3 : 4);
      }
    } else if (draft.stage === 'polish' && target[index]) {
      if (toolName === 'sand') draft.roughness[index] = 2;
      else if (draft.roughness[index] <= 2) draft.roughness[index] = 0;
    }
  }
  return stageMetrics(draft);
}

export function stageMetrics(draft) {
  const { target, original, guide } = geometry(draft);
  let count = 0, waste = 0, removed = 0, lineCount = 0, carvedOnLine = 0;
  let carved = 0, relief = 0, treated = 0, gloss = 0, matte = 0, retainedLines = 0, groundCount = 0, loweredGround = 0;
  for (let index = 0; index < LENGTH; index++) {
    if (original[index] && !target[index]) { waste++; if (!draft.base[index]) removed++; }
    if (!target[index]) continue;
    count++;
    if (guide[index]) {
      lineCount++;
      if (draft.carve[index]) carvedOnLine++;
      if (draft.base[index] && draft.height[index] >= 5 && !draft.carve[index]) retainedLines++;
    } else {
      groundCount++;
      if (draft.base[index] && draft.height[index] <= 4) loweredGround++;
    }
    if (draft.carve[index]) carved++;
    if (draft.height[index] <= 4 && draft.base[index]) relief++;
    if (draft.roughness[index] <= 2) treated++;
    if (draft.roughness[index] === 0) gloss++;
    if (draft.roughness[index] === 2) matte++;
  }
  const metrics = { stage: draft.stage, completed: draft.completed, ready: false, progress: 0,
    guideCells: lineCount, targetCells: count,
    retainedGuide: retainedLines / (lineCount || 1), groundCoverage: loweredGround / (groundCount || 1),
    wasteRemoved: removed / (waste || 1), guideCoverage: carvedOnLine / (lineCount || 1),
    precision: carved ? carvedOnLine / carved : 1, relief: relief / count,
    treated: treated / count, gloss: gloss / count, matte: matte / count };
  let amount = 0;
  if (draft.stage === 'shape') {
    amount = metrics.wasteRemoved / .90;
    metrics.detail = '去除纸样外的余料；细工具可修整边缘。';
  } else if (draft.stage === 'carve') {
    if (draft.sealFace) {
      if (draft.sealCut === 'relief') {
        amount = Math.min(metrics.groundCoverage / .70, metrics.retainedGuide / .85);
        metrics.detail = metrics.retainedGuide < .85 ? '朱文需要留下高处的纹线。刻掉太多纹线时，可撤销或重做本阶段。'
          : metrics.groundCoverage < .70 ? '用平磨头剔去纹线外的背景。高处的山水会着朱，低下的背景会留白，随时试印看看。'
            : '朱文已经浮起。可继续剔地、试印，也可以进入抛光。';
      } else {
        amount = Math.min(metrics.guideCoverage / .55, metrics.precision / .55);
        metrics.detail = metrics.precision < .55 ? '白文刻线偏离较多，可撤销或重做；留下的刀痕都会出现在试印纸上。'
          : metrics.guideCoverage < .55 ? '用细刻头刻出纹线，朱红底上会留下白色线条。白文不必剔低背景，先试印再决定下一刀。'
            : '白文线条已经显现。试印检查疏密，也可继续补刻或进入抛光。';
      }
    } else {
    amount = Math.min(metrics.guideCoverage / .48, metrics.relief / .055, metrics.precision / .55);
    metrics.detail = metrics.precision < .55 ? '刻线偏离较多，可撤销或重做本阶段；线外背景请换平磨头。'
      : metrics.guideCoverage < .48 ? '用细刻头沿辅助线刻纹，完成约一半纹线后，再处理浮雕背景。'
        : metrics.relief < .055 ? '刻纹已经足够。换用平磨头，磨低一小块纹线外的背景，让纹样浮起。'
          : '纹线与浮雕已经形成层次，可以继续精修，也可以进入抛光。';
    }
  } else {
    const maxGloss = draft.finish === 'satin' ? .30 : .55;
    const minGloss = draft.finish === 'satin' ? .015 : .065;
    const minMatte = draft.finish === 'satin' ? .38 : .22;
    amount = Math.min(metrics.gloss / minGloss, metrics.matte / minMatte, metrics.treated / .45);
    if (metrics.gloss > maxGloss) amount = Math.min(amount, .85);
    metrics.detail = metrics.gloss > maxGloss ? '亮面过多，用细磨砂恢复一部分柔光，让层次重新显现。'
      : metrics.treated < .45 ? '先用细磨砂整理一部分表面，再选少量位置用布轮抛亮。'
        : metrics.gloss < minGloss ? '柔光已经铺好。换用布轮，点亮一小块已经细磨过的位置。'
          : metrics.matte < minMatte ? '高光已经足够，再用细磨砂整理一些柔光区域。'
            : '柔光与高光已有对比，可以落款成器，也可以继续调整。';
  }
  metrics.ready = amount >= 1;
  // Never display 100% while the next-stage action is still disabled.
  metrics.progress = metrics.ready ? 100 : Math.min(99, Math.floor(clamp(amount, 0, 1) * 100));
  return metrics;
}

export function advanceStage(draft) {
  if (draft.completed || !stageMetrics(draft).ready) return false;
  endStroke(draft);
  if (draft.stage === 'polish') {
    draft.completed = true;
    draft.undo = null;
    draft.checkpoint = null;
    return true;
  }
  draft.stage = draft.stage === 'shape' ? 'carve' : 'polish';
  draft.undo = null;
  draft.checkpoint = snapshot(draft);
  return true;
}

function validateGrid(grid, limit) {
  if (!Array.isArray(grid) || grid.length !== LENGTH) fail();
  for (let index = 0; index < LENGTH; index++) {
    if (!Number.isInteger(grid[index]) || grid[index] < 0 || grid[index] > limit) fail();
  }
  return grid.slice();
}

function validateSnapshot(value, stage) {
  if (!value || value.stage !== stage) fail();
  return { stage, ...Object.fromEntries(Object.entries(GRID_LIMITS).map(([key, limit]) => [key, validateGrid(value[key], limit)])) };
}

/** Throws on invalid input and returns a whitelisted, independent JSON copy. */
export function validateDraft(value) {
  if (!value || value.version !== 1 || value.size !== CRAFT_SIZE || !SHAPES.includes(value.shape)
    || !STAGES.includes(value.stage) || !PATTERNS.includes(value.pattern) || !FINISHES.includes(value.finish)
    || typeof value.completed !== 'boolean' || typeof value.strokeOpen !== 'boolean') fail();
  const layout = layoutFor(value.layout);
  if (!value.layout || Object.keys(layout).some(key => layout[key] !== value.layout[key])) fail();
  if (value.completed && (value.stage !== 'polish' || value.strokeOpen || value.undo !== null || value.checkpoint !== null)) fail();
  if (value.strokeOpen && !value.undo) fail();
  const draft = { version: 1, size: CRAFT_SIZE, material: materialFor(value.material), shape: value.shape,
    layout, pattern: value.pattern, finish: value.finish, stage: value.stage, completed: value.completed,
    ...Object.fromEntries(Object.entries(GRID_LIMITS).map(([key, limit]) => [key, validateGrid(value[key], limit)])),
    checkpoint: value.completed ? null : validateSnapshot(value.checkpoint, value.stage),
    undo: value.undo === null ? null : validateSnapshot(value.undo, value.stage), strokeOpen: value.strokeOpen };
  if (value.motifs !== undefined) draft.motifs = validateMotifs(value.motifs);
  if (value.sealFace !== undefined) {
    if (value.sealFace !== true || draft.shape !== 'seal' || !draft.motifs) fail();
    draft.sealFace = true;
  }
  if (value.sealCut !== undefined) {
    if (!draft.sealFace || !['intaglio','relief'].includes(value.sealCut)) fail();
    draft.sealCut = value.sealCut;
  }
  const { target, original } = geometry(draft);
  const grids = [draft, draft.checkpoint, draft.undo].filter(Boolean);
  for (const grid of grids) for (let index = 0; index < LENGTH; index++) {
    if (grid.base[index] && !original[index] || target[index] && !grid.base[index]) fail();
    if (!grid.base[index] && (grid.height[index] || grid.carve[index] || grid.roughness[index])) fail();
    if (grid.base[index] && !grid.height[index]) fail();
    if (grid.carve[index] && !target[index]) fail();
    if (grid.carve[index] && grid.height[index] > 5) fail();
    if (draft.stage === 'shape' && grid.carve[index]) fail();
    if (draft.stage !== 'polish' && grid.base[index] && grid.roughness[index] !== 3) fail();
  }
  // Imported later stages must contain the actual earlier work, not just a changed stage label.
  for (const grid of grids) {
    const work = { ...draft, ...grid };
    if (draft.stage !== 'shape' && !stageMetrics({ ...work, stage: 'shape' }).ready) fail();
    if (draft.stage === 'polish' && !stageMetrics({ ...work, stage: 'carve' }).ready) fail();
  }
  if (draft.completed && !stageMetrics(draft).ready) fail();
  return draft;
}

export function serializeDraft(draft) { return JSON.stringify(validateDraft(draft)); }

export function deserializeDraft(serialized) {
  if (typeof serialized !== 'string' || serialized.length > 180000) fail();
  return validateDraft(JSON.parse(serialized));
}

/** Suitable for piece.artisan. No undo/checkpoint arrays survive completion. */
export function createFinishedPiece(draft) {
  if (!draft.completed) throw new Error('请先完成三个加工阶段。');
  return validateDraft({ ...clone(draft), stage: 'polish', completed: true, checkpoint: null, undo: null, strokeOpen: false });
}
