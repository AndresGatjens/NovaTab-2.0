/**
 * Tiradores de redimensionado que se pintan EN el propio widget o cajón:
 * 4 esquinas + 4 puntos medios de los lados.  Al arrastrar cualquiera de ellos
 * se cambia el tamaño en el eje que representa, así que el widget crece al
 * tirar hacia fuera y encoge al tirar hacia dentro.
 *
 * No necesitan el modo edición: aparecen al pasar el ratón por encima y ya.
 */

/** Lados posibles y el cursor que corresponde a cada uno. */
const DIRS = [
  ['n', 'ns-resize'],
  ['ne', 'nesw-resize'],
  ['e', 'ew-resize'],
  ['se', 'nwse-resize'],
  ['s', 'ns-resize'],
  ['sw', 'nesw-resize'],
  ['w', 'ew-resize'],
  ['nw', 'nwse-resize'],
];

/**
 * Rectángulo nuevo al arrastrar el tirador `dir` desde `start` con el delta
 * (dx, dy).  Si el tirador está arriba o a la izquierda, además de cambiar el
 * tamaño se mueve el origen para que el lado contrario siga pegado al puntero.
 * Respeta un mínimo y el tope de la ventana.
 */
export function resizeRect(dir, start, dx, dy, { minW = 72, minH = 44, vw = 0, vh = 0 } = {}) {
  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  if (dir.includes('e')) w = start.w + dx;
  if (dir.includes('w')) {
    w = start.w - dx;
    x = start.x + dx;
  }
  if (dir.includes('s')) h = start.h + dy;
  if (dir.includes('n')) {
    h = start.h - dy;
    y = start.y + dy;
  }

  // Mínimos: si no se llegan, se corrige el origen para no deformar el lado fijo.
  if (w < minW) {
    if (dir.includes('w')) x = start.x + start.w - minW;
    w = minW;
  }
  if (h < minH) {
    if (dir.includes('n')) y = start.y + start.h - minH;
    h = minH;
  }

  // Tope: nunca más grande que la ventana ni saliéndose por arriba/izquierda.
  if (vw > 0) {
    w = Math.min(w, vw);
    if (x > vw - w) x = vw - w;
  }
  if (vh > 0) {
    h = Math.min(h, vh);
    if (y > vh - h) y = vh - h;
  }
  x = Math.max(0, x);
  y = Math.max(0, y);

  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/**
 * Añade los 8 tiradores a `node`.
 *
 * - `minW` / `minH`: tamaño mínimo del cajón o widget.
 * - `className`: clase CSS base de los tiradores (para poder pintarlos).
 * - `label`: texto accesible (aria-label / title) de cada tirador.
 * - `pin(node, rect)`: opcional.  Se llama al empezar el arrastre para poder
 *   dejar fijo un cajón que todavía está en el flujo normal.
 * - `gate()`: opcional.  Si devuelve false los tiradores no hacen nada.
 * - `onEnd(rect, node)`: se llama al soltar, con el rectángulo final.
 * - `onStart()`: opcional, para marcar el nodo como "redimensionando".
 */
export function addResizeHandles(node, options = {}) {
  const {
    minW = 72,
    minH = 44,
    className = 'resize-handle',
    label = 'Redimensionar',
    pin = null,
    gate = null,
    onStart = null,
    onEnd = null,
  } = options;
  if (!node || typeof PointerEvent === 'undefined') return [];

  const handles = [];
  for (const [dir, cursor] of DIRS) {
    const handle = document.createElement('div');
    handle.className = `${className} ${className}-${dir}`;
    handle.dataset.dir = dir;
    handle.style.cursor = cursor;
    handle.setAttribute('role', 'button');
    handle.setAttribute('tabindex', '-1');
    handle.title = label;
    handle.setAttribute('aria-label', `${label} (${dir})`);
    attach(handle, dir);
    node.appendChild(handle);
    handles.push(handle);
  }
  return handles;

  function attach(handle, dir) {
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let start = null;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (typeof gate === 'function' && !gate()) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = node.getBoundingClientRect();
      start = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      startX = e.clientX;
      startY = e.clientY;
      resizing = true;
      if (typeof pin === 'function') pin(node, start);
      if (typeof onStart === 'function') onStart(node, dir);
      node.classList.add('resizing');
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const next = resizeRect(dir, start, e.clientX - startX, e.clientY - startY, {
        minW,
        minH,
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
      node.style.width = `${next.w}px`;
      node.style.height = `${next.h}px`;
      // El origen solo se mueve en los tiradores de arriba/izquierda, o si el
      // cajón ya estaba fijado en una posición.
      if (node.classList.contains('layout-fixed') || node.classList.contains('floating')) {
        node.style.left = `${next.x}px`;
        node.style.top = `${next.y}px`;
      }
      // Si el nodo no puede tomar el tamaño pedido (conteno que no cede, tope de
      // la pantalla, mínimo...), se rebasa la referencia al tamaño REAL.  Sin
      // esto el tirador se queda "tirando" contra el tope y el widget da saltos
      // al volver a arrastrar hacia dentro.
      const real = node.getBoundingClientRect();
      if (Math.abs(real.width - next.w) > 1 || Math.abs(real.height - next.h) > 1) {
        start = { ...next, w: real.width, h: real.height };
      }
    });

    const end = (e) => {
      if (!resizing) return;
      resizing = false;
      node.classList.remove('resizing');
      if (handle.releasePointerCapture) handle.releasePointerCapture(e.pointerId);
      const rect = node.getBoundingClientRect();
      if (typeof onEnd === 'function') {
        onEnd({ x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) }, node, dir);
      }
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}
