import { store } from '../storage/store.js';
import { uid } from '../utils/id.js';

/** Servicio de carpetas de la cuadrícula. */

function sorted(folders) {
  return folders
    .filter((f) => f.parentId == null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function topLevelFolders() {
  return sorted(store.get().folders);
}

export async function addFolder(title, parentId = null, position) {
  const folders = store.get().folders;
  const top = sorted(folders);
  const fallback = parentId == null ? top.length : folders.filter((f) => f.parentId === parentId).length;
  const pos = position == null ? fallback : Math.max(0, Math.min(position, top.length));
  const folder = {
    id: uid('fld'),
    title: title.trim(),
    icon: 'folder',
    position: pos,
    parentId,
  };
  let next;
  if (parentId == null && position != null) {
    next = folders.map((f) => (f.parentId == null ? { ...f, position: f.position + (f.position >= pos ? 1 : 0) } : f));
  } else {
    next = folders;
  }
  await store.set('folders', [...next, folder]);
  return folder;
}

export async function renameFolder(id, title) {
  const folders = store.get().folders.map((f) => (f.id === id ? { ...f, title: title.trim() } : f));
  await store.set('folders', folders);
}

export async function removeFolder(id) {
  const { folders, bookmarks } = store.get();
  const childIds = new Set(
    folders.filter((f) => f.parentId === id).map((f) => f.id).concat([id])
  );
  const remaining = folders.filter((f) => !childIds.has(f.id));
  const orphaned = bookmarks.map((b) => (b.folderId && childIds.has(b.folderId) ? { ...b, folderId: null } : b));
  await store.set('folders', remaining);
  await store.set('bookmarks', orphaned);
}

export async function reorderFolder(id, targetIndex) {
  const group = sorted(store.get().folders);
  const current = group.findIndex((f) => f.id === id);
  if (current === -1) return;
  const [moved] = group.splice(current, 1);
  group.splice(Math.max(0, Math.min(targetIndex, group.length)), 0, moved);
  const ids = new Set(group.map((f) => f.id));
  const folders = store.get().folders.map((f) => (ids.has(f.id) ? { ...f, position: group.findIndex((g) => g.id === f.id) } : f));
  await store.set('folders', folders);
}

export function findFolder(id) {
  return store.get().folders.find((f) => f.id === id) || null;
}

export function folderIcon(title, type = 'folder') {
  const icon = { work: '💼', play: '🎬', folder: '📁' };
  return icon[type] || '📁';
}