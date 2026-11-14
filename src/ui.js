import './reference-ui.css';
import { paintMineIcon } from './mine-art.js';
import { validateState, PREV_BACKUP_KEY } from './state.js';
import { icon, CODEX } from './icons.js';
import { createMenuLogo } from './menu-art.js';
import './menu.css';
import { createWorkshopReference } from './workshop-reference.js';
import { createInspectionView } from './inspection-view.js';
import { createCreativeView } from './creative-view.js';
import { createMuseumView } from './museum-view.js';
import { createCollectionView } from './collection-view.js';
import { CODEX_CONTENT } from './codex-content.js';
import { CREATIVE_COMMISSIONS, evaluateCommission } from './commissions.js';
import { drawArtisanPiece } from './piece-renderer.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';
import { createStoryView } from './story-view.js';

const NAMES = { workshop: '玉作工坊', mine: '青岚矿洞', gallery: '像素数字展厅' };
const SHAPES = { bi: '玉璧', fish: '玉鱼佩', seal: '玉印' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function createInterface(store, materials, taskList, { onOverlayChange = () => {}, onPolish = () => {}, onMine = () => {}, onSound = () => {}, onPauseAudio = () => {} } = {}) {
  const root = document.querySelector('#interface');
  const frame = document.querySelector('#game');
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  document.body.append(dialog);
  let closeCallback = null;
  let returnFocus;
  let inventoryTab = 'raw';
  let selectedItem = 0;
  let toastTimer;
  let workshopRevision = store.sessionRevision;
  const workshop = createWorkshopReference({
    getState: () => store.state,
    onAction: (action, options) => {
      store.acknowledgeOpening();
      sound();
      if(action==='make')crafting.open(options);else actions[action]?.();
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
  const inspection = createInspectionView({ store, show, button, onCreate: options => crafting.open(options) });
  const crafting = createCreativeView({ store, show, button, notify });
  const collection = createCollectionView({ store, show, button, notify, onSeal: piece => crafting.openSeal(piece), onRework: (id, shape) => { if(store.reworkPiece(id,shape)) crafting.open(); } });
  const story = createStoryView({ store, show, button, notify, onCreate: options => crafting.open(options) });
  const museum = createMuseumView({ store, show, button, notify, onCreate: ({exhibitId,materialId}={}) => {
    if (!store.active) { if (store.hasSession) store.resume(); else store.startNew(); }
    store.navigate('workshop'); crafting.open({inspirationId:exhibitId,materialId});
  } });
  const workshopTools = document.createElement('nav');
  workshopTools.className = 'workshop-page-tools';
  workshopTools.setAttribute('aria-label', '游戏导航');
  workshopTools.hidden = true;
  workshopTools.innerHTML = `<div class="workshop-tool-group" role="group" aria-label="行旅"><span>行旅</span>${button('工坊','workshop')+button('矿洞','mine')+button('玉文化馆','museum')+button('我的展厅','gallery')}</div><div class="workshop-tool-group" role="group" aria-label="工艺"><span>工艺</span>${button('鉴赏','inspect')+button('创作','make')+button('落款','customize')+button('旧玉来信','story')+button('行囊','inventory')+button('委托','tasks')}</div><div class="workshop-tool-group" role="group" aria-label="系统"><span>系统</span>${button('设置','settings')+button('主菜单','menu')}</div>`;
  document.querySelector('.frame-heading').append(workshopTools);
  const workshopWarning = document.createElement('p');
  workshopWarning.className = 'workshop-save-warning';
  workshopWarning.setAttribute('role', 'status');
  workshopWarning.hidden = true;
  frame.after(workshopWarning);
  workshopWarning.addEventListener('click', handle);
  function sound(miningHit = false) {
    if (!miningHit) onSound('button');
  }
  function close() { dialog.close(); }
  dialog.addEventListener('close', () => {
    onPauseAudio(false);
    const callback = closeCallback; closeCallback = null;
    onOverlayChange(false);
    workshop.setPaused('overlay', false);
    callback?.();
    if (dialog.open) return;
    if (returnFocus?.isConnected) returnFocus.focus();
    else root.querySelector('button:not(:disabled)')?.focus();
  });
  function show(title, body, actions = '', wide = false) {
    onPauseAudio(title === '稍歇片刻');
    if (!dialog.open) returnFocus = document.activeElement;
    dialog.classList.toggle('wide', wide);
    dialog.classList.toggle('settings-panel', title === '声音与存档');
    dialog.classList.remove('museum-dialog');
    dialog.innerHTML = `${['tl', 'tr', 'bl', 'br'].map(corner => `<i class="reference-dialog-corner ${corner}" aria-hidden="true"></i>`).join('')}<header><h2 id="dialog-title">${title}</h2>${button('关闭', 'close', 'quiet')}</header><div class="dialog-body">${body}</div>${actions ? `<div class="dialog-actions">${actions}</div>` : ''}`;
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
    const { muted, musicVolume, sfxVolume } = store.state.settings;
    show('声音与存档', `
      <label class="setting-row"><span>静音</span><input id="muted" type="checkbox" ${muted ? 'checked' : ''}></label>
      <label class="setting-row" for="music-volume">场景音乐 <output id="music-label">${Math.round(musicVolume * 100)}%</output></label>
      <input id="music-volume" type="range" min="0" max="100" value="${Math.round(musicVolume * 100)}">
      <label class="setting-row" for="volume">手作与交互音效 <output id="volume-label">${Math.round(sfxVolume * 100)}%</output></label>
      <input id="volume" type="range" min="0" max="100" value="${Math.round(sfxVolume * 100)}">
      <p class="muted">工坊拨弦、矿洞回声、展厅缓奏。切到其他标签页或暂停时，声音会停下。</p>
      <hr><h3>本地单档</h3><p>进度保存在当前浏览器。清理浏览器数据前，请导出备份。</p>
      <div class="save-summary"><span>${store.dirty ? '有未保存的进度' : store.hasSave ? '本地已有存档' : '尚未开始旅程'}</span><small>${store.state.updatedAt ? escape(new Date(store.state.updatedAt).toLocaleString('zh-CN')) : '开始旅程后自动保存'}</small></div>
      <div class="backup-actions">${button('导出存档', 'export', '', !store.hasSession)}${button('导入备份', 'import')}${store.error ? button('导出原始数据', 'raw') : ''}${store.hasSession ? button('立即保存', 'save') : ''}${store.recovery() ? button('恢复上一份存档', 'recover') : ''}${store.recovery(PREV_BACKUP_KEY) ? button('恢复更早存档', 'recoverEarlier') : ''}</div>
      <p class="muted">${store.active ? '切换地点与调整设置后自动保存。' : '开始或继续游戏后，声音设置随进度保存。'}</p>
      <p id="settings-error" class="error">${escape(store.error)}</p>`);
    const update = () => {
      const volume=Number(dialog.querySelector('#volume').value)/100;
      store.configure({ muted: dialog.querySelector('#muted').checked, volume, sfxVolume: volume, musicVolume: Number(dialog.querySelector('#music-volume').value)/100 });
      dialog.querySelector('#volume-label').value = `${dialog.querySelector('#volume').value}%`;
      dialog.querySelector('#music-label').value = `${dialog.querySelector('#music-volume').value}%`;
      dialog.querySelector('#settings-error').textContent = store.error;
    };
    dialog.querySelector('#muted').onchange = update;
    dialog.querySelector('#volume').oninput = update;
    dialog.querySelector('#music-volume').oninput = update;
    dialog.querySelector('#volume').onchange = () => sound();
  }
  function inventory() {
    const isCodex = inventoryTab === 'codex';
    const items = isCodex ? CODEX : inventoryTab === 'raw' ? store.state.inventory : store.state.pieces;
    selectedItem = Math.min(selectedItem, Math.max(0, items.length - 1));
    const item = items[selectedItem];
    const knowledge = isCodex && item ? CODEX_CONTENT[item.id] : null;
    const itemName = value => isCodex ? value.name : inventoryTab === 'raw' ? materials[value.material].name : SHAPES[value.shape];
    const itemIcon = value => !isCodex && value.artisan
      ? `<canvas width="128" height="128" data-stored-art="${escape(value.id)}" aria-label="${itemName(value)}，实际作品"></canvas>`
      : icon(isCodex ? value.id : value.shape ?? 'stone');
    const unlocked = item && (!isCodex || store.state.discoveries.includes(item.id));
    const count = Math.max(isCodex ? 6 : 12, items.length);
    show('藏玉行囊', `<div class="inventory-top"><p>玉作学徒的收藏</p><span>原石 ${store.state.inventory.length}/12 · 成品 ${store.state.pieces.length}</span></div>
      <div class="inventory-layout"><div><div class="inventory-grid">${Array.from({ length: count }, (_, i) => {
        const entry = items[i];
        return entry ? `<button class="slot ${selectedItem === i ? 'selected' : ''} ${isCodex && !store.state.discoveries.includes(entry.id) ? 'uncollected' : ''}" data-item="${i}" aria-label="${itemName(entry)}" aria-pressed="${selectedItem === i}">${itemIcon(entry)}<span>${itemName(entry)}</span></button>` : `<div class="slot empty" aria-label="空格 ${i+1}"><span>${String(i + 1).padStart(2, '0')}</span></div>`;
      }).join('')}</div><p class="inventory-hint">${isCodex ? '六种器物，慢慢相识。' : inventoryTab === 'raw' ? '每块原石占一格 · 满包时采集会提前提示' : '完成制作后，作品会保存在这里。'}</p></div>
      <aside class="item-detail"><div class="detail-art ${!unlocked ? 'uncollected' : ''}">${item ? itemIcon(item) : icon('bag')}</div><span class="detail-kind">${isCodex ? '器物图鉴' : inventoryTab === 'raw' ? '天然玉材 · 游戏材料' : '玉作成品'}</span><h3>${item ? itemName(item) : '空空的行囊'}</h3><p>${!item ? '前往矿洞寻找原石，拾取后便会收入行囊。' : isCodex ? escape(knowledge.description) : inventoryTab === 'raw' ? '带回工坊观察鉴赏，或取出一块原石，完成琢形、雕纹与抛光。' : '亲手刻线与光泽随作品保留。可以落款、返工、导出图片，再到展厅陈列。'}</p><div class="detail-status">${isCodex ? unlocked ? '已收录' : '等待收录' : item ? '已收入行囊' : '未获得材料'}</div>${item && !isCodex ? `<small>材质：${materials[item.material].name}</small>` : ''}${isCodex ? `<small><a href="${escape(knowledge.source.url)}" target="_blank" rel="noopener noreferrer">资料来源 · ${escape(knowledge.source.title)}</a></small>` : ''}</aside></div>
      `, `<nav class="inventory-tabs" aria-label="行囊分类">${[['raw','原石'],['pieces','成品'],['codex','图鉴']].map(([id,label])=>`<button data-tab="${id}" aria-pressed="${inventoryTab === id}">${label}</button>`).join('')}</nav>`, true);
    dialog.querySelectorAll('[data-stored-art]').forEach(canvas => {
      const piece = items.find(p=>p.id===canvas.dataset.storedArt);
      drawArtisanPiece(canvas.getContext('2d'),piece.artisan,{size:128});
      canvas.style.width=canvas.closest('.slot')?'56px':'112px';canvas.style.height=canvas.closest('.slot')?'56px':'112px';canvas.style.objectFit='contain';canvas.style.imageRendering='pixelated';
    });
    dialog.querySelectorAll('[data-tab]').forEach(tab => tab.onclick = () => { inventoryTab = tab.dataset.tab; selectedItem = 0; sound(); inventory(); dialog.querySelector(`[data-tab="${inventoryTab}"]`).focus(); });
    dialog.querySelectorAll('[data-item]').forEach(slot => slot.onclick = () => { selectedItem = Number(slot.dataset.item); sound(); inventory(); dialog.querySelector(`[data-item="${selectedItem}"]`).focus(); });
  }
  function tasks() {
    show('师傅的首展委托', `<blockquote>“先识一石，再琢一器。待三件作品齐备，我们便办一场小展。”</blockquote>
      <ol class="task-list">${taskList(store.state).map(t => `<li class="${t.done ? 'done' : ''}"><span class="task-mark">${t.done ? '✓' : '○'}</span><div><h3>${t.name}</h3><p>${t.detail}</p></div></li>`).join('')}</ol>
      <p class="muted">委托进度由采集、鉴赏、制作与陈列记录自动计算。完成三种器型，并分别陈列到三个展位，即可完成首展。</p>
      <div class="creative-commissions"><h3>让玉替人说一句话</h3>${CREATIVE_COMMISSIONS.map(commission=>{
        const reviews=store.state.pieces.filter(piece=>piece.shape===commission.shape).map(piece=>evaluateCommission(piece,store.state).find(item=>item.id===commission.id));
        const result=reviews.find(item=>item?.fulfilled)??reviews.at(-1);
        return `<article><h4>${result?.fulfilled?'✓ ':''}${escape(commission.title)}</h4><p>${escape(commission.story)}</p><p class="muted">${escape(commission.goal)}</p>${result?`<blockquote>${escape(result.feedback)}</blockquote>`:''}<div class="creative-commission-actions"><button data-commission-study="${commission.id}">去看相关玉作</button><button data-commission-create="${commission.id}">${store.state.crafting?'继续手头作品':'为这份心意设计'}</button></div></article>`;
      }).join('')}</div>`,button('参观，寻找灵感','museum')+button('回工坊创作','workshop'),true);
    const letter=document.createElement('article');letter.className='story-task-invitation';letter.innerHTML=`<h3>一封旧玉来信</h3><p>阿宁想留下祖母的旧玉，也想让它陪伴今天。观察旧物、决定处理方式，再听听她的回访。</p><button data-action="story" class="primary">读信与观察旧玉</button>`;dialog.querySelector('.dialog-body').prepend(letter);
    dialog.querySelectorAll('[data-commission-study]').forEach(control=>control.onclick=()=>{
      const brief=CREATIVE_COMMISSIONS.find(item=>item.id===control.dataset.commissionStudy);
      const exhibit=MUSEUM_EXHIBITS.find(item=>item.id===brief.inspirationIds[0]);
      museum.open(exhibit.room,exhibit.id);
    });
    dialog.querySelectorAll('[data-commission-create]').forEach(control=>control.onclick=()=>{
      const brief=CREATIVE_COMMISSIONS.find(item=>item.id===control.dataset.commissionCreate);
      const inspirationId=brief.inspirationIds.find(id=>store.state.museum.inspirations.includes(id));
      store.navigate('workshop');
      crafting.open({shape:brief.shape,finish:brief.id==='moon-gift'?'satin':'contrast',inspirationId:inspirationId??''});
    });
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
    story: () => story.open(),
    mentor: () => show('师傅的首展委托', '<p>去玉文化馆看看前人怎样借色成器，再去矿洞寻一块属于你的玉。</p><p>观察色带、安排纸样、琢出轮廓，再用刻线、浮雕和局部光泽留下自己的答案。三件作品齐备，就为它们办一场小展。</p>',button('参观玉文化馆','museum','primary')+button('开始创作','make')),
    exit: exitGame,
    new: () => store.hasSave || store.error || store.active ? confirm('重新开始旅程？', '重新开始将覆盖当前本地存档。你可以取消，并先在“声音与存档”中导出备份。', '确认重新开始', startJourney) : startJourney(),
    continue: () => store.resume(), mine: () => { if(dialog.open) close(); store.navigate('mine'); }, workshop: () => { if(dialog.open)close();store.navigate('workshop'); }, gallery: () => {if(dialog.open)close();store.navigate('gallery');},
    museum: () => museum.open(),
    inventory: () => { inventoryTab = 'raw'; selectedItem = 0; inventory(); }, tasks, settings, close, import: chooseImport,
    save: () => { const ok = store.retrySave(); notify(ok ? '进度已保存' : '未能保存，请导出备份'); if (dialog.open) settings(); },
    recover: () => confirm('恢复上一份存档？', '将恢复最近一次成功保存前的进度。当前存档会被替换，建议先导出备份。', '确认恢复', () => { try { store.recover(); notify('已恢复上一份存档'); } catch(error) { show('恢复未完成', `<p>${escape(error.message)}</p>`); } }),
    recoverEarlier: () => confirm('恢复更早存档？', '将恢复前一份备份中的进度。当前存档会被替换，建议先导出备份。', '确认恢复', () => { try { store.recover(PREV_BACKUP_KEY); notify('已恢复更早存档'); } catch(error) { show('恢复未完成', `<p>${escape(error.message)}</p>`); } }),
    help: () => show('玉作学徒手册', '<p>从矿洞寻石，带回工坊识玉、琢玉，最后在展厅陈列你的作品。</p><dl class="key-guide"><dt>B</dt><dd>打开行囊</dd><dt>J</dt><dd>查看委托</dd><dt>G</dt><dd>玉器图鉴</dd><dt>M</dt><dd>静音／恢复声音</dd><dt>F</dt><dd>切换全屏</dd><dt>Esc</dt><dd>关闭面板／暂停</dd></dl><p class="muted">矿洞用 A/D 行走、W/S 爬梯、空格跳跃、鼠标或 E 挖掘。带回原石后，在工坊鉴赏、制作并定制作品，再前往展厅布置展位。</p>'),
    fullscreen: async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await frame.requestFullscreen(); } catch { notify('此环境不支持全屏，可以放大浏览器窗口'); } },
    mute: () => { store.configure({ ...store.state.settings, muted: !store.state.settings.muted }); notify(store.state.settings.muted ? '已静音' : '声音已开启'); },
    export: () => download(store.exportSave(), 'pixel-jadecraft-save.json'),
    raw: () => { try { download(store.exportOriginal(), 'pixel-jadecraft-original.json'); } catch { show('无法读取原数据', '<p>浏览器存储不可用，请检查权限。</p>'); } },
    menu: () => store.menu(),
    pause: () => show('稍歇片刻', '<p>喝一盏茶，再继续你的琢玉之旅。</p>', button('继续旅程', 'close', 'primary') + button('返回主菜单', 'to-menu', 'quiet')),
    'to-menu': () => { closeCallback = () => store.menu(); close(); },
    inspect: () => inspection.open(),
    make: () => crafting.open(),
    customize: () => collection.customize(),
    exhibit: () => collection.exhibit(),
    craft: () => store.active && store.state.location === 'workshop' ? crafting.open() : onPolish(),
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
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
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
    for (const action of ['inspect', 'make', 'customize']) {
      workshopTools.querySelector(`[data-action="${action}"]`).disabled = !isWorkshop;
    }
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
          ${button('继续旅程', 'continue', '', !store.hasSession)}${button('开启旅程', 'new')}${button('参观玉文化馆', 'museum')}${button('玉器图鉴', 'codex')}${button('学徒手册', 'help')}${button('设置', 'settings')}${button('退出游戏', 'exit')}
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
        <p class="mine-controls">A D 行走　W S 爬梯　空格跳跃　鼠标 / E 挖掘<br><small>R 观察岩壁　1 细凿 / 2 重镐　Q 追踪同源玉</small></p>
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
      <div class="location-note"><h2>一器一故事</h2><p>我的首展 · ${state.exhibits.filter(Boolean).length} / 3 件作品</p>${button('布置展位', 'exhibit', 'primary')}${button('走进玉文化馆', 'museum')}</div>
      ${[[320,310],[480,380],[640,310]].map(([x,y], index) => `<button class="gallery-case-button" style="left:${x-45}px;top:${y-60}px" data-action="exhibit" aria-label="管理展位 ${index+1}"><span class="screen-reader-text">管理展位 ${index+1}</span></button>`).join('')}
      <div class="bottom-bar"><nav class="travel" aria-label="地点切换">${Object.entries(NAMES).map(([id,name])=>`<button data-action="${id}" ${location === id ? 'aria-current="location"' : ''}><span>${name}</span><small>${{ workshop:'归来琢玉',mine:'寻石之旅',gallery:'陈列珍藏' }[id]}</small></button>`).join('')}</nav><nav class="pack-tools" aria-label="学徒工具">${button(`${icon('bag')}<span>行囊 <small>${state.inventory.length}/12</small></span><kbd>B</kbd>`, 'inventory')}${button(`${icon('scroll')}<span>委托</span><kbd>J</kbd>`, 'tasks')}${button(`${icon('book')}<span>图鉴</span><kbd>G</kbd>`, 'codex')}${button('?', 'help', 'help-button')}</nav></div>
      ${location === 'mine' ? `<nav class="mine-hotbar" aria-label="矿洞热键栏">${button('镐 <kbd>E</kbd>', 'pickaxe')}${button(`行囊 ${state.inventory.length}/12 <kbd>B</kbd>`, 'inventory')}${button('委托 <kbd>J</kbd>', 'tasks')}${button('图鉴 <kbd>G</kbd>', 'codex')}</nav>` : ''}
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
