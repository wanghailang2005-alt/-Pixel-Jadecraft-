// Import the previous stage's real-input fixture through the visible Settings UI.
// File chooser interception supplies a file, not arbitrary localStorage or game state.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {connect,sleep} from '../2026-11-15-museum-craft/browser-driver.mjs';
const port=Number(process.argv[2]),qa=await connect(port),dir=new URL('./',import.meta.url);
const fixture=new URL('../2026-11-15-next-playtest/final-save.json',dir);
const expected=JSON.parse(await fs.readFile(fixture,'utf8'));
const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target=targets.find(t=>t.type==='page'&&t.url.includes('127.0.0.1:5197'));
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
const pending=new Map();let sequence=0,chooserResolve;
socket.addEventListener('message',event=>{
  const result=JSON.parse(event.data),p=pending.get(result.id);
  if(p){pending.delete(result.id);result.error?p.reject(result.error):p.resolve(result.result);}
  if(result.method==='Page.fileChooserOpened')chooserResolve?.(result.params);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
});
try{
  await qa.click('.workshop-page-tools [data-action="settings"]');
  await qa.click('[data-settings-backup]');
  await send('Page.enable');await send('Page.setInterceptFileChooserDialog',{enabled:true});
  let timeout;
  const chooser=new Promise((resolve,reject)=>{chooserResolve=resolve;timeout=setTimeout(()=>reject(Error('File chooser did not open')),5000);});
  await qa.click('dialog [data-action="import"]');
  const opened=await chooser;clearTimeout(timeout);
  await send('DOM.setFileInputFiles',{files:[fileURLToPath(fixture)],backendNodeId:opened.backendNodeId});
  await sleep(350);await qa.click('dialog [data-action="confirm"]');await sleep(350);
  const restored=await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
  assert.deepEqual(restored.pieces,expected.pieces);assert.deepEqual(restored.exhibits,expected.exhibits);
  assert.deepEqual(restored.mineVeins,expected.mineVeins);assert.deepEqual(restored.mineSurvey,expected.mineSurvey);
  await qa.click('.workshop-page-tools [data-action="mine"]');await sleep(500);
  await qa.screenshot(new URL('old-save-cavern.png',dir));
  assert.equal(await qa.evaluate(`document.querySelector('#game').dataset.scene`),'mine');
  await qa.click('.workshop-page-tools [data-action="gallery"]');await sleep(500);
  await qa.screenshot(new URL('old-save-gallery.png',dir));
  assert.equal(await qa.evaluate(`document.querySelector('.hud meter').value`),1);
  await qa.send('Page.reload');await sleep(1600);
  await qa.click('.landscape-menu [data-action="continue"]');
  assert.deepEqual(await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1')).pieces`),expected.pieces);
  console.log(JSON.stringify({fixture:'previous real-input fish',importThroughUI:true,piecesPreserved:true,exhibitsPreserved:true,veinsPreserved:true,reload:true}));
}finally{await send('Page.setInterceptFileChooserDialog',{enabled:false});socket.close();qa.close();}
