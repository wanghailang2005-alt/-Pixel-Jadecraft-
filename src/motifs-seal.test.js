import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTIFS, motifPaths, firstMotif, transformedMotifPaths, validateMotifs } from './motifs.js';
import { createDraft, getCraftSurface, applyStroke, beginStroke, endStroke, undoStroke, resetStage, advanceStage, stageMetrics, validateDraft, serializeDraft, deserializeDraft, reopenCarving, localToCraftPoint, craftPointToLocal } from './craft-model.js';
import { createSealImpression, drawSealAlbum } from './seal.js';

const raw={id:'composition-jade',material:'jadeite'};
function sweep(draft,tool){beginStroke(draft);for(let y=0;y<=64;y+=6)applyStroke(draft,{x:-8,y},{x:72,y},tool,5);endStroke(draft);}
function readyCarving(draft){
  sweep(draft,'rough');assert.equal(advanceStage(draft),true);
  beginStroke(draft);for(const path of getCraftSurface(draft).guidePaths)for(let i=1;i<path.length;i++)applyStroke(draft,path[i-1],path[i],'engrave',1.1);endStroke(draft);
  sweep(draft,'relief');assert.equal(stageMetrics(draft).ready,true,JSON.stringify(stageMetrics(draft)));
}
function polish(draft){
  sweep(draft,'sand');const surface=getCraftSurface(draft);
  for(let i=0;i<surface.target.length&&stageMetrics(draft).gloss<.14;i++)if(surface.target[i]){const p={x:i%64+.5,y:Math.floor(i/64)+.5};applyStroke(draft,p,p,'polish',1);}
  endStroke(draft);assert.equal(stageMetrics(draft).ready,true);
}

test('six independent drawing components transform by rotation, mirror and local position',()=>{
  assert.equal(Object.keys(MOTIFS).length,6);
  assert.equal(new Set(Object.keys(MOTIFS).map(kind=>JSON.stringify(motifPaths(kind)))).size,6);
  const item={...firstMotif('leaf','fish'),x:.1,y:.15,rotation:90,scale:1.25,mirror:true};
  const original=motifPaths('leaf')[0][0],actual=transformedMotifPaths(item)[0][0];
  assert.ok(Math.abs(actual.x-(item.x-original.y*.3))<1e-9);
  assert.ok(Math.abs(actual.y-(item.y-original.x*.3))<1e-9);
  const draft=createDraft(raw,'fish',{x:.02,y:-.03,rotation:25,scale:.9});
  const roundTrip=craftPointToLocal(draft,localToCraftPoint(draft,item));
  assert.ok(Math.abs(roundTrip.x-item.x)<1e-9);assert.ok(Math.abs(roundTrip.y-item.y)<1e-9);
});

test('moving, rotating, mirroring and combining components changes the 64-grid cutter guide only',()=>{
  const motif=firstMotif('leaf','fish');
  const base=createDraft(raw,'fish',{}, {motifs:[motif]}),surface=getCraftSurface(base);
  for(const change of [{x:motif.x+.09},{rotation:70},{mirror:true},{scale:1.5}]){
    const other=createDraft(raw,'fish',{}, {motifs:[{...motif,...change}]});
    assert.notDeepEqual(getCraftSurface(other).guide,surface.guide);
    assert.deepEqual(other.base,base.base);assert.deepEqual(other.carve,base.carve);
  }
  const combined=createDraft(raw,'fish',{}, {motifs:[motif,{...firstMotif('wave','fish','m2'),y:.1}]});
  assert.ok(getCraftSurface(combined).guide.filter(Boolean).length>surface.guide.filter(Boolean).length);
  assert.ok(combined.carve.every(value=>value===0),'a drawn design never supplies cuts');
  assert.equal(getCraftSurface(combined).guide.length,4096);
});

