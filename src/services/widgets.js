import { store } from '../storage/store.js';
import { uid } from '../utils/id.js';

/** Servicio de widgets (reloj, fecha, clima). */

export function widgets() {
  return store.get().widgets.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function enabledWidgets() {
  return widgets().filter((w) => w.enabled);
}

export async function updateWidget(id, patch) {
  const widgets = store.get().widgets.map((w) => (w.id === id ? { ...w, ...patch } : w));
  await store.set('widgets', widgets);
}

export async function reorderWidgets(orderedIds) {
  const widgets = store.get().widgets.map((w) => ({ ...w, position: orderedIds.indexOf(w.id) }));
  await store.set('widgets', widgets);
}

export async function addWidget(type) {
  const widgets = store.get().widgets;
  const position = widgets.length;
  const widget = {
    id: uid('wdg'),
    type,
    position,
    enabled: true,
    config: {},
  };
  await store.set('widgets', [...widgets, widget]);
  return widget;
}

export function deleteWidget(id) {
  return store.set('widgets', store.get().widgets.filter((w) => w.id !== id));
}

/** Marcos de apoyo para el widget de clima (dejar preparado, sin API aún). */
export function weatherConfig() {
  const w = store.get().widgets.find((x) => x.type === 'weather');
  return w?.config || {};
}