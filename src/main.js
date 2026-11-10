import './style.css';
import { GameStore, MATERIALS, tasks } from './state.js';
import { createInterface } from './ui.js';
import { createRuntime } from './runtime.js';

const store = new GameStore();
let runtime;
const ui = createInterface(store, MATERIALS, tasks, {
  onOverlayChange: open => runtime?.setPaused('overlay', open),
});
runtime = createRuntime(store);
store.addEventListener('change', () => { runtime.sync(); ui.render(); });
window.addEventListener('beforeunload', event => {
  if (store.dirty) { event.preventDefault(); event.returnValue = ''; }
});
ui.render();
