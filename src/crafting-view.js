import { PolishingSurface, SURFACE_SIZE, FINISH_THRESHOLD } from './polishing.js';
import './crafting.css';

const STAGES = {
  shape: { name: '琢形', tool: '琢玉刀', hint: '沿玉料拖动琢玉刀，逐渐显露器物轮廓。', next: '进入雕纹' },
  carve: { name: '雕纹', tool: '刻刀', hint: '轻轻拖动刻刀，让器物上的纹样逐渐显露。', next: '进入抛光' },
  polish: { name: '抛光', tool: '绒布', hint: '按住拖动绒布，擦去粗糙层，露出温润玉色。', next: '完成制作' },
};
const MATERIAL_NAMES = { nephrite: '和田玉', jadeite: '翡翠' };
const SHAPE_NAMES = { bi: '玉璧', fish: '玉鱼佩', seal: '玉印' };
const SHAPE_MARKS = { bi: '璧', fish: '鱼', seal: '印' };
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function encodeCoverage(surface) {
  const bytes = new Uint8Array(surface.covered.length / 8);
  surface.covered.forEach((covered, index) => {
    if (covered) bytes[index >> 3] |= 1 << (index & 7);
  });
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}

function restoreCoverage(surface, coverage) {
  if (!coverage) return;
  try {
    const bytes = atob(coverage);
    if (bytes.length !== surface.covered.length / 8) return;
    surface.valid.forEach((valid, index) => {
      if (valid && bytes.charCodeAt(index >> 3) & (1 << (index & 7))) {
        surface.covered[index] = 1;
        surface.count++;
      }
    });
  } catch { /* Older or malformed coverage keeps the available material recoverable. */ }
}

function drawJade(context, surface, step, material) {
  const texture = context.createImageData(SURFACE_SIZE, SURFACE_SIZE);
  const pale = material === 'nephrite';
  for (let y = 0; y < SURFACE_SIZE; y++) {
    for (let x = 0; x < SURFACE_SIZE; x++) {
      const index = y * SURFACE_SIZE + x;
      if (!surface.valid[index]) continue;
      const radius = Math.hypot(x - 120, y - 120);
      const angle = Math.atan2(y - 120, x - 120);
      const grain = ((Math.floor(x / 3) * 17 + Math.floor(y / 3) * 23) % 13) - 6;
      const vein = Math.sin(x / 19 + Math.sin(y / 22)) * 9;
      let motif = radius > 54 && radius < 94 && Math.abs(Math.sin(angle * 8 + radius / 9)) < .16;
      if (surface.shape === 'fish') motif = x > 65 && x < 155 && Math.abs(Math.sin((x + y) / 12)) < .16;
      if (surface.shape === 'seal') motif = y > 145 && y < 190 && (x % 18 < 3 || y % 18 < 3);
      const covered = surface.covered[index];
      let color = pale ? [148, 178, 130] : [45, 121, 80];
      if (step === 'shape' && !covered) color = [113, 128, 112];
      if (step === 'polish' && !covered) color = pale ? [141, 156, 122] : [85, 126, 100];
      const patternVisible = step === 'polish' || (step === 'carve' && covered);
      const light = step === 'polish' && covered ? Math.max(0, 1 - Math.hypot(x - 75, y - 60) / 125) * 38 : 0;
      const boundary = !surface.valid[index - 1] || !surface.valid[index + 1]
        || !surface.valid[index - SURFACE_SIZE] || !surface.valid[index + SURFACE_SIZE];
      let edge = boundary ? -24 : 0;
      if (surface.shape === 'bi') edge = radius > 101 || radius < 43 ? -24 : 0;
      const engraving = patternVisible && motif ? 42 : 0;
      const offset = index * 4;
      for (let channel = 0; channel < 3; channel++) {
        texture.data[offset + channel] = color[channel] + grain + vein + light + edge + engraving;
      }
      texture.data[offset + 3] = 255;
    }
  }
  context.putImageData(texture, 0, 0);
}

