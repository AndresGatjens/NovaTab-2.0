/** Helpy de creación de nodos DOM sin frameworks. */

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

export function iconButton(label, onClick) {
  const btn = el('button', 'icon-btn');
  btn.type = 'button';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.addEventListener('click', onClick);
  return btn;
}

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function debounce(fn, wait = 150) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Extiende un objeto de configuración sobre los valores por defecto (clon). */
export function mergeDefaults(defaults, override) {
  const out = Array.isArray(defaults) ? defaults.slice() : { ...defaults };
  if (!override || typeof override !== 'object') return out;
  for (const key of Object.keys(override)) {
    if (override[key] === undefined) continue;
    if (
      defaults[key] &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key]) &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      !(defaults[key] instanceof Date)
    ) {
      out[key] = mergeDefaults(defaults[key], override[key]);
    } else {
      out[key] = override[key];
    }
  }
  return out;
}