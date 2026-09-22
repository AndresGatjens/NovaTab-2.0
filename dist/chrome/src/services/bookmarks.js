import { store } from '../storage/store.js';
import { uid } from '../utils/id.js';
import { normalizeUrl, isValidHttpUrl } from '../utils/url.js';

/** Servicio de marcadores (bookmarks/favoritos). */

function sortedBookmarks(bookmarks, folderId = null, folders = []) {
  const targetFolders = new Set([folderId, ...folders.map((f) => f.id)]);
  return bookmarks
    .filter((b) => targetFolders.has(b.folderId ?? null))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function bookmarksInFolder(folderId) {
  const { bookmarks } = store.get();
  return sortedBookmarks(bookmarks, folderId);
}

export async function addBookmark({ title, url, icon = '', folderId = null }) {
  const { bookmarks } = store.get();
  const position = bookmarksInFolder(folderId).length;
  const bookmark = {
    id: uid('bm'),
    title: title.trim(),
    url: normalizeUrl(url),
    icon,
    folderId: folderId ?? null,
    position,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await store.set('bookmarks', [...bookmarks, bookmark]);
  return bookmark;
}

export async function updateBookmark(id, patch) {
  const { bookmarks } = store.get();
  const list = bookmarks.map((b) =>
    b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b
  );
  await store.set('bookmarks', list);
}

export async function removeBookmark(id) {
  const { bookmarks } = store.get();
  const folderId = bookmarks.find((b) => b.id === id)?.folderId ?? null;
  let list = bookmarks.filter((b) => b.id !== id);
  list = renumberPositions(list, folderId);
  await store.set('bookmarks', list);
}

export async function moveBookmark(id, targetFolderId) {
  const { bookmarks } = store.get();
  const sourceFolder = bookmarks.find((b) => b.id === id)?.folderId ?? null;
  let list = bookmarks.filter((b) => b.id !== id);
  list = renumberPositions(list, sourceFolder);
  const position = bookmarksInFolder(targetFolderId).length;
  list.push({
    ...bookmarks.find((b) => b.id === id),
    folderId: targetFolderId ?? null,
    position,
    updatedAt: Date.now(),
  });
  await store.set('bookmarks', list);
}

export async function reorderBookmark(id, targetIndex, folderId = null) {
  const { bookmarks } = store.get();
  const group = sortedBookmarks(bookmarks, folderId);
  const current = group.findIndex((b) => b.id === id);
  if (current === -1) return;
  const [moved] = group.splice(current, 1);
  const clamped = Math.max(0, Math.min(targetIndex, group.length));
  group.splice(clamped, 0, moved);
  const ids = new Set(group.map((b) => b.id));
  const list = bookmarks.map((b) => (ids.has(b.id) ? { ...b, position: group.findIndex((g) => g.id === b.id) } : b));
  await store.set('bookmarks', list);
}

export function findBookmark(id) {
  return store.get().bookmarks.find((b) => b.id === id);
}

/** Reasigna posiciones 0..n según el orden actual de una carpeta. */
function renumberPositions(bookmarks, folderId) {
  const affected = bookmarks
    .filter((b) => (b.folderId ?? null) === (folderId ?? null))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const idPos = new Map(affected.map((b, i) => [b.id, i]));
  return bookmarks.map((b) => (idPos.has(b.id) ? { ...b, position: idPos.get(b.id) } : b));
}

export function validateBookmarkInput({ title, url }) {
  const errors = [];
  if (!title || !title.trim()) errors.push('El nombre es obligatorio');
  if (!url || !isValidHttpUrl(url)) {
    errors.push('La URL no es válida (se acepta "youtube.com" o "https://...")');
  }
  return errors;
}