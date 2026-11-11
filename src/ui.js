import { paintMineIcon } from './mine-art.js';
import { validateState, PREV_BACKUP_KEY } from './state.js';
import { icon, CODEX } from './icons.js';
import { createMenuLogo } from './menu-art.js';
import './menu.css';
import { createWorkshopReference } from './workshop-reference.js';

const NAMES = { workshop: '玉作工坊', mine: '青岚矿洞', gallery: '像素数字展厅' };
const SHAPES = { bi: '玉璧', fish: '玉鱼佩', seal: '玉印' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createInterface(store, materials, taskList, { onOverlayChange = () => {}, onPolish = () => {}, onMine = () => {} } = {}) {
  const root = document.querySelector('#interface');
  const frame = document.querySelector('#game');
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  document.body.append(dialog);
  let closeCallback = null;
  let returnFocus;
  let audio;
  let inventoryTab = 'raw';
  let selectedItem = 0;
  let toastTimer;
  let workshopRevision = store.sessionRevision;
  const workshop = createWorkshopReference({
    onAction: action => {
      store.acknowledgeOpening();
      sound();
      actions[action]?.();
    },
  });
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status'); frame.append(toast);
  function notify(message) {
    clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
  }
  const resize = () => {
    const width = frame.classList.contains('reference-mode') ? 1024 : 960;
    root.style.transform = `scale(${frame.clientWidth / width})`;
  };
  new ResizeObserver(resize).observe(frame);
  resize();
  const button = (label, action, className = '', disabled = false) => `<button class="${className}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  const workshopTools = document.createElement('nav');
  workshopTools.className = 'workshop-page-tools';
  workshopTools.setAttribute('aria-label', '游戏导航');
  workshopTools.hidden = true;
  workshopTools.innerHTML = button('工坊', 'workshop') + button('矿洞', 'mine') + button('展厅', 'gallery') + button('行囊', 'inventory') + button('委托', 'tasks') + button('设置', 'settings') + button('主菜单', 'menu');
  document.querySelector('.frame-heading').append(workshopTools);
  const workshopWarning = document.createElement('p');
  workshopWarning.className = 'workshop-save-warning';
  workshopWarning.setAttribute('role', 'status');
  workshopWarning.hidden = true;
  frame.after(workshopWarning);
  workshopWarning.addEventListener('click', handle);
  function sound(miningHit = false) {
    const { muted, volume } = store.state.settings;
    if (muted || !volume) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      void audio.resume().catch(() => {});
      const tone = audio.createOscillator(), gain = audio.createGain();
      tone.type = miningHit ? 'triangle' : 'sine'; tone.frequency.setValueAtTime(miningHit ? 220 : 660, audio.currentTime);
      tone.frequency.exponentialRampToValueAtTime(miningHit ? 80 : 440, audio.currentTime + .07);
      gain.gain.setValueAtTime(volume * .12, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .1);
      tone.connect(gain); gain.connect(audio.destination);
      tone.start(); tone.stop(audio.currentTime + .11);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    } catch { /* Audio availability never blocks play. */ }
  }
  function close() { dialog.close(); }
  dialog.addEventListener('close', () => {
    const callback = closeCallback; closeCallback = null;
    onOverlayChange(false);
    workshop.setPaused('overlay', false);
    callback?.();
    if (dialog.open) return;
    if (returnFocus?.isConnected) returnFocus.focus();
    else root.querySelector('button:not(:disabled)')?.focus();
  });
  function show(title, body, actions = '', wide = false) {
    if (!dialog.open) returnFocus = document.activeElement;
    dialog.classList.toggle('wide', wide);
    dialog.innerHTML = `<header><h2 id="dialog-title">${title}</h2>${button('关闭', 'close', 'quiet')}</header><div class="dialog-body">${body}</div>${actions ? `<div class="dialog-actions">${actions}</div>` : ''}`;
    if (!dialog.open) { dialog.showModal(); onOverlayChange(true); workshop.setPaused('overlay', true); }
  }
  function confirm(title, body, label, callback, cancelLabel = '保留当前进度') {
    show(title, `<p>${body}</p>`, button(cancelLabel, 'close', 'quiet') + button(label, 'confirm', 'primary'));
    closeCallback = null;
    dialog.querySelector('[data-action="confirm"]').onclick = () => {
      // Complete after closing, so nested error dialogs keep their focus and visibility.
      closeCallback = callback; close();
    };
    dialog.querySelector('[data-action="close"]').focus();
  }
  function download(content, name) {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function chooseImport() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try {
        if (file.size > 2_000_000) throw new Error('请选择小于 2 MB 的存档文件。');
        const raw = await file.text();
        // Validate using the same schema without writing anything.
        validateState(JSON.parse(raw));
        confirm('导入存档备份', '这份备份将替换当前进度。建议先导出当前存档；取消可保留原进度。', '确认导入', () => {
          try { store.importSave(raw); } catch (error) { show('导入未完成', `<p>${escape(error.message)}</p>`); }
        });
      } catch (error) {
        show('无法导入备份', `<p>${escape(error instanceof SyntaxError ? '文件不是有效的 JSON 存档，原进度已保留。' : error.message)}</p>`);
      }
    };
    input.click();
  }
  function settings() {
    const { muted, volume } = store.state.settings;
    show('声音与存档', `
      <label class="setting-row"><span>静音</span><input id="muted" type="checkbox" ${muted ? 'checked' : ''}></label>
      <label class="setting-row" for="volume">提示音音量 <output id="volume-label">${Math.round(volume * 100)}%</output></label>
      <input id="volume" type="range" min="0" max="100" value="${Math.round(volume * 100)}">
      <p class="muted">当前提供按钮提示音。场景音乐与加工音效将随玩法加入。</p>
      <hr><h3>本地单档</h3><p>进度保存在当前浏览器。清理浏览器数据前，请导出备份。</p>
      <div class="save-summary"><span>${store.dirty ? '有未保存的进度' : store.hasSave ? '本地已有存档' : '尚未开始旅程'}</span><small>${store.state.updatedAt ? escape(new Date(store.state.updatedAt).toLocaleString('zh-CN')) : '开始旅程后自动保存'}</small></div>
      <div class="backup-actions">${button('导出存档', 'export', '', !store.hasSession)}${button('导入备份', 'import')}${store.error ? button('导出原始数据', 'raw') : ''}${store.hasSession ? button('立即保存', 'save') : ''}${store.recovery() ? button('恢复上一份存档', 'recover') : ''}${store.recovery(PREV_BACKUP_KEY) ? button('恢复更早存档', 'recoverEarlier') : ''}</div>
      <p class="muted">${store.active ? '切换地点与调整设置后自动保存。' : '开始或继续游戏后，声音设置随进度保存。'}</p>
      <p id="settings-error" class="error">${escape(store.error)}</p>`);
    const update = () => {
      store.configure({ muted: dialog.querySelector('#muted').checked, volume: Number(dialog.querySelector('#volume').value) / 100 });
      dialog.querySelector('#volume-label').value = `${dialog.querySelector('#volume').value}%`;
      dialog.querySelector('#settings-error').textContent = store.error;
    };
    dialog.querySelector('#muted').onchange = update;
    dialog.querySelector('#volume').oninput = update;
    dialog.querySelector('#volume').onchange = () => sound();
  }
  function inventory() {
    const isCodex = inventoryTab === 'codex';
    const items = isCodex ? CODEX : inventoryTab === 'raw' ? store.state.inventory : store.state.pieces;
    selectedItem = Math.min(selectedItem, Math.max(0, items.length - 1));
    const item = items[selectedItem];
    const itemName = value => isCodex ? value.name : inventoryTab === 'raw' ? materials[value.material].name : SHAPES[value.shape];
    const itemIcon = value => icon(isCodex ? value.id : value.shape ?? 'stone');
    const unlocked = item && (!isCodex || store.state.discoveries.includes(item.id));
    const count = Math.max(isCodex ? 6 : 12, items.length);
    show('藏玉行囊', `<div class="inventory-top"><p>玉作学徒的收藏</p><span>原石 ${store.state.inventory.length}/12 · 成品 ${store.state.pieces.length}</span></div>
      <div class="inventory-layout"><div><div class="inventory-grid">${Array.from({ length: count }, (_, i) => {
        const entry = items[i];
        return entry ? `<button class="slot ${selectedItem === i ? 'selected' : ''} ${isCodex && !store.state.discoveries.includes(entry.id) ? 'uncollected' : ''}" data-item="${i}" aria-label="${itemName(entry)}" aria-pressed="${selectedItem === i}">${itemIcon(entry)}<span>${itemName(entry)}</span></button>` : `<div class="slot empty" aria-label="空格 ${i+1}"><span>${String(i + 1).padStart(2, '0')}</span></div>`;
      }).join('')}</div><p class="inventory-hint">${isCodex ? '六种器物，慢慢相识。' : inventoryTab === 'raw' ? '每块原石占一格 · 满包时采集会提前提示' : '完成制作后，作品会保存在这里。'}</p></div>
      <aside class="item-detail"><div class="detail-art ${!unlocked ? 'uncollected' : ''}">${item ? itemIcon(item) : icon('bag')}</div><span class="detail-kind">${isCodex ? '器物图鉴' : inventoryTab === 'raw' ? '天然玉材 · 游戏材料' : '玉作成品'}</span><h3>${item ? itemName(item) : '空空的行囊'}</h3><p>${!item ? '第一块玉石，正等待与你相遇。矿洞采集接入后，材料会自动放入这里。' : isCodex ? unlocked ? '已收录。文化说明与资料来源将经核验后补入。' : '尚未收录。完成对应器物的制作与探索，逐步充实你的图鉴。' : inventoryTab === 'raw' ? '可用于后续的观察鉴赏与玉器制作。每件成品消耗一块原石。' : '可在后续的定制与展厅中继续完善、陈列。'}</p><div class="detail-status">${isCodex ? unlocked ? '已收录' : '等待收录' : item ? '已收入行囊' : '未获得材料'}</div>${item && !isCodex ? `<small>材质：${materials[item.material].name}</small>` : ''}${isCodex ? '<small>资料核验中，暂无历史说明。</small>' : ''}</aside></div>
      `, `<nav class="inventory-tabs" aria-label="行囊分类">${[['raw','原石'],['pieces','成品'],['codex','图鉴']].map(([id,label])=>`<button data-tab="${id}" aria-pressed="${inventoryTab === id}">${label}</button>`).join('')}</nav>`, true);
    dialog.querySelectorAll('[data-tab]').forEach(tab => tab.onclick = () => { inventoryTab = tab.dataset.tab; selectedItem = 0; sound(); inventory(); dialog.querySelector(`[data-tab="${inventoryTab}"]`).focus(); });
    dialog.querySelectorAll('[data-item]').forEach(slot => slot.onclick = () => { selectedItem = Number(slot.dataset.item); sound(); inventory(); dialog.querySelector(`[data-item="${selectedItem}"]`).focus(); });
  }
  function tasks() {
    show('师傅的首展委托', `<blockquote>“先识一石，再琢一器。待三件作品齐备，我们便办一场小展。”</blockquote>
      <ol class="task-list">${taskList(store.state).map(t => `<li class="${t.done ? 'done' : ''}"><span class="task-mark">${t.done ? '✓' : '○'}</span><div><h3>${t.name}</h3><p>${t.detail}</p></div></li>`).join('')}</ol>
      <p class="muted">委托进度由采集、鉴赏、制作与陈列记录自动计算。后续玩法接入后推进。</p>`);
  }
  function exitGame() {
    confirm('退出游戏？', '游戏进度保存在当前浏览器。退出后，打磨试玩进度会重置。', '确认退出', () => {
      if (store.dirty && !store.retrySave()) {
        show('进度尚未保存', '<p>保存失败，请先导出存档备份，再关闭标签页。</p>', button('导出存档', 'export') + button('返回', 'close', 'primary'));
        return;
      }
      window.close();
      setTimeout(() => {
        if (!window.closed) {
          show('关闭游戏标签页', '<p>浏览器保留了这个标签页。请点击标签页的关闭按钮，或按 Ctrl＋W 退出游戏。</p>', button('返回主菜单', 'close', 'primary'));
        }
      }, 250);
    }, '继续游戏');
  }
  function startJourney() {
    store.startNew();
  }
  const actions = {
    mentor: () => show('师傅的首展委托', '<p>从一块原石开始，识玉、琢玉，完成玉璧、玉鱼佩与玉印，为工坊筹备第一场小展。</p><p>点击雕刻台可练习打磨。右侧可选择玉种和纹样，生成本次界面试作。</p>'),
    exit: exitGame,
    new: () => store.hasSave || store.error || store.active ? confirm('重新开始旅程？', '重新开始将覆盖当前本地存档。你可以取消，并先在“声音与存档”中导出备份。', '确认重新开始', startJourney) : startJourney(),
    continue: () => store.resume(), mine: () => store.navigate('mine'), workshop: () => store.navigate('workshop'), gallery: () => store.navigate('gallery'),
    inventory: () => { inventoryTab = 'raw'; selectedItem = 0; inventory(); }, tasks, settings, close, import: chooseImport,
    save: () => { const ok = store.retrySave(); notify(ok ? '进度已保存' : '未能保存，请导出备份'); if (dialog.open) settings(); },
    recover: () => confirm('恢复上一份存档？', '将恢复最近一次成功保存前的进度。当前存档会被替换，建议先导出备份。', '确认恢复', () => { try { store.recover(); notify('已恢复上一份存档'); } catch(error) { show('恢复未完成', `<p>${escape(error.message)}</p>`); } }),
    recoverEarlier: () => confirm('恢复更早存档？', '将恢复前一份备份中的进度。当前存档会被替换，建议先导出备份。', '确认恢复', () => { try { store.recover(PREV_BACKUP_KEY); notify('已恢复更早存档'); } catch(error) { show('恢复未完成', `<p>${escape(error.message)}</p>`); } }),
    help: () => show('玉作学徒手册', '<p>从矿洞寻石，带回工坊识玉、琢玉，最后在展厅陈列你的作品。</p><dl class="key-guide"><dt>B</dt><dd>打开行囊</dd><dt>J</dt><dd>查看委托</dd><dt>G</dt><dd>玉器图鉴</dd><dt>M</dt><dd>静音／恢复声音</dd><dt>F</dt><dd>切换全屏</dd><dt>Esc</dt><dd>关闭面板／暂停</dd></dl><p class="muted">当前为基础系统版本。矿洞采集、鉴赏、加工和布展将逐项接入；鼠标可以完成所有现有操作。</p>'),
    fullscreen: async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await frame.requestFullscreen(); } catch { notify('此环境不支持全屏，可以放大浏览器窗口'); } },
    mute: () => { store.configure({ ...store.state.settings, muted: !store.state.settings.muted }); notify(store.state.settings.muted ? '已静音' : '声音已开启'); },
    export: () => download(store.exportSave(), 'pixel-jadecraft-save.json'),
    raw: () => { try { download(store.exportOriginal(), 'pixel-jadecraft-original.json'); } catch { show('无法读取原数据', '<p>浏览器存储不可用，请检查权限。</p>'); } },
    menu: () => store.menu(),
    pause: () => show('稍歇片刻', '<p>喝一盏茶，再继续你的琢玉之旅。</p>', button('继续旅程', 'close', 'primary') + button('返回主菜单', 'to-menu', 'quiet')),
    'to-menu': () => { closeCallback = () => store.menu(); close(); },
    inspect: () => show('鉴赏台', '<p>观察光泽、纹理和透光示意，认识不同玉材。</p><p class="muted">鉴赏热点与六道知识题将在鉴赏阶段接入。</p>'),
    craft: onPolish,
    pickaxe: onMine,
    codex: () => { inventoryTab = 'codex'; selectedItem = 0; inventory(); },
  };
  function handle(event) {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    if (target.dataset.action !== 'confirm') { sound(); actions[target.dataset.action]?.(); }
  }
  root.addEventListener('click', handle); dialog.addEventListener('click', handle);
  workshopTools.addEventListener('click', handle);
  document.addEventListener('visibilitychange', () => workshop.setPaused('hidden', document.hidden));
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (dialog.open) return;
    if (event.key === 'Escape' && store.active) { event.preventDefault(); actions.pause(); return; }
    const shortcuts = { b:'inventory', j:'tasks', g:'codex', m:'mute', f:'fullscreen' };
    const action = shortcuts[event.key.toLowerCase()];
    if (action && (store.active || ['mute','fullscreen'].includes(action))) { event.preventDefault(); sound(); actions[action](); }
  });
  function render() {
    const state = store.state;
    const isWorkshop = store.active && state.location === 'workshop';
    const focusedAction = root.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    const saveText = store.dirty ? '进度尚未保存' : store.hasSave ? '本地存档已保存' : '尚无本地存档';
    frame.classList.toggle('reference-mode', isWorkshop);
    root.classList.toggle('mine-interface', store.active && state.location === 'mine');
    root.style.width = `${isWorkshop ? 1024 : 960}px`;
    root.style.height = `${isWorkshop ? 559 : 540}px`;
    workshopTools.hidden = !isWorkshop && !(store.active && state.location === 'mine');
    workshopWarning.hidden = !isWorkshop || !store.error;
    workshopWarning.innerHTML = store.error ? `${escape(store.error)} ${store.dirty ? button('重试保存', 'save') : ''}` : '';
    workshop.setPaused('inactive', !isWorkshop);
    workshop.setPaused('hidden', document.hidden);
    if (workshopRevision !== store.sessionRevision) {
      workshop.reset();
      workshopRevision = store.sessionRevision;
    }
    resize();
    if (isWorkshop) {
      if (!workshop.element.isConnected) root.replaceChildren(workshop.element);
      workshop.render();
      return;
    }
    if (!store.active) {
      root.innerHTML = `<section class="landscape-menu" aria-label="游戏主菜单">
        <h1 class="menu-title"><span class="screen-reader-text">Pixel Jadecraft · 像素琢玉</span></h1>
        <p class="menu-chinese-title">像 素 琢 玉</p>
        <nav class="landscape-menu-actions" aria-label="开始游戏">
          ${button('继续旅程', 'continue', '', !store.hasSession)}${button('开启旅程', 'new')}${button('试玩玉璧打磨', 'craft')}${button('玉器图鉴', 'codex')}${button('学徒手册', 'help')}${button('设置', 'settings')}${button('退出游戏', 'exit')}
        </nav>
        ${store.error ? `<p class="menu-error" role="status">存档或设置需要处理，请打开“设置”查看。</p>` : ''}
      </section>`;
      root.querySelector('.menu-title').append(createMenuLogo());
      if (focusedAction) root.querySelector(`[data-action="${focusedAction}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (state.location === 'mine') {
      root.innerHTML = `<header class="mine-status"><span class="mine-hearts" aria-label="体力 ${state.stamina}/100">♥ ♥ ♥ ♥ ♥</span><span>JADE <b>${String(state.inventory.length).padStart(2, '0')}</b> / 12</span><strong>青岚矿洞</strong>${button('Ⅱ', 'pause', 'mine-pause')}</header>
        <nav class="mine-tools" aria-label="矿洞工具">${button('<canvas data-mine-icon="pick"></canvas><kbd>E</kbd>', 'pickaxe')}${button('<canvas data-mine-icon="white"></canvas><kbd>B</kbd>', 'inventory')}${button('<canvas data-mine-icon="green"></canvas><kbd>G</kbd>', 'codex')}</nav>
        <p class="mine-controls">A D 行走　W S 爬梯　E / 空格 挥镐</p>
        ${store.error ? `<div class="save-status save-warning">${escape(store.error)}${button('重试保存', 'save')}</div>` : ''}`;
      root.querySelectorAll('[data-mine-icon]').forEach(canvas => paintMineIcon(canvas, canvas.dataset.mineIcon));
      root.querySelector('[data-action="pickaxe"]').setAttribute('aria-label', '挥镐采集');
      root.querySelector('[data-action="inventory"]').setAttribute('aria-label', '打开行囊');
      root.querySelector('[data-action="codex"]').setAttribute('aria-label', '打开图鉴');
      if (focusedAction) root.querySelector(`[data-action="${focusedAction}"]`)?.focus({ preventScroll: true });
      return;
    }
    const location = state.location;
    const objectives = taskList(state);
    const complete = objectives.filter(task => task.done).length;
    root.innerHTML = `<header class="hud"><div class="place-name"><span class="seal">玉</span><div><strong>${NAMES[location]}</strong><small>玉作学徒 · 首展之约</small></div></div><div class="stamina"><div><span>体力</span><strong>${state.stamina}<small> / 100</small></strong></div><meter min="0" max="100" value="${state.stamina}" aria-label="体力">${state.stamina}/100</meter></div><div class="hud-tools">${button(state.settings.muted ? '声音：关' : '声音：开', 'mute')}${button('全屏', 'fullscreen')}${button('设置', 'settings')}${button('暂停', 'pause')}</div></header>
      <aside class="quest-strip"><div><span>师傅的首展委托</span><small>${complete} / 4</small></div><strong>${objectives.find(task => !task.done)?.name ?? '首展完成'}</strong><p>${objectives.find(task => !task.done)?.detail ?? '三器齐备，温润成展。'}</p><progress max="4" value="${complete}" aria-label="委托完成度"></progress>${button('查看委托 <kbd>J</kbd>', 'tasks', 'quiet')}</aside>
      ${location === 'mine' ? '<div class="mine-instructions">方向键 / WASD 移动 · 靠近矿点按 E / 空格采集</div>' : '<div class="location-note"><h2>一器一故事</h2><p>展厅场景预览 · 成品布展将在后续接入</p></div>'}
      ${location === 'mine' ? '' : '<div class="scene-caption">场景预览<span>基础系统版本 · 玩法将逐项开放</span></div>'}
      <div class="bottom-bar"><nav class="travel" aria-label="地点切换">${Object.entries(NAMES).map(([id,name])=>`<button data-action="${id}" ${location === id ? 'aria-current="location"' : ''}><span>${name}</span><small>${{ workshop:'归来琢玉',mine:'寻石之旅',gallery:'陈列珍藏' }[id]}</small></button>`).join('')}</nav><nav class="pack-tools" aria-label="学徒工具">${button(`${icon('bag')}<span>行囊 <small>${state.inventory.length}/12</small></span><kbd>B</kbd>`, 'inventory')}${button(`${icon('scroll')}<span>委托</span><kbd>J</kbd>`, 'tasks')}${button(`${icon('book')}<span>图鉴</span><kbd>G</kbd>`, 'codex')}${button('?', 'help', 'help-button')}</nav></div>
      ${location === 'mine' ? `<nav class="mine-hotbar" aria-label="矿洞热键栏">${button('镐 <kbd>E / 空格</kbd>', 'pickaxe')}${button(`行囊 ${state.inventory.length}/12 <kbd>B</kbd>`, 'inventory')}${button('委托 <kbd>J</kbd>', 'tasks')}${button('图鉴 <kbd>G</kbd>', 'codex')}</nav>` : ''}
      <div class="save-status ${store.error ? 'save-warning' : ''}" role="status" title="${escape(store.error)}"><span>${store.error ? escape(store.error) : `◆ ${saveText}`}</span>${store.dirty ? button('重试', 'save') : ''}</div>`;
    if (focusedAction) root.querySelector(`[data-action="${focusedAction}"]`)?.focus({ preventScroll: true });
  }
  return {
    render,
    notify,
    playMiningHit: () => sound(true),
    openSettings: settings,
    setWorkshopPaused(reason, paused) {
      workshop.setPaused(reason, paused);
      if (reason === 'polishing') workshopTools.inert = paused;
    },
  };
}
