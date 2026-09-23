import { el } from '../utils/dom.js';
import { openModal, button, field } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { validateBookmarkInput } from '../services/bookmarks.js';
import { getDomain, normalizeUrl, isValidIconSource } from '../utils/url.js';
import { addFolder, renameFolder } from '../services/folders.js';
import { store } from '../storage/store.js';
import { updateWidget } from '../services/widgets.js';
import { t } from '../services/i18n.js';

/** Formulario de añadir/editar sitio. */
export function renderSiteForm({ bookmark = null, onSave }) {
  const title = bookmark ? t('siteForm.title.edit') : t('siteForm.title.add');

  const nameField = field({ label: t('siteForm.name'), value: bookmark?.title ?? '', required: true });
  const urlField = field({
    label: t('siteForm.url'),
    value: bookmark?.url ?? '',
    placeholder: 'https://youtube.com',
    required: true,
  });
  const iconField = field({
    label: t('siteForm.icon'),
    value: bookmark?.icon ?? '',
    placeholder: 'data:image/... o https://…/icono.png',
  });

  const errors = el('div', 'error-text hidden');

  const urlInput = urlField.input;
  urlInput.addEventListener('blur', async () => {
    const value = urlInput.value.trim();
    if (!value || !getDomain(value)) return;
    if (!nameField.input.value.trim()) {
      nameField.input.value = guessTitle(value);
    }
  });

  const saveBtn = button(bookmark ? t('siteForm.save') : t('siteForm.add'), async () => {
    const form = {
      title: nameField.input.value,
      url: urlField.input.value,
      icon: iconField.input.value.trim(),
    };
    const dataErrors = validateBookmarkInput(form);
    if (dataErrors.length) {
      errors.textContent = dataErrors.join('. ');
      errors.classList.remove('hidden');
      return;
    }
    if (form.icon && !isValidIconSource(form.icon)) {
      errors.textContent = t('siteForm.iconError');
      errors.classList.remove('hidden');
      return;
    }
    errors.classList.add('hidden');
    await onSave({ ...form, url: normalizeUrl(form.url), icon: form.icon });
    modal.dispose();
  }, 'primary');

  const cancelBtn = button(t('siteForm.cancel'), () => modal.dispose());

  const body = el('div');
  body.appendChild(nameField.wrap);
  body.appendChild(urlField.wrap);
  body.appendChild(iconField.wrap);
  body.appendChild(errors);

  const modal = openModal({ title, body, actions: [cancelBtn, saveBtn], wide: false });
  return modal;
}

/** Formulario dedicado para cambiar el icono de un favorito. */
export function renderIconForm({ bookmark, onSave }) {
  const source = field({
    label: t('siteForm.icon'),
    value: bookmark?.icon ?? '',
    placeholder: 'https://…/icono.png',
  });

  const preview = el('div', 'icon-preview');
  const previewImg = el('img', 'icon-preview-img');
  previewImg.alt = t('siteForm.iconPreview');
  preview.appendChild(previewImg);
  const previewNote = el('span', 'icon-preview-note hidden');

  const errores = el('div', 'error-text hidden');

  function updatePreview() {
    const value = source.input.value.trim();
    errores.classList.add('hidden');
    if (!value) {
      previewImg.classList.add('hidden');
      previewNote.textContent = t('siteForm.iconEmpty');
      previewNote.classList.remove('hidden');
      return;
    }
    if (!isValidIconSource(value)) {
      previewImg.classList.add('hidden');
      previewNote.textContent = t('siteForm.iconError');
      previewNote.classList.remove('hidden');
      return;
    }
    previewNote.classList.add('hidden');
    previewImg.classList.remove('hidden');
    previewImg.src = value;
  }

  source.input.addEventListener('input', updatePreview);

  const saveBtn = button(t('siteForm.saveIcon'), async () => {
    const value = source.input.value.trim();
    if (value && !isValidIconSource(value)) {
      errores.textContent = t('siteForm.iconError');
      errores.classList.remove('hidden');
      return;
    }
    await onSave(value);
    modal.dispose();
  }, 'primary');

  const useSiteBtn = button(t('siteForm.useFavicon'), async () => {
    await onSave('');
    modal.dispose();
  });

  const cancelBtn = button(t('siteForm.cancel'), () => modal.dispose());

  const body = el('div');
  body.appendChild(source.wrap);
  body.appendChild(preview);
  body.appendChild(errores);
  body.appendChild(el('p', 'privacy-note', t('siteForm.iconHint')));

  const modal = openModal({ title: t('siteForm.iconTitle'), body, actions: [useSiteBtn, cancelBtn, saveBtn], wide: false });
  updatePreview();
  setTimeout(() => previewImg.addEventListener('error', () => {
    previewImg.classList.add('hidden');
    previewNote.textContent = t('siteForm.iconFailed');
    previewNote.classList.remove('hidden');
  }), 0);
  return modal;
}

