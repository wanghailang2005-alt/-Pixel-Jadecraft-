import './collection.css';
import { drawArtisanPiece } from './piece-renderer.js';
import { getCraftSurface } from './craft-model.js';
import { evaluateExhibition, evaluateCommission } from './commissions.js';
import { mountStoryCuration } from './story-view.js';
import { MOTIFS } from './motifs.js';
import { downloadBlob } from './export.js';

const SHAPES = { bi: '玉璧', fish: '玉鱼佩', seal: '玉印' };
const MATERIALS = { nephrite: '和田玉', jadeite: '翡翠' };
const PATTERNS = { cloud: '云纹', dragon: '龙纹', grain: '谷纹' };
const COLORS = { natural: '本色', celadon: '青碧', emerald: '翠绿' };
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const pieceName = piece => `${MATERIALS[piece.material] ?? '玉材'} · ${SHAPES[piece.shape] ?? '玉器'}`;
// A composed design keeps a legacy pattern key for save compatibility. Show
// its actual design components instead of presenting that key as the artwork.
const patternLabel = piece => piece.artisan?.motifs?.length
  ? `组合玉稿 · ${[...new Set(piece.artisan.motifs.map(motif => MOTIFS[motif.kind].name))].join('、')}`
  : PATTERNS[piece.pattern] ?? '云纹';
