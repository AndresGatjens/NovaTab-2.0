import { store } from '../storage/store.js';
import { updateSettings } from '../services/settings.js';
import { clampRect } from '../utils/layout.js';
import { addResizeHandles, resizeRect } from './resize-handles.js';
import { toast } from './toast.js';
import { t } from '../services/i18n.js';

/**
 * Modo edición: reorganización libre de los "cajones" (cuadrícula y widgets)
 * como en un escritorio de Linux. Dentro del modo edición se pueden mover y
 * redimensionar; fuera de él todo queda fijado en la posición guardada.
 */

/** Tamaños mínimos de cada cajón al redimensionar. */
const MIN_W = { grid: 320, widgets: 160, search: 220 };
const MIN_H = { grid: 180, widgets: 56, search: 40 };

/** Hueco mínimo entre cajones al resolver colisiones. */
const GAP = 12;

let active = false;

/**
 * Empuja un cajón FUERA de los demás cajones fijados con los que se solapa,
 * por el eje de menor penetración. `rect` se modifica en sitio y se devuelve.
 * Devuelve true si hubo algún ajuste (para saber que "chocó").
 */
function resolveCollisions(key, rect) {
  let bumped = false;
  for (const [otherKey, other] of Object.entries(drawers)) {
    if (otherKey === key) continue;
    if (!other || !other.classList.contains('layout-fixed')) continue;
    const o = other.getBoundingClientRect();
    const px = Math.min(rect.x + rect.w, o.right) - Math.max(rect.x, o.left);
    const py = Math.min(rect.y + rect.h, o.bottom) - Math.max(rect.y, o.top);
    if (px <= 0 || py <= 0) continue; // No se tocan.
    bumped = true;
    // Se elige el eje de MENOR penetración: así el cajón se "desliza" por el
    // lado que requiere menos movimiento (como un escritorio real).
    if (px < py) {
      const mine = rect.x + rect.w / 2;
      const other = o.left + o.width / 2;
      if (mine <= other) {
        rect.x = o.left - rect.w - GAP;
      } else {
        rect.x = o.right + GAP;
      }
    } else {
      const mine = rect.y + rect.h / 2;
      const otherC = o.top + o.height / 2;
      if (mine <= otherC) {
        rect.y = o.top - rect.h - GAP;
      } else {
        rect.y = o.bottom + GAP;
      }
    }
  }
  return bumped;
}

/** Cajones registrados (clave de layout -> contenedor) para poder hacer un
 *  guardado global del estado actual al salir del modo edición. */
let drawers = {};

export function isEditMode() {
  return active;
}

/** Guarda el estado actual de TODOS los cajones en su posición/size reales. */
export function commitLayout() {
  const current = store.getSettings().layout || {};
  const next = { ...current };
  for (const [key, container] of Object.entries(drawers)) {
    // Solo se persisten los que están fijados (movidos/redimensionados);
    // los que siguen en flujo conservan su entrada (null = flujo).
    if (!container || !container.classList.contains('layout-fixed')) continue;
    const rect = container.getBoundingClientRect();
    next[key] = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    };
  }
  updateSettings({ layout: next });
}

/** Aplica la posición/tamaño guardados de un cajón (o lo deja en flujo). */
export function applySavedLayout(key, container) {
  const pos = (store.getSettings().layout || {})[key];
  // Primero se vuelve al flujo normal para poder medir el tamaño natural real.
  container.classList.remove('layout-fixed');
  container.style.left = '';
  container.style.top = '';
  container.style.width = '';
  container.style.height = '';
  if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
  const naturalW = container.offsetWidth;
  const naturalH = container.offsetHeight;
  const minW = MIN_W[key] ?? 0;
  const minH = MIN_H[key] ?? 0;
  let w = typeof pos.w === 'number' && pos.w >= minW ? pos.w : naturalW;
  let h = typeof pos.h === 'number' && pos.h >= minH ? pos.h : naturalH;
  // El layout guardado puede venir de otra pantalla (o de una copia de
  // seguridad hecha con la ventana más grande): se ajusta a la actual para que
  // el cajón no quede medio fuera de la vista.  No se persiste el ajuste.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  w = Math.min(w, Math.max(minW, vw));
  h = Math.min(h, Math.max(minH, vh));
  const fit = clampRect({ x: pos.x, y: pos.y, w, h }, vw, vh);
  container.classList.add('layout-fixed');
  container.style.left = `${Math.round(fit.x)}px`;
  container.style.top = `${Math.round(fit.y)}px`;
  container.style.width = `${Math.round(fit.w)}px`;
  container.style.height = `${Math.round(fit.h)}px`;
}

