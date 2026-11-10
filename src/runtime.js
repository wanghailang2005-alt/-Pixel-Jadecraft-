import Phaser from 'phaser';
import workshopUrl from './assets/workshop-v2.png';
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
    current = next;
    game.scene.start(next);
  }
  class BootScene extends Phaser.Scene {
    constructor() { super('boot'); }
    preload() {
      this.add.text(480, 260, '正在点亮玉作工坊…', { fontFamily: 'Microsoft YaHei', fontSize: '20px', color: '#d6c294' }).setOrigin(.5);
      this.load.image('workshop', workshopUrl);
    }
    create() { ready = true; sync(); this.scene.stop('boot'); }
  }
  const sceneClass = key => class extends Phaser.Scene {
    constructor() { super(key); }
    create() {
      if ((key === 'workshop' || key === 'menu') && this.textures.exists('workshop')) {
        this.add.image(480,270,'workshop').setDisplaySize(960,540);
        if (key === 'menu') this.add.rectangle(480,270,960,540,0x10221f,.24);
        else {
          // Separate foreground actor; furniture and future tools stay independently interactive.
          const actor = this.add.graphics();
          const colors = { h:0x352a28, s:0xd4b58d, j:0x527a62, b:0xb8b391, p:0x253c38 };
          const rows = ['   hhhh   ','  hhhhhh  ',' hhhhhhhh ','  hssssh  ','  spssps  ','   ssss   ','  jjbjjj  ',' sjjbjjjs ',' sjjbjjjs ','  jjjjjj  ','   pp pp  ','   pp pp  '];
          rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(colors[c]){actor.fillStyle(colors[c]);actor.fillRect(447+x*4,231+y*4,4,4);}}));
          actor.setDepth(2);
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
