import { PolishingSurface, SURFACE_SIZE, FINISH_THRESHOLD } from './polishing.js';
import './polishing.css';

function makeJade(surface, polished = false) {
  const texture = document.createElement('canvas');
  texture.width = texture.height = SURFACE_SIZE;
  const ctx = texture.getContext('2d');
  const pixels = ctx.createImageData(SURFACE_SIZE, SURFACE_SIZE);
  for (let y = 0; y < SURFACE_SIZE; y++) {
    for (let x = 0; x < SURFACE_SIZE; x++) {
      const index = y * SURFACE_SIZE + x;
      if (!surface.valid[index]) continue;
      const radius = Math.hypot(x - 120, y - 120);
      const grain = Math.sin(Math.floor(x / 3) * 127.1 + Math.floor(y / 3) * 311.7) * 43758.5453;
      const noise = grain - Math.floor(grain);
      const cloud = Math.sin(x / 15 + Math.sin(y / 17)) * Math.cos(y / 21) * 12;
      const edge = radius > 101 || radius < 43 ? -25 : 0;
      const light = Math.max(0, 1 - Math.hypot(x - 70, y - 50) / 110) * 27;
      let color;
      if (polished || surface.covered[index]) {
        const angle = Math.atan2(y - 120, x - 120);
        const motif = Math.abs(Math.sin(angle * 8 + radius / 10)) < 0.11 && radius > 59 && radius < 94 ? 23 : 0;
        color = [38 + cloud + light + motif, 119 + cloud + light + motif, 75 + cloud + light + motif];
        if (radius > 97 && radius < 100 && x + y < 230) color = [166, 210, 145];
      } else {
        color = [125 + noise * 36 + cloud, 139 + noise * 32 + cloud, 104 + noise * 27 + cloud];
      }
      const offset = index * 4;
      pixels.data[offset] = color[0] + edge;
      pixels.data[offset + 1] = color[1] + edge;
      pixels.data[offset + 2] = color[2] + edge;
      pixels.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return texture;
}

function drawDesk(ctx) {
  ctx.fillStyle = '#5a3525';
  ctx.fillRect(0, 0, 600, 350);
  for (let y = 0; y < 350; y += 30) {
    ctx.fillStyle = '#34251e';
    ctx.fillRect(0, y, 600, 3);
    for (let x = 0; x < 600; x += 13) {
      ctx.fillStyle = (x + y) % 5 ? '#75472c' : '#8b5836';
      ctx.fillRect(x, y + 7 + (x % 12), 9, 2);
    }
  }
  ctx.fillStyle = '#102b25';
  ctx.fillRect(84, 15, 432, 320);
  for (let y = 18; y < 332; y += 6) {
    for (let x = 88; x < 512; x += 6) {
      ctx.fillStyle = (x + y) % 12 ? '#1e3d30' : '#284635';
      ctx.fillRect(x, y, 4, 4);
    }
  }
  for (const x of [15, 572]) {
    for (const y of [14, 322]) {
      ctx.fillStyle = '#c29a56'; ctx.fillRect(x, y, 12, 12);
      ctx.fillStyle = '#56402b'; ctx.fillRect(x + 3, y + 3, 6, 6);
    }
  }
}

export function createPolishingDemo({ onOpenChange, onSettings, onFinish = () => {} }) {
  const frame = document.querySelector('#game');
  const surface = new PolishingSurface();
  const root = document.createElement('section');
  root.className = 'polishing-demo';
  root.hidden = true;
  root.setAttribute('aria-label', '玉璧打磨试玩');
  root.innerHTML = `
    <header class="polish-heading"><span class="seal">琢</span><h1>玉璧打磨</h1><div><button data-polish="settings">设置</button><button data-polish="pause">暂停</button></div></header>
    <nav class="polish-stages" aria-label="加工阶段"><span>切形 ✓</span><span>雕纹 ✓</span><strong>抛光</strong></nav>
    <aside class="polish-tools polish-panel"><h2>工具</h2><button class="polish-cloth" aria-pressed="true" aria-label="绒布，已选中"><canvas width="48" height="48" aria-hidden="true"></canvas>绒布</button><p>按住拖动<br>擦亮玉色</p><label>笔刷大小<input data-brush type="range" min="7" max="20" value="12" aria-label="笔刷大小"></label></aside>
    <div class="polish-workarea"><canvas width="600" height="350" tabindex="0" aria-label="玉璧加工区，按住鼠标或手指拖动打磨，方向键移动工具，空格打磨"></canvas><div class="polish-cursor" hidden aria-hidden="true"><span>▱</span></div><div class="polish-pause" hidden><h2>稍歇片刻</h2><p>打磨已暂停</p><button data-polish="resume">继续打磨</button></div></div>
    <aside class="polish-details"><section class="polish-panel polish-preview"><h2>器型预览</h2><canvas width="240" height="240" aria-label="翡翠玉璧成品预览"></canvas><p>翡翠玉璧</p></section><section class="polish-panel polish-progress"><h2>打磨进度</h2><div><progress max="100" value="0" aria-label="玉璧打磨进度"></progress><output>0%</output></div><p data-feedback role="status" aria-live="polite">轻轻擦拭，露出温润玉色。</p></section></aside>
    <footer class="polish-footer"><button data-polish="back">返回工坊</button><p data-hint>绒布已选中 · 按住鼠标拖动打磨</p><button data-polish="reset">重新打磨</button><button data-polish="finish" class="primary" disabled>完成打磨</button></footer>
    <div class="polish-result" hidden role="dialog" aria-modal="true" aria-labelledby="polish-result-title"><div class="polish-result-card"><h2 id="polish-result-title">温润成器</h2><canvas width="240" height="240" aria-label="本次打磨作品"></canvas><p>翡翠玉璧</p><p data-result-score></p><button data-polish="keep">继续改善</button><button data-polish="back" class="primary">返回工坊</button></div></div>
  `;
  frame.append(root);
  const clothCanvas = root.querySelector('.polish-cloth canvas');
  const clothContext = clothCanvas.getContext('2d');
  const clothRows = ['       #######      ', '    ############    ', ' #################  ', '####################', ' ################## ', '  ################  ', '   ##############   ', '    ############    '];
  clothRows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '#') {
      clothContext.fillStyle = ['#e9d8a5', '#d9c58e', '#e4d3a0', '#c2ad76'][y % 4];
      clothContext.fillRect(x * 2 + 4, y * 3 + 12, 2, 3);
    }
  }));
  const baseInterface = document.querySelector('#interface');
  const canvas = root.querySelector('.polish-workarea canvas');
  const ctx = canvas.getContext('2d');
  const preview = root.querySelector('.polish-preview canvas');
  preview.getContext('2d').drawImage(makeJade(surface, true), 0, 0);
  const cursor = root.querySelector('.polish-cursor');
  const pausedLayer = root.querySelector('.polish-pause');
  const result = root.querySelector('.polish-result');
  const progress = root.querySelector('progress');
  const output = root.querySelector('output');
  const finish = root.querySelector('[data-polish="finish"]');
  const feedback = root.querySelector('[data-feedback]');
  const hint = root.querySelector('[data-hint]');
  const pauseButton = root.querySelector('[data-polish="pause"]');
  function setResultVisible(visible) {
    result.hidden = !visible;
    for (const child of root.children) {
      if (child !== result) child.inert = visible;
    }
  }
  const reasons = new Set();
  let previous = null;
  let pointerId = null;
  let returnFocus;
  let brush = 12;
  let keyboardPosition = { x: 195, y: 120 };
  let announced = -1;

  function draw() {
    ctx.imageSmoothingEnabled = false;
    drawDesk(ctx);
    ctx.fillStyle = '#071b16';
    ctx.beginPath(); ctx.ellipse(300, 181, 154, 153, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(makeJade(surface), 132, 7, 336, 336);
    // The hole shows the same woven mat as the surrounding work surface.
    ctx.fillStyle = '#102b25';
    ctx.beginPath(); ctx.arc(300, 175, 53, 0, Math.PI * 2); ctx.fill();
    for (let y = 124; y < 227; y += 6) {
      for (let x = 249; x < 352; x += 6) {
        if (Math.hypot(x - 300, y - 175) < 49) {
          ctx.fillStyle = '#284635'; ctx.fillRect(x, y, 4, 3);
        }
      }
    }
    const percent = Math.floor(surface.progress * 100);
    progress.value = percent;
    output.value = `${percent}%`;
    finish.disabled = surface.progress < FINISH_THRESHOLD;
    const milestone = Math.floor(percent / 25);
    if (milestone !== announced) {
      announced = milestone;
      feedback.textContent = percent >= 75 ? '已达试玩要求，可完成，也可继续打磨。' : percent >= 25 ? '翠色正在显露，试着擦亮粗糙的部分。' : '轻轻擦拭，露出温润玉色。';
    }
  }

  function endStroke() {
    const captured = pointerId;
    pointerId = null;
    previous = null;
    cursor.hidden = true;
    if (captured !== null && canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured);
  }

  function setPaused(reason, value) {
    if (value) reasons.add(reason);
    else reasons.delete(reason);
    endStroke();
    pausedLayer.hidden = !reasons.has('manual');
    pauseButton.textContent = reasons.has('manual') ? '继续' : '暂停';
  }

  const canPolish = () => !root.hidden && reasons.size === 0 && result.hidden;
  function position(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width * 600 - 132) / 1.4,
      y: ((event.clientY - rect.top) / rect.height * 350 - 7) / 1.4,
    };
  }
  function moveTool(point) {
    cursor.hidden = false;
    cursor.style.left = `${(132 + point.x * 1.4) / 6}%`;
    cursor.style.top = `${(7 + point.y * 1.4) / 3.5}%`;
    cursor.style.width = cursor.style.height = `${brush * 2.8}px`;
  }
  function polish(point) {
    surface.stroke(previous ?? point, point, brush);
    previous = point;
    moveTool(point);
    draw();
  }
  canvas.addEventListener('pointerdown', event => {
    if (!canPolish() || event.button !== 0 || pointerId !== null) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    polish(position(event));
  });
  canvas.addEventListener('pointermove', event => {
    if (!canPolish()) return;
    const point = position(event);
    if (pointerId !== event.pointerId) { moveTool(point); return; }
    if (!(event.buttons & 1)) { endStroke(); return; }
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { endStroke(); return; }
    polish(point);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
    canvas.addEventListener(name, endStroke);
  }
  canvas.addEventListener('keydown', event => {
    const moves = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] };
    if (!moves[event.key] && event.code !== 'Space') return;
    event.preventDefault();
    if (!canPolish()) return;
    if (moves[event.key]) {
      const [dx, dy] = moves[event.key];
      keyboardPosition = { x: Math.max(0, Math.min(239, keyboardPosition.x + dx)), y: Math.max(0, Math.min(239, keyboardPosition.y + dy)) };
      moveTool(keyboardPosition);
    } else {
      surface.stroke(keyboardPosition, keyboardPosition, brush);
      draw();
    }
  });
  root.querySelector('[data-brush]').addEventListener('input', event => {
    brush = Number(event.target.value);
    endStroke();
  });

  function close() {
    if (root.hidden) return;
    endStroke();
    setResultVisible(false);
    root.hidden = true;
    baseInterface.inert = false;
    onOpenChange(false);
    if (returnFocus?.isConnected) returnFocus.focus();
    else (baseInterface.querySelector('.workbench-hotspot') ?? baseInterface.querySelector('[data-action="craft"]') ?? baseInterface.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
  }
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-polish]')?.dataset.polish;
    if (action === 'back') close();
    if (action === 'settings') { endStroke(); onSettings(); }
    if (action === 'pause') setPaused('manual', !reasons.has('manual'));
    if (action === 'resume') { setPaused('manual', false); canvas.focus(); }
    if (action === 'reset') {
      endStroke(); surface.reset(); announced = -1; draw(); canvas.focus();
    }
    if (action === 'finish' && !finish.disabled) {
      endStroke();
      onFinish(surface.progress);
      setResultVisible(true);
      root.querySelector('[data-result-score]').textContent = `打磨覆盖 ${Math.floor(surface.progress * 100)}%`;
      const resultCanvas = result.querySelector('canvas');
      resultCanvas.getContext('2d').clearRect(0, 0, 240, 240);
      resultCanvas.getContext('2d').drawImage(makeJade(surface), 0, 0);
      result.querySelector('button').focus();
    }
    if (action === 'keep') { setResultVisible(false); canvas.focus(); }
  });
  // Capture shortcuts while this view owns the screen, before the base UI handles them.
  document.addEventListener('keydown', event => {
    if (root.hidden || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!result.hidden) { setResultVisible(false); canvas.focus(); }
      else setPaused('manual', !reasons.has('manual'));
    }
    if (!root.contains(event.target) || ['Escape', 'b', 'j', 'g', 'm', 'f'].includes(event.key.toLowerCase())) event.stopImmediatePropagation();
    if (event.key === 'Tab') {
      const container = result.hidden ? root : result;
      const focusable = [...container.querySelectorAll('button:not(:disabled),input,canvas[tabindex]')].filter(node => node.checkVisibility());
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  document.addEventListener('visibilitychange', () => setPaused('hidden', document.hidden));
  window.addEventListener('blur', endStroke);
  const resize = () => {
    endStroke();
    const workshop = frame.classList.contains('reference-mode');
    const width = workshop ? 1024 : 960;
    const scale = frame.clientWidth / width;
    root.style.transform = `translate(${workshop ? 32 * scale : 0}px, ${workshop ? 9 * scale : 0}px) scale(${scale})`;
  };
  new ResizeObserver(resize).observe(frame);
  resize();
  draw();
  return {
    open() {
      returnFocus = document.activeElement;
      reasons.clear();
      setPaused('hidden', document.hidden);
      root.hidden = false;
      baseInterface.inert = true;
      const backLabel = frame.dataset.scene === 'menu' ? '返回菜单' : '返回工坊';
      root.querySelectorAll('[data-polish="back"]').forEach(button => { button.textContent = backLabel; });
      hint.textContent = '绒布已选中 · 按住拖动 · 本次试玩刷新后重置';
      onOpenChange(true);
      canvas.focus({ preventScroll: true });
    },
    close,
    reset() {
      endStroke();
      setResultVisible(false);
      surface.reset();
      announced = -1;
      draw();
    },
    setPaused,
  };
}
