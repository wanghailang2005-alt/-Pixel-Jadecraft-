import { EXCAVATION_TOOLS, aimsAtSeam, excavationStroke, nearbySurveyCluster } from './mine-exploration.js';

export const TILE_SIZE = 16;
export const TILE_SCALE = 2;
export const CELL_SIZE = TILE_SIZE * TILE_SCALE;
export const MAP_COLUMNS = 60;
export const MAP_ROWS = 32;
export const WORLD_WIDTH = MAP_COLUMNS * CELL_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * CELL_SIZE;
export const MINE_SEED = 20261111;
export const TILE = Object.freeze({ AIR: 0, DIRT: 1, STONE: 2, JADE_VEIN: 3, BEDROCK: 4 });
export const TILE_RULES = Object.freeze([
  { kind: 'AIR', hardness: 0 }, { kind: 'DIRT', hardness: 2 },
  { kind: 'STONE', hardness: 3 }, { kind: 'JADE_VEIN', hardness: 3 },
  { kind: 'BEDROCK', hardness: 0 },
].map(Object.freeze));
export const MINE_SPAWN = Object.freeze({ x: 160, y: 832 });
export const MINER_BOX = Object.freeze({ width: 24, height: 56 });
export const MINE_CLUSTERS = Object.freeze([
  [10, 11, 'nephrite'], [28, 13, 'jadeite'], [45, 18, 'nephrite'],
  [20, 21, 'jadeite'], [38, 27, 'nephrite'], [52, 29, 'jadeite'],
].map(([column, row, material], index) => Object.freeze({ id: `C${index + 1}`, column, row, material })));

/** Literal v3.1 hash; used only for the initial geology, never settlement. */
export function mineHash(column, row, seed = MINE_SEED) {
  return (((column * 374761393 + row * 668265263 + seed * 1442695041) >>> 0) % 1000) / 1000;
}

/** New arrays on every call: no scene may mutate another session's terrain. */
export function generateMine({ seed = MINE_SEED, mineVeins, spawn = MINE_SPAWN } = {}) {
  const map = Array.from({ length: MAP_ROWS }, (_, row) => Array.from({ length: MAP_COLUMNS }, (_, column) =>
    row < 6 || mineHash(column, row, seed) > .94 ? TILE.AIR : row < 14 ? TILE.DIRT : TILE.STONE));
  const fill = (left, right, top, bottom, tile) => {
    for (let row = top; row <= bottom; row++) for (let column = left; column <= right; column++) map[row][column] = tile;
  };
  fill(1, 8, 23, 26, TILE.AIR);
  fill(1, 8, 27, 27, TILE.STONE);
  const veins = [];
  for (const [index, cluster] of MINE_CLUSTERS.entries()) {
    const { column, row, id, material } = cluster;
    fill(column - 1, column + 2, row - 1, row + 1, TILE.STONE);
    for (let side = 0; side < 2; side++) {
      map[row][column + side] = TILE.JADE_VEIN;
      veins.push({ id: `${id}-${side ? 'R' : 'L'}`, cluster: index, side, column: column + side, row, material });
    }
  }
  // Floors first, then carve shafts: their shared openings must stay empty.
  fill(4, 51, 9, 9, TILE.STONE);
  for (const { column, row } of MINE_CLUSTERS) fill(column - 4, column - 2, row + 1, row + 1, TILE.STONE);
  fill(4, 51, 6, 8, TILE.AIR);
  fill(4, 6, 6, 26, TILE.AIR);
  // Rise above the corridor floor so a walking miner can leave a wide shaft
  // before gravity carries their feet below the floor's side wall.
  const ladders = [{ id: 'entrance', x: 176, top: 192, bottom: 864 }];
  for (const { id, column, row } of MINE_CLUSTERS) {
    fill(column - 4, column - 2, 6, row, TILE.AIR);
    ladders.push({ id, x: (column - 3) * CELL_SIZE + 16, top: 192, bottom: (row + 1) * CELL_SIZE });
  }
  fill(0, MAP_COLUMNS - 1, 0, 0, TILE.BEDROCK);
  fill(0, MAP_COLUMNS - 1, MAP_ROWS - 1, MAP_ROWS - 1, TILE.BEDROCK);
  fill(0, 0, 0, MAP_ROWS - 1, TILE.BEDROCK);
  fill(MAP_COLUMNS - 1, MAP_COLUMNS - 1, 0, MAP_ROWS - 1, TILE.BEDROCK);
  for (const vein of veins) if (mineVeins?.[vein.cluster]?.[vein.side] === true) map[vein.row][vein.column] = TILE.STONE;
  return { seed, map, veins, clusters: MINE_CLUSTERS, spawn: { ...spawn }, ladders,
    canStand: (x, y) => canStand(x, y, map) };
}

