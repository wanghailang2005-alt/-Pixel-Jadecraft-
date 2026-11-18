import heirloomArt from './assets/inventory/heirloom.png';
import { LETTER_CLUES, CARE_CELLS, storyReadiness, returnLetter, exhibitionVisitors, STORY_LABELS } from './story.js';
import { drawArtisanPiece } from './piece-renderer.js';
import './story.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sound=name=>window.dispatchEvent(new CustomEvent('jade:sound',{detail:{name}}));

const heirloom = new Image();
heirloom.src = heirloomArt;
const pendingPaint = new WeakMap();
const careX = x => 116 + (x - 8) * 17;
const careY = y => 169 + (y - 6) * 6;
const surfaces = new Map();

function heirloomSurface(newCord) {
  if (surfaces.has(newCord)) return surfaces.get(newCord);
  const layer = document.createElement('canvas');
  layer.width = 480;
  layer.height = 320;
  const c = layer.getContext('2d');
  c.drawImage(heirloom, 0, 0);
  if (newCord) {
    const image = c.getImageData(35, 164, 88, 108);
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      const [r, g, b] = image.data.subarray(i, i + 3);
      const axis = 72 - y * .59;
      if (Math.abs(x - axis) > 19 || r < g + 10 || g < b + 9 || r > 172) continue;
      image.data[i] = Math.min(210, r * 1.08 + 19);
      image.data[i + 1] = g * .72 + 9;
      image.data[i + 2] = b * .55 + 6;
    }
    c.putImageData(image, 35, 164);
  }
  surfaces.set(newCord, layer);
  return layer;
}

export function drawHeirloom(canvas, story, { markers = true, sideLight = false } = {}) {
  const c = canvas.getContext('2d');
  if (!heirloom.complete || !heirloom.naturalWidth) {
    pendingPaint.set(canvas, () => drawHeirloom(canvas, story, { markers, sideLight }));
    if (!heirloom.complete && !canvas.dataset.paintPending) {
      canvas.dataset.paintPending = 'true';
      heirloom.addEventListener('load', () => {
        delete canvas.dataset.paintPending;
        pendingPaint.get(canvas)?.();
        pendingPaint.delete(canvas);
      }, { once: true });
    }
    return;
  }
  c.clearRect(0, 0, 480, 320);
  c.imageSmoothingEnabled = false;
  c.drawImage(heirloomSurface(story.cord), 0, 0);
  if (sideLight) {
    const light = c.createLinearGradient(48, 24, 424, 265);
    light.addColorStop(0, '#f8dea03b');
    light.addColorStop(.48, '#ffffff00');
    light.addColorStop(1, '#10150d79');
    c.fillStyle = light;
    c.fillRect(24, 20, 432, 280);
  }
  for (const index of CARE_CELLS) {
    if (story.cleaned.includes(index)) continue;
    const x = careX(index % 32), y = careY(Math.floor(index / 32));
    for (let i = 0; i < 18; i++) {
      const dx = (index * 31 + i * 43) % 25 - 12;
      const dy = (index * 13 + i * 17) % 13 - 6;
      c.fillStyle = ['#b1a17a78', '#827861ad', '#ddd0a46b'][i % 3];
      c.fillRect(x + dx, y + dy, i % 4 ? 1 : 2, 1);
    }
  }
  const marker = (x, y, number, seen) => {
    c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2);
    c.fillStyle = seen ? '#385343' : '#3d3022'; c.fill();
    c.strokeStyle = '#d7b97a'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#fff0c5'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center';
    c.fillText(number, x, y + 3);
  };
  if (markers) LETTER_CLUES.forEach((clue, i) =>
    marker(careX(clue.x), careY(clue.y) - 13, i + 1, story.clues.includes(clue.id)));
  if (story.route === 'preserve' && !story.delivery) {
    for (const [i, center] of [8 + 6 * 32, 13 + 15 * 32].entries()) {
      if (CARE_CELLS.slice(i * 9, i * 9 + 9).every(index => story.cleaned.includes(index))) continue;
      marker(careX(center % 32) - 25, careY(Math.floor(center / 32)) + 14, i + 1, false);
    }
  }
}

