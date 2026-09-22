import { el, clearNode } from '../utils/dom.js';

/** Ventana modal base con foco, cierre con Escape y overlay. */
export function openModal({ title, body, actions, onClose, wide = false }) {
  const overlay = el('div', 'modal-overlay');
  if (wide) overlay.classList.add('wide');

  const dialog = el('section', 'modal');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', title);

  const header = el('div', 'modal-header');
  const h = el('h2', 'modal-title', title);
  const close = el('button', 'modal-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  header.appendChild(h);
  header.appendChild(close);

  dialog.appendChild(header);

  const bodyWrap = el('div', 'modal-body');
  if (body) {
    if (typeof body === 'string') bodyWrap.innerHTML = body;
    else bodyWrap.appendChild(body);
  }
  dialog.appendChild(bodyWrap);

  if (actions && actions.length) {
    const footer = el('div', 'modal-footer');
    for (const action of actions) footer.appendChild(action);
    dialog.appendChild(footer);
  }

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  let focusable = dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  let disposed = false;

  close.addEventListener('click', dispose);
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) dispose();
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dispose();
      return;
    }
    if (e.key === 'Tab') {
      focusable = dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener('keydown', onKey);
  const first = focusable[0];
  if (first) setTimeout(() => first.focus(), 30);

  return { dialog, dispose, overlay };
}

export function button(label, onClick, kind = '') {
  const btn = el('button', 'btn');
  if (kind) btn.classList.add(`btn-${kind}`);
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', () => onClick());
  return btn;
}

/** Formulario de ejemplo simple: {label, name, value, type} */
export function field({ label, value, type = 'text', placeholder = '', required = false }) {
  const wrap = el('label', 'field');
  wrap.textContent = label;
  const input = el('input', 'field-input');
  input.type = type;
  input.value = value ?? '';
  input.placeholder = placeholder;
  input.required = required;
  wrap.appendChild(input);
  return { wrap, input };
}