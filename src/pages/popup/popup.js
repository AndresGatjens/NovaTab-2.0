import { browserAPI } from '../../storage/browser-api.js';
import { store } from '../../storage/store.js';
import { addBookmark, updateBookmark } from '../../services/bookmarks.js';
import { normalizeUrl, getDomain } from '../../utils/url.js';

const $ = (sel) => document.querySelector(sel);

function toPromise(call) {
  try {
    const result = call();
    return result && typeof result.then === 'function' ? result : Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

function isAddable(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function setStatus(text, kind = '') {
  const status = $('#status');
  if (!text) {
    status.hidden = true;
    status.textContent = '';
    status.className = 'status';
    return;
  }
  status.hidden = false;
  status.textContent = text;
  status.className = 'status' + (kind ? ` ${kind}` : '');
}

function setSiteIcon(tab) {
  const box = document.querySelector('.site-icon');
  const host = document.createElement('img');
  const fallback = () => {
    box.textContent = '';
    box.appendChild(document.createTextNode((tab.title || getDomain(tab.url) || '?').trim().charAt(0).toUpperCase() || '?'));
  };
  host.addEventListener('error', fallback);
  const src = (tab.favIconUrl && /^(https?|data):/.test(tab.favIconUrl)) ? tab.favIconUrl : getDomain(tab.url) ? `https://${getDomain(tab.url)}/favicon.ico` : '';
  if (!src) {
    fallback();
    return;
  }
  box.textContent = '';
  host.src = src;
  box.appendChild(host);
}

async function run() {
  const addBtn = $('#add-btn');
  const tabBtn = $('#tab-btn');
  const titleEl = $('#site-title');
  const domainEl = $('#site-domain');

  let tab = null;
  try {
    const tabs = await toPromise(() => browserAPI.raw.tabs.query({ active: true, currentWindow: true }));
    tab = tabs && tabs[0];
  } catch {
    tab = null;
  }

  if (!tab || !isAddable(tab.url)) {
    titleEl.textContent = 'Página no disponible';
    domainEl.textContent = '';
    setSiteIcon({ title: '?' });
    setStatus('Esta página no se puede añadir a la cuadrícula.', 'err');
    addBtn.disabled = true;
    tabBtn.addEventListener('click', () => {
      toPromise(() => browserAPI.raw.tabs.create({})).then(() => window.close());
    });
    return;
  }

  const url = normalizeUrl(tab.url);
  const title = (tab.title || getDomain(url) || url).trim();

  titleEl.textContent = title;
  domainEl.textContent = getDomain(url);
  setSiteIcon(tab);
  setStatus('');

  addBtn.addEventListener('click', async () => {
    addBtn.disabled = true;
    try {
      await store.init();
      const existing = store.get().bookmarks.find((b) => normalizeUrl(b.url) === url);
      if (existing) {
        if (existing.title !== title) await updateBookmark(existing.id, { title });
        setStatus('Ya está en la cuadrícula.', 'ok');
      } else {
        await addBookmark({ title, url });
        setStatus('Añadido a la cuadrícula.', 'ok');
      }
    } catch (error) {
      addBtn.disabled = false;
      setStatus('No se pudo añadir. Inténtalo de nuevo.', 'err');
    }
  });

  tabBtn.addEventListener('click', () => {
    toPromise(() => browserAPI.raw.tabs.create({})).then(() => window.close());
  });
}

run();