// Smoke test del orden global mezclado (gridOrder) — se ejecuta con node --test
import { test } from 'node:test';
import assert from 'node:assert';
import { store } from '../src/storage/store.js';
import { getRootItems, getRootTileKeys, reorderRootTile, insertRootTile } from '../src/services/tiles.js';

// Estado en memoria sin storage
store.state = {
  settings: {
    searchEngine: 'google', iconSize: 48, gridSpacing: 16, cardRadius: 16,
    gridColumns: 5, gridRows: 4, theme: 'dark', accent: 'violet', backgroundColor: '#0f0f1b',
  },
  folders: [
    { id: 'f1', title: 'Trabajo', parentId: null, position: 0 },
    { id: 'f2', title: 'Ocio', parentId: null, position: 1 },
  ],
  bookmarks: [
    { id: 'b1', title: 'Gmail', url: 'https://gmail.com', folderId: null, position: 0 },
    { id: 'b2', title: 'YouTube', url: 'https://youtube.com', folderId: null, position: 1 },
    { id: 'b3', title: 'Drive', url: 'https://drive.google.com', folderId: null, position: 2 },
  ],
  widgets: [],
  gridOrder: [],
};

test('gridOrder vacío: primero carpetas, luego iconos', () => {
  const keys = getRootTileKeys();
  assert.deepEqual(keys, ['folder:f1', 'folder:f2', 'bookmark:b1', 'bookmark:b2', 'bookmark:b3']);
});

test('reorderRootTile mezcla un icono entre carpetas', async () => {
  await reorderRootTile('bookmark', 'b1', 1); // Gmail entre Trabajo y Ocio
  const keys = getRootTileKeys();
  assert.deepEqual(keys, ['folder:f1', 'bookmark:b1', 'folder:f2', 'bookmark:b2', 'bookmark:b3']);
  const items = getRootItems();
  assert.deepEqual(items.map((i) => `${i.type}:${i.data.id}`), ['folder:f1', 'bookmark:b1', 'folder:f2', 'bookmark:b2', 'bookmark:b3']);
});

test('reorderRootTile mueve una carpeta entre iconos', async () => {
  await reorderRootTile('folder', 'f2', 4); // Ocio al final
  const keys = getRootTileKeys();
  assert.deepEqual(keys, ['folder:f1', 'bookmark:b1', 'bookmark:b2', 'bookmark:b3', 'folder:f2']);
});

test('insertRootTile coloca un nuevo icono en un hueco', async () => {
  store.state.bookmarks.push({ id: 'b4', title: 'X', url: 'https://x.com', folderId: null, position: 3 });
  await insertRootTile('bookmark', 'b4', 2);
  const keys = getRootTileKeys();
  assert.deepEqual(keys, ['folder:f1', 'bookmark:b1', 'bookmark:b4', 'bookmark:b2', 'bookmark:b3', 'folder:f2']);
});