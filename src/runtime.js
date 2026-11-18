import Phaser from 'phaser';
import workshopUrl from './assets/workshop-isometric-v1.png';
import menuUrl from './assets/menu-mountains-v1.png';
import masterUrl from './assets/master-carver-v1.png';
import galleryUrl from './assets/gallery-isometric-v1.png';
import { decorateMenuScene } from './menu-art.js';
import { drawScene, drawGalleryExhibits } from './scenery.js';
import { PauseGate } from './pause.js';
import { addWorkshopMaster } from './workshop-art.js';
import { GALLERY_CASES, GALLERY_SPOTLIGHTS, spotlightFrame } from './gallery-lighting.js';

export function createRuntime(store) {
  const gate = new PauseGate();
  let ready = false;
  let current = null;
  let game;
  const desired = () => store.active ? store.state.location : 'menu';
  function syncPause() {
    if (!ready || !current) return;
    if (gate.paused && game.scene.isActive(current)) game.scene.pause(current);
    else if (!gate.paused && game.scene.isPaused(current)) game.scene.resume(current);
    document.querySelector('#game').dataset.paused = String(gate.paused);
  }
  function sync() {
    if (!ready) return;
    const next = desired();
    if (next === current) {
      if (current === 'gallery') game.scene.getScene('gallery').renderExhibits();
      syncPause();
      return;
    }
    if (current) game.scene.stop(current);
    game.scale.resize(next === 'workshop' ? 1024 : 960, next === 'workshop' ? 559 : 540);
    current = next;
    game.scene.start(next);
  }
  class BootScene extends Phaser.Scene {
    constructor() { super('boot'); }
    preload() {
      this.add.text(480, 260, '正在点亮玉作工坊…', { fontFamily: 'Fusion Pixel, Microsoft YaHei', fontSize: '24px', color: '#d6c294' }).setOrigin(.5);
      this.load.image('workshop', workshopUrl);
      this.load.image('menu-landscape', menuUrl);
      this.load.image('master-carver', masterUrl);
      this.load.image('gallery-room', galleryUrl);
    }
    create() { ready = true; sync(); this.scene.stop('boot'); }
  }
  const sceneClass = key => class extends Phaser.Scene {
    constructor() { super(key); }
    create() {
      if (key === 'menu' && this.textures.exists('menu-landscape')) {
        this.add.image(480, 270, 'menu-landscape').setDisplaySize(960, 540);
        decorateMenuScene(this);
      } else if (key === 'workshop' && this.textures.exists('workshop')) {
        this.add.image(512, 279.5, 'workshop').setDisplaySize(1024, 559);
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reducedMotion) {
          // A few low-contrast square motes give the window light a quiet
          // depth cue without competing with the DOM panels or dialogue.
          const motes = Array.from({ length: 12 }, (_, index) => this.add.rectangle(
            122 + (index * 47) % 520,
            102 + (index * 61) % 292,
            index % 3 ? 2 : 1,
            index % 4 ? 2 : 1,
            index % 2 ? 0xd9e5bd : 0xf1d39b,
            .1 + (index % 3) * .025,
          ).setDepth(2.4));
          this.time.addEvent({ delay: 90, loop: true, callback: () => {
            motes.forEach((mote, index) => {
              const speed = .14 + (index % 4) * .035;
              mote.y -= speed;
              mote.x += Math.sin((this.time.now + index * 180) / 1100) * .08;
              if (mote.y < 86) mote.y = 392 + (index % 5) * 4;
            });
          } });
        }
        addWorkshopMaster(this);
        const glow = this.add.graphics().setDepth(1);
        for (const [x, y] of [[254, 150], [105, 218], [477, 150], [635, 218]]) {
          glow.fillStyle(0xffb347, .05); glow.fillRect(x - 25, y - 20, 50, 40);
          glow.fillStyle(0xffc66c, .07); glow.fillRect(x - 17, y - 25, 34, 50);
          glow.fillStyle(0xffd483, .08); glow.fillRect(x - 12, y - 15, 24, 30);
        }
        if (!reducedMotion) {
          const glowLevels = [1, .88, .94, .88];
          let phase = 0;
          this.time.addEvent({ delay: 220, loop: true, callback: () => {
            phase = (phase + 1) % glowLevels.length;
            glow.setAlpha(glowLevels[phase]);
          } });
        }
      } else if (key === 'gallery' && this.textures.exists('gallery-room')) {
        this.add.image(480, 270, 'gallery-room').setDisplaySize(960, 540);
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const spotlights = this.add.graphics().setDepth(1.1);
        const drawSpotlights = phase => {
          spotlights.clear();
          spotlights.setAlpha(spotlightFrame(phase));
          for (const { x, top, bottom, width } of GALLERY_SPOTLIGHTS) {
            // Stepped polygons read as a cone at the game's pixel scale and
            // leave the display case glass and DOM labels unobscured.
            spotlights.fillStyle(0xf3dfad, .08);
            spotlights.fillPoints([
              { x: x - 7, y: top }, { x: x + 7, y: top },
              { x: x + width, y: bottom }, { x: x - width, y: bottom },
            ], true);
            spotlights.fillStyle(0xffe7ad, .11);
            spotlights.fillPoints([
              { x: x - 4, y: top + 3 }, { x: x + 4, y: top + 3 },
              { x: x + width - 18, y: bottom - 9 }, { x: x - width + 18, y: bottom - 9 },
            ], true);
          }
        };
        drawSpotlights(0);
        const glass = this.add.graphics().setDepth(1.8);
        const drawGlass = phase => {
          glass.clear();
          glass.lineStyle(1, 0xd8f2df, .18 + spotlightFrame(phase) * .05);
          for (const { x, y } of GALLERY_CASES) {
            glass.strokeRect(x - 35, y - 55, 70, 55);
            glass.lineBetween(x - 35, y - 55, x - 8, y - 28);
            glass.lineBetween(x + 35, y - 55, x + 8, y - 28);
          }
        };
        drawGlass(0);
        if (!reducedMotion) {
          const motes = Array.from({ length: 15 }, (_, index) => this.add.rectangle(
            180 + (index * 61) % 600, 145 + (index * 37) % 210,
            index % 3 ? 2 : 1, index % 4 ? 2 : 1,
            index % 2 ? 0xd8e7c4 : 0xf2d79b, .08 + (index % 3) * .018,
          ).setDepth(2.5));
          this.time.addEvent({ delay: 110, loop: true, callback: () => motes.forEach((mote, index) => {
            mote.y -= .08 + (index % 4) * .025;
            mote.x += Math.sin((this.time.now + index * 160) / 1250) * .05;
            if (mote.y < 126) mote.y = 344 + (index % 5) * 5;
          }) });
          let phase = 0;
          this.time.addEvent({ delay: 220, loop: true, callback: () => {
            phase = (phase + 1) % 4;
            drawSpotlights(phase);
            drawGlass(phase);
          } });
        }
      } else drawScene(this.add.graphics(), key);
      if (key === 'gallery') {
        this.exhibitLayer = this.add.container(0, 0).setDepth(2);
        this.renderExhibits();
      }
      document.querySelector('#game').dataset.scene = key;
      this.events.once('create', syncPause);
    }
    renderExhibits() {
      if (!this.exhibitLayer) return;
      this.exhibitLayer.removeAll(true);
      drawGalleryExhibits(this, this.exhibitLayer, store.state);
    }
  };
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'canvas', width:960, height:540,
    backgroundColor:'#142623', pixelArt:true,
    scale:{ mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH },
    scene:[BootScene, ...['menu','workshop','gallery'].map(sceneClass)],
  });
  const onVisibility = () => { gate.set('hidden', document.hidden); syncPause(); };
  document.addEventListener('visibilitychange', onVisibility);
  const onBlur = () => { gate.set('blur', true); syncPause(); };
  const onFocus = () => { gate.set('blur', false); syncPause(); };
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  onVisibility();
  return {
    sync,
    setPaused(reason, value) { gate.set(reason,value); syncPause(); },
    destroy() {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      game.destroy(true);
    },
  };
}
