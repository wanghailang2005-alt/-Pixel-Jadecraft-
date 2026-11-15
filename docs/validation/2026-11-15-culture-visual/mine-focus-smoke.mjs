// Isolated focus regression: real pointer/keyboard events, no game-state writes.
import assert from 'node:assert/strict';
import { connect, sleep } from '../2026-11-15-museum-craft/browser-driver.mjs';
const qa = await connect(Number(process.argv[2]));
const dir = new URL('./', import.meta.url);
const active = () => qa.evaluate(`({tag:document.activeElement.tagName,text:document.activeElement.textContent,action:document.activeElement.dataset.guideAction})`);
async function key(code, key, virtualKey, duration = 50, screenshot) {
  await qa.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: virtualKey });
  await sleep(duration);
  if (screenshot) await qa.screenshot(new URL(screenshot, dir));
  await qa.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: virtualKey });
  await sleep(100);
}
async function canvasClick() {
  const point = await qa.evaluate(`(()=>{const b=document.querySelector('#canvas canvas').getBoundingClientRect();return{x:b.x+b.width*.5,y:b.y+b.height*.7}})()`);
  await qa.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await qa.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await qa.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  await sleep(80);
}
try {
  await qa.send('Page.bringToFront');
  if (await qa.evaluate(`document.querySelector('[data-guide-toggle]').getAttribute('aria-expanded')==='false'`)) await qa.click('[data-guide-toggle]');
  const prior = await qa.evaluate(`localStorage.getItem('pixel-jadecraft.save.v1')`);
  await qa.click('[data-guide-action="heavy"]');
  assert.equal((await active()).action, 'heavy');
  await canvasClick();
  assert.equal((await active()).tag, 'CANVAS', 'playfield click takes focus from tool button');
  const accessibility = await qa.evaluate(`({tab:document.querySelector('#canvas canvas').tabIndex,label:document.querySelector('#canvas canvas').getAttribute('aria-label'),hidden:document.querySelector('#canvas').getAttribute('aria-hidden')})`);
  assert.equal(accessibility.tab, 0); assert.match(accessibility.label, /空格跳跃/); assert.equal(accessibility.hidden, null);
  await sleep(600);
  await qa.screenshot(new URL('mine-focus-before-jump.png', dir));
  await key('Space', ' ', 32, 240, 'mine-focus-jumping.png');
  await sleep(700);
  await qa.screenshot(new URL('mine-focus-landed.png', dir));
  assert.equal((await active()).tag, 'CANVAS');
  assert.equal(await qa.evaluate(`localStorage.getItem('pixel-jadecraft.save.v1')`), prior, 'jump/canvas click cannot activate the last focused HUD tool or mine a distant cell');
  const tabs = [];
  for (let count = 0; count < 12; count++) { await key('Tab', 'Tab', 9); tabs.push(await active()); if (tabs.at(-1).action === 'heavy') break; }
  assert.ok(tabs.some(item => item.action === 'heavy'), 'Tab reaches the guide tool button from the canvas');
  await qa.click('.workshop-page-tools [data-action="workshop"]'); await sleep(200);
  assert.equal(await qa.evaluate(`document.querySelector('#canvas').getAttribute('aria-hidden')`), 'true');
  assert.equal(await qa.evaluate(`document.querySelector('#canvas canvas').getAttribute('tabindex')`), null);
  console.log(JSON.stringify({focusReturned:true,canvasAccessible:true,tabReachedHeavy:true,sceneRestored:true,screenshots:['mine-focus-before-jump.png','mine-focus-jumping.png','mine-focus-landed.png']}));
} finally { qa.close(); }
