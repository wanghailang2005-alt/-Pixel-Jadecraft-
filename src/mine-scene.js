import Phaser from 'phaser';
import caveUrl from './assets/mine-cavern-v1.png';
import './mine-hud.css';
import { createMineArt, createMiningEffects, drawRuntimeTerrain } from './mine-art.js';
import { SWING_MS, WORLD_WIDTH, WORLD_HEIGHT, TILE, TILE_RULES, cellKey, moveMiner, keyboardDigTarget, validDigTarget } from './mining.js';
import { placeholderMineWorld, readTiledMine } from './mine-map.js';
import { MINE_LORE, EXCAVATION_TOOLS, seamPoint, minePairProgress, mineRouteHint } from './mine-exploration.js';

const tileAssets = import.meta.glob('./assets/tiles-mine.png', { eager: true, query: '?url', import: 'default' });
const playerAssets = import.meta.glob('./assets/player-32x48.png', { eager: true, query: '?url', import: 'default' });
const mapAssets = import.meta.glob('/public/maps/mine.tmj', { eager: true, query: '?raw', import: 'default' });

const VEIN_STORIES = MINE_LORE;
const mineSound = name => window.dispatchEvent(new CustomEvent('jade:sound', { detail: { name } }));

export function preloadMine(scene) {
  scene.load.image('mine-cavern', caveUrl);
  const tilesUrl = tileAssets['./assets/tiles-mine.png'];
  const playerUrl = playerAssets['./assets/player-32x48.png'];
  if (tilesUrl) scene.load.spritesheet('mine-tiles', tilesUrl, { frameWidth: 16, frameHeight: 16 });
  if (playerUrl) scene.load.spritesheet('mine-player', playerUrl, { frameWidth: 32, frameHeight: 48 });
  scene.load.on('loaderror', file => {
    if (['mine-tiles', 'mine-player'].includes(file.key)) scene.registry.set('mine-asset-error', `素材 ${file.key} 加载失败，已使用程序像素素材。`);
  });
  const rawMap = mapAssets['/public/maps/mine.tmj'];
  if (rawMap) {
    try { const metadata = JSON.parse(rawMap); readTiledMine(metadata); scene.registry.set('mine-metadata', metadata); }
    catch (error) { scene.registry.set('mine-asset-error', `${error.message} 已使用运行时默认地图。`); }
  }
}

