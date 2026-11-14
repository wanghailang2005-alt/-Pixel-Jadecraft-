import { CODEX, icon } from './icons.js';
import './workshop-reference.css';
import { drawArtisanPiece } from './piece-renderer.js';
import workshopIconsUrl from './assets/workshop-reference/workshop-icons.png';

const workshopIcons = new Image();
workshopIcons.src = workshopIconsUrl;
const REFERENCE_ICONS = ['jade-white', 'jade-green', 'jade-black', 'magnifier', 'scales',
  'pickaxe', 'chisel', 'cloud', 'dragon', 'grain', 'raw-green', 'raw-white', 'shelf-dragon', 'shelf-fish'];

const JADE_TYPES = [
  { id: 'white', name: '和田玉', colors: ['#f2f0d1', '#d8e2b8', '#a4b38b'] },
  { id: 'green', name: '翡翠', colors: ['#9bdc85', '#4cb56b', '#237444'] },
  { id: 'black', name: '名玉档案 ↗', colors: ['#659273', '#285d43', '#102f25'] },
];
const PATTERNS = ['cloud', 'dragon', 'grain'];
const PATTERN_NAMES = { cloud: '云纹', dragon: '龙纹', grain: '谷纹' };
const TOOLS = ['magnifier', 'scales', 'pickaxe', 'chisel'];
const TOOL_NAMES = { magnifier: '观玉', scales: '行囊', pickaxe: '寻玉', chisel: '琢玉' };
const DEFAULT_DIALOGUE = [
  '琢玉之要，在于听懂玉石的心声。',
  '细看石中纹理，你想让它化作怎样的纹样？',
];

function corners() {
  return '<i class="ornate-corner corner-tl"></i><i class="ornate-corner corner-tr"></i><i class="ornate-corner corner-bl"></i><i class="ornate-corner corner-br"></i>';
}