const options = (entries, selected) => Object.entries(entries).map(([id, label]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`).join('');

function piecePath(context, shape) {
  context.beginPath();
  if (shape === 'fish') {
    for (const [index, point] of [[116, 212], [160, 145], [260, 142], [305, 190], [365, 145], [365, 280], [305, 235], [260, 285], [160, 280]].entries()) {
      if (index === 0) context.moveTo(...point);
      else context.lineTo(...point);
    }
    context.closePath();
  } else if (shape === 'seal') {
    context.rect(145, 215, 190, 85);
    context.moveTo(185, 215); context.lineTo(185, 150); context.lineTo(240, 115);
    context.lineTo(295, 150); context.lineTo(295, 215); context.closePath();
  } else {
    context.arc(240, 212, 104, 0, Math.PI * 2);
    context.moveTo(275, 212); context.arc(240, 212, 35, 0, Math.PI * 2);
  }
}

// Concept 06's lantern, night window and physical display table, drawn without
// a fixed specimen: the only jade on the table is the player's stored surface.
function drawCollectionWorkbench(context) {
  const rect = (x, y, w, h, color) => { context.fillStyle = color; context.fillRect(x, y, w, h); };
  const polygon = (points, color) => {
    context.fillStyle = color; context.beginPath();
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath(); context.fill();
  };
  rect(0, 0, 480, 480, '#4c3b2e');
  // Plaster wall and dark timber posts.
  rect(12, 12, 456, 308, '#8c7855');
  for (let y = 68; y < 310; y += 43) for (let x = 16 + y % 29; x < 460; x += 71) rect(x, y, 24, 2, '#7d694b');
  for (const x of [16, 438]) {
    rect(x, 12, 26, 337, '#483022'); rect(x + 4, 12, 5, 335, '#a47749'); rect(x + 13, 12, 3, 335, '#67472e');
  }
  rect(160, 58, 204, 138, '#39291f'); rect(168, 66, 188, 122, '#1a3040');
  rect(172, 70, 180, 59, '#172837');
  for (const [x, y] of [[185, 81], [214, 97], [245, 79], [299, 90], [330, 76], [340, 112]]) rect(x, y, 2, 2, '#b2b9a0');
  rect(301, 72, 15, 15, '#d6cda7'); rect(307, 70, 12, 14, '#172837');
  polygon([[172, 153], [194, 130], [223, 144], [251, 112], [281, 138], [318, 117], [352, 144], [352, 187], [172, 187]], '#37504d');
  polygon([[172, 174], [206, 153], [241, 173], [269, 144], [308, 171], [338, 151], [352, 161], [352, 187], [172, 187]], '#536657');
  rect(166, 184, 191, 8, '#b3915a'); rect(171, 184, 181, 2, '#d0b179');
  rect(258, 66, 6, 120, '#5f422d'); rect(168, 121, 188, 5, '#5f422d');
  // Rolled papers and a hanging scroll flank the window.
  rect(73, 64, 52, 105, '#443523'); rect(78, 68, 42, 96, '#ddc28d');
  rect(70, 63, 59, 5, '#ab7b49'); rect(70, 162, 59, 5, '#ab7b49');
  context.font = '24px "Fusion Pixel", sans-serif'; context.fillStyle = '#496249'; context.textAlign = 'center';
  context.fillText('心', 99, 105); context.fillText('意', 99, 136);
  // Stone floor under the table.
  rect(0, 320, 480, 160, '#363a30');
  for (let y = 327; y < 480; y += 32) {
    rect(0, y, 480, 2, '#72735b');
    for (let x = (y % 64 ? -24 : 20); x < 480; x += 84) { rect(x, y + 3, 2, 29, '#555b49'); rect(x + 3, y + 3, 65, 1, '#252c25'); }
  }
  // Legs, apron, warm tabletop and wood grain.
  polygon([[66, 343], [91, 348], [86, 444], [63, 444]], '#422a1d');
  polygon([[389, 348], [414, 343], [419, 444], [396, 444]], '#422a1d');
  rect(69, 370, 5, 66, '#9a663b'); rect(403, 370, 5, 66, '#9a663b');
  polygon([[46, 346], [432, 346], [426, 376], [52, 376]], '#5e3a24');
  polygon([[77, 250], [398, 250], [438, 347], [35, 347]], '#5a3823');
  polygon([[83, 257], [391, 257], [426, 337], [49, 337]], '#ac7540');
  polygon([[91, 262], [388, 262], [416, 329], [60, 329]], '#986236');
  for (const [x, y, w] of [[100, 273, 95], [214, 267, 128], [76, 309, 77], [302, 313, 91], [169, 322, 119]]) {
    rect(x, y, w, 2, '#bc8a4a'); rect(x + 13, y + 4, Math.floor(w * .55), 1, '#704a2e');
  }
  rect(49, 338, 377, 4, '#d4a364'); rect(52, 348, 374, 3, '#bf8951');
  // Lamp, with squared glow steps and an opaque amber glass body.
  rect(54, 166, 79, 112, '#b9894c22'); rect(65, 175, 57, 92, '#e0ab6033');
  rect(74, 201, 40, 60, '#4d3021'); rect(81, 206, 27, 49, '#df993e');
  rect(87, 211, 15, 38, '#ffe8a1'); rect(89, 216, 10, 28, '#fff1bc');
  polygon([[70, 201], [96, 187], [119, 201]], '#563422'); rect(70, 201, 49, 5, '#ad7943');
  rect(72, 260, 46, 6, '#543322'); rect(77, 267, 36, 4, '#c18c4b');
  // A stick of incense stays outside the jade display area.
  rect(384, 290, 29, 6, '#4a3225'); rect(389, 283, 19, 8, '#9d8051');
  rect(397, 235, 2, 50, '#58341e'); rect(397, 233, 2, 3, '#e1b473');
  for (const [x, y, w] of [[395, 222, 5], [399, 213, 7], [396, 204, 6]]) rect(x, y, w, 4, '#c7c5aa88');
  // Low display cradle aligns with the actual jade's lower edge.
  polygon([[135, 326], [343, 326], [352, 340], [127, 340]], '#352a20');
  rect(140, 322, 199, 6, '#695034'); rect(144, 322, 191, 2, '#ba985f');
  // Writing plaque and lower paper for the saved blessing.
  rect(54, 16, 373, 39, '#4e3424'); rect(58, 20, 365, 31, '#1e372b');
  rect(57, 19, 367, 2, '#b58b52'); rect(57, 51, 367, 2, '#b58b52');
  rect(103, 354, 274, 23, '#2b241a'); rect(107, 357, 266, 1, '#a58550');
  rect(58, 385, 365, 70, '#e0c38d'); rect(58, 385, 365, 3, '#f1dba7'); rect(58, 453, 365, 3, '#b29361');
  for (const x of [51, 423]) { rect(x, 383, 7, 74, '#755033'); rect(x + 1, 384, 3, 72, '#bd945d'); }
}

/** Draws the stored surface. Only the customization view uses the room setting. */
export function drawCollectionPiece(canvas, piece, { artifactOnly = false, presentation = 'card' } = {}) {
  const context = canvas.getContext('2d');
  canvas.width = canvas.height = 480;
  context.imageSmoothingEnabled = false;
  const workbench = presentation === 'workbench' && !artifactOnly;
  if (workbench) drawCollectionWorkbench(context);
  else if (!artifactOnly) {
    context.fillStyle = '#11291f'; context.fillRect(0, 0, 480, 480);
    context.strokeStyle = '#ad8950'; context.lineWidth = 4;
    context.strokeRect(12, 12, 456, 456);
    context.strokeStyle = '#665331'; context.lineWidth = 2;
    context.strokeRect(20, 20, 440, 440);
    for (const x of [25, 435]) for (const y of [25, 435]) {
      context.fillStyle = '#b59760'; context.fillRect(x, y, 20, 4); context.fillRect(x, y, 4, 20);
    }
  }
  if (piece.artisan) {
    let position = { x: 70, y: 70, size: 340 };
    if (workbench) {
      const surface = getCraftSurface(piece.artisan), n = surface.size;
      let left=n, right=0, top=n, bottom=0;
      surface.base.forEach((value,index) => { if(value){const x=index%n,y=Math.floor(index/n);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);} });
      const size = Math.min(270 * n / Math.max(1, right-left+1), 220 * n / Math.max(1, bottom-top+1));
      position = { x:240-(left+right+1)*size/n/2, y:322-(bottom+1)*size/n, size };
    }
    drawArtisanPiece(context,piece.artisan,{...position,light:piece.displayLight??-.65});
  } else {
  const natural = piece.material === 'nephrite' ? ['#c0d3a7', '#8ba97d', '#516e4f'] : ['#8ad3a1', '#389970', '#1d6149'];
  const palette = piece.color === 'celadon' ? ['#c0e0cf', '#70b3a0', '#396e63']
    : piece.color === 'emerald' ? ['#90dda5', '#29956b', '#17513c'] : natural;
  context.save();
  piecePath(context, piece.shape); context.fillStyle = palette[1]; context.fill('evenodd');
  context.clip('evenodd');
  for (let y = 100; y < 320; y += 4) {
    for (let x = 100; x < 380; x += 4) {
      const noise = (x * 17 + y * 23 + x * y) % 37;
      context.fillStyle = noise < 5 ? palette[0] : noise > 31 ? palette[2] : palette[1];
      context.fillRect(x, y, 4, 4);
    }
  }
  context.strokeStyle = palette[0]; context.lineWidth = 4;
  if (piece.pattern === 'grain') {
    for (let y = 140; y < 300; y += 24) for (let x = 140; x < 340; x += 24) context.strokeRect(x, y, 8, 8);
  } else if (piece.pattern === 'dragon') {
    context.beginPath();
    const points = [[272, 138], [205, 140], [167, 182], [170, 250], [218, 284], [285, 267], [309, 223], [289, 186], [253, 177], [214, 190], [209, 230], [243, 247], [266, 228]];
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.stroke(); context.fillStyle = palette[0]; context.fillRect(270, 132, 18, 13);
    context.fillStyle = palette[2]; context.fillRect(279, 136, 4, 4);
  } else {
    for (let y = 142; y < 300; y += 48) for (let x = 140; x < 340; x += 48) {
      context.beginPath(); context.moveTo(x, y + 12); context.lineTo(x, y);
      context.lineTo(x + 24, y); context.lineTo(x + 24, y + 22);
      context.lineTo(x + 8, y + 22); context.lineTo(x + 8, y + 12); context.stroke();
    }
  }
  context.restore();
  piecePath(context, piece.shape); context.strokeStyle = palette[2]; context.lineWidth = 4; context.stroke();
  if (piece.shape === 'fish') {
    context.fillStyle = '#16372b'; context.fillRect(165, 184, 9, 9);
  }
  }
  if (artifactOnly) return;
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = '24px "Fusion Pixel", sans-serif';
  context.fillStyle = '#e8d6ad'; context.fillText(pieceName(piece), 240, workbench ? 36 : 65);
  context.font = '12px "Fusion Pixel", sans-serif';
  context.fillStyle = '#b5cba5';
  context.fillText(`${patternLabel(piece)} · ${COLORS[piece.color] ?? '本色'}`, 240, workbench ? 367 : 346);
  const blessing = [...(piece.blessing ?? '')];
  context.font = '24px "Fusion Pixel", sans-serif'; context.fillStyle = workbench ? '#513b28' : '#e8d6ad';
  context.fillText(blessing.slice(0, 12).join(''), 240, workbench ? 407 : 386);
  context.fillText(blessing.slice(12, 24).join(''), 240, workbench ? 436 : 418);
  context.font = '12px "Fusion Pixel", sans-serif'; context.fillStyle = '#a98e61';
  context.fillText('PIXEL JADECRAFT · 像素琢玉', 240, workbench ? 469 : 451);
}

/**
 * Render the fixed-size collectible memorial card. The on-screen workbench
 * remains interactive and keeps its DOM labels; this canvas is the deliberate
 * export surface, so the downloaded PNG carries the night window, material,
 * process, blessing and exhibit caption in one stable composition.
 */
export function drawMemorialCard(canvas, piece) {
  const width = 720, height = 520;
  canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  const rect = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  const line = (x1, y1, x2, y2, color, thickness = 2) => { c.fillStyle = color; c.fillRect(x1, y1, x2 - x1, thickness); };
  const text = (value, x, y, size, color, align = 'left') => {
    c.font = `${size}px "Fusion Pixel", serif`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'top'; c.fillText(value, x, y);
  };
  const finish = piece.artisan?.finish === 'satin' ? '温润柔光' : '局部亮面';
  const blessing = [...(piece.blessing ?? '')].slice(0, 24);

  rect(0, 0, width, height, '#10231e');
  rect(12, 12, width - 24, height - 24, '#d9bd83');
  rect(18, 18, width - 36, height - 36, '#4b3023');
  rect(24, 24, width - 48, height - 48, '#203d31');
  // Pixel cloud corners and a restrained key-fret border.
  for (const [x, y] of [[30, 30], [width - 50, 30], [30, height - 50], [width - 50, height - 50]]) {
    rect(x, y, 20, 4, '#b99156'); rect(x, y, 4, 20, '#b99156'); rect(x + 8, y + 8, 8, 4, '#6a4930');
  }
  for (let x = 52; x < width - 52; x += 28) { rect(x, 34, 12, 2, '#8b6b43'); rect(x, height - 38, 12, 2, '#8b6b43'); }
  // A stepped meander keeps the export legible at thumbnail size.
  for (let x = 54; x < width - 58; x += 20) {
    rect(x, 42, 8, 2, '#c39a5d'); rect(x + 8, 42, 2, 8, '#c39a5d');
    rect(x + 10, 48, 8, 2, '#6e4d32'); rect(x + 18, 42, 2, 8, '#6e4d32');
  }

  // Night window, moonlit mountains and the warm lantern collision.
  rect(42, 76, 382, 218, '#2c211c'); rect(50, 84, 366, 202, '#132c3b');
  rect(62, 96, 342, 178, '#1a3d4a');
  rect(96, 110, 22, 22, '#e7d99d'); rect(104, 106, 14, 6, '#1a3d4a');
  const mountain = (points, color) => { c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  mountain([[62, 260], [116, 196], [152, 230], [204, 164], [246, 216], [306, 146], [404, 242], [404, 274], [62, 274]], '#264a4a');
  mountain([[62, 266], [154, 224], [208, 248], [272, 200], [340, 236], [404, 212], [404, 274], [62, 274]], '#3d6255');
  line(50, 84, 416, 84, '#c59a5b', 4); line(50, 282, 416, 282, '#8f6a40', 4);
  for (const x of [50, 408]) { rect(x, 84, 8, 202, '#7c5534'); rect(x + 4, 88, 3, 194, '#bc8e52'); }
  // Warm lantern and stepped glow.
  rect(68, 142, 64, 76, '#7e532f'); rect(76, 150, 48, 60, '#d58e39'); rect(88, 158, 24, 44, '#ffe2a0');
  rect(58, 132, 84, 4, '#b77d43'); rect(64, 218, 72, 5, '#5a3926');
  rect(52, 138, 4, 68, '#6d4a2e'); rect(140, 138, 4, 68, '#6d4a2e');
  // Incense smoke is intentionally sparse, so the card keeps breathing room.
  for (const [x, y, w] of [[362, 172, 7], [368, 157, 10], [362, 142, 8], [371, 127, 6]]) rect(x, y, w, 4, '#b5bea0');

  // Redwood seat and the actual carved surface.
  rect(52, 308, 366, 136, '#452a1f'); rect(60, 318, 350, 112, '#a2693b');
  for (const [x, y, w] of [[74, 336, 112], [210, 326, 156], [92, 376, 88], [228, 390, 126]]) { line(x, y, x + w, y, '#c08a4e'); line(x + 12, y + 7, x + Math.floor(w * .7), y + 7, '#734728', 1); }
  rect(66, 430, 338, 8, '#d29a59');
  if (piece.artisan) drawArtisanPiece(c, piece.artisan, { x: 126, y: 274, size: 210, light: -.2 });
  else {
    const artifact = document.createElement('canvas');
    drawCollectionPiece(artifact, piece, { artifactOnly: true });
    c.drawImage(artifact, 126, 274, 210, 210);
  }

  // Parchment plaque: labels are part of the exported keepsake, not the game canvas UI.
  rect(442, 76, 230, 368, '#ead2a2'); rect(450, 84, 214, 352, '#f2ddb0');
  c.strokeStyle = '#9a6f42'; c.lineWidth = 3; c.strokeRect(450, 84, 214, 352);
  text('一器一心意', 557, 102, 24, '#563522', 'center'); line(474, 138, 640, 138, '#b38a53', 2);
  text('材质', 474, 158, 14, '#805a37'); text(`${MATERIALS[piece.material] ?? '玉材'} · ${SHAPES[piece.shape] ?? '玉器'}`, 474, 181, 17, '#493323');
  text('工艺', 474, 218, 14, '#805a37'); text(`${finish} · 三阶段手作`, 474, 241, 17, '#493323');
  text('纹样', 474, 278, 14, '#805a37'); text(patternLabel(piece), 474, 301, 15, '#493323');
  text('落款', 474, 338, 14, '#805a37');
  text(blessing.slice(0, 12).join('') || '（未落款）', 474, 361, 17, '#493323');
  if (blessing.length > 12) text(blessing.slice(12).join(''), 474, 384, 17, '#493323');
  // The seal is an export mark derived from the stored seal workflow, never a
  // decorative replacement for the real carved surface.
  const sealX = 614, sealY = 392, sealColor = piece.artisan?.sealCut === 'relief' ? '#b0473e' : '#8d3e38';
  rect(sealX, sealY, 36, 36, sealColor); rect(sealX + 4, sealY + 4, 28, 28, '#e7c38f');
  rect(sealX + 8, sealY + 8, 20, 4, sealColor); rect(sealX + 8, sealY + 8, 4, 20, sealColor);
  rect(sealX + 20, sealY + 16, 8, 4, sealColor); rect(sealX + 16, sealY + 20, 4, 8, sealColor);
  text('像素琢玉 · 实作纪念', 557, 414, 12, '#765333', 'center');
  return { width, height };
}

export function createCollectionView({ store, show, button, notify = () => {}, onRework = () => {}, onSeal = () => {} }) {
  let selectedId = null;

  function empty(title, text) {
    show(title, `<div class="collection-view collection-empty"><h3>等待第一件作品</h3><p>${text}</p></div>`, button('返回', 'close'), true);
  }
  function customize() {
    const pieces = store.state.pieces;
    if (!pieces.length) { empty('玉器定制', '先在工坊完成一件玉器，再来挑选纹样、配色和祝福语。'); return; }
    const piece = pieces.find(item => item.id === selectedId) ?? pieces[pieces.length - 1];
    selectedId = piece.id;
    const draft = { ...piece, pattern: piece.pattern ?? 'cloud', color: piece.color ?? 'natural', blessing: piece.blessing ?? '' };
    show('一器一心意', `<div class="collection-view collection-customize"><section class="collection-controls"><label for="collection-piece">选择成品</label><select id="collection-piece">${pieces.map(item => `<option value="${escape(item.id)}" ${item.id === piece.id ? 'selected' : ''}>${pieceName(item)}</option>`).join('')}</select><label for="collection-pattern">纹样</label><select id="collection-pattern">${options(PATTERNS, draft.pattern)}</select><label for="collection-color">配色</label><select id="collection-color">${options(COLORS, draft.color)}</select><label for="collection-blessing">祝福语 <span data-collection-count></span></label><input id="collection-blessing" type="text" autocomplete="off" aria-describedby="collection-blessing-hint"><p id="collection-blessing-hint">最多 24 个字，随作品一同保存。</p><div class="collection-actions"><button data-collection-save class="primary">保存落款与纹样</button><button data-collection-export>导出纪念卡 PNG</button></div><p class="collection-feedback" role="status" aria-live="polite"></p></section><section class="collection-preview"><canvas width="480" height="480" aria-label="玉器定制预览"></canvas><div class="collection-ambient-smoke" aria-hidden="true"><i></i><i></i><i></i></div><p>选择纹样与玉色，为作品留下一句心意。</p></section></div>`, button('返回工坊', 'close'), true);
    const root = document.querySelector('dialog .collection-view');
    const canvas = root.querySelector('canvas');
    const blessingInput = root.querySelector('#collection-blessing');
    blessingInput.value = draft.blessing;
    const feedback = root.querySelector('.collection-feedback');
    if (piece.artisan) {
      const patternSelect = root.querySelector('#collection-pattern');
      patternSelect.innerHTML = options({ [draft.pattern]: patternLabel(piece) }, draft.pattern);
      patternSelect.disabled=true;
      root.querySelector('#collection-color').disabled=true;
      root.querySelector('.collection-preview p').textContent='天然色带、亲手刻线与局部光泽已保留。改变器型或纹样请返工。';
      feedback.textContent=evaluateCommission(piece,store.state).find(item=>item.fulfilled)?.feedback ?? '这件玉里保留了你的每一笔。';
    }
    const rework=document.createElement('div');rework.className='collection-rework';
    rework.innerHTML=`<label for="rework-shape">重新设计器型</label><select id="rework-shape">${options(SHAPES,piece.shape)}</select><button data-rework>保存原作，开始返工</button><small>返工期间原作会暂时撤展。取消返工可恢复原作。</small>`;
    root.querySelector('.collection-controls').append(rework);
    if(piece.shape==='seal'&&piece.artisan?.completed){const print=document.createElement('button');print.textContent='取出玉印，试印成谱';print.dataset.collectionSeal='';print.onclick=()=>onSeal(piece);rework.before(print);}
    rework.querySelector('[data-rework]').onclick=()=>onRework(piece.id,rework.querySelector('select').value);
    function preview() {
      draft.pattern = root.querySelector('#collection-pattern').value;
      draft.color = root.querySelector('#collection-color').value;
      draft.blessing = blessingInput.value;
      const count = [...draft.blessing].length;
      root.querySelector('[data-collection-count]').textContent = `${count}/24`;
      root.querySelector('[data-collection-save]').disabled = count > 24;
      root.querySelector('[data-collection-export]').disabled = count > 24;
      blessingInput.setAttribute('aria-invalid', String(count > 24));
      feedback.textContent = count > 24 ? '祝福语超过 24 个字，请缩短后保存。' : piece.artisan ? evaluateCommission(piece,store.state).find(item=>item.fulfilled)?.feedback ?? '这件玉里保留了你的每一笔。' : '';
      drawCollectionPiece(canvas, draft, { presentation: 'workbench' });
    }
    root.querySelector('#collection-piece').onchange = event => { selectedId = event.target.value; customize(); };
    root.querySelector('#collection-pattern').onchange = preview;
    root.querySelector('#collection-color').onchange = preview;
    blessingInput.oninput = preview;
    root.querySelector('[data-collection-save]').onclick = () => {
      const ok = store.customizePiece(piece.id, { pattern: draft.pattern, color: draft.color, blessing: draft.blessing });
      feedback.textContent = ok ? store.dirty ? '定制暂留本次游戏，请导出存档备份。' : piece.artisan ? '落款已保存，刻痕与本色保持在作品中。' : '纹样、配色与祝福语已保存。' : '定制未能保存，请确认当前仍在工坊。';
      if (ok) notify('玉器定制已更新。');
    };
    root.querySelector('[data-collection-export]').onclick = () => {
      // The room is a display setting; exports use the fixed night-window
      // memorial card so the PNG carries the actual artifact and its labels.
      const exportCanvas = document.createElement('canvas');
      drawMemorialCard(exportCanvas, draft);
      try {
        exportCanvas.toBlob(blob => {
          const ok = downloadBlob(blob, `像素琢玉_${SHAPES[piece.shape] ?? '玉器'}.png`);
          feedback.textContent = ok ? 'PNG 已生成，已请求浏览器下载。' : '图片未能生成，请重试。';
        }, 'image/png');
      } catch {
        feedback.textContent = '图片未能生成，请重试。';
      }
    };
    preview();
  }

  function exhibit() {
    const pieces = store.state.pieces;
    if (!pieces.length) {
      if(store.state.story.delivery){show('旧玉故事 · 一封来信的展览','<div class="collection-view"><p>先展出旧玉的经历与来信。完成自己的作品后，还能将它们放入三个展位。</p></div>',button('回工坊创作','workshop')+button('返回展厅','close'),true);mountStoryCuration(document.querySelector('dialog .collection-view'),store);}
      else empty('展厅布置', '完成第一件玉器后，可以在这里选择三个展位，为作品布置一场小展。');
      return;
    }
    show('布置你的玉展', `<div class="collection-view"><p class="collection-exhibit-hint">将作品放入展位。同一件作品换到新展位时，会从原位置移走。</p><div class="collection-exhibits">${store.state.exhibits.map((id, index) => {
      const piece = pieces.find(item => item.id === id);
      const finish = piece?.artisan?.finish === 'satin' ? '柔光抛磨' : piece ? '局部亮面' : '尚未加工';
      return `<section class="collection-exhibit"><h3>展位 ${index + 1}</h3><canvas width="480" height="480" data-collection-slot="${index}" aria-label="展位 ${index + 1} ${piece ? pieceName(piece) : '空展位'}"></canvas><div class="collection-plaque"><strong>${piece ? pieceName(piece) : '静候一件玉器'}</strong><dl><div><dt>材质</dt><dd>${piece ? MATERIALS[piece.material] ?? '玉材' : '待选'}</dd></div><div><dt>工艺</dt><dd>${finish}</dd></div><div><dt>纹样</dt><dd>${piece ? escape(patternLabel(piece)) : '待选'}</dd></div></dl><p>${escape(piece?.blessing ?? (piece ? '尚未留下落款。' : '把完成的作品放入展位，再为它写一句话。'))}</p></div><label for="exhibit-piece-${index}">选择作品</label><select id="exhibit-piece-${index}">${pieces.map(item => `<option value="${escape(item.id)}" ${item.id === id ? 'selected' : ''}>${pieceName(item)}</option>`).join('')}</select><div class="collection-actions"><button data-collection-place="${index}" class="primary">陈列</button><button data-collection-remove="${index}" ${piece ? '' : 'disabled'}>撤展</button></div></section>`;
    }).join('')}</div><p class="collection-feedback" role="status" aria-live="polite"></p></div>`, button('返回展厅', 'close'), true);
    const root = document.querySelector('dialog .collection-view');
    const curation=document.createElement('section');curation.className='collection-curation';
    const exhibition=evaluateExhibition(store.state);
    curation.innerHTML=`<h3>${escape(exhibition.title)}</h3><div class="collection-curation-controls"><label>这次讲什么<select data-theme>${options({craft:'因材成器',nature:'山水自然',journey:'学徒的旅程'},store.state.museum.theme)}</select></label><label>展柜灯光<select data-light>${options({warm:'暖光',side:'侧光见层次',moon:'月色柔光'},store.state.museum.lighting)}</select></label></div><p>${escape(exhibition.summary)}</p>${exhibition.observations.map(text=>`<p>${escape(text)}</p>`).join('')}`;
    root.prepend(curation);
    mountStoryCuration(root,store);
    for(const input of curation.querySelectorAll('select')) input.onchange=()=>{store.configureExhibition(curation.querySelector('[data-theme]').value,curation.querySelector('[data-light]').value);exhibit();};
    root.querySelectorAll('[data-collection-slot]').forEach(canvas => {
      const piece = pieces.find(item => item.id === store.state.exhibits[Number(canvas.dataset.collectionSlot)]);
      if (piece) drawCollectionPiece(canvas, {...piece,displayLight:store.state.museum.lighting==='side'?1:store.state.museum.lighting==='moon'?.15:-.65}, { artifactOnly: true });
      else {
        const context = canvas.getContext('2d');
        context.fillStyle = '#172c25'; context.fillRect(0, 0, 480, 480);
        context.strokeStyle = '#876f46'; context.lineWidth = 4; context.strokeRect(45, 45, 390, 390);
        context.strokeStyle = '#456451'; context.lineWidth = 3;
        context.strokeRect(192, 192, 96, 96);
      }
    });
    function place(index, id) {
      if (store.placeExhibit(index, id)) {
        exhibit();
        const message = store.dirty ? '陈列暂留本次游戏，请导出存档备份。' : id === null ? '作品已撤下。' : '作品已陈列。';
        document.querySelector('dialog .collection-feedback').textContent = message;
        notify(message);
      } else root.querySelector('.collection-feedback').textContent = '未能更新展位，请确认当前仍在展厅。';
    }
    root.querySelectorAll('[data-collection-place]').forEach(control => control.onclick = () => {
      const index = Number(control.dataset.collectionPlace);
      place(index, root.querySelector(`#exhibit-piece-${index}`).value);
    });
    root.querySelectorAll('[data-collection-remove]').forEach(control => control.onclick = () => place(Number(control.dataset.collectionRemove), null));
  }

  return { customize, exhibit };
}