export function createStoryView({store,show,button,notify,onCreate}) {
  let dispose=()=>{},selectedPiece=null,sideLight=false;
  function open({ clue, focus } = {}){
    dispose();
    if(!store.active)return;
    if(store.state.location!=='workshop')store.navigate('workshop');
    const s=store.state.story;
    const fish=store.state.pieces.filter(p=>p.shape==='fish'&&p.artisan?.completed);
    if(!fish.some(p=>p.id===selectedPiece))selectedPiece=fish.at(-1)?.id??null;
    const choice = s.clues.length===LETTER_CLUES.length&&!s.delivery ? `<div class="story-choice"><h3 class="story-route-heading" id="story-route-heading" tabindex="-1">选择处理方式</h3><div class="story-routes" role="group" aria-labelledby="story-route-heading"><button data-route="preserve" aria-pressed="${s.route==='preserve'}"><b>保养旧玉</b><small>柔刷清理孔口与下缘，换绳，留下划痕</small></button><button data-route="companion" aria-pressed="${s.route==='companion'}"><b>另作伴佩</b><small>旧玉入匣，亲手做一条新鱼陪她出门</small></button></div></div>` : '';
    show('旧玉来信 · 阿宁的鱼佩',`<section class="story-view"><div class="story-intro"><span class="story-seal">信</span><div><h3>留住旧日，也陪伴今天</h3><p>一件虚构旧物，两个都值得被听见的心愿。</p></div></div><div class="story-layout"><article class="story-letter"><h3>给玉作工坊</h3><p>这条小鱼是祖母留下的。旧绳松了，我想继续戴着，又怕弄丢。</p><p>鱼腹那道痕，请替我留着。或者，为它做一条新的伴佩，让旧玉好好歇在信匣里。</p><p class="story-signature">—— 阿宁</p><h4>观察旧物</h4>${LETTER_CLUES.map((clue,i)=>`<button data-clue="${clue.id}" aria-pressed="${s.clues.includes(clue.id)}">${s.clues.includes(clue.id)?'✓':i+1} ${clue.title}</button>`).join('')}<p class="story-clue-text" role="status">${esc(clue?.text ?? (s.clues.length===3?'三条心愿都已记在手记里。':'点开三处细节，听她把话说完。'))}</p></article><div class="story-work">${!s.route?choice:''}${s.route==='preserve'&&!s.delivery?'<div class="story-care"><span data-clean-hint></span><button data-cord>换一条牢靠的新绳</button></div>':''}<canvas class="story-jade" width="480" height="320" tabindex="0" aria-label="旧鱼佩保养台：拖动柔刷清理两处积尘，方向键移动、空格刷拭"></canvas><div class="story-light-row"><p class="story-work-hint">${s.route==='preserve'?'柔刷只带走积尘 · 划痕会一直保留':'绳结、划痕和来信，记录着不同的记忆'}</p><button data-story-light aria-pressed="${sideLight}">侧光观察</button></div>${s.delivery?`<div class="story-outcome"><h3>${s.delivery.route==='preserve'?'旧玉仍伴身边':'新鱼与旧玉，各有归处'}</h3><p>${s.returned?esc(returnLetter(s)):'处理记录已写入来信。请阿宁回来看看，让她亲口说说感受。'}</p>${!s.returned?'<button data-return class="primary">邀请阿宁回访</button>':button('带着故事去布展','gallery','primary')}</div>`:`${s.route==='companion'?`<div class="story-companion"><label>选择亲手完成的伴佩<select data-companion>${fish.length?fish.map(p=>`<option value="${esc(p.id)}" ${p.id===selectedPiece?'selected':''}>${p.material==='jadeite'?'翡翠':'和田玉'}鱼佩${p.blessing?' · '+esc(p.blessing):''}</option>`).join(''):'<option value="">还没有完成的鱼佩</option>'}</select></label><canvas width="160" height="160" data-companion-preview></canvas><button data-create-fish>去工坊设计新鱼</button></div>`:''}${s.route?'<p data-story-status role="status"></p><button data-deliver class="primary" disabled>把这份心意交给阿宁</button>':''}${s.route?choice:''}`}</div></div></section>`,'',true);
    const root=document.querySelector('.story-view'),canvas=root.querySelector('.story-jade'),controller=new AbortController();
    const listen=(e,t,f)=>e.addEventListener(t,f,{signal:controller.signal});
    dispose=()=>{controller.abort();dispose=()=>{};};
    const valid=()=>root.isConnected&&root.closest('dialog').open&&!document.hidden&&store.active&&store.state.location==='workshop';
    function renderCare(){
      const current=store.state.story;drawHeirloom(canvas,current,{markers:!current.route,sideLight});
      const readiness=storyReadiness(current,fish.find(p=>p.id===selectedPiece));
      const status=root.querySelector('[data-story-status]');if(status)status.textContent=readiness.reason;
      const deliver=root.querySelector('[data-deliver]');if(deliver)deliver.disabled=!readiness.ready;
      const cleaned=root.querySelector('[data-clean-hint]');if(cleaned)cleaned.textContent=current.cleaned.length===CARE_CELLS.length?'孔口和下缘都已清理':'拖动柔刷清理 ① 孔口和 ② 下缘';
    const cord=root.querySelector('[data-cord]');if(cord){cord.disabled=current.cord;cord.textContent=current.cord?'新绳已结好':'换一条牢靠的新绳';}
      const preview=root.querySelector('[data-companion-preview]');if(preview){const p=fish.find(p=>p.id===selectedPiece);preview.getContext('2d').clearRect(0,0,160,160);if(p)drawArtisanPiece(preview.getContext('2d'),p.artisan,{size:160});}
    }
    const light=root.querySelector('[data-story-light]');
    listen(light,'click',()=>{sideLight=!sideLight;light.setAttribute('aria-pressed',String(sideLight));renderCare();});
    root.querySelectorAll('[data-clue]').forEach(b=>listen(b,'click',()=>{
      const wasReady=store.state.story.clues.length===LETTER_CLUES.length;
      store.observeLetter(b.dataset.clue);sound('paper');
      const ready=store.state.story.clues.length===LETTER_CLUES.length;
      open({clue:LETTER_CLUES.find(c=>c.id===b.dataset.clue),focus:!wasReady&&ready?'#story-route-heading':`[data-clue="${b.dataset.clue}"]`});
    }));
    root.querySelectorAll('[data-route]').forEach(b=>listen(b,'click',()=>{if(store.chooseLetterRoute(b.dataset.route))open({focus:b.dataset.route==='preserve'?'.story-jade':'[data-companion]'});}));
    const cord=root.querySelector('[data-cord]');if(cord)listen(cord,'click',()=>{store.tieHeirloomCord();sound('paper');renderCare();});
    const create=root.querySelector('[data-create-fish]');if(create)listen(create,'click',()=>{dispose();onCreate({shape:'fish',finish:'satin'});});
    const select=root.querySelector('[data-companion]');if(select)listen(select,'change',()=>{selectedPiece=select.value;renderCare();});
    const deliver=root.querySelector('[data-deliver]');if(deliver)listen(deliver,'click',()=>{if(store.deliverLetter(selectedPiece)){sound('finish');open();}});
    const visit=root.querySelector('[data-return]');if(visit)listen(visit,'click',()=>{store.receiveLetterReturn();sound('paper');open();});
    let previous=null,pointer=null,cursor={x:8,y:6};
    const point=e=>{const b=canvas.getBoundingClientRect();return{x:((e.clientX-b.left-canvas.clientLeft)*480/canvas.clientWidth-careX(0))/17,y:((e.clientY-b.top-canvas.clientTop)*320/canvas.clientHeight-careY(0))/6};};
    function brush(p){if(!valid()||store.state.story.route!=='preserve'||store.state.story.delivery)return;store.careForHeirloom(previous??p,p);previous=p;cursor=p;sound('polish');renderCare();}
    listen(canvas,'pointerdown',e=>{if(e.button!==0||!valid()||store.state.story.route!=='preserve'||store.state.story.delivery)return;e.preventDefault();canvas.focus();pointer=e.pointerId;canvas.setPointerCapture(pointer);brush(point(e));});
    listen(canvas,'pointermove',e=>{if(pointer===e.pointerId)brush(point(e));});
    const stop=()=>{previous=null;pointer=null;};for(const e of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,e,stop);
    listen(canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))return;e.preventDefault();cursor={x:Math.max(0,Math.min(31,cursor.x+(e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0))),y:Math.max(0,Math.min(23,cursor.y+(e.code==='ArrowUp'?-1:e.code==='ArrowDown'?1:0)))};if(e.code==='Space')brush(cursor);else{renderCare();const c=canvas.getContext('2d');c.strokeStyle='#f9d788';c.lineWidth=2;c.strokeRect(careX(cursor.x)-11,careY(cursor.y)-8,22,16);}});
    listen(window,'blur',stop);listen(document,'visibilitychange',stop);listen(root.closest('dialog'),'close',dispose);
    renderCare();
    if (focus) root.querySelector(focus)?.focus();
  }
  return {open,dispose};
}

