import assert from 'node:assert/strict';
import { connect, sleep } from './browser-driver.mjs';
const q=await connect(Number(process.argv[2]??52366));
const root='E:/Pixel_Jadecraft/docs/validation/2026-11-15-museum-craft/';
try {
  await q.send('Page.reload');await sleep(1400);
  await q.click('.landscape-menu [data-action="continue"]');
  await q.click('.workshop-page-tools [data-action="inspect"]');
  const visible=await q.evaluate(`(()=>{const b=document.querySelector('[data-inspect-create]').getBoundingClientRect(),p=document.querySelector('.dialog-body').getBoundingClientRect();return{buttonBottom:b.bottom,viewportBottom:p.bottom,visible:b.bottom<=p.bottom&&b.top>=p.top};})()`);
  assert.equal(visible.visible,true,JSON.stringify(visible));
  await q.screenshot(root+'inspection-production.png');
  await q.click('dialog header [data-action="close"]');
  await q.click('.workshop-page-tools [data-action="tasks"]');
  await q.click('[data-commission-study="moon-gift"]');
  assert.match(await q.evaluate(`document.querySelector('.museum-scroll h3').textContent`),/和田玉/);
  await q.click('.museum-lens [data-museum-clue]');
  await q.click('[data-museum-collect]');
  await q.click('dialog header [data-action="close"]');
  await q.click('.workshop-page-tools [data-action="tasks"]');
  await q.click('[data-commission-create="moon-gift"]');
  const intention=await q.evaluate(`({shape:document.querySelector('#creative-shape').value,finish:document.querySelector('#creative-finish').value,inspiration:document.querySelector('#creative-inspiration').value})`);
  assert.deepEqual(intention,{shape:'bi',finish:'satin',inspiration:'material-nephrite'});
  await q.click('[data-begin]');
  await q.click('.creative-canvas canvas');
  // Move without cutting, then keep Space held while arrow keys move the tool.
  for(let i=0;i<32;i++) {
    await q.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
    await q.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
  }
  await q.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  for(let i=0;i<32;i++) {
    await q.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await q.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  }
  await q.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  const removed=await q.evaluate(`(()=>{const d=JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1')).crafting.artisan;return d.undo.base.filter((v,i)=>v&&!d.base[i]).length;})()`);
  assert.ok(removed>35,`Keyboard stroke removed ${removed} cells`);
  await q.click('[data-cancel]');
  await q.click('dialog header [data-action="close"]');
  await q.click('.workshop-page-tools [data-action="museum"]');
  await q.click('[data-museum-room="studio"]');
  await q.click('[data-museum-studio="raw"]');
  await q.screenshot(root+'museum-raw-production.png');
  await q.click('[data-museum-exhibit]');
  await q.click('[data-museum-create]');
  assert.equal(await q.evaluate(`document.querySelector('#creative-material').value`),'qa-seal-jade');
  console.log('Production inspection fit, commission→research→intent, held-Space keyboard stroke, and raw→design passed.',{visible,removed});
} finally {q.close();}
