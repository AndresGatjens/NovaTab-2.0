import { el, clearNode } from '../utils/dom.js';
import { store } from '../storage/store.js';
import { bookmarksInFolder } from '../services/bookmarks.js';
import { getRootItems } from '../services/tiles.js';
import { resolveFaviconSource, generatedFaviconDataUrl, markFaviconStatus } from '../services/favicon.js';

/** Crea una tarjeta de marcador (cuadrícula y carpetas). */
export function bookmarkCard(bookmark, { draggable = true, showLabel = true } = {}) {
  const card = el('div', 'card bookmark-card');
  card.dataset.id = bookmark.id;
  card.dataset.kind = 'bookmark';
  card.dataset.folder = bookmark.folderId ?? 'root';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${bookmark.title}, abrir enlace`);
  if (draggable) card.draggable = true;

  const favWrap = el('div', 'fav-wrap');
  const img = el('img', 'fav');
  img.alt = '';
  img.loading = 'lazy';

  const { type, src } = resolveFaviconSource(bookmark);
  if (type === 'custom') {
    img.src = src;
    img.addEventListener('error', () => {
      img.onerror = null;
      img.src = generatedFaviconDataUrl(bookmark);
    });
  } else if (type === 'site') {
    img.src = src;
    img.addEventListener('error', () => {
      img.onerror = null;
      markFaviconStatus('', false);
      img.src = generatedFaviconDataUrl(bookmark);
    });
    img.addEventListener('load', () => {
      try {
        if (new URL(img.currentSrc || img.src).protocol === 'http:') markFaviconStatus(new URL(img.src).origin, true);
      } catch {}
    });
  } else {
    img.src = generatedFaviconDataUrl(bookmark);
  }

  favWrap.appendChild(img);

  const label = el('span', 'card-label', bookmark.title);

  card.appendChild(favWrap);
  if (showLabel) card.appendChild(label);
  return card;
}

/** Crea el mini-icono del contenido de una carpeta (estilo Android 16). */
function folderPreviewIcon(bookmark) {
  const mini = el('span', 'folder-preview-item');
  const img = el('img', 'folder-preview-img');
  img.alt = '';
  img.loading = 'lazy';
  const { type, src } = resolveFaviconSource(bookmark);
  if (type === 'custom' || type === 'site') {
    img.src = src;
    img.addEventListener('error', () => {
      img.onerror = null;
      img.src = generatedFaviconDataUrl(bookmark);
    });
  } else {
    img.src = generatedFaviconDataUrl(bookmark);
  }
  mini.appendChild(img);
  return mini;
}

/** Crea la tarjeta de una carpeta (contenedor translúcido con mini-iconos). */
export function folderCard(folder, { draggable = true, showLabel = true } = {}) {
  const card = el('div', 'card folder-card');
  card.dataset.id = folder.id;
  card.dataset.kind = 'folder';
  card.dataset.folder = 'root';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  const items = bookmarksInFolder(folder.id);
  card.setAttribute('aria-label', `Carpeta ${folder.title}, ${items.length} elementos`);
  if (draggable) card.draggable = true;

  const preview = el('div', 'folder-preview');
  const shown = items.slice(0, 4);
  if (shown.length) {
    for (const bm of shown) preview.appendChild(folderPreviewIcon(bm));
  } else {
    preview.classList.add('folder-preview-empty');
    preview.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>`;
  }

  const label = showLabel ? el('span', 'card-label', folder.title) : null;
  const count = el('span', 'folder-count', String(items.length));

  card.appendChild(preview);
  if (label) card.appendChild(label);
  card.appendChild(count);
  return card;
}

/** Aplica las variables de la cuadrícula (tamaño, espacios) a un elemento. */
function applyGridVars(grid) {
  const s = store.getSettings();
  grid.style.setProperty('--icon-size', `${s.iconSize}px`);
  grid.style.setProperty('--spacing', `${s.gridSpacing}px`);
  grid.style.setProperty('--radius', `${s.cardRadius}px`);
  grid.style.setProperty('--columns', String(s.gridColumns));
}

/** Añade los eventos de una tarjeta (clic, teclado, contexto, arrastre). */
function wireCard(card, item, handlers) {
  card.addEventListener('click', (e) => {
    if (card.dataset.longpress === '1') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    handlers.onOpen(item.type, item.data, e);
  });
  card.addEventListener('keydown', (e) => {
    if (card.dataset.longpress === '1') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.key === ' ') return;
      handlers.onOpen(item.type, item.data, e);
    }
  });
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (card.dataset.longpress === '1') return;
    handlers.onContext(item.type, item.data, card, e);
  });
  enableLongPress(card, item, handlers);
  addDragEvents(card, item, handlers);
}

/** Divide los elementos en páginas de columnas × filas. */
function pageSize() {
  const s = store.getSettings();
  return Math.max(1, (s.gridColumns || 5) * (s.gridRows || 4));
}

/** Página visible actual del host (para insertar elementos en la ventana activa). */
export function currentPage(host) {
  if (!host) return 0;
  const pageW = host.clientWidth || 1;
  return Math.max(0, Math.round(host.scrollLeft / pageW));
}

