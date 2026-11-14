import { MUSEUM_ROOMS, MUSEUM_EXHIBITS } from './museum-content.js';
import { drawMuseumArtifact, drawMuseumRoom, museumCasePositions } from './museum-art.js';
import { drawCollectionPiece } from './collection-view.js';
import { createDraft } from './craft-model.js';
import { drawArtisanPiece } from './piece-renderer.js';
import './museum.css';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const shapeNames = { bi:'玉璧', fish:'玉鱼佩', seal:'玉印' };
const materialNames = { nephrite:'和田玉', jadeite:'翡翠' };
const cluePositions = {
  stone:[[40,36],[58,55],[33,70]], cong:[[49,26],[32,55],[63,64]], dragon:[[66,55],[70,24],[49,20]],
  cabbage:[[48,64],[45,29],[72,15]], mountain:[[42,34],[49,65],[70,48]], bird:[[51,14],[58,53],[31,79]],
  armor:[[48,18],[45,46],[56,75]], basket:[[51,23],[42,45],[48,70]], vessel:[[49,25],[50,58],[79,50]],
  screen:[[47,45],[75,53],[14,75]], bi:[[37,34],[50,49],[67,69]],huang:[[49,54],[23,48],[68,68]],
};
const safeUrl = value => /^https:\/\//i.test(value ?? '') ? value : '';

