import { store } from '../storage/store.js';
import { topLevelFolders, findFolder } from './folders.js';
import { bookmarksInFolder } from './bookmarks.js';

/** Orden global de la cuadrícula raíz: carpetas e iconos mezclados en una sola secuencia. */

export function rootTileKey(kind, id) {
  return `${kind}:${id}`;
}

function parseKey(key) {
  const idx = key.indexOf(':');
  if (idx === -1) return null;
  return { kind: key.slice(0, idx), id: key.slice(idx + 1) };
}

function existingKeys() {
  const folders = topLevelFolders().map((f) => rootTileKey('folder', f.id));
  const bookmarks = bookmarksInFolder(null).map((b) => rootTileKey('bookmark', b.id));
  return { folders, bookmarks, all: [...folders, ...bookmarks] };
}

/** Devuelve las claves de la cuadrícula raíz en orden (mezcladas según gridOrder). */
export function getRootTileKeys() {
  const { all } = existingKeys();
  const stored = (store.get().gridOrder || []).filter(
    (k) => typeof k === 'string' && parseKey(k) && all.includes(k)
  );
  const used = new Set(stored);
  const missing = all.filter((k) => !used.has(k));
  return [...stored, ...missing];
}

export function getRootItems() {
  const keys = getRootTileKeys();
  const items = [];
  for (const key of keys) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    if (parsed.kind === 'folder') {
      const folder = findFolder(parsed.id);
      if (folder) items.push({ type: 'folder', data: folder });
    } else {
      const bookmark = bookmarksInFolder(null).find((b) => b.id === parsed.id);
      if (bookmark) items.push({ type: 'bookmark', data: bookmark });
    }
  }
  return items;
}

export function rootTileIndex(kind, id) {
  return getRootTileKeys().indexOf(rootTileKey(kind, id));
}

/** Reordena un tile existente a un índice global concreto. */
export async function reorderRootTile(kind, id, targetIndex) {
  const key = rootTileKey(kind, id);
  const keys = getRootTileKeys();
  const current = keys.indexOf(key);
  if (current === -1) return;
  const [moved] = keys.splice(current, 1);
  keys.splice(Math.max(0, Math.min(targetIndex, keys.length)), 0, moved);
  await store.set('gridOrder', keys);
}

/** Inserta un tile nuevo (o lo recoloca) en un índice global. */
export async function insertRootTile(kind, id, targetIndex) {
  const key = rootTileKey(kind, id);
  const keys = getRootTileKeys().filter((k) => k !== key);
  keys.splice(Math.max(0, Math.min(targetIndex, keys.length)), 0, key);
  await store.set('gridOrder', keys);
}

/** Añade un tile al final si no está. */
export async function appendRootTile(kind, id) {
  const key = rootTileKey(kind, id);
  const keys = getRootTileKeys();
  if (!keys.includes(key)) {
    await store.set('gridOrder', [...keys, key]);
  }
}

/** Quita un tile del orden global (borrado o movido a una carpeta). */
export async function removeRootTile(kind, id) {
  const key = rootTileKey(kind, id);
  const keys = getRootTileKeys().filter((k) => k !== key);
  await store.set('gridOrder', keys);
}