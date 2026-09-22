/** Utilidades de validación y normalización de URLs. */

/** Añade esquema si falta y devuelve una URL absoluta válida. */
export function normalizeUrl(input) {
  if (!input || typeof input !== 'string') return '';
  let value = input.trim();
  if (!value) return '';
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    value = 'https://' + value;
  }
  try {
    return new URL(value).toString();
  } catch {
    return '';
  }
}

/** Valida que una URL sea HTTP(S) válida. */
export function isValidHttpUrl(input) {
  const normalized = normalizeUrl(input);
  if (!normalized) return false;
  try {
    return ['http:', 'https:'].includes(new URL(normalized).protocol);
  } catch {
    return false;
  }
}

/** Valida una fuente de icono: https://, data:image/... o blob:... */
export function isValidIconSource(input) {
  if (!input || typeof input !== 'string') return false;
  const value = input.trim();
  if (!value) return false;
  if (/^data:image\//i.test(value)) return true;
  if (/^blob:/i.test(value)) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) && !/^https?:$/i.test(value)) return false;
  return isValidHttpUrl(value);
}

/** Devuelve el hostname de una URL (vacío si no es válida). */
export function getDomain(input) {
  const normalized = normalizeUrl(input);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname;
  } catch {
    return '';
  }
}

/** Devuelve el origen (protocolo + host) de una URL. */
export function getOrigin(input) {
  const normalized = normalizeUrl(input);
  if (!normalized) return '';
  try {
    return new URL(normalized).origin;
  } catch {
    return '';
  }
}

/** Motor de búsqueda → plantilla de URL. {query} se sustituye por la consulta.
 * Todos los motores son URLs públicas, sin necesidad de API key. */
export const SEARCH_ENGINES = {
  google: { name: 'Google', url: 'https://www.google.com/search?q={query}' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q={query}' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q={query}' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q={query}' },
  startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query={query}' },
  qwant: { name: 'Qwant', url: 'https://www.qwant.com/?q={query}' },
  yahoo: { name: 'Yahoo', url: 'https://search.yahoo.com/search?p={query}' },
  yandex: { name: 'Yandex', url: 'https://yandex.com/search/?text={query}' },
  mojeek: { name: 'Mojeek', url: 'https://www.mojeek.com/search?q={query}' },
  searxng: { name: 'SearXNG', url: 'https://searx.be/search?q={query}' },
  aol: { name: 'AOL', url: 'https://search.aol.com/aol/search?q={query}' },
  ask: { name: 'Ask', url: 'https://www.ask.com/web?q={query}' },
  onesearch: { name: 'OneSearch', url: 'https://www.onesearch.com/search?q={query}' },
  naver: { name: 'Naver', url: 'https://search.naver.com/search.naver?query={query}' },
  baidu: { name: 'Baidu', url: 'https://www.baidu.com/s?wd={query}' },
  seznam: { name: 'Seznam', url: 'https://search.seznam.cz/?q={query}' },
  swisscows: { name: 'Swisscows', url: 'https://swisscows.com/web?query={query}' },
  presearch: { name: 'Presearch', url: 'https://presearch.com/search?q={query}' },
  marginalia: { name: 'Marginalia', url: 'https://search.marginalia.nu/search?query={query}' },
};

/** Building de URL de búsqueda; soporta motor personalizado con plantilla. */
export function buildSearchUrl(engineKey, query, customTemplate = '') {
  const encoded = encodeURIComponent(query.trim());
  const engine = SEARCH_ENGINES[engineKey];
  if (engineKey === 'custom' && customTemplate) {
    return customTemplate.includes('{query}') ? customTemplate.replace('{query}', encoded) : customTemplate + encoded;
  }
  if (!engine) return `https://www.google.com/search?q=${encoded}`;
  return engine.url.replace('{query}', encoded);
}

export function isValidCustomTemplate(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const test = value.includes('{query}') ? value.replace('{query}', 'abc') : value;
    return Boolean(new URL(normalizeUrl(test)));
  } catch {
    return false;
  }
}