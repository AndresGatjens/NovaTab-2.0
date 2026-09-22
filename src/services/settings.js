import { store } from '../storage/store.js';
import { mergeDefaults } from '../utils/dom.js';
import { DEFAULT_SETTINGS } from './defaults.js';
import { SEARCH_ENGINES, isValidCustomTemplate } from '../utils/url.js';

/** Servicio de configuración (settings). */

export async function updateSettings(patch) {
  const current = store.getSettings();
  const merged = mergeDefaults(current, patch);
  await store.set('settings', merged);
  return merged;
}

export async function updateBackground(patch) {
  const current = store.getSettings().background;
  const merged = mergeDefaults(current, patch);
  return updateSettings({ background: merged });
}

export async function resetSettings() {
  await store.set('settings', structuredClone(DEFAULT_SETTINGS));
}

export function getEffectiveTheme() {
  const { theme } = store.getSettings();
  if (theme === 'auto') {
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return theme;
}

export function searchEngineOptions() {
  return Object.entries(SEARCH_ENGINES).map(([key, { name, url }]) => ({ key, name, url }));
}

export function validateCustomSearch(template) {
  return isValidCustomTemplate(template);
}