/** A room is an interactive scene; the study table keeps the exhibit in view. */
export function createMuseumView({ store, show, button, notify = () => {}, onCreate = () => {} }) {
  let controller = null;
  let roomId = 'heritage';
  let page = 0;
  let exhibitId = null;
  let section = 'story';
  let activeClue = -1;
  let enlarged = false;
  let lit = false;
  let studioTab = 'pieces';

  function dispose() {
    controller?.abort(); controller = null;
    document.querySelector('dialog')?.classList.remove('museum-dialog');
  }
  function listen(target, name, callback) { target?.addEventListener(name, callback, { signal: controller.signal }); }
  function observed(id) { return store.state.museum?.observations?.[id] ?? []; }
  function collected(id) { return store.state.museum?.inspirations?.includes(id) ?? false; }
  function roomsMarkup() {
    return `<nav class="museum-rooms" aria-label="玉文化博物馆分厅">${MUSEUM_ROOMS.map(room => `<button data-museum-room="${escape(room.id)}" ${room.id===roomId?'aria-current="page"':''}><span>${escape(room.title)}</span><small>${escape(room.subtitle)}</small></button>`).join('')}</nav>`;
  }
  function room() { return MUSEUM_ROOMS.find(item => item.id === roomId) ?? MUSEUM_ROOMS[1]; }
  function playerExhibits() {
    if(studioTab==='raw')return store.state.inventory.map((raw,index)=>{
      const draft=createDraft(raw),artworkCanvas=document.createElement('canvas');artworkCanvas.width=artworkCanvas.height=160;
      drawArtisanPiece(artworkCanvas.getContext('2d'),draft,{x:10,y:10,size:140,raw:true});
      const match=/^C([1-6])-[LR]$/.exec(raw.id);
      const mark=match?`C${match[1]}${raw.id.endsWith('L')?'左':'右'}`:`${index+1}号`;
      return {id:`raw:${raw.id}`,title:`${materialNames[raw.material]??'玉材'}原石 · ${mark}`,label:`${materialNames[raw.material]??'玉材'} · ${mark}`,raw,draft,shape:'stone',artworkCanvas,origin:match?`青岚矿洞 · C${match[1]} 玉脉簇`:'自藏原石'};
    });
    return store.state.pieces.map(piece => {
      const original=document.createElement('canvas');drawCollectionPiece(original,piece,{artifactOnly:true});
      const artworkCanvas=document.createElement('canvas');artworkCanvas.width=artworkCanvas.height=160;
      const c=artworkCanvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(original,60,60,360,360,0,0,160,160);
      return { id:`player:${piece.id}`, title:piece.name||`${materialNames[piece.material]??'玉材'}${shapeNames[piece.shape]??'作品'}`, shape:piece.shape, piece, artworkCanvas };
    });
  }
  function roomExhibits() { return roomId==='studio' ? playerExhibits() : MUSEUM_EXHIBITS.filter(item=>item.room===roomId); }
  function mount(body) {
    dispose();
    show('玉文化博物馆', `<div class="museum-view">${roomsMarkup()}${body}</div>`, '', true);
    const dialog=document.querySelector('dialog');dialog.classList.add('museum-dialog');
    dialog.querySelector('.dialog-body').scrollTop=0;
    controller=new AbortController();
    listen(dialog,'close',dispose);
    const root=dialog.querySelector('.museum-view');
    root.querySelectorAll('[data-museum-room]').forEach(control=>listen(control,'click',()=>{roomId=control.dataset.museumRoom;page=0;exhibitId=null;renderHall();}));
    return root;
  }
  function renderHall() {
    exhibitId=null;
    const current=room(),all=roomExhibits(),pages=Math.max(1,Math.ceil(all.length/6));
    page=Math.min(page,pages-1);
    const items=all.slice(page*6,page*6+6);
    const count=all.filter(item=>observed(item.id).length>0).length;
    const root=mount(`<div class="museum-room-heading"><div><h3>${escape(current.title)}</h3><p>${escape(current.description)}</p></div><span class="museum-visit-count">${roomId==='studio'?`${all.length} ${studioTab==='raw'?'块自藏原石':'件亲手之作'}`:`已细看 ${count} / ${all.length} 件`}</span></div>
      ${roomId==='studio'?`<div class="museum-studio-tools" aria-label="我的收藏分类"><button data-museum-studio="raw" aria-pressed="${studioTab==='raw'}">原石收藏 ${store.state.inventory.length}</button><button data-museum-studio="pieces" aria-pressed="${studioTab==='pieces'}">我的作品 ${store.state.pieces.length}</button><span>${studioTab==='raw'?'材料仍在行囊中，可以继续用它创作。':'这里收录你的全部作品，首展的三个展柜另行布置。'}</span></div>`:''}
      <div class="museum-hall" style="--museum-height-offset:${roomId==='studio'?350:310}px"><canvas width="960" height="560" aria-hidden="true"></canvas><div class="museum-hall-sign">${roomId==='studio'?(studioTab==='raw'?'一石一来处':'一器一故事'):'请近看，听玉说话'}</div>
      ${items.map((item,index)=>{const {x,y}=museumCasePositions(items.length)[index];return `<button class="museum-case" data-museum-exhibit="${escape(item.id)}" style="--case-x:${x/480*100}%;--case-y:${(y-65)/280*100}%" aria-label="近看${escape(item.title)}" title="${escape(item.title)}"><span class="museum-case-focus" aria-hidden="true"></span><span class="museum-case-label">${escape(item.label??item.title.split(' · ')[0])}${collected(item.id)?'<i aria-label="已收藏灵感">✦</i>':''}</span></button>`;}).join('')}
      ${!items.length?`<div class="museum-empty"><h4>${roomId==='studio'&&studioTab==='raw'?'这里等待你带回的原石':'这里等待你的第一件作品'}</h4><p>${studioTab==='raw'?'前往青岚矿洞采集玉料，带回的原石会出现在这里。':'从名作中收下一点灵感，回工坊把它变成自己的玉器。'}</p><button data-museum-create>回到工坊</button></div>`:''}</div>
      <div class="museum-hall-footer"><p>${roomId==='studio'?(studioTab==='raw'?'选择一块原石，看看它的色带与来处，再决定是否动手。':'你的作品保留自己的纹样、玉色与祝福。'):'选择展柜近看，观察形制、玉色与雕工，再把灵感带回工作台。'}</p><div>${pages>1?`<button data-museum-page="-1" ${page===0?'disabled':''}>前一组</button><span>${page+1} / ${pages}</span><button data-museum-page="1" ${page===pages-1?'disabled':''}>后一组</button>`:''}<button data-museum-notebook>灵感册 <b>${store.state.museum?.inspirations?.length??0}</b></button></div></div>`);
    drawMuseumRoom(root.querySelector('.museum-hall canvas'),items,roomId);
    root.querySelectorAll('[data-museum-exhibit]').forEach(control=>listen(control,'click',()=>{
      const id=control.dataset.museumExhibit;
      if(id.startsWith('raw:'))renderRaw(items.find(item=>item.id===id));
      else if(id.startsWith('player:'))renderPlayer(items.find(item=>item.id===id));
      else {exhibitId=id;section='story';activeClue=-1;enlarged=false;lit=false;renderExhibit();}
    }));
    root.querySelectorAll('[data-museum-page]').forEach(control=>listen(control,'click',()=>{page+=Number(control.dataset.museumPage);renderHall();}));
    root.querySelectorAll('[data-museum-studio]').forEach(control=>listen(control,'click',()=>{studioTab=control.dataset.museumStudio;page=0;renderHall();}));
    listen(root.querySelector('[data-museum-create]'),'click',()=>onCreate({}));
    listen(root.querySelector('[data-museum-notebook]'),'click',renderNotebook);
  }
  function renderExhibit() {
    const exhibit=MUSEUM_EXHIBITS.find(item=>item.id===exhibitId);
    if(!exhibit){renderHall();return;}
    roomId=exhibit.room;
    const seen=observed(exhibit.id),saved=collected(exhibit.id),positions=cluePositions[exhibit.shape]??cluePositions.stone;
    const root=mount(`<div class="museum-study-heading"><button data-museum-back>返回${escape(room().title)}</button><span>${escape(exhibit.period)}</span><span>像素艺术转绘 · 原作资料见展签</span></div>
      <div class="museum-study"><section class="museum-observation" aria-label="${escape(exhibit.title)}观察台"><div class="museum-lens ${enlarged?'is-enlarged':''} ${lit?'is-lit':''}"><div class="museum-lens-rim"></div><div class="museum-art-window"><canvas width="480" height="480" aria-label="${escape(exhibit.title)}的像素示意"></canvas></div>${exhibit.lookFor.map((clue,index)=>`<button class="museum-clue ${seen.includes(index)?'is-seen':''} ${activeClue===index?'is-active':''}" data-museum-clue="${index}" style="left:${positions[index%positions.length][0]}%;top:${positions[index%positions.length][1]}%" aria-label="观察：${escape(clue)}" title="${escape(clue)}">${index+1}</button>`).join('')}<span class="museum-lens-tick tick-top"></span><span class="museum-lens-tick tick-left"></span><span class="museum-lens-tick tick-right"></span><span class="museum-lens-tick tick-bottom"></span></div>
      <div class="museum-tools" aria-label="观察工具"><button data-museum-zoom aria-pressed="${enlarged}"><span aria-hidden="true">⌕</span>${enlarged?'完整器形':'放大细看'}</button><button data-museum-light aria-pressed="${lit}"><span aria-hidden="true">☼</span>${lit?'柔和照明':'提亮观察'}</button><span class="museum-clue-count">观察 ${seen.length} / ${exhibit.lookFor.length}</span></div>
      <p class="museum-observation-note" role="status">${activeClue>=0?escape(exhibit.lookFor[activeClue]):'轻点玉器上的观察点，留意轮廓、颜色与细纹。'}</p></section>
      <section class="museum-scroll" aria-label="展品故事与观察记录"><div class="museum-scroll-roller top"></div><div class="museum-scroll-paper"><p class="museum-scroll-origin">${escape(exhibit.museum)}</p><h3>${escape(exhibit.title)}</h3><dl class="museum-facts"><div><dt>玉材</dt><dd>${escape(exhibit.material)}</dd></div><div><dt>作者</dt><dd>${escape(exhibit.creator)}</dd></div></dl><div class="museum-story-tabs"><button data-museum-section="story" aria-pressed="${section==='story'}">器物故事</button><button data-museum-section="notes" aria-pressed="${section==='notes'}">观察笔记</button></div>
      <div class="museum-scroll-reading">${section==='story'?`<p class="museum-summary">${escape(exhibit.summary)}</p><p>${escape(exhibit.story)}</p>`:`<ul class="museum-observation-list">${exhibit.lookFor.map((clue,index)=>`<li><button data-museum-clue="${index}" ${activeClue===index?'aria-current="true"':''}><span>${seen.includes(index)?'✓':'○'}</span>${escape(clue)}</button></li>`).join('')}</ul><p class="museum-note-hint">看见一个细节，就能收下一条创作灵感。</p>`}</div>
      <div class="museum-inspiration"><span>带回工坊的灵感</span><h4>${escape(exhibit.technique.name)}</h4><p>${escape(exhibit.technique.hint)}</p><div><button data-museum-collect ${saved?'disabled':''}>${saved?'灵感已收入册中':'收藏这条灵感'}</button><button data-museum-create class="museum-create">带着灵感创作</button></div><p class="museum-save-feedback" role="status"></p></div>
      <a class="museum-source" href="${escape(safeUrl(exhibit.source?.url))}" target="_blank" rel="noopener noreferrer">原作资料：${escape(exhibit.source?.title??'馆藏来源')} ↗</a></div><div class="museum-scroll-roller bottom"></div></section></div>`);
    drawMuseumArtifact(root.querySelector('.museum-art-window canvas'),exhibit);
    listen(root.querySelector('[data-museum-back]'),'click',renderHall);
    root.querySelectorAll('[data-museum-section]').forEach(control=>listen(control,'click',()=>{section=control.dataset.museumSection;renderExhibit();}));
    root.querySelectorAll('[data-museum-clue]').forEach(control=>listen(control,'click',()=>{
      activeClue=Number(control.dataset.museumClue);
      if(!store.active){
        root.querySelector('.museum-observation-note').textContent=`${exhibit.lookFor[activeClue]}。开启或继续旅程后，可以保存观察记录。`;
        return;
      }
      if(store.recordMuseumObservation(exhibit.id,activeClue)){
        renderExhibit();
        document.querySelector(`.museum-lens [data-museum-clue="${activeClue}"]`)?.focus({preventScroll:true});
      }else notify('观察记录未能保存，请继续游戏后再试。');
    }));
    listen(root.querySelector('[data-museum-zoom]'),'click',()=>{enlarged=!enlarged;renderExhibit();});
    listen(root.querySelector('[data-museum-light]'),'click',()=>{lit=!lit;renderExhibit();});
    listen(root.querySelector('[data-museum-collect]'),'click',()=>{
      if(!store.active){root.querySelector('.museum-save-feedback').textContent='先在主菜单开启或继续旅程，再收藏灵感。';return;}
      if(!seen.length){section='notes';renderExhibit();document.querySelector('.museum-save-feedback').textContent='先选择一个观察点，记下你看见的细节。';return;}
      if(store.collectInspiration(exhibit.id)){renderExhibit();document.querySelector('.museum-save-feedback').textContent=store.dirty?'灵感暂留本次游戏，请导出备份。':'这条灵感已收入你的册页。';}
      else document.querySelector('.museum-save-feedback').textContent='暂时无法收藏，请稍后重试。';
    });
    listen(root.querySelector('[data-museum-create]'),'click',()=>onCreate({exhibitId:exhibit.id,techniqueId:exhibit.technique.id}));
  }
  function renderNotebook() {
    const ids=store.state.museum?.inspirations??[];
    const items=MUSEUM_EXHIBITS.filter(item=>ids.includes(item.id));
    const root=mount(`<div class="museum-study-heading"><button data-museum-back>返回展厅</button><span>把看见的细节，变成自己的选择</span></div><section class="museum-notebook"><div class="museum-notebook-title"><span>玉</span><h3>我的灵感册</h3><p>${items.length?'每一页都来自一次认真观察。':'册页还是空的。去看一件玉器，找出让你停下来的细节。'}</p></div><div class="museum-notebook-pages">${items.map(item=>`<button class="museum-notebook-entry" data-museum-note="${escape(item.id)}"><canvas width="160" height="160" data-note-art="${escape(item.id)}" aria-hidden="true"></canvas><span><strong>${escape(item.technique.name)}</strong><small>${escape(item.title)}</small><p>${escape(item.technique.hint)}</p></span><b>翻看</b></button>`).join('')}${!items.length?'<button data-museum-back>去展厅寻找灵感</button>':''}</div></section>`);
    root.querySelectorAll('[data-museum-back]').forEach(control=>listen(control,'click',renderHall));
    root.querySelectorAll('[data-note-art]').forEach(canvas=>drawMuseumArtifact(canvas,items.find(item=>item.id===canvas.dataset.noteArt)));
    root.querySelectorAll('[data-museum-note]').forEach(control=>listen(control,'click',()=>{exhibitId=control.dataset.museumNote;section='notes';activeClue=-1;renderExhibit();}));
  }
  function renderPlayer(item) {
    if(!item){renderHall();return;}
    const piece=item.piece;
    const root=mount(`<div class="museum-study-heading"><button data-museum-back>返回我的玉展</button><span>玩家创作</span></div><section class="museum-player-study"><div class="museum-player-art"><canvas width="480" height="480" aria-label="${escape(item.title)}"></canvas></div><div class="museum-player-label"><h3>${escape(item.title)}</h3><p>${escape(piece.blessing||'这件作品等待一句心意。')}</p><dl><div><dt>作者</dt><dd>你</dd></div><div><dt>玉材</dt><dd>${escape(materialNames[piece.material]??piece.material)}</dd></div><div><dt>器型</dt><dd>${escape(shapeNames[piece.shape]??piece.shape)}</dd></div></dl><p>这是你亲手制作的作品，拥有自己的材料、纹样与祝福。</p><button data-museum-export>导出作品 PNG</button><button data-museum-create>继续创作</button><p class="museum-save-feedback" role="status"></p></div></section>`);
    const canvas=root.querySelector('.museum-player-art canvas');drawCollectionPiece(canvas,piece);
    listen(root.querySelector('[data-museum-back]'),'click',renderHall);
    listen(root.querySelector('[data-museum-create]'),'click',()=>onCreate({}));
    listen(root.querySelector('[data-museum-export]'),'click',()=>{
      const feedback=root.querySelector('.museum-save-feedback');
      canvas.toBlob(blob=>{
        if(!blob){if(feedback.isConnected)feedback.textContent='暂时未能生成图片，请重试。';return;}
        const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`像素琢玉_${shapeNames[piece.shape]??'作品'}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
        if(feedback.isConnected)feedback.textContent='PNG 已生成，已请求浏览器下载。';
      },'image/png');
    });
  }
  function renderRaw(item) {
    if(!item){renderHall();return;}
    let sideLight=false;
    const root=mount(`<div class="museum-study-heading"><button data-museum-back>返回原石收藏</button><span>你带回的原石</span></div><section class="museum-player-study"><div class="museum-player-art museum-raw-art"><canvas width="480" height="480" aria-label="${escape(item.title)}的真实材料外观"></canvas><button data-museum-raw-light aria-pressed="false">侧光观察</button></div><div class="museum-player-label"><h3>${escape(item.title)}</h3><p>先看看这块玉，再决定它将成为怎样的器物。</p><dl><div><dt>玉材</dt><dd>${escape(materialNames[item.raw.material]??item.raw.material)}</dd></div><div><dt>来处</dt><dd>${escape(item.origin)}</dd></div><div><dt>状态</dt><dd>原石 · 尚未加工</dd></div></dl><p>天然色带和轮廓会随着这块材料进入创作。放上不同纸样，可以比较哪些颜色被留下。</p><button data-museum-create>以此原石创作</button><p class="museum-save-feedback" role="status">收藏展示不会消耗原石。</p></div></section>`);
    const canvas=root.querySelector('canvas'),context=canvas.getContext('2d');
    const paint=()=>{context.fillStyle='#10291f';context.fillRect(0,0,480,480);context.strokeStyle='#887949';context.lineWidth=3;context.strokeRect(15,15,450,450);drawArtisanPiece(context,item.draft,{x:65,y:65,size:350,raw:true,light:sideLight ? .8 : -.65});};
    paint();
    listen(root.querySelector('[data-museum-back]'),'click',renderHall);
    listen(root.querySelector('[data-museum-create]'),'click',()=>onCreate({materialId:item.raw.id}));
    listen(root.querySelector('[data-museum-raw-light]'),'click',event=>{sideLight=!sideLight;event.currentTarget.setAttribute('aria-pressed',String(sideLight));paint();});
  }
  function open(nextRoom='heritage',nextExhibit=null) {
    roomId=MUSEUM_ROOMS.some(item=>item.id===nextRoom)?nextRoom:'heritage';page=0;exhibitId=nextExhibit;section='story';activeClue=-1;enlarged=false;lit=false;
    if(exhibitId)renderExhibit();else renderHall();
  }
  return { open,dispose };
}
