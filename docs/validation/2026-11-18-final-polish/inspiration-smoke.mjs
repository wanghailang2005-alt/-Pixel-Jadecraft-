import assert from 'node:assert/strict';
import { connect, sleep } from '../2026-11-15-museum-craft/browser-driver.mjs';

// Run against Vite in a fresh, isolated Chrome session with remote debugging enabled.
const qa = await connect(Number(process.argv[2] ?? 5189));
const saveKey = 'pixel-jadecraft.save.v1';
const cabbageId = 'heritage-jadeite-cabbage';
const readSave = () => qa.evaluate(`JSON.parse(localStorage.getItem('${saveKey}'))`);
const text = selector => qa.evaluate(`document.querySelector(${JSON.stringify(selector)}).textContent`);
const select = (selector, value) => qa.evaluate(`(() => {
  const field = document.querySelector(${JSON.stringify(selector)});
  field.value = ${JSON.stringify(value)};
  if (field.value !== ${JSON.stringify(value)}) throw Error('Missing option');
  field.dispatchEvent(new Event('change', { bubbles: true }));
})()`);

async function useTool(tool, radius, paths) {
  await qa.click(`[data-tool="${tool}"]`);
  const box = await qa.evaluate(`(() => {
    const radius = document.querySelector('[data-radius]');
    radius.value = ${radius};
    radius.dispatchEvent(new Event('input', { bubbles: true }));
    const canvas = document.querySelector('.creative-canvas canvas');
    canvas.scrollIntoView({ block: 'center' });
    const box = canvas.getBoundingClientRect();
    const size = Math.min(canvas.width - 100, canvas.height - 48);
    return { x: box.x + box.width * (canvas.width - size) / (2 * canvas.width),
      y: box.y + box.height * (canvas.height - size) / (2 * canvas.height),
      sx: box.width * size / canvas.width / 64, sy: box.height * size / canvas.height / 64 };
  })()`);
  const position = ({ x, y }) => ({ x: box.x + x * box.sx, y: box.y + y * box.sy });
  for (const path of paths) {
    await qa.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...position(path[0]), button: 'left', buttons: 1, clickCount: 1 });
    for (const point of path.slice(1)) {
      await qa.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position(point), button: 'left', buttons: 1 });
    }
    await qa.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...position(path.at(-1)), button: 'left', clickCount: 1 });
  }
}

const sweeps = right => Array.from({ length: 10 }, (_, i) => [{ x: -2, y: i * 7 }, { x: right, y: i * 7 }]);
async function nextStage() {
  await sleep(180);
  assert.equal(await qa.evaluate("document.querySelector('[data-next]').disabled"), false,
    await text('[data-description]'));
  await qa.click('[data-next]');
}

try {
  assert.equal(await readSave(), null, 'Use a fresh browser profile for this test');
  await qa.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await qa.click('.landscape-menu-actions [data-action="museum"]');
  await qa.click(`[data-museum-exhibit="${cabbageId}"]`);
  assert.match(await text('.museum-scroll-reading'), /盆景|宮|宫/);
  await qa.click('[data-museum-create]');
  assert.match(await text('.creative-empty'), /翠玉白菜.*顺色取形/);
  assert.deepEqual((await readSave()).museum.inspirations, [cabbageId]);
  const startingStones = (await readSave()).inventory;
  assert.equal(startingStones.length, 12);
  assert.equal((await readSave()).opening.introduced, false);
  await qa.click('dialog [data-action="mentor"]');
  assert.match(await text('dialog .dialog-body'), /翠玉白菜/);
  await qa.click('dialog [data-action="make"]');
  assert.equal(startingStones[0].id, 'mentor-first-jade');
  assert.deepEqual((await readSave()).inventory, startingStones);
  assert.equal((await readSave()).opening.introduced, true);
  await select('#creative-material', 'stock-green-stream');
  await select('#creative-shape', 'fish');
  await select('#creative-pattern', 'cloud');
  assert.equal(await qa.evaluate("document.querySelector('#creative-inspiration').value"), cabbageId);
  assert.match(await text('[data-inspiration-hint]'), /绿叶与白梗/);
  await qa.click('[data-begin]');
  assert.equal((await readSave()).crafting.inspirationId, cabbageId);
  await useTool('rough', 5, sweeps(66));
  await useTool('fine', 5, sweeps(25));
  await nextStage();
  const guide = await qa.evaluate(`(async () => {
    const { getCraftSurface } = await import('/src/craft-model.js');
    const draft = JSON.parse(localStorage.getItem('${saveKey}')).crafting.artisan;
    return getCraftSurface(draft).guidePaths;
  })()`);
  await useTool('engrave', 1.4, guide);
  await useTool('relief', 5, sweeps(25));
  await nextStage();
  await useTool('sand', 5, sweeps(66));
  await useTool('polish', 5, sweeps(20));
  await nextStage();
  const piece = (await readSave()).pieces[0];
  assert.equal(piece.inspirationId, cabbageId);
  const bandShare = await qa.evaluate(`(async () => {
    const { getCraftSurface } = await import('/src/craft-model.js');
    const { base, colorBand } = getCraftSurface(JSON.parse(localStorage.getItem('${saveKey}')).pieces[0].artisan);
    return Math.round(base.filter((cell, i) => cell && colorBand[i]).length / base.filter(Boolean).length * 100);
  })()`);
  const band = new RegExp(`浅色带.*${bandShare}%`);
  await qa.click('[data-complete-customize]');
  assert.match(await text('.collection-preview'), /翠玉白菜.*顺色取形/);
  assert.match(await text('.collection-preview'), band);
  await qa.click('dialog [data-action="close"]');
  await qa.click('.workshop-page-tools [data-action="museum"]');
  await qa.click('[data-museum-room="studio"]');
  await qa.click('[data-museum-studio="pieces"]');
  await qa.click('[data-museum-exhibit]');
  assert.match(await text('.museum-player-label'), /翠玉白菜.*顺色取形/);
  assert.match(await text('.museum-player-label'), band);
  console.log('PASS: museum click → first jade → stock selection → canvas tooling → signing and museum caption');
} finally {
  qa.close();
}