export function canStand(x, y, map) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const left = Math.floor((x - MINER_BOX.width / 2) / CELL_SIZE);
  const right = Math.floor((x + MINER_BOX.width / 2 - .001) / CELL_SIZE);
  const top = Math.floor((y - MINER_BOX.height) / CELL_SIZE);
  const bottom = Math.floor((y - .001) / CELL_SIZE);
  for (let row = top; row <= bottom; row++) for (let column = left; column <= right; column++) {
    if (map[row]?.[column] !== TILE.AIR) return false;
  }
  return true;
}

export const SWING_MS = 320;
export const REACH = 48;
export const WALK_SPEED = 176;
export const JUMP_SPEED = -420;
export const GRAVITY = 1200;
export const PICKUP_REACH = 28;
export const CATWALK_Y = 9 * CELL_SIZE;
const EPSILON = .001;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const cellKey = ({ column, row }) => `${column},${row}`;

/** Active game time only. Large frame gaps cannot complete several swings. */
export function advanceSwing(swing, delta, maxStep = 50) {
  if (!swing) return null;
  return { ...swing, elapsed: swing.elapsed + clamp(delta, 0, maxStep) };
}

/** Move one axis in <=2px steps and finish flush against the first obstacle. */
function moveAxis(body, axis, distance, world) {
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / 2));
  const step = distance / steps;
  for (let index = 0; index < steps; index++) {
    const candidate = body[axis] + step;
    const x = axis === 'x' ? candidate : body.x;
    const y = axis === 'y' ? candidate : body.y;
    if (world.canStand(x, y)) {
      body[axis] = candidate;
      continue;
    }
    // Refine the last <=2px instead of leaving an inconsistent ground gap.
    let free = body[axis], blocked = candidate;
    for (let iteration = 0; iteration < 12; iteration++) {
      const middle = (free + blocked) / 2;
      if (world.canStand(axis === 'x' ? middle : body.x, axis === 'y' ? middle : body.y)) free = middle;
      else blocked = middle;
    }
    body[axis] = free;
    return true;
  }
  return false;
}

/** Feet coordinates. A jump is an input edge, never a held-key repeat. */
export function moveMiner(body, input, delta, world) {
  if (delta <= 0) return { ...body };
  const seconds = clamp(delta, 0, 50) / 1000;
  const next = { ...body };
  const overCatwalk = x => world.ladders.some(item => x >= item.x - 48 && x <= item.x + 48);
  const onCatwalk = Math.abs(body.y - CATWALK_Y) < .01 && overCatwalk(body.x);
  const grounded = onCatwalk || !world.canStand(body.x, body.y + .1);
  const ladder = world.ladders.find(item => Math.abs(body.x - item.x) <= 24
    && body.y >= item.top - 2 && body.y <= item.bottom + 2);
  if (ladder && !input.x && !input.jump && (input.y || body.climbing)) {
    const aligned = world.canStand(ladder.x, body.y);
    if (aligned) {
      next.x = ladder.x;
      const y = clamp(body.y + input.y * 144 * seconds, ladder.top, ladder.bottom);
      moveAxis(next, 'y', y - next.y, world);
      next.velocityY = 0;
      next.climbing = true;
      next.grounded = !world.canStand(next.x, next.y + .1);
      return next;
    }
  }
  next.climbing = false;
  moveAxis(next, 'x', clamp(input.x, -1, 1) * WALK_SPEED * seconds, world);
  next.velocityY = input.jump && grounded ? JUMP_SPEED : body.velocityY ?? 0;
  // Exact constant-acceleration displacement within each clamped game frame.
  const distanceY = next.velocityY * seconds + .5 * GRAVITY * seconds * seconds;
  next.velocityY = Math.min(next.velocityY + GRAVITY * seconds, 900);
  if (moveAxis(next, 'y', distanceY, world)) next.velocityY = 0;
  // Hand-built one-way planks bridge each existing shaft. Horizontal travel is
  // continuous; the ladder branch above still takes W/S straight through them.
  if (body.y <= CATWALK_Y + EPSILON && next.y >= CATWALK_Y && next.velocityY >= 0 && overCatwalk(next.x)) {
    next.y = CATWALK_Y; next.velocityY = 0;
  }
  next.grounded = Math.abs(next.y - CATWALK_Y) < .01 && overCatwalk(next.x) || !world.canStand(next.x, next.y + .1);
  return next;
}

