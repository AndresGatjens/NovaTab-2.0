import { store } from '../storage/store.js';
import { defaultState } from './defaults.js';
import { mergeDefaults } from '../utils/dom.js';

/** Servicio de importación/exportación de configuración (JSON). */

const EXPORT_VERSION = 1;

export function buildExportPayload() {
  const { settings, folders, bookmarks, widgets } = store.get();
  return {
    meta: {
      app: 'novantab',
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
    },
    settings,
    folders,
    bookmarks,
    widgets,
  };
}

export function serialize() {
  return JSON.stringify(buildExportPayload(), null, 2);
}

export function download(payload, filename = 'novantab-config.json') {
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Valida el JSON importado y devuelve errores si no es válido. */
export function validateImport(json) {
  const errors = [];
  let data;
  try {
    data = JSON.parse(typeof json === 'string' ? json : JSON.stringify(json));
  } catch {
    return { ok: false, errors: ['El archivo no es un JSON válido.'] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('La raíz del archivo debe ser un objeto.');
    return { ok: false, errors };
  }
  if (!data.settings || typeof data.settings !== 'object') {
    errors.push('Falta la sección "settings".');
  }
  if (!Array.isArray(data.bookmarks)) errors.push('Falta la lista "bookmarks".');
  if (!Array.isArray(data.folders)) errors.push('Falta la lista "folders".');
  if (!Array.isArray(data.widgets)) errors.push('Falta la lista "widgets".');
  if (errors.length) return { ok: false, errors };
  return { ok: true, data };
}

/** Aplica una configuración importada sobre el estado. */
export async function applyImport(data) {
  const base = defaultState();
  const imported = {
    settings: mergeDefaults(base.settings, data.settings || {}),
    folders: Array.isArray(data.folders) ? data.folders : base.folders,
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : base.bookmarks,
    widgets: Array.isArray(data.widgets) ? data.widgets : base.widgets,
  };
  await store.replace(imported);
  return imported;
}