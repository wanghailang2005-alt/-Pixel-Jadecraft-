// Isolated CDP QA: real keyboard/pointer input only; no injected state or teleport.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { connect, sleep } from './browser-driver.mjs';
const qa = await connect(Number(process.argv[2]));
const mode = process.argv[3] ?? 'climb';
const dir = new URL('./', import.meta.url);
const state = () => qa.evaluate(`JSON.parse(localStorage.getItem('pixel-jadecraft.save.v1'))`);
async function hold(code, key, duration = 70) {
  await qa.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await sleep(duration);
  await qa.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) });
  await sleep(220);
}
async function pointer(x, y, duration = 70) {
  const bounds = await qa.evaluate(`document.querySelector('#canvas canvas').getBoundingClientRect().toJSON()`);
  const point = { x: bounds.x + x / 960 * bounds.width, y: bounds.y + y / 540 * bounds.height };
  await qa.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await qa.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(duration);
  await qa.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  await sleep(220);
}
try {
  await qa.send('Page.bringToFront');
  if (await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="continue"]'))`)) {
    await qa.click('.landscape-menu [data-action="continue"]'); await sleep(1000);
  }
  if (mode === 'climb' || mode === 'all') {
    await hold('KeyW', 'w', 4900);
    await hold('KeyD', 'd', 365);
    await hold('KeyS', 's', 1450);
    await hold('KeyD', 'd', 240);
    await hold('KeyR', 'r');
    await qa.screenshot(new URL('mine-depth-observed.png', dir));
    assert.deepEqual((await state()).mineSurvey, ['C1']);
  }
  if (mode === 'mouse-approach') {
    await hold('KeyW', 'w', 4900);
    await hold('KeyD', 'd', 3640);
    await hold('KeyS', 's', 1900);
    await hold('KeyD', 'd', 250);
    await hold('KeyR', 'r');
    await qa.screenshot(new URL('mine-depth-mouse-before.png', dir));
    assert.ok((await state()).mineSurvey.includes('C2'));
  }
  if (mode === 'mouse-dig') {
    const prior = await state();
    await pointer(173, 188, 650); // HUD heavy-tool click must never swing underneath.
    assert.deepEqual((await state()).inventory, prior.inventory);
    await pointer(508, 222, 580); // The real upper wall cell.
    await pointer(508, 254, 580); // The real lower wall cell.
    await hold('KeyD', 'd', 205);
    await pointer(70, 188); // HUD fine-tool selection.
    await pointer(502, 254, 380); // C2-L gold slit, after the camera follows 32px right.
    const after = await state();
    await qa.screenshot(new URL('mine-depth-mouse-seam.png', dir));
    assert.ok(after.inventory.some(item => item.id === 'C2-L'));
    assert.equal(after.mineVeins[1][0], true);
    assert.equal(after.mineVeins[1][1], false);
    await fs.writeFile(new URL('mine-depth-mouse-save.json', dir), JSON.stringify(after, null, 2));
  }
  if (mode === 'pair' || mode === 'all') {
    await hold('Digit2', '2');
    await hold('KeyE', 'e', 1150); // Foot and head wall clearance.
    await hold('KeyD', 'd', 205);
    await hold('Digit1', '1');
    await hold('KeyE', 'e', 380); // Automatic seam targeting is the keyboard equivalent.
    await qa.screenshot(new URL('mine-depth-first-stone.png', dir));
    assert.deepEqual((await state()).inventory.map(item => item.id), ['C1-L']);
    await hold('Digit2', '2');
    await hold('KeyE', 'e', 580); // Head clearance beside the first jade.
    await hold('KeyD', 'd', 205);
    await hold('Digit1', '1');
    await hold('KeyE', 'e', 380);
    const before = await state();
    assert.deepEqual(before.inventory.map(item => item.id).sort(), ['C1-L', 'C1-R']);
    assert.deepEqual(before.mineVeins[0], [true, true]);
    await qa.screenshot(new URL('mine-depth-pair.png', dir));
    await fs.writeFile(new URL('mine-depth-save.json', dir), JSON.stringify(before, null, 2));
    await qa.send('Page.reload');
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await qa.evaluate(`Boolean(document.querySelector('.landscape-menu [data-action="continue"]'))`)) break;
      await sleep(100);
    }
    await qa.click('.landscape-menu [data-action="continue"]');
    await sleep(1000);
    const after = await state();
    assert.deepEqual(after.mineSurvey, ['C1']);
    assert.deepEqual(after.inventory, before.inventory);
    assert.deepEqual(after.mineVeins, before.mineVeins);
    await qa.screenshot(new URL('mine-depth-reloaded.png', dir));
  }
  console.log(JSON.stringify({ mode, inventory: (await state()).inventory, mineSurvey: (await state()).mineSurvey, mineVeins: (await state()).mineVeins }));
} finally { qa.close(); }
