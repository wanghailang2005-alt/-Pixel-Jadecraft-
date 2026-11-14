// Isolated agent-browser tab only. Replays previously harvested raw stones; no new mining claim.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { getCraftSurface, stageMetrics, localToCraftPoint } from '../../../src/craft-model.js';
import { createSealImpression } from '../../../src/seal.js';
const port=Number(process.argv[2]),targetId=process.argv[3],phase=process.argv[4]??'design',mode=process.argv[5]??'intaglio';
const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target=tabs.find(t=>t.id===targetId);assert.ok(target?.url.includes('127.0.0.1:5183'),'only the named isolated QA target');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let serial=0;const pending=new Map(),errors=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),dir=new URL('./',import.meta.url);
async function click(selector){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await sleep(120);}
async function input(selector,value){await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
const saved=()=>evaluate("JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))");
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(new URL(name,dir),Buffer.from(r.data,'base64'));}
async function draw(points){
  const b=await evaluate("(()=>{const e=document.querySelector('.creative-canvas canvas');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};})()");
  const place=p=>({x:b.x+(74+p.x*372/64)*b.w/520,y:b.y+(24+p.y*372/64)*b.h/420});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...place(points[0])});await send('Input.dispatchMouseEvent',{type:'mousePressed',...place(points[0]),button:'left',buttons:1,clickCount:1});
  for(const p of points)await send('Input.dispatchMouseEvent',{type:'mouseMoved',...place(p),button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...place(points.at(-1)),button:'left',clickCount:1});await sleep(40);
}
async function sweep(left=0,right=64){for(let y=0;y<=64;y+=6)await draw([{x:left,y},{x:right,y}]);}
async function resume(){await send('Page.reload');await sleep(1200);await click('.landscape-menu [data-action="continue"]');}
await send('Runtime.enable');
try{
  if(phase==='design'){
    const original=JSON.parse(await fs.readFile(new URL('../2026-11-15-museum-craft/mine-real-input-save.json',dir),'utf8'));
    await evaluate(`localStorage.setItem('pixel-jadecraft.save.v1',${JSON.stringify(JSON.stringify(original))})`);await resume();
    await click('[data-action="workshop"]');await click('.workshop-page-tools [data-action="make"]');
    await input('#creative-shape','seal');await input('#creative-seal-cut',mode);await click('[data-add-motif="mountain"]');
    await click('[data-select-motif="m1"]');await click('[data-remove]');
    await input('[data-motif-x]',-9);await input('[data-motif-y]',-13);await input('[data-motif-scale]',155);
    await click('[data-add-motif="wave"]');await input('[data-motif-x]',5);await input('[data-motif-y]',14);await input('[data-motif-scale]',160);await input('[data-motif-rotation]',-15);await click('[data-mirror]');
    await click('[data-duplicate]');assert.equal(await evaluate("document.querySelectorAll('[data-select-motif]').length"),3);await click('[data-remove]');
    const canvasBox=await evaluate("(()=>{const e=document.querySelector('.creative-design-preview>canvas');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};})()");
    const anchor={x:canvasBox.x+(74+(32+.05*.94*64)*372/64)*canvasBox.w/520,y:canvasBox.y+(24+(32+.14*.94*64)*372/64)*canvasBox.h/420};
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...anchor,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:anchor.x+10,y:anchor.y,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:anchor.x+10,y:anchor.y,button:'left',clickCount:1});
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
    assert.ok(Number(await evaluate("document.querySelector('[data-motif-x]').value"))>5,'pointer drag and arrow key move the chosen component');
    assert.equal(await evaluate("document.querySelectorAll('[data-select-motif]').length"),2);
    await screenshot(`composition-${mode}-design.png`);await screenshot('composition-design.png');await click('[data-begin]');
    const draft=(await saved()).crafting.artisan;assert.equal(draft.motifs.length,2);assert.equal(draft.motifs[1].mirror,true);assert.equal(draft.motifs[1].rotation,-15);assert.equal(draft.sealCut,mode);
    await sweep();assert.equal(stageMetrics((await saved()).crafting.artisan).ready,true);await click('[data-next]');
    await click('[data-stamp]');await screenshot('seal-before-carving.png');
    await click('[data-save]');await resume();await click('.workshop-page-tools [data-action="make"]');
    assert.deepEqual((await saved()).crafting.artisan.motifs,draft.motifs);
    console.log('PASS composition inputs, actual shaping and composition reload');
  }
  if(phase==='carve'){
    if(await evaluate("Boolean(document.querySelector('.landscape-menu [data-action=\"continue\"]'))"))await click('.landscape-menu [data-action="continue"]');
    if(!await evaluate("Boolean(document.querySelector('.creative-canvas canvas'))"))await click('.workshop-page-tools [data-action="make"]');
    const draft=(await saved()).crafting.artisan;assert.equal(draft.stage,'carve');
    const before=createSealImpression(draft);await click('[data-stamp]');
    if(draft.sealCut==='relief'){await click('[data-tool="relief"]');await sweep();}
    else for(const path of getCraftSurface(draft).guidePaths)await draw(path);
    const current=(await saved()).crafting.artisan;assert.equal(stageMetrics(current).ready,true,JSON.stringify(stageMetrics(current)));
    assert.notDeepEqual(createSealImpression(current).ink,before.ink);await click('[data-stamp]');await screenshot(`seal-${mode}-carved-proof.png`);await screenshot('seal-carved-proof.png');
    await click('[data-next]');await sweep();await click('[data-tool="polish"]');await sweep(0,20);
    assert.equal(stageMetrics((await saved()).crafting.artisan).ready,true);await click('[data-stamp]');
    const beforeReturn=(await saved()).crafting.artisan;await click('[data-back-carve]');
    const returned=(await saved()).crafting.artisan;assert.equal(returned.stage,'carve');assert.deepEqual(returned.carve,beforeReturn.carve);assert.deepEqual(returned.height,beforeReturn.height);
    const surface=getCraftSurface(returned),cell=surface.target.findIndex((value,index)=>value&&surface.height[index]>=5&&!surface.carve[index]);const point={x:cell%64+.5,y:Math.floor(cell/64)+.5};
    await click('[data-tool="engrave"]');await draw([point,point]);assert.notDeepEqual(createSealImpression((await saved()).crafting.artisan).ink,createSealImpression(returned).ink);await click('[data-stamp]');await screenshot('seal-refined-proof.png');
    await click('[data-undo]');assert.deepEqual((await saved()).crafting.artisan.carve,returned.carve);await click('[data-next]');await sweep();await click('[data-tool="polish"]');await sweep(0,20);
    await click('[data-stamp]');await fs.mkdir(new URL('downloads/',dir),{recursive:true});await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:fileURLToPath(new URL('downloads/',dir))});const exportStarted=Date.now();await click('[data-export-proof]');await sleep(1000);
    const downloads=await fs.readdir(new URL('downloads/',dir));let downloaded;
    for(const name of downloads.filter(name=>name.endsWith('.png'))){const file=new URL(`downloads/${name}`,dir),stat=await fs.stat(file);if(stat.mtimeMs>=exportStarted-100)downloaded=file;}
    assert.ok(downloaded,'the browser must actually write a fresh PNG');const bytes=await fs.readFile(downloaded);assert.equal(bytes.subarray(1,4).toString(),'PNG');await fs.copyFile(downloaded,new URL(`seal-${mode}-album.png`,dir));
    await click('[data-next]');assert.ok((await saved()).pieces.some(p=>p.shape==='seal'&&p.artisan.motifs.length===2));await screenshot('composition-finished-seal.png');
    await fs.writeFile(new URL('finished-save.json',dir),JSON.stringify(await saved(),null,2));await fs.writeFile(new URL(`finished-${mode}-save.json`,dir),JSON.stringify(await saved(),null,2));
    console.log('PASS actual custom carving, mirrored print, rework, undo, local polish, PNG export and completion');
  }
  if(phase==='small'){
    await send('Emulation.setDeviceMetricsOverride',{width:800,height:700,deviceScaleFactor:1,mobile:false});
    if(await evaluate("Boolean(document.querySelector('.landscape-menu [data-action=\"continue\"]'))"))await click('.landscape-menu [data-action="continue"]');
    if(await evaluate("Boolean(document.querySelector('dialog[open]'))"))await click('dialog [data-action="close"]');await click('.workshop-page-tools [data-action="make"]');await screenshot('composition-small.png');
    const dimensions=await evaluate("(()=>{const e=document.querySelector('.creative-view');return{client:e.clientWidth,scroll:e.scrollWidth};})()");assert.ok(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));console.log('PASS 800px layout width',dimensions);
  }
  assert.deepEqual(errors,[]);console.log('Browser exceptions: 0');
}finally{socket.close();}
