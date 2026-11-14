// Original procedural score: a quiet pentatonic phrase with scene-specific timbres.
// No recordings or third-party musical material are used.
const PENTATONIC = [0, 2, 4, 7, 9];
const PHRASE = [0, null, 2, 1, 4, null, 3, 2, 1, null, 0, 2, 3, 1, null, null];
const SCENES = {
  workshop: { root: 50, beat: .88, brightness: 1150, melody: .16, room: 'wood' },
  mine: { root: 43, beat: 1.12, brightness: 620, melody: .11, room: 'cave' },
  gallery: { root: 55, beat: 1.04, brightness: 1450, melody: .13, room: 'hall' },
};
const ALIASES = { mining: 'mine-hit', mine: 'mine-hit', carving: 'carve', polishing: 'polish', stamp: 'seal', click: 'button', complete: 'finish' };
const THROTTLE = { button: 65, 'mine-hit': 95, rough: 110, carve: 100, polish: 160, seal: 220, finish: 900, inspect: 180, paper: 150, reveal: 320, collect: 260 };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const volume = (value, fallback) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export function createAudioDirector() {
  let context, master, music, effects, noise;
  let unlocked = false, disposed = false, running = false, timer = null;
  let state = { active: false, paused: false, location: 'workshop', settings: {} };
  let beat = 0, nextBeat = 0, resumeTicket = 0;
  const voices = new Set();
  const lastEffect = new Map();
  const scene = () => SCENES[state.location] ?? SCENES.workshop;
  const canPlay = () => unlocked && !disposed && state.active && !state.paused && !document.hidden && !state.settings.muted;
  const musicLevel = () => volume(state.settings.musicVolume, .22);
  const effectLevel = () => volume(state.settings.sfxVolume, volume(state.settings.volume, .35));

  function createContext() {
    if (context) return true;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    try {
      context = new Audio();
      master = context.createGain(); music = context.createGain(); effects = context.createGain();
      master.gain.value = 0;
      music.connect(master); effects.connect(master); master.connect(context.destination);
      // A reusable soft noise buffer supplies rubbing, air and stone texture.
      noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noise.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) {
        smooth = (smooth + (Math.random() * 2 - 1) * .08) / 1.08;
        data[i] = smooth * 2.3;
      }
      return true;
    } catch { return false; }
  }

  function track(source, nodes, end) {
    const voice = { source, nodes };
    // Continuous pointer input must never accumulate an unbounded voice graph.
    if (voices.size >= 40) removeVoice(voices.values().next().value);
    voices.add(voice);
    source.onended = () => removeVoice(voice);
    source.stop(end);
  }
  function removeVoice(voice) {
    if (!voice || !voices.delete(voice)) return;
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* A scheduled voice may already have ended. */ }
    for (const node of voice.nodes) node.disconnect();
  }
  function envelope(gain, start, duration, level, attack = .01) {
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    gain.gain.setValueAtTime(0, start + duration + .01);
  }
  function tone(bus, frequency, start, duration, level, { type = 'sine', cutoff = 1300, attack = .012, endFrequency } = {}) {
    const source = context.createOscillator(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = .4;
    envelope(gain, start, duration, level, attack);
    source.connect(filter); filter.connect(gain); gain.connect(bus);
    source.start(start); track(source, [source, filter, gain], start + duration + .03);
  }
  function texture(bus, start, duration, level, frequency, type = 'lowpass') {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise; source.loop = true;
    filter.type = type; filter.frequency.value = frequency; filter.Q.value = .65;
    envelope(gain, start, duration, level, Math.min(.08, duration / 4));
    source.connect(filter); filter.connect(gain); gain.connect(bus);
    source.start(start, (beat % 5) * .21); track(source, [source, filter, gain], start + duration + .03);
  }
  function noteAt(index) { return scene().root + PENTATONIC[index % 5] + Math.floor(index / 5) * 12; }
  function scheduleBeat(start) {
    const score = scene();
    const phraseNote = PHRASE[beat % PHRASE.length];
    if (phraseNote !== null) {
      const pitch = hz(noteAt(phraseNote + (score.room === 'hall' ? 5 : 0)));
      tone(music, pitch, start, score.beat * 1.9, score.melody, { type: 'triangle', cutoff: score.brightness });
      tone(music, pitch * 2, start + .012, score.beat * .7, .022, { cutoff: score.brightness });
    }
    if (beat % 8 === 0) {
      tone(music, hz(score.root - 12), start, score.beat * 7.5, .075, { attack: .9, cutoff: 420 });
      tone(music, hz(score.root - 5), start + .13, score.beat * 6.7, .035, { attack: 1.2, cutoff: 520 });
      texture(music, start, score.beat * 6, score.room === 'cave' ? .045 : .017, score.room === 'wood' ? 280 : 470);
    }
    if (score.room === 'cave' && beat % 7 === 3) {
      tone(music, 520, start + .24, .36, .028, { endFrequency: 390 });
      tone(music, 520, start + .62, .32, .009, { endFrequency: 390 });
    }
    if (score.room === 'hall' && beat % 8 === 6) tone(music, hz(score.root + 19), start, 2.1, .025);
    beat++;
  }
  function schedule() {
    if (!running || !canPlay()) return;
    // A delayed timer resumes in the present; it never plays a backlog of notes.
    if (nextBeat < context.currentTime - .1) nextBeat = context.currentTime + .04;
    while (nextBeat < context.currentTime + .16) {
      if (musicLevel() > 0) scheduleBeat(nextBeat);
      else beat++;
      nextBeat += scene().beat;
    }
  }
  function applyLevels() {
    if (!context) return;
    const now = context.currentTime;
    for (const [gain, target] of [[music, musicLevel()], [effects, effectLevel()]]) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(target, now, .035);
    }
  }
  function stop() {
    resumeTicket++;
    running = false;
    clearInterval(timer); timer = null;
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0, context.currentTime);
    for (const voice of [...voices]) removeVoice(voice);
    if (context.state === 'running') void context.suspend().catch(() => {});
  }
  async function start() {
    if (!canPlay() || !createContext()) return;
    applyLevels();
    if (running) return;
    const ticket = ++resumeTicket;
    try { await context.resume(); } catch { return; }
    if (disposed || ticket !== resumeTicket || !canPlay()) return;
    running = true;
    nextBeat = context.currentTime + .06;
    master.gain.setTargetAtTime(.72, context.currentTime, .06);
    schedule();
    timer = setInterval(schedule, 80);
  }
  function unlock() {
    if (disposed) return;
    unlocked = true;
    if (!createContext()) return;
    // Calling resume from the gesture is needed even when a new game starts
    // later in the same event, after the capture-phase unlock listener.
    void context.resume().then(() => {
      if (canPlay()) void start();
      else if (!disposed) stop();
    }).catch(() => {});
  }
  function update(next = {}) {
    if (disposed) return;
    const oldLocation = state.location;
    state = { ...state, ...next, settings: { ...state.settings, ...next.settings } };
    if (state.location === 'museum') state.location = 'gallery';
    if (!canPlay()) { stop(); return; }
    if (oldLocation !== state.location) stop();
    void start();
  }
  function play(name = 'button') {
    name = ALIASES[name] ?? name;
    if (!THROTTLE[name] || !canPlay() || !context || context.state !== 'running' || effectLevel() === 0) return;
    const nowMs = performance.now();
    if (nowMs - (lastEffect.get(name) ?? -Infinity) < THROTTLE[name]) return;
    lastEffect.set(name, nowMs);
    const now = context.currentTime + .005;
    if (name === 'button') {
      tone(effects, 330, now, .08, .13, { endFrequency: 260 });
      texture(effects, now, .045, .07, 800);
    } else if (name === 'mine-hit') {
      tone(effects, 155, now, .19, .26, { type: 'triangle', endFrequency: 67, cutoff: 850 });
      texture(effects, now, .12, .36, 1400, 'bandpass');
      tone(effects, 580, now + .012, .12, .035);
    } else if (name === 'rough' || name === 'carve') {
      texture(effects, now, name === 'rough' ? .17 : .095, .21, name === 'rough' ? 680 : 1500, 'bandpass');
      tone(effects, name === 'rough' ? 215 : 440, now, .09, .09, { endFrequency: name === 'rough' ? 125 : 360 });
    } else if (name === 'polish') {
      texture(effects, now, .3, .22, 900, 'bandpass');
      tone(effects, 285, now, .22, .025, { endFrequency: 310 });
    } else if (name === 'seal') {
      tone(effects, 128, now, .19, .29, { endFrequency: 64, cutoff: 500 });
      texture(effects, now, .07, .2, 500);
      tone(effects, hz(62), now + .12, .65, .075);
    } else if (name === 'finish') {
      [0, 2, 4].forEach((step, i) => tone(effects, hz(55 + PENTATONIC[step]), now + i * .19, 1.2, .14, { type: 'triangle', cutoff: 1100 }));
    } else if (name === 'reveal') {
      [0, 7, 12].forEach((step, i) => tone(effects, hz(55 + step), now + i * .12, .8, .085));
    } else if (name === 'collect') {
      tone(effects, hz(57), now, .2, .13, { type: 'triangle', cutoff: 850 });
      tone(effects, hz(62), now + .1, .43, .1, { type: 'triangle', cutoff: 1100 });
    } else if (name === 'paper') texture(effects, now, .2, .16, 1200, 'bandpass');
    else tone(effects, hz(62), now, .46, .1, { type: 'triangle', cutoff: 900 });
  }
  const onSound = event => play(event.detail?.name);
  const onVisibility = () => document.hidden ? stop() : void start();
  const onGesture = () => { if (!unlocked || context?.state === 'suspended') unlock(); };
  window.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
  window.addEventListener('keydown', onGesture, { capture: true });
  window.addEventListener('jade:sound', onSound);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    update, play, unlock,
    getStatus: () => ({ unlocked, running, location: state.location, voices: voices.size, context: context?.state ?? 'uninitialized', musicVolume: musicLevel(), sfxVolume: effectLevel() }),
    dispose() {
      if (disposed) return;
      disposed = true; stop();
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      window.removeEventListener('jade:sound', onSound);
      document.removeEventListener('visibilitychange', onVisibility);
      if (context) { music.disconnect(); effects.disconnect(); master.disconnect(); void context.close().catch(() => {}); }
    },
  };
}
