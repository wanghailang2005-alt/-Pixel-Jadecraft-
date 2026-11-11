import { CODEX, icon } from './icons.js';
import './workshop-reference.css';

const JADE_TYPES = [
  { id: 'white', name: '羊脂白玉', colors: ['#f2f0d1', '#d8e2b8', '#a4b38b'] },
  { id: 'green', name: '翡翠', colors: ['#9bdc85', '#4cb56b', '#237444'] },
  { id: 'black', name: '墨玉', colors: ['#659273', '#285d43', '#102f25'] },
];
const PATTERNS = ['cloud', 'dragon', 'grain'];
const PATTERN_NAMES = { cloud: '云纹', dragon: '龙纹', grain: '谷纹' };
const TOOLS = ['magnifier', 'scales', 'pickaxe', 'chisel'];
const TOOL_NAMES = { magnifier: '放大镜', scales: '天平', pickaxe: '镐', chisel: '刻刀' };
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

export function createWorkshopReference({ onAction = () => {} } = {}) {
  const element = document.createElement('section');
  element.className = 'reference-workshop';
  element.setAttribute('aria-label', '玉雕工坊');
  element.innerHTML = `
    <h1 class="reference-title">玉雕工坊</h1>
    <div class="reference-motto">匠心独运</div>
    <section class="reference-panel reference-player" aria-labelledby="player-hud-title">${corners()}<h2 id="player-hud-title" class="reference-panel-title">学徒状态</h2><div class="reference-vitals"><div>生命： <span class="reference-hearts" aria-label="生命值，当前4点，上限5点"><b>♥</b><b>♥</b><b>♥</b><b>♥</b><b class="empty-heart">♥</b></span></div><div>金币： <i class="reference-coin" aria-hidden="true"></i> <span>01450</span></div><div>玉屑： <i class="reference-dust" aria-hidden="true">✤</i> 75</div></div><div class="reference-master-portrait master-portrait" aria-label="老师傅头像"></div><span class="reference-level">等级： 12</span></section>
    <section class="reference-panel reference-inventory" aria-labelledby="inventory-title">${corners()}<h2 id="inventory-title" class="reference-panel-title">玉材与图鉴</h2><div class="reference-tabs" role="tablist" aria-label="玉材与图鉴"><button role="tab" id="jade-types-tab" data-tab="jade" aria-controls="reference-jade-list" aria-selected="true">玉材种类</button><button role="tab" id="tables-tab" data-tab="tables" aria-controls="reference-codex-list" aria-selected="false">器物图鉴</button></div><div class="reference-jade-list" id="reference-jade-list" role="tabpanel" aria-labelledby="jade-types-tab">${JADE_TYPES.map((jade, index) => `<button data-jade="${jade.id}" aria-pressed="${jade.id === 'green'}"><canvas width="32" height="32" data-bead="${jade.id}" aria-hidden="true"></canvas><span>${index + 1}. ${jade.name}</span></button>`).join('')}</div><div class="reference-codex-list" id="reference-codex-list" role="tabpanel" aria-labelledby="tables-tab" hidden>${CODEX.map(item => `<button data-codex="${item.id}" title="${item.name}">${icon(item.id)}<span>${item.name}</span></button>`).join('')}</div><div class="reference-tools" aria-label="观察工具">${TOOLS.map(tool => `<button data-tool="${tool}" title="${TOOL_NAMES[tool]}" aria-label="${TOOL_NAMES[tool]}" aria-pressed="${tool === 'magnifier'}"><canvas width="32" height="32" data-tool-icon="${tool}" aria-hidden="true"></canvas></button>`).join('')}</div></section>
    <section class="reference-panel reference-crafting" aria-labelledby="crafting-title">${corners()}<h2 id="crafting-title" class="reference-panel-title">玉器制作</h2><div class="reference-preview"><h3>雕纹预览</h3><canvas width="32" height="32" data-preview aria-label="玉璧预览"></canvas><p>玉璧</p></div><div class="reference-patterns" aria-label="雕刻纹样">${PATTERNS.map(pattern => `<button data-pattern="${pattern}" aria-pressed="${pattern === 'dragon'}"><canvas width="32" height="32" data-pattern-icon="${pattern}" aria-hidden="true"></canvas><span>${PATTERN_NAMES[pattern]}</span></button>`).join('')}</div><div class="reference-progress" role="progressbar" aria-label="加工进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="75"><div data-progress-fill></div><span data-progress-label>加工进度：75%</span></div><div class="reference-craft-actions"><button data-reference="generate" class="reference-generate">生成</button><button data-reference="back" class="reference-back">返回</button></div></section>
    <section class="reference-scene-tag reference-raw"><h2>玉料样本</h2><div><button data-reference="raw-white" title="羊脂白玉"><canvas width="32" height="32" data-raw="black" aria-hidden="true"></canvas></button><button data-reference="raw-green" title="翡翠"><canvas width="32" height="32" data-raw="white" aria-hidden="true"></canvas></button></div><p>和田玉　翡翠</p></section>
    <button class="reference-scene-tag reference-bench" data-reference="bench" aria-label="玉雕工作台，进入打磨练习">玉雕<br>工作台</button>
    <section class="reference-scene-tag reference-finished"><h2>成品陈列</h2><div data-finished-shelf></div><p>成品架</p></section>
    <button class="reference-dialogue" data-reference="dialogue" aria-label="师傅对话，点击继续">${corners()}<span class="reference-dialogue-line"><b>老师傅：</b> <span data-dialogue-first></span></span><span class="reference-dialogue-line" data-dialogue-second></span><span class="reference-dialogue-next" aria-hidden="true">▼</span></button>
    <span class="reference-live-status" role="status" aria-live="polite"></span>
  `;
  let selectedJade = 'green';
  let selectedPattern = 'dragon';
  let selectedTool = 'magnifier';
  let activeTab = 'jade';
  let progress = 75;
  let generation = null;
  let generatedCount = 0;
  let finished = [];
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
    shelf.innerHTML = finished.length ? finished.slice(-2).map(piece => `<button data-finished="${piece.id}" title="${piece.jade.name} · ${PATTERN_NAMES[piece.pattern]}"><canvas width="32" height="32" aria-hidden="true"></canvas></button>`).join('') : `<button data-reference="shelf" title="成品陈列示意">${icon('dragon')}</button><button data-reference="shelf" title="成品陈列示意">${icon('fish')}</button>`;
    finished.slice(-2).forEach((piece, index) => drawIcon(shelf.querySelectorAll('canvas')[index], 'bi', piece.jade, piece.pattern));
  }
  function updateSelection() {
    element.querySelectorAll('[data-jade]').forEach(button => { button.setAttribute('aria-pressed', button.dataset.jade === selectedJade); button.disabled = Boolean(generation); });
    element.querySelectorAll('[data-pattern]').forEach(button => { button.setAttribute('aria-pressed', button.dataset.pattern === selectedPattern); button.disabled = Boolean(generation); });
    element.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed', button.dataset.tool === selectedTool));
    element.querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-selected', button.dataset.tab === activeTab);
      button.tabIndex = button.dataset.tab === activeTab ? 0 : -1;
    });
    element.querySelector('.reference-jade-list').hidden = activeTab !== 'jade';
    element.querySelector('.reference-codex-list').hidden = activeTab !== 'tables';
    element.querySelector('[data-reference="generate"]').disabled = Boolean(generation);
    element.classList.toggle('is-generating', Boolean(generation));
    updateProgress();
  }
  function tick(now) {
    frame = null;
    if (!element.isConnected) { lastTime = null; return; }
    const delta = lastTime === null ? 0 : Math.min(100, now - lastTime);
    lastTime = now;
    if (!pauseReasons.size && !document.hidden) {
      if (generation) {
        generation.elapsed += delta;
        progress = Math.min(100, generation.elapsed / 2400 * 100);
        updateProgress();
        if (progress >= 100) {
          const completed = generation;
          generation = null;
          finished.push({ id: ++generatedCount, jade: completed.jade, pattern: completed.pattern });
          finished = finished.slice(-2);
          updateShelf(); updateSelection();
          say([`这件${PATTERN_NAMES[completed.pattern]}玉璧已经完成。`, '好一个温润的开端，去成品架上细细欣赏吧。']);
          announce('生成完成，玉璧已放入成品陈列。');
        }
      }
      if (dialogueChars < dialogue.join('').length) {
        dialogueElapsed += delta;
        dialogueChars = Math.min(dialogue.join('').length, Math.floor(dialogueElapsed / 23));
        updateDialogue();
      }
    }
    if (generation || dialogueChars < dialogue.join('').length) ensureAnimation();
    else lastTime = null;
  }
  function ensureAnimation() {
    if (frame === null && !pauseReasons.size && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function generate() {
    if (generation || pauseReasons.size) return;
    progress = 0;
    generation = { elapsed: 0, jade: currentJade(), pattern: selectedPattern };
    updateSelection();
    element.querySelector('[data-reference="back"]').focus({ preventScroll: true });
    say(['手稳心静，纹样自会渐渐显露。', '循着玉石的纹理，让这件玉璧慢慢成形。']);
    announce('正在生成玉璧。');
    lastTime = null;
    ensureAnimation();
  }
  element.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.jade && !generation) {
      selectedJade = button.dataset.jade; progress = 75; updateSelection();
      announce(`已选择${currentJade().name}。`);
    }
    if (button.dataset.tool) { selectedTool = button.dataset.tool; updateSelection(); announce(`已选择${TOOL_NAMES[selectedTool]}。`); }
    if (button.dataset.pattern && !generation) { selectedPattern = button.dataset.pattern; progress = 75; updateSelection(); announce(`已选择${PATTERN_NAMES[selectedPattern]}。`); }
    if (button.dataset.tab) { activeTab = button.dataset.tab; updateSelection(); }
    if (button.dataset.codex) onAction('codex');
    if (button.dataset.finished) {
      const piece = finished.find(item => String(item.id) === button.dataset.finished);
      if (piece) say([`${piece.jade.name} · ${PATTERN_NAMES[piece.pattern]}玉璧`, '这是你在本次工坊试作中完成的作品。']);
    }
    const action = button.dataset.reference;
    if (action === 'generate') generate();
    if (action === 'back') {
      generation = null; progress = 75; updateSelection();
      say([...DEFAULT_DIALOGUE]);
      announce('已返回纹样选择。');
    }
    if (action === 'bench') onAction('craft');
    if (action === 'raw-white' || action === 'raw-green') {
      if (!generation) { selectedJade = action === 'raw-white' ? 'white' : 'green'; updateSelection(); }
    }
    if (action === 'shelf') say(['一器一故事，玉中自有天地。', '选一块玉材、一种纹样，试作属于你的玉器。']);
    if (action === 'dialogue') {
      if (dialogueChars < dialogue.join('').length) { dialogueChars = dialogue.join('').length; updateDialogue(); }
      else {
        dialogueIndex = (dialogueIndex + 1) % 2;
        say(dialogueIndex ? ['先选玉材，再为它挑选合适的纹样。', '点击“生成”，或前往工作台练习打磨。'] : [...DEFAULT_DIALOGUE]);
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
  return {
    element,
    render() { updateSelection(); ensureAnimation(); },
    setPaused(reason, paused) {
      if (paused) pauseReasons.add(reason);
      else pauseReasons.delete(reason);
      lastTime = null;
      if (paused && frame !== null) { cancelAnimationFrame(frame); frame = null; }
      if (!paused) ensureAnimation();
    },
    reset() {
      generation = null; finished = []; generatedCount = 0;
      selectedJade = 'green'; selectedPattern = 'dragon'; selectedTool = 'magnifier'; activeTab = 'jade'; progress = 75;
      dialogueIndex = 0; lastTime = null;
      updateShelf(); updateSelection(); say([...DEFAULT_DIALOGUE]);
    },
  };
}
