/** Original drawing components. Coordinates live on the jade, not on a screen. */
export const MOTIFS = Object.freeze({
  cloud: { name: '云头', hint: '回旋的云气，可接成云带' },
  wave: { name: '水波', hint: '三道水纹，可转成风与流沙' },
  leaf: { name: '叶片', hint: '叶脉与轮廓，可翻成一枝双叶' },
  fish: { name: '游鱼', hint: '一尾游鱼，可与水波相接' },
  mountain: { name: '山峦', hint: '错落的山峰，可叠成远山' },
  spiral: { name: '回旋', hint: '向内回旋，可排成谷粒与涡流' },
});
export const MAX_MOTIFS = 12;
const point = (x, y) => ({ x, y });
const line = values => values.map(([x, y]) => point(x, y));

/** Small authored strokes, not full-object templates. */
export function motifPaths(kind) {
  if (kind === 'cloud') return [line([[-.5,.12],[-.4,-.08],[-.22,-.13],[-.2,-.32],[-.02,-.43],[.2,-.34],[.27,-.17],[.46,-.09],[.5,.12],[.32,.24],[.08,.2],[-.04,.03],[.06,-.08],[.19,-.03],[.16,.09]]), line([[-.5,.12],[-.34,.29],[-.15,.3],[-.03,.19]])];
  if (kind === 'wave') return [-.25, 0, .25].map(offset => Array.from({ length: 21 }, (_, index) => point(-.5 + index / 20, offset + .07 * Math.sin(index / 20 * Math.PI * 2))));
  if (kind === 'leaf') return [line([[-.45,.4],[-.47,.04],[-.29,-.25],[.02,-.43],[.46,-.46],[.43,-.05],[.23,.27],[-.05,.43],[-.45,.4]]), line([[-.48,.49],[.36,-.35]]), line([[-.28,.29],[-.28,-.1]]), line([[-.03,.02],[.28,.02]]), line([[.09,-.12],[.08,-.34]])];
  if (kind === 'fish') return [line([[-.5,0],[-.34,-.21],[-.06,-.3],[.21,-.19],[.33,-.07],[.5,-.28],[.46,0],[.5,.28],[.3,.09],[.07,.28],[-.2,.26],[-.4,.12],[-.5,0]]), line([[-.27,-.17],[-.2,0],[-.27,.18]]), line([[-.36,-.035],[-.33,-.035]])];
  if (kind === 'mountain') return [line([[-.5,.32],[-.25,-.2],[-.1,.04],[.12,-.42],[.5,.32],[-.5,.32]]), line([[-.14,.09],[.01,-.03],[.12,.12],[.26,-.02]])];
  if (kind === 'spiral') return [Array.from({ length: 45 }, (_, index) => { const angle = index / 44 * Math.PI * 3.3; const radius = .46 - index / 44 * .40; return point(radius * Math.cos(angle), radius * Math.sin(angle)); })];
  throw new Error('未知的纹样部件。');
}

export function validateMotifs(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MOTIFS) throw new Error('请保留 1 至 12 个纹样部件。');
  for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) throw new Error('纹样部件无法恢复。');
  const ids = new Set();
  return value.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(item.id) || ids.has(item.id)
      || !Object.hasOwn(MOTIFS, item.kind) || typeof item.mirror !== 'boolean') throw new Error('纹样部件无法恢复。');
    ids.add(item.id);
    for (const [key, low, high] of [['x',-.4,.4],['y',-.4,.4],['rotation',-180,180],['scale',.35,2]]) {
      if (!Number.isFinite(item[key]) || item[key] < low || item[key] > high) throw new Error('纹样位置超出玉稿。');
    }
    return Object.fromEntries(['id','kind','x','y','rotation','scale','mirror'].map(key => [key, item[key]]));
  });
}

export function transformedMotifPaths(item) {
  const angle = item.rotation * Math.PI / 180, scale = .24 * item.scale;
  return motifPaths(item.kind).map(path => path.map(p => {
    const x = p.x * (item.mirror ? -1 : 1) * scale, y = p.y * scale;
    return { x: item.x + x * Math.cos(angle) - y * Math.sin(angle), y: item.y + x * Math.sin(angle) + y * Math.cos(angle) };
  }));
}

export function compositionPaths(items) { return items.flatMap(transformedMotifPaths); }

export function firstMotif(kind, shape, id = 'm1') {
  return { id, kind, x: shape === 'bi' ? .23 : shape === 'fish' ? -.07 : 0,
    y: 0, rotation: 0, scale: shape === 'bi' ? .6 : 1, mirror: false };
}
