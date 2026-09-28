// El Gestor modifica el estado (carpetas, enlaces, orden) y la cuadrícula de
// la página nueva tiene que repintarse sin esperar a cerrar el panel.
import { test } from 'node:test';
import assert from 'node:assert';
import { store } from '../src/storage/store.js';

test('suscribir al store notifica cada cambio con su clave', async () => {
  store.state = { settings: {}, folders: [], bookmarks: [], widgets: [], gridOrder: [] };
  const visto = [];
  const baja = store.subscribe((path) => visto.push(path));

  await store.set('bookmarks', [{ id: 'b1' }]);
  await store.set('folders', [{ id: 'f1' }]);
  await store.set('gridOrder', ['bookmark:b1']);

  assert.deepEqual(visto, ['bookmarks', 'folders', 'gridOrder']);
  baja();
});

test('darse de baja deja de notificar', async () => {
  store.state = { settings: {}, folders: [], bookmarks: [], widgets: [], gridOrder: [] };
  const visto = [];
  const baja = store.subscribe((path) => visto.push(path));
  baja();
  await store.set('bookmarks', []);
  assert.deepEqual(visto, []);
});

test('replace y reset notifican con "*"', async () => {
  store.state = { settings: {}, folders: [], bookmarks: [], widgets: [], gridOrder: [] };
  const visto = [];
  const baja = store.subscribe((path) => visto.push(path));
  await store.replace({ settings: {}, folders: [], bookmarks: [], widgets: [], gridOrder: [] });
  await store.reset();
  baja();
  assert.deepEqual(visto, ['*', '*']);
});

test('un suscriptor que falla no impide a los demás', async () => {
  store.state = { settings: {}, folders: [], bookmarks: [], widgets: [], gridOrder: [] };
  const visto = [];
  store.subscribe(() => {
    throw new Error('boom');
  });
  const baja = store.subscribe((path) => visto.push(path));
  await store.set('bookmarks', []);
  baja();
  assert.deepEqual(visto, ['bookmarks']);
});
