import { LETTER_CLUES, CARE_CELLS, storyReadiness, returnLetter, exhibitionVisitors, STORY_LABELS } from './story.js';
import { drawArtisanPiece } from './piece-renderer.js';
import './story.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sound=name=>window.dispatchEvent(new CustomEvent('jade:sound',{detail:{name}}));

export function drawHeirloom(canvas,story,{markers=true}={}) {
  const c=canvas.getContext('2d');canvas.width=480;canvas.height=320;c.imageSmoothingEnabled=false;
  c.fillStyle='#35251c';c.fillRect(0,0,480,320);
  for(let y=10;y<320;y+=32){c.fillStyle=y%3?'#493023':'#5c3c27';c.fillRect(6,y,468,3);}
  c.fillStyle='#9b8355';c.fillRect(36,24,410,270);c.fillStyle='#5d6550';c.fillRect(41,29,400,260);
  const k=11,ox=48,oy=28;
  const inside=(x,y)=>((x-26)/18)**2+((y-24)/14)**2<1||(x>=40&&x<56&&Math.abs(y-24)<(x-38)*.72);
  for(let y=0;y<48;y++)for(let x=0;x<64;x++){
    if(!inside(x,y))continue;
    const band=Math.abs(x*.6+y*.3-24)<3,edge=!inside(x+1,y)||!inside(x,y+1),top=!inside(x,y-1)||!inside(x-1,y);
    c.fillStyle=edge?'#4f6e4c':top?'#e0e1b5':band?'#88a778':y<23?'#bdcfa0':'#9bb786';
    c.fillRect(ox+x*k/2,oy+y*k/2,k/2+.2,k/2+.2);
    if(!edge&&!top&&(x*17+y*23)%71===0){c.fillStyle='#d1dbaf';c.fillRect(ox+x*k/2,oy+y*k/2,3,2);}
  }
  // Small pixel scales and fin ridges give the worn carving readable depth.
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
    const x=ox+(12+col*2.5+(row%2)*.7)*k,y=oy+(8+row*2.5)*k;
    c.fillStyle='#739465';c.fillRect(x,y,3,10);c.fillRect(x+3,y+10,11,3);
    c.fillStyle='#ced9a8';c.fillRect(x+3,y+3,3,7);c.fillRect(x+6,y+10,8,3);
  }
  c.fillStyle='#536e49';c.fillRect(ox+8*k-3,oy+10*k-3,17,17);
  c.fillStyle='#dedda5';c.fillRect(ox+8*k,oy+10*k,11,11);
  c.fillStyle='#253f30';c.fillRect(ox+8*k+3,oy+10*k+3,6,7);
  c.fillStyle='#e0e0ad';c.fillRect(ox+8*k+3,oy+10*k+3,3,3);
  c.fillStyle='#3c4234';c.fillRect(ox+9*k,oy+6*k,12,12);
  c.strokeStyle=story.cord?'#bd693b':'#793e31';c.lineWidth=story.cord?6:4;
  c.beginPath();c.moveTo(ox+9*k+6,oy+6*k+4);c.lineTo(ox+7*k,oy+1*k);c.lineTo(ox+4*k,oy+1*k);c.lineTo(ox+3*k,oy+4*k);c.lineTo(ox+9*k,oy+7*k);c.stroke();
  // This personal mark is never part of the removable grime mask.
  c.fillStyle='#65764e';for(let i=0;i<5;i++)c.fillRect(ox+(12+i)*k,oy+(11+i*.5)*k,9,4);
  for(const index of CARE_CELLS)if(!story.cleaned.includes(index)){c.fillStyle=(index%2)?'#77664d':'#8d7b5a';c.fillRect(ox+index%32*k,oy+Math.floor(index/32)*k,8,6);}
  if(markers)LETTER_CLUES.forEach((clue,i)=>{c.fillStyle=story.clues.includes(clue.id)?'#779b62':'#dfb65d';c.fillRect(ox+clue.x*k-7,oy+clue.y*k-8,18,18);c.fillStyle='#182d23';c.font='bold 14px sans-serif';c.textAlign='center';c.fillText(String(i+1),ox+clue.x*k+2,oy+clue.y*k+6);});
  c.fillStyle='#ead8b2';c.font='16px "Fusion Pixel",sans-serif';c.textAlign='left';c.fillText(story.cord?'新绳已结好 · 旧痕仍在':'阿宁的旧鱼佩',52,311);
}

