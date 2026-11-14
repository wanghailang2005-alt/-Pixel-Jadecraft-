// Isolated real-input mine QA. No save fixture, character teleport or resource edits.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { connect, sleep } from './browser-driver.mjs';

const qa = await connect(Number(process.argv[2]));
const mode = process.argv[3] ?? 'inspect';
const dir = new URL('./', import.meta.url);
async function hold(code, key, duration) {
  await qa.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await sleep(duration);
  await qa.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await sleep(200);
}
async function mineAt(x, y, duration = 1100) {
  await qa.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await qa.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(duration);
  await qa.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(180);
}
try {
  if (mode === 'inspect') {
    console.log(JSON.stringify(await qa.evaluate(`(async()=>{const p=(await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/deps/phaser.js')).name)).default;return{keys:Object.keys(p),games:p.GAMES,canvas:document.querySelector('#canvas canvas').getBoundingClientRect().toJSON()}})()`), null, 2));
  }
  if (mode === 'climb') {
    await qa.send('Page.bringToFront');
    await hold('KeyW', 'w', 4900);
    await qa.screenshot(new URL('mine-main-corridor-final.png', dir));
    await hold('KeyD', 'd', 365);
    await hold('KeyS', 's', 1450);
    await hold('KeyD', 'd', 200);
    await qa.screenshot(new URL('mine-first-vein-approach.png', dir));
    console.log(await qa.evaluate(`({state:JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1')),paused:document.querySelector('#game').dataset.paused})`));
  }
  if (mode === 'dig-first') {
    await hold('KeyE', 'e', 1150);
    await mineAt(415, 344);
    await hold('KeyD', 'd', 205);
    await qa.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69 });
    await sleep(690);
    await qa.screenshot(new URL('mine-pick-impact-final.png', dir));
    await sleep(500);
    await qa.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69 });
    await sleep(300);
    await qa.screenshot(new URL('mine-first-jade-collected.png', dir));
    const state=await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
    console.log(JSON.stringify({inventory:state.inventory,mineVeins:state.mineVeins,pendingDrops:state.pendingDrops},null,2));
  }
  if (mode === 'finish-cluster') {
    await mineAt(457, 344);
    await hold('KeyD', 'd', 205);
    await hold('KeyE', 'e', 1150);
    const before=await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
    assert.deepEqual(before.inventory.map(item=>item.id).sort(),['C1-L','C1-R']);
    assert.deepEqual(before.mineVeins[0],[true,true]);
    assert.equal(before.mineClusters[0],true);
    assert.deepEqual(before.pendingDrops,[]);
    await qa.screenshot(new URL('mine-first-cluster-complete.png',dir));
    await fs.writeFile(new URL('mine-real-input-save.json',dir),JSON.stringify(before,null,2));
    await qa.send('Page.reload');
    for(let index=0;index<30;index++){
      if(await qa.evaluate(`!!document.querySelector('.landscape-menu [data-action="continue"]')`))break;
      await sleep(100);
    }
    await qa.click('.landscape-menu [data-action="continue"]');
    await sleep(1200);
    const after=await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
    assert.deepEqual(after.inventory,before.inventory);
    assert.deepEqual(after.mineVeins,before.mineVeins);
    await qa.click('[data-action="inventory"]');
    await qa.screenshot(new URL('mine-raw-inventory-reloaded.png',dir));
    console.log(JSON.stringify({passed:true,inventory:after.inventory,mineVeins:after.mineVeins,mineClusters:after.mineClusters},null,2));
  }
} finally { qa.close(); }
