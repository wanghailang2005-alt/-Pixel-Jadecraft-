import Phaser from 'phaser';
import workshopUrl from './assets/workshop-isometric-v1.png';
import menuUrl from './assets/menu-mountains-v1.png';
import masterUrl from './assets/master-carver-v1.png';
import galleryUrl from './assets/gallery-isometric-v1.png';
import { decorateMenuScene } from './menu-art.js';
import { drawScene, drawGalleryExhibits } from './scenery.js';
import { PauseGate } from './pause.js';
import { createMining } from './mining.js';
import { preloadMine, createMineScene } from './mine-scene.js';
import { WORKSHOP_CONTACT, workshopPose } from './workshop-pose.js';
import { GALLERY_SPOTLIGHTS, spotlightFrame } from './gallery-lighting.js';

export function createRuntime(store, feedback) {
  let mining = null;
  let sessionRevision = store.sessionRevision;
  let collect = null;
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
    if (sessionRevision !== store.sessionRevision) {
      sessionRevision = store.sessionRevision;
      mining = null;
      if (current === 'mine') { game.scene.stop(current); current = null; }
    }
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
      preloadMine(this);
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
        // The source is a square portrait with a narrow opaque character inside.
        // Crop the transparent margins before sizing it so the character keeps
        // its narrow 49×90 silhouette instead of being stretched sideways.
        const master = this.add.image(355, 262, 'master-carver')
          .setCrop(288, 22, 658, 1218)
          .setDisplaySize(49, 90)
          .setDepth(2);
        const tool = this.add.graphics().setDepth(3);
        const contact = this.add.graphics().setDepth(1.7);
        contact.fillStyle(0x0a1711, .34);
        contact.fillRect(WORKSHOP_CONTACT.shadowX, WORKSHOP_CONTACT.shadowY, WORKSHOP_CONTACT.shadowWidth, 5);
        contact.fillStyle(0x9b794a, .46);
        contact.fillRect(WORKSHOP_CONTACT.shadowX - 5, WORKSHOP_CONTACT.tableEdgeY, WORKSHOP_CONTACT.shadowWidth + 10, 2);
        contact.fillStyle(0x6d9b73, .38);
        contact.fillRect(WORKSHOP_CONTACT.x - 11, WORKSHOP_CONTACT.y - 5, 22, 2);
        contact.fillStyle(0xc2dba4, .42);
        contact.fillRect(WORKSHOP_CONTACT.x - 7, WORKSHOP_CONTACT.y - 3, 14, 2);
        const glow = this.add.graphics().setDepth(1);
        for (const [x, y] of [[254, 150], [105, 218], [477, 150], [635, 218]]) {
          glow.fillStyle(0xffb347, .05); glow.fillRect(x - 25, y - 20, 50, 40);
          glow.fillStyle(0xffc66c, .07); glow.fillRect(x - 17, y - 25, 34, 50);
          glow.fillStyle(0xffd483, .08); glow.fillRect(x - 12, y - 15, 24, 30);
        }
        const sparkles = this.add.graphics().setDepth(3);
        const drawCraftContact = phase => {
          // Four hand-cut poses. The tip meets the visible jade contact anchor.
          const pose = workshopPose(phase);
          const lift = pose.lift;
          tool.clear();
          tool.fillStyle(0x243b29); tool.fillRect(WORKSHOP_CONTACT.x - 1, 286 + lift, 9, 7);
          tool.fillStyle(0x587447); tool.fillRect(WORKSHOP_CONTACT.x - 1, 286 + lift, 7, 3);
          // The portrait already contains the master's hands. Keep only the
          // small chisel/contact highlight here; drawing square skin blocks on
          // top of the portrait made the hand look like a detached tile.
          tool.fillStyle(0x6b492e); tool.fillRect(WORKSHOP_CONTACT.x + 4, 291 + lift, 3, 8);
          tool.fillStyle(0xbabfac); tool.fillRect(WORKSHOP_CONTACT.x + 3, 297 + lift, 2, 4);
          tool.fillStyle(0xe4dfbc); tool.fillRect(WORKSHOP_CONTACT.x + 3, 297 + lift, 1, 3);
          sparkles.clear();
          if (pose.impact) {
            sparkles.fillStyle(0xd4e7ad, .9);
            for (const [x, y] of [[WORKSHOP_CONTACT.x - 5, WORKSHOP_CONTACT.y - 2], [WORKSHOP_CONTACT.x + 6, WORKSHOP_CONTACT.y], [WORKSHOP_CONTACT.x + 3, WORKSHOP_CONTACT.y + 5]]) sparkles.fillRect(x, y, 2, 1);
            sparkles.fillStyle(0x6eab77, .8); sparkles.fillRect(WORKSHOP_CONTACT.x - 8, WORKSHOP_CONTACT.y + 3, 2, 2);
          }
          master.setY(262 + pose.masterY);
        };
        drawCraftContact(0);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          let phase = 0;
          this.time.addEvent({ delay: 220, loop: true, callback: () => {
            phase = (phase + 1) % 4;
            drawCraftContact(phase);
            glow.setAlpha([1, .88, .94, .88][phase]);
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
  const MineScene = createMineScene({
    store, feedback, paused: () => gate.paused,
    getSession: factory => mining ??= createMining(store, factory()),
    onReady: callback => { collect = callback; syncPause(); },
    onStop: () => { collect = null; },
  });
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'canvas', width:960, height:540,
    backgroundColor:'#142623', pixelArt:true,
    scale:{ mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH },
    scene:[BootScene, ...['menu','workshop','gallery'].map(sceneClass), MineScene],
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
    collect() { if (!gate.paused) collect?.(); },
    setPaused(reason, value) { gate.set(reason,value); syncPause(); },
    destroy() {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      game.destroy(true);
    },
  };
}
