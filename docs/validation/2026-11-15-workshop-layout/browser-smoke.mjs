// Dedicated QA browser. Imports an actual-play fixture through Settings; no state injection.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {connect,sleep} from '../2026-11-15-museum-craft/browser-driver.mjs';
const port=Number(process.argv[2]),qa=await connect(port),dir=new URL('./',import.meta.url);
const save=()=>qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
const shot=name=>qa.screenshot(new URL(`${name}.png`,dir));
const viewport=(width,height)=>qa.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
async function key(key,code,windowsVirtualKeyCode){
  await qa.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode});
  await qa.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode});await sleep(150);
}
let socket;
try{
  await viewport(1280,900);await qa.send('Page.bringToFront');await sleep(800);
  await shot('after');
  const panels=await qa.evaluate(`Array.from(document.querySelectorAll('.reference-panel')).map(e=>({left:e.offsetLeft,top:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight,titleClipped:e.querySelector('h2').scrollHeight>e.querySelector('h2').clientHeight}))`);
  assert.deepEqual(panels.map(({left,top,width,height})=>[left,top,width,height]),[[750,20,240,95],[750,120,240,180],[750,310,240,230]]);
  assert.ok(panels.every(p=>!p.titleClipped));
  await qa.click('[data-reference="bench"]');
  assert.match(await qa.evaluate(`document.querySelector('dialog').textContent`),/先把一块玉带回工坊/);
  assert.equal(await qa.evaluate(`document.querySelector('#game').dataset.paused`),'true');
  await key('Escape','Escape',27);
  await qa.click('[data-tab="jade"]');await key('ArrowRight','ArrowRight',39);
  assert.equal(await qa.evaluate(`document.querySelector('[data-tab="tables"]').getAttribute('aria-selected')`),'true');
  await key('ArrowLeft','ArrowLeft',37);
  assert.equal(await qa.evaluate(`document.querySelector('[data-tab="jade"]').getAttribute('aria-selected')`),'true');
  // File chooser events arrive on a second CDP connection.
  const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page'&&t.url.includes('127.0.0.1:'));
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  const pending=new Map();let sequence=0,chooserResolve;
  socket.addEventListener('message',event=>{const result=JSON.parse(event.data),p=pending.get(result.id);if(p){pending.delete(result.id);result.error?p.reject(result.error):p.resolve(result.result);}if(result.method==='Page.fileChooserOpened')chooserResolve?.(result.params);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  await qa.click('.workshop-page-tools [data-action="settings"]');await qa.click('[data-settings-backup]');
  await send('Page.enable');await send('Page.setInterceptFileChooserDialog',{enabled:true});
  let timeout;const chooser=new Promise((resolve,reject)=>{chooserResolve=resolve;timeout=setTimeout(()=>reject(Error('Missing chooser')),5000);});
  await qa.click('dialog [data-action="import"]');const opened=await chooser;clearTimeout(timeout);
  await send('DOM.setFileInputFiles',{files:[fileURLToPath(new URL('../2026-11-15-next-playtest/mined-save.json',dir))],backendNodeId:opened.backendNodeId});
  await sleep(300);await qa.click('dialog [data-action="confirm"]');await sleep(300);
  await send('Page.setInterceptFileChooserDialog',{enabled:false});socket.close();socket=null;
  await qa.click('.workshop-page-tools [data-action="workshop"]');await sleep(400);
  assert.equal((await save()).inventory[0].id,'C1-L');
  await qa.click('[data-jade="white"]');await qa.click('[data-pattern="grain"]');await qa.click('[data-reference="generate"]');
  assert.equal(await qa.evaluate(`document.querySelector('#creative-material').value`),'C1-L');
  assert.equal(await qa.evaluate(`document.querySelector('#creative-pattern').value`),'grain');
  await shot('selected-design');await qa.click('[data-begin]');await qa.click('[data-save]');
  const draft=(await save()).crafting;assert.ok(draft.artisan);
  assert.equal(await qa.evaluate(`document.querySelector('[data-reference="generate"]').textContent`),'继续创作');
  await qa.click('[data-reference="bench"]');assert.ok(await qa.evaluate(`Boolean(document.querySelector('.creative-canvas'))`));
  assert.deepEqual((await save()).crafting,draft);await qa.click('[data-save]');
  await qa.send('Page.reload');await sleep(1400);await qa.click('.landscape-menu [data-action="continue"]');
  await qa.click('[data-reference="generate"]');assert.deepEqual((await save()).crafting,draft);await qa.click('[data-save]');
  await viewport(800,700);await sleep(400);await shot('small');
  assert.equal(await qa.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  await qa.click('[data-reference="bench"]');await shot('small-crafting');
  assert.ok(await qa.evaluate(`Boolean(document.querySelector('.creative-canvas'))`));await qa.click('[data-save]');
  await qa.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await qa.send('Page.reload');await sleep(1400);await qa.click('.landscape-menu [data-action="continue"]');
  assert.equal(await qa.evaluate(`getComputedStyle(document.querySelector('.reference-dialogue-next')).animationName`),'none');
  await viewport(1280,900);await sleep(400);await shot('resumed-draft');
  const result={panels,emptyBench:true,dialogPauses:true,keyboardTabs:true,importThroughSettings:true,materialAndPatternPassed:true,benchResumesDraft:true,reloadResumesDraft:true,smallViewport:[800,700],reducedMotion:true};
  await fs.writeFile(new URL('browser-results.json',dir),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{socket?.close();qa.close();}
