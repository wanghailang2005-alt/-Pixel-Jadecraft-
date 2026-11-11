export const SAVE_KEY = 'pixel-jadecraft.save.v1';
export const BACKUP_KEY = 'pixel-jadecraft.backup.v1';
export const SETTINGS_KEY = 'pixel-jadecraft.settings.v1';
export const MATERIALS = Object.freeze({
  nephrite: { name: '和田玉原石', color: '#b7d8ac' },
  jadeite: { name: '翡翠原石', color: '#53ab88' },
});
const LOCATIONS = ['workshop', 'mine', 'gallery'];
const SHAPES = ['bi', 'fish', 'seal'];
const clone = value => structuredClone(value);
export function freshState() {
  return {
    version: 1, location: 'workshop', stamina: 100,
    inventory: [], pieces: [], discoveries: [], observations: 0,
    exhibits: [null, null, null], crafting: null,
    opening: { introduced: false, polished: false },
    settings: { muted: false, volume: 0.35 }, updatedAt: null,
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
    ids.add(piece.id);
  }
  if (!Array.isArray(value.discoveries) || value.discoveries.some(id => !['bi', 'cong', 'huang', 'dragon', 'fish', 'seal'].includes(id)) || new Set(value.discoveries).size !== value.discoveries.length) fail();
  if (!Number.isInteger(value.observations) || value.observations < 0) fail();
  if (!Array.isArray(value.exhibits) || value.exhibits.length !== 3) fail();
  const occupied = value.exhibits.filter(id => id !== null);
  if (new Set(occupied).size !== occupied.length || occupied.some(id => !value.pieces.some(p => p.id === id))) fail();
  // A validated crafting schema will land alongside the crafting system.
  if (value.crafting !== null) fail();
  if (!value.settings || typeof value.settings.muted !== 'boolean' || !Number.isFinite(value.settings.volume) || value.settings.volume < 0 || value.settings.volume > 1) fail();
  if (value.updatedAt !== null && (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)))) fail();
  const opening = Object.hasOwn(value, 'opening') ? value.opening : { introduced: true, polished: false };
  if (!opening || typeof opening.introduced !== 'boolean' || typeof opening.polished !== 'boolean' || (opening.polished && !opening.introduced)) fail();
  const state = freshState();
  for (const key of Object.keys(state)) state[key] = clone(key === 'opening' ? opening : value[key]);
  return state;
}
export function tasks(state) {
  return [
    { name: '寻一块玉', detail: '前往矿洞，采集第一块原石', done: state.inventory.length > 0 || state.pieces.length > 0 },
    { name: '识玉之美', detail: '观察材料，完成至少三次鉴赏答题', done: state.observations >= 3 },
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
    this.storage.setItem(BACKUP_KEY, previous);
  }
  recovery() {
    try { return validateState(JSON.parse(this.storage?.getItem(BACKUP_KEY) ?? 'null')); }
    catch { return null; }
  }
  recover() {
    const backup = this.recovery();
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
  resume() { if (this.hasSession) { this.active = true; this.notify(); } }
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
  /** Shared settlement for the forthcoming mining interaction. */
  addMaterial(material, id = crypto.randomUUID()) {
    if (!this.active || !Object.hasOwn(MATERIALS, material) || this.state.inventory.length >= 12 || this.state.inventory.some(i => i.id === id) || this.state.pieces.some(i => i.id === id)) return false;
    const next = clone(this.state); next.inventory.push({ id, material });
    this.state = validateState(next); this.save(); this.notify(); return true;
  }
  exportSave() { return JSON.stringify(this.state, null, 2); }
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
