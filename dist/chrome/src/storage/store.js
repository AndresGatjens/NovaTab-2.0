import { browserAPI } from './browser-api.js';
import { defaultState } from '../services/defaults.js';
import { mergeDefaults } from '../utils/dom.js';

/** Clave única bajo la que se guarda todo el estado en storage.local. */
const STATE_KEY = 'novaNewTab.state.v1';
const BYPASS = { bypass: false };

/**
 * Estado global de la extensión, persistido en storage.local.
 * Carga una sola vez, mantiene una copia en memoria y ofrece suscripción
 * para repintar la UI ante cambios.
 */
class Store {
  constructor() {
    this.state = defaultState();
    this.bound = false;
  }

  async init() {
    try {
      const stored = await browserAPI.storage.get(STATE_KEY);
      if (stored && stored[STATE_KEY]) {
        this.state = this.sanitize(stored[STATE_KEY]);
      }
    } catch (error) {
      // Si storage falla (p. ej. abierto en una pestaña normal), seguimos en memoria.
      this.state = defaultState();
    }
    this.bound = true;
    return this.state;
  }

  sanitize(raw) {
    const base = defaultState();
    const out = {
      settings: mergeDefaults(base.settings, raw.settings),
      folders: Array.isArray(raw.folders) ? raw.folders : base.folders,
      bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : base.bookmarks,
      widgets: Array.isArray(raw.widgets) ? raw.widgets : base.widgets,
      gridOrder: Array.isArray(raw.gridOrder) ? raw.gridOrder : base.gridOrder,
    };
    return out;
  }

  get() {
    return this.state;
  }

  getSettings() {
    return this.state.settings;
  }

  async save() {
    if (!this.bound || BYPASS.bypass) return;
    try {
      await browserAPI.storage.set({ [STATE_KEY]: this.state });
    } catch (error) {
      // Quota u otro error: no romper la UI.
    }
  }

  /** Aplica un cambio en clave (path simplificado 'settings.searchEngine' o 'bookmarks'). */
  async set(path, value) {
    const parts = path.split('.');
    let cursor = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
    await this.save();
    return this.state;
  }

  async replace(nextState) {
    this.state = this.sanitize(nextState);
    await this.save();
    return this.state;
  }

  async reset() {
    this.state = defaultState();
    await this.save();
    return this.state;
  }

  async clearStorage() {
    await browserAPI.storage.clear();
  }
}

export const store = new Store();