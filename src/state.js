import { INSPECTION_QUESTIONS } from './inspection.js';
import { createDraft, validateDraft, stageMetrics, advanceStage, createFinishedPiece, reopenCarving } from './craft-model.js';
import { MUSEUM_EXHIBITS } from './museum-content.js';
import { freshStory, validateStory, LETTER_CLUES, brushHeirloom, makeDelivery } from './story.js';

export const SAVE_KEY = 'pixel-jadecraft.save.v1';
export const BACKUP_KEY = 'pixel-jadecraft.backup.v1';
export const PREV_BACKUP_KEY = 'pixel-jadecraft.backup.prev.v1';
export const SETTINGS_KEY = 'pixel-jadecraft.settings.v1';
export const MATERIALS = Object.freeze({
  nephrite: { name: '和田玉原石', color: '#b7d8ac' },
  jadeite: { name: '翡翠原石', color: '#53ab88' },
});
const LOCATIONS = ['workshop', 'mine', 'gallery'];
const SHAPES = ['bi', 'fish', 'seal'];
const PATTERNS = ['cloud', 'dragon', 'grain'];
const PIECE_COLORS = ['natural', 'celadon', 'emerald'];
const clone = value => structuredClone(value);
function validBlessing(value) {
  return typeof value === 'string' && !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
    && [...value.trim()].length <= 24;
}
function validCraftingCoverage(progress, coverage) {
  return typeof coverage === 'string'
    && (coverage === '' ? progress === 0 : /^[A-Za-z0-9+/]{9600}$/.test(coverage));
}
export function freshState() {
  return {
    version: 1, location: 'workshop', stamina: 100,
    inventory: [], pieces: [], discoveries: [], observations: 0, inspectionAnswers: [],
    exhibits: [null, null, null], crafting: null,
    opening: { introduced: false, polished: false },
    mineVeins: Array.from({ length: 6 }, () => [false, false]),
    mineClusters: Array(6).fill(false),
    settings: { muted: false, volume: 0.35, musicVolume: 0.22, sfxVolume: 0.35 }, updatedAt: null,
    museum: { observations: {}, inspirations: [], theme: 'craft', lighting: 'warm' },
    pendingDrops: [],
    mineSurvey: [], story: freshStory(),
  };
}
/** Validate all persisted fields before replacing either memory or disk. */
export function validateState(value) {
  const fail = () => { throw new Error('存档格式不完整或版本不兼容，请选择有效的备份。'); };
  if (!value || value.version !== 1 || !LOCATIONS.includes(value.location)) fail();
  if (!Number.isInteger(value.stamina) || value.stamina < 0 || value.stamina > 100) fail();
  if (!Array.isArray(value.inventory) || value.inventory.length > 12) fail();
  const ids = new Set();
  for (const item of value.inventory) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || !Object.hasOwn(MATERIALS, item.material)) fail();
    ids.add(item.id);
  }
  if (!Array.isArray(value.pieces) || value.pieces.length > 1000) fail();
  for (const piece of value.pieces) {
    if (!piece || typeof piece.id !== 'string' || !piece.id || ids.has(piece.id) || !SHAPES.includes(piece.shape) || !Object.hasOwn(MATERIALS, piece.material)) fail();
    if (Object.hasOwn(piece, 'pattern') && !PATTERNS.includes(piece.pattern)) fail();
    if (Object.hasOwn(piece, 'color') && !PIECE_COLORS.includes(piece.color)) fail();
    if (Object.hasOwn(piece, 'blessing') && !validBlessing(piece.blessing)) fail();
    if (piece.artisan) {
      const draft = validateDraft(piece.artisan);
      if (!draft.completed || draft.material.id !== piece.id || draft.material.material !== piece.material || draft.shape !== piece.shape) fail();
    }
    ids.add(piece.id);
  }
  if (!Array.isArray(value.discoveries) || value.discoveries.some(id => !['bi', 'cong', 'huang', 'dragon', 'fish', 'seal'].includes(id)) || new Set(value.discoveries).size !== value.discoveries.length) fail();
  if (!Number.isInteger(value.observations) || value.observations < 0) fail();
  const inspectionAnswers = Object.hasOwn(value, 'inspectionAnswers') ? value.inspectionAnswers : [];
  if (!Array.isArray(inspectionAnswers) || new Set(inspectionAnswers).size !== inspectionAnswers.length
    || Array.from(inspectionAnswers).some(id => !INSPECTION_QUESTIONS.some(question => question.id === id))) fail();
  if (!Array.isArray(value.exhibits) || value.exhibits.length !== 3) fail();
  const occupied = value.exhibits.filter(id => id !== null);
  if (new Set(occupied).size !== occupied.length || occupied.some(id => !value.pieces.some(p => p.id === id))) fail();
  if (value.crafting !== null) {
    const crafting = value.crafting;
    if (!crafting || typeof crafting !== 'object' || Array.isArray(crafting)) fail();
    if (!['shape', 'carve', 'polish'].includes(crafting.step)) fail();
    if (!Number.isInteger(crafting.progress) || crafting.progress < 0 || crafting.progress > 100) fail();
    if (typeof crafting.materialId !== 'string' || !crafting.materialId.trim()) fail();
    if (typeof crafting.tool !== 'string') fail();
    const hasReservedMaterial = ['material', 'shape', 'coverage'].some(key => Object.hasOwn(crafting, key));
    if (hasReservedMaterial && (!Object.hasOwn(MATERIALS, crafting.material) || !SHAPES.includes(crafting.shape)
      || (!crafting.artisan && !validCraftingCoverage(crafting.progress, crafting.coverage)) || ids.has(crafting.materialId))) fail();
    if (crafting.artisan) {
      const draft = validateDraft(crafting.artisan);
      if (draft.completed || draft.material.id !== crafting.materialId || draft.material.material !== crafting.material || draft.shape !== crafting.shape || draft.stage !== crafting.step) fail();
      if (crafting.originalPiece) {
        const original = crafting.originalPiece;
        if (original.id !== crafting.materialId || original.material !== crafting.material || !SHAPES.includes(original.shape)) fail();
        if (Object.hasOwn(original,'pattern') && !PATTERNS.includes(original.pattern)
          || Object.hasOwn(original,'color') && !PIECE_COLORS.includes(original.color)
          || Object.hasOwn(original,'blessing') && !validBlessing(original.blessing)) fail();
        if (original.artisan) {
          const prior = validateDraft(original.artisan);
          if (!prior.completed || prior.material.id !== original.id || prior.material.material !== original.material || prior.shape !== original.shape) fail();
        }
        if (!Array.isArray(crafting.originalSlots) || new Set(crafting.originalSlots).size !== crafting.originalSlots.length
          || crafting.originalSlots.length > 1 || crafting.originalSlots.some(slot => !Number.isInteger(slot) || slot < 0 || slot > 2)) fail();
      }
    }
  }
  if (!value.settings || typeof value.settings.muted !== 'boolean' || !Number.isFinite(value.settings.volume) || value.settings.volume < 0 || value.settings.volume > 1) fail();
  const settings = { ...value.settings, musicVolume: value.settings.musicVolume ?? .22, sfxVolume: value.settings.sfxVolume ?? value.settings.volume };
  for (const key of ['musicVolume','sfxVolume']) if (!Number.isFinite(settings[key]) || settings[key] < 0 || settings[key] > 1) fail();
  const mineSurvey = value.mineSurvey ?? [];
  if (!Array.isArray(mineSurvey) || new Set(mineSurvey).size !== mineSurvey.length || mineSurvey.some(id => !/^C[1-6]$/.test(id))) fail();
  const story = validateStory(value.story);
  if (value.updatedAt !== null && (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)))) fail();
  const opening = Object.hasOwn(value, 'opening') ? value.opening : { introduced: true, polished: false };
  if (!opening || typeof opening.introduced !== 'boolean' || typeof opening.polished !== 'boolean' || (opening.polished && !opening.introduced)) fail();
  const hasVeins = Object.hasOwn(value, 'mineVeins');
  const hasClusters = Object.hasOwn(value, 'mineClusters');
  if (hasClusters && (!Array.isArray(value.mineClusters) || value.mineClusters.length !== 6
    || Array.from(value.mineClusters).some(flag => typeof flag !== 'boolean'))) fail();
  if (hasVeins && (!Array.isArray(value.mineVeins) || value.mineVeins.length !== 6
    || Array.from(value.mineVeins).some(pair => !Array.isArray(pair) || pair.length !== 2
      || Array.from(pair).some(flag => typeof flag !== 'boolean')))) fail();
  const mineVeins = hasVeins ? value.mineVeins : Array.from({ length: 6 }, (_, index) => {
    const consumed = hasClusters ? value.mineClusters[index] : false;
    return [consumed, consumed];
  });
  const mineClusters = mineVeins.map(pair => pair.every(Boolean));
  if (hasClusters && value.mineClusters.some((flag, index) => flag !== mineClusters[index])) fail();
  const state = freshState();
  const museum = value.museum ?? freshState().museum;
  if (!museum || typeof museum.observations !== 'object' || !museum.observations || Array.isArray(museum.observations)
    || !Array.isArray(museum.inspirations) || new Set(museum.inspirations).size !== museum.inspirations.length
    || !['craft','nature','journey'].includes(museum.theme) || !['warm','side','moon'].includes(museum.lighting)) fail();
  for (const [id, clues] of Object.entries(museum.observations)) {
    const exhibit = MUSEUM_EXHIBITS.find(item => item.id === id);
    if (!exhibit || !Array.isArray(clues) || new Set(clues).size !== clues.length || clues.some(index => !Number.isInteger(index) || index < 0 || index >= exhibit.lookFor.length)) fail();
  }
  if (museum.inspirations.some(id => !MUSEUM_EXHIBITS.some(item => item.id === id) || !museum.observations[id]?.length)) fail();
  const pendingDrops = value.pendingDrops ?? [];
  if (!Array.isArray(pendingDrops) || pendingDrops.length > 12) fail();
  const dropIds = new Set();
  for (const drop of pendingDrops) {
    if (!/^C[1-6]-[LR]$/.test(drop.id) || dropIds.has(drop.id) || ids.has(drop.id) || value.crafting?.materialId === drop.id
      || !Object.hasOwn(MATERIALS, drop.material) || !Number.isFinite(drop.x) || !Number.isFinite(drop.y)
      || drop.x < 0 || drop.x > 1920 || drop.y < 0 || drop.y > 1024) fail();
    dropIds.add(drop.id);
  }
  const normalized = { ...value, opening, mineVeins, mineClusters, inspectionAnswers, museum, pendingDrops, settings, mineSurvey, story };
  for (const key of Object.keys(state)) state[key] = clone(normalized[key]);
  return state;
}
export function tasks(state) {
  return [
    { name: '寻一块玉', detail: '前往矿洞，采集第一块原石', done: state.inventory.length > 0 || state.pieces.length > 0 },
    { name: '识玉之美', detail: '完成三次鉴赏答题，或在玉文化馆发现三处细节', done: state.observations >= 3 || Object.values(state.museum?.observations ?? {}).flat().length >= 3 },
    { name: '琢玉成器', detail: '制作玉璧、玉鱼佩与玉印', done: SHAPES.every(shape => state.pieces.some(p => p.shape === shape)) },
    { name: '首展之约', detail: '在三个展位陈列三种不同器型', done: new Set(state.exhibits.map(id => state.pieces.find(p => p.id === id)?.shape).filter(Boolean)).size === 3 },
  ];
}
export class GameStore extends EventTarget {
  constructor(storage) {
    super();
    try { this.storage = storage ?? globalThis.localStorage; } catch { this.storage = null; }
    this.state = freshState(); this.active = false; this.error = ''; this.hasSave = false;
    this.hasSession = false;
    this.sessionRevision = 0;
    this.dirty = false;
    this.read();
    try {
      const settings = JSON.parse(this.storage?.getItem(SETTINGS_KEY) ?? 'null');
      if (settings) this.state = validateState({ ...this.state, settings });
    } catch { /* An invalid preference must not prevent save recovery. */ }
  }
  read() {
    try {
      if (!this.storage) throw new Error('unavailable');
      const raw = this.storage.getItem(SAVE_KEY);
      this.hasSave = raw !== null;
      if (raw !== null) { this.state = validateState(JSON.parse(raw)); this.hasSession = true; }
    } catch { this.error = '无法读取本地存档。原数据未被覆盖；可导出原数据备份，或导入有效备份。'; }
  }
  notify() { this.dispatchEvent(new Event('change')); }
  checkpoint() {
    const previous = this.storage.getItem(SAVE_KEY);
    if (previous === null) return;
    try { validateState(JSON.parse(previous)); } catch { return; }
    const backup = this.storage.getItem(BACKUP_KEY);
    if (backup !== null) this.storage.setItem(PREV_BACKUP_KEY, backup);
    this.storage.setItem(BACKUP_KEY, previous);
  }
  recovery(key = BACKUP_KEY) {
    try { return validateState(JSON.parse(this.storage?.getItem(key) ?? 'null')); }
    catch { return null; }
  }
  recover(key = BACKUP_KEY) {
    const backup = this.recovery(key);
    if (!backup) throw new Error('没有可恢复的有效备份。');
    this.importSave(JSON.stringify(backup));
  }
  retrySave() {
    if (!this.hasSession) return false;
    const result = this.save(); this.notify(); return result;
  }
  save() {
    const previousTime = this.state.updatedAt;
    this.state.updatedAt = new Date().toISOString();
    try {
      if (!this.storage) throw new Error('unavailable');
      this.checkpoint();
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.state));
      this.hasSave = true; this.dirty = false; this.error = ''; return true;
    } catch {
      this.state.updatedAt = previousTime;
      this.dirty = true;
      this.error = '保存失败，进度暂留在本次游戏。请导出备份，并检查浏览器存储空间或权限。';
      return false;
    }
  }
  startNew() {
    const settings = clone(this.state.settings);
    this.state = freshState(); this.state.settings = settings;
    this.sessionRevision++;
    this.active = true; this.hasSession = true; this.save(); this.notify();
  }
  resume() {
    if (this.hasSession && !this.active) {
      this.sessionRevision++;
      this.active = true;
      this.notify();
    }
  }
  acknowledgeOpening() {
    if (!this.active || this.state.location !== 'workshop' || this.state.opening.introduced) return false;
    this.state.opening.introduced = true;
    this.save(); this.notify(); return true;
  }
  completeOpeningPolish() {
    if (!this.active || this.state.location !== 'workshop' || !this.state.opening.introduced || this.state.opening.polished) return false;
    this.state.opening.polished = true;
    this.save(); this.notify(); return true;
  }
  answerInspection(questionId, choiceIndex) {
    const question = INSPECTION_QUESTIONS.find(entry => entry.id === questionId);
    if (!this.active || this.state.location !== 'workshop' || !this.state.inventory.length
      || !question || !Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= question.choices.length) {
      return { correct: false, alreadyAnswered: false };
    }
    const correct = choiceIndex === question.answer;
    const alreadyAnswered = this.state.inspectionAnswers.includes(questionId);
    if (!correct || alreadyAnswered) return { correct, alreadyAnswered };
    const next = clone(this.state);
    next.inspectionAnswers.push(questionId);
    next.observations += 1;
    this.state = validateState(next);
    this.save(); this.notify();
    return { correct: true, alreadyAnswered: false };
  }
  startCrafting(materialId, shape = 'bi', options = null) {
    const material = this.state.inventory.find(item => item.id === materialId);
    if (!this.active || this.state.location !== 'workshop' || this.state.crafting || !material || !SHAPES.includes(shape)) return false;
    const next = clone(this.state);
    next.inventory = next.inventory.filter(item => item.id !== materialId);
    next.crafting = {
      materialId, material: material.material, shape,
      step: 'shape', progress: 0, tool: 'chisel', coverage: '',
    };
    if (options?.artisan) {
      next.crafting.artisan = createDraft(material, shape, options.layout ?? {}, { pattern: options.pattern ?? 'cloud', finish: options.finish ?? 'contrast', sealCut: options.sealCut, ...(options.motifs === undefined ? {} : { motifs: options.motifs }) });
      if (options.inspirationId && next.museum.inspirations.includes(options.inspirationId)) next.crafting.inspirationId = options.inspirationId;
    }
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  updateCrafting(progress, coverage) {
    const crafting = this.state.crafting;
    if (!this.active || this.state.location !== 'workshop' || !crafting?.material
      || !Number.isInteger(progress) || progress < 0 || progress > 100
      || !validCraftingCoverage(progress, coverage)) return false;
    if (crafting.progress === progress && crafting.coverage === coverage) return true;
    const next = clone(this.state);
    next.crafting.progress = progress;
    next.crafting.coverage = coverage;
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  advanceCrafting() {
    const crafting = this.state.crafting;
    if (crafting?.artisan) {
      if (!this.active || this.state.location !== 'workshop' || !stageMetrics(crafting.artisan).ready) return false;
      if (crafting.step === 'polish' && this.state.pieces.length >= 1000) return false;
      const next = clone(this.state);
      advanceStage(next.crafting.artisan);
      if (next.crafting.artisan.completed) {
        next.pieces.push({ id: crafting.materialId, material: crafting.material, shape: crafting.shape,
          pattern: crafting.artisan.pattern, color: 'natural', blessing: crafting.originalPiece?.blessing ?? '',
          artisan: createFinishedPiece(next.crafting.artisan), inspirationId: crafting.inspirationId ?? null });
        if (!next.discoveries.includes(crafting.shape)) next.discoveries.push(crafting.shape);
        next.crafting = null;
      } else {
        next.crafting.step = next.crafting.artisan.stage;
        next.crafting.progress = 0;
      }
      this.state = validateState(next); this.save(); this.notify(); return true;
    }
    if (!this.active || this.state.location !== 'workshop' || !crafting?.material || crafting.progress < 75) return false;
    const next = clone(this.state);
    if (crafting.step === 'polish') {
      if (next.pieces.length >= 1000) return false;
      next.pieces.push({ id: crafting.materialId, material: crafting.material, shape: crafting.shape });
      if (!next.discoveries.includes(crafting.shape)) next.discoveries.push(crafting.shape);
      next.crafting = null;
    } else {
      next.crafting.step = crafting.step === 'shape' ? 'carve' : 'polish';
      next.crafting.tool = next.crafting.step === 'polish' ? 'cloth' : 'chisel';
      next.crafting.progress = 0;
      next.crafting.coverage = '';
    }
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  cancelCrafting() {
    const crafting = this.state.crafting;
    if (!this.active || this.state.location !== 'workshop' || !crafting?.material || (!crafting.originalPiece && this.state.inventory.length >= 12)) return false;
    const next = clone(this.state);
    if (crafting.originalPiece) {
      next.pieces.push(clone(crafting.originalPiece));
      for (const slot of crafting.originalSlots) if (!next.exhibits[slot]) next.exhibits[slot] = crafting.materialId;
    } else next.inventory.push({ id: crafting.materialId, material: crafting.material });
    next.crafting = null;
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  updateArtisan(value) {
    const current = this.state.crafting;
    if (!this.active || this.state.location !== 'workshop' || !current?.artisan) return false;
    let draft;
    try { draft = validateDraft(value); } catch { return false; }
    if (draft.completed || draft.material.id !== current.materialId || draft.material.material !== current.material || draft.shape !== current.shape || draft.stage !== current.step) return false;
    const next = clone(this.state);
    next.crafting.artisan = draft;
    next.crafting.progress = Math.round(stageMetrics(draft).progress);
    this.state = validateState(next); this.save(); this.notify(); return true;
  }
  reopenArtisanCarving() {
    if (!this.active || this.state.location !== 'workshop' || !this.state.crafting?.artisan) return false;
    const next = clone(this.state);
    if (!reopenCarving(next.crafting.artisan)) return false;
    next.crafting.step = 'carve';
    next.crafting.progress = Math.round(stageMetrics(next.crafting.artisan).progress);
    this.state = validateState(next); this.save(); this.notify(); return true;
  }
  observeMineCluster(id) {
    if (!this.active || this.state.location !== 'mine' || !/^C[1-6]$/.test(id)) return false;
    if (this.state.mineSurvey.includes(id)) return true;
    const next=clone(this.state); next.mineSurvey.push(id);
    this.state=validateState(next); this.save(); this.notify(); return true;
  }
  updateStory(change) {
    if (!this.active || this.state.location !== 'workshop') return false;
    const next=clone(this.state);
    if (!change(next.story)) return false;
    this.state=validateState(next); this.save(); this.notify(); return true;
  }
  observeLetter(id) {
    if (!LETTER_CLUES.some(c=>c.id===id)) return false;
    return this.updateStory(s=>{if(s.clues.includes(id))return false;s.clues.push(id);return true;});
  }
  chooseLetterRoute(route) {
    if (!['preserve','companion'].includes(route)) return false;
    return this.updateStory(s=>{if(s.delivery||s.clues.length!==3)return false;s.route=route;return true;});
  }
  careForHeirloom(from,to) { return this.updateStory(s=>brushHeirloom(s,from,to)); }
  tieHeirloomCord() { return this.updateStory(s=>{if(s.delivery||s.route!=='preserve'||s.cord)return false;s.cord=true;return true;}); }
  deliverLetter(pieceId=null) {
    const piece=this.state.pieces.find(p=>p.id===pieceId);
    return this.updateStory(s=>{const delivery=makeDelivery(s,piece);if(!delivery)return false;s.delivery=delivery;return true;});
  }
  receiveLetterReturn() { return this.updateStory(s=>{if(!s.delivery||s.returned)return false;s.returned=true;return true;}); }
  curateStory(order,caption) {
    if (!this.active || this.state.location !== 'gallery') return false;
    const next=clone(this.state);
    try { next.story=validateStory({...next.story,order,caption}); } catch { return false; }
    this.state=validateState(next);this.save();this.notify();return true;
  }
  reworkPiece(id, shape = null) {
    if (!this.active || this.state.location !== 'workshop' || this.state.crafting) return false;
    const piece = this.state.pieces.find(item => item.id === id);
    if (!piece || !SHAPES.includes(shape ?? piece.shape)) return false;
    const next = clone(this.state);
    next.pieces = next.pieces.filter(item => item.id !== id);
    const slots = next.exhibits.flatMap((value, index) => value === id ? [index] : []);
    next.exhibits = next.exhibits.map(value => value === id ? null : value);
    next.crafting = { materialId:id, material:piece.material, shape:shape ?? piece.shape, step:'shape', progress:0, tool:'rough', coverage:'',
      artisan:createDraft(piece.artisan?.material ?? {id,material:piece.material},shape ?? piece.shape,shape && shape!==piece.shape?{}:piece.artisan?.layout??{}, {pattern:piece.pattern ?? 'cloud',finish:piece.artisan?.finish??'contrast',sealCut:piece.artisan?.sealCut,...((!shape||shape===piece.shape)&&piece.artisan?.motifs?{motifs:piece.artisan.motifs}:{})}), inspirationId:piece.inspirationId ?? null, originalPiece:clone(piece),originalSlots:slots };
    this.state=validateState(next); this.save(); this.notify(); return true;
  }
  recordMuseumObservation(id, index) {
    const exhibit = MUSEUM_EXHIBITS.find(item => item.id === id);
    if (!this.active || !exhibit || !Number.isInteger(index) || index < 0 || index >= exhibit.lookFor.length) return false;
    if (this.state.museum.observations[id]?.includes(index)) return true;
    const next = clone(this.state);
    (next.museum.observations[id] ??= []).push(index);
    this.state = validateState(next); this.save(); this.notify(); return true;
  }
  collectInspiration(id) {
    const exhibit = MUSEUM_EXHIBITS.find(item => item.id === id);
    if (!this.active || !exhibit || !this.state.museum.observations[id]?.length) return false;
    if (this.state.museum.inspirations.includes(id)) return true;
    const next = clone(this.state); next.museum.inspirations.push(id);
    if (['cong','huang','dragon'].includes(exhibit.shape) && !next.discoveries.includes(exhibit.shape)) next.discoveries.push(exhibit.shape);
    this.state = validateState(next); this.save(); this.notify(); return true;
  }
  configureExhibition(theme, lighting) {
    if (!this.active || !['craft','nature','journey'].includes(theme) || !['warm','side','moon'].includes(lighting)) return false;
    const next=clone(this.state); Object.assign(next.museum,{theme,lighting});
    this.state=validateState(next); this.save(); this.notify(); return true;
  }
  clearLegacyCrafting() {
    const crafting = this.state.crafting;
    if (!this.active || this.state.location !== 'workshop' || !crafting || Object.hasOwn(crafting, 'material')) return false;
    const next = clone(this.state);
    next.crafting = null;
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  customizePiece(id, customization) {
    if (!this.active || this.state.location !== 'workshop' || !customization
      || typeof customization !== 'object' || Array.isArray(customization)) return false;
    const piece = this.state.pieces.find(item => item.id === id);
    const { pattern, color, blessing } = customization;
    if (piece?.artisan && (pattern !== piece.artisan.pattern || color !== (piece.color ?? 'natural'))) return false;
    if (!piece || !PATTERNS.includes(pattern) || !PIECE_COLORS.includes(color) || !validBlessing(blessing)) return false;
    const trimmedBlessing = blessing.trim();
    if (piece.pattern === pattern && piece.color === color && piece.blessing === trimmedBlessing) return true;
    const next = clone(this.state);
    Object.assign(next.pieces.find(item => item.id === id), { pattern, color, blessing: trimmedBlessing });
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  placeExhibit(slotIndex, pieceIdOrNull) {
    if (!this.active || this.state.location !== 'gallery' || !Number.isInteger(slotIndex)
      || slotIndex < 0 || slotIndex > 2
      || (pieceIdOrNull !== null && !this.state.pieces.some(piece => piece.id === pieceIdOrNull))) return false;
    if (this.state.exhibits[slotIndex] === pieceIdOrNull) return true;
    const next = clone(this.state);
    if (pieceIdOrNull !== null) {
      next.exhibits = next.exhibits.map(id => id === pieceIdOrNull ? null : id);
    }
    next.exhibits[slotIndex] = pieceIdOrNull;
    this.state = validateState(next);
    this.save(); this.notify();
    return true;
  }
  navigate(location) {
    if (!this.active || !LOCATIONS.includes(location)) return;
    this.state.location = location;
    if (location === 'workshop') this.state.stamina = 100;
    this.save(); this.notify();
  }
  menu() { this.active = false; this.notify(); }
  configure(settings) {
    this.state = validateState({ ...this.state, settings });
    try { this.storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch { this.error ||= '声音设置未能保存，请检查浏览器存储权限。'; }
    if (this.hasSession) this.save();
    this.notify();
  }
  /** Permanent source consumption is saved even when its drop cannot be picked up. */
  consumeMineVein(id, drop = null) {
    const match = /^C([1-6])-(L|R)$/.exec(id);
    if (!this.active || this.state.location !== 'mine' || !match) return false;
    const cluster = Number(match[1]) - 1;
    const side = match[2] === 'L' ? 0 : 1;
    if (this.state.mineVeins[cluster][side]) return false;
    const next = clone(this.state);
    next.mineVeins[cluster][side] = true;
    next.mineClusters[cluster] = next.mineVeins[cluster].every(Boolean);
    if(drop) next.pendingDrops.push({id,material:drop.material,x:drop.x,y:drop.y});
    this.state = validateState(next);
    this.save(); this.notify(); return true;
  }
  /** Shared inventory settlement; a failed disk write keeps a visible dirty session. */
  addMaterial(material, id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`) {
    if (!this.active || !Object.hasOwn(MATERIALS, material) || this.state.inventory.length >= 12
      || this.state.inventory.some(i => i.id === id) || this.state.pieces.some(i => i.id === id)
      || this.state.crafting?.materialId === id) return false;
    const next = clone(this.state); next.inventory.push({ id, material });
    next.pendingDrops=next.pendingDrops.filter(drop=>drop.id!==id);
    this.state = validateState(next); this.save(); this.notify(); return true;
  }
  exportSave() { return JSON.stringify(this.state); }
  exportOriginal() { return this.storage?.getItem(SAVE_KEY) ?? this.exportSave(); }
  importSave(raw) {
    if (raw.length > 2_000_000) throw new Error('备份文件过大，请选择小于 2 MB 的 JSON 存档。');
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error('无法解析 JSON，请选择游戏导出的存档备份。'); }
    const next = validateState(value);
    if (!this.storage) throw new Error('浏览器存储不可用，未导入或覆盖进度。');
    next.updatedAt = new Date().toISOString();
    try { this.checkpoint(); this.storage.setItem(SAVE_KEY, JSON.stringify(next)); }
    catch { throw new Error('备份未导入：无法写入本地存储，原进度保留。'); }
    this.state = next; this.hasSave = true; this.hasSession = true; this.dirty = false; this.error = ''; this.active = true;
    this.sessionRevision++;
    this.notify();
    try { this.storage.setItem(SETTINGS_KEY, JSON.stringify(next.settings)); } catch { /* Save remains valid. */ }
  }
}