export function mountStoryCuration(root,store) {
  const section=document.createElement('section');section.className='story-curation';
  const s=store.state.story;
  section.innerHTML=`<h3>让观众循着故事看玉</h3><p>调整三张展签的顺序，再听听他们理解了什么。</p><div class="story-order">${s.order.map((key,i)=>`<article><span>${i+1}</span><strong>${STORY_LABELS[key]}</strong><p>${key==='material'?'材料色带与原石来处':key==='process'?'实际刻线、纹样与表面处理':s.delivery?(s.delivery.route==='preserve'?'旧痕仍在，新绳已系':'新鱼陪伴，旧玉珍藏'):'信匣等待一段故事'}</p><button data-order="${i}" ${i===0?'disabled':''}>移到前面</button></article>`).join('')}</div><label>展签重点<select data-caption><option value="memory" ${s.caption==='memory'?'selected':''}>讲人与物的记忆</option><option value="craft" ${s.caption==='craft'?'selected':''}>讲刻线与光泽的取舍</option></select></label><div class="story-visitors">${exhibitionVisitors(store.state).map(v=>`<article><span class="visitor-pixel ${v.sprite}" aria-hidden="true"></span><div><h4>${v.name}</h4><p>${esc(v.text)}</p></div></article>`).join('')}</div>${s.delivery?`<details><summary>借展来信 · ${s.delivery.route==='preserve'?'保养旧玉':'另作伴佩'}</summary><p>${s.returned?esc(returnLetter(s)):'阿宁尚未来访，回工坊邀请她看看。'}</p></details>`:''}`;
  root.append(section);
  const refresh=()=>{section.remove();mountStoryCuration(root,store);sound('paper');};
  section.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.order);const order=[...store.state.story.order];[order[i-1],order[i]]=[order[i],order[i-1]];if(store.curateStory(order,store.state.story.caption))refresh();});
  section.querySelector('[data-caption]').onchange=e=>{if(store.curateStory(store.state.story.order,e.target.value))refresh();};
}
