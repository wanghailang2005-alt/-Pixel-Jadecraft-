import { createDraft, LAYOUT_PRESETS, getCraftSurface, beginStroke, endStroke, applyStroke, undoStroke, resetStage, stageMetrics, craftPointToLocal, localToCraftPoint } from './craft-model.js';
import { drawWorktable, drawArtisanPiece } from './piece-renderer.js';
import { MOTIFS, MAX_MOTIFS, motifPaths, transformedMotifPaths, firstMotif } from './motifs.js';
import { createSealImpression, drawSealImpression, drawSealAlbum } from './seal.js';
import { createCraftingView } from './crafting-view.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';
import './creative.css';

const NAMES = { bi: '玉璧', fish: '玉鱼佩', seal: '玉印' };
const PATTERNS = { cloud: '云纹起稿', dragon: '龙纹起稿', grain: '谷纹起稿', custom: '自己组合纹样' };
const TOOLS = { shape: [['rough','粗磨头','去掉纸样外的余料'],['fine','细修头','精修边缘与内孔']], carve: [['engrave','细刻头','循玉稿刻下自己的线'],['relief','平磨头','磨低背景，留下浮雕']], polish: [['sand','细磨砂','把表面整理为柔光'],['polish','布轮','点亮局部，保留柔亮对比']] };
const STAGES = { shape: '琢形', carve: '雕纹与浮雕', polish: '磨出光泽' };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

function glyph(canvas, kind) {
  const c = canvas.getContext('2d');
  c.clearRect(0,0,44,44); c.strokeStyle='#493321'; c.lineWidth=2; c.lineJoin='miter';
  for(const path of motifPaths(kind)){c.beginPath();path.forEach((p,i)=>c[i?'lineTo':'moveTo'](Math.round(22+p.x*32),Math.round(22+p.y*32)));c.stroke();}
}