test('every component can be shaped, carved and finished on each of the three retained shapes',()=>{
  for(const shape of ['bi','fish','seal'])for(const kind of Object.keys(MOTIFS)){
    const motif={...firstMotif(kind,shape),rotation:15,mirror:true};
    const draft=createDraft(raw,shape,{}, {motifs:[motif]});readyCarving(draft);
    assert.equal(advanceStage(draft),true);polish(draft);assert.equal(advanceStage(draft),true);
    assert.deepEqual(deserializeDraft(serializeDraft(draft)),draft);
    assert.deepEqual(draft.motifs,[motif]);assert.ok(draft.carve.some(Boolean));
  }
});

test('a multi-component composition keeps exact cuts, undo and layout through JSON reload',()=>{
  const motifs=[{...firstMotif('mountain','seal'),x:-.1,rotation:-10},{...firstMotif('wave','seal','m2'),x:.11,mirror:true,scale:.6}];
  const draft=createDraft(raw,'seal',{rotation:18}, {motifs});
  sweep(draft,'rough');advanceStage(draft);
  const path=getCraftSurface(draft).guidePaths[0];applyStroke(draft,path[0],path[1],'engrave',1);endStroke(draft);
  const restored=deserializeDraft(serializeDraft(draft));assert.deepEqual(restored,draft);
  assert.ok(restored.carve.some(Boolean));assert.equal(undoStroke(restored),true);assert.ok(restored.carve.every(v=>v===0));
  restored.motifs[0].x+=.01;assert.notDeepEqual(restored.motifs,draft.motifs);
});

test('legacy drafts keep their guide and forged or oversized composition data is rejected',()=>{
  const legacy=createDraft(raw,'bi');assert.equal(Object.hasOwn(legacy,'motifs'),false);
  assert.deepEqual(validateDraft(legacy),legacy);
  const item=firstMotif('cloud','bi'),valid=createDraft(raw,'bi',{}, {motifs:[item]});
  for(const motifs of [[],Array(1),[item,item],Array.from({length:13},(_,i)=>({...item,id:`m${i}`})),[{...item,kind:'unknown'}],[{...item,x:NaN}],[{...item,scale:10}],[{...item,rotation:181}],[{...item,mirror:1}],[{...item,id:'<script>'}]])assert.throws(()=>validateDraft({...valid,motifs}));
  const copy=validateMotifs([item]);copy[0].x=0;assert.notEqual(copy[0].x,item.x);
});

test('seal proof reads the actual surface, mirrors left cuts to the right and ignores uncut guide artwork',()=>{
  const draft=createDraft(raw,'seal',{}, {motifs:[firstMotif('mountain','seal')]});sweep(draft,'rough');advanceStage(draft);
  const before=createSealImpression(draft);
  const other={...draft,motifs:[firstMotif('fish','seal')]};assert.deepEqual(createSealImpression(other),before);
  const p=localToCraftPoint(draft,{x:-.16,y:.14});applyStroke(draft,p,p,'engrave',1.3);endStroke(draft);
  const after=createSealImpression(draft),changed=before.ink.flatMap((value,i)=>value&&!after.ink[i]?[i]:[]);
  assert.ok(changed.length>0);assert.ok(changed.every(i=>i%64>32),'left-hand cuts appear on the right of the paper');
  assert.equal(after.mirrored,true);assert.ok(after.coverage<before.coverage);
  assert.equal(undoStroke(draft),true);assert.deepEqual(createSealImpression(draft),before);
  const leftGuide=getCraftSurface(draft).guide.findIndex((v,i)=>!v&&getCraftSurface(draft).target[i]&&i%64<28&&Math.floor(i/64)>35);
  const q={x:leftGuide%64+.5,y:Math.floor(leftGuide/64)+.5};applyStroke(draft,q,q,'relief',1);endStroke(draft);
  assert.ok(createSealImpression(draft).coverage<before.coverage,'lowered background also stops carrying ink');
  assert.throws(()=>createSealImpression(createDraft(raw,'fish')));
});

