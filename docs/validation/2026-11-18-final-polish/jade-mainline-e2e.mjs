import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { connect, sleep } from '../2026-11-15-museum-craft/browser-driver.mjs';
import { getCraftSurface, stageMetrics } from '../../../src/craft-model.js';
import { freshState } from '../../../src/state.js';

const qa = await connect(Number(process.argv[2] ?? 5287));
const out = path.resolve('.tmp/validation/2026-11-18-final-polish');
const saveKey = 'pixel-jadecraft.save.v1';
const cabbage = 'heritage-jadeite-cabbage';
const errors = [];
const report = {};
const nav = action => '.workshop-page-tools [data-action="' + action + '"]';
const control = action => 'dialog [data-action="' + action + '"]';
const exists = selector => qa.evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')');
const read = () => qa.evaluate('JSON.parse(localStorage.getItem(' + JSON.stringify(saveKey) + '))');
const content = selector => qa.evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent');
const attr = (selector, key) => qa.evaluate('document.querySelector(' + JSON.stringify(selector) + ').getAttribute(' + JSON.stringify(key) + ')');
async function until(task, label) {
  for (let tries = 0; tries < 40; tries++) {
    const result = await task();
    if (result) return result;
    await sleep(125);
  }
  throw new Error('Timed out waiting for ' + label);
}
async function click(selector) {
  await until(() => exists(selector), selector);
  await qa.click(selector);
}
async function update(selector, value, type = 'change') {
  await qa.evaluate('(() => { const field = document.querySelector(' + JSON.stringify(selector) + '); field.value = '
    + JSON.stringify(String(value)) + '; field.dispatchEvent(new Event(' + JSON.stringify(type) + ',{bubbles:true})); })()');
}
const screenshot = (name, w) => qa.screenshot(path.join(out, 'jade-' + name + '-' + w + 'x700.png'));
const mouse = (type, x, y) => qa.send('Input.dispatchMouseEvent', {
  type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1,
});
async function stroke(selector, paths, kind = 'craft') {
  const { x, y, sx, sy } = await qa.evaluate(`(() => {
    const canvas = document.querySelector(${JSON.stringify(selector)});
    canvas.scrollIntoView({block:'center'});
    const rect = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
    const left = parseFloat(style.borderLeftWidth), top = parseFloat(style.borderTopWidth);
    const sx = canvas.clientWidth / canvas.width, sy = canvas.clientHeight / canvas.height;
    const size = Math.min(canvas.width - 100, canvas.height - 48);
    return ${kind === 'craft'
      ? '{ x: rect.x + left + (canvas.width - size) / 2 * sx, y: rect.y + top + (canvas.height - size) / 2 * sy, sx: sx * size / 64, sy: sy * size / 64 }'
      : '{ x: rect.x + left, y: rect.y + top, sx, sy }'};
  })()`);
  for (const points of paths) {
    await mouse('mousePressed', x + points[0].x * sx, y + points[0].y * sy);
    for (const p of points.slice(1)) await mouse('mouseMoved', x + p.x * sx, y + p.y * sy);
    const last = points.at(-1);
    await mouse('mouseReleased', x + last.x * sx, y + last.y * sy);
  }
  await sleep(150);
}
const bench = '.creative-canvas canvas';
async function tool(name, radius, paths) {
  await click('[data-tool="' + name + '"]');
  await update('[data-radius]', radius, 'input');
  await stroke(bench, paths);
}
const sweep = right => Array.from({ length: 10 }, (_, i) => [{ x: -2, y: i * 7 }, { x: right, y: i * 7 }]);
async function next() {
  const metrics = stageMetrics((await read()).crafting.artisan);
  assert.ok(metrics.ready, JSON.stringify(metrics));
  await click('[data-next]');
}
async function checkPack(raw) {
  return qa.evaluate(`(() => {
    const rect = s => document.querySelector(s).getBoundingClientRect();
    const hint = rect('.inventory-hint'), grid = rect('.inventory-grid'), detail = rect('.item-detail'), tabs = rect('.inventory-tabs');
    const slots = [...document.querySelectorAll('dialog .inventory-grid button')];
    if (slots.length !== ${raw ? 12 : 10} || (!${raw} && document.querySelectorAll('dialog .slot .codex-lock').length < 9)
      || hint.top <= grid.bottom || tabs.top - hint.bottom < 8 || tabs.top - detail.bottom < 8 || detail.left <= grid.right) {
      throw Error(JSON.stringify({count:slots.length,hint:hint.toJSON(),grid:grid.toJSON(),detail:detail.toJSON(),tabs:tabs.toJSON()}));
    }
    return {slots: slots.length, hintToTabs: Math.round(tabs.top - hint.bottom), detailToTabs: Math.round(tabs.top - detail.bottom)};
  })()`);
}
async function pack(w) {
  await click(nav('inventory'));
  assert.match(await content('.inventory-top'), /原石 12\/12/);
  assert.match(await content('.item-detail h3'), /羊脂白玉/);
  const paint = () => qa.evaluate(`[...document.querySelectorAll('dialog canvas')].every(c =>
    c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i % 4 === 3 && n > 0))`);
  await until(paint, 'raw art');
  const raw = await checkPack(true);
  await screenshot('inventory-raw', w);
  await click('[data-tab="codex"]');
  await until(paint, 'codex art');
  const codex = await checkPack(false);
  await screenshot('inventory-codex', w);
  await click('[data-tab="raw"]');
  await click('dialog [data-item="8"]');
  await click('[data-inventory-create]');
  assert.equal(await qa.evaluate("document.querySelector('#creative-material').value"), 'starter-green');
  await click(control('close'));
  return { raw, codex };
}
async function benchLayout() {
  return qa.evaluate(`(() => {
    const buttons = [...document.querySelectorAll('.creative-actions button, .creative-tools button')];
    return buttons.map(button => {
      const rect = button.getBoundingClientRect(), style = getComputedStyle(button);
      const range = document.createRange(); range.selectNodeContents(button.firstChild);
      return {label:button.textContent, visible:rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth,
        oneLine:range.getBoundingClientRect().height <= parseFloat(style.fontSize) * 1.65, unclipped:button.scrollWidth <= button.clientWidth};
    });
  })()`);
}
async function routeA(w) {
  await qa.send('Network.clearBrowserCookies');
  await qa.send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:4177', storageTypes: 'local_storage' });
  await qa.send('Page.reload', { ignoreCache: true });
  await until(() => exists('.landscape-menu-actions [data-action="new"]'), 'clean menu');
  assert.equal(await read(), null);
  await click('.landscape-menu-actions [data-action="new"]');
  assert.equal((await read()).opening.introduced, false);
  await click('[data-reference="dialogue"]');
  assert.equal((await read()).opening.introduced, true);
  assert.equal((await read()).inventory[0].id, 'mentor-first-jade');
  assert.match(await content('dialog .dialog-body'), /见面礼/);
  await screenshot('mentor', w);
  await click(control('close'));
  const inventory = await pack(w);
  await click(nav('museum'));
  await click('[data-museum-exhibit="' + cabbage + '"]');
  await click('[data-museum-section="story"]');
  assert.match(await content('.museum-scroll-reading'), /白菜|宫|盆景/);
  const observation = '.museum-lens [data-museum-clue="0"]';
  await click(observation);
  const alignment = () => qa.evaluate(`(() => {
    const mark = document.querySelector('${observation}').getBoundingClientRect();
    const art = document.querySelector('.museum-art-plane canvas').getBoundingClientRect();
    return [(mark.x+mark.width/2-art.x)/art.width,(mark.y+mark.height/2-art.y)/art.height];
  })()`);
  const normal = await alignment();
  await click('[data-museum-zoom]');
  await sleep(350);
  await click('[data-museum-light]');
  await sleep(350);
  const zoomed = await alignment();
  assert.ok(normal.every((p, i) => Math.abs(p - zoomed[i]) < .02), JSON.stringify({ normal, zoomed }));
  assert.equal(await attr('[data-museum-light]','aria-pressed'), 'true');
  assert.equal(await attr('[data-museum-zoom]','aria-pressed'), 'true');
  assert.deepEqual((await read()).museum.observations[cabbage], [0]);
  await screenshot('museum-side-zoom', w);
  await click('[data-museum-create]');
  assert.equal(await qa.evaluate("document.querySelector('#creative-inspiration').value"), cabbage);
  await update('#creative-material', 'starter-green');
  await update('#creative-shape', 'fish');
  await update('#creative-pattern', 'cloud');
  await update('#creative-finish', w === 800 ? 'contrast' : 'satin');
  await click('[data-begin]');
  assert.equal((await read()).crafting.inspirationId, cabbage);
  await tool('rough', 5, sweep(66));
  await tool('fine', 5, sweep(25));
  await screenshot('shape', w);
  await next();
  const guides = getCraftSurface((await read()).crafting.artisan).guidePaths;
  await tool('engrave', 1.4, guides);
  const carved = (await read()).crafting.artisan.carve.slice();
  assert.ok(carved.some(Boolean));
  const undoAvailable = await qa.evaluate("!document.querySelector('[data-undo]').disabled");
  assert.equal(undoAvailable, true);
  await click('[data-undo]');
  assert.notDeepEqual((await read()).crafting.artisan.carve, carved);
  await tool('engrave', 1.4, guides);
  await tool('relief', 5, sweep(25));
  await screenshot('carve', w);
  await next();
  await click('[data-save]');
  assert.equal((await read()).crafting.step, 'polish');
  await click('[data-reference="generate"]');
  const beforeBack = (await read()).crafting.artisan.carve;
  await click('[data-back-carve]');
  assert.equal((await read()).crafting.step, 'carve');
  assert.deepEqual((await read()).crafting.artisan.carve, beforeBack);
  await next();
  await tool('sand', 5, sweep(66));
  await click('[data-guide]');
  await qa.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:1, y:1 });
  await sleep(150);
  const canvas = () => qa.evaluate("document.querySelector('.creative-canvas canvas').toDataURL()");
  const satin = await canvas();
  await screenshot('polish-soft', w);
  await tool('polish', 5, sweep(w === 800 ? 24 : 18));
  await qa.send('Input.dispatchMouseEvent', { type:'mouseMoved', x:1, y:1 });
  await sleep(150);
  assert.notEqual(await canvas(), satin);
  const metrics = stageMetrics((await read()).crafting.artisan);
  const layout = await benchLayout();
  assert.ok(layout.every(item => item.visible && item.oneLine && item.unclipped), JSON.stringify(layout));
  await screenshot('polish-bright', w);
  await next();
  await click('[data-complete-customize]');
  const blessing = '山水常青';
  await update('#collection-blessing', blessing, 'input');
  await click('[data-collection-save]');
  await click('[data-collection-export]');
  const download = await until(async () => (await fs.readdir(path.join(out,'jade-download-' + w))).find(name => name.endsWith('.png')), 'memorial card PNG');
  assert.equal((await fs.readFile(path.join(out, 'jade-download-' + w, download))).subarray(1, 4).toString(), 'PNG');
  await screenshot('signing', w);
  await click(control('close'));
  await click('[data-reference="generate"]');
  await click('[data-collection-place="0"]');
  const plaque = await content('.collection-plaque');
  assert.match(plaque, /翠玉白菜.*顺色取形/s);
  assert.match(plaque, /翠青玉/);
  assert.match(plaque, /天然色带/);
  assert.match(plaque, /山水常青/);
  await screenshot('gallery-plaque', w);
  const persisted = await read();
  assert.equal(persisted.exhibits[0], persisted.pieces[0].id);
  assert.equal(persisted.inventory.length, 12);
  await qa.send('Page.reload');
  await click('[data-action="continue"]');
  const resumed = await read();
  assert.equal(resumed.location, 'gallery');
  for (const key of ['opening','inventory','pieces','exhibits','museum','story']) assert.deepEqual(resumed[key], persisted[key]);
  await screenshot('gallery-resume', w);
  await click(nav('workshop'));
  await click(nav('story'));
  for (const id of ['cord','scar','letter']) await click('[data-clue="' + id + '"]');
  await click('[data-route="preserve"]');
  await screenshot('heirloom-before', w);
  await stroke('.story-jade', [[{x:116,y:169},{x:116,y:170}],[{x:201,y:223},{x:201,y:224}]], 'story');
  assert.equal((await read()).story.cleaned.length, 18);
  await click('[data-cord]');
  await click('[data-deliver]');
  await click('[data-return]');
  assert.equal((await read()).story.returned, true);
  await screenshot('heirloom-after', w);
  await click(control('close'));
  return { inventory, metrics, workshopButtons: layout.length, png: download, plaque };
}

