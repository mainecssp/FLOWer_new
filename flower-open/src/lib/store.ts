// src/lib/store.ts
// Tiny localStorage helpers (vendor-neutral). Swap later to any backend.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors (quota, etc.)
  }
}

export function upsertById<T extends { id: any }>(arr: T[], item: T): T[] {
  const i = arr.findIndex((x) => String(x.id) === String(item.id));
  if (i >= 0) {
    const next = arr.slice();
    next[i] = item;
    return next;
  }
  return [item, ...arr];
}
