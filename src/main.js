import './style.css';
import { GameStore, MATERIALS, tasks } from './state.js';
import { createInterface } from './ui.js';
import { createRuntime } from './runtime.js';
import { createPolishingDemo } from './polishing-view.js';

const store = new GameStore();
let runtime;
let polishing;
let polishingSession = null;
let polishingSource = null;
const ui = createInterface(store, MATERIALS, tasks, {
  onOverlayChange: open => {
    runtime?.setPaused('overlay', open);
    polishing?.setPaused('overlay', open);
  },
  onPolish: () => {
    const workshop = store.active && store.state.location === 'workshop';
    const source = workshop ? `workshop-${store.sessionRevision}` : 'menu';
    if (source !== polishingSource) polishing.reset();
    polishingSource = source;
    polishingSession = { revision: store.sessionRevision, workshop };
    polishing.open();
  },
});
runtime = createRuntime(store);
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