export function createStoryView({store,show,button,notify,onCreate}) {
  let dispose=()=>{},selectedPiece=null;
  function open(){
    dispose();
    if(!store.active)return;
    if(store.state.location!=='workshop')store.navigate('workshop');
    const s=store.state.story;
    const fish=store.state.pieces.filter(p=>p.shape==='fish'&&p.artisan?.completed);
    if(!fish.some(p=>p.id===selectedPiece))selectedPiece=fish.at(-1)?.id??null;
    show('旧玉来信 · 阿宁的鱼佩',`<section class="story-view"><div class="story-intro"><span class="story-seal">信</span><div><h3>留住旧日，也陪伴今天</h3><p>一件虚构旧物，两个都值得被听见的心愿。</p></div></div><div class="story-layout"><article class="story-letter"><h3>给玉作工坊</h3><p>这条小鱼是祖母留下的。旧绳松了，我想继续戴着，又怕弄丢。</p><p>鱼腹那道痕，请替我留着。或者，为它做一条新的伴佩，让旧玉好好歇在信匣里。</p><p class="story-signature">—— 阿宁</p><h4>观察旧物</h4>${LETTER_CLUES.map((clue,i)=>`<button data-clue="${clue.id}" aria-pressed="${s.clues.includes(clue.id)}">${s.clues.includes(clue.id)?'✓':i+1} ${clue.title}</button>`).join('')}<p class="story-clue-text" role="status">${s.clues.length===3?'三条心愿都已记在手记里。':'点开三处细节，听她把话说完。'}</p></article><div class="story-work"><canvas class="story-jade" width="480" height="320" tabindex="0" aria-label="旧鱼佩保养台：拖动柔刷清理两处积尘，方向键移动、空格刷拭"></canvas><p class="story-work-hint">${s.route==='preserve'?'柔刷只带走积尘 · 划痕会一直保留':'绳结、划痕和来信，记录着不同的记忆'}</p>${s.delivery?`<div class="story-outcome"><h3>${s.delivery.route==='preserve'?'旧玉仍伴身边':'新鱼与旧玉，各有归处'}</h3><p>${s.returned?esc(returnLetter(s)):'处理记录已写入来信。请阿宁回来看看，让她亲口说说感受。'}</p>${!s.returned?'<button data-return class="primary">邀请阿宁回访</button>':button('带着故事去布展','gallery','primary')}</div>`:`<div class="story-routes"><button data-route="preserve" ${s.clues.length<3?'disabled':''} aria-pressed="${s.route==='preserve'}"><b>保养旧玉</b><small>柔刷清理孔口与下缘，换绳，留下划痕</small></button><button data-route="companion" ${s.clues.length<3?'disabled':''} aria-pressed="${s.route==='companion'}"><b>另作伴佩</b><small>旧玉入匣，亲手做一条新鱼陪她出门</small></button></div>${s.route==='preserve'?'<div class="story-care"><span data-clean-hint></span><button data-cord>换一条牢靠的新绳</button></div>':s.route==='companion'?`<div class="story-companion"><label>选择亲手完成的伴佩<select data-companion>${fish.length?fish.map(p=>`<option value="${esc(p.id)}" ${p.id===selectedPiece?'selected':''}>${p.material==='jadeite'?'翡翠':'和田玉'}鱼佩${p.blessing?' · '+esc(p.blessing):''}</option>`).join(''):'<option value="">还没有完成的鱼佩</option>'}</select></label><canvas width="160" height="160" data-companion-preview></canvas><button data-create-fish>去工坊设计新鱼</button></div>`:''}<p data-story-status role="status"></p><button data-deliver class="primary" disabled>把这份心意交给阿宁</button>`}</div></div></section>`,button('回工坊','close'),true);
    const root=document.querySelector('.story-view'),canvas=root.querySelector('.story-jade'),controller=new AbortController();
    const listen=(e,t,f)=>e.addEventListener(t,f,{signal:controller.signal});
    dispose=()=>{controller.abort();dispose=()=>{};};
    const valid=()=>root.isConnected&&root.closest('dialog').open&&!document.hidden&&store.active&&store.state.location==='workshop';
    function renderCare(){
      const current=store.state.story;drawHeirloom(canvas,current,{markers:!current.route});
      const readiness=storyReadiness(current,fish.find(p=>p.id===selectedPiece));
      const status=root.querySelector('[data-story-status]');if(status)status.textContent=readiness.reason;
      const deliver=root.querySelector('[data-deliver]');if(deliver)deliver.disabled=!readiness.ready;
      const cleaned=root.querySelector('[data-clean-hint]');if(cleaned)cleaned.textContent=current.cleaned.length===CARE_CELLS.length?'孔口和下缘都已清理':'用柔刷清理两处褐色积尘';
      const cord=root.querySelector('[data-cord]');if(cord){cord.disabled=current.cord;cord.textContent=current.cord?'新绳已结好':'换一条牢靠的新绳';}
      const preview=root.querySelector('[data-companion-preview]');if(preview){const p=fish.find(p=>p.id===selectedPiece);preview.getContext('2d').clearRect(0,0,160,160);if(p)drawArtisanPiece(preview.getContext('2d'),p.artisan,{size:160});}
    }
    root.querySelectorAll('[data-clue]').forEach(b=>listen(b,'click',()=>{store.observeLetter(b.dataset.clue);sound('paper');open();document.querySelector('.story-clue-text').textContent=LETTER_CLUES.find(c=>c.id===b.dataset.clue).text;}));
    root.querySelectorAll('[data-route]').forEach(b=>listen(b,'click',()=>{if(store.chooseLetterRoute(b.dataset.route))open();}));
    const cord=root.querySelector('[data-cord]');if(cord)listen(cord,'click',()=>{store.tieHeirloomCord();sound('paper');renderCare();});
    const create=root.querySelector('[data-create-fish]');if(create)listen(create,'click',()=>{dispose();onCreate({shape:'fish',finish:'satin'});});
    const select=root.querySelector('[data-companion]');if(select)listen(select,'change',()=>{selectedPiece=select.value;renderCare();});
    const deliver=root.querySelector('[data-deliver]');if(deliver)listen(deliver,'click',()=>{if(store.deliverLetter(selectedPiece)){sound('finish');open();}});
    const visit=root.querySelector('[data-return]');if(visit)listen(visit,'click',()=>{store.receiveLetterReturn();sound('paper');open();});
    let previous=null,pointer=null,cursor={x:8,y:6};
    const point=e=>{const b=canvas.getBoundingClientRect();return{x:((e.clientX-b.left)*480/b.width-48)/11,y:((e.clientY-b.top)*320/b.height-28)/11};};
    function brush(p){if(!valid())return;store.careForHeirloom(previous??p,p);previous=p;cursor=p;sound('polish');renderCare();}
    listen(canvas,'pointerdown',e=>{if(e.button!==0||!valid()||store.state.story.route!=='preserve'||store.state.story.delivery)return;e.preventDefault();canvas.focus();pointer=e.pointerId;canvas.setPointerCapture(pointer);brush(point(e));});
    listen(canvas,'pointermove',e=>{if(pointer===e.pointerId)brush(point(e));});
    const stop=()=>{previous=null;pointer=null;};for(const e of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,e,stop);
    listen(canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))return;e.preventDefault();cursor={x:Math.max(0,Math.min(31,cursor.x+(e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0))),y:Math.max(0,Math.min(23,cursor.y+(e.code==='ArrowUp'?-1:e.code==='ArrowDown'?1:0)))};if(e.code==='Space')brush(cursor);else{renderCare();const c=canvas.getContext('2d');c.strokeStyle='#f9d788';c.lineWidth=2;c.strokeRect(48+cursor.x*11-12,28+cursor.y*11-12,24,24);}});
    listen(window,'blur',stop);listen(document,'visibilitychange',stop);listen(root.closest('dialog'),'close',dispose);
    renderCare();
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
