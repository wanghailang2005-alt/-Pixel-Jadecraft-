import Phaser from 'phaser';
import caveUrl from './assets/mine-cavern-v1.png';
import { createMineArt, drawMineTerrain } from './mine-art.js';
import { REACH, SWING_MS, COOLDOWN_MS, WORLD_WIDTH, WORLD_HEIGHT, advanceSwing, moveMiner } from './mining.js';
import { placeholderMineWorld, readTiledMine } from './mine-map.js';

// Optional files use fixed sprite-sheet loaders as soon as the images exist.
const tileAssets = import.meta.glob('./assets/tiles-mine.png', { eager: true, query: '?url', import: 'default' });
const playerAssets = import.meta.glob('./assets/player-32x48.png', { eager: true, query: '?url', import: 'default' });
const mapAssets = import.meta.glob('/public/maps/mine.tmj', { eager: true, query: '?raw', import: 'default' });

export function preloadMine(scene) {
  scene.load.image('mine-cavern', caveUrl);
  const tilesUrl = tileAssets['./assets/tiles-mine.png'];
  const playerUrl = playerAssets['./assets/player-32x48.png'];
  if (tilesUrl) scene.load.spritesheet('mine-tiles', tilesUrl, { frameWidth: 16, frameHeight: 16 });
  if (playerUrl) scene.load.spritesheet('mine-player', playerUrl, { frameWidth: 32, frameHeight: 48 });
  const rawMap = mapAssets['/public/maps/mine.tmj'];
  if (rawMap) {
    const data = JSON.parse(rawMap);
    scene.registry.set('mine-world', readTiledMine(data));
    scene.load.tilemapTiledJSON('mine-map', data);
  }
}

function placeholderSheets(scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  if (!scene.textures.exists('mine-tiles')) {
    const tilesets = scene.cache.tilemap.get('mine-map')?.data.tilesets;
    const columns = tilesets ? Math.max(...tilesets.map(set => set.columns)) : 3;
    const rows = tilesets ? Math.max(...tilesets.map(set => Math.ceil(set.tilecount / set.columns))) : 1;
    for (let frame = 0; frame < columns * rows; frame++) {
      const x = (frame % columns) * 16, y = Math.floor(frame / columns) * 16;
      graphics.fillStyle([0x20383b, 0x152829, 0x30494a][frame % 3]); graphics.fillRect(x, y, 16, 16);
      graphics.fillStyle(0x52654b); graphics.fillRect(x, y, 16, 2);
    }
    graphics.generateTexture('mine-tiles-source', columns * 16, rows * 16);
    scene.textures.addSpriteSheet('mine-tiles', scene.textures.get('mine-tiles-source').getSourceImage(), { frameWidth: 16, frameHeight: 16 });
  }
  createMineArt(scene);
  graphics.destroy();
  ['left', 'right', 'down'].forEach((direction, row) => {
    for (const [kind, start, end, frameRate, repeat] of [['walk', 0, 3, 8, -1], ['swing', 4, 5, 1000 / (SWING_MS / 2), 0]]) {
      const key = `mine-${direction}-${kind}`;
      if (!scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers('mine-player', { start: row * 6 + start, end: row * 6 + end }), frameRate, repeat });
    }
  });
}

