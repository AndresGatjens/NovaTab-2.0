import { el } from '../utils/dom.js';
import { SEARCH_ENGINES, buildSearchUrl } from '../utils/url.js';
import { store } from '../storage/store.js';
import { updateSettings } from '../services/settings.js';
import { t } from '../services/i18n.js';

/** Barra de búsqueda grande y centrada con selector de motor. */

export function renderSearchBar(app, { onSearch, onSettings }) {
  const bar = el('div', 'search-wrap');

  const engineSel = el('div', 'engine-sel');
  engineSel.setAttribute('role', 'listbox');
  engineSel.setAttribute('aria-label', t('search.settings'));

  const engineBtn = el('button', 'engine-btn');
  engineBtn.type = 'button';
  engineBtn.setAttribute('aria-haspopup', 'listbox');

  const engineMenu = el('div', 'engine-menu');
  engineMenu.hidden = true;

  const input = el('input', 'search-input');
  input.type = 'search';
  input.placeholder = t('search.placeholder');
  input.setAttribute('aria-label', t('search.placeholder'));
  input.autocomplete = 'off';
  input.spellcheck = false;

  const submit = el('button', 'search-btn');
  submit.type = 'button';
  submit.setAttribute('aria-label', t('config.search'));
  submit.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.51 4.51 0 0 1 9.5 14z"/></svg>`;

  function currentEngine() {
    return store.getSettings().searchEngine;
  }

  function renderEngineButton() {
    const key = currentEngine();
    const engine = SEARCH_ENGINES[key];
    const label = key === 'custom' ? t('config.engine.custom') : (engine ? engine.name : 'Google');
    engineBtn.innerHTML = `<span class="engine-name">${label}</span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>`;
  }

  function renderMenu() {
    clearMenu();
    const options = [
      ...Object.entries(SEARCH_ENGINES).map(([key, { name }]) => ({ key, name })),
      { key: 'custom', name: `${t('config.engine.custom')}…` },
      { key: '__settings', name: t('config.search') + '…' },
    ];
    for (const option of options) {
      const item = el('button', 'engine-item');
      item.type = 'button';
      item.textContent = option.name;
      item.setAttribute('role', 'option');
      item.addEventListener('click', () => {
        if (option.key === '__settings') {
          closeMenu();
          onSettings('general');
          return;
        }
        if (option.key === 'custom') {
          closeMenu();
          onSettings('general');
          return;
        }
        updateSettings({ searchEngine: option.key });
        renderEngineButton();
        closeMenu();
        input.focus();
      });
      engineMenu.appendChild(item);
    }
  }

  function clearMenu() {
    while (engineMenu.firstChild) engineMenu.removeChild(engineMenu.firstChild);
  }

  function closeMenu() {
    engineMenu.hidden = true;
    engineBtn.setAttribute('aria-expanded', 'false');
  }

  engineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = engineMenu.hidden;
    renderMenu();
    engineMenu.hidden = !willOpen;
    engineBtn.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', () => closeMenu(), true);

  async function doSearch() {
    const query = input.value.trim();
    if (!query) return;
    const settings = store.getSettings();
    const url = buildSearchUrl(settings.searchEngine, query, settings.customSearchUrl);
    if (settings.linkBehavior === 'new') {
      window.open(url, '_blank', 'noopener');
    } else {
      window.location.href = url;
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') closeMenu();
  });
  submit.addEventListener('click', doSearch);

  engineSel.appendChild(engineBtn);
  engineSel.appendChild(engineMenu);

  const searchBox = el('div', 'search-box');
  searchBox.appendChild(engineSel);
  searchBox.appendChild(input);
  searchBox.appendChild(submit);
  bar.appendChild(searchBox);

  renderEngineButton();
  return bar;
}