import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStore, freshState, validateState, SAVE_KEY } from './state.js';
import { CARE_CELLS, LETTER_CLUES, freshStory, brushHeirloom, makeDelivery, returnLetter, exhibitionVisitors, carvedMotifKinds } from './story.js';
import { createDraft, applyStroke, getCraftSurface, advanceStage, stageMetrics, endStroke } from './craft-model.js';
import { firstMotif } from './motifs.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
function setup(){const disk=storage(),game=new GameStore(disk);game.startNew();return {disk,game};}
function observe(game){for(const c of LETTER_CLUES)assert.equal(game.observeLetter(c.id),true);}
function carvedFish(kind='wave',extra=[]){
  const d=createDraft({id:'made',material:'jadeite'},'fish',{}, {motifs:[firstMotif(kind,'fish'),...extra]});
  const sweep=tool=>{for(let y=0;y<=64;y+=6)applyStroke(d,{x:-8,y},{x:72,y},tool,5);endStroke(d);};
  sweep('rough');assert.equal(advanceStage(d),true);
  for(const path of getCraftSurface(d).guidePaths)for(let i=1;i<path.length;i++)applyStroke(d,path[i-1],path[i],'engrave',1.4);
  endStroke(d);sweep('relief');assert.equal(advanceStage(d),true);sweep('sand');
  const target=getCraftSurface(d).target;
  for(let i=0;i<target.length&&stageMetrics(d).gloss<.12;i++)if(target[i])applyStroke(d,{x:i%64+.5,y:Math.floor(i/64)+.5},{x:i%64+.5,y:Math.floor(i/64)+.5},'polish',1);
  endStroke(d);assert.equal(advanceStage(d),true);return {id:'made',shape:'fish',material:'jadeite',artisan:d};
}

test('old saves receive story, survey and independent audio defaults without altering materials',()=>{
  const state=freshState();delete state.story;delete state.mineSurvey;state.settings={muted:true,volume:.61};
  state.inventory=[{id:'C1-L',material:'nephrite'}];
  const normalized=validateState(state);
  assert.deepEqual(normalized.story,freshStory());assert.deepEqual(normalized.mineSurvey,[]);
  assert.equal(normalized.settings.musicVolume,.22);assert.equal(normalized.settings.sfxVolume,.61);
  assert.deepEqual(normalized.inventory,state.inventory);
});
test('heirloom requires evidence, real cleaning and cord; completion and return persist once',()=>{
  const {game,disk}=setup();assert.equal(game.chooseLetterRoute('preserve'),false);
  observe(game);assert.equal(game.chooseLetterRoute('preserve'),true);
  assert.equal(game.deliverLetter(),false);assert.equal(game.careForHeirloom({x:30,y:23},{x:31,y:23}),false);
  for(const index of CARE_CELLS)game.careForHeirloom({x:index%32+.5,y:Math.floor(index/32)+.5},{x:index%32+.5,y:Math.floor(index/32)+.5});
  assert.equal(game.state.story.cleaned.length,CARE_CELLS.length);
  assert.equal(game.deliverLetter(),false);game.tieHeirloomCord();assert.equal(game.deliverLetter(),true);
  assert.equal(game.state.inventory.length,0);assert.equal(game.state.pieces.length,0);
  assert.equal(game.chooseLetterRoute('companion'),false);assert.equal(game.deliverLetter(),false);
  assert.equal(game.receiveLetterReturn(),true);assert.equal(game.receiveLetterReturn(),false);
  const restored=new GameStore(disk);assert.equal(restored.error,'');assert.deepEqual(restored.state.story,game.state.story);
  assert.match(returnLetter(restored.state.story),/小划痕/);
});
test('care brush sweeps preserve named memory scar and reject nonfinite coordinates',()=>{
  const s=freshStory();s.route='preserve';s.clues=LETTER_CLUES.map(c=>c.id);
  assert.equal(brushHeirloom(s,{x:0,y:0},{x:NaN,y:3}),false);
  brushHeirloom(s,{x:6,y:6},{x:11,y:6});assert.equal(s.cleaned.length,9);
  assert.ok(!s.cleaned.includes(14+12*32));
});
test('companion feedback remembers actual material and motif with two non-numeric valid answers',()=>{
  const s=freshStory();s.clues=LETTER_CLUES.map(c=>c.id);s.route='companion';
  assert.equal(makeDelivery(s,{id:'unfinished',shape:'fish'}),null);
  assert.equal(makeDelivery(s,{id:'wrong',shape:'seal',artisan:{completed:true}}),null);
  const fish=carvedFish();
  s.delivery=makeDelivery(s,fish);assert.match(returnLetter(s),/水纹/);assert.match(returnLetter(s),/翠色/);
  const alternative=structuredClone(s);alternative.delivery={...s.delivery,material:'nephrite',motifs:['leaf'],finish:'satin'};
  assert.match(returnLetter(alternative),/叶纹/);assert.match(returnLetter(alternative),/河雾/);
});
test('off-jade design parts never become claims of actually carved water in a return letter',()=>{
  const outside={...firstMotif('wave','fish','outside'),x:.4,y:.4,scale:.35};
  const piece=carvedFish('cloud',[outside]);
  assert.deepEqual(carvedMotifKinds(piece.artisan),['cloud']);
  const s={...freshStory(),clues:LETTER_CLUES.map(c=>c.id),route:'companion'};s.delivery=makeDelivery(s,piece);
  assert.doesNotMatch(returnLetter(s),/刻的水纹/);
  const state=freshState();state.pieces=[{id:'seal',shape:'seal'}];state.exhibits=['seal',null,null];state.story.order=['process','material','letter'];
  assert.doesNotMatch(exhibitionVisitors(state)[0].text,/鱼尾/);
});
test('visitor observations change with first displayed work, order and caption; no invented record',()=>{
  const state=freshState();const empty=exhibitionVisitors(state);assert.match(empty[0].text,/还没有/);
  state.pieces=[{id:'fish',shape:'fish',artisan:{completed:true,motifs:[{kind:'wave'}]}}];state.exhibits=['fish',null,null];
  const materialFirst=exhibitionVisitors(state);assert.match(materialFirst[0].text,/小鱼/);assert.match(materialFirst[2].text,/为谁做/);
  state.story.order=['process','letter','material'];state.story.caption='craft';
  const processFirst=exhibitionVisitors(state);assert.notEqual(materialFirst[1].text,processFirst[1].text);assert.match(processFirst[1].text,/1个纹样/);
});
test('malformed story and sound imports leave existing save untouched',()=>{
  const {game,disk}=setup();const before=disk.getItem(SAVE_KEY);
  const cases=[{story:{...freshStory(),returned:true}},{story:{...freshStory(),order:['letter','letter','process']}},{mineSurvey:['C7']},{settings:{...game.state.settings,musicVolume:2}},{story:{...freshStory(),cleaned:[Infinity]}}];
  for(const extra of cases){assert.throws(()=>game.importSave(JSON.stringify({...freshState(),...extra})));assert.equal(disk.getItem(SAVE_KEY),before);}
});
test('curation is saved only at gallery and survives reload',()=>{
  const {game,disk}=setup();assert.equal(game.curateStory(['letter','material','process'],'memory'),false);
  game.navigate('gallery');assert.equal(game.curateStory(['letter','material','process'],'memory'),true);
  assert.equal(game.curateStory(['letter','letter','process'],'craft'),false);
  const loaded=new GameStore(disk);assert.deepEqual(loaded.state.story.order,['letter','material','process']);
});