export function createCreativeView({store,show,button,notify}) {
  const legacy=createCraftingView({store,show,button,notify});
  let dispose=()=>{}, inspirationId=null, designOptions={}, lastSound=-Infinity;
  // Trial sheets are session notes; the saved surface remains the source of every new print.
  const impressions=new Map();
  function sound(name){const now=performance.now();if(now-lastSound<(name==='stamp'?180:95))return;lastSound=now;window.dispatchEvent(new CustomEvent('jade:sound',{detail:{name}}));}
  function pullPrint(draft){const proofs=impressions.get(draft.material.id)??[];proofs.push(createSealImpression(draft));if(proofs.length>4)proofs.shift();impressions.set(draft.material.id,proofs);sound('stamp');return proofs;}
  function exportPrints(draft){
    const proofs=impressions.get(draft.material.id)??pullPrint(draft),canvas=document.createElement('canvas');drawSealAlbum(canvas,proofs);
    const link=document.createElement('a');link.download=`玉印试印谱-${draft.material.id.replace(/[^a-zA-Z0-9_-]/g,'_')}.png`;link.href=canvas.toDataURL('image/png');link.click();notify('印谱已导出，保留了本次最近四张试印。');
  }
  function renderProofs(root,draft){
    const proofs=impressions.get(draft.material.id)??[],host=root.querySelector('[data-proofs]');if(!host)return;
    host.innerHTML=proofs.length?proofs.slice(-2).map((proof,index)=>`<figure><canvas width="192" height="192" aria-label="${index===1||proofs.length===1?'这一次':'上一次'}的镜像试印"></canvas><figcaption>${index===1||proofs.length===1?'这一次':'上一次'} · 留朱 ${Math.round(proof.coverage*100)}%</figcaption></figure>`).join(''):'<p>先落一印，看看刻槽与留白。继续刻，再印一次，就能比较变化。</p>';
    host.querySelectorAll('canvas').forEach((canvas,index)=>drawSealImpression(canvas.getContext('2d'),proofs.slice(-2)[index],{size:192}));
    const status=root.querySelector('[data-proof-status]');if(status)status.textContent=proofs.length?'印迹左右相反：刻槽与磨低处不着朱。纸上保留落印时的样子，再刻后请重新试印。':'纸上会出现真实刀痕，不会自动补成玉稿。';
  }
  function sealPaper(draft){return '<section class="creative-seal-paper"><div class="creative-seal-heading"><h3>试印手记</h3><button data-stamp>蘸朱试印</button><button data-export-proof>导出印谱 PNG</button></div><div class="creative-proofs" data-proofs></div><p data-proof-status role="status"></p><p>刻下的线与磨低的背景不着朱；留下的高处会印在纸上。沿着印面试一试，留朱与留白可以相互呼应。</p></section>';}
  function open(options={}){
    dispose();inspirationId=options.inspirationId??inspirationId;designOptions=options;
    if(store.state.crafting){if(!store.state.crafting.artisan)legacy.open();else work();}else design();
  }
  function design(){
    const inventory=store.state.inventory;
    if(!inventory.length){show('一石一世界','<div class="creative-empty"><span>琢</span><h3>先把一块玉带回工坊</h3><p>在玉文化馆找到灵感，再去矿洞挑选原石。每块玉的色带不同，回来后让它成为鱼背、云气或山水。</p><p>已有作品也可以返工，重新安排器型和纹样。</p></div>',button('前往矿洞','mine')+button('参观玉文化馆','museum'),true);return;}
    const ideas=store.state.museum.inspirations.map(id=>MUSEUM_EXHIBITS.find(e=>e.id===id)).filter(Boolean),initialShape=NAMES[designOptions.shape]?designOptions.shape:'bi';
    let motifs=structuredClone(designOptions.motifs??[firstMotif('cloud',initialShape)]),selected=motifs[0].id,serial=1;
    let layout={...(designOptions.layout??{x:0,y:0,rotation:0,scale:.94})},placement,previewDraft,moving=null;
    show('因材施艺 · 设计玉稿',`<section class="creative-view"><p class="creative-lead">让石头的颜色，成为作品的一部分。</p><div class="creative-design"><div class="creative-design-preview"><canvas width="520" height="420" tabindex="0" aria-label="玉稿：拖动部件，方向键移动选中部件"></canvas><p>拖动纹样部件 · 方向键微调 · 金线是留下的玉，浅线是待刻的纹</p><div class="creative-presets"><button data-layout="color">留色纸样</button><button data-layout="light">留白纸样</button></div><section class="creative-motif-book"><h3>大师手记 · 六枚纹样</h3><div class="creative-motif-palette">${Object.entries(MOTIFS).map(([kind,m])=>`<button data-add-motif="${kind}" title="${m.hint}" aria-label="添加${m.name}"><canvas width="44" height="44" aria-hidden="true"></canvas><span>${m.name}</span></button>`).join('')}</div><p>选几枚纹样，挪一挪、翻一翻，拼成你自己的画面。</p><div class="creative-motif-list" aria-label="玉稿中的部件"></div><div class="creative-motif-editor"><label>部件方向 <output data-motif-angle>0°</output><input data-motif-rotation type="range" min="-180" max="180" step="5" value="0"></label><label>部件大小<input data-motif-scale type="range" min="35" max="200" step="5" value="100"></label><label>部件左右<input data-motif-x type="range" min="-40" max="40" step="1" value="0"></label><label>部件上下<input data-motif-y type="range" min="-40" max="40" step="1" value="0"></label><div class="creative-motif-actions"><button data-mirror aria-pressed="false">左右翻转</button><button data-duplicate>复制部件</button><button data-remove>移走部件</button></div></div><p data-composition-status role="status"></p></section></div><aside class="creative-controls"><label>选一块玉<select id="creative-material">${inventory.map((p,i)=>`<option value="${esc(p.id)}">${p.material==='jadeite'?'翡翠':'和田玉'} · ${i+1}号原石</option>`).join('')}</select></label><label>器型<select id="creative-shape">${Object.entries(NAMES).map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label><label class="creative-wide">起稿方式<select id="creative-pattern">${Object.entries(PATTERNS).map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label><label>纸样方向 <output data-angle>0°</output><input id="creative-angle" type="range" min="-35" max="35" value="0"></label><label>保留尺寸<input id="creative-scale" type="range" min="80" max="102" value="94"></label><label>纸样左右<input id="creative-x" type="range" min="-4.5" max="4.5" step=".5" value="0"></label><label>纸样上下<input id="creative-y" type="range" min="-4.5" max="4.5" step=".5" value="0"></label><label class="creative-wide" data-seal-choice>印法<select id="creative-seal-cut"><option value="intaglio">白文 · 刻下的线留白</option><option value="relief">朱文 · 留下的纹着朱</option></select></label><label class="creative-wide">表面意图<select id="creative-finish"><option value="contrast">局部亮、大片柔光</option><option value="satin">温润柔光、少许点睛</option></select></label><label class="creative-wide">我的灵感<select id="creative-inspiration"><option value="">自由创作</option>${ideas.map(e=>`<option value="${e.id}" ${e.id===inspirationId?'selected':''}>${esc(e.title)} · ${esc(e.technique.name)}</option>`).join('')}</select></label><p class="creative-material-note"></p><p class="creative-design-note">玉稿只是下刀的引导。成器时留下的是你真正刻过的线，不会自动填好。</p><button class="primary" data-begin>确定玉稿，动手琢玉</button></aside></div></section>`,button('返回工坊','close'),true);
    const root=document.querySelector('.creative-view'),canvas=root.querySelector('.creative-design-preview>canvas'),dialog=root.closest('dialog');
    root.querySelector('.creative-design').prepend(root.querySelector('.creative-motif-book'));
    const controller=new AbortController(),listen=(target,type,fn)=>target.addEventListener(type,fn,{signal:controller.signal});
    const field=id=>root.querySelector(`#creative-${id}`),custom=()=>field('pattern').value==='custom';
    field('shape').value=initialShape;field('pattern').value=designOptions.motifs||!designOptions.pattern?'custom':designOptions.pattern;
    if(inventory.some(p=>p.id===designOptions.materialId))field('material').value=designOptions.materialId;
    if(['intaglio','relief'].includes(designOptions.sealCut))field('seal-cut').value=designOptions.sealCut;
    if(['satin','contrast'].includes(designOptions.finish))field('finish').value=designOptions.finish;
    function syncLayout(){field('angle').value=layout.rotation;field('scale').value=layout.scale*100;field('x').value=layout.x*100;field('y').value=layout.y*100;}syncLayout();
    const build=()=>createDraft(inventory.find(p=>p.id===field('material').value),field('shape').value,layout,{pattern:custom()?'cloud':field('pattern').value,finish:field('finish').value,sealCut:field('seal-cut').value,...(custom()?{motifs}:{})});
    function syncEditor(){
      const item=motifs.find(m=>m.id===selected),enabled=custom()&&!!item;
      root.querySelectorAll('.creative-motif-editor input,.creative-motif-editor button').forEach(control=>{control.disabled=!enabled;});
      root.querySelector('[data-remove]').disabled=!enabled||motifs.length===1;root.querySelector('[data-duplicate]').disabled=!enabled||motifs.length>=MAX_MOTIFS;
      root.querySelectorAll('[data-add-motif]').forEach(control=>{control.disabled=custom()&&motifs.length>=MAX_MOTIFS;});
      root.querySelector('.creative-motif-list').innerHTML=custom()?motifs.map((m,index)=>`<button data-select-motif="${m.id}" aria-pressed="${m.id===selected}">${index+1} · ${MOTIFS[m.kind].name}${m.mirror?' ↔':''}</button>`).join(''):'<span>现在采用参考纹样。点上方部件，开始自己的拼纹。</span>';
      if(!item)return;for(const[name,value]of Object.entries({rotation:item.rotation,scale:item.scale*100,x:item.x*100,y:item.y*100}))root.querySelector(`[data-motif-${name}]`).value=value;
      root.querySelector('[data-motif-angle]').textContent=`${item.rotation}°`;root.querySelector('[data-mirror]').setAttribute('aria-pressed',String(item.mirror));
    }
    function draw(){
      layout={x:Number(field('x').value)/100,y:Number(field('y').value)/100,rotation:Number(field('angle').value),scale:Number(field('scale').value)/100};
      root.querySelector('[data-seal-choice]').hidden=field('shape').value!=='seal'||!custom();
      previewDraft=build();placement=drawWorktable(canvas,previewDraft,{raw:true,design:true,guide:true});root.querySelector('[data-angle]').textContent=`${layout.rotation}°`;
      const surface=getCraftSurface(previewDraft),metrics=stageMetrics(previewDraft),c=canvas.getContext('2d'),item=custom()&&motifs.find(m=>m.id===selected);
      if(item){const point=localToCraftPoint(previewDraft,item),scale=placement.size/64;c.strokeStyle='#f4dfaa';c.lineWidth=2;c.setLineDash([4,4]);c.strokeRect(placement.x+point.x*scale-10,placement.y+point.y*scale-10,20,20);c.setLineDash([]);}
      const outside=custom()&&motifs.filter(m=>!transformedMotifPaths(m).flat().some(p=>{const w=localToCraftPoint(previewDraft,p),x=Math.floor(w.x),y=Math.floor(w.y);return x>=0&&x<64&&y>=0&&y<64&&surface.target[y*64+x];})).length;
      const valid=metrics.guideCells>=12&&metrics.guideCells/metrics.targetCells<.88;root.querySelector('[data-begin]').disabled=!valid;
      root.querySelector('[data-composition-status]').textContent=!valid?(metrics.guideCells<12?'纹样落在玉外了，移回玉面或放大一些。':'纹样排得太满，缩小或挪开几枚，给浮雕留出背景。'):outside?`${outside} 枚部件还在玉外，可移回玉面。玉稿外的线不会刻进作品。`:custom()?`玉稿上有 ${motifs.length} 枚部件。相接与留白都由你决定。`:'可用参考起稿，也可以从六枚部件重新组合。';
      root.querySelector('.creative-material-note').textContent=field('shape').value==='seal'?'正对方形印面起稿。把山、水或自己的记号放进玉面，雕好后蘸朱试印；纸上的图案会左右翻转。':'观察这块玉的独立色带，移动纸样，让一抹颜色成为叶脉、鱼背或远山。';
    }
    function changed(){syncEditor();draw();}
    const nextId=()=>{while(motifs.some(m=>m.id===`m${serial}`))serial++;return `m${serial++}`;};
    root.querySelectorAll('[data-add-motif]').forEach(control=>{glyph(control.querySelector('canvas'),control.dataset.addMotif);listen(control,'click',()=>{
      if(!custom())motifs=[];if(motifs.length>=MAX_MOTIFS)return;field('pattern').value='custom';const item=firstMotif(control.dataset.addMotif,field('shape').value,nextId());
      if(motifs.length){item.x=clamp(item.x+(motifs.length%3)*.035,-.4,.4);item.y=clamp(item.y+Math.floor(motifs.length/3)*.025,-.4,.4);}motifs.push(item);selected=item.id;changed();
    });});
    listen(root.querySelector('.creative-motif-list'),'click',e=>{const control=e.target.closest('[data-select-motif]');if(control){selected=control.dataset.selectMotif;changed();}});
    for(const name of ['rotation','scale','x','y'])listen(root.querySelector(`[data-motif-${name}]`),'input',e=>{const item=motifs.find(m=>m.id===selected);if(!item||!custom())return;item[name]=Number(e.target.value)/(name==='rotation'?1:100);changed();});
    listen(root.querySelector('[data-mirror]'),'click',()=>{const item=motifs.find(m=>m.id===selected);item.mirror=!item.mirror;changed();});
    listen(root.querySelector('[data-duplicate]'),'click',()=>{if(motifs.length>=MAX_MOTIFS)return;const item={...motifs.find(m=>m.id===selected),id:nextId()};item.x=clamp(item.x+.04,-.4,.4);motifs.push(item);selected=item.id;changed();});
    listen(root.querySelector('[data-remove]'),'click',()=>{if(motifs.length<=1)return;motifs=motifs.filter(m=>m.id!==selected);selected=motifs.at(-1).id;changed();});
    root.querySelectorAll('.creative-controls select,.creative-controls input').forEach(input=>listen(input,'input',changed));
    root.querySelectorAll('[data-layout]').forEach(control=>listen(control,'click',()=>{layout={...LAYOUT_PRESETS[control.dataset.layout]};syncLayout();changed();}));
    function canvasPoint(e){const b=canvas.getBoundingClientRect();return{x:((e.clientX-b.left)*canvas.width/b.width-placement.x)/placement.size*64,y:((e.clientY-b.top)*canvas.height/b.height-placement.y)/placement.size*64};}
    listen(canvas,'pointerdown',e=>{
      if(e.button!==0||!custom())return;const p=craftPointToLocal(previewDraft,canvasPoint(e)),nearest=motifs.map(m=>({m,d:Math.hypot(m.x-p.x,m.y-p.y)})).sort((a,b)=>a.d-b.d)[0];
      if(!nearest||nearest.d>.16*nearest.m.scale)return;selected=nearest.m.id;moving={pointer:e.pointerId,dx:nearest.m.x-p.x,dy:nearest.m.y-p.y};canvas.setPointerCapture(e.pointerId);canvas.focus();e.preventDefault();changed();
    });
    listen(canvas,'pointermove',e=>{if(moving?.pointer!==e.pointerId)return;const p=craftPointToLocal(previewDraft,canvasPoint(e)),item=motifs.find(m=>m.id===selected);item.x=clamp(Math.round((p.x+moving.dx)*1000)/1000,-.4,.4);item.y=clamp(Math.round((p.y+moving.dy)*1000)/1000,-.4,.4);changed();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,type,()=>{moving=null;});
    listen(canvas,'keydown',e=>{if(!custom()||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;e.preventDefault();const item=motifs.find(m=>m.id===selected),step=e.shiftKey?.04:.01;item.x=clamp(item.x+(e.code==='ArrowLeft'?-step:e.code==='ArrowRight'?step:0),-.4,.4);item.y=clamp(item.y+(e.code==='ArrowUp'?-step:e.code==='ArrowDown'?step:0),-.4,.4);changed();});
    listen(root.querySelector('[data-begin]'),'click',()=>{const draft=build();if(store.startCrafting(field('material').value,field('shape').value,{artisan:true,layout,pattern:draft.pattern,finish:field('finish').value,sealCut:field('seal-cut').value,inspirationId:field('inspiration').value,...(custom()?{motifs}:{})}))open();});
    listen(dialog,'close',()=>dispose());dispose=()=>{controller.abort();dispose=()=>{};};changed();
  }
  function work(){
    let draft=structuredClone(store.state.crafting.artisan),tool=draft.stage==='carve'&&draft.sealCut==='relief'?'relief':TOOLS[draft.stage][0][0],brush=draft.stage==='carve'&&draft.sealCut!=='relief'?1.3:4,light=-.65,guide=true,previous=null,pointer=null,dirty=false,keyboardWorking=false;
    const materialId=store.state.crafting.materialId,controller=new AbortController(),listen=(target,type,fn)=>target.addEventListener(type,fn,{signal:controller.signal});
    show(`${NAMES[draft.shape]} · ${STAGES[draft.stage]}`,`<section class="creative-view"><ol class="creative-stages">${Object.entries(STAGES).map(([id,n])=>`<li ${id===draft.stage?'aria-current="step"':''}>${n}</li>`).join('')}</ol><div class="creative-bench"><aside class="creative-tools"><h3>手边工具</h3>${TOOLS[draft.stage].map(([id,n,hint])=>`<button data-tool="${id}" aria-pressed="${id===tool}"><b>${n}</b><small>${hint}</small></button>`).join('')}<label>工具大小<input data-radius type="range" min=".5" max="7" step=".1" value="${brush}"></label><label>移动侧光<input data-light type="range" min="-100" max="100" value="-65"></label><label class="creative-check"><input data-guide type="checkbox" checked> 显示辅助线</label><button data-undo>撤销上一笔</button><button data-reset>重做本阶段</button></aside><div class="creative-canvas"><canvas width="520" height="420" tabindex="0" aria-label="玉作加工台：鼠标拖动，或方向键移动工具、空格加工"></canvas><p>按住拖动 · 松手保存 · 方向键与空格也可操作</p>${draft.motifs?`<p class="creative-composition-caption">你的玉稿：${draft.motifs.map(m=>MOTIFS[m.kind].name).join('、')}</p>`:''}</div><aside class="creative-notes"><h3>听玉成器</h3><p data-description></p><dl data-metrics></dl><progress max="100" value="0"></progress><output data-progress></output><p class="creative-insight">${draft.stage==='shape'?'余料离开，玉的形状才慢慢出现。保留区不会被意外切穿。':draft.stage==='carve'?(draft.sealFace?(draft.sealCut==='relief'?'朱文留下纹线，用平磨头剔地。纸上只留下高处的形。':'白文沿纹线下刀。刻槽在朱红的纸面上留白，不必再磨低背景。'):'刻线勾勒意象，磨低背景让它浮起。线外请换平磨头。'):'让亮处吸引目光，让柔光留住温润。整面磨亮会失去层次，可用细磨砂找回柔光。'}</p><p data-save-status role="status">每一笔都会留在这件作品里。</p></aside></div>${draft.shape==='seal'&&draft.stage!=='shape'?sealPaper(draft):''}<div class="creative-actions"><button data-cancel>撤销本次制作</button>${draft.stage==='polish'?'<button data-back-carve>回到雕纹，保留刀痕</button>':''}<button data-save>保存，稍后再做</button><button class="primary" data-next disabled>${draft.stage==='polish'?'落款成器':'进入下一阶段'}</button></div></section>`,'',true);
    const root=document.querySelector('.creative-view'),dialog=root.closest('dialog'),canvas=root.querySelector('.creative-canvas canvas'),cursor={x:32,y:32};let placement,frame=null;
    const canWork=()=>dialog.open&&root.isConnected&&!document.hidden&&store.active&&store.state.location==='workshop'&&store.state.crafting?.materialId===materialId;
    function draw(){
      frame=null;placement=drawWorktable(canvas,draft,{light,guide});const metrics=stageMetrics(draft);root.querySelector('[data-description]').textContent=metrics.detail;root.querySelector('progress').value=metrics.progress;
      root.querySelector('[data-progress]').textContent=metrics.ready?'已具备进入下一步的条件':`阶段完成 ${metrics.progress}%`;root.querySelector('[data-next]').disabled=!metrics.ready;
      const pairs=draft.stage==='shape'?[['余料处理',metrics.wasteRemoved]]:draft.stage==='carve'?(draft.sealFace?(draft.sealCut==='relief'?[['留住纹线',metrics.retainedGuide],['剔地完成',metrics.groundCoverage]]:[['白文刻线',metrics.guideCoverage],['刻线准确',metrics.precision]]):[['纹线完成',metrics.guideCoverage],['刻线准确',metrics.precision],['浮雕背景',metrics.relief]]):[['柔光区域',metrics.matte],['高光区域',metrics.gloss]];
      root.querySelector('[data-metrics]').innerHTML=pairs.filter(([,v])=>Number.isFinite(v)).map(([n,v])=>`<div><dt>${n}</dt><dd>${Math.round(v*100)}%</dd></div>`).join('');
      const c=canvas.getContext('2d'),k=placement.size/64;c.strokeStyle='#eedcb2';c.lineWidth=1;c.beginPath();c.arc(placement.x+cursor.x*k,placement.y+cursor.y*k,brush*k,0,Math.PI*2);c.stroke();c.fillStyle='#be9b63';c.fillRect(placement.x+cursor.x*k+brush*k,placement.y+cursor.y*k,4,15);
    }
    const redraw=()=>{if(frame===null)frame=requestAnimationFrame(draw);};
    function save(){if(!dirty)return true;endStroke(draft);const ok=store.updateArtisan(draft);if(ok){dirty=false;root.querySelector('[data-save-status]').textContent=store.dirty?'进度暂留本次游戏，请导出备份。':'本次笔触已保存。';}else notify('进度未更新，请保留窗口重试。');return ok;}
    function stop(){keyboardWorking=false;previous=null;const captured=pointer;pointer=null;if(captured!==null&&canvas.hasPointerCapture(captured))canvas.releasePointerCapture(captured);endStroke(draft);save();}
    function stroke(p){if(!canWork())return;if(!draft.strokeOpen)beginStroke(draft);applyStroke(draft,previous??p,p,tool,brush);previous=p;Object.assign(cursor,p);dirty=true;sound(draft.stage==='polish'?'polish':'carve');redraw();}
    const point=e=>{const b=canvas.getBoundingClientRect();return{x:((e.clientX-b.left)*canvas.width/b.width-placement.x)/placement.size*64,y:((e.clientY-b.top)*canvas.height/b.height-placement.y)/placement.size*64};};
    listen(canvas,'pointerdown',e=>{if(e.button!==0||!canWork())return;e.preventDefault();canvas.focus();pointer=e.pointerId;canvas.setPointerCapture(pointer);beginStroke(draft);stroke(point(e));});
    listen(canvas,'pointermove',e=>{if(pointer===e.pointerId)stroke(point(e));});for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(canvas,name,stop);
    listen(window,'blur',stop);listen(document,'visibilitychange',()=>{if(document.hidden)stop();});
    listen(canvas,'keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))return;e.preventDefault();cursor.x=clamp(cursor.x+(e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0),0,63);cursor.y=clamp(cursor.y+(e.code==='ArrowUp'?-1:e.code==='ArrowDown'?1:0),0,63);if(e.code==='Space')keyboardWorking=true;if(keyboardWorking||e.shiftKey)stroke({...cursor});else redraw();});
    listen(canvas,'keyup',e=>{if(e.code==='Space'||(!keyboardWorking&&e.code.startsWith('Arrow')))stop();});
    root.querySelectorAll('[data-tool]').forEach(b=>listen(b,'click',()=>{stop();tool=b.dataset.tool;brush=tool==='engrave'?1.3:4;root.querySelector('[data-radius]').value=brush;root.querySelectorAll('[data-tool]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));redraw();}));
    listen(root.querySelector('[data-radius]'),'input',e=>{brush=Number(e.target.value);redraw();});listen(root.querySelector('[data-light]'),'input',e=>{light=Number(e.target.value)/100;redraw();});listen(root.querySelector('[data-guide]'),'change',e=>{guide=e.target.checked;redraw();});
    listen(root.querySelector('[data-undo]'),'click',()=>{stop();if(undoStroke(draft)){dirty=true;save();redraw();}});listen(root.querySelector('[data-reset]'),'click',()=>{stop();resetStage(draft);dirty=true;save();redraw();});
    listen(root.querySelector('[data-save]'),'click',()=>{stop();if(!dirty)dialog.close();});listen(root.querySelector('[data-cancel]'),'click',()=>{stop();if(store.cancelCrafting()){dispose();open();}else notify('行囊已满，请先腾出一格。');});
    listen(root.querySelector('[data-next]'),'click',()=>{stop();if(!save()||!store.advanceCrafting())return;dispose();if(store.state.crafting)open();else complete(materialId);});
    const back=root.querySelector('[data-back-carve]');if(back)listen(back,'click',()=>{stop();if(!save())return;if(store.reopenArtisanCarving()){dispose();open();notify('刀痕已保留。补刻后重新细磨，再落一印比较。');}});
    const stamp=root.querySelector('[data-stamp]');if(stamp){listen(stamp,'click',()=>{stop();if(!save())return;pullPrint(draft);renderProofs(root,draft);});listen(root.querySelector('[data-export-proof]'),'click',()=>exportPrints(draft));renderProofs(root,draft);}
    listen(dialog,'close',()=>{stop();dispose();});dispose=()=>{controller.abort();if(frame!==null)cancelAnimationFrame(frame);dispose=()=>{};};draw();
  }
  function openSeal(piece){
    if(!piece?.artisan||piece.shape!=='seal')return false;dispose();const draft=piece.artisan;pullPrint(draft);
    show('一印一痕 · 玉印谱',`<section class="creative-view"><p class="creative-lead">纸上留住的，是你在玉面刻下的每一笔。</p>${sealPaper(draft)}</section>`,button('返回工坊','close'),true);
    const root=document.querySelector('.creative-view');renderProofs(root,draft);root.querySelector('[data-stamp]').onclick=()=>{pullPrint(draft);renderProofs(root,draft);};root.querySelector('[data-export-proof]').onclick=()=>exportPrints(draft);return true;
  }
  function complete(id){
    const piece=store.state.pieces.find(p=>p.id===id);show('玉里有你的答案',`<section class="creative-complete"><canvas width="400" height="330" aria-label="亲手制作的玉器"></canvas><div><p>一石一世界</p><h3>${NAMES[piece.shape]} · 已成器</h3><p>保留的天然色带、刻下的线迹和局部光泽，已经成为这件作品的一部分。</p><p>为它留一句话，或把它带到展厅，让别人看见你的选择。</p>${piece.shape==='seal'?'<button data-finished-proof>蘸朱试印，留一页印谱</button>':''}</div></section>`,button('为作品落款','customize','primary')+button('读一封旧玉来信','story')+button('进入玉文化馆','museum'),true);
    drawArtisanPiece(document.querySelector('.creative-complete canvas').getContext('2d'),piece.artisan,{x:35,y:0,size:330});const print=document.querySelector('[data-finished-proof]');if(print)print.onclick=()=>openSeal(piece);
  }
  return {open,openSeal,dispose:()=>dispose()};
}
