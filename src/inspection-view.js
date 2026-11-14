import { INSPECTION_QUESTIONS, MATERIAL_GUIDES } from './inspection.js';
import { createDraft, getCraftSurface, LAYOUT_PRESETS } from './craft-model.js';
import { drawArtisanPiece } from './piece-renderer.js';
import './inspection.css';

const SHAPES = { fish: '玉鱼佩', bi: '玉璧', seal: '玉印' };
const FEATURES = { color: '寻色带', spot: '看色斑', crack: '察细纹' };
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function centroid(mask, size) {
  let x = 0, y = 0, count = 0;
  mask.forEach((value, index) => { if (value) { x += index % size + .5; y += Math.floor(index / size) + .5; count++; } });
  return count ? { x: x / count / size, y: y / count / size } : { x: .5, y: .5 };
}

function bandShare(surface) {
  let total = 0, band = 0;
  surface.target.forEach((value, index) => { if (value) { total++; band += surface.colorBand[index]; } });
  return Math.round(band / Math.max(1, total) * 100);
}

/** Inspection only passes a design intention; it never reserves or manufactures a material. */
export function createInspectionView({ store, show, button, onCreate = () => {} }) {
  let selectedMaterial = 0, selectedShape = 'fish', selectedLayout = 'color';
  let questionIndex = 0, feature = 'color', feedback = null, quizOpen = false;
  let mode = 'normal', zoom = 1, light = -.65, paper = false;
  let pan = { x: .5, y: .5 }, dispose = () => {};

  function render() {
    dispose();
    const previousScroll = document.querySelector('dialog .dialog-body')?.scrollTop ?? 0;
    const inventory = store.state.inventory;
    if (!store.active || store.state.location !== 'workshop' || !inventory.length) {
      show('观玉 · 石中有意', '<section class="inspection-view inspection-empty"><div class="inspection-empty-seal" aria-hidden="true">玉</div><h3>先寻一块玉</h3><p>从矿洞带回原石，放到观察台上。看看它的色带、色斑和细纹，再想想它能成为什么。</p></section>', button('返回', 'close'));
      return;
    }
    selectedMaterial = Math.min(selectedMaterial, inventory.length - 1);
    const material = inventory[selectedMaterial], guide = MATERIAL_GUIDES[material.material];
    const drafts = Object.fromEntries(Object.entries(LAYOUT_PRESETS).map(([name, layout]) => [name, createDraft(material, selectedShape, layout)]));
    const surface = getCraftSurface(drafts[selectedLayout]);
    const percentages = Object.fromEntries(Object.entries(drafts).map(([name, draft]) => [name, bandShare(getCraftSurface(draft))]));
    const position = `${surface.spot.y < -.035 ? '偏上' : surface.spot.y > .035 ? '偏下' : '中部'}${surface.spot.x < -.035 ? '靠左' : surface.spot.x > .035 ? '靠右' : ''}`;
    const notes = {
      color: { title: '让天然颜色成为画面', text: `浅色带穿过这块玉。试放${SHAPES[selectedShape]}纸样：方案一留下的部分中，浅色约占 ${percentages.color}%；方案二约占 ${percentages.light}%。看看哪一段更像鱼背、云气或一束光。`, teaching: guide.hotspots[0].text },
      spot: { title: '一处色斑，也可以点睛', text: `这处深色斑在原石${position}。放大后再转动纸样，比较它落在器物的中心、边缘，还是留在余料中。保留或避开，都会改变作品。`, teaching: '色斑的位置随这块原石保留。观察到的颜色可以成为构图线索，制作前先试两种安排。' },
      crack: { title: '先看边缘，再落纸样', text: '右侧边缘有一条细纹。切到透光观察，把它与纸样边缘一起看；两套纸样都可以尝试，制作时保留区受到保护。', teaching: guide.hotspots[1].text },
    };
    const question = INSPECTION_QUESTIONS[questionIndex];
    const completed = store.state.inspectionAnswers.includes(question.id);
    show('观玉 · 石中有意', `<section class="inspection-view">
      <div class="inspection-heading"><div><p>一石一相</p><h3>${escape(guide.name)}</h3></div><label for="inspect-material">桌上的原石<select id="inspect-material" aria-label="选择观察的原石">${inventory.map((item, index) => `<option value="${index}" ${selectedMaterial === index ? 'selected' : ''}>${escape(MATERIAL_GUIDES[item.material].name)} · ${index + 1} 号</option>`).join('')}</select></label></div>
      <div class="inspection-layout">
        <section class="inspection-observe" aria-label="圆形玉材观察台">
          <div class="inspection-lens"><canvas width="420" height="420" tabindex="0" aria-label="原石圆形观察窗；拖动或方向键移动，按加减号缩放"></canvas><span class="inspection-lens-label" data-lens-label>天然色带</span></div>
          <div class="inspection-tools" aria-label="观察工具">${[['normal', '观', '看本色'], ['side', '光', '移侧光'], ['translucent', '透', '看透光']].map(([id, mark, label]) => `<button type="button" data-inspect-mode="${id}" aria-pressed="${mode === id}"><span aria-hidden="true">${mark}</span>${label}</button>`).join('')}</div>
          <div class="inspection-adjustments"><label for="inspect-zoom">放大 <output data-zoom>${zoom.toFixed(1)}×</output><input id="inspect-zoom" type="range" min="1" max="2.8" step=".1" value="${zoom}"></label><label for="inspect-light">移动侧光<input id="inspect-light" type="range" min="-100" max="100" step="5" value="${light * 100}"></label></div>
          <div class="inspection-lens-footer"><span>拖动看局部 · 透光为观察示意</span><button type="button" data-inspect-center>回到全貌</button></div>
        </section>
        <aside class="inspection-scroll" aria-label="观察笔记与设计预览">
          <p class="inspection-scroll-caption">观 玉 手 记</p><h3 data-note-title>${escape(notes[feature].title)}</h3>
          <div class="inspection-hotspots" aria-label="原石特征">${Object.entries(FEATURES).map(([id, label]) => `<button type="button" data-inspect-hotspot="${id}" aria-pressed="${feature === id}">${label}</button>`).join('')}</div>
          <p class="inspection-personal-note" data-personal-note aria-live="polite">${escape(notes[feature].text)}</p>
          <div class="inspection-sample-controls"><label for="inspect-shape">试放纸样<select id="inspect-shape">${Object.entries(SHAPES).map(([id, name]) => `<option value="${id}" ${selectedShape === id ? 'selected' : ''}>${name}</option>`).join('')}</select></label><button type="button" data-inspect-paper aria-pressed="${paper}">显示纸样</button></div>
          <div class="inspection-previews" aria-label="同一块玉的两种设计">${[['color', '方案一 · 留色'], ['light', '方案二 · 留白']].map(([id, label]) => `<button type="button" data-inspect-layout="${id}" aria-pressed="${selectedLayout === id}"><canvas width="160" height="150" aria-label="${label}的玉料与纸样预览"></canvas><strong>${label}</strong><small>保留区中浅色 ${percentages[id]}%</small></button>`).join('')}</div>
          <p class="inspection-paper-note">金线内是将留下的玉，试着让颜色成为器物的一部分。</p>
          <button type="button" class="inspection-create primary" data-inspect-create>带着观察去设计</button>
          <p class="inspection-teaching" data-teaching>${escape(notes[feature].teaching)}</p>
          <a class="inspection-source" href="${escape(guide.source.url)}" target="_blank" rel="noopener noreferrer">材料知识来源 · ${escape(guide.source.title)}</a>
        </aside>
      </div>
      <details class="inspection-knowledge" ${quizOpen ? 'open' : ''}><summary><span>玉文化知识卡</span><span>已掌握 ${store.state.inspectionAnswers.length} / ${INSPECTION_QUESTIONS.length} · 展开复习</span></summary>
        <section class="inspection-quiz" aria-label="识玉答题"><div class="inspection-question-area"><p class="inspection-count">第 ${questionIndex + 1} 题${completed ? ' · 已掌握，可复习' : ''}</p><h3 class="inspection-question">${escape(question.prompt)}</h3><div class="inspection-choices">${question.choices.map((choice, index) => `<button type="button" data-inspect-choice="${index}">${escape(choice)}</button>`).join('')}</div></div><div class="inspection-answer-area">${feedback ? `<div class="inspection-feedback ${feedback.correct ? 'correct' : 'wrong'}" role="status"><strong>${feedback.correct ? feedback.alreadyAnswered ? '这道题已经掌握' : '答对了' : '再想一想'}</strong><p>${escape(feedback.correct ? question.explanation : '可以参考观察笔记和资料来源，再选一次。')}</p></div>` : '<p class="inspection-note">先观察，再用知识卡整理发现。每道题首次答对会留下记录。</p>'}<div class="inspection-navigation"><button type="button" data-inspect-question="previous">上一题</button><button type="button" data-inspect-question="next">下一题</button></div><a class="inspection-source" href="${escape(question.source.url)}" target="_blank" rel="noopener noreferrer">资料来源 · ${escape(question.source.title)}</a></div></section>
      </details>
    </section>`, button('返回工坊', 'close'), true);

    const dialog = document.querySelector('dialog'), root = dialog.querySelector('.inspection-view');
    const canvas = root.querySelector('.inspection-lens canvas');
    const controller = new AbortController();
    const listen = (target, name, callback) => target.addEventListener(name, callback, { signal: controller.signal });
    let frame = null, drag = null;
    const point = id => id === 'spot' ? { x: .5 + surface.spot.x, y: .5 + surface.spot.y }
      : centroid(id === 'color' ? surface.colorBand.map((value, index) => value && surface.original[index]) : surface.crack, surface.size);

    function paint() {
      frame = null;
      const context = canvas.getContext('2d'), center = 210;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = false;
      context.fillStyle = '#0c1520'; context.fillRect(0, 0, 420, 420);
      for (const [radius, color] of [[200, '#0a1119'], [194, '#526762'], [186, '#243d3b'], [180, '#152429']]) {
        context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.fillStyle = color; context.fill();
      }
      context.save(); context.beginPath(); context.arc(center, center, 176, 0, Math.PI * 2); context.clip();
      context.fillStyle = mode === 'translucent' ? '#253d30' : '#101e21'; context.fillRect(0, 0, 420, 420);
      const size = 342 * zoom, x = center - pan.x * size, y = center - pan.y * size;
      drawArtisanPiece(context, drafts[selectedLayout], { x, y, size, light: mode === 'side' ? light : -.65, raw: true, design: paper, guide: paper });
      if (mode === 'side') {
        const glow = context.createLinearGradient(light < 0 ? 35 : 385, 70, light < 0 ? 385 : 35, 300);
        glow.addColorStop(0, 'rgba(235,220,156,.22)'); glow.addColorStop(.6, 'rgba(10,25,21,0)'); glow.addColorStop(1, 'rgba(3,12,17,.3)');
        context.fillStyle = glow; context.fillRect(0, 0, 420, 420);
      }
      const unit = size / surface.size;
      if (mode === 'translucent') {
        for (let index = 0; index < surface.original.length; index++) if (surface.original[index]) {
          if (surface.colorBand[index]) { context.fillStyle = 'rgba(220,241,167,.22)'; context.fillRect(x + index % surface.size * unit, y + Math.floor(index / surface.size) * unit, unit, unit); }
          if (surface.crack[index]) { context.fillStyle = '#d7bd7d'; context.fillRect(x + index % surface.size * unit, y + Math.floor(index / surface.size) * unit, unit * .7, unit * .7); }
        }
      } else if (feature === 'crack') {
        context.fillStyle = '#bdad79';
        for (let index = 0; index < surface.crack.length; index++) if (surface.crack[index]) context.fillRect(x + index % surface.size * unit, y + Math.floor(index / surface.size) * unit, unit * .45, unit * .45);
      }
      const marker = point(feature), mx = x + marker.x * size, my = y + marker.y * size;
      context.strokeStyle = '#eee0a9'; context.lineWidth = 1;
      context.beginPath(); context.arc(mx, my, 13, 0, Math.PI * 2); context.stroke();
      context.beginPath(); context.moveTo(mx - 21, my); context.lineTo(mx - 7, my); context.moveTo(mx + 7, my); context.lineTo(mx + 21, my); context.moveTo(mx, my - 21); context.lineTo(mx, my - 7); context.moveTo(mx, my + 7); context.lineTo(mx, my + 21); context.stroke();
      context.strokeStyle = '#101e1a88'; context.beginPath(); context.moveTo(40, center); context.lineTo(380, center); context.moveTo(center, 40); context.lineTo(center, 380); context.stroke();
      context.restore();
      context.strokeStyle = '#c7b98a'; context.lineWidth = 1;
      for (let index = 0; index < 40; index++) {
        const angle = index / 40 * Math.PI * 2, inner = index % 5 === 0 ? 182 : 186;
        context.beginPath(); context.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
        context.lineTo(center + Math.cos(angle) * 190, center + Math.sin(angle) * 190); context.stroke();
      }
      root.querySelector('[data-lens-label]').textContent = `${mode === 'translucent' ? '透光观察' : mode === 'side' ? '侧光观察' : '本色观察'} · ${zoom.toFixed(1)}×`;
      root.querySelector('[data-zoom]').textContent = `${zoom.toFixed(1)}×`;
    }

    const redraw = () => { if (frame === null) frame = requestAnimationFrame(paint); };
    function setFeature(id) {
      feature = id;
      root.querySelectorAll('[data-inspect-hotspot]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.inspectHotspot === id)));
      root.querySelector('[data-note-title]').textContent = notes[id].title;
      root.querySelector('[data-personal-note]').textContent = notes[id].text;
      root.querySelector('[data-teaching]').textContent = notes[id].teaching;
      if (zoom > 1.4) pan = point(id);
      redraw();
    }

    listen(root.querySelector('#inspect-material'), 'change', event => {
      selectedMaterial = Number(event.target.value); feature = 'color'; pan = { x: .5, y: .5 }; zoom = 1; feedback = null;
      render(); document.querySelector('#inspect-material')?.focus();
    });
    listen(root.querySelector('#inspect-shape'), 'change', event => { selectedShape = event.target.value; render(); document.querySelector('#inspect-shape')?.focus(); });
    root.querySelectorAll('[data-inspect-hotspot]').forEach(control => listen(control, 'click', () => setFeature(control.dataset.inspectHotspot)));
    root.querySelectorAll('[data-inspect-mode]').forEach(control => listen(control, 'click', () => {
      mode = control.dataset.inspectMode;
      root.querySelectorAll('[data-inspect-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === control)));
      redraw();
    }));
    root.querySelectorAll('[data-inspect-layout]').forEach(control => listen(control, 'click', () => {
      selectedLayout = control.dataset.inspectLayout; paper = true;
      root.querySelectorAll('[data-inspect-layout]').forEach(item => item.setAttribute('aria-pressed', String(item === control)));
      root.querySelector('[data-inspect-paper]').setAttribute('aria-pressed', 'true');
      redraw();
    }));
    listen(root.querySelector('[data-inspect-paper]'), 'click', event => { paper = !paper; event.currentTarget.setAttribute('aria-pressed', String(paper)); redraw(); });
    listen(root.querySelector('#inspect-zoom'), 'input', event => { zoom = Number(event.target.value); redraw(); });
    listen(root.querySelector('#inspect-light'), 'input', event => {
      light = Number(event.target.value) / 100; mode = 'side';
      root.querySelectorAll('[data-inspect-mode]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.inspectMode === mode)));
      redraw();
    });
    listen(root.querySelector('[data-inspect-center]'), 'click', () => { pan = { x: .5, y: .5 }; zoom = 1; root.querySelector('#inspect-zoom').value = '1'; redraw(); });
    listen(canvas, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); canvas.focus(); canvas.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: { ...pan } };
    });
    listen(canvas, 'pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const scale = canvas.width / canvas.getBoundingClientRect().width;
      pan = { x: clamp(drag.pan.x - (event.clientX - drag.x) * scale / (342 * zoom), .12, .88),
        y: clamp(drag.pan.y - (event.clientY - drag.y) * scale / (342 * zoom), .12, .88) };
      redraw();
    });
    const release = () => { if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id); drag = null; };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(canvas, name, release);
    listen(canvas, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
      event.preventDefault();
      pan.x = clamp(pan.x + (event.key === 'ArrowLeft' ? -.04 : event.key === 'ArrowRight' ? .04 : 0), .12, .88);
      pan.y = clamp(pan.y + (event.key === 'ArrowUp' ? -.04 : event.key === 'ArrowDown' ? .04 : 0), .12, .88);
      if (['+', '=', '-'].includes(event.key)) { zoom = clamp(zoom + (event.key === '-' ? -.2 : .2), 1, 2.8); root.querySelector('#inspect-zoom').value = zoom.toFixed(1); }
      redraw();
    });
    listen(root.querySelector('[data-inspect-create]'), 'click', () => {
      if (!store.active || store.state.location !== 'workshop' || !store.state.inventory.some(item => item.id === material.id)) { render(); return; }
      dispose();
      onCreate({ materialId: material.id, shape: selectedShape, layout: { ...LAYOUT_PRESETS[selectedLayout] }, observedFeature: feature });
    });
    listen(root.querySelector('.inspection-knowledge'), 'toggle', event => { quizOpen = event.target.open; });
    root.querySelectorAll('[data-inspect-choice]').forEach(control => listen(control, 'click', () => {
      const choice = Number(control.dataset.inspectChoice);
      feedback = store.answerInspection(question.id, choice); quizOpen = true;
      render(); document.querySelector(`[data-inspect-choice="${choice}"]`)?.focus();
    }));
    root.querySelectorAll('[data-inspect-question]').forEach(control => listen(control, 'click', () => {
      const direction = control.dataset.inspectQuestion === 'next' ? 1 : -1;
      questionIndex = (questionIndex + direction + INSPECTION_QUESTIONS.length) % INSPECTION_QUESTIONS.length;
      feedback = null; quizOpen = true;
      render(); document.querySelector(`[data-inspect-question="${control.dataset.inspectQuestion}"]`)?.focus();
    }));
    listen(dialog, 'close', () => dispose());
    dispose = () => { controller.abort(); if (frame !== null) cancelAnimationFrame(frame); frame = null; drag = null; dispose = () => {}; };
    root.querySelectorAll('[data-inspect-layout]').forEach(control => {
      const preview = control.querySelector('canvas'), context = preview.getContext('2d');
      context.fillStyle = '#142b24'; context.fillRect(0, 0, preview.width, preview.height);
      drawArtisanPiece(context, drafts[control.dataset.inspectLayout], { x: 12, y: 7, size: 136, raw: true, design: true, guide: true });
    });
    paint();
    dialog.querySelector('.dialog-body').scrollTop = previousScroll;
  }

  return {
    open() {
      feedback = null;
      const unanswered = INSPECTION_QUESTIONS.findIndex(question => !store.state.inspectionAnswers.includes(question.id));
      questionIndex = unanswered < 0 ? 0 : unanswered;
      render();
    },
    dispose() { dispose(); },
  };
}
