import './style.css';
import { GameStore, MATERIALS, tasks } from './state.js';
import { createInterface } from './ui.js';
import { createRuntime } from './runtime.js';
import { createPolishingDemo } from './polishing-view.js';
import './typography.css';
import './atmosphere.css';
import { createAudioDirector } from './audio.js';

await document.fonts.load('12px "Fusion Pixel"').catch(() => []);

const store = new GameStore();
const audio = createAudioDirector();
let audioPaused = false;
const syncAudio=()=>audio.update({active:store.active,location:store.state.location,settings:store.state.settings,paused:audioPaused});
let runtime;
let polishing;
let polishingSession = null;
let polishingSource = null;
const ui = createInterface(store, MATERIALS, tasks, {
  onSound: name => audio.play(name),
  onPauseAudio: paused => { audioPaused=paused;syncAudio(); },
  onOverlayChange: open => {
    runtime?.setPaused('overlay', open);
    polishing?.setPaused('overlay', open);
  },
  onMine: () => runtime?.collect(),
  onPolish: () => {
    const workshop = store.active && store.state.location === 'workshop';
    const source = workshop ? `workshop-${store.sessionRevision}` : 'menu';
    if (source !== polishingSource) polishing.reset();
    polishingSource = source;
    polishingSession = { revision: store.sessionRevision, workshop };
    polishing.open();
  },
});
runtime = createRuntime(store, { notify: ui.notify, hit: ui.playMiningHit });
polishing = createPolishingDemo({
  onOpenChange: open => {
    runtime.setPaused('polishing', open);
    ui.setWorkshopPaused('polishing', open);
    if (!open) polishingSession = null;
  },
  onSettings: () => ui.openSettings(),
  onFinish: () => {
    if (polishingSession?.workshop && polishingSession.revision === store.sessionRevision) store.completeOpeningPolish();
  },
});
let sessionRevision = store.sessionRevision;
store.addEventListener('change', () => {
  syncAudio();
  if (sessionRevision !== store.sessionRevision) {
    polishing.close();
    polishing.reset();
    polishingSource = null;
    sessionRevision = store.sessionRevision;
  }
  runtime.sync();
  ui.render();
});
window.addEventListener('beforeunload', event => {
  if (store.dirty) { event.preventDefault(); event.returnValue = ''; }
});
ui.render();
syncAudio();
