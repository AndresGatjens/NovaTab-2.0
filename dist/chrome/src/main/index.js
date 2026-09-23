import { store } from '../storage/store.js';
import { browserAPI } from '../storage/browser-api.js';
import { applyTheme, applyBackground, setupShortcuts, setupFab } from './bootstrap.js';
import { renderSearchBar } from '../components/search-bar.js';
import { renderGrid, renderFolderGrid, currentPage } from '../components/grid.js';
import { openSettingsPanel } from '../components/settings-panel.js';
import { showContextMenu, hideContextMenu } from '../components/context-menu.js';
import { toast } from '../components/toast.js';
import { renderWidgetsBar } from '../components/widgets.js';
import { updateWidget } from '../services/widgets.js';
import {
  addBookmark,
  updateBookmark,
  removeBookmark,
  moveBookmark,
  reorderBookmark,
} from '../services/bookmarks.js';
import {
  addFolder,
  renameFolder,
  removeFolder,
  reorderFolder,
  topLevelFolders,
} from '../services/folders.js';
import { renderSiteForm, renderFolderForm, renderWeatherForm, renderIconForm, renderWidgetForm } from './forms.js';
import { normalizeUrl } from '../utils/url.js';
import { openBookmark, openSearch } from './openers.js';
import { el } from '../utils/dom.js';
import { bookmarksInFolder } from '../services/bookmarks.js';
import { findFolder } from '../services/folders.js';

/** Controlador principal de la extensión. */
class NewTabApp {
  constructor() {
    this.gridSlot = document.getElementById('grid-slot');
    this.searchSlot = document.getElementById('search-slot');
    this.widgetsSlot = document.getElementById('widgets-slot');
    this.dnd = null;
    this.currentFolderId = null;
    this.handleFolderBgClick = (e) => {
      if (this.currentFolderId == null) return;
      if (e.target.closest('.card')) return;
      if (e.target.closest('.folder-bar')) return;
      if (e.target.closest('.search-slot')) return;
      if (e.target.closest('#widgets-slot')) return;
      if (e.target.closest('.settings-fab')) return;
      if (e.target.closest('.settings-panel')) return;
      if (e.target.closest('.overlay')) return;
      this.goUpToRoot();
    };
    this.handleGridBgContext = (e) => {
      if (e.target.closest('.card')) return;
      if (e.target.closest('.folder-bar')) return;
      if (e.target.closest('.search-slot')) return;
      if (e.target.closest('#widgets-slot')) return;
      if (e.target.closest('.settings-fab')) return;
      if (e.target.closest('.settings-panel')) return;
      if (e.target.closest('.overlay')) return;
      e.preventDefault();
      showContextMenu(
        [
          { label: 'Crear carpeta…', onClick: () => this.renderFolderForm(null) },
          { label: 'Añadir página…', onClick: () => this.renderSiteForm(null) },
        ],
        e.clientX,
        e.clientY
      );
    };
    document.addEventListener('click', this.handleFolderBgClick);
    document.addEventListener('contextmenu', this.handleGridBgContext);
  }

  async start() {
    await store.init();
    applyTheme();
    applyBackground();
    this.renderWidgets();
    this.renderSearch();
    this.renderGrid();
    setupShortcuts(this);
    setupFab(this);
    document.addEventListener('nova:theme', () => {
      applyTheme();
      applyBackground();
      this.renderWidgets();
      this.renderGrid();
    });
    // Refresca la cuadrícula cuando se añade un favorito desde el popup
    // (icono anclado en la barra del navegador).
    const onStorageChanged = browserAPI.raw.storage && browserAPI.raw.storage.onChanged;
    if (onStorageChanged && onStorageChanged.addListener) {
      onStorageChanged.addListener((changes, area) => {
        if (area === 'local' && changes['novaNewTab.state.v1']) {
          store.init().then(() => {
            applyTheme();
            applyBackground();
            this.renderWidgets();
            this.renderSearch();
            this.renderGrid();
          });
        }
      });
    }
  }

