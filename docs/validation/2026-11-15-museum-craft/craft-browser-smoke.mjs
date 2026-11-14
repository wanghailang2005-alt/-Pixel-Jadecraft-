// Uses an isolated browser and a labelled raw-material fixture; no player save is touched.
// Run with the agent-browser Chrome CDP port as the first argument.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { connect, sleep } from './browser-driver.mjs';
import { freshState, SAVE_KEY } from '../../../src/state.js';
import { getCraftSurface, stageMetrics } from '../../../src/craft-model.js';

const qa = await connect(Number(process.argv[2] ?? 52366));
const dir = new URL('./', import.meta.url);
const phase = process.argv[3] ?? 'setup';
const save = () => qa.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`);
const shot = name => qa.screenshot(new URL(name, dir));
async function drawPath(points) {
  const box = await qa.evaluate(`(()=>{const b=document.querySelector('.creative-canvas canvas').getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};})()`);
  const place = p => ({ x: box.x + (74+p.x*372/64)*box.w/520, y:box.y+(24+p.y*372/64)*box.h/420 });
  await qa.send('Input.dispatchMouseEvent',{type:'mouseMoved',...place(points[0])});
  await qa.send('Input.dispatchMouseEvent',{type:'mousePressed',...place(points[0]),button:'left',buttons:1,clickCount:1});
  for(const p of points) await qa.send('Input.dispatchMouseEvent',{type:'mouseMoved',...place(p),button:'left',buttons:1});
  await qa.send('Input.dispatchMouseEvent',{type:'mouseReleased',...place(points.at(-1)),button:'left',clickCount:1});
  await sleep(60);
}
async function sweep(left=0,right=64,step=6) {
  for(let y=0;y<=64;y+=step) await drawPath([{x:left,y},{x:right,y}]);
}
async function reloadContinue() {
  await qa.send('Page.reload'); await sleep(1600);
  await qa.click('.landscape-menu [data-action="continue"]');
}
try {
  if(phase==='setup') {
    const state=freshState();
    state.inventory=[{id:'qa-fish-jade',material:'jadeite'},{id:'qa-moon-jade',material:'nephrite'},{id:'qa-seal-jade',material:'jadeite'}];
    await fs.writeFile(new URL('raw-material-fixture.json',dir),JSON.stringify(state,null,2));
    await qa.evaluate(`localStorage.setItem(${JSON.stringify(SAVE_KEY)},${JSON.stringify(JSON.stringify(state))})`);
    await reloadContinue();
    await qa.click('.workshop-page-tools [data-action="make"]');
    await qa.evaluate(`(()=>{const s=document.querySelector('#creative-shape');s.value='fish';s.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await shot('creative-design.png');
    await qa.click('[data-begin]');
    await drawPath([{x:0,y:20},{x:64,y:20}]);
    const before=(await save()).crafting.artisan;
    assert.ok(before.undo);
    await qa.click('[data-undo]');
    const undo=(await save()).crafting.artisan;
    assert.notDeepEqual(undo.base,before.base);
    await sweep();
    assert.equal(stageMetrics((await save()).crafting.artisan).ready,true);
    await shot('creative-shaping.png');
    await qa.click('[data-next]');
    await qa.click('[data-save]');
    await reloadContinue();
    await qa.click('.workshop-page-tools [data-action="make"]');
    assert.equal((await save()).crafting.artisan.stage,'carve');
    console.log('Setup, design, actual mouse shaping, undo and save/resume passed.');
  }
  if(phase==='carve') {
    const draft=(await save()).crafting.artisan;
    assert.equal(draft.stage,'carve');
    const paths=getCraftSurface(draft).guidePaths;
    for(const path of paths) await drawPath(path);
    await qa.click('.creative-tools [data-tool="relief"]');
    await sweep(0,23,6);
    const metrics=stageMetrics((await save()).crafting.artisan);
    console.log('Carve',metrics); assert.equal(metrics.ready,true);
    await shot('creative-carving.png');
    await qa.click('[data-next]');
    await sweep();
    await qa.click('.creative-tools [data-tool="polish"]');
    await sweep(0,20,6);
    const finishMetrics=stageMetrics((await save()).crafting.artisan);
    console.log('Finish',finishMetrics); assert.equal(finishMetrics.ready,true);
    await shot('creative-finishing.png');
    await qa.click('[data-next]');
    assert.equal((await save()).pieces.length,1);
    await shot('creative-finished.png');
    await qa.click('dialog [data-action="customize"]');
    await qa.click('#collection-blessing');
    await qa.send('Input.insertText',{text:'让春水留在玉里'});
    await qa.click('[data-collection-save]');
    assert.equal((await save()).pieces[0].blessing,'让春水留在玉里');
    await shot('creative-inscription.png');
    await fs.writeFile(new URL('finished-ui-save.json',dir),JSON.stringify(await save(),null,2));
    console.log('Actual mouse engraving, relief, satin/gloss, completion and inscription passed.');
  }
  if(phase==='display') {
    await reloadContinue();
    const original=(await save()).pieces[0]; assert.ok(original.artisan);
    await qa.click('.workshop-page-tools [data-action="customize"]');
    const {targetInfo}=await qa.send('Target.getTargetInfo');
    await qa.send('Browser.setDownloadBehavior',{behavior:'allow',browserContextId:targetInfo.browserContextId,downloadPath:new URL('downloads/',dir).pathname.replace(/^\/([A-Z]:)/,'$1')});
    await qa.click('[data-collection-export]'); await sleep(500);
    await qa.click('dialog header [data-action="close"]');
    await qa.click('.workshop-page-tools [data-action="inventory"]');
    await qa.click('dialog [data-tab="pieces"]');
    assert.equal(await qa.evaluate(`document.querySelectorAll('[data-stored-art]').length`),2);
    await shot('inventory-actual-work.png');
    await qa.click('dialog header [data-action="close"]');
    await qa.click('.workshop-page-tools [data-action="gallery"]');
    await qa.click('#interface [data-action="exhibit"]');
    await qa.click('[data-collection-place="0"]');
    assert.equal((await save()).exhibits[0],original.id);
    await qa.evaluate(`(()=>{const s=document.querySelector('[data-light]');s.value='side';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal((await save()).museum.lighting,'side');
    await shot('exhibition-curation.png');
    await qa.click('dialog header [data-action="close"]');
    await shot('personal-gallery.png');
    await qa.click('#interface [data-action="workshop"]');
    await qa.click('.workshop-page-tools [data-action="customize"]');
    await qa.evaluate(`document.querySelector('#rework-shape').value='seal'`);
    await qa.click('[data-rework]');
    assert.equal((await save()).crafting.shape,'seal');
    assert.equal((await save()).pieces.length,0);
    await drawPath([{x:0,y:20},{x:64,y:20}]);
    await qa.click('[data-save]'); await reloadContinue();
    await qa.click('.workshop-page-tools [data-action="make"]');
    await qa.click('[data-cancel]');
    assert.deepEqual((await save()).pieces[0],original);
    assert.equal((await save()).exhibits[0],original.id);
    console.log('PNG request, inventory renderer, exhibition, lighting, rework/cancel after reload passed.');
  }
} finally {qa.close();}