function chunkIntoPages(items) {
  const per = pageSize();
  const pages = [];
  for (let i = 0; i < items.length; i += per) pages.push(items.slice(i, i + per));
  return pages;
}

/** Renderiza las páginas de tarjetas dentro del contenedor (scroll-snap). */
function renderPages(container, pages, buildCard, handlers) {
  const host = el('div', 'grid-pages');
  for (const pageItems of pages) {
    const page = el('div', 'grid-page');
    const grid = el('div', 'grid');
    applyGridVars(grid);
    for (const item of pageItems) {
      const card = buildCard(item);
      wireCard(card, item, handlers);
      grid.appendChild(card);
    }
    page.appendChild(grid);
    host.appendChild(page);
  }
  // La rueda del ratón recorre las páginas lateralmente (tipo móvil):
  // acumula el giro y salta a la página anterior/siguiente de golpe,
  // en ciclo infinito (la última enlaza con la primera y viceversa).
  let wheelAccum = 0;
  let wheelTimer = null;
  host.addEventListener('wheel', (e) => {
    if (pages.length < 2) return;
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    wheelAccum += e.deltaY;
    const step = Math.abs(e.deltaY) > 25 ? Math.abs(e.deltaY) : 40;
    if (Math.abs(wheelAccum) < step) return;
    const dir = wheelAccum > 0 ? 1 : -1;
    wheelAccum = 0;
    const pageW = host.clientWidth || 1;
    const count = pages.length;
    const current = Math.round(host.scrollLeft / pageW);
    const target = (((current + dir) % count) + count) % count;
    // Gap entre la última y la primera: salto inmediato (no arrastrar todo).
    const wraps = (current === count - 1 && target === 0) || (current === 0 && target === count - 1);
    host.scrollTo({ left: target * pageW, behavior: wraps ? 'auto' : 'smooth' });
    if (wheelTimer) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAccum = 0; }, 250);
  }, { passive: false });
  container.appendChild(host);

  // Soltar sobre el FONDO del contenedor (espacio vacío): permitir el drop
  // para que un favorito pueda salir de la carpeta a la cuadrícula raíz.
  host.addEventListener('dragover', (e) => {
    if (e.target.closest('.card')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  });
  host.addEventListener('drop', (e) => {
    if (e.target.closest('.card')) return;
    e.preventDefault();
    const pageIndex = Math.round(host.scrollLeft / (host.clientWidth || 1)) || 0;
    if (handlers.onEmptyDrop) handlers.onEmptyDrop(e, pageIndex);
  });
  return host;
}

/** Renderiza la cuadrícula principal (favoritos y carpetas mezclados en el orden del usuario). */
export function renderGrid(container, handlers) {
  clearNode(container);
  const items = getRootItems();

  return renderPages(
    container,
    chunkIntoPages(items),
    (item) => (item.type === 'folder' ? folderCard(item.data) : bookmarkCard(item.data)),
    handlers
  );
}

export function renderFolderGrid(container, folderId, handlers) {
  clearNode(container);
  const bookmarks = bookmarksInFolder(folderId)
    .slice()
    .sort((a, b) => a.position - b.position);

  if (!bookmarks.length) {
    const empty = el('div', 'folder-empty', 'Esta carpeta está vacía.');
    container.appendChild(empty);
    return empty;
  }

  const cards = bookmarks.map((bm) => ({ type: 'bookmark', data: bm }));
  return renderPages(
    container,
    chunkIntoPages(cards),
    (item) => {
      const card = bookmarkCard(item.data);
      card.dataset.folder = folderId;
      return card;
    },
    handlers
  );;
  return grid;
}

/** Mantener pulsado 7s (táctil/pen) abre el menú. Sustituye a los tres puntos. */
const HOLD_MS = 7000;

function enableLongPress(card, item, handlers) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    card.classList.remove('holding');
  };
  card.addEventListener('pointerdown', (e) => {
    delete card.dataset.longpress;
    if (e.pointerType === 'mouse') return;
    startX = e.clientX;
    startY = e.clientY;
    clear();
    timer = setTimeout(() => {
      timer = null;
      card.classList.remove('holding');
      card.dataset.longpress = '1';
      try {
        navigator.vibrate && navigator.vibrate(30);
      } catch {}
      handlers.onContext(item.type, item.data, card, { clientX: startX, clientY: startY });
    }, HOLD_MS);
    requestAnimationFrame(() => card.classList.add('holding'));
  });
  card.addEventListener('pointermove', (e) => {
    if (timer && Math.hypot(e.clientX - startX, e.clientY - startY) > 12) clear();
  });
  card.addEventListener('pointerup', clear);
  card.addEventListener('pointercancel', clear);
  card.addEventListener('pointerleave', clear);
  card.addEventListener('dragstart', clear);
}

/** Habilita DnD sobre una tarjeta. */
function addDragEvents(card, item, handlers) {
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/x-nova-tile', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
    if (handlers.onDragStart) handlers.onDragStart(item, card);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    if (handlers.onDragEnd) handlers.onDragEnd();
  });
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (handlers.onDragOver) handlers.onDragOver(item, card, e);
  });
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    if (handlers.onDrop) handlers.onDrop(item, card, e);
  });
}