function drawIcon(canvas, kind, jade = JADE_TYPES[1], pattern = 'dragon', revealed = 1) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  ctx.imageSmoothingEnabled = false;
  const referenceName = kind === 'jade' || kind === 'raw' ? `${kind}-${jade.id}` : kind;
  const referenceIndex = REFERENCE_ICONS.indexOf(referenceName);
  if (referenceIndex >= 0) {
    if (workshopIcons.complete && workshopIcons.naturalWidth) {
      ctx.drawImage(workshopIcons, referenceIndex % 7 * 32, Math.floor(referenceIndex / 7) * 32,
        32, 32, 0, 0, 32, 32);
      return;
    }
    workshopIcons.addEventListener('load', () => drawIcon(canvas, kind, jade, pattern, revealed), { once: true });
  }
  if (kind === 'shelf-dragon') kind = 'dragon';
  if (kind === 'shelf-fish') kind = 'bi';
  const square = (x, y, width, height, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
  if (kind === 'raw') {
    for (let y = 4; y < 30; y++) {
      const left = Math.floor(y < 13 ? 14 - y / 1.8 : 6 + (y - 13) / 4);
      const right = Math.floor(y < 13 ? 18 + y / 1.5 : 28 - (y - 13) / 7);
      for (let x = left; x <= right; x++) {
        let color = x < 17 - y / 8 ? jade.colors[0] : jade.colors[1];
        if (x === left || x === right || y >= 28) color = jade.colors[2];
        if (x === Math.floor(10 + y / 3) && y < 25) color = jade.colors[0];
        square(x, y, 1, 1, color);
      }
    }
    return;
  }
  if (kind === 'jade' || kind === 'bi') {
    for (let y = 3; y < 29; y++) {
      for (let x = 3; x < 29; x++) {
        const radius = Math.hypot(x - 15.5, y - 15.5);
        if (radius > 12.5 || (kind === 'bi' && radius < 4.5)) continue;
        const noise = (x * 23 + y * 13 + x * y * 7) % 17;
        let color = jade.colors[1];
        if (x + y < 19 || noise < 3) color = jade.colors[0];
        if (radius > 10.8 || x + y > 44) color = jade.colors[2];
        square(x, y, 1, 1, color);
      }
    }
    if (kind === 'bi') {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, Math.ceil(32 * revealed), 32); ctx.clip();
      ctx.globalAlpha = 0.75;
      if (pattern === 'grain') {
        for (let y = 7; y <= 25; y += 6) for (let x = 7; x <= 25; x += 6) if (Math.hypot(x - 16, y - 16) > 6) square(x, y, 2, 2, jade.colors[0]);
      } else {
        for (let part = 0; part < 4; part++) {
          ctx.save(); ctx.translate(16, 16); ctx.rotate(part * Math.PI / 2);
          ctx.strokeStyle = jade.colors[0]; ctx.lineWidth = 1;
          ctx.beginPath();
          if (pattern === 'cloud') { ctx.moveTo(-7, -5); ctx.lineTo(-7, -9); ctx.lineTo(-3, -9); ctx.lineTo(-3, -7); ctx.lineTo(-5, -7); }
          else { ctx.moveTo(-8, -5); ctx.lineTo(-8, -9); ctx.lineTo(-2, -9); ctx.lineTo(-2, -6); ctx.lineTo(-5, -6); }
          ctx.stroke(); ctx.restore();
        }
      }
      ctx.restore();
    }
    return;
  }
  if (PATTERNS.includes(kind)) {
    const light = '#9bbd85', dark = '#416c43';
    if (kind === 'grain') {
      for (let y = 3; y < 30; y += 7) for (let x = 3; x < 30; x += 7) { square(x, y, 5, 5, dark); square(x, y, 3, 3, light); }
    } else if (kind === 'cloud') {
      for (let y = 3; y < 30; y += 10) for (let x = 2; x < 30; x += 10) {
        square(x + 2, y, 5, 2, light); square(x, y + 2, 8, 4, light); square(x + 2, y + 6, 5, 2, light); square(x + 2, y + 3, 4, 2, '#24472c');
      }
    } else {
      const points = [[22, 3], [10, 3], [4, 9], [4, 22], [11, 28], [24, 28], [28, 20], [25, 13], [16, 12], [11, 17], [16, 23], [21, 20]];
      ctx.strokeStyle = light; ctx.lineWidth = 3; ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      square(23, 2, 7, 7, light); square(25, 4, 2, 2, '#193c25');
    }
    return;
  }
  ctx.strokeStyle = '#d5bc88'; ctx.lineWidth = 2;
  if (kind === 'magnifier') {
    ctx.fillStyle = '#83a89c'; ctx.beginPath(); ctx.arc(12, 12, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    square(18, 18, 4, 4, '#b88b55'); square(21, 22, 4, 4, '#b88b55'); square(24, 26, 3, 3, '#b88b55');
  } else if (kind === 'scales') {
    square(15, 4, 2, 23, '#d5bc88'); square(8, 27, 17, 2, '#d5bc88'); square(4, 9, 25, 2, '#d5bc88');
    for (const x of [7, 24]) { ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x - 4, 22); ctx.lineTo(x + 4, 22); ctx.closePath(); ctx.stroke(); }
  } else if (kind === 'pickaxe') {
    ctx.strokeStyle = '#a97c4c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 27); ctx.lineTo(22, 7); ctx.stroke();
    ctx.strokeStyle = '#a5aaa0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(15, 3); ctx.lineTo(27, 12); ctx.stroke();
  } else {
    square(18, 4, 6, 10, '#b48650'); square(15, 12, 5, 7, '#d0b789'); square(10, 18, 6, 7, '#afb5a5'); square(7, 25, 5, 3, '#dce0c6');
  }
}

