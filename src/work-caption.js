import { getCraftSurface } from './craft-model.js';
import { MOTIFS } from './motifs.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';
import { carvedMotifKinds, returnLetter } from './story.js';

export function workCaption(piece, story) {
  if (!piece) return [];
  const lines = [];
  const exhibit = MUSEUM_EXHIBITS.find(item => item.id === piece.inspirationId);
  if (exhibit) lines.push(`这件作品从《${exhibit.title}》取意，参考了「${exhibit.technique.name}」的做法。`);

  if (piece.artisan?.completed) {
    const { size, base, colorBand } = getCraftSurface(piece.artisan);
    const jadeRows = [], bandRows = [];
    base.forEach((retained, index) => {
      if (!retained) return;
      const row = Math.floor(index / size);
      jadeRows.push(row);
      if (colorBand[index]) bandRows.push(row);
    });
    if (bandRows.length) {
      const top = jadeRows[0], height = jadeRows.at(-1) - top + 1;
      const thirds = ['上部', '中部', '下部'];
      const position = row => thirds[Math.floor((row - top) * 3 / height)];
      const start = position(bandRows[0]), end = position(bandRows.at(-1));
      const area = bandRows.length / jadeRows.length * 100;
      const band = piece.artisan.material.variety ? '天然色带' : '浅色带';
      lines.push(`保留了${start === end ? `器身${start}` : `器身从${start}到${end}`}的${band}，约占保留玉面${area < 1 ? '不到 1%' : `的 ${Math.round(area)}%`}。`);
    }
    const motifs = [...new Set(carvedMotifKinds(piece.artisan))];
    if (motifs.length) lines.push(`玉面实际刻下了${motifs.map(kind => MOTIFS[kind].name).join('、')}。`);
  }

  if (story?.returned && story.delivery?.route === 'companion' && story.delivery.pieceId === piece.id) {
    lines.push(returnLetter(story));
  }
  return lines;
}
