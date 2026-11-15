// Run against a fresh isolated browser page, with its CDP port as the argument.
import assert from 'node:assert/strict';
import { connect, sleep } from '../2026-11-15-museum-craft/browser-driver.mjs';
const qa = await connect(Number(process.argv[2]));
const expanded = () => qa.evaluate(`document.querySelector('[data-guide-toggle]').getAttribute('aria-expanded')`);
const state = () => qa.evaluate(`localStorage.getItem('pixel-jadecraft.save.v1')`);
async function hold(code, key, duration) {
  const virtualKey = code === 'Escape' ? 27 : key.toUpperCase().charCodeAt(0);
  await qa.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: virtualKey });
  await sleep(duration);
  await qa.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: virtualKey });
  await sleep(120);
}
try {
  await qa.send('Page.bringToFront');
  if (await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="new"]'))`)) {
    await qa.click('.landscape-menu [data-action="new"]'); await sleep(700);
  }
  await qa.click('.workshop-page-tools [data-action="mine"]'); await sleep(700);
  assert.equal(await expanded(), 'true');
  await qa.screenshot(new URL('mine-guide-expanded.png', import.meta.url));
  await hold('KeyW', 'w', 220);
  assert.equal(await expanded(), 'false', 'first actual movement folds the guide');
  await qa.screenshot(new URL('mine-guide-compact.png', import.meta.url));
  const before = await state();
  await qa.click('[data-guide-toggle]');
  assert.equal(await expanded(), 'true');
  await qa.click('[data-guide-action="heavy"]');
  assert.equal(await qa.evaluate(`document.querySelector('[data-guide-action="heavy"]').getAttribute('aria-pressed')`), 'true');
  await qa.click('[data-guide-action="track"]');
  assert.match(await qa.evaluate(`document.querySelector('[data-guide-title]').textContent`), /^2/);
  assert.equal(await state(), before, 'guide clicks never mine or alter inventory');
  await qa.click('[data-guide-toggle]');
  await hold('Digit1', '1', 70);
  assert.equal(await qa.evaluate(`document.querySelector('[data-guide-action="fine"]').getAttribute('aria-pressed')`), 'true');
  await qa.click('.mine-pause');
  assert.equal(await qa.evaluate(`document.querySelector('.mine-guide').hidden`), true);
  await hold('Escape', 'Escape', 70);
  assert.equal(await qa.evaluate(`document.querySelector('.mine-guide').hidden`), false);
  await qa.click('.workshop-page-tools [data-action="workshop"]'); await sleep(300);
  assert.equal(await qa.evaluate(`document.querySelectorAll('.mine-guide').length`), 0);
  await qa.click('.workshop-page-tools [data-action="mine"]'); await sleep(500);
  assert.equal(await qa.evaluate(`document.querySelectorAll('.mine-guide').length`), 1);
  assert.equal(await expanded(), 'false', 'return visit keeps guide compact');
  console.log('Guide: first-move collapse, button toggle, pressed state, Q tracking, no mining passthrough, pause/resume and scene cleanup passed.');
} finally { qa.close(); }
