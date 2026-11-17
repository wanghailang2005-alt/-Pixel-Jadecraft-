export const GLOBAL_SHORTCUTS = Object.freeze({ b: 'inventory', j: 'tasks', g: 'codex', m: 'mute', f: 'fullscreen' });

export function resolveGlobalShortcut(key) {
  return GLOBAL_SHORTCUTS[String(key ?? '').toLowerCase()] ?? null;
}

export function craftToolShortcutLabel(index) {
  return String(Number(index) + 1);
}

export function resolveCraftToolShortcut(key, tools) {
  const index = Number(key) - 1;
  return Number.isInteger(index) && index >= 0 && index < (tools?.length ?? 0) ? tools[index] : null;
}