async function routeB(w) {
  const fixture = freshState();
  fixture.location = 'mine';
  fixture.inventory = [{ id:'old-collected', material:'nephrite', seed:12 }];
  fixture.pendingDrops = [{ id:'old-uncollected', material:'jadeite', x:40, y:80 }];
  fixture.mineVeins = [[true,false]];
  fixture.pieces = [{ id:'old-fish', shape:'fish', material:'nephrite', blessing:'旧展签' }];
  fixture.exhibits[0] = 'old-fish';
  fixture.story.clues = ['scar'];
  const fixturePath = path.join(out, 'jade-legacy-fixture.json');
  await fs.writeFile(fixturePath, JSON.stringify(fixture));
  await qa.send('Page.setInterceptFileChooserDialog', { enabled:true });
  let event;
  const off = qa.on('Page.fileChooserOpened', payload => { event = payload; });
  await click(nav('settings'));
  await click('[data-settings-backup]');
  await click(control('import'));
  await until(() => event?.backendNodeId, 'real file picker');
  await qa.send('DOM.setFileInputFiles', { files:[fixturePath], backendNodeId:event.backendNodeId });
  off();
  await click(control('confirm'));
  const migrated = await read();
  assert.equal(migrated.location, 'workshop');
  assert.equal(migrated.inventory.length, 12);
  assert.deepEqual(migrated.inventory[0], fixture.inventory[0]);
  assert.equal(migrated.inventory.some(entry => entry.id === 'old-uncollected'), false);
  for (const key of ['pendingDrops','mineVeins']) assert.equal(Object.hasOwn(migrated,key), false);
  for (const key of ['pieces','exhibits','story']) assert.deepEqual(migrated[key], fixture[key]);
  await click(nav('inventory'));
  await screenshot('migration', w);
  await click('[data-inventory-create]');
  assert.equal(await qa.evaluate("document.querySelector('#creative-material').value"), 'old-collected');
  await click('[data-begin]');
  assert.equal((await read()).crafting.step, 'shape');
  await screenshot('migration-craft', w);
  await click('[data-save]');
  return { collection:migrated.inventory.length, exhibits:migrated.exhibits, story:migrated.story.clues };
}

try {
  await fs.mkdir(out, { recursive:true });
  await qa.send('Runtime.enable');
  await qa.send('Page.enable');
  await qa.send('DOM.enable');
  qa.on('Runtime.exceptionThrown', error => errors.push(error.exceptionDetails.text + ' ' + (error.exceptionDetails.exception?.description ?? '')));
  for (const w of [800,640]) {
    if (process.argv[3] && Number(process.argv[3]) !== w) continue;
    const downloadPath = path.join(out, 'jade-download-' + w);
    await fs.mkdir(downloadPath, { recursive:true });
    await qa.send('Browser.setDownloadBehavior', { behavior:'allow', downloadPath });
    await qa.send('Emulation.setDeviceMetricsOverride', { width:w, height:700, deviceScaleFactor:1, mobile:false });
    report[w] = { A: await routeA(w), B: await routeB(w) };
    await fs.writeFile(path.join(out, 'jade-e2e-' + w + '.json'), JSON.stringify(report[w], null, 2));
    console.log('PASS ' + w + '×700 A + B');
  }
  assert.deepEqual(errors, []);
} finally {
  if (errors.length) console.error(errors);
  qa.close();
}