function guessTitle(urlOrigin) {
  const domain = getDomain(urlOrigin).replace(/^www\./, '');
  const parts = domain.split('.');
  const name = parts.length > 1 ? parts[parts.length - 2] : domain;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Formulario de añadir/renombrar carpeta. */
export function renderFolderForm({ folder = null, onSave }) {
  const title = folder ? t('folderForm.title.edit') : t('folderForm.title.add');
  const nameField = field({ label: t('folderForm.name'), value: folder?.title ?? '', required: true });

  const saveBtn = button(folder ? t('siteForm.save') : t('folderForm.create'), async () => {
    const name = nameField.input.value.trim();
    if (!name) return;
    await onSave(name);
    modal.dispose();
  }, 'primary');

  const cancelBtn = button(t('siteForm.cancel'), () => modal.dispose());

  const body = el('div');
  body.appendChild(nameField.wrap);

  const modal = openModal({ title, body, actions: [cancelBtn, saveBtn] });
  return modal;
}

/** Formulario de configuración del widget de clima (Open-Meteo, gratis). */
export function renderWeatherForm({ widget = null, onSave } = {}) {
  const title = t('widget.configure');
  const locationField = field({ label: t('weatherForm.city'), value: widget?.config?.location ?? '' });

  const saveBtn = button(t('siteForm.save'), async () => {
    await updateWidget(widget?.id ?? findWeatherId(), {
      config: { location: locationField.input.value.trim() },
    });
    toast(t('weatherForm.configured'));
    modal.dispose();
    onSave?.();
  }, 'primary');

  const cancelBtn = button(t('siteForm.cancel'), () => modal.dispose());
  const body = el('div');
  body.appendChild(locationField.wrap);
  const hint = el('p', 'privacy-note', t('weatherForm.hint'));
  body.appendChild(hint);

  const modal = openModal({ title, body, actions: [cancelBtn, saveBtn] });
  return modal;
}

function findWeatherId() {
  const w = store.get().widgets.find((w) => w.type === 'weather');
  return w ? w.id : '';
}

/** Formulario para editar la configuración de un widget (reloj, clima). */
export function renderWidgetForm({ widget, onSave } = {}) {
  if (!widget) return null;
  const cfg = { ...(widget.config || {}) };
  const titles = { clock: t('widget.clock.edit'), date: t('widget.date.edit'), weather: t('widget.weather.edit'), calendar: t('widget.calendar.edit'), notes: t('widget.notes.edit') };
  const title = titles[widget.type] ?? t('widget.edit');

  const body = el('div', 'widget-form');

  // Estado persistente del formulario (ámbito de la función para Guardar).
  let clockFormat = '12h';
  let clockAmpm = true;
  let weatherLocation = '';
  let weatherUnits = 'metric';
  let weatherDetail = 'desc';
  let dateFormat = 'full';

  // Formato del reloj.
  if (widget.type === 'clock') {
    clockFormat = cfg.format === '24h' ? '24h' : '12h';
    clockAmpm = cfg.ampm !== false;

    const formatWrap = el('div', 'settings-row');
    formatWrap.appendChild(el('span', 'settings-label', t('widget.clock.format')));
    const seg = el('div', 'seg');
    let chosen = clockFormat;
    const makeBtn = (v, label) => {
      const b = el('button', 'seg-btn', label);
      b.type = 'button';
      if (chosen === v) b.classList.add('active');
      b.addEventListener('click', () => {
        chosen = v;
        clockFormat = v;
        seg.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      return b;
    };
    seg.appendChild(makeBtn('12h', t('widget.clock.h12')));
    seg.appendChild(makeBtn('24h', t('widget.clock.h24')));
    formatWrap.appendChild(seg);
    body.appendChild(formatWrap);

    const ampmRow = el('div', 'settings-row');
    ampmRow.appendChild(el('span', 'settings-label', t('widget.clock.ampm')));
    const ampmCheck = el('input', 'checkbox');
    ampmCheck.type = 'checkbox';
    ampmCheck.checked = clockAmpm;
    ampmCheck.addEventListener('change', () => {
      clockAmpm = ampmCheck.checked;
    });
    ampmRow.appendChild(ampmCheck);
    body.appendChild(ampmRow);
  }

  // Clima: ubicación, unidades y detalle.
  if (widget.type === 'weather') {
    weatherLocation = cfg.location ?? '';
    weatherUnits = cfg.units === 'imperial' ? 'imperial' : 'metric';

    const locField = field({ label: t('weatherForm.city'), value: weatherLocation });
    body.appendChild(locField.wrap);
    const locInput = locField.input;

    const unitsWrap = el('div', 'settings-row');
    unitsWrap.appendChild(el('span', 'settings-label', t('widget.weather.units')));
    const unitsSeg = el('div', 'seg');
    let units = weatherUnits;
    const makeU = (v, label) => {
      const b = el('button', 'seg-btn', label);
      b.type = 'button';
      if (units === v) b.classList.add('active');
      b.addEventListener('click', () => {
        units = v;
        weatherUnits = v;
        unitsSeg.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      return b;
    };
    unitsSeg.appendChild(makeU('metric', '°C'));
    unitsSeg.appendChild(makeU('imperial', '°F'));
    unitsWrap.appendChild(unitsSeg);
    body.appendChild(unitsWrap);

    const detailWrap = el('div', 'settings-row');
    detailWrap.appendChild(el('span', 'settings-label', t('widget.weather.detail')));
    const detailSeg = el('div', 'seg');
    weatherDetail = cfg.detail || 'desc';
    const makeD = (v, label) => {
      const b = el('button', 'seg-btn', label);
      b.type = 'button';
      if (weatherDetail === v) b.classList.add('active');
      b.addEventListener('click', () => {
        weatherDetail = v;
        detailSeg.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      return b;
    };
    detailSeg.appendChild(makeD('desc', t('widget.weather.desc')));
    detailSeg.appendChild(makeD('wind', t('weather.wind')));
    detailSeg.appendChild(makeD('humidity', t('weather.humidity')));
    detailSeg.appendChild(makeD('feels', t('weather.feels')));
    detailWrap.appendChild(detailSeg);
    body.appendChild(detailWrap);
  }

  // Formato de la fecha.
  if (widget.type === 'date') {
    dateFormat = ['full', 'long', 'medium', 'short', 'numeric', 'daymonth', 'weekday'].includes(cfg.format) ? cfg.format : 'full';

    const formatWrap = el('div', 'settings-row');
    formatWrap.appendChild(el('span', 'settings-label', t('widget.date.format')));
    const formatSeg = el('div', 'seg');
    let chosen = dateFormat;
    const makeF = (v, label) => {
      const b = el('button', 'seg-btn', label);
      b.type = 'button';
      if (chosen === v) b.classList.add('active');
      b.addEventListener('click', () => {
        chosen = v;
        dateFormat = v;
        formatSeg.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      return b;
    };
    formatSeg.appendChild(makeF('full', t('widget.date.full')));
    formatSeg.appendChild(makeF('long', t('widget.date.long')));
    formatSeg.appendChild(makeF('medium', t('widget.date.medium')));
    formatSeg.appendChild(makeF('short', t('widget.date.short')));
    formatSeg.appendChild(makeF('numeric', t('widget.date.numeric')));
    formatSeg.appendChild(makeF('daymonth', t('widget.date.daymonth')));
    formatSeg.appendChild(makeF('weekday', t('widget.date.weekday')));
    formatWrap.appendChild(formatSeg);
    body.appendChild(formatWrap);

    const note = el('p', 'settings-note');
    note.textContent = t('widget.date.note');
    body.appendChild(note);
  }

  if (widget.type === 'calendar' || widget.type === 'notes') {
    const note = el('p', 'settings-note');
    note.textContent = widget.type === 'calendar'
      ? t('widget.calendar.note')
      : t('widget.notes.noteinfo');
    body.appendChild(note);
  }

  // Tamaño del texto, editable por el usuario para cada widget
  // (sustituye al auto-escalado con cqmin).
  let textScale = typeof cfg.textScale === 'number' ? cfg.textScale : 1;

  const scaleWrap = el('div', 'settings-row');
  scaleWrap.appendChild(el('span', 'settings-label', 'Tamaño del texto'));
  const range = document.createElement('input');
  range.type = 'range';
  range.min = 0.5;
  range.max = 2;
  range.step = 0.05;
  range.value = String(textScale);
  const valueOut = el('span', 'settings-value', `${Math.round(textScale * 100)}%`);
  range.addEventListener('input', () => {
    textScale = Number(range.value);
    valueOut.textContent = `${Math.round(textScale * 100)}%`;
  });
  scaleWrap.appendChild(range);
  scaleWrap.appendChild(valueOut);
  body.appendChild(scaleWrap);

  const saveBtn = button('Guardar', async () => {
    const merged = { ...cfg };
    if (widget.type === 'clock') {
      merged.format = clockFormat;
      merged.ampm = clockAmpm;
    }
    if (widget.type === 'weather') {
      merged.location = (locInput && typeof locInput.value === 'string' ? locInput.value : weatherLocation).trim();
      merged.units = weatherUnits;
      merged.detail = weatherDetail;
    }
    if (widget.type === 'date') {
      merged.format = dateFormat;
    }
    merged.textScale = Math.round(textScale * 100) / 100;
    await updateWidget(widget.id, { config: merged });
    toast('Widget actualizado');
    modal.dispose();
    onSave?.();
  }, 'primary');

  const cancelBtn = button('Cancelar', () => modal.dispose());

  const modal = openModal({ title, body, actions: [cancelBtn, saveBtn] });
  return modal;
}