export function createMineScene({ store, feedback, paused, getSession, onReady, onStop }) {
  return class MineScene extends Phaser.Scene {
    constructor() { super('mine'); }
    create() {
      // Phaser exposes a base frame in addition to the 18 animation frames.
      // Validate the authored frame count explicitly so the fallback condition
      // remains correct if the loader changes its base-frame bookkeeping.
      if (this.textures.exists('mine-player') && this.textures.get('mine-player').frameTotal < 18) {
        this.textures.remove('mine-player');
        this.registry.set('mine-asset-error', '角色图集不足 18 个动画帧，已使用程序矿工。');
      }
      createMineArt(this);
      for (const [direction, row] of [['left', 0], ['right', 1], ['down', 2]]) {
        for (const [kind, start, end, repeat] of [['walk', 0, 3, -1], ['swing', 4, 5, 0]]) {
          const key = `mine-${direction}-${kind}`;
          if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers('mine-player', { start: row * 6 + start, end: row * 6 + end }), frameRate: kind === 'walk' ? 8 : 2000 / SWING_MS, repeat });
        }
      }
      this.mining = getSession(() => {
        const metadata = this.registry.get('mine-metadata');
        return metadata ? readTiledMine(metadata, { mineVeins: store.state.mineVeins }) : placeholderMineWorld({ mineVeins: store.state.mineVeins });
      });
      this.world = this.mining.world;
      createMiningEffects(this);
      this.add.image(480, 270, 'mine-cavern').setDisplaySize(960, 540).setScrollFactor(0).setDepth(-10);
      // A five-frame sheet (one frame per material) repeats the same 16×16
      // block on every collision cell and produces a visible checkerboard.
      // Treat a formal sheet as usable only when it provides four variants for
      // each of the five material frames; otherwise use the continuous runtime
      // terrain generator, which adds deterministic strata and AO tinting.
      const formalTileFrames = this.textures.exists('mine-tiles') ? this.textures.get('mine-tiles').frameTotal : 0;
      const formalTiles = formalTileFrames >= 20;
      if (this.textures.exists('mine-tiles') && !formalTiles) this.registry.set('mine-asset-error', '地形图集帧数不足，已使用五类程序地形。');
      this.terrain = drawRuntimeTerrain(this, this.world, formalTiles);
      this.veinGlows = new Map();
      for (const vein of this.world.veins) {
        if (this.world.map[vein.row][vein.column] !== 3) continue;
        this.veinGlows.set(cellKey(vein), this.add.image(vein.column * 32 + 16, vein.row * 32 + 16, 'mine-glow')
          .setScale(1.12).setAlpha(.7).setDepth(2));
      }
      this.player = this.add.sprite(this.world.spawn.x, this.world.spawn.y, 'mine-player', 6).setOrigin(.5, 1).setScale(1.5).setDepth(4);
      this.footShadow = this.add.ellipse(this.world.spawn.x, this.world.spawn.y - 1, 35, 8, 0x0b1820, .45).setDepth(3.5);
      this.strikeTool = this.add.graphics().setDepth(5);
      this.lastToolContact = null;
      this.lampShade = this.add.image(this.player.x, this.player.y - 56, 'mine-lamp-shade').setScale(4).setDepth(8);
      this.body = { ...this.world.spawn, velocityY: 0, climbing: false };
      this.direction = 'right';
      this.heldKeys = new Set();
      this.pointer = { inside: false, down: false, clientX: 0, clientY: 0 };
      this.jumpPending = false;
      this.tapPending = false;
      this.effectTime = 0;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.impactLightTime = 0;
      this.impactLight = this.add.image(0, 0, 'mine-glow').setScale(.85).setAlpha(0).setDepth(5);
      this.fullNoticeTime = -Infinity;
      this.particles = [];
      this.dropSprites = new Map();
      this.crackSprites = new Map();
      this.targetBox = this.add.graphics().setDepth(9);
      this.surveyMarks = this.add.graphics().setDepth(9);
      this.trackedCluster = this.world.clusters.find(cluster => minePairProgress(store.state, cluster.id).extracted < 2)?.id ?? 'C1';
      for (const key of this.mining.damage.keys()) {
        const [column, row] = key.split(',').map(Number);
        this.drawCrack({ column, row });
      }
      this.syncDrops();
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      // Keep the miner's feet near the lower fifth of the screen so the vault,
      // ceiling and route ahead remain visible instead of filling half with floor.
      this.cameras.main.startFollow(this.player, true, .12, .12, 0, 150);
      this.cameras.main.setRoundPixels(true);
      this.cameras.main.centerOn(this.player.x, this.player.y - 150);
      this.createGuide();
      this.placeHintKey = '';
      for (const [index, cluster] of this.world.clusters.entries()) {
        const label = `${index + 1} · ${VEIN_STORIES[index].name}`;
        this.add.text((cluster.column - 4) * 32 + 6, (cluster.row - 2) * 32 + 4, label, {
          fontFamily: 'Fusion Pixel, Microsoft YaHei', fontSize: '10px', color: '#C7D3B9',
          backgroundColor: '#1B2D31', padding: { x: 4, y: 3 },
        }).setDepth(3);
      }
      this.drawSurveyMarks();
      this.chooseTool(this.mining.tool, false);
      const assetError = this.registry.get('mine-asset-error');
      if (assetError) this.add.text(280, 470, assetError, {
        fontFamily: 'Fusion Pixel, Microsoft YaHei', fontSize: '12px', color: '#B1C3B5', backgroundColor: '#101C1B', wordWrap: { width: 600 },
      }).setScrollFactor(0).setDepth(100);
      this.installInput();
      document.querySelector('#game').dataset.scene = 'mine';
      this.events.once('create', () => onReady(() => this.collect()));
      this.events.once('shutdown', () => {
        this.resetInput();
        for (const particle of this.particles) particle.sprite.destroy();
        this.particles = [];
        this.dropSprites.clear(); this.crackSprites.clear(); this.veinGlows.clear();
        this.guide.remove();
        onStop();
      });
    }
    createGuide() {
      const guide = document.createElement('aside');
      guide.className = 'mine-guide';
      guide.setAttribute('aria-label', '矿洞行记与操作指引');
      guide.innerHTML = `<div class="mine-guide-heading"><strong data-guide-title></strong><button type="button" data-guide-toggle aria-controls="mine-guide-detail" aria-expanded="true">收起指引</button></div>
        <p class="mine-guide-keys"><kbd>R</kbd> 观察　<kbd>1</kbd>/<kbd>2</kbd> 工具　<kbd>Q</kbd> 追踪</p>
        <div id="mine-guide-detail"><p class="mine-guide-route" data-guide-route></p><p data-guide-story></p>
        <p class="mine-guide-movement"><kbd>A D</kbd> 行走　<kbd>W S</kbd> 爬梯　空格跳跃<br>鼠标 / <kbd>E</kbd> 挖掘；先用重镐开路。</p>
        <p class="mine-guide-tool" data-guide-tool></p><div class="mine-guide-actions">
        <button type="button" data-guide-action="fine" aria-pressed="true">1 细凿</button><button type="button" data-guide-action="heavy" aria-pressed="false">2 重镐</button>
        <button type="button" data-guide-action="observe">R 侧灯观察</button><button type="button" data-guide-action="track">Q 换矿脉</button></div></div>`;
      this.guide = guide;
      document.querySelector('#game').append(guide);
      // Setters retain the existing scene hint flow without uploading canvas
      // text every frame, and expose all instructions to assistive technology.
      const text = selector => ({ setText(value) { const node = guide.querySelector(selector); if (node.textContent !== value) node.textContent = value; } });
      this.placeTitle = text('[data-guide-title]'); this.placeHint = text('[data-guide-story]');
      this.routeHint = text('[data-guide-route]'); this.toolHint = text('[data-guide-tool]');
      this.hudButtons = ['fine', 'heavy'].map(tool => ({ tool, element: guide.querySelector(`[data-guide-action="${tool}"]`) }));
      this.autoCollapseGuide = !this.registry.get('mine-guide-seen') && !(store.state.mineSurvey?.length || store.state.inventory.length);
      // The guide is useful as a first-run briefing, but an expanded panel
      // covers the upper route in the compact 800×700 and 640×700 layouts.
      // Keep it available through the toggle while starting compact windows
      // in the quiet, non-blocking state.
      const compactViewport = window.matchMedia('(max-width: 900px)').matches;
      this.setGuideExpanded(this.autoCollapseGuide && !compactViewport);
      guide.addEventListener('pointerdown', event => {
        if (!event.target.closest('button')) return;
        event.stopPropagation(); this.resetInput();
      });
      guide.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || paused() || !this.scene.isActive()) return;
        event.stopPropagation(); this.resetInput(); this.autoCollapseGuide = false; this.registry.set('mine-guide-seen', true);
        if (button.hasAttribute('data-guide-toggle')) this.setGuideExpanded(!this.guideExpanded);
        const action = button.dataset.guideAction;
        if (action === 'fine' || action === 'heavy') this.chooseTool(action);
        if (action === 'observe') this.observeWall();
        if (action === 'track') this.trackNext();
      });
      const hideGuide = () => { guide.hidden = true; }, showGuide = () => { guide.hidden = false; };
      this.events.on('pause', hideGuide);
      this.events.on('resume', showGuide);
      this.events.once('shutdown', () => { this.events.off('pause', hideGuide); this.events.off('resume', showGuide); });
    }
    setGuideExpanded(expanded) {
      this.guideExpanded = expanded;
      this.guide.classList.toggle('is-expanded', expanded);
      this.guide.querySelector('#mine-guide-detail').hidden = !expanded;
      const toggle = this.guide.querySelector('[data-guide-toggle]');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? '收起指引' : '展开指引';
    }
    resetInput() {
      this.heldKeys.clear();
      this.jumpPending = false; this.tapPending = false;
      this.pointer.down = false; this.pointer.inside = false;
      const old = this.mining.swing;
      this.mining.cancel();
      if (old) {
        const [column, row] = old.key.split(',').map(Number);
        this.drawCrack({ column, row });
      }
      this.target = null;
      this.targetBox.clear();
      this.strikeTool.clear();
      this.lastToolContact = null;
    }
    installInput() {
      const canvas = this.game.canvas;
      const canvasHost = canvas.parentElement;
      const previousCanvasAttributes = new Map(['tabindex', 'role', 'aria-label'].map(name => [name, canvas.getAttribute(name)]));
      const previousHostHidden = canvasHost?.getAttribute('aria-hidden');
      canvas.setAttribute('tabindex', '0');
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', '矿洞探索。A D 行走，W S 爬梯，空格跳跃，E 挖掘，R 观察，1 细凿，2 重镐，Q 追踪。Tab 前往矿洞工具与指引。');
      canvasHost?.removeAttribute('aria-hidden');
      const canInput = () => this.scene.isActive() && !paused() && !document.hidden;
      const keydown = event => {
        if (!canInput() || event.ctrlKey || event.altKey || event.metaKey
          || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
        if (event.target.closest?.('.mine-guide button') && ['Space', 'Enter'].includes(event.code)) return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
        if (event.repeat) return;
        if (event.code === 'KeyR') { this.observeWall(); return; }
        if (event.code === 'KeyQ') { this.trackNext(); return; }
        if (event.code === 'Digit1' || event.code === 'Digit2') {
          this.chooseTool(event.code === 'Digit1' ? 'fine' : 'heavy'); return;
        }
        this.heldKeys.add(event.code);
        if (event.code === 'Space') this.jumpPending = true;
      };
      const keyup = event => {
        this.heldKeys.delete(event.code);
        if (event.code === 'KeyE' && this.mining.swing?.source === 'keyboard') this.cancelSwing();
      };
      const pointermove = event => {
        if (!canInput()) return;
        this.pointer.clientX = event.clientX; this.pointer.clientY = event.clientY;
        const point = this.screenPoint(event.clientX, event.clientY);
        this.pointer.inside = !this.inHud(point);
        if (!this.pointer.inside) { this.pointer.down = false; this.cancelSwing(); }
      };
      const pointerdown = event => {
        if (event.button !== 0 || !canInput()) return;
        event.preventDefault();
        const point = this.screenPoint(event.clientX, event.clientY);
        if (this.inHud(point)) {
          this.pointer.down = false; this.cancelSwing();
          return;
        }
        // A control keeps focus after it is clicked. Give it back only when
        // the player deliberately clicks the playfield; Space then jumps
        // instead of activating the last focused tool button.
        canvas.focus({ preventScroll: true });
        pointermove(event); this.pointer.down = true;
      };
      const pointerup = event => {
        if (event.button !== 0) return;
        this.pointer.down = false;
        if (this.mining.swing?.source === 'mouse') this.cancelSwing();
      };
      const pointerleave = () => {
        this.pointer.down = false; this.pointer.inside = false;
        this.heldKeys.delete('KeyE'); this.tapPending = false;
        this.cancelSwing(); this.targetBox.clear();
      };
      const reset = () => this.resetInput();
      document.addEventListener('keydown', keydown);
      document.addEventListener('keyup', keyup);
      canvas.addEventListener('pointermove', pointermove);
      canvas.addEventListener('pointerdown', pointerdown);
      canvas.addEventListener('pointerleave', pointerleave);
      window.addEventListener('pointerup', pointerup);
      window.addEventListener('pointercancel', reset);
      window.addEventListener('blur', reset);
      this.events.on('pause', reset);
      this.events.on('resume', reset);
      this.events.once('shutdown', () => {
        for (const [name, value] of previousCanvasAttributes) {
          if (value === null) canvas.removeAttribute(name); else canvas.setAttribute(name, value);
        }
        if (canvasHost) {
          if (previousHostHidden === null) canvasHost.removeAttribute('aria-hidden'); else canvasHost.setAttribute('aria-hidden', previousHostHidden);
        }
        document.removeEventListener('keydown', keydown);
        document.removeEventListener('keyup', keyup);
        canvas.removeEventListener('pointermove', pointermove);
        canvas.removeEventListener('pointerdown', pointerdown);
        canvas.removeEventListener('pointerleave', pointerleave);
        window.removeEventListener('pointerup', pointerup);
        window.removeEventListener('pointercancel', reset);
        window.removeEventListener('blur', reset);
        this.events.off('pause', reset); this.events.off('resume', reset);
      });
    }
    cancelSwing() {
      const old = this.mining.swing;
      this.mining.cancel();
      if (old) {
        const [column, row] = old.key.split(',').map(Number);
        this.drawCrack({ column, row });
      }
    }
    collect() {
      if (!paused() && this.scene.isActive()) { this.tapPending = true; this.cancelSwing(); }
    }
    screenPoint(clientX, clientY) {
      const bounds = this.game.canvas.getBoundingClientRect();
      return { x: (clientX - bounds.left) * this.scale.width / bounds.width,
        y: (clientY - bounds.top) * this.scale.height / bounds.height };
    }
    inHud(point) {
      if (this.guide.hidden) return false;
      const canvas = this.game.canvas.getBoundingClientRect(), guide = this.guide.getBoundingClientRect();
      const clientX = canvas.left + point.x * canvas.width / this.scale.width;
      const clientY = canvas.top + point.y * canvas.height / this.scale.height;
      return clientX >= guide.left && clientX <= guide.right && clientY >= guide.top && clientY <= guide.bottom;
    }
    chooseTool(tool, notify = true) {
      this.cancelSwing();
      if (!this.mining.setTool(tool)) return;
      for (const button of this.hudButtons) button.element.setAttribute('aria-pressed', String(button.tool === tool));
      if (notify) feedback.notify(tool === 'heavy' ? '重镐 · 普通岩石一击打开；遇玉后换细凿。' : '细凿 · 观察后点金色缝口，一击取玉；E 可自动对准。');
    }
    observeWall() {
      this.cancelSwing(); this.pointer.down = false; this.tapPending = false;
      const result = this.mining.observe(this.body);
      if (!result) { feedback.notify('靠近编号木梯旁的岩壁，再按 R 用侧灯看石缝。'); return; }
      this.trackedCluster = result.cluster.id;
      this.placeHintKey = '';
      this.drawSurveyMarks();
      const story = VEIN_STORIES.find(item => item.id === result.cluster.id);
      feedback.notify(`${story.name} · ${story.color}相连的两块同源玉。重镐打开石墙，再用细凿点金色缝口。`);
      mineSound('reveal');
    }
    trackNext() {
      const index = this.world.clusters.findIndex(cluster => cluster.id === this.trackedCluster);
      this.trackedCluster = this.world.clusters[(index + 1) % this.world.clusters.length].id;
      this.placeHintKey = '';
    }
    drawSurveyMarks() {
      this.surveyMarks.clear();
      for (const vein of this.world.veins) {
        if (!this.mining.observed(`C${vein.cluster + 1}`) || this.world.map[vein.row][vein.column] !== TILE.JADE_VEIN) continue;
        const point = seamPoint(vein);
        // Aim at the central slit; the precision hit radius is eight pixels.
        this.surveyMarks.lineStyle(1, 0xdccb89, .95);
        this.surveyMarks.strokeRect(point.x - 8, point.y - 8, 16, 16);
        this.surveyMarks.lineStyle(2, 0xf3df9c);
        this.surveyMarks.beginPath();
        this.surveyMarks.moveTo(point.x + 2, point.y - 6);
        this.surveyMarks.lineTo(point.x - 2, point.y);
        this.surveyMarks.lineTo(point.x + 2, point.y + 6);
        this.surveyMarks.strokePath();
      }
    }
    selectedTarget() {
      if (this.heldKeys.has('KeyE') || this.tapPending || !this.pointer.inside) {
        const target = keyboardDigTarget(this.world, this.body, this.direction === 'left' ? -1 : 1);
        const vein = this.world.veins.find(item => item.column === target.column && item.row === target.row);
        if (vein && this.mining.observed(`C${vein.cluster + 1}`)) target.aim = seamPoint(vein);
        return target;
      }
      const bounds = this.game.canvas.getBoundingClientRect();
      const x = (this.pointer.clientX - bounds.left) * this.scale.width / bounds.width;
      const y = (this.pointer.clientY - bounds.top) * this.scale.height / bounds.height;
      if (x < 0 || y < 0 || x >= this.scale.width || y >= this.scale.height) return null;
      const point = this.cameras.main.getWorldPoint(x, y);
      return { column: Math.floor(point.x / 32), row: Math.floor(point.y / 32), source: 'mouse', aim: { x: point.x, y: point.y } };
    }
    drawCrack(target, partial = 0) {
      const key = cellKey(target);
      const tile = this.world.map[target.row]?.[target.column];
      const damage = this.mining.damage.get(key) ?? 0;
      const hardness = TILE_RULES[tile]?.hardness;
      const frame = hardness ? Math.min(3, Math.floor((damage + partial) / hardness * 4)) : 0;
      if (!frame) { this.crackSprites.get(key)?.destroy(); this.crackSprites.delete(key); return; }
      let sprite = this.crackSprites.get(key);
      if (!sprite) {
        sprite = this.add.image(target.column * 32, target.row * 32, 'mine-cracks').setOrigin(0).setScale(2).setDepth(3);
        this.crackSprites.set(key, sprite);
      }
      sprite.setFrame(frame);
    }
    impact(hit) {
      feedback.hit();
      mineSound(hit.broken && hit.tile === TILE.JADE_VEIN ? 'reveal' : 'mine');
      this.drawCrack(hit);
      const centerX = hit.column * 32 + 16, centerY = hit.row * 32 + 16;
      this.lastToolContact = { x: centerX, y: centerY, heavy: hit.tool === 'heavy', remaining: 85 };
      const jade = hit.tile === TILE.JADE_VEIN;
      const count = hit.broken ? (hit.tool === 'heavy' ? 16 : 10) : 3;
      const colors = jade ? [0x63d595, 0xb6e6ad, 0x308563] : hit.tile === TILE.DIRT
        ? [0x8c8d72, 0x65736a, 0x414f4e] : [0x8ba3a5, 0x536f7a, 0x344b56];
      for (let index = 0; index < count; index++) {
        const life = hit.broken ? 310 + index % 3 * 70 : 180 + index * 30;
        const sprite = this.add.rectangle(centerX, centerY, index % 2 ? 4 : 3, index % 3 ? 2 : 4, colors[index % 3]).setDepth(6);
        this.particles.push({ sprite, life, maxLife: life, vx: (index - (count - 1) / 2) * (hit.broken ? 22 : 32), vy: -45 - index % 3 * 25 });
      }
      // A compact flash marks each completed pick stroke; the larger chip burst
      // happens only on the exact hit that opens the cell.
      this.impactLightTime = jade ? 125 : 75;
      this.impactLight.setPosition(centerX, centerY).setTint(jade ? 0xc9f8cd : 0xcbdde2).setAlpha(jade ? .85 : .35);
      if (hit.tool === 'heavy' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.cameras.main.shake(90, .002);
      if (hit.seam) feedback.notify('顺着缝口取下整块玉 · 同源的另一块就在旁边。');
      if (hit.broken) {
        this.terrain.update(hit.column, hit.row);
        const key = cellKey(hit);
        this.veinGlows.get(key)?.destroy(); this.veinGlows.delete(key);
        this.drawSurveyMarks();
      }
      while (this.particles.length > 112) this.particles.shift().sprite.destroy();
    }
    syncDrops() {
      for (const [id, sprite] of this.dropSprites) {
        if (!this.mining.drops.has(id)) { sprite.destroy(); this.dropSprites.delete(id); }
      }
      const frame = this.reducedMotion ? 0 : Math.floor(this.effectTime / 300) % 2;
      for (const drop of this.mining.drops.values()) {
        let sprite = this.dropSprites.get(drop.id);
        if (!sprite) { sprite = this.add.image(drop.x, drop.y, 'mine-drop').setDepth(5); this.dropSprites.set(drop.id, sprite); }
        sprite.setPosition(drop.x, drop.y - frame * 2).setFrame(frame);
      }
    }
    updateEffects(delta) {
      this.effectTime += delta;
      this.impactLightTime = Math.max(0, this.impactLightTime - delta);
      this.impactLight.setAlpha(Math.min(.8, this.impactLightTime / 150));
      for (const [key, glow] of this.veinGlows) {
        const phase = Number(key.split(',')[0]) * .7;
        glow.setAlpha(.64 + (this.reducedMotion ? 0 : Math.sin(this.effectTime / 950 + phase) * .12));
      }
      this.particles = this.particles.filter(particle => {
        particle.life -= delta;
        if (particle.life <= 0) { particle.sprite.destroy(); return false; }
        particle.vy += 420 * delta / 1000;
        particle.sprite.x += particle.vx * delta / 1000;
        particle.sprite.y += particle.vy * delta / 1000;
        particle.sprite.setAlpha(Math.min(1, particle.life / particle.maxLife));
        return true;
      });
      this.syncDrops();
    }
    drawStrikeTool(delta) {
      this.strikeTool.clear();
      const swing = this.mining.swing;
      if (this.lastToolContact) this.lastToolContact.remaining -= delta;
      if (!swing && (!this.lastToolContact || this.lastToolContact.remaining <= 0)) return;
      const [column, row] = swing ? swing.key.split(',').map(Number) : [];
      const target = swing ? { x: column * 32 + 16, y: row * 32 + 16, heavy: swing.tool === 'heavy' } : this.lastToolContact;
      const facing = target.x < this.body.x ? -1 : 1;
      this.direction = facing < 0 ? 'left' : 'right';
      const progress = swing ? Math.min(1, swing.elapsed / swing.duration) : 1;
      const handX = this.body.x + facing * (progress < .5 ? 12 : 17);
      const handY = this.body.y - (progress < .5 ? 47 : 35);
      // Wind-up follows the arm; the downstroke terminates at the actual mined
      // cell. A brief contact pose is shown on the same frame as its chip burst.
      const impactProgress = Math.max(0, (progress - .25) / .75);
      const eased = impactProgress * impactProgress;
      const raisedX = this.body.x + facing * 16, raisedY = this.body.y - 91;
      const headX = raisedX + (target.x - raisedX) * eased;
      const headY = raisedY + (target.y - raisedY) * eased;
      const pixelStroke = (ax, ay, bx, by, color, size) => {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 2));
        this.strikeTool.fillStyle(color);
        for (let index = 0; index <= steps; index++) this.strikeTool.fillRect(Math.round((ax + (bx - ax) * index / steps) / 2) * 2, Math.round((ay + (by - ay) * index / steps) / 2) * 2, size, size);
      };
      pixelStroke(handX, handY, headX, headY, 0x17232a, 5);
      pixelStroke(handX, handY, headX, headY, 0xa67c48, 3);
      const length = Math.hypot(headX - handX, headY - handY) || 1;
      const sideX = -(headY - handY) / length, sideY = (headX - handX) / length;
      const reach = target.heavy ? 13 : 8;
      pixelStroke(headX - sideX * reach, headY - sideY * reach, headX + sideX * reach, headY + sideY * reach, 0x12232b, target.heavy ? 7 : 5);
      pixelStroke(headX - sideX * reach, headY - sideY * reach, headX + sideX * reach, headY + sideY * reach, 0x98b2b3, target.heavy ? 4 : 3);
      pixelStroke(headX - sideX * reach, headY - sideY * reach, headX, headY, 0xd2dbcc, 2);
      this.player.stop();
      this.player.setFrame((facing < 0 ? 0 : 6) + (progress < .55 ? 4 : 5));
    }
    updatePlaceHint() {
      const cluster = this.world.clusters.find(item => item.id === this.trackedCluster);
      const index = this.world.clusters.indexOf(cluster);
      const pair = minePairProgress(store.state, cluster.id);
      const route = mineRouteHint(this.world, this.body, cluster);
      const observed = this.mining.observed(cluster.id);
      const key = `${index}:${pair.extracted}:${pair.recovered}:${pair.pending}:${observed}:${route}`;
      if (this.placeHintKey === key) return;
      this.placeHintKey = key;
      const story = VEIN_STORIES[index];
      this.placeTitle.setText(`${index + 1} · ${story.name} · ${pair.recovered}/2`);
      this.placeHint.setText(pair.recovered === 2 ? `${story.clue}\n双石已带回，可用不同刀法创作一组成对作品。`
        : pair.pending ? `${story.color}的同源石已开采 ${pair.extracted}/2，地上还有 ${pair.pending} 块待拾取。`
          : observed ? `${story.clue}\n金色缝口已标出；同源的两块原石各有自己的纹理。`
            : '每脉两块同源玉。先沿木梯找到岩壁，按 R 用侧灯照出缝口，再决定从哪里开采。');
      this.routeHint.setText(pair.recovered === 2 ? '已集齐 · Q 寻找另一脉，或回工坊观察与创作' : route);
    }
    mouseCorridorBlocked() {
      if (!this.pointer.inside) return null;
      const facing = this.direction === 'left' ? -1 : 1;
      const column = Math.floor(this.body.x / 32) + facing;
      const row = Math.floor((this.body.y - 28) / 32);
      if (this.world.map[row]?.[column] !== TILE.AIR) return null;
      const upperRow = row - 1;
      return this.world.map[upperRow]?.[column] !== undefined && this.world.map[upperRow][column] !== TILE.AIR
        ? { column, row: upperRow }
        : null;
    }
    update(time, delta) {
      if (paused() || document.hidden) return;
      const activeDelta = Math.max(0, Math.min(delta, 50));
      const down = code => Number(this.heldKeys.has(code));
      const dx = Math.sign(down('KeyD') + down('ArrowRight') - down('KeyA') - down('ArrowLeft'));
      const dy = Math.sign(down('KeyS') + down('ArrowDown') - down('KeyW') - down('ArrowUp'));
      if (this.autoCollapseGuide && (dx || dy || this.jumpPending)) { this.autoCollapseGuide = false; this.registry.set('mine-guide-seen', true); this.setGuideExpanded(false); }
      this.body = moveMiner(this.body, { x: dx, y: dy, jump: this.jumpPending }, activeDelta, this.world);
      this.jumpPending = false;
      this.player.setPosition(this.body.x, this.body.y);
      this.footShadow.setPosition(this.body.x, this.body.y - 1).setAlpha(this.body.climbing ? .12 : .45);
      this.lampShade.setPosition(Math.round(this.body.x), Math.round(this.body.y - 56));
      if (dx) this.direction = dx < 0 ? 'left' : 'right';
      this.target = this.selectedTarget();
      const valid = validDigTarget(this.world, this.body, this.target);
      this.targetBox.clear();
      const blockedUpper = this.mouseCorridorBlocked();
      if (blockedUpper) {
        this.targetBox.lineStyle(2, 0xffd47b, .95);
        this.targetBox.strokeRect(blockedUpper.column * 32 + .5, blockedUpper.row * 32 + .5, 31, 31);
      }
      if (valid) {
        const x = this.target.column * 32, y = this.target.row * 32;
        const stroke = this.mining.profile(this.target);
        this.targetBox.lineStyle(stroke.seam ? 2 : 1, stroke.seam ? 0xffe5a5 : 0xb9dbab); this.targetBox.strokeRect(x + .5, y + .5, 31, 31);
        const tile = this.world.map[this.target.row][this.target.column];
        const hardness = TILE_RULES[tile].hardness;
        const damage = this.mining.damage.get(cellKey(this.target)) ?? 0;
        for (let hit = 0; hit < hardness; hit++) {
          this.targetBox.fillStyle(hit < damage ? 0xc3e8b1 : 0x273f41);
          this.targetBox.fillRect(x + 2 + hit * 10, y + 34, 8, 3);
        }
        this.toolHint.setText(stroke.seam ? '已对准金色缝口 · 细凿一击取玉'
          : tile === TILE.JADE_VEIN ? (stroke.tool === 'heavy' ? '玉脉质密 · 按 1 换细凿，R 观察后对准金缝' : '盲敲需三击 · R 观察后点金缝（E 自动对缝）')
            : stroke.tool === 'heavy' ? '重镐 · 一击打开普通岩石，保留玉脉待细凿' : '细凿 · 按 2 换重镐可更快打开石墙');
      } else {
        this.toolHint.setText(blockedUpper
          ? '前方脚下已挖通，但头顶仍有石块 · 鼠标点亮的金色框内还需挖开，才能走入通道'
          : `${EXCAVATION_TOOLS[this.mining.tool].name}已选 · 重镐开路，细凿点金缝（E 自动对缝）`);
      }
      this.updatePlaceHint();
      const held = this.heldKeys.has('KeyE') || this.tapPending || (this.pointer.inside && this.pointer.down);
      const previous = this.mining.swing;
      const hit = this.mining.update(this.body, this.target, held, activeDelta);
      if (previous && previous.key !== this.mining.swing?.key) {
        const [column, row] = previous.key.split(',').map(Number); this.drawCrack({ column, row });
      }
      if (hit) { this.impact(hit); if (this.tapPending) this.tapPending = false; }
      if (!valid) this.tapPending = false;
      if (this.mining.swing) this.drawCrack(this.target, this.mining.swing.elapsed / this.mining.swing.duration * this.mining.swing.strength);
      const pickup = this.mining.pickup(this.body);
      for (const drop of pickup.collected) {
        const index = Number(/^C([1-6])-[LR]$/.exec(drop.id)?.[1]) - 1;
        const origin = VEIN_STORIES[index]?.name;
        const pair = minePairProgress(store.state, `C${index + 1}`);
        feedback.notify(`${origin ? `${origin} · ` : ''}获得${drop.material === 'nephrite' ? '和田玉原石' : '翡翠原石'} ×1 · 同源石 ${pair.recovered}/2${pair.recovered === 2 ? ' 已集齐，可成对创作' : '，另一块就在相邻岩壁'}`);
        mineSound('collect');
      }
      if (pickup.full && this.effectTime - this.fullNoticeTime >= 3000) {
        feedback.notify('行囊已满，玉料已留在矿洞；可回工坊加工后再来拾取。'); this.fullNoticeTime = this.effectTime;
      }
      this.updateEffects(activeDelta);
      this.player.anims.timeScale = this.mining.swing ? SWING_MS / this.mining.swing.duration : 1;
      if (this.mining.swing || this.lastToolContact?.remaining > 0) this.drawStrikeTool(activeDelta);
      else if (dx || (dy && this.body.climbing)) this.player.play(`mine-${this.direction}-walk`, true);
      else { this.player.stop(); this.player.setFrame(this.direction === 'left' ? 0 : 6); }
      if (!this.mining.swing && !(this.lastToolContact?.remaining > 0)) this.strikeTool.clear();
    }
  };
}
