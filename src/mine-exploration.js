// Fictional mine names. These describe game materials, not real provenance.
export const MINE_LORE = Object.freeze([
  { id: 'C1', name: '雾白旧脉', color: '雾白底色', clue: '两块浅玉共用雾白底色，可分别留下柔光面与亮面。' },
  { id: 'C2', name: '春水翠根', color: '春水绿带', clue: '两块翠玉来自同一道绿色矿脉，可以试做一对游鱼。' },
  { id: 'C3', name: '月骨青岚', color: '浅青玉色', clue: '同一层浅青玉色，一块留白，一块刻纹，成对比较。' },
  { id: 'C4', name: '苔下碧潭', color: '深浅翠色', clue: '两块石料都带深浅翠色，试着让水光落在不同位置。' },
  { id: 'C5', name: '松烟雪线', color: '温润浅底', clue: '同脉浅色料可做不同器形，看看纹线怎样改变观感。' },
  { id: 'C6', name: '回声翡谷', color: '浓淡绿色', clue: '同脉翠玉一明一暗，适合做两种浮雕与光泽实验。' },
].map(Object.freeze));

export const EXCAVATION_TOOLS = Object.freeze({
  fine: Object.freeze({ name: '细凿', key: '1', duration: 320 }),
  heavy: Object.freeze({ name: '重镐', key: '2', duration: 520 }),
});

/** Fixed visible seam points stay attached to the two finite ore sources. */
export function seamPoint(vein) {
  return { x: vein.column * 32 + (vein.side ? 22 : 10), y: vein.row * 32 + 16 };
}

export function aimsAtSeam(target, vein) {
  if (!vein || !Number.isFinite(target?.aim?.x) || !Number.isFinite(target?.aim?.y)) return false;
  const point = seamPoint(vein);
  return Math.hypot(target.aim.x - point.x, target.aim.y - point.y) <= 8;
}

/** Heavy strokes open rock quickly; precise seam work releases jade in one hit. */
export function excavationStroke(kind, tool = 'fine', seam = false) {
  const selected = EXCAVATION_TOOLS[tool] ? tool : 'fine';
  return {
    tool: selected, duration: EXCAVATION_TOOLS[selected].duration,
    strength: selected === 'heavy' ? (kind === 'JADE_VEIN' ? 1 : 3) : (kind === 'JADE_VEIN' && seam ? 3 : 1),
    seam: kind === 'JADE_VEIN' && selected === 'fine' && seam,
  };
}

export function nearbySurveyCluster(world, body) {
  let nearest = null, distance = 180;
  for (const cluster of world.clusters) {
    if (Math.abs(body.y - 28 - (cluster.row * 32 + 16)) > 64) continue;
    const value = Math.hypot(body.x - ((cluster.column - 1) * 32 + 16), body.y - 28 - (cluster.row * 32 + 16));
    if (value < distance) { nearest = cluster; distance = value; }
  }
  return nearest;
}

/** Old collected stones and finished/reworked pieces count toward the same pair. */
export function minePairProgress(state, clusterId) {
  const index = Number(/^C([1-6])$/.exec(clusterId)?.[1]) - 1;
  const recovered = new Set([
    ...(state.inventory ?? []).map(item => item.id),
    ...(state.pieces ?? []).map(item => item.id),
    state.crafting?.materialId,
  ]);
  const ids = ['L', 'R'].map(side => `${clusterId}-${side}`);
  return {
    extracted: index >= 0 ? (state.mineVeins?.[index] ?? []).filter(Boolean).length : 0,
    recovered: ids.filter(id => recovered.has(id)).length,
    pending: (state.pendingDrops ?? []).filter(drop => ids.includes(drop.id)).length,
    stones: ids.map(id => ({ id, recovered: recovered.has(id) })),
  };
}

export function mineRouteHint(world, body, cluster) {
  if (!cluster) return '六处矿脉，每脉两块同源玉。';
  const ladder = world.ladders.find(item => item.id === cluster.id);
  if (!ladder) return '沿木梯寻找这一处矿脉。';
  if (nearbySurveyCluster(world, body)?.id === cluster.id) return '已到岩壁 · R 侧灯观察 → 重镐开路 → 细凿点金色缝口';
  if (body.y > 300 && Math.abs(body.x - ladder.x) > 48) return '↑ 沿身边木梯回到上方横向矿道';
  if (Math.abs(body.x - ladder.x) > 24) return `${body.x < ladder.x ? '→ 向右' : '← 向左'}沿上方矿道，寻找 ${cluster.id.slice(1)} 号木梯`;
  return '↓ 沿这一架木梯下行，到平台后向右观察岩壁';
}
