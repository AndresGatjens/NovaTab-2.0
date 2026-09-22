import { browserAPI } from '../storage/browser-api.js';
import { getOrigin, isValidIconSource } from '../utils/url.js';

/**
 * Sistema de favicons.
 * Prioridad:
 *  1. Icono guardado localmente (campo `icon` del marcador, dataURL o URL).
 *  2. Favicon directo del sitio (https://dominio/favicon.ico).
 *  3. Icono generado (inicial con color derivado del dominio).
 * Se cachea en storage.local el estado "sin favicon" para no repetir peticiones.
 */

const ICON_CACHE_KEY = 'novaNewTab.faviconCache';

function colorFromString(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
}

async function cacheState() {
  try {
    const cache = (await browserAPI.storage.get(ICON_CACHE_KEY))[ICON_CACHE_KEY] || {};
    return cache;
  } catch {
    return {};
  }
}

export function resolveFaviconSource(bookmark) {
  if (bookmark.icon && isValidIconSource(bookmark.icon)) {
    return { type: 'custom', src: bookmark.icon };
  }
  const origin = getOrigin(bookmark.url);
  if (origin) return { type: 'site', src: `${origin}/favicon.ico` };
  return { type: 'generated' };
}

export async function hasFavicon(url, origin) {
  const cache = await cacheState();
  return cache[origin] === true;
}

export async function markFaviconStatus(origin, ok) {
  const cache = await cacheState();
  cache[origin] = ok === true;
  try {
    await browserAPI.storage.set({ [ICON_CACHE_KEY]: cache });
  } catch {}
}

/** Devuelve una dataURL SVG con la inicial del título. */
export function generatedFaviconDataUrl(bookmark) {
  const letter = (bookmark.title || '?').trim().charAt(0).toUpperCase() || '?';
  const bg = colorFromString(bookmark.url || bookmark.title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="41" font-family="system-ui,sans-serif" font-size="30" font-weight="600" fill="white" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}