export function createCraftingView({ store, show, button, notify = () => {} }) {
  let dispose = () => {};

  function open() {
    dispose();
    const crafting = store.state.crafting;
    if (!crafting) { showMaterials(); return; }
    if (!MATERIAL_NAMES[crafting.material] || !STAGES[crafting.step] || !SHAPE_NAMES[crafting.shape]) {
      show('继续玉器制作', '<div class="crafting-view"><p>这份早期记录只保存了阶段和百分比，缺少实际玉材信息。可以结束这条记录，再从行囊中选择原石开始制作。</p><button data-crafting-legacy>结束旧记录，重新选玉</button></div>', button('返回工坊', 'close'), true);
      document.querySelector('[data-crafting-legacy]').onclick = () => {
        if (store.clearLegacyCrafting()) open();
      };
      return;
    }
    showWorkbench(crafting);
  }

  function showMaterials() {
    const materials = store.state.inventory;
    show('琢玉成器', `<div class="crafting-view crafting-selection"><div class="crafting-selection-art" aria-hidden="true">璧</div><section><h3>从一块原石开始</h3><p>选择玉料，依次完成琢形、雕纹和抛光。每个阶段达到 75% 后，可以继续精修或进入下一步。</p><p>开始制作会取出一块原石，加工进度可以保存并继续。</p>${materials.length ? `<label for="crafting-material">选择玉料</label><select id="crafting-material">${materials.map(item => `<option value="${escape(item.id)}">${MATERIAL_NAMES[item.material] ?? '玉料'}原石</option>`).join('')}</select><label for="crafting-shape">选择器型</label><select id="crafting-shape">${Object.entries(SHAPE_NAMES).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select><button class="primary" data-crafting-start>开始制作</button>` : '<p class="crafting-empty">行囊中还没有原石。先前往矿洞寻一块玉，再回工坊制作。</p>'}</section></div>`, button('返回工坊', 'close'), true);
    const dialog = document.querySelector('dialog');
    const start = dialog.querySelector('[data-crafting-start]');
    if (start) start.onclick = () => {
      if (store.startCrafting(dialog.querySelector('#crafting-material').value, dialog.querySelector('#crafting-shape').value)) open();
      else notify('暂时无法开始制作，请检查原石和当前地点。');
    };
  }

  function showWorkbench(crafting) {
    const stage = STAGES[crafting.step];
    const surface = new PolishingSurface(crafting.shape);
    restoreCoverage(surface, crafting.coverage);
    show(`${SHAPE_NAMES[crafting.shape]}制作`, `<div class="crafting-view"><ol class="crafting-stages" aria-label="制作阶段">${Object.entries(STAGES).map(([id, item]) => `<li ${id === crafting.step ? 'aria-current="step"' : ''}>${item.name}</li>`).join('')}</ol><div class="crafting-layout"><aside class="crafting-tools"><h3>工具</h3><button aria-pressed="true" class="crafting-tool">${stage.tool}</button><label for="crafting-brush">作用范围</label><input id="crafting-brush" type="range" min="8" max="24" value="16"><p>鼠标或手指按住拖动</p><p>键盘方向键移动<br>按住空格加工</p></aside><div class="crafting-workarea"><canvas width="480" height="360" tabindex="0" aria-label="${stage.name}加工区，按住拖动，或方向键移动工具并按空格加工"></canvas></div><aside class="crafting-details"><h3>${MATERIAL_NAMES[crafting.material]}${SHAPE_NAMES[crafting.shape]}</h3><p class="crafting-stage-name">${stage.name}</p><progress max="100" value="0" aria-label="当前阶段完成度"></progress><output>0%</output><p data-crafting-feedback aria-live="polite">${stage.hint}</p><p class="crafting-save-note">松开工具保存本次笔触。关闭窗口后可以继续。</p></aside></div><div class="crafting-actions"><button data-crafting-cancel>取消并返还原石</button><span class="crafting-status" role="status"></span><button data-crafting-save>保存并关闭</button><button data-crafting-next class="primary" disabled>${stage.next}</button></div></div>`, '', true);
    const dialog = document.querySelector('dialog');
    const root = dialog.querySelector('.crafting-view');
    const canvas = root.querySelector('canvas');
    const context = canvas.getContext('2d');
    const texture = document.createElement('canvas');
    texture.width = texture.height = SURFACE_SIZE;
    const textureContext = texture.getContext('2d');
    const controller = new AbortController();
    const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: controller.signal });
    const cursor = { x: 120, y: 120 };
    let previous = null;
    let pointerId = null;
    let changed = false;
    let drawFrame = null;
    let brush = 16;
    let keyboardWorking = false;

    function draw() {
      drawFrame = null;
      context.imageSmoothingEnabled = false;
      context.fillStyle = '#543522'; context.fillRect(0, 0, 480, 360);
      for (let y = 0; y < 360; y += 30) {
        context.fillStyle = '#33261c'; context.fillRect(0, y, 480, 3);
        context.fillStyle = '#745035';
        for (let x = 8; x < 480; x += 37) context.fillRect(x, y + 10 + x % 9, 21, 2);
      }
      context.fillStyle = '#16372b'; context.fillRect(60, 18, 360, 324);
      context.fillStyle = '#244736';
      for (let y = 22; y < 338; y += 8) for (let x = 64; x < 416; x += 8) context.fillRect(x, y, 4, 4);
      if (crafting.step === 'shape') {
        context.save();
        context.globalAlpha = 1 - surface.progress;
        context.fillStyle = '#5d6e5b';
        const margin = Math.round(surface.progress * 13);
        context.beginPath();
        context.moveTo(117 + margin, 92); context.lineTo(180, 50 + margin);
        context.lineTo(294, 48 + margin); context.lineTo(366 - margin, 127);
        context.lineTo(351 - margin, 268); context.lineTo(252, 308 - margin);
        context.lineTo(132 + margin, 281); context.closePath(); context.fill();
        context.restore();
      }
      drawJade(textureContext, surface, crafting.step, crafting.material);
      context.drawImage(texture, 120, 42);
      if (crafting.shape === 'bi') {
        context.fillStyle = '#16372b';
        context.beginPath(); context.arc(240, 162, 38, 0, Math.PI * 2); context.fill();
      }
      if (crafting.shape === 'fish') {
        context.fillStyle = '#183b2c'; context.fillRect(168, 144, 7, 7);
        context.fillStyle = '#c4d7a7'; context.fillRect(169, 144, 2, 2);
      }
      if (crafting.shape === 'seal') {
        context.fillStyle = '#bfd3a0'; context.fillRect(211, 101, 3, 54);
        context.fillStyle = '#284f36'; context.fillRect(165, 176, 150, 3);
      }
      context.strokeStyle = '#e2d2a1'; context.lineWidth = 1;
      context.strokeRect(cursor.x + 120 - brush, cursor.y + 42 - brush, brush * 2, brush * 2);
      const progress = Math.floor(surface.progress * 100);
      root.querySelector('progress').value = progress;
      root.querySelector('output').textContent = `${progress}%`;
      root.querySelector('[data-crafting-next]').disabled = surface.progress < FINISH_THRESHOLD;
      root.querySelector('[data-crafting-feedback]').textContent = surface.progress >= FINISH_THRESHOLD ? '这一阶段已达到要求，可以继续精修或进入下一步。' : stage.hint;
    }

    function requestDraw() {
      if (drawFrame === null) drawFrame = requestAnimationFrame(draw);
    }
    function canWork() {
      return dialog.open && root.isConnected && !document.hidden && store.active
        && store.state.location === 'workshop' && store.state.crafting === crafting;
    }
    function save() {
      if (!changed) return true;
      if (!store.updateCrafting(Math.floor(surface.progress * 100), encodeCoverage(surface))) {
        notify('这次加工未能更新，请先保留窗口并检查存档。');
        return false;
      }
      changed = false;
      // Store implementations may normalize and replace the persisted object.
      crafting = store.state.crafting;
      root.querySelector('.crafting-status').textContent = store.dirty ? '进度暂留本次游戏，请导出备份' : '本次笔触已保存';
      return true;
    }
    function endStroke() {
      previous = null;
      if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      pointerId = null;
      save();
    }
    function stroke(point) {
      if (!canWork()) return;
      surface.stroke(previous ?? point, point, brush);
      previous = point;
      cursor.x = point.x; cursor.y = point.y;
      changed = true;
      requestDraw();
    }
    function pointFor(event) {
      const bounds = canvas.getBoundingClientRect();
      return { x: (event.clientX - bounds.left) * canvas.width / bounds.width - 120,
        y: (event.clientY - bounds.top) * canvas.height / bounds.height - 42 };
    }
    listen(canvas, 'pointerdown', event => {
      if (event.button !== 0 || !canWork() || pointerId !== null) return;
      event.preventDefault(); canvas.focus(); pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId); stroke(pointFor(event));
    });
    listen(canvas, 'pointermove', event => {
      if (event.pointerId === pointerId) { event.preventDefault(); stroke(pointFor(event)); }
    });
    listen(canvas, 'pointerup', endStroke);
    listen(canvas, 'pointercancel', endStroke);
    listen(canvas, 'pointerleave', endStroke);
    listen(canvas, 'lostpointercapture', endStroke);
    listen(canvas, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) return;
      event.preventDefault();
      if (!canWork()) return;
      const dx = event.code === 'ArrowLeft' ? -8 : event.code === 'ArrowRight' ? 8 : 0;
      const dy = event.code === 'ArrowUp' ? -8 : event.code === 'ArrowDown' ? 8 : 0;
      cursor.x = Math.max(0, Math.min(239, cursor.x + dx));
      cursor.y = Math.max(0, Math.min(239, cursor.y + dy));
      if (event.code === 'Space') keyboardWorking = true;
      if (keyboardWorking || event.shiftKey) stroke({ ...cursor });
      else requestDraw();
    });
    listen(canvas, 'keyup', event => {
      if (event.code === 'Space') keyboardWorking = false;
      endStroke();
    });
    listen(window, 'blur', () => { keyboardWorking = false; endStroke(); });
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { keyboardWorking = false; endStroke(); }
    });
    listen(dialog, 'close', () => { endStroke(); dispose(); });
    root.querySelector('#crafting-brush').oninput = event => { brush = Number(event.target.value); requestDraw(); };
    root.querySelector('[data-crafting-save]').onclick = () => { endStroke(); if (!changed) dialog.close(); };
    root.querySelector('[data-crafting-cancel]').onclick = () => {
      endStroke();
      if (store.cancelCrafting()) { notify('原石已返还行囊。'); open(); }
      else notify('行囊已满，请先腾出空位，再返还原石。');
    };
    root.querySelector('[data-crafting-next]').onclick = () => {
      endStroke();
      if (!save() || surface.progress < FINISH_THRESHOLD) return;
      if (!store.advanceCrafting()) { notify('当前阶段尚未完成，或存档状态已变化。'); return; }
      if (store.state.crafting) open();
      else {
        dispose();
        show('温润成器', `<div class="crafting-view crafting-complete"><div class="crafting-selection-art" aria-hidden="true">${SHAPE_MARKS[crafting.shape]}</div><h3>${MATERIAL_NAMES[crafting.material]}${SHAPE_NAMES[crafting.shape]}已收入成品</h3><p>琢形、雕纹与抛光已完成。可以继续为作品挑选纹样、配色和祝福语，再带到展厅陈列。</p></div>`, button('返回工坊', 'close', 'primary'), true);
        notify(`${SHAPE_NAMES[crafting.shape]}已收入成品行囊。`);
      }
    };
    dispose = () => {
      controller.abort();
      if (drawFrame !== null) cancelAnimationFrame(drawFrame);
      drawFrame = null;
      previous = null;
      pointerId = null;
      dispose = () => {};
    };
    draw();
  }

  return { open };
}
