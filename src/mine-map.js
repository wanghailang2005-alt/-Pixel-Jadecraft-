import { TILE_SCALE, TILE_SIZE, MAP_COLUMNS, MAP_ROWS, CELL_SIZE, MINE_MAP, MINE_NODES, MINE_LADDERS, PLAYER_START, WORLD_WIDTH, WORLD_HEIGHT, canStand } from './mining.js';

export function placeholderMineWorld() {
  return { map: MINE_MAP, nodes: MINE_NODES, spawn: PLAYER_START, ladders: MINE_LADDERS, canStand };
}

/** Adapt Tiled data to the same collision, node and spawn interfaces as MINE_MAP. */
export function readTiledMine(data) {
  const fail = message => { throw new Error(`Tiled 矿洞地图无效：${message}`); };
  if (data?.tilewidth !== TILE_SIZE || data.tileheight !== TILE_SIZE || data.width !== MAP_COLUMNS || data.height !== MAP_ROWS || data.orientation !== 'orthogonal' || data.infinite) fail('需要有限的 60×32 正交地图和 16×16 tile。');
  if (!Array.isArray(data.layers) || !Array.isArray(data.tilesets) || !data.tilesets.length) fail('缺少图层或图块集。');
  const colliding = new Set();
  const validTiles = new Set([0]);
  for (const tileset of data.tilesets) {
    // Phaser's native Tiled JSON parser consumes embedded tileset definitions.
    if (tileset.source || tileset.tilewidth !== TILE_SIZE || tileset.tileheight !== TILE_SIZE || !Number.isInteger(tileset.firstgid) || tileset.firstgid < 1 || !Number.isInteger(tileset.tilecount) || tileset.tilecount < 1 || !Number.isInteger(tileset.columns) || tileset.columns < 1 || (tileset.margin ?? 0) !== 0 || (tileset.spacing ?? 0) !== 0) fail('请嵌入 16×16、margin/spacing=0 的图块集定义。');
    for (let index = 0; index < tileset.tilecount; index++) validTiles.add(tileset.firstgid + index);
    for (const tile of tileset.tiles ?? []) {
      if (tile.properties?.some(property => property.name === 'collides' && property.value === true)) colliding.add(tileset.firstgid + tile.id);
    }
  }
  const layers = {};
  for (const name of ['ground', 'walls', 'decor']) {
    const layer = data.layers.find(layer => layer.name === name && layer.type === 'tilelayer');
    if (!layer || layer.width !== MAP_COLUMNS || layer.height !== MAP_ROWS || !Array.isArray(layer.data) || layer.data.length !== MAP_COLUMNS * MAP_ROWS) fail(`图层 ${name} 需要未压缩的 60×32 数组。`);
    if (layer.x || layer.y || layer.offsetx || layer.offsety) fail(`图层 ${name} 需要对齐地图原点。`);
    if (layer.data.some(gid => !Number.isInteger(gid) || !validTiles.has((gid >>> 0) & 0x0fffffff))) fail(`图层 ${name} 存在无效 tile。`);
    layers[name] = layer;
  }
  const map = Array.from({ length: MAP_ROWS }, (_, row) => Array.from({ length: MAP_COLUMNS }, (_, column) => colliding.has((layers.walls.data[row * MAP_COLUMNS + column] >>> 0) & 0x0fffffff) ? 1 : 0));
  const objectLayer = name => {
    const layer = data.layers.find(layer => layer.name === name && layer.type === 'objectgroup');
    if (!Array.isArray(layer?.objects)) fail(`缺少对象层 ${name}。`);
    return layer;
  };
  const position = (object, layer) => {
    const x = (object.x + (object.width ?? 0) / 2 + (layer.offsetx ?? 0)) * TILE_SCALE;
    const y = (object.y + (object.height ?? 0) / 2 + (layer.offsety ?? 0)) * TILE_SCALE;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= WORLD_WIDTH || y >= WORLD_HEIGHT) fail('对象坐标超出世界范围。');
    return { x, y };
  };
  const oreLayer = objectLayer('oreNodes');
  const ores = oreLayer.objects.filter(object => (object.type || object.class) === 'Ore');
  if (ores.length !== MINE_NODES.length) fail('需要六个 Ore 对象。');
  const ids = new Set();
  const nodes = ores.map(object => {
    const properties = Object.fromEntries((object.properties ?? []).map(property => [property.name, property.value]));
    const original = MINE_NODES.find(node => node.id === properties.nodeId);
    if (!original || ids.has(original.id) || properties.material !== original.material) fail('矿点 nodeId / material 必须与六个 MINE_NODES 对应。');
    ids.add(original.id);
    const { x, y } = position(object, oreLayer);
    return { ...original, x, y, column: Math.floor(x / CELL_SIZE), row: Math.floor(y / CELL_SIZE) };
  });
  const spawnLayer = objectLayer('spawn');
  const spawns = spawnLayer.objects.filter(object => (object.type || object.class || object.name) === 'PlayerSpawn');
  if (spawns.length !== 1) fail('需要一个 PlayerSpawn 对象。');
  const spawn = position(spawns[0], spawnLayer);
  if (!canStand(spawn.x, spawn.y, map)) fail('出生点与碰撞 tile 重叠。');
  const ladders = (data.layers.find(layer => layer.name === 'ladders')?.objects ?? []).map(object => ({
    x: (object.x + (object.width ?? 0) / 2) * TILE_SCALE,
    top: object.y * TILE_SCALE,
    bottom: (object.y + object.height) * TILE_SCALE,
  }));
  return { map, nodes, spawn, ladders, canStand: (x, y) => canStand(x, y, map) };
}