export function createWorkshopReference({ onAction = () => {}, getState = () => null } = {}) {
  const element = document.createElement('section');
  element.className = 'reference-workshop';
  element.setAttribute('aria-label', '玉雕工坊');
  // The original HUD positions now show actual materials, works and research.
  element.innerHTML = `
    <h1 class="reference-title">玉雕工坊</h1>
    <div class="reference-motto">因材施艺</div>
    <section class="reference-panel reference-player" aria-labelledby="player-hud-title">${corners()}<h2 id="player-hud-title" class="reference-panel-title">学徒状态</h2><div class="reference-vitals"><div>原石： <b>0</b> / 12</div><div>作品： <b>0</b> 件</div><div>灵感： <b>0</b> 则</div></div><div class="reference-master-portrait master-portrait" aria-label="老师傅头像"></div><span class="reference-level">首展：0 / 3</span></section>
    <section class="reference-panel reference-inventory" aria-labelledby="inventory-title">${corners()}<h2 id="inventory-title" class="reference-panel-title">玉材与图鉴</h2><div class="reference-tabs" role="tablist" aria-label="玉材与图鉴"><button role="tab" id="jade-types-tab" data-tab="jade" aria-controls="reference-jade-list" aria-selected="true">玉材种类</button><button role="tab" id="tables-tab" data-tab="tables" aria-controls="reference-codex-list" aria-selected="false">器物图鉴</button></div><div class="reference-jade-list" id="reference-jade-list" role="tabpanel" aria-labelledby="jade-types-tab">${JADE_TYPES.map((jade, index) => `<button data-jade="${jade.id}" aria-pressed="${jade.id === 'green'}"><canvas width="32" height="32" data-bead="${jade.id}" aria-hidden="true"></canvas><span>${index + 1}. ${jade.name}</span></button>`).join('')}</div><div class="reference-codex-list" id="reference-codex-list" role="tabpanel" aria-labelledby="tables-tab" hidden>${CODEX.map(item => `<button data-codex="${item.id}" title="${item.name}">${icon(item.id)}<span>${item.name}</span></button>`).join('')}</div><div class="reference-tools" aria-label="工坊工具">${TOOLS.map(tool => `<button data-tool="${tool}" title="${TOOL_NAMES[tool]}" aria-label="${TOOL_NAMES[tool]}" aria-pressed="${tool === 'magnifier'}"><canvas width="32" height="32" data-tool-icon="${tool}" aria-hidden="true"></canvas><span>${TOOL_NAMES[tool]}</span></button>`).join('')}</div></section>
    <section class="reference-panel reference-crafting" aria-labelledby="crafting-title">${corners()}<h2 id="crafting-title" class="reference-panel-title">琢玉成器</h2><div class="reference-preview"><h3>我的玉稿</h3><canvas width="32" height="32" data-preview aria-label="当前玉稿预览"></canvas><p>玉璧</p></div><div class="reference-patterns" aria-label="雕刻纹样">${PATTERNS.map(pattern => `<button data-pattern="${pattern}" aria-pressed="${pattern === 'dragon'}"><canvas width="32" height="32" data-pattern-icon="${pattern}" aria-hidden="true"></canvas><span>${PATTERN_NAMES[pattern]}</span></button>`).join('')}</div><div class="reference-progress" role="progressbar" aria-label="加工进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div data-progress-fill></div><span data-progress-label>加工进度：0%</span></div><div class="reference-craft-actions"><button data-reference="generate" class="reference-generate">开始创作</button><button data-reference="back" class="reference-back">观名作</button></div></section>
    <section class="reference-scene-tag reference-raw"><h2>玉料样本</h2><div><button data-reference="raw-white" title="和田玉"><canvas width="32" height="32" data-raw="white" aria-hidden="true"></canvas></button><button data-reference="raw-green" title="翡翠"><canvas width="32" height="32" data-raw="green" aria-hidden="true"></canvas></button></div><p>和田玉　翡翠</p></section>
    <button class="reference-scene-tag reference-bench" data-reference="bench" aria-label="玉雕工作台，开始或继续创作">玉雕<br>工作台</button>
    <section class="reference-scene-tag reference-finished"><h2>成品陈列</h2><div data-finished-shelf></div><p>成品架</p></section>
    <button class="reference-dialogue" data-reference="dialogue" aria-label="师傅对话，点击继续">${corners()}<span class="reference-dialogue-line"><b>老师傅：</b> <span data-dialogue-first></span></span><span class="reference-dialogue-line" data-dialogue-second></span><span class="reference-dialogue-next" aria-hidden="true">▼</span></button>
    <span class="reference-live-status" role="status" aria-live="polite"></span>
  `;
  let selectedJade = 'green';
  let guidance = '';
  let selectedPattern = 'dragon';
  let selectedTool = 'magnifier';
  let activeTab = 'jade';
  let progress = 0;
  let dialogue = [...DEFAULT_DIALOGUE];
  let dialogueChars = 0;
  let dialogueElapsed = 0;
  let dialogueIndex = 0;
  let frame = null;
  let lastTime = null;
  const pauseReasons = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) dialogueChars = dialogue.join('').length;

  function currentJade() { return JADE_TYPES.find(jade => jade.id === selectedJade); }
  function announce(message) { element.querySelector('.reference-live-status').textContent = message; }
  function updateDialogue() {
    element.querySelector('[data-dialogue-first]').textContent = dialogue[0].slice(0, dialogueChars);
    element.querySelector('[data-dialogue-second]').textContent = dialogue[1].slice(0, Math.max(0, dialogueChars - dialogue[0].length));
  }
  function say(lines) {
    dialogue = lines;
    dialogueChars = reducedMotion ? lines.join('').length : 0;
    dialogueElapsed = 0;
    updateDialogue();
    ensureAnimation();
  }
  function updateProgress() {
    const percent = Math.floor(progress);
    element.querySelector('[data-progress-fill]').style.width = `${percent}%`;
    element.querySelector('[data-progress-label]').textContent = `加工进度：${percent}%`;
    element.querySelector('.reference-progress').setAttribute('aria-valuenow', percent);
    drawIcon(element.querySelector('[data-preview]'), 'bi', currentJade(), selectedPattern, progress / 100);
  }
  function updateShelf() {
    const shelf = element.querySelector('[data-finished-shelf]');
    const pieces = getState()?.pieces.slice(-2) ?? [];
    shelf.innerHTML = pieces.length
      ? pieces.map(() => '<button data-reference="shelf" title="查看我的作品"><canvas width="32" height="32" aria-label="实际成品"></canvas></button>').join('')
      : '<button data-reference="shelf" title="参观名作展柜"><canvas width="32" height="32" data-shelf-icon="shelf-dragon" aria-hidden="true"></canvas></button><button data-reference="shelf" title="参观玉文化馆"><canvas width="32" height="32" data-shelf-icon="shelf-fish" aria-hidden="true"></canvas></button>';
    shelf.querySelectorAll('[data-shelf-icon]').forEach(canvas => drawIcon(canvas, canvas.dataset.shelfIcon));
    pieces.forEach((piece,index) => {
      const canvas=shelf.querySelectorAll('canvas')[index];
      if(piece.artisan)drawArtisanPiece(canvas.getContext('2d'),piece.artisan,{size:32});
      else drawIcon(canvas,piece.shape==='bi'?'bi':'shelf-fish',JADE_TYPES[piece.material==='nephrite'?0:1],piece.pattern);
    });
    element.querySelector('.reference-finished p').textContent=pieces.length?'我的作品':'名作样本';
  }
  function updateSelection() {
    const state = getState();
    if(state) {
      progress = state.crafting?.progress ?? 0;
      element.querySelector('.reference-vitals').innerHTML = `<div>原石： <b>${state.inventory.length}</b> / 12</div><div>作品： <b>${state.pieces.length}</b> 件</div><div>灵感： <b>${state.museum?.inspirations.length ?? 0}</b> 则</div>`;
      element.querySelector('.reference-level').textContent = `首展：${state.exhibits.filter(Boolean).length} / 3`;
      element.querySelector('[data-reference="generate"]').textContent = state.crafting ? '继续创作' : '开始创作';
    }

    element.querySelectorAll('[data-jade]').forEach(button => { button.setAttribute('aria-pressed', button.dataset.jade === selectedJade); button.disabled = false; });
    element.querySelectorAll('[data-pattern]').forEach(button => { button.setAttribute('aria-pressed', button.dataset.pattern === selectedPattern); button.disabled = false; });
    element.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed', button.dataset.tool === selectedTool));
    element.querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-selected', button.dataset.tab === activeTab);
      button.tabIndex = button.dataset.tab === activeTab ? 0 : -1;
    });
    element.querySelector('.reference-jade-list').hidden = activeTab !== 'jade';
    element.querySelector('.reference-codex-list').hidden = activeTab !== 'tables';
    element.querySelector('[data-reference="generate"]').disabled = false;
    element.classList.toggle('is-generating', false);
    updateProgress(); updateShelf();
    const artwork = state?.crafting?.artisan ?? state?.pieces.at(-1)?.artisan;
    element.querySelector('.reference-preview p').textContent = `${PATTERN_NAMES[selectedPattern]} · 玉璧`;
    if(artwork) {
      const canvas=element.querySelector('[data-preview]');const context=canvas.getContext('2d');
      context.clearRect(0,0,32,32);drawArtisanPiece(context,artwork,{size:32});
      element.querySelector('.reference-preview p').textContent = ({bi:'玉璧',fish:'玉鱼佩',seal:'玉印'})[artwork.shape];
    }
  }
  function tick(now) {
    frame = null;
    if (!element.isConnected) { lastTime = null; return; }
    const delta = lastTime === null ? 0 : Math.min(100, now - lastTime);
    lastTime = now;
    if (!pauseReasons.size && !document.hidden) {
      if (dialogueChars < dialogue.join('').length) {
        dialogueElapsed += delta;
        dialogueChars = Math.min(dialogue.join('').length, Math.floor(dialogueElapsed / 23));
        updateDialogue();
      }
    }
    if (dialogueChars < dialogue.join('').length) ensureAnimation();
    else lastTime = null;
  }
  function ensureAnimation() {
    if (frame === null && !pauseReasons.size && !document.hidden) frame = requestAnimationFrame(tick);
  }
  element.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.jade === 'black') { onAction('museum'); return; }
    if (button.dataset.jade) {
      selectedJade = button.dataset.jade; updateSelection();
      announce(`已选择${currentJade().name}。`);
    }
    if (button.dataset.tool) {
      selectedTool = button.dataset.tool; updateSelection();
      onAction(({magnifier:'inspect',scales:'inventory',pickaxe:'mine',chisel:'make'})[selectedTool]);
    }
    if (button.dataset.pattern) { selectedPattern = button.dataset.pattern; updateSelection(); announce(`已选择${PATTERN_NAMES[selectedPattern]}。`); }
    if (button.dataset.tab) { activeTab = button.dataset.tab; updateSelection(); }
    if (button.dataset.codex) onAction('codex');
    const action = button.dataset.reference;
    if (action === 'generate') {
      const material = selectedJade === 'white' ? 'nephrite' : 'jadeite';
      onAction('make', { pattern: selectedPattern, materialId:getState()?.inventory.find(p=>p.material===material)?.id });
    }
    if (action === 'back') {
      onAction('museum');
    }
    if (action === 'bench') onAction('craft');
    if (action === 'raw-white' || action === 'raw-green') {
      selectedJade = action === 'raw-white' ? 'white' : 'green'; updateSelection();
      onAction('inspect');
    }
    if (action === 'shelf') onAction('museum');
    if (action === 'dialogue') {
      if (dialogueChars < dialogue.join('').length) { dialogueChars = dialogue.join('').length; updateDialogue(); }
      else {
        dialogueIndex = (dialogueIndex + 1) % 2;
        say(dialogueIndex ? ['先选玉材，再为它挑选合适的纹样。', '先看名作，再到工作台留下自己的刻痕。'] : [...DEFAULT_DIALOGUE]);
      }
    }
  });
  element.addEventListener('keydown', event => {
    if (!event.target.matches('[data-tab]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...element.querySelectorAll('[data-tab]')];
    const currentIndex = tabs.indexOf(event.target);
    const nextIndex = { ArrowLeft: 1 - currentIndex, ArrowRight: 1 - currentIndex, Home: 0, End: 1 }[event.key];
    activeTab = tabs[nextIndex].dataset.tab;
    updateSelection();
    element.querySelector(`[data-tab="${activeTab}"]`).focus();
  });
  element.querySelectorAll('[data-bead]').forEach(canvas => drawIcon(canvas, 'jade', JADE_TYPES.find(jade => jade.id === canvas.dataset.bead)));
  element.querySelectorAll('[data-raw]').forEach(canvas => drawIcon(canvas, 'raw', JADE_TYPES.find(jade => jade.id === canvas.dataset.raw)));
  element.querySelectorAll('[data-pattern-icon]').forEach(canvas => drawIcon(canvas, canvas.dataset.patternIcon));
  element.querySelectorAll('[data-tool-icon]').forEach(canvas => drawIcon(canvas, canvas.dataset.toolIcon));
  updateShelf(); updateSelection(); updateDialogue();
  function updateGuidance() {
    const state = getState();
    if (!state) return;
    let lines;
    if (!state.inventory.length && !state.pieces.length && !state.crafting) {
      lines = ['先去青岚矿洞，寻一块属于你的玉。', '带回工坊，我们一起观察石中的纹理。'];
    } else if (state.observations < 3) {
      lines = ['有了原石，先在鉴赏台细看它的模样。', '移动灯光看色带，把观察带进你的玉稿。'];
    } else if (state.crafting) {
      lines = ['工作台上的玉器，正等你继续琢磨。', '点“创作”接着做，松开工具就会保存。'];
    } else if (!['bi', 'fish', 'seal'].every(shape => state.pieces.some(piece => piece.shape === shape))) {
      lines = ['识玉之后，便可以动手琢玉成器。', '玉璧、玉鱼佩与玉印，各有一番意趣。'];
    } else if (state.exhibits.filter(Boolean).length < 3) {
      lines = ['三器已成，为它们留下一句心意吧。', '点“落款”，再去展厅布置你的首展。'];
    } else {
      lines = ['三器齐备，温润成展。你已走完首展之约。', '继续探索，或把作品图片留作纪念吧。'];
    }
    const next = lines.join('');
    if (next !== guidance) { guidance = next; say(lines); }
  }
  return {
    element,
    render() { updateSelection(); updateGuidance(); ensureAnimation(); },
    setPaused(reason, paused) {
      if (paused) pauseReasons.add(reason);
      else pauseReasons.delete(reason);
      lastTime = null;
      if (paused && frame !== null) { cancelAnimationFrame(frame); frame = null; }
      if (!paused) ensureAnimation();
    },
    reset() {
      selectedJade = 'green'; selectedPattern = 'dragon'; selectedTool = 'magnifier'; activeTab = 'jade'; progress = 0;
      dialogueIndex = 0; lastTime = null;
      guidance = '';
      updateShelf(); updateSelection(); say([...DEFAULT_DIALOGUE]);
    },
  };
}
