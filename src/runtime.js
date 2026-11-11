import Phaser from 'phaser';
import workshopUrl from './assets/workshop-isometric-v1.png';
import menuUrl from './assets/menu-mountains-v1.png';
import masterUrl from './assets/master-carver-v1.png';
import { decorateMenuScene } from './menu-art.js';
import { drawScene } from './scenery.js';
import { PauseGate } from './pause.js';

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
    if (next === current) { syncPause(); return; }
    if (current) game.scene.stop(current);
    game.scale.resize(next === 'workshop' ? 1024 : 960, next === 'workshop' ? 559 : 540);
    current = next;
    game.scene.start(next);
  }
  class BootScene extends Phaser.Scene {
    constructor() { super('boot'); }
    preload() {
      this.add.text(480, 260, '正在点亮玉作工坊…', { fontFamily: 'Microsoft YaHei', fontSize: '20px', color: '#d6c294' }).setOrigin(.5);
      this.load.image('workshop', workshopUrl);
      this.load.image('menu-landscape', menuUrl);
      this.load.image('master-carver', masterUrl);
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
        this.add.image(350, 254, 'master-carver').setDisplaySize(112, 104).setDepth(2);
        const tool = this.add.graphics().setDepth(3);
        tool.lineStyle(2, 0xb9c1b0); tool.lineBetween(360, 286, 355, 302);
        const glow = this.add.graphics().setDepth(1);
        glow.fillStyle(0xffb347, 0.12);
        for (const [x, y] of [[254, 150], [105, 218], [477, 150], [635, 218]]) glow.fillCircle(x, y, 22);
        const sparkles = this.add.graphics().setDepth(3);
        sparkles.fillStyle(0xe5f2c4, 0.9);
        for (const [x, y] of [[330, 291], [367, 294], [380, 313], [343, 324]]) {
          sparkles.fillRect(x - 3, y, 7, 1); sparkles.fillRect(x, y - 3, 1, 7);
        }
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          let bright = true;
          this.time.addEvent({ delay: 650, loop: true, callback: () => {
            bright = !bright;
            glow.setAlpha(bright ? 1 : 0.75);
            sparkles.setVisible(bright);
          } });
        }
      } else drawScene(this.add.graphics(), key);
      document.querySelector('#game').dataset.scene = key;
      this.events.once('create', syncPause);
    }
  };
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'canvas', width:960, height:540,
    backgroundColor:'#142623', pixelArt:true,
    scale:{ mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH },
    scene:[BootScene, ...['menu','workshop','mine','gallery'].map(sceneClass)],
  });
  const onVisibility = () => { gate.set('hidden', document.hidden); syncPause(); };
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  return {
    sync,
    setPaused(reason, value) { gate.set(reason,value); syncPause(); },
    destroy() { document.removeEventListener('visibilitychange',onVisibility); game.destroy(true); },
  };
}