test('returning from polish keeps the carved surface, permits new proofs and remains recoverable',()=>{
  const draft=createDraft(raw,'seal',{}, {motifs:[firstMotif('cloud','seal')]});readyCarving(draft);advanceStage(draft);polish(draft);
  const cuts=draft.carve.slice(),heights=draft.height.slice(),base=draft.base.slice(),proof=createSealImpression(draft);
  assert.equal(reopenCarving(draft),true);assert.equal(draft.stage,'carve');
  assert.deepEqual(draft.carve,cuts);assert.deepEqual(draft.height,heights);assert.deepEqual(draft.base,base);
  assert.deepEqual(createSealImpression(draft),proof);assert.deepEqual(validateDraft(draft),draft);
  const p=localToCraftPoint(draft,{x:-.2,y:.15});applyStroke(draft,p,p,'engrave',.6);endStroke(draft);
  assert.equal(resetStage(draft),true);assert.deepEqual(draft.carve,cuts);
  assert.equal(advanceStage(draft),true);polish(draft);advanceStage(draft);assert.equal(reopenCarving(draft),false);
});

test('PNG album drawing emits actual proof pixels without inserting the design pattern',()=>{
  const calls=[],context=new Proxy({}, {get:(target,key)=>target[key]??((...args)=>calls.push([key,...args])),set:(target,key,value)=>{target[key]=value;return true;}});
  const canvas={getContext:()=>context};const proof={size:64,ink:Array(4096).fill(0)};proof.ink[63]=1;
  drawSealAlbum(canvas,[proof]);assert.equal(canvas.width,384);assert.equal(canvas.height,416);
  assert.ok(calls.some(([name,x,y,w,h])=>name==='fillRect'&&x===300&&y===86&&w===4&&h===4));
});

test('white-line and red-line seals have different physical work, not recolored proof presets',()=>{
  const motifs=[{...firstMotif('mountain','seal'),y:-.12,scale:1.5},{...firstMotif('wave','seal','m2'),y:.15,scale:1.6}];
  const negative=createDraft(raw,'seal',{}, {motifs,sealCut:'intaglio'}),positive=createDraft(raw,'seal',{}, {motifs,sealCut:'relief'});
  assert.deepEqual(getCraftSurface(negative).guide,getCraftSurface(positive).guide);
  for(const draft of [negative,positive]){sweep(draft,'rough');assert.equal(advanceStage(draft),true);assert.equal(stageMetrics(draft).ready,false);}
  for(const path of getCraftSurface(negative).guidePaths)for(let i=1;i<path.length;i++)applyStroke(negative,path[i-1],path[i],'engrave',1.1);endStroke(negative);
  assert.equal(stageMetrics(negative).ready,true);assert.equal(stageMetrics(negative).groundCoverage,0);
  sweep(positive,'relief');assert.equal(stageMetrics(positive).ready,true);assert.equal(stageMetrics(positive).guideCoverage,0);assert.equal(stageMetrics(positive).retainedGuide,1);
  assert.notDeepEqual(createSealImpression(negative).ink,createSealImpression(positive).ink);
  assert.ok(createSealImpression(negative).coverage>createSealImpression(positive).coverage);
  const actualProof=createSealImpression(negative);negative.sealCut='relief';assert.deepEqual(createSealImpression(negative),actualProof,'changing an intent does not repaint actual stone');negative.sealCut='intaglio';
  for(const draft of [negative,positive]){advanceStage(draft);polish(draft);advanceStage(draft);assert.deepEqual(validateDraft(draft),draft);}
});

test('square-face seal metadata is validated while older side-view seals keep their silhouette',()=>{
  const old=createDraft(raw,'seal'),modern=createDraft(raw,'seal',{}, {motifs:[firstMotif('mountain','seal')],sealCut:'relief'});
  assert.equal(Object.hasOwn(old,'sealFace'),false);assert.equal(modern.sealFace,true);
  assert.notDeepEqual(getCraftSurface(old).target,getCraftSurface(modern).target);
  for(const corrupt of [{...modern,sealFace:false},{...modern,sealCut:'unknown'},{...modern,shape:'fish'},{...old,sealFace:true},{...old,sealCut:'relief'}])assert.throws(()=>validateDraft(corrupt));
  assert.deepEqual(deserializeDraft(serializeDraft(old)),old);
});
