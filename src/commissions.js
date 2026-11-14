import { getCraftSurface, stageMetrics, validateDraft } from './craft-model.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';

// Fictional commissions invite different visible choices; none claims to assess
// an object's historical authenticity or assigns a hidden artistic score.
export const CREATIVE_COMMISSIONS = Object.freeze([
  {
    id: 'moon-gift', title: '一轮温润的月', shape: 'bi',
    story: '远行的女儿想送母亲一枚玉璧。她记得家里窗前安静的月光，希望掌心的玉也有那种柔和。',
    goal: '做一枚玉璧，刻出纹线和浅浮雕，留下至少38%的柔光面与少量亮面；从温润玉材或古玉璧中取意。',
    inspirationIds: ['material-nephrite', 'heritage-liangzhu-bi'],
  },
  {
    id: 'river-fish', title: '把一条河带回家', shape: 'fish',
    story: '渡口的孩子要搬去远方。他请你做一条小鱼，让一抹闪动的光留住故乡水面的记忆。',
    goal: '做一条游鱼，用纹线和浅浮雕分出层次，亮面占7%—55%、柔光面至少22%；从俏色或自然形象中取意。',
    inspirationIds: ['material-jadeite', 'material-dushan', 'heritage-jadeite-cabbage', 'heritage-crowned-phoenix'],
  },
  {
    id: 'mountain-seal', title: '掌心有山川', shape: 'seal',
    story: '记录山路的旅人想做一方小印。每当落印，他希望还能想起山脊、溪谷，以及一路遇见的人。',
    goal: '做一方印章，以刻纹配合至少12%的降低背景形成浮雕，保留亮暗差别；从山景、玉琮或云龙插屏中取意。',
    inspirationIds: ['heritage-cong-king', 'heritage-yu-mountain', 'master-daiyue', 'master-sihai'],
  },
]);

const pct = value => `${Math.round(value * 100)}%`;
const shapeNames = { bi: '玉璧', fish: '游鱼', seal: '印章' };

function measuredWork(piece) {
  if (!piece?.artisan?.completed) return null;
  try {
    const artisan = validateDraft(piece.artisan);
    if (piece.shape !== artisan.shape || piece.material !== artisan.material.material) return null;
    return { artisan, metrics: stageMetrics(artisan) };
  } catch {
    return null;
  }
}

function recordedInspiration(piece, state) {
  const id = piece?.inspirationId;
  if (!id || !state?.museum?.inspirations?.includes(id)) return null;
  const exhibit = MUSEUM_EXHIBITS.find(item => item.id === id);
  const observations = state?.museum?.observations?.[id];
  if (!exhibit || !Array.isArray(observations)
    || !observations.some(index => Number.isInteger(index) && index >= 0 && index < exhibit.lookFor.length)) return null;
  return exhibit;
}

/** Returns each brief's state so the UI can show both fulfilled and pending work. */
export function evaluateCommission(piece, storeState) {
  const work = measuredWork(piece);
  const inspiration = recordedInspiration(piece, storeState);
  return CREATIVE_COMMISSIONS.map(commission => {
    const missing = [];
    if (piece?.shape !== commission.shape) missing.push(`选择${shapeNames[commission.shape]}器形`);
    if (!work) {
      missing.push('在工作台完成可保留刀痕的塑形、雕纹和抛光');
    } else {
      const { metrics } = work;
      if (metrics.guideCoverage < .48 || metrics.precision < .55) missing.push('沿纹样完成清晰刻线');
      if (metrics.relief < (commission.id === 'mountain-seal' ? .12 : .055)) missing.push(commission.id === 'mountain-seal'
        ? '扩大降低背景的范围，让浮雕覆盖至少12%的玉面' : '磨低纹线周围的一部分背景，做出浅浮雕');
      if (commission.id === 'moon-gift') {
        if (metrics.matte < .38 || metrics.gloss < .015 || metrics.gloss > .30) missing.push('保留至少38%柔光面，只抛亮约2%—30%的玉面');
      } else if (metrics.matte < .22 || metrics.gloss < .065 || metrics.gloss > .55) {
        missing.push('保留至少22%柔光面，并将约7%—55%的玉面抛亮');
      }
    }
    if (!inspiration || !commission.inspirationIds.includes(inspiration.id)) {
      const names = commission.inspirationIds.map(id => MUSEUM_EXHIBITS.find(item => item.id === id)?.title).filter(Boolean);
      missing.push(`观察并收藏相关灵感，再带入工作台（如《${names[0]}》）`);
    }
    const fulfilled = missing.length === 0;
    return {
      id: commission.id, title: commission.title, fulfilled,
      feedback: fulfilled
        ? `《${inspiration.title}》的灵感进入了这件${shapeNames[piece.shape]}：刻线覆盖${pct(work.metrics.guideCoverage)}，浮雕${pct(work.metrics.relief)}，亮面${pct(work.metrics.gloss)}、柔光面${pct(work.metrics.matte)}。委托心愿已完成。`
        : `还可以：${missing.join('；')}。`,
    };
  });
}

