import { el } from '../utils/dom.js';
import { openModal, button, field } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { validateBookmarkInput } from '../services/bookmarks.js';
import { getDomain, normalizeUrl, isValidIconSource } from '../utils/url.js';
import { addFolder, renameFolder } from '../services/folders.js';
import { store } from '../storage/store.js';
import { updateWidget } from '../services/widgets.js';

/** Formulario de añadir/editar sitio. */
export function renderSiteForm({ bookmark = null, onSave }) {
  const title = bookmark ? 'Editar sitio' : 'Añadir sitio';

  const nameField = field({ label: 'Nombre', value: bookmark?.title ?? '', required: true });
  const urlField = field({
    label: 'URL',
    value: bookmark?.url ?? '',
    placeholder: 'https://youtube.com',
    required: true,
  });
  const iconField = field({
    label: 'Icono (opcional)',
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

  const saveBtn = button(bookmark ? 'Guardar' : 'Añadir', async () => {
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
      errors.textContent = 'El icono debe ser una URL https://, data:image/... o dejarlo vacío';
      errors.classList.remove('hidden');
      return;
    }
    errors.classList.add('hidden');
    await onSave({ ...form, url: normalizeUrl(form.url), icon: form.icon });
    modal.dispose();
  }, 'primary');

  const cancelBtn = button('Cancelar', () => modal.dispose());

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
    label: 'Icono (URL https:// o data:image/...)',
    value: bookmark?.icon ?? '',
    placeholder: 'https://…/icono.png',
  });

  const preview = el('div', 'icon-preview');
  const previewImg = el('img', 'icon-preview-img');
  previewImg.alt = 'Vista previa del icono';
  preview.appendChild(previewImg);
  const previewNote = el('span', 'icon-preview-note hidden');

  const errores = el('div', 'error-text hidden');

  function updatePreview() {
    const value = source.input.value.trim();
    errores.classList.add('hidden');
    if (!value) {
      previewImg.classList.add('hidden');
      previewNote.textContent = 'Vacío: se usará el favicon del sitio (o uno generado).';
      previewNote.classList.remove('hidden');
      return;
    }
    if (!isValidIconSource(value)) {
      previewImg.classList.add('hidden');
      previewNote.textContent = 'El icono debe ser una URL https:// o data:image/...';
      previewNote.classList.remove('hidden');
      return;
    }
    previewNote.classList.add('hidden');
    previewImg.classList.remove('hidden');
    previewImg.src = value;
  }

  source.input.addEventListener('input', updatePreview);

  const saveBtn = button('Guardar icono', async () => {
    const value = source.input.value.trim();
    if (value && !isValidIconSource(value)) {
      errores.textContent = 'El icono debe ser una URL https:// o data:image/...';
      errores.classList.remove('hidden');
      return;
    }
    await onSave(value);
    modal.dispose();
  }, 'primary');

  const useSiteBtn = button('Usar favicon del sitio', async () => {
    await onSave('');
    modal.dispose();
  });

  const cancelBtn = button('Cancelar', () => modal.dispose());

  const body = el('div');
  body.appendChild(source.wrap);
  body.appendChild(preview);
  body.appendChild(errores);
  body.appendChild(el('p', 'privacy-note', 'Si lo dejas vacío o la imagen falla, se mostrará el favicon del sitio o un icono generado automáticamente.'));

  const modal = openModal({ title: 'Cambiar icono', body, actions: [useSiteBtn, cancelBtn, saveBtn], wide: false });
  updatePreview();
  setTimeout(() => previewImg.addEventListener('error', () => {
    previewImg.classList.add('hidden');
    previewNote.textContent = 'La imagen no se pudo cargar. Revisa la URL.';
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
  const title = folder ? 'Renombrar carpeta' : 'Nueva carpeta';
  const nameField = field({ label: 'Nombre de la carpeta', value: folder?.title ?? '', required: true });

  const saveBtn = button(folder ? 'Guardar' : 'Crear', async () => {
    const name = nameField.input.value.trim();
    if (!name) return;
    await onSave(name);
    modal.dispose();
  }, 'primary');

  const cancelBtn = button('Cancelar', () => modal.dispose());

  const body = el('div');
  body.appendChild(nameField.wrap);

  const modal = openModal({ title, body, actions: [cancelBtn, saveBtn] });
  return modal;
}

/** Formulario de configuración del widget de clima (Open-Meteo, gratis). */
export function renderWeatherForm({ widget = null, onSave } = {}) {
  const title = 'Configurar clima';
  const locationField = field({ label: 'Ciudad (ej. Guatemala)', value: widget?.config?.location ?? '' });

  const saveBtn = button('Guardar', async () => {
    await updateWidget(widget?.id ?? findWeatherId(), {
      config: { location: locationField.input.value.trim() },
    });
    toast('Clima configurado');
    modal.dispose();
    onSave?.();
  }, 'primary');

  const cancelBtn = button('Cancelar', () => modal.dispose());
  const body = el('div');
  body.appendChild(locationField.wrap);
  const hint = el('p', 'privacy-note', 'Se consulta el clima a Open-Meteo (gratuito, sin API key ni cuenta). Solo se envía el nombre de la ciudad.');
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
  const titles = { clock: 'Editar reloj', date: 'Editar fecha', weather: 'Editar clima' };
  const title = titles[widget.type] ?? 'Editar widget';

  const body = el('div', 'widget-form');

  // Estado persistente del formulario (ámbito de la función para Guardar).
  let clockFormat = '12h';
  let clockAmpm = true;
  let weatherLocation = '';
  let weatherUnits = 'metric';

  // Formato del reloj.
  if (widget.type === 'clock') {
    clockFormat = cfg.format === '24h' ? '24h' : '12h';
    clockAmpm = cfg.ampm !== false;

    const formatWrap = el('div', 'settings-row');
    formatWrap.appendChild(el('span', 'settings-label', 'Formato'));
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
    seg.appendChild(makeBtn('12h', '12 horas'));
    seg.appendChild(makeBtn('24h', '24 horas'));
    formatWrap.appendChild(seg);
    body.appendChild(formatWrap);

    const ampmRow = el('div', 'settings-row');
    ampmRow.appendChild(el('span', 'settings-label', 'Mostrar AM/PM'));
    const ampmCheck = el('input', 'checkbox');
    ampmCheck.type = 'checkbox';
    ampmCheck.checked = clockAmpm;
    ampmCheck.addEventListener('change', () => {
      clockAmpm = ampmCheck.checked;
    });
    ampmRow.appendChild(ampmCheck);
    body.appendChild(ampmRow);
  }

  // Clima: ubicación y unidades.
  if (widget.type === 'weather') {
    weatherLocation = cfg.location ?? '';
    weatherUnits = cfg.units === 'imperial' ? 'imperial' : 'metric';

    const locField = field({ label: 'Ciudad (ej. Guatemala)', value: weatherLocation });
    body.appendChild(locField.wrap);
    const locInput = locField.input;

    const unitsWrap = el('div', 'settings-row');
    unitsWrap.appendChild(el('span', 'settings-label', 'Unidades'));
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
  }

  if (widget.type === 'date') {
    const note = el('p', 'settings-note');
    note.textContent = 'El widget de fecha no tiene ajustes adicionales.';
    body.appendChild(note);
  }

  const saveBtn = button('Guardar', async () => {
    const merged = { ...cfg };
    if (widget.type === 'clock') {
      merged.format = clockFormat;
      merged.ampm = clockAmpm;
    }
    if (widget.type === 'weather') {
      merged.location = (locInput && typeof locInput.value === 'string' ? locInput.value : weatherLocation).trim();
      merged.units = weatherUnits;
    }
    await updateWidget(widget.id, { config: merged });
    toast('Widget actualizado');
    modal.dispose();
    onSave?.();
  }, 'primary');

  const cancelBtn = button('Cancelar', () => modal.dispose());

  const modal = openModal({ title, body, actions: [cancelBtn, saveBtn] });
  return modal;
}