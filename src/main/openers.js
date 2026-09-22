import { store } from '../storage/store.js';
import { buildSearchUrl } from '../utils/url.js';

/** Abre un marcador según la configuración de enlaces del usuario. */
export function openBookmark(bookmark, forceNew = false) {
  if (!bookmark?.url) return;
  const behavior = forceNew ? 'new' : store.getSettings().linkBehavior;
  if (behavior === 'new') {
    window.open(bookmark.url, '_blank', 'noopener');
  } else {
    window.location.href = bookmark.url;
  }
}

/** Realiza una búsqueda con el motor configurado. */
export function openSearch(query) {
  const settings = store.getSettings();
  const url = buildSearchUrl(settings.searchEngine, query, settings.customSearchUrl);
  if (settings.linkBehavior === 'new') {
    window.open(url, '_blank', 'noopener');
  } else {
    window.location.href = url;
  }
}