/** Exhibit commentary derives only from actually displayed pieces and observations. */
export function evaluateExhibition(state) {
  const theme = ['craft', 'nature', 'journey'].includes(state?.museum?.theme) ? state.museum.theme : 'craft';
  const titles = { craft: '刀痕与光泽', nature: '玉里有山川', journey: '从相遇到成器' };
  const byId = new Map((Array.isArray(state?.pieces) ? state.pieces : []).filter(Boolean).map(piece => [piece.id, piece]));
  const ids = [...new Set((Array.isArray(state?.exhibits) ? state.exhibits : []).filter(id => typeof id === 'string'))];
  const pieces = ids.map(id => byId.get(id)).filter(Boolean);
  if (!pieces.length) return { title: titles[theme], summary: '展台还空着。选一件自己的作品，开始讲述这场展览。', observations: [] };

  const records = pieces.map(piece => ({ piece, work: measuredWork(piece), inspiration: recordedInspiration(piece, state) }));
  const handmade = records.filter(record => record.work);
  const inspired = records.filter(record => record.inspiration);
  const observations = [];
  if (theme === 'craft') {
    for (const { piece, work } of records) {
      const name = shapeNames[piece.shape] ?? '作品';
      observations.push(work
        ? `${name}保留了刻线覆盖${pct(work.metrics.guideCoverage)}与浮雕${pct(work.metrics.relief)}；亮面${pct(work.metrics.gloss)}、柔光面${pct(work.metrics.matte)}形成表面层次。`
        : `${name}是早期作品，尚无可展示的刀痕记录；可以带回工作台重新创作。`);
    }
    if (handmade.length > 1) {
      const gloss = handmade.map(record => record.work.metrics.gloss);
      observations.push(Math.max(...gloss) - Math.min(...gloss) >= .10
        ? '作品间的亮面分布明显不同，适合并排比较你的表面处理选择。'
        : '几件作品的光泽比例接近；下一件可以尝试更安静或更明亮的处理。');
    }
  } else if (theme === 'nature') {
    for (const { piece, work, inspiration } of records) {
      const name = shapeNames[piece.shape] ?? '作品';
      if (work) {
        const surface = getCraftSurface(work.artisan);
        let target = 0, band = 0;
        surface.target.forEach((value, index) => { if (value) { target++; band += surface.colorBand[index] ? 1 : 0; } });
        observations.push(`${name}保留的天然色带约占轮廓内${pct(band / (target || 1))}；纸样转向与位置决定了色带落在哪里。`);
      } else observations.push(`${name}保留着${piece.material === 'jadeite' ? '翡翠' : piece.material === 'nephrite' ? '软玉' : '玉材'}的题材记录。`);
      if (inspiration) observations.push(`《${inspiration.title}》带来的“${inspiration.technique.name}”成为这件作品的自然线索。`);
    }
    if (new Set(pieces.map(piece => piece.material)).size > 1) observations.push('展台并置了不同玉材，可以比较材料颜色与同一器形之间的关系。');
  } else {
    for (const { piece, work, inspiration } of records) {
      const name = shapeNames[piece.shape] ?? '作品';
      observations.push(inspiration
        ? `先在《${inspiration.title}》发现细节，收藏“${inspiration.technique.name}”，再把灵感带进${name}。`
        : `${name}还没有关联展品灵感；下次创作前，去文化馆寻找一件让你停下来的作品。`);
      if (work) observations.push(`${name}留下了从选形、雕纹到抛光的完整制作记录。`);
    }
  }
  return {
    title: titles[theme],
    summary: `展出${pieces.length}件作品，${handmade.length}件保留实际刀痕，${inspired.length}件关联已观察的馆藏灵感。`,
    observations,
  };
}