export function createMineScene({ store, mining, feedback, paused, onReady, onStop }) {
  return class MineScene extends Phaser.Scene {
    constructor() { super('mine'); }
    create() {
      placeholderSheets(this);
      this.world = this.registry.get('mine-world') ?? placeholderMineWorld();
      this.add.image(480, 270, 'mine-cavern').setDisplaySize(960, 540).setScrollFactor(0).setDepth(-10);
      if (this.cache.tilemap.exists('mine-map')) {
        const map = this.make.tilemap({ key: 'mine-map' });
        const tilesets = map.tilesets.map(set => map.addTilesetImage(set.name, 'mine-tiles', 16, 16, 0, 0));
        ['ground', 'walls', 'decor'].forEach((name, index) => {
          const layer = map.createLayer(name, tilesets, 0, 0).setScale(2).setDepth(index);
          if (name === 'walls') layer.setCollisionByProperty({ collides: true });
        });
        // Native object layers remain available to editor/debug tooling.
        this.oreObjects = map.getObjectLayer('oreNodes');
        this.spawnObjects = map.getObjectLayer('spawn');
        this.tilemap = map;
        drawMineTerrain(this, this.world, false);
        this.events.once('shutdown', () => map.destroy());
      } else {
        if (tileAssets['./assets/tiles-mine.png']) {
          this.world.map.forEach((row, y) => row.forEach((tile, x) => {
            if (tile) this.add.image(x * 32, y * 32, 'mine-tiles', tile).setOrigin(0).setScale(2).setDepth(1);
          }));
          drawMineTerrain(this, this.world, false);
        } else drawMineTerrain(this, this.world);
      }
      this.player = this.add.sprite(this.world.spawn.x, this.world.spawn.y, 'mine-player', 6).setOrigin(0.5, 1).setScale(2).setDepth(4);
      this.body = { ...this.world.spawn, velocityY: 0, climbing: false };
      this.direction = 'right';
      this.swing = null;
      this.nodes = this.world.nodes.map(node => ({ ...node,
        glow: this.add.image(node.x, node.y, 'mine-glow').setScale(2.4).setDepth(2),
        sprite: this.add.image(node.x, node.y, `mine-ore-${node.material}-ready`).setScale(2).setDepth(3),
        label: this.add.text(node.x, node.y - 54, '', { fontFamily: 'Microsoft YaHei', fontSize: '13px', color: '#E8DCC0', backgroundColor: '#101C1B', padding: { x: 8, y: 5 } }).setOrigin(0.5).setDepth(6) }));
      this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D', false);
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setRoundPixels(true);
      this.cameras.main.centerOn(this.player.x, this.player.y);
      const onKey = event => {
        if (!this.scene.isActive() || paused() || event.ctrlKey || event.altKey || event.metaKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
        if (['Space', 'KeyE'].includes(event.code)) {
          event.preventDefault();
          if (!event.repeat) this.collect();
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      };
      document.addEventListener('keydown', onKey);
      const resetKeys = () => this.input.keyboard.resetKeys();
      this.events.on('pause', resetKeys);
      this.events.once('shutdown', () => {
        document.removeEventListener('keydown', onKey);
        this.events.off('pause', resetKeys);
        if (this.swing) mining.cancel(this.swing.id);
        onStop();
      });
      document.querySelector('#game').dataset.scene = 'mine';
      this.events.once('create', () => onReady(() => this.collect()));
      this.drawNodes();
    }
    collect() {
      if (paused() || this.swing || !this.scene.isActive()) return;
      const nearest = this.nodes.reduce((best, node) => Math.hypot(node.x - this.player.x, node.y - (this.player.y - 40)) < Math.hypot(best.x - this.player.x, best.y - (this.player.y - 40)) ? node : best);
      if (Math.hypot(nearest.x - this.player.x, nearest.y - (this.player.y - 40)) > REACH) { feedback.notify('靠近玉石矿点，按空格或 E 挥镐。'); return; }
      const result = mining.begin(nearest.id);
      if (result === 'full') { feedback.notify('行囊已满（12/12），请先腾出原石空位。'); return; }
      if (result === 'cooldown') { feedback.notify('这个矿点正在恢复，请稍候再采。'); return; }
      if (result !== 'started') return;
      this.swing = { id: nearest.id, elapsed: 0 };
      this.direction = nearest.x < this.player.x ? 'left' : 'right';
      this.player.play(`mine-${this.direction}-swing`);
    }
    impact(node) {
      for (let index = 0; index < 5; index++) {
        const chip = this.add.rectangle(node.x, node.y, 4, 4, index % 2 ? 0x54a888 : 0xa5c69c).setDepth(5);
        this.tweens.add({ targets: chip, x: node.x + (index - 2) * 12, y: node.y - 16 - (index % 3) * 8, alpha: 0, duration: 400, onComplete: () => chip.destroy() });
      }
      const pickup = this.add.text(node.x, node.y - 24, '+1 玉石', { fontFamily: 'Microsoft YaHei', fontSize: '16px', color: '#7FE3B0', stroke: '#101C1B', strokeThickness: 4 }).setOrigin(.5).setDepth(8);
      this.tweens.add({ targets: pickup, y: node.y - 90, alpha: 0, duration: 1000, onComplete: () => pickup.destroy() });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.cameras.main.shake(90, .002);
      feedback.hit();
    }
    drawNodes() {
      const names = { full: '完整', cracked: '裂纹', ready: '可采 · E / 空格', mining: '开采中', empty: '采空', regrowing: '再生' };
      const now = Date.now();
      for (const node of this.nodes) {
        const state = mining.status(node.id, now);
        const label = state.phase === 'empty' ? `采空 · ${Math.ceil((COOLDOWN_MS - now + state.changedAt) / 1000)}s` : names[state.phase];
        if (node.label.text !== label) node.label.setText(label);
        node.label.setVisible(Math.hypot(node.x - this.player.x, node.y - (this.player.y - 40)) < REACH + 32);
        if (node.phase === state.phase) continue;
        node.phase = state.phase;
        node.sprite.setTexture(`mine-ore-${node.material}-${state.phase}`);
        node.glow.setVisible(!['empty', 'regrowing'].includes(state.phase));
      }
    }
    update(time, delta) {
      if (paused()) return;
      if (this.swing) {
        this.swing = advanceSwing(this.swing, delta, 50);
        if (this.swing.elapsed >= SWING_MS) {
          const node = this.nodes.find(node => node.id === this.swing.id);
          try {
            if (mining.hit(node.id, Date.now(), () => this.impact(node))) feedback.notify(`获得${node.material === 'nephrite' ? '和田玉原石' : '翡翠原石'} ×1 · 行囊 ${store.state.inventory.length}/12`);
            else {
              mining.cancel(node.id);
              feedback.notify('采集未结算，请检查行囊空位后重试。');
            }
          } finally {
            mining.cancel(this.swing.id);
            this.swing = null;
          }
        }
      } else {
        const keys = this.keys;
        let dx = Number(keys.RIGHT.isDown || keys.D.isDown) - Number(keys.LEFT.isDown || keys.A.isDown);
        let dy = Number(keys.DOWN.isDown || keys.S.isDown) - Number(keys.UP.isDown || keys.W.isDown);
        this.body = moveMiner({ ...this.body, x: this.player.x, y: this.player.y }, { x: dx, y: dy }, delta, this.world);
        this.player.setPosition(this.body.x, this.body.y);
        if (dx || (dy && this.body.climbing)) {
          this.direction = dx < 0 ? 'left' : dx > 0 ? 'right' : 'down';
          this.player.play(`mine-${this.direction}-walk`, true);
        } else {
          this.player.stop();
          this.player.setFrame({ left: 0, right: 6, down: 12 }[this.direction]);
        }
      }
      this.drawNodes();
    }
  };
}
