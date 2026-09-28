import { el } from '../utils/dom.js';
import { store } from '../storage/store.js';
import { topLevelFolders, addFolder, renameFolder, removeFolder, findFolder, moveFolderToRoot, reorderFolder } from '../services/folders.js';
import { bookmarksInFolder, addBookmark, updateBookmark, removeBookmark, moveBookmark, reorderBookmark } from '../services/bookmarks.js';
import { resolveFaviconSource, generatedFaviconDataUrl } from '../services/favicon.js';
import { normalizeUrl } from '../utils/url.js';
import { toast } from './toast.js';
import { t } from '../services/i18n.js';

/**
 * Gestor de la cuadrícula: carpetas, enlaces y su orden, TODO dentro de la
 * extensión (antes vivía en una app local aparte, 127.0.0.1:8734, que además
 * ya no está en el disco).  Columna izquierda las carpetas, a la derecha la
 * rejilla de enlaces de la carpeta elegida.
 */

/** Icono de la carpeta, reutilizando el del marcador si lo tiene. */
function folderGlyph() {
  const span = el('span', 'gestor-glyph');
  span.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>';
  return span;
}

function linkGlyph() {
  const span = el('span', 'gestor-glyph');
  span.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z"/></svg>';
  return span;
}

/** Icono pequeño de un enlace: el suyo, o la inicial con color. */
function linkIcon(bm) {
  const img = el('img', 'gestor-link-icon');
  img.alt = '';
  img.loading = 'lazy';
  const { type, src } = resolveFaviconSource(bm);
  if (type === 'generated') {
    img.src = generatedFaviconDataUrl(bm);
  } else {
    img.src = src;
    img.addEventListener('error', () => {
      img.onerror = null;
      img.src = generatedFaviconDataUrl(bm);
    });
  }
  return img;
}

