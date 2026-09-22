/**
 * Capa de abstracción de la API de extensiones.
 * Firefox expone `browser.*`, Chrome/Chromium/Quetta exponen `chrome.*`.
 * Este wrapper normaliza el acceso a `storage.local` para ambos de forma asíncrona.
 * Los métodos de Chrome devuelven un Promise ajustando su callback-style API.
 */
const root = typeof globalThis !== 'undefined' ? globalThis : self;

const _raw = root.browser || root.chrome || {};

function isPromise(value) {
  return value && typeof value.then === 'function';
}

/** Convierte una llamada callback-styled de Chrome en Promise. */
function asPromise(call) {
  try {
    const result = call();
    if (isPromise(result)) return result;
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

export const browserAPI = {
  /** API cruda (`browser` en Firefox, `chrome` en Chromium). */
  raw: _raw,
  /** `true` si estamos en Firefox (incluido IceRaven). */
  isFirefox: typeof root.browser !== 'undefined',
  /** `true` si la API es callback-styled (Chromium). */
  isChrome: typeof root.browser === 'undefined' && typeof root.chrome !== 'undefined',

  storage: {
    get(keyOrKeys) {
      return asPromise(() => _raw.storage.local.get(keyOrKeys));
    },
    set(items) {
      return asPromise(() => _raw.storage.local.set(items));
    },
    remove(keyOrKeys) {
      return asPromise(() => _raw.storage.local.remove(keyOrKeys));
    },
    clear() {
      return asPromise(() => _raw.storage.local.clear());
    },
  },
};