export function minerCenter(body) {
  return { x: body.x, y: body.y - MINER_BOX.height / 2 };
}

/** The first closed cell along a ray. Corner crossings also test both sides. */
export function firstSolid(map, from, to) {
  let column = Math.floor(from.x / CELL_SIZE), row = Math.floor(from.y / CELL_SIZE);
  const endColumn = Math.floor(to.x / CELL_SIZE), endRow = Math.floor(to.y / CELL_SIZE);
  const dx = to.x - from.x, dy = to.y - from.y;
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  const strideX = dx ? CELL_SIZE / Math.abs(dx) : Infinity;
  const strideY = dy ? CELL_SIZE / Math.abs(dy) : Infinity;
  let timeX = dx ? ((column + (stepX > 0 ? 1 : 0)) * CELL_SIZE - from.x) / dx : Infinity;
  let timeY = dy ? ((row + (stepY > 0 ? 1 : 0)) * CELL_SIZE - from.y) / dy : Infinity;
  const solid = (c, r) => map[r]?.[c] !== TILE.AIR;
  for (let count = 0; count < MAP_COLUMNS + MAP_ROWS + 2; count++) {
    if (solid(column, row)) return { column, row };
    if (column === endColumn && row === endRow) return null;
    if (Math.abs(timeX - timeY) < 1e-10) {
      if (solid(column + stepX, row)) return { column: column + stepX, row };
      if (solid(column, row + stepY)) return { column, row: row + stepY };
      column += stepX; row += stepY; timeX += strideX; timeY += strideY;
    } else if (timeX < timeY) {
      column += stepX; timeX += strideX;
    } else {
      row += stepY; timeY += strideY;
    }
  }
  return null;
}

export function facingTarget(body, facing) {
  return { column: Math.floor(body.x / CELL_SIZE) + facing,
    row: Math.floor((body.y - MINER_BOX.height / 2) / CELL_SIZE), source: 'keyboard' };
}

/** Keyboard mining also opens the upper cell needed by the two-cell-tall miner. */
export function keyboardDigTarget(world, body, facing) {
  const target = facingTarget(body, facing);
  if (validDigTarget(world, body, target)) return target;
  const upper = { ...target, row: target.row - 1 };
  return world.map[target.row]?.[target.column] === TILE.AIR && validDigTarget(world, body, upper) ? upper : target;
}

export function validDigTarget(world, body, target) {
  if (!target || !Number.isInteger(target.column) || !Number.isInteger(target.row)) return false;
  const tile = world.map[target.row]?.[target.column];
  if (!TILE_RULES[tile]?.hardness) return false;
  const from = minerCenter(body);
  const near = { x: clamp(from.x, target.column * CELL_SIZE + EPSILON, (target.column + 1) * CELL_SIZE - EPSILON),
    y: clamp(from.y, target.row * CELL_SIZE + EPSILON, (target.row + 1) * CELL_SIZE - EPSILON) };
  if (Math.hypot(from.x - near.x, from.y - near.y) > REACH + EPSILON) return false;
  const obstacle = firstSolid(world.map, from, near);
  return obstacle?.column === target.column && obstacle?.row === target.row;
}

