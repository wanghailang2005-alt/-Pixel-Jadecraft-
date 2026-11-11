export const TILE_SIZE = 16;
export const TILE_SCALE = 2;
export const CELL_SIZE = TILE_SIZE * TILE_SCALE;
export const MAP_COLUMNS = 60;
export const MAP_ROWS = 32;
export const WORLD_WIDTH = MAP_COLUMNS * CELL_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * CELL_SIZE;
export const COOLDOWN_MS = 30_000;
export const SWING_MS = 320;
export const REGEN_MS = 400;
export const REACH = 96;
export const PLAYER_START = { x: 480, y: 928 };
export const MINE_LADDERS = Object.freeze([
  { x: 944, top: 608, bottom: 928 },
  { x: 1104, top: 288, bottom: 608 },
]);

/** Only active scene frames advance a swing. A zero maxStep represents pause. */
export function advanceSwing(swing, delta, maxStep = 50) {
  if (!swing) return null;
  return { ...swing, elapsed: swing.elapsed + Math.max(0, Math.min(delta, maxStep)) };
}
export const MINE_NODES = Object.freeze([
  { id: 'ore-1', column: 11, row: 27, material: 'nephrite' },
  { id: 'ore-2', column: 21, row: 27, material: 'jadeite' },
  { id: 'ore-3', column: 41, row: 27, material: 'nephrite' },
  { id: 'ore-4', column: 54, row: 27, material: 'jadeite' },
  { id: 'ore-5', column: 33, row: 17, material: 'nephrite' },
  { id: 'ore-6', column: 12, row: 7, material: 'jadeite' },
].map(node => Object.freeze({ ...node, x: node.column * CELL_SIZE + 16, y: node.row * CELL_SIZE + 16 })));

// Side-view cave with a continuous floor and two ladder-connected ledges.
export const MINE_MAP = Array.from({ length: MAP_ROWS }, (_, row) =>
  Array.from({ length: MAP_COLUMNS }, (_, column) => {
    if (column === 0 || column === MAP_COLUMNS - 1 || row >= 29) return 1;
    if ((row === 19 && column >= 27 && column <= 57)
      || (row === 9 && column >= 4 && column <= 36)) return 2;
    return 0;
  }));

export function canStand(x, y, map = MINE_MAP) {
  // Positions are the player's feet, shared by the sprite, ground and ladders.
  const left = Math.floor((x - 12) / CELL_SIZE);
  const right = Math.floor((x + 11) / CELL_SIZE);
  const top = Math.floor((y - 12) / CELL_SIZE);
  const bottom = Math.floor((y - 1) / CELL_SIZE);
  for (let row = top; row <= bottom; row++) {
    for (let column = left; column <= right; column++) {
      if (map[row]?.[column] !== 0) return false;
    }
  }
  return true;
}

/** Side-view movement and ladder traversal, independent of rendering. */
export function moveMiner(body, input, delta, world) {
  const seconds = Math.min(Math.max(delta, 0), 50) / 1000;
  const next = { ...body };
  const ladder = (world.ladders ?? []).find(ladder => Math.abs(body.x - ladder.x) <= 24 && body.y >= ladder.top - 2 && body.y <= ladder.bottom + 2);
  if (ladder && !input.x && (input.y || body.climbing)) {
    next.x = ladder.x;
    next.y = Math.max(ladder.top, Math.min(ladder.bottom, body.y + input.y * 144 * seconds));
    next.velocityY = 0;
    next.climbing = next.y > ladder.top && next.y < ladder.bottom;
    return next;
  }
  next.climbing = false;
  const dx = input.x * 176 * seconds;
  const xSteps = Math.max(1, Math.ceil(Math.abs(dx) / 3));
  for (let step = 0; step < xSteps; step++) {
    const x = next.x + dx / xSteps;
    if (world.canStand(x, next.y)) next.x = x;
  }
  next.velocityY = Math.min((body.velocityY ?? 0) + 900 * seconds, 420);
  const dy = next.velocityY * seconds;
  const ySteps = Math.max(1, Math.ceil(Math.abs(dy) / 3));
  for (let step = 0; step < ySteps; step++) {
    const y = next.y + dy / ySteps;
    if (world.canStand(next.x, y)) next.y = y;
    else { next.velocityY = 0; break; }
  }
  return next;
}

/** Session-only node state. Disk settlement belongs to GameStore. */
export function createMining(store, nodeStates) {
  let settlementSequence = 0;
  function reset(now = Date.now()) {
    nodeStates.clear();
    for (const node of MINE_NODES) nodeStates.set(node.id, { phase: 'full', changedAt: now });
  }
  reset();
  // Wall-clock changedAt advances display phases, empty cooldown and regrowth.
  // Swing completion is decided exclusively by accumulated active scene frames.
  function status(id, now = Date.now()) {
    const state = nodeStates.get(id);
    if (!state) return null;
    if (state.phase === 'full' && now >= state.changedAt + 200) {
      state.phase = 'cracked'; state.changedAt += 200;
    }
    if (state.phase === 'cracked' && now >= state.changedAt + 200) {
      state.phase = 'ready'; state.changedAt += 200;
    }
    if (state.phase === 'empty' && now >= state.changedAt + COOLDOWN_MS) {
      state.phase = 'regrowing'; state.changedAt += COOLDOWN_MS;
    }
    if (state.phase === 'regrowing' && now >= state.changedAt + REGEN_MS) {
      state.phase = 'ready'; state.changedAt += REGEN_MS;
    }
    return state;
  }
  function begin(id, now = Date.now()) {
    const state = status(id, now);
    if (!store.active || store.state.location !== 'mine') return 'inactive';
    if (!state || state.phase !== 'ready') return 'cooldown';
    if (store.state.inventory.length >= 12) return 'full';
    state.phase = 'mining'; state.changedAt = now;
    state.settlementId = `mine-${id}-${Date.now()}-${++settlementSequence}`;
    return 'started';
  }
  function hit(id, now = Date.now(), onImpact = () => {}) {
    const state = status(id, now);
    const node = MINE_NODES.find(node => node.id === id);
    if (!node || state?.phase !== 'mining') {
      if (state) { state.phase = 'ready'; state.changedAt = now; }
      return false;
    }
    if (!store.active || store.state.location !== 'mine' || store.state.inventory.length >= 12) {
      state.phase = 'ready'; state.changedAt = now;
      return false;
    }
    onImpact();
    if (!store.addMaterial(node.material, state.settlementId)) {
      state.phase = 'ready'; state.changedAt = now;
      return false;
    }
    state.phase = 'empty'; state.changedAt = now;
    return true;
  }
  function cancel(id, now = Date.now()) {
    const state = nodeStates.get(id);
    if (state?.phase === 'mining') { state.phase = 'ready'; state.changedAt = now; }
  }
  return { reset, status, begin, hit, cancel };
}
