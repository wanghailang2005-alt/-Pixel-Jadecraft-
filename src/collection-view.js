import './collection.css';
import { drawArtisanPiece } from './piece-renderer.js';
import { evaluateExhibition, evaluateCommission } from './commissions.js';
import { mountStoryCuration } from './story-view.js';

const SHAPES = { bi: '玉璧', fish: '玉鱼佩', seal: '玉印' };
const MATERIALS = { nephrite: '和田玉', jadeite: '翡翠' };
const PATTERNS = { cloud: '云纹', dragon: '龙纹', grain: '谷纹' };
const COLORS = { natural: '本色', celadon: '青碧', emerald: '翠绿' };
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const pieceName = piece => `${MATERIALS[piece.material] ?? '玉材'} · ${SHAPES[piece.shape] ?? '玉器'}`;
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

/** Draws an original pixel-style export from the stored piece and its customization. */
export function drawCollectionPiece(canvas, piece, { artifactOnly = false } = {}) {
  const context = canvas.getContext('2d');
  canvas.width = canvas.height = 480;
  context.imageSmoothingEnabled = false;
  if (!artifactOnly) {
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
    drawArtisanPiece(context,piece.artisan,{x:70,y:70,size:340,light:piece.displayLight??-.65});
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
  context.fillStyle = '#e8d6ad'; context.fillText(pieceName(piece), 240, 65);
  context.font = '12px "Fusion Pixel", sans-serif';
  context.fillStyle = '#b5cba5';
  context.fillText(`${PATTERNS[piece.pattern] ?? '云纹'} · ${COLORS[piece.color] ?? '本色'}`, 240, 346);
  const blessing = [...(piece.blessing ?? '')];
  context.font = '24px "Fusion Pixel", sans-serif'; context.fillStyle = '#e8d6ad';
  context.fillText(blessing.slice(0, 12).join(''), 240, 386);
  context.fillText(blessing.slice(12, 24).join(''), 240, 418);
  context.font = '12px "Fusion Pixel", sans-serif'; context.fillStyle = '#a98e61';
  context.fillText('PIXEL JADECRAFT · 像素琢玉', 240, 451);
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
    show('一器一心意', `<div class="collection-view collection-customize"><section class="collection-controls"><label for="collection-piece">选择成品</label><select id="collection-piece">${pieces.map(item => `<option value="${escape(item.id)}" ${item.id === piece.id ? 'selected' : ''}>${pieceName(item)}</option>`).join('')}</select><label for="collection-pattern">纹样</label><select id="collection-pattern">${options(PATTERNS, draft.pattern)}</select><label for="collection-color">配色</label><select id="collection-color">${options(COLORS, draft.color)}</select><label for="collection-blessing">祝福语 <span data-collection-count></span></label><input id="collection-blessing" type="text" autocomplete="off" aria-describedby="collection-blessing-hint"><p id="collection-blessing-hint">最多 24 个字，随作品一同保存。</p><div class="collection-actions"><button data-collection-save class="primary">保存定制</button><button data-collection-export>导出当前预览</button></div><p class="collection-feedback" role="status" aria-live="polite"></p></section><section class="collection-preview"><canvas width="480" height="480" aria-label="玉器定制预览"></canvas><p>选择纹样与玉色，为作品留下一句心意。</p></section></div>`, button('返回工坊', 'close'), true);
    const root = document.querySelector('dialog .collection-view');
    const canvas = root.querySelector('canvas');
    const blessingInput = root.querySelector('#collection-blessing');
    blessingInput.value = draft.blessing;
    const feedback = root.querySelector('.collection-feedback');
    if (piece.artisan) {
      root.querySelector('#collection-pattern').disabled=true;
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
      drawCollectionPiece(canvas, draft);
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
      canvas.toBlob(blob => {
        if (!blob) { feedback.textContent = '图片未能生成，请重试。'; return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `像素琢玉_${SHAPES[piece.shape] ?? '玉器'}.png`;
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        feedback.textContent = 'PNG 已生成，已请求浏览器下载。';
      }, 'image/png');
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
      return `<section class="collection-exhibit"><h3>展位 ${index + 1}</h3><canvas width="480" height="480" data-collection-slot="${index}" aria-label="展位 ${index + 1} ${piece ? pieceName(piece) : '空展位'}"></canvas><strong>${piece ? pieceName(piece) : '等待作品'}</strong><p>${escape(piece?.blessing ?? '')}</p><label for="exhibit-piece-${index}">选择作品</label><select id="exhibit-piece-${index}">${pieces.map(item => `<option value="${escape(item.id)}" ${item.id === id ? 'selected' : ''}>${pieceName(item)}</option>`).join('')}</select><div class="collection-actions"><button data-collection-place="${index}" class="primary">陈列</button><button data-collection-remove="${index}" ${piece ? '' : 'disabled'}>撤展</button></div></section>`;
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
      if (piece) drawCollectionPiece(canvas, {...piece,displayLight:store.state.museum.lighting==='side'?1:store.state.museum.lighting==='moon'?.15:-.65});
      else {
        const context = canvas.getContext('2d');
        context.fillStyle = '#172c25'; context.fillRect(0, 0, 480, 480);
        context.strokeStyle = '#876f46'; context.lineWidth = 4; context.strokeRect(45, 45, 390, 390);
        context.textAlign = 'center'; context.fillStyle = '#8c9e83'; context.font = '24px "Fusion Pixel", sans-serif';
        context.fillText('静候一件玉器', 240, 250);
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
