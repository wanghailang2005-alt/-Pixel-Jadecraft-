// Isolated QA only: actual CDP input, no state injection or character teleport.
import assert from 'node:assert/strict';
import { connect, sleep } from '../2026-11-15-museum-craft/browser-driver.mjs';
const qa = await connect(Number(process.argv[2]));
const dir = new URL('./', import.meta.url);
async function hold(code, key, duration = 70, shot) {
  await qa.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await sleep(duration);
  if (shot) await qa.screenshot(new URL(shot, dir));
  await qa.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await sleep(220);
}
try {
  await qa.send('Page.bringToFront');
  if (await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="continue"]'))`)) {
    await qa.click('.landscape-menu [data-action="continue"]'); await sleep(900);
  }
  assert.equal(await qa.evaluate(`document.querySelector('#game').dataset.scene`), 'mine');
  await qa.screenshot(new URL('mine-entrance.png', dir));
  await hold('KeyW', 'w', 4900);
  await hold('KeyD', 'd', 365);
  await hold('KeyS', 's', 1450);
  await hold('KeyD', 'd', 240);
  await hold('KeyR', 'r');
  assert.deepEqual(await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1')).mineSurvey`), ['C1']);
  await qa.screenshot(new URL('mine-observed.png', dir));
  await hold('Digit2', '2');
  await hold('KeyE', 'e', 440, 'mine-strike.png');
  await hold('KeyE', 'e', 1150);
  await hold('KeyD', 'd', 205);
  await hold('Digit1', '1');
  await hold('KeyE', 'e', 380);
  const state = await qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
  assert.ok(state.inventory.some(item => item.id === 'C1-L'));
  await qa.screenshot(new URL('mine-jade-collected.png', dir));
  console.log(JSON.stringify({ scene: state.scene, inventory: state.inventory.map(item => item.id), mineSurvey: state.mineSurvey, inputs: 'walk, climb, observe, heavy strike, fine seam extraction' }));
} finally { qa.close(); }
