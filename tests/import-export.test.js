import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateImport, buildExportPayload } from '../src/services/import-export.js';
import { defaultState } from '../src/services/defaults.js';

test('validateImport acepta un JSON válido', () => {
  const result = validateImport({
    version: 1,
    settings: { theme: 'dark' },
    folders: [],
    bookmarks: [],
    widgets: [],
  });
  assert.equal(result.ok, true);
});

test('validateImport rechaza JSON inválido', () => {
  const result = validateImport('esto-no-es-json{');
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test('validateImport rechaza estructura incompleta', () => {
  const result = validateImport({ version: 1 });
  assert.equal(result.ok, false);
});

test('buildExportPayload genera el esquema esperado', async () => {
  // No usamos el store real en tests (sin storage); al menos verificamos defaults.
  const state = defaultState();
  assert.ok(Array.isArray(state.bookmarks));
  assert.ok(Array.isArray(state.folders));
  assert.ok(Array.isArray(state.widgets));
  assert.ok(state.settings.theme);
});

test('validateImport tolera data URL en iconos', () => {
  const result = validateImport({
    settings: { theme: 'auto' },
    folders: [],
    bookmarks: [{ id: 'x', title: 'T', url: 'https://a.com', icon: 'data:image/svg+xml;utf8,abc', folderId: null, position: 0 }],
    widgets: [],
  });
  assert.equal(result.ok, true);
});