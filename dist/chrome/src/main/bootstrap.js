import { store } from '../storage/store.js';
import { getEffectiveTheme, updateSettings } from '../services/settings.js';
import { getAccentColors } from '../services/accents.js';

/** Aplica el tema actual (o el detectado por el sistema) y el color de acento. */
export function applyTheme() {
  const docEl = document.documentElement;
  const settings = store.getSettings();
  const effective = getEffectiveTheme();
  docEl.setAttribute('data-theme', effective);
  docEl.style.colorScheme = effective;
  const accent = getAccentColors(settings.accent, settings.accentCustom);
  docEl.style.setProperty('--accent', accent.a);
  docEl.style.setProperty('--accent-2', accent.a2);
  docEl.style.setProperty('--accent-3', accent.a3);
  document.body.classList.toggle('animations-off', settings.animations === false);
  return effective;
}

/** Aplica el fondo configurado (color, gradiente o imagen). */
export function applyBackground() {
  const { background } = store.getSettings();
  const body = document.body;
  body.style.background = '';
  body.style.backgroundImage = '';
  body.style.backgroundColor = '';

  if (background.type === 'color') {
    body.style.backgroundColor = background.color;
  } else if (background.type === 'gradient') {
    const { from, to, angle } = background.gradient;
    body.style.backgroundImage = `linear-gradient(${angle}deg, ${from}, ${to})`;
    body.style.backgroundAttachment = 'fixed';
  } else if (background.type === 'image' && background.image) {
    body.style.backgroundImage = `url("${background.image}")`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center';
    body.style.backgroundAttachment = 'fixed';
  } else {
    // Por defecto, un fondo elegante y sobrio.
    body.style.backgroundImage = 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #111827 100%)';
    body.style.backgroundAttachment = 'fixed';
  }
}

/** Atajos de teclado globales. */
export function setupShortcuts(app) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return; // los modales gestionan su propio Escape
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      document.querySelector('.search-input')?.focus();
      return;
    }
    if (ctrl && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      app.renderSiteForm(null);
      return;
    }
    if (ctrl && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      app.renderFolderForm(null);
      return;
    }
  });
}

/** Botón flotante de configuración. */
export function setupFab(app) {
  const fab = document.getElementById('settings-fab');
  fab.addEventListener('click', () => app.openSettings());
}