  renderSearch() {
    this.searchSlot.innerHTML = '';
    const bar = renderSearchBar(null, {
      onSearch: () => {},
      onSettings: () => this.openSettings('general'),
    });
    this.searchSlot.appendChild(bar);
    const input = bar.querySelector('.search-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        openSearch(input.value);
        input.value = '';
      }
    });
  }

  openSettings(section) {
    const panel = openSettingsPanel(() => {
      // Refrescar la interfaz al cerrar (p. ej. tras importar configuración).
      applyTheme();
      applyBackground();
      this.renderWidgets();
      this.renderSearch();
      this.renderGrid();
    });
    if (section && panel.renderSection) {
      panel.renderSection(section);
      panel.panel
        .querySelectorAll('.settings-tab')
        .forEach((b) => b.classList.remove('active'));
      const tab = panel.panel.querySelector(`.settings-tab[data-sec="${section}"]`);
      if (tab) tab.classList.add('active');
    }
    return panel;
  }

  renderWidgets() {
    this.widgetsSlot.innerHTML = '';
    const bar = renderWidgetsBar(null, {
      onChange: () => {
        this.renderWidgets();
      },
      onEdit: (widget) => this.renderWidgetForm(widget),
      onWeatherConfig: (widget) => this.renderWeatherForm({ widget }),
      onDrop: async (widget, x, y) => {
        await updateWidget(widget.id, {
          config: { ...(widget.config || {}), x: Math.round(x), y: Math.round(y) },
        });
        this.renderWidgets();
      },
    });
    this.widgetsSlot.appendChild(bar);
  }

  renderWidgetForm(widget) {
    renderWidgetForm({ widget, onSave: () => this.renderWidgets() });
  }

  renderGrid() {
    this.gridSlot.innerHTML = '';
    const folderId = this.currentFolderId;
    const common = {
      onOpen: (kind, data) => this.openItem(kind, data),
      onContext: (kind, data, card, e) => this.onContextItem(kind, data, e),
      onDragStart: (item, card) => {
        this.dragItem = { ...item, fromFolder: card.dataset.folder ?? (folderId ?? 'root') };
      },
      onDragOver: (targetItem, targetCard) => this.onCardDragOver(targetItem, targetCard),
      onDrop: (targetItem, targetCard) => this.onCardDrop(targetItem, targetCard),
      onEmptyDrop: (e) => this.onEmptyDrop(e),
      onDragEnd: () => {
        this.dragItem = null;
      },
    };
    if (folderId != null) {
      // Vista de carpeta: barra de navegación + contenido en la cuadrícula.
      this.renderFolderBar(folderId);
      const folderHost = el('div', 'folder-grid-host');
      this.gridSlot.appendChild(folderHost);
      this.gridHost = renderFolderGrid(folderHost, folderId, common);
    } else {
      this.gridHost = renderGrid(this.gridSlot, common);
    }
  }

  renderFolderBar(folderId) {
    const folder = findFolder(folderId);
    const bar = el('div', 'folder-bar');
    const back = el('button', 'folder-bar-back');
    back.type = 'button';
    back.setAttribute('aria-label', 'Volver a la cuadrícula principal');
    back.title = 'Volver';
    back.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
    back.addEventListener('click', () => this.goUpToRoot());

    const title = el('button', 'folder-bar-title');
    title.type = 'button';
    title.textContent = folder ? folder.title : 'Carpeta';
    title.title = title.textContent;
    title.setAttribute('aria-label', folder ? `Carpeta ${folder.title}` : 'Carpeta');
    title.addEventListener('click', () => this.goUpToRoot());

    const count = el('span', 'folder-bar-count', `${String(bookmarksInFolder(folderId).length)} elementos`);

    const add = el('button', 'folder-bar-add');
    add.type = 'button';
    add.setAttribute('aria-label', 'Añadir favorito a esta carpeta');
    add.title = 'Añadir favorito';
    add.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>';
    add.addEventListener('click', () => this.renderSiteForm(null));

    bar.appendChild(back);
    bar.appendChild(title);
    bar.appendChild(count);
    bar.appendChild(add);
    this.gridSlot.appendChild(bar);
  }

  showFolder(folderId) {
    if (folderId == null) return;
    this.currentFolderId = folderId;
    this.renderGrid();
  }

  goUpToRoot() {
    this.currentFolderId = null;
    this.renderGrid();
  }

  openItem(kind, data) {
    if (kind === 'folder') {
      this.showFolder(data.id);
      return;
    }
    openBookmark(data);
  }

  onContextItem(kind, data, e) {
    if (kind === 'bookmark') {
      this.bookmarkMenu(data, e);
    } else {
      this.folderMenu(data, e);
    }
  }

  bookmarkMenu(bm, e) {
    const folders = topLevelFolders();
    const submenu = [
      { label: 'Sin carpeta', onClick: () => this.moveToFolder(bm, null) },
      ...folders.map((f) => ({ label: f.title, onClick: () => this.moveToFolder(bm, f.id) })),
    ];
    if (folders.length) submenu.unshift({ separator: true });
    showContextMenu(
      [
        { label: 'Abrir', onClick: () => openBookmark(bm) },
        { label: 'Abrir en nueva pestaña', onClick: () => { const s = store.getSettings(); openBookmark(bm, s.linkBehavior === 'current'); } },
        { label: 'Editar…', onClick: () => this.renderSiteForm(bm) },
        { label: 'Cambiar icono…', onClick: () => this.renderIconForm(bm) },
        { label: 'Mover a carpeta…', submenu },
        { label: 'Copiar URL', onClick: () => this.copyUrl(bm.url) },
        { separator: true },
        { label: 'Eliminar', danger: true, onClick: () => this.removeSite(bm) },
      ],
      e.clientX,
      e.clientY
    );
  }

  folderMenu(folder, e) {
    showContextMenu(
      [
        { label: 'Entrar', onClick: () => this.showFolder(folder.id) },
        { label: 'Renombrar…', onClick: () => this.renderFolderForm(folder) },
        { separator: true },
        { label: 'Eliminar', danger: true, onClick: () => this.removeFolderAction(folder) },
      ],
      e.clientX,
      e.clientY
    );
  }

  async moveToFolder(bm, folderId) {
    await moveBookmark(bm.id, folderId);
    hideContextMenu();
    this.renderGrid();
    this.renderWidgets();
  }

  copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => toast('URL copiada')).catch(() => toast('No se pudo copiar', 'error'));
    hideContextMenu();
  }

  async removeSite(bm) {
    hideContextMenu();
    await removeBookmark(bm.id);
    this.renderGrid();
    toast('Favorito eliminado');
  }

  async removeFolderAction(folder) {
    hideContextMenu();
    await removeFolder(folder.id);
    if (this.currentFolderId === folder.id) this.currentFolderId = null;
    this.renderGrid();
    toast('Carpeta eliminada (los favoritos quedaron en el nivel superior)');
  }

  renderSiteForm(bm) {
    renderSiteForm({
      bookmark: bm,
      onSave: async (form) => {
        if (bm) {
          await updateBookmark(bm.id, {
            title: form.title,
            url: normalizeUrl(form.url),
            icon: form.icon,
          });
          toast('Favorito actualizado');
        } else {
          await addBookmark({
            title: form.title,
            url: form.url,
            icon: form.icon,
            folderId: this.currentFolderId ?? null,
          });
          toast('Favorito añadido');
        }
        this.renderGrid();
      },
    });
  }

  renderIconForm(bm) {
    renderIconForm({
      bookmark: bm,
      onSave: async (icon) => {
        await updateBookmark(bm.id, { icon: icon || '' });
        toast(icon ? 'Icono actualizado' : 'Icono restablecido (favicon del sitio)');
        this.renderGrid();
      },
    });
  }

  renderFolderForm(folder) {
    renderFolderForm({
      folder: folder || null,
      onSave: async (title) => {
        if (folder) {
          await renameFolder(folder.id, title);
          toast('Carpeta renombrada');
        } else {
          const s = store.getSettings();
          const per = Math.max(1, (s.gridColumns || 5) * (s.gridRows || 4));
          const pos = currentPage(this.gridHost) * per;
          await addFolder(title, null, pos);
          toast('Carpeta creada');
        }
        this.renderGrid();
      },
    });
  }

  renderWeatherForm() {
    renderWeatherForm({ onSave: () => this.renderWidgets() });
  }

  onGridDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async onCardDragOver(targetItem, targetCard) {
    const src = this.dragItem;
    if (!src || !targetCard) return;
    document.querySelectorAll('.drop-target').forEach((c) => c.classList.remove('drop-target'));
    if (src.type === 'bookmark' && targetItem.type === 'folder') {
      if (src.fromFolder !== targetItem.data.id) targetCard.classList.add('drop-target');
    }
  }

  async onCardDrop(targetItem, targetCard) {
    const src = this.dragItem;
    if (!src) return;
    document.querySelectorAll('.drop-target').forEach((c) => c.classList.remove('drop-target'));

    if (src.type === 'bookmark') {
      const sourceId = src.data.id;
      if (targetItem.type === 'folder') {
        // Mover el favorito a la carpeta destino.
        if ((src.fromFolder ?? null) !== targetItem.data.id) {
          await moveBookmark(sourceId, targetItem.data.id);
          toast(`Movido a "${targetItem.data.title}"`);
        }
      } else {
        // Reordenar dentro de la misma carpeta.
        const folderId = src.fromFolder === 'root' ? null : src.fromFolder;
        const sameFolder = (targetCard.dataset.folder ?? 'root') === (src.fromFolder ?? 'root');
        if (sameFolder) {
          const grid = targetCard.parentElement;
          const cards = [...grid.querySelectorAll('.card[data-kind]')];
          const draggedCard = cards.find((c) => c.dataset.id === sourceId);
          const siblings = cards.filter((c) => (c.dataset.folder ?? 'root') === (src.fromFolder ?? 'root'));
          const targetIndex = siblings.indexOf(targetCard);
          const currentIndex = siblings.indexOf(draggedCard);
          const insertAt = currentIndex < targetIndex ? targetIndex : targetIndex;
          await reorderBookmark(sourceId, insertAt, folderId);
        }
      }
    } else if (src.type === 'folder' && targetItem.type === 'folder') {
      const folders = topLevelFolders();
      const targetIndex = folders.findIndex((f) => f.id === targetItem.data.id);
      await reorderFolder(src.data.id, targetIndex);
    }
    this.refreshAfterDrop();
  }

  refreshAfterDrop() {
    this.renderGrid();
  }

  /** Soltar sobre el espacio vacío: mover carpeta o favorito a la página/ventana destino. */
  async onEmptyDrop(e, pageIndex = 0) {
    const src = this.dragItem;
    if (!src) return;
    const per = Math.max(1, (store.getSettings().gridColumns || 5) * (store.getSettings().gridRows || 4));

    if (src.type === 'folder') {
      await reorderFolder(src.data.id, pageIndex * per);
      this.renderGrid();
      toast('Carpeta movida');
      return;
    }

    const inFolder = this.currentFolderId;
    const fromFolder = src.fromFolder === 'root' ? null : src.fromFolder;
    if (inFolder != null) {
      // Vista de carpeta: reordenar el icono dentro de la misma carpeta hacia la página destino.
      await reorderBookmark(src.data.id, pageIndex * per, inFolder);
      this.renderGrid();
      toast('Icono movido');
      return;
    }
    if (fromFolder == null) {
      // Raíz → raíz: reordenar el icono en la página destino (los bookmarks van tras las carpetas).
      const offset = topLevelFolders().length;
      await reorderBookmark(src.data.id, Math.max(0, pageIndex * per - offset));
      this.renderGrid();
      toast('Icono movido');
      return;
    }
    // Carrera de otra carpeta → raíz, colocado en la página destino.
    await moveBookmark(src.data.id, null);
    await reorderBookmark(src.data.id, Math.max(0, pageIndex * per - topLevelFolders().length));
    this.renderGrid();
    toast('Movido a la cuadrícula');
  }
}

export const app = new NewTabApp();
app.start();