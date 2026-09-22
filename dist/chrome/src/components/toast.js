import { el } from '../utils/dom.js';

/** Notificaciones toast (usadas sin imprimir por consola, solo en pantalla). */
let host = null;

export function ensureHost() {
  if (!host) {
    host = el('div', 'toast-host');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message, kind = 'info', ms = 2600) {
  ensureHost();
  const node = el('div', 'toast');
  if (kind) node.classList.add(`toast-${kind}`);
  node.textContent = message;
  host.appendChild(node);
  const off = () => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 200);
  };
  setTimeout(off, ms);
  node.addEventListener('click', off);
}