/** One persistent scene-session object. The scene owns only its input/graphics. */
export function createMining(store, world) {
  const damage = new Map(), drops = new Map();
  for(const drop of store.state.pendingDrops ?? []) {
    drops.set(drop.id,{...drop});
    const vein=world.veins.find(item=>item.id===drop.id);
    if(vein)world.map[vein.row][vein.column]=TILE.AIR;
  }
  const veins = new Map(world.veins.map(vein => [cellKey(vein), vein]));
  let swing = null, tool = 'fine';
  const survey = new Set(store.state.mineSurvey ?? []);
  const active = () => store.active && store.state.location === 'mine';
  function cancel() { swing = null; }
  function observed(id) { return survey.has(id) || (store.state.mineSurvey ?? []).includes(id); }
  function setTool(value) {
    if (!EXCAVATION_TOOLS[value]) return false;
    if (value !== tool) cancel();
    tool = value;
    return true;
  }
  function observe(body) {
    if (!active()) return null;
    const cluster = nearbySurveyCluster(world, body);
    if (!cluster) return null;
    const first = !observed(cluster.id);
    if (first && store.observeMineCluster && !store.observeMineCluster(cluster.id)) return null;
    survey.add(cluster.id);
    cancel();
    return { cluster, first };
  }
  function profile(target) {
    const vein = target && veins.get(cellKey(target));
    const seam = vein && observed(`C${vein.cluster + 1}`) && aimsAtSeam(target, vein);
    return excavationStroke(TILE_RULES[world.map[target?.row]?.[target?.column]]?.kind, tool, Boolean(seam));
  }
  function update(body, target, held, delta) {
    if (!active() || !held || !validDigTarget(world, body, target)) { cancel(); return null; }
    const key = cellKey(target);
    const stroke = profile(target);
    if (swing?.key !== key || swing?.source !== target.source || swing?.tool !== tool || swing?.seam !== stroke.seam) {
      swing = { key, source: target.source, elapsed: 0, ...stroke };
    }
    swing = advanceSwing(swing, delta);
    if (swing.elapsed < stroke.duration) return null;
    // Preserve excess game-frame time between consecutive hits on this tile.
    swing.elapsed -= stroke.duration;
    const tile = world.map[target.row][target.column];
    const hits = (damage.get(key) ?? 0) + stroke.strength;
    damage.set(key, hits);
    const broken = hits >= TILE_RULES[tile].hardness;
    if (broken) {
      const vein = veins.get(key);
      const center=minerCenter(body);
      const newDrop=tile===TILE.JADE_VEIN?{id:vein.id,material:vein.material,
        x:clamp(center.x,target.column*CELL_SIZE+4,(target.column+1)*CELL_SIZE-4),
        y:clamp(center.y,target.row*CELL_SIZE+4,(target.row+1)*CELL_SIZE-4)}:null;
      if (tile === TILE.JADE_VEIN && !store.consumeMineVein(vein.id,newDrop)) { cancel(); return null; }
      world.map[target.row][target.column] = TILE.AIR;
      damage.delete(key);
      if (tile === TILE.JADE_VEIN) {
        drops.set(vein.id,newDrop);
      }
      cancel();
    }
    return { ...target, tile, hits, broken, ...stroke };
  }
  function pickup(body) {
    const result = { collected: [], full: false };
    if (!active()) return result;
    for (const drop of drops.values()) {
      const near = { x: clamp(drop.x, body.x - MINER_BOX.width / 2, body.x + MINER_BOX.width / 2),
        y: clamp(drop.y, body.y - MINER_BOX.height, body.y - EPSILON) };
      if (Math.hypot(drop.x - near.x, drop.y - near.y) > PICKUP_REACH || firstSolid(world.map, near, drop)) continue;
      if (store.addMaterial(drop.material, drop.id)) { drops.delete(drop.id); result.collected.push(drop); }
      else if (store.state.inventory.length >= 12) result.full = true;
    }
    return result;
  }
  return { world, damage, drops, update, pickup, cancel, observed, observe, setTool, profile,
    get tool() { return tool; }, get swing() { return swing; } };
}
