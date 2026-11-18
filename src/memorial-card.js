export const MEMORIAL_FINISH_NAMES = Object.freeze({ satin: '温润柔光', contrast: '凝光点睛' });

/** Stable layout data for the exported keepsake, including a bounded seal area. */
export function memorialCardLayout(piece) {
  const blessing = [...(piece?.blessing ?? '')].slice(0, 24);
  const blessingLines = [];
  for (let index = 0; index < blessing.length; index += 6) blessingLines.push(blessing.slice(index, index + 6).join(''));
  return Object.freeze({
    finish: MEMORIAL_FINISH_NAMES[piece?.artisan?.finish] ?? '凝光点睛',
    blessingLines: Object.freeze(blessingLines),
    blessingLineHeight: 15,
    footerTop: blessingLines.length > 3 ? 424 : 414,
    seal: Object.freeze({ size: blessing.length > 12 ? 34 : 40, right: 12, top: 352 }),
  });
}
