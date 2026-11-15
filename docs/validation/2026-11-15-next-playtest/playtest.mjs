// Isolated QA browser only. No save injection or character teleport.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from '../2026-11-15-museum-craft/browser-driver.mjs';
import { getCraftSurface, stageMetrics } from '../../../src/craft-model.js';
const qa = await connect(Number(process.argv[2]));
const phase = process.argv[3] ?? 'mine';
const dir = new URL('./', import.meta.url);
const save = () => qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
const shot = name => qa.screenshot(new URL(name + '.png', dir));
async function drawPath(points) {
  const box = await qa.evaluate(`(()=>{const e=document.querySelector('.creative-canvas canvas');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};})()`);
  const place = p => ({x:box.x+(74+p.x*372/64)*box.w/520,y:box.y+(24+p.y*372/64)*box.h/420});
  await qa.send('Input.dispatchMouseEvent',{type:'mouseMoved',...place(points[0])});
  await qa.send('Input.dispatchMouseEvent',{type:'mousePressed',...place(points[0]),button:'left',buttons:1,clickCount:1});
  for(const p of points) await qa.send('Input.dispatchMouseEvent',{type:'mouseMoved',...place(p),button:'left',buttons:1});
  await qa.send('Input.dispatchMouseEvent',{type:'mouseReleased',...place(points.at(-1)),button:'left',clickCount:1});
  await sleep(65);
}
async function sweep(left=0,right=64,step=6) {
  for(let y=0;y<=64;y+=step) await drawPath([{x:left,y},{x:right,y}]);
}
async function hold(code, key, duration = 70) {
  await qa.send('Input.dispatchKeyEvent', {type:'keyDown',code,key,windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
  await sleep(duration);
  await qa.send('Input.dispatchKeyEvent', {type:'keyUp',code,key,windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
  await sleep(220);
}
try {
  await qa.send('Page.bringToFront');
  if (phase === 'mine') {
    await shot('01-mine-entry');
    await hold('KeyW','w',4900);
    await hold('KeyD','d',365);
    await hold('KeyS','s',1450);
    await hold('KeyD','d',240);
    await hold('KeyR','r');
    assert.deepEqual((await save()).mineSurvey,['C1']);
    await shot('02-observed');
    await hold('Digit2','2');
    await hold('KeyE','e',1600);
    await hold('KeyD','d',205);
    await hold('Digit1','1');
    await hold('KeyE','e',380);
    const state = await save();
    assert.ok(state.inventory.some(item=>item.id==='C1-L'));
    await shot('03-collected');
    await fs.writeFile(new URL('mined-save.json',dir),JSON.stringify(state,null,2));
    console.log(JSON.stringify({phase,inventory:state.inventory,mineSurvey:state.mineSurvey}));
  }
  if (phase === 'shape') {
    assert.equal((await save()).crafting.artisan.material.id,'C1-L');
    await shot('05-shape-start');
    await sweep();
    const metrics = stageMetrics((await save()).crafting.artisan);
    console.log(JSON.stringify({phase,metrics}));
    assert.equal(metrics.ready,true);
    await shot('06-shaped');
    await qa.click('[data-next]');
    await qa.click('[data-save]');
    const before = (await save()).crafting;
    await qa.send('Page.reload');await sleep(1800);
    await qa.click('.landscape-menu [data-action="continue"]');
    await qa.click('.workshop-page-tools [data-action="make"]');
    assert.deepEqual((await save()).crafting,before);
    await shot('07-restored-carving');
  }
  if (phase === 'carve') {
    const draft = (await save()).crafting.artisan;
    for (const path of getCraftSurface(draft).guidePaths) await drawPath(path);
    await qa.click('[data-tool="relief"]');
    await sweep(0,23);
    const carved = stageMetrics((await save()).crafting.artisan);
    console.log(JSON.stringify({phase,metrics:carved}));assert.equal(carved.ready,true);
    await shot('08-carved');await qa.click('[data-next]');
    await sweep();await qa.click('[data-tool="polish"]');await sweep(0,20);
    const polished = stageMetrics((await save()).crafting.artisan);
    console.log(JSON.stringify({phase:'polish',metrics:polished}));assert.equal(polished.ready,true);
    await shot('09-polished');await qa.click('[data-next]');
    const state=await save();assert.equal(state.pieces[0].id,'C1-L');assert.equal(state.inventory.length,0);
    await shot('10-finished');
    await fs.writeFile(new URL('finished-save.json',dir),JSON.stringify(state,null,2));
  }
  if (phase === 'exhibit') {
    if (await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="continue"]'))`)) {
      await qa.click('.landscape-menu [data-action="continue"]');
    }
    await qa.click('.workshop-page-tools [data-action="customize"]');
    const label = await qa.evaluate(`document.querySelector('#collection-pattern').selectedOptions[0].textContent`);
    assert.equal(label,'组合玉稿 · 云头、水波');
    const before=(await save()).pieces[0];
    await qa.click('[data-collection-save]');
    assert.deepEqual((await save()).pieces[0],before);
    assert.equal(before.blessing,'让云水留在玉里');
    await shot('12-inscription-fixed');
    const downloads = new URL('downloads/',dir);await fs.mkdir(downloads,{recursive:true});
    const {targetInfo}=await qa.send('Target.getTargetInfo');
    await qa.send('Browser.setDownloadBehavior',{behavior:'allow',browserContextId:targetInfo.browserContextId,downloadPath:fileURLToPath(downloads)});
    await qa.click('[data-collection-export]');await sleep(600);
    assert.ok((await fs.readdir(downloads)).some(name=>name.endsWith('.png')));
    await qa.click('dialog header [data-action="close"]');
    await qa.click('.workshop-page-tools [data-action="gallery"]');
    await qa.click('#interface [data-action="exhibit"]');
    await qa.click('[data-collection-place="0"]');
    assert.equal((await save()).exhibits[0],before.id);
    await shot('13-exhibited');
    await qa.click('dialog header [data-action="close"]');await shot('14-gallery');
    await qa.send('Page.reload');await sleep(1800);
    await qa.click('.landscape-menu [data-action="continue"]');
    assert.equal((await save()).exhibits[0],before.id);
    assert.deepEqual((await save()).pieces[0],before);
    await qa.click('#interface [data-action="workshop"]');
    await sleep(350);
    await qa.click('.workshop-page-tools [data-action="customize"]');
    await qa.click('[data-rework]');
    assert.equal((await save()).pieces.length,0);
    await qa.click('[data-save]');
    await qa.send('Page.reload');await sleep(1800);
    await qa.click('.landscape-menu [data-action="continue"]');
    await qa.click('.workshop-page-tools [data-action="make"]');
    await qa.click('[data-cancel]');
    const state=await save();assert.deepEqual(state.pieces[0],before);assert.equal(state.exhibits[0],before.id);
    await shot('15-rework-cancelled');
    await fs.writeFile(new URL('final-save.json',dir),JSON.stringify(state,null,2));
    console.log(JSON.stringify({phase,label,download:true,exhibit:state.exhibits,restored:true,reworkCancelled:true}));
  }
  if (phase === 'rework') {
    const before=(await save()).pieces[0];
    await qa.click('#interface [data-action="workshop"]');await sleep(350);
    await qa.click('.workshop-page-tools [data-action="customize"]');
    await qa.click('[data-rework]');assert.equal((await save()).pieces.length,0);
    await qa.click('[data-save]');
    await qa.send('Page.reload');await sleep(1800);
    await qa.click('.landscape-menu [data-action="continue"]');
    await qa.click('.workshop-page-tools [data-action="make"]');
    await qa.click('[data-cancel]');
    const state=await save();assert.deepEqual(state.pieces[0],before);assert.equal(state.exhibits[0],before.id);
    await shot('15-rework-cancelled');
    await fs.writeFile(new URL('final-save.json',dir),JSON.stringify(state,null,2));
    console.log(JSON.stringify({phase,restored:true,exhibits:state.exhibits}));
  }
  if (phase === 'hud') {
    if (await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="continue"]'))`)) await qa.click('.landscape-menu [data-action="continue"]');
    await qa.click('.workshop-page-tools [data-action="mine"]');await sleep(350);
    assert.equal(await qa.evaluate(`document.querySelector('.mine-status span').getAttribute('aria-label')`),'已观察矿脉 1/6');
    await shot('16-mine-progress');
    await qa.click('.workshop-page-tools [data-action="gallery"]');await sleep(350);
    assert.equal(await qa.evaluate(`document.querySelector('.hud meter').value`),1);
    assert.equal(await qa.evaluate(`document.querySelector('.hud meter').max`),3);
    assert.equal(await qa.evaluate(`document.querySelector('.hud meter').getAttribute('aria-label')`),'已展作品');
    await shot('17-gallery-progress');
    await qa.click('#interface [data-action="exhibit"]');
    await qa.click('[data-collection-remove="0"]');
    assert.equal(await qa.evaluate(`document.querySelector('.hud meter').value`),0);
    await qa.click('[data-collection-place="0"]');
    assert.equal(await qa.evaluate(`document.querySelector('.hud meter').value`),1);
    await qa.click('dialog header [data-action="close"]');
    await qa.click('#interface [data-action="workshop"]');await sleep(350);
    await qa.click('.workshop-page-tools [data-action="customize"]');
    await qa.send('Emulation.setDeviceMetricsOverride',{width:800,height:700,deviceScaleFactor:1,mobile:false});await sleep(300);
    assert.equal(await qa.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    await shot('18-small-inscription');
    await qa.click('#collection-blessing');
    await qa.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
    await qa.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
    await qa.send('Input.insertText',{text:'玉'.repeat(25)});
    assert.equal(await qa.evaluate(`document.querySelector('[data-collection-save]').disabled&&document.querySelector('[data-collection-export]').disabled`),true);
    assert.equal((await save()).pieces[0].blessing,'让云水留在玉里');
    await shot('19-blessing-limit');
    await qa.click('dialog header [data-action="close"]');
    await qa.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    console.log(JSON.stringify({phase,mineSurvey:1,exhibited:1,removeAndReplace:true,smallViewport:true,blessingLimit:true}));
  }
} finally { qa.close(); }