/** Activa/desactiva el modo edición y refresca la interfaz. */
export function toggleEditMode() {
  const wasActive = active;
  active = !active;
  document.body.classList.toggle('edit-mode', active);
  // Al SALIR del modo edición se fuerza el guardado global del estado actual.
  if (wasActive) commitLayout();
  toast(active ? t('edit.enter') : t('edit.exit'));
  return active;
}

/** Quita la posición guardada de un cajón y lo devuelve a su flujo natural. */
export async function resetDrawer(key, rerender) {
  const settings = store.getSettings();
  // Se escribe directamente (no vía updateSettings: mergeDefaults no puede
  // poner un objeto anidado a null).
  await store.set('settings', { ...settings, layout: { ...settings.layout, [key]: null } });
  if (typeof rerender === 'function') rerender();
}

/** Habilita el arrastre de un cajón SOLO dentro del modo edición. */
function enableDrag(container, key) {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  const onMove = (e) => {
    if (!dragging) return;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
    if (!moved) {
      // Primer movimiento real: si el cajón sigue en flujo, lo fijamos primero
      // en su posición natural actual para que siga al puntero sin saltos.
      const rect = container.getBoundingClientRect();
      if (!container.classList.contains('layout-fixed')) {
        container.classList.add('layout-fixed');
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height}px`;
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
      }
      moved = true;
    }
    container.style.left = `${e.clientX - offsetX}px`;
    container.style.top = `${e.clientY - offsetY}px`;
  };

  const cleanup = () => {
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerup', onEnd);
    container.removeEventListener('pointercancel', onEnd);
  };

  const onEnd = (e) => {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('dragging');
    if (container.releasePointerCapture) container.releasePointerCapture(e.pointerId);
    cleanup();
    if (!moved) return;
    const rect = container.getBoundingClientRect();
    const pos = clampRect(
      { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      window.innerWidth,
      window.innerHeight
    );
    container.classList.add('layout-fixed');
    container.style.left = `${Math.round(pos.x)}px`;
    container.style.top = `${Math.round(pos.y)}px`;
    const current = store.getSettings().layout || {};
    const prev = current[key] || {};
    // Se conserva el tamaño si ya se había redimensionado.
    updateSettings({
      layout: { ...current, [key]: { x: Math.round(pos.x), y: Math.round(pos.y), w: prev.w, h: prev.h } },
    });
  };

  const onDown = (e) => {
    if (!active) return;
    if (e.button !== 0) return;
    // Se excluyen los elementos interactivos y los widgets FLOTANTES (que se
    // arrastran individualmente). Los widgets de la barra mueven la barra.
    // En el cajón de búsqueda el input NO bloquea el arrastre: en modo edición
    // no se escribe en él, así que basta agarrarlo para mover/redimensionar el
    // cajón. En los demás cajones sí se protegen los campos editables.
    const interactive = 'button, input, select, textarea, .card, .notes-input, .widget.floating, .drawer-resize';
    const excl = key === 'search' ? interactive.replace(', input', '').replace('input, ', '') : interactive;
    if (e.target.closest(excl)) return;
    e.preventDefault();
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    container.classList.add('dragging');
    if (container.setPointerCapture) container.setPointerCapture(e.pointerId);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onEnd);
    container.addEventListener('pointercancel', onEnd);
  };

  container.addEventListener('pointerdown', onDown);
}

/**
 * Añade (si no están) los 8 tiradores de redimensionado de un cajón:
 * 4 esquinas + 4 centros de los lados.  Solo funcionan en el modo edición,
 * igual que el resto de las cosas de edición.
 *
 * OJO: hay que volver a llamarla después de cada `innerHTML = ''` del cajón,
 * porque los tiradores son hijos suyos y se van con el contenido.  Por eso
 * `renderGrid`/`renderSearch` la invocan al final.
 */
export function ensureResizeHandles(container, key) {
  if (container.querySelector('.drawer-resize')) return;
  addResizeHandles(container, {
    className: 'drawer-resize',
    label: t('edit.resize'),
    minW: MIN_W[key] ?? 160,
    minH: MIN_H[key] ?? 40,
    gate: isEditMode,
    // Si el cajón sigue en el flujo normal, se fija en su sitio actual antes
    // de escalar, para que no dé un salto al empezar a arrastrar.
    pin: (target, rect) => {
      if (target.classList.contains('layout-fixed')) return;
      target.classList.add('layout-fixed');
      target.style.width = `${rect.w}px`;
      target.style.height = `${rect.h}px`;
      target.style.left = `${rect.x}px`;
      target.style.top = `${rect.y}px`;
    },
    onEnd: (rect, target) => {
      target.classList.add('layout-fixed');
      target.style.left = `${rect.x}px`;
      target.style.top = `${rect.y}px`;
      target.style.width = `${rect.w}px`;
      target.style.height = `${rect.h}px`;
      const current = store.getSettings().layout || {};
      updateSettings({
        layout: { ...current, [key]: { x: rect.x, y: rect.y, w: rect.w, h: rect.h } },
      });
    },
  });
}

/**
 * En modo edición la rueda ajusta el tamaño del cajón en vez de dejarlo
 * saltar.  Sin esto,_scroll_ por encima de la cuadrícula la cambiaba de página
 * mientras el usuario intentaba colocarla.
 */
function enableWheelResize(container, key) {
  container.addEventListener(
    'wheel',
    (e) => {
      if (!active) return;
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (!delta) return;
      // Sobre las tarjetas la rueda se deja pasar (comportamiento normal).
      if (e.target.closest('.card')) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // Se crece hacia abajo y hacia la derecha desde la esquina superior
      // izquierda, que es lo intuitivo al girar la rueda.
      const next = resizeRect('se', { x: rect.left, y: rect.top, w: rect.width, h: rect.height }, 0, delta, {
        minW: MIN_W[key] ?? 160,
        minH: MIN_H[key] ?? 40,
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
      container.classList.add('layout-fixed');
      container.style.left = `${next.x}px`;
      container.style.top = `${next.y}px`;
      container.style.width = `${next.w}px`;
      container.style.height = `${next.h}px`;
      const current = store.getSettings().layout || {};
      updateSettings({
        layout: { ...current, [key]: { x: next.x, y: next.y, w: next.w, h: next.h } },
      });
    },
    { passive: false }
  );
}

/**
 * La barra de widgets no es una caja (los widgets flotan sueltos y llevan sus
 * propios tiradores), pero la cuadrícula y la barra de búsqueda sí son cajones
 * redimensionables, cada uno por su cuenta.
 */
export function setupLayoutEditor(gridSlot, widgetsSlot, searchSlot) {
  drawers = { grid: gridSlot };
  if (widgetsSlot) {
    drawers.widgets = widgetsSlot;
    // Sin caja: los widgets flotan sueltos, nada de marcos ni agarradores.
    widgetsSlot.classList.add('no-box');
  }
  if (searchSlot) drawers.search = searchSlot;

  enableDrag(gridSlot, 'grid');
  ensureResizeHandles(gridSlot, 'grid');
  enableWheelResize(gridSlot, 'grid');
  if (searchSlot) {
    enableDrag(searchSlot, 'search');
    ensureResizeHandles(searchSlot, 'search');
    enableWheelResize(searchSlot, 'search');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !active) return;
    if (document.querySelector('.settings-overlay, .modal')) return;
    e.preventDefault();
    toggleEditMode();
  });
}