/** Botón de icono con texto, para las acciones de cada fila/tarjeta. */
function actionBtn(label, title, onClick) {
  const b = el('button', 'gestor-btn', label);
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Pinta el Gestor dentro de `host`.
 * `onChange` se llama cuando se toca algo, para que la página se refresque.
 */
export function renderGestor(host, { onChange } = {}) {
  // Estado local de la vista: carpeta abierta y texto de búsqueda.
  let currentFolderId = null;
  let query = '';
  // Id del enlace o de la carpeta que se está arrastrando.
  let arrastreId = null;
  let arrastreEsCarpeta = false;

  const layout = el('div', 'gestor');
  const side = el('aside', 'gestor-side');
  const main = el('section', 'gestor-main');
  layout.appendChild(side);
  layout.appendChild(main);
  host.appendChild(layout);

  const changed = () => {
    if (typeof onChange === 'function') onChange();
  };

  /** Quita la marca de destino de las tarjetas y carpetas. */
  function limpiarSoltar() {
    for (const n of layout.querySelectorAll('.soltar')) n.classList.remove('soltar');
  }

  /**
   * Reordena enlaces: el arrastrado ocupa el hueco del soltado. Mismo criterio
   * que `reordenarEnCarpeta` de la app web — se quita el origen de la lista
   * antes de buscar el destino, para que los índices no se desplacen.
   */
  async function reordenar(movId, refId) {
    if (query) return; // con búsqueda la vista no es el orden real
    const lista = bookmarksInFolder(currentFolderId);
    const ids = lista.map((b) => b.id).filter((x) => x !== movId);
    const idx = ids.indexOf(refId);
    if (idx < 0) return;
    await reorderBookmark(movId, idx, currentFolderId);
    refresh();
    changed();
    toast(t('config.gestor.orderUpdated'));
  }

  /** Reordena carpetas: la arrastrada ocupa el hueco de la soltada. */
  async function reordenarCarpeta(movId, refId) {
    const lista = topLevelFolders();
    const ids = lista.map((f) => f.id).filter((x) => x !== movId);
    const idx = ids.indexOf(refId);
    if (idx < 0) return;
    await reorderFolder(movId, idx);
    refresh();
    changed();
    toast(t('config.gestor.orderUpdated'));
  }

  /** Carpetas con su número de enlaces. */
  function foldersWithCount() {
    return topLevelFolders().map((f) => ({ folder: f, count: bookmarksInFolder(f.id).length }));
  }

  function renderSide() {
    side.innerHTML = '';
    const title = el('h4', 'gestor-side-title', t('config.gestor.folders'));
    side.appendChild(title);

    const list = el('div', 'gestor-folders');
    const rootCount = bookmarksInFolder(null).length;
    const rootBtn = el('button', 'gestor-folder');
    rootBtn.type = 'button';
    if (currentFolderId === null) rootBtn.classList.add('active');
    rootBtn.appendChild(folderGlyph());
    rootBtn.appendChild(el('span', 'gestor-folder-name', t('config.gestor.root')));
    rootBtn.appendChild(el('span', 'gestor-count', String(rootCount)));
    rootBtn.addEventListener('click', () => {
      currentFolderId = null;
      refresh();
    });
    list.appendChild(rootBtn);

    for (const { folder, count } of foldersWithCount()) {
      const row = el('div', 'gestor-folder-row');
      const btn = el('button', 'gestor-folder');
      btn.type = 'button';
      if (currentFolderId === folder.id) btn.classList.add('active');
      btn.appendChild(folderGlyph());
      btn.appendChild(el('span', 'gestor-folder-name', folder.title));
      btn.appendChild(el('span', 'gestor-count', String(count)));
      btn.addEventListener('click', () => {
        currentFolderId = folder.id;
        refresh();
      });

      // Arrastrar una carpeta sobre otra para reposicionarla.
      row.draggable = true;
      row.addEventListener('dragstart', (e) => {
        arrastreId = folder.id;
        arrastreEsCarpeta = true;
        e.dataTransfer.setData('text/id', folder.id);
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        arrastreId = null;
        arrastreEsCarpeta = false;
        row.classList.remove('dragging');
        limpiarSoltar();
      });
      row.addEventListener('dragover', (e) => {
        if (!arrastreEsCarpeta) return; // solo carpetas
        const id = e.dataTransfer.getData('text/id');
        if (!id || id === folder.id) return;
        e.preventDefault();
        e.stopPropagation();
        row.classList.add('soltar');
      });
      row.addEventListener('dragleave', () => row.classList.remove('soltar'));
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('soltar');
        const id = e.dataTransfer.getData('text/id') || arrastreId;
        if (!id || id === folder.id) return;
        await reordenarCarpeta(id, folder.id);
      });

      row.appendChild(btn);

      const tools = el('div', 'gestor-tools');
      // Mover la carpeta (igual que los enlaces). No hay carpetas anidadas en
      // la interfaz, así que el destino disponible es la raíz.
      tools.appendChild(
        actionBtn('→', t('config.gestor.moveFolder'), async () => {
          const sel = el('select', 'gestor-select');
          const rootOpt = el('option', '', t('config.gestor.root'));
          rootOpt.value = '';
          sel.appendChild(rootOpt);
          for (const f of topLevelFolders()) {
            if (f.id === folder.id) continue;
            const opt = el('option', '', f.title);
            opt.value = f.id;
            sel.appendChild(opt);
          }
          sel.style.cssText = 'width:auto;min-width:110px';
          const holder = el('div');
          holder.style.cssText = 'position:fixed;left:50%;top:50%;z-index:999;display:grid;gap:8px;background:var(--card-bg);padding:14px;border:1px solid var(--card-border);border-radius:12px';
          const label = el('div', '', t('config.gestor.moveFolderPrompt', { n: folder.title }));
          const row2 = el('div');
          row2.style.cssText = 'display:flex;gap:6px';
          row2.appendChild(sel);
          const ok = el('button', 'btn btn-primary', t('config.gestor.confirm'));
          const cancel = el('button', 'btn', t('config.gestor.cancel'));
          row2.appendChild(ok);
          row2.appendChild(cancel);
          holder.appendChild(label);
          holder.appendChild(row2);
          document.body.appendChild(holder);
          const close = () => holder.remove();
          cancel.addEventListener('click', close);
          ok.addEventListener('click', async () => {
            const destino = sel.value || null;
            close();
            // Con otra carpeta: toma la posición de esa carpeta.
            if (destino && destino !== folder.id) {
              const lista = topLevelFolders();
              const ids = lista.map((f) => f.id).filter((x) => x !== folder.id);
              const idx = ids.indexOf(destino);
              if (idx >= 0) await reorderFolder(folder.id, idx);
            } else if (!destino) {
              await moveFolderToRoot(folder.id);
            }
            refresh();
            changed();
            toast(t('config.gestor.folderMoved'));
          });
        })
      );
      tools.appendChild(
        actionBtn('✎', t('config.gestor.rename'), () => {
          const title2 = window.prompt(t('config.gestor.rename'), folder.title);
          if (title2 == null) return;
          const clean = title2.trim();
          if (!clean || clean === folder.title) return;
          renameFolder(folder.id, clean).then(() => {
            toast(t('config.gestor.folderRenamed'));
            refresh();
            changed();
          });
        })
      );
      tools.appendChild(
        actionBtn('✕', t('config.gestor.removeFolder'), () => {
          if (!window.confirm(t('config.gestor.confirmRemoveFolder'))) return;
          removeFolder(folder.id).then(() => {
            if (currentFolderId === folder.id) currentFolderId = null;
            toast(t('config.gestor.folderRemoved'));
            refresh();
            changed();
          });
        })
      );
      row.appendChild(tools);
      list.appendChild(row);
    }
    side.appendChild(list);

    const add = el('button', 'btn gestor-add-folder', t('config.gestor.newFolder'));
    add.type = 'button';
    add.addEventListener('click', () => {
      const title2 = window.prompt(t('config.gestor.newFolderPrompt'));
      if (title2 == null) return;
      const clean = title2.trim();
      if (!clean) return;
      addFolder(clean, null, topLevelFolders().length).then((f) => {
        currentFolderId = f.id;
        toast(t('config.gestor.folderCreated'));
        refresh();
        changed();
      });
    });
    side.appendChild(add);
  }

  /** Cabecera con buscador y botón de añadir enlace. */
  function renderMainHeader() {
    const bar = el('div', 'gestor-bar');
    const name = el('div', 'gestor-current');
    const folder = currentFolderId === null ? null : findFolder(currentFolderId);
    name.textContent = folder ? folder.title : t('config.gestor.root');
    bar.appendChild(name);

    const search = el('input', 'gestor-search');
    search.type = 'search';
    search.placeholder = t('config.gestor.search');
    search.value = query;
    search.addEventListener('input', () => {
      query = search.value;
      renderGrid();
    });
    bar.appendChild(search);

    const add = el('button', 'btn btn-primary', t('config.gestor.newLink'));
    add.type = 'button';
    add.addEventListener('click', async () => {
      const title2 = window.prompt(t('config.gestor.newLinkPrompt'));
      if (title2 == null) return;
      const url = window.prompt(t('config.gestor.urlPrompt'), 'https://');
      if (url == null) return;
      const clean = normalizeUrl(url);
      if (!title2.trim() || !clean) {
        toast(t('config.gestor.invalidLink'), 'error');
        return;
      }
      await addBookmark({ title: title2.trim(), url: clean, icon: '', folderId: currentFolderId });
      toast(t('config.gestor.linkAdded'));
      refresh();
      changed();
    });
    bar.appendChild(add);
    return bar;
  }

  /** Rejilla de enlaces de la carpeta abierta, con búsqueda aplicada. */
  function renderGrid() {
    const old = main.querySelector('.gestor-grid, .gestor-empty');
    if (old) old.remove();

    const all = bookmarksInFolder(currentFolderId);
    const q = query.trim().toLowerCase();
    const items = q
      ? all.filter((b) => `${b.title} ${b.url}`.toLowerCase().includes(q))
      : all;

    if (!items.length) {
      main.appendChild(el('p', 'gestor-empty', q ? t('config.gestor.noResults') : t('config.gestor.noLinks')));
      return;
    }

    const grid = el('div', 'gestor-grid');
    items.forEach((bm) => {
      const card = el('div', 'gestor-card');

      const head = el('div', 'gestor-card-head');
      head.appendChild(linkIcon(bm));
      head.appendChild(
        actionBtn('✕', t('config.gestor.removeLink'), async () => {
          if (!window.confirm(t('config.gestor.confirmRemoveLink'))) return;
          await removeBookmark(bm.id);
          toast(t('config.gestor.linkRemoved'));
          refresh();
          changed();
        })
      );
      card.appendChild(head);

      const title = el('div', 'gestor-card-title', bm.title);
      title.title = bm.title;
      card.appendChild(title);
      const url = el('div', 'gestor-card-url', bm.url);
      url.title = bm.url;
      card.appendChild(url);

      const foot = el('div', 'gestor-card-foot');
      // Mover a otra carpeta.
      const select = el('select', 'gestor-select');
      const rootOpt = el('option', '', t('config.gestor.root'));
      rootOpt.value = '';
      select.appendChild(rootOpt);
      for (const f of topLevelFolders()) {
        if (f.id === currentFolderId) continue;
        const opt = el('option', '', f.title);
        opt.value = f.id;
        select.appendChild(opt);
      }
      select.value = currentFolderId === null ? '' : currentFolderId;
      select.addEventListener('change', async () => {
        await moveBookmark(bm.id, select.value || null);
        toast(t('config.gestor.linkMoved'));
        refresh();
        changed();
      });
      foot.appendChild(select);

      const edit = actionBtn('✎', t('config.gestor.editLink'), async () => {
        const title2 = window.prompt(t('config.gestor.editLink'), bm.title);
        if (title2 == null) return;
        const url2 = window.prompt(t('config.gestor.urlPrompt'), bm.url);
        if (url2 == null) return;
        const clean = normalizeUrl(url2);
        if (!title2.trim() || !clean) {
          toast(t('config.gestor.invalidLink'), 'error');
          return;
        }
        await updateBookmark(bm.id, { title: title2.trim(), url: clean });
        toast(t('config.gestor.linkUpdated'));
        refresh();
        changed();
      });
      foot.appendChild(edit);
      card.appendChild(foot);

      // Arrastrar la tarjeta sobre otra para ocupar su lugar en el orden.
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        arrastreId = bm.id;
        e.dataTransfer.setData('text/id', bm.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        arrastreId = null;
        limpiarSoltar();
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/id');
        if (id && id !== bm.id) card.classList.add('soltar');
      });
      card.addEventListener('dragleave', () => card.classList.remove('soltar'));
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        card.classList.remove('soltar');
        const id = e.dataTransfer.getData('text/id') || arrastreId;
        if (!id || id === bm.id) return;
        await reordenar(id, bm.id);
      });

      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function renderMain() {
    main.innerHTML = '';
    main.appendChild(renderMainHeader());
    const all = bookmarksInFolder(currentFolderId).length;
    const sub = el('div', 'gestor-sub', t('config.gestor.count', { n: all }));
    main.appendChild(sub);
    renderGrid();
  }

  function refresh() {
    renderSide();
    renderMain();
  }

  refresh();
  return { refresh };
}
