import { TILE_SIZE, TILE_SCALE, MAP_COLUMNS, MAP_ROWS, TILE_RULES, generateMine } from './mining.js';

export function placeholderMineWorld(options) {
  return { ...generateMine(options), frames: [0, 1, 2, 3, 4],
    assetNotice: '使用程序像素素材 · 正式 PNG / TMJ 尚未接入' };
}

/** TMJ describes frames and a feet-anchored point, never the runtime terrain. */
export function readTiledMine(data, options = {}) {
  const fail = message => { throw new Error(`Tiled 矿洞元数据无效：${message}`); };
  if (data?.tilewidth !== TILE_SIZE || data.tileheight !== TILE_SIZE || data.width !== MAP_COLUMNS
    || data.height !== MAP_ROWS || data.orientation !== 'orthogonal' || data.infinite) fail('需要有限的 60×32 正交地图和 16×16 tile。');
  if (!Array.isArray(data.tilesets) || data.tilesets.length !== 1 || !Array.isArray(data.layers)) fail('需要一个嵌入图块集及 spawn 对象层。');
  const set = data.tilesets[0];
  if (set.source || set.tilewidth !== 16 || set.tileheight !== 16 || set.firstgid !== 1
    || !Number.isInteger(set.tilecount) || set.tilecount < 5 || !Number.isInteger(set.columns) || set.columns < 1
    || (set.margin ?? 0) !== 0 || (set.spacing ?? 0) !== 0) fail('图块集应嵌入，至少五帧，firstgid=1，margin/spacing=0。');
  if (!Array.isArray(set.tiles)) fail('缺少 kind / hardness 属性。');
  const frames = Array(5).fill(null), ids = new Set();
  for (const tile of set.tiles) {
    if (!Number.isInteger(tile.id) || tile.id < 0 || tile.id >= set.tilecount || ids.has(tile.id)) fail('帧 ID 无效或重复。');
    ids.add(tile.id);
    const properties = tile.properties ?? [];
    const kind = properties.find(property => property.name === 'kind')?.value;
    const hardness = properties.find(property => property.name === 'hardness')?.value;
    const index = TILE_RULES.findIndex(rule => rule.kind === kind);
    if (index < 0 || frames[index] !== null || hardness !== TILE_RULES[index].hardness
      || properties.filter(property => property.name === 'kind').length !== 1
      || properties.filter(property => property.name === 'hardness').length !== 1) fail('五类 kind 必须唯一，hardness 必须与规则表一致。');
    frames[index] = tile.id;
  }
  if (frames.some(frame => frame === null)) fail('需要 AIR / DIRT / STONE / JADE_VEIN / BEDROCK 五类。');
  if (data.layers.some(layer => layer.type === 'tilelayer' || ['ground', 'walls', 'decor', 'oreNodes', 'ladders'].includes(layer.name))) fail('旧布局图层不再支持；地形与梯子由运行时生成。');
  const layers = data.layers.filter(layer => layer.type === 'objectgroup' && layer.name === 'spawn');
  if (layers.length !== 1 || layers[0].offsetx || layers[0].offsety) fail('需要原点对齐的 spawn 对象层。');
  const objects = layers[0].objects;
  if (!Array.isArray(objects) || objects.length !== 1) fail('spawn 只能包含一个 PlayerSpawn 点对象。');
  const object = objects[0];
  if ((object.class || object.type || object.name) !== 'PlayerSpawn' || object.point !== true
    || (object.width ?? 0) !== 0 || (object.height ?? 0) !== 0
    || !Number.isFinite(object.x) || !Number.isFinite(object.y)) fail('PlayerSpawn 必须是脚底点坐标。');
  const spawn = { x: object.x * TILE_SCALE, y: object.y * TILE_SCALE };
  const world = generateMine({ ...options, spawn });
  if (!world.canStand(spawn.x, spawn.y)) fail('出生点身体与实体重叠或越界。');
  return { ...world, frames, assetNotice: 'Tiled 元数据已校验 · 地形由运行时生成' };
}
