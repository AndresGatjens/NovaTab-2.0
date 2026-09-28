import { el } from '../utils/dom.js';
import { store } from '../storage/store.js';
import { enabledWidgets, updateWidget, widgets, addWidget } from '../services/widgets.js';
import { showContextMenu } from './context-menu.js';
import { fetchWeather, weatherLabel } from '../services/weather-api.js';
import { t, getLang } from '../services/i18n.js';
import { box, resolveFloat } from '../utils/layout.js';
import { isEditMode } from './layout-editor.js';
import { addResizeHandles } from './resize-handles.js';

/** Widgets: reloj, fecha, clima, calendario y notas. */
let clockTimer = null;
let weatherTimer = null;
let barEl = null;
let layerEl = null;

/** Tamaño mínimo de un widget al redimensionarlo con los tiradores. */
const MIN_WIDGET_W = 72;
const MIN_WIDGET_H = 44;

/**
 * Dónde nace cada widget la primera vez (hasta que el usuario lo mueve).
 * Izquierda: clima arriba y la fecha debajo.  Derecha: la hora arriba, el
 * calendario debajo y las notas debajo.  El centro queda libre para la barra
 * de búsqueda y la cuadrícula.
 */
const HOME_SPOT = {
  weather: { side: 'left', slot: 0 },
  date: { side: 'left', slot: 1 },
  clock: { side: 'right', slot: 0 },
  calendar: { side: 'right', slot: 1 },
  notes: { side: 'right', slot: 2 },
};

/** Margen respecto al borde de la pantalla y hueco entre widgets apilados. */
const HOME_MARGIN = 24;
const HOME_GAP = 12;

export function renderWidgetsBar(app, handlers) {
  const widgetsState = widgets();
  const bar = el('div', 'widgets-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Widgets');
  const layer = el('div', 'widgets-layer');
  const floats = [];
  // Widgets que nunca se han movido: se colocan en su hueco al medir.
  const homed = [];

  const sorted = enabledWidgets().slice().sort((a, b) => a.position - b.position);
  for (const widget of sorted) {
    const cfg = widget.config || {};
    const node = renderWidget(widget, handlers);
    if (typeof cfg.x === 'number' && typeof cfg.y === 'number') {
      node.classList.add('floating');
      node.style.left = `${Math.max(0, cfg.x)}px`;
      node.style.top = `${Math.max(0, cfg.y)}px`;
      layer.appendChild(node);
      floats.push({ node, widget });
    } else if (HOME_SPOT[widget.type]) {
      // Sin posición guardada: se deja en la capa y se coloca al medir, para
      // que quede pegado al borde y apilado con los de su mismo lado.
      layer.appendChild(node);
      homed.push({ node, widget });
    } else {
      bar.appendChild(node);
    }
  }

  const wrap = el('div', 'widgets-wrap');
  wrap.appendChild(bar);
  if (layer.childElementCount > 0) wrap.appendChild(layer);

  barEl = bar;
  layerEl = layer;

  // Tras insertar en el DOM (para poder medir), coloca los widgets nuevos en
  // su hueco de la pantalla y guarda la posición: a partir de ahí ya cuentan
  // como movidos por el usuario y no se recolocan.  Se apilan hacia abajo en
  // el orden de "slot" de cada lado, guarding la altura real de cada uno.
  const cursors = { left: HOME_MARGIN, right: HOME_MARGIN };
  homed.sort((a, b) => HOME_SPOT[a.widget.type].slot - HOME_SPOT[b.widget.type].slot);
  for (const { node, widget } of homed) {
    const spot = HOME_SPOT[widget.type];
    const w = node.offsetWidth || 180;
    const h = node.offsetHeight || 96;
    const x =
      spot.side === 'left'
        ? HOME_MARGIN
        : Math.max(HOME_MARGIN, window.innerWidth - w - HOME_MARGIN);
    const y = cursors[spot.side];
    cursors[spot.side] = y + h + HOME_GAP;
    node.classList.add('floating');
    node.style.left = `${Math.round(x)}px`;
    node.style.top = `${Math.round(y)}px`;
    floats.push({ node, widget });
    updateWidget(widget.id, {
      config: { ...(widget.config || {}), x: Math.round(x), y: Math.round(y) },
    });
  }

  // `empty` avisa a quien llama de que la barra se quedó sin widgets: si todos
  // están flotando sueltos no debe quedar ninguna caja vacía en la página.
  const empty = bar.childElementCount === 0;

  // Tras insertar en el DOM (para poder medir), ajusta cada flotante a la
  // pantalla y elimina los posibles solapes (los datos guardados podrían
  // haberse quedado antiguos). Devuelve las correcciones de posición.
  const resolve = () => {
    if (!floats.length) return [];
    const obstacles = [];
    if (bar.childElementCount > 0) {
      const b = box(bar);
      if (b.w > 0 && b.h > 0) obstacles.push(b);
    }
    const corrections = [];
    for (const { node, widget } of floats) {
      const rect = box(node);
      if (rect.w <= 0 || rect.h <= 0) continue;
      const pos = resolveFloat(node, obstacles);
      if (pos.moved) corrections.push({ id: widget.id, x: pos.x, y: pos.y });
      obstacles.push(box(node));
    }
    return corrections;
  };

  return { wrap, resolve, empty };
}

function renderWidget(widget, handlers) {
  const node = el('div', `widget widget-${widget.type}`);
  node.setAttribute('role', 'group');
  node.setAttribute('aria-live', 'polite');
  const cfg = widget.config || {};
  if (cfg.units === 'imperial') node.dataset.units = 'imperial';
  // Tamaño guardado al redimensionar con los tiradores (si no, tamaño natural).
  let sized = false;
  if (typeof cfg.w === 'number' && cfg.w >= MIN_WIDGET_W) {
    node.style.width = `${cfg.w}px`;
    sized = true;
  }
  if (typeof cfg.h === 'number' && cfg.h >= MIN_WIDGET_H) {
    node.style.height = `${cfg.h}px`;
    sized = true;
  }
  if (sized) node.classList.add('sized');
  if (typeof cfg.textScale === 'number' && cfg.textScale !== 1) {
    node.style.setProperty('--widget-scale', String(cfg.textScale));
  }

  if (widget.type === 'clock') renderClock(node, widget);
  else if (widget.type === 'date') renderDate(node, widget);
  else if (widget.type === 'weather') renderWeather(node, widget, handlers);
  else if (widget.type === 'calendar') renderCalendar(node, widget);
  else if (widget.type === 'notes') renderNotes(node, widget, handlers);

  const toggle = el('button', 'widget-close');
  toggle.type = 'button';
  toggle.title = t('widget.hide');
  toggle.setAttribute('aria-label', t('widget.hide'));
  toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  toggle.addEventListener('click', () => {
    updateWidget(widget.id, { enabled: false });
    if (handlers.onChange) handlers.onChange();
  });
  node.appendChild(toggle);

  enableWidgetDrag(node, widget, handlers);
  enableWidgetResize(node, widget, handlers);

  node.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
const items = [
    {
      label: t('ctx.edit'),
      onClick: () => {
        if (handlers.onEdit) handlers.onEdit(widget);
      },
    },
  ];
  if (!node.classList.contains('floating') && isEditMode()) {
    items.push({
      label: t('widget.toFloat'),
      onClick: () => {
        const r = node.getBoundingClientRect();
        updateWidget(widget.id, {
          config: { ...(widget.config || {}), x: Math.round(r.left), y: Math.round(r.top) },
        });
        if (handlers.onChange) handlers.onChange();
      },
    });
  }
  items.push({
    label: node.classList.contains('floating') ? t('widget.toBar') : t('widget.hide'),
    onClick: () => {
      if (node.classList.contains('floating')) {
        updateWidget(widget.id, { config: { ...(widget.config || {}), x: undefined, y: undefined } });
      } else {
        updateWidget(widget.id, { enabled: false });
      }
      if (handlers.onChange) handlers.onChange();
    },
  });
  if (node.classList.contains('floating')) {
    items.push({
      label: t('widget.hide'),
      onClick: () => {
        updateWidget(widget.id, { enabled: false });
        if (handlers.onChange) handlers.onChange();
      },
    });
  }
  showContextMenu(items, e.clientX, e.clientY);
  });
  return node;
}

/** Recoloca `node` para que quede dentro de la pantalla y sin pisar la barra
 *  ni los demás widgets flotantes. Devuelve la posición final. */
function resolveInteractive(node) {
  if (!layerEl || node.parentElement !== layerEl) {
    const r = node.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top) };
  }
  const obstacles = [];
  if (barEl && barEl.childElementCount > 0) {
    const b = box(barEl);
    if (b.w > 0 && b.h > 0) obstacles.push(b);
  }
  for (const other of layerEl.querySelectorAll('.widget.floating')) {
    if (other === node) continue;
    const b = box(other);
    if (b.w > 0 && b.h > 0) obstacles.push(b);
  }
  const pos = resolveFloat(node, obstacles);
  return { x: pos.x, y: pos.y };
}

/** Permite arrastrar el widget libremente; al soltar guarda su posición. */
function enableWidgetDrag(node, widget, handlers) {
  if (typeof PointerEvent === 'undefined') return;
  let dragging = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;

  node.addEventListener('pointerdown', (e) => {
    if (!isEditMode()) return;
    // Cada widget es un cajón individual: al agarrar uno que sigue en la
    // barra se DESPEGA en su posición actual para recolocarlo por separado
    // (misma clave, misma maquinaria de arrastre/cola/redimensionado).
    if (!node.classList.contains('floating') && !node.parentElement.classList.contains('widgets-layer')) {
      const rect = node.getBoundingClientRect();
      updateWidget(widget.id, {
        config: { ...(widget.config || {}), x: Math.round(rect.left), y: Math.round(rect.top) },
      });
      if (handlers.onDetach) handlers.onDetach(widget);
      return;
    }
    if (!node.classList.contains('floating')) return;
    if (e.button !== 0) return;
    if (e.target.closest('button, .notes-input')) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = node.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    node.classList.add('dragging');
    if (node.setPointerCapture) node.setPointerCapture(e.pointerId);
  });
  node.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
    moved = true;
    node.style.left = `${e.clientX - offsetX}px`;
    node.style.top = `${e.clientY - offsetY}px`;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    node.classList.remove('dragging');
    if (node.releasePointerCapture) node.releasePointerCapture(e.pointerId);
    if (moved) {
      // Posición final calculada del puntero y resuelta: siempre dentro del
      // viewport y sin pisar la barra ni otros widgets flotantes.
      const left = Math.max(0, e.clientX - offsetX);
      const top = Math.max(0, e.clientY - offsetY);
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.classList.add('floating');
      const pos = resolveInteractive(node);
      if (pos.x !== left || pos.y !== top) {
        node.style.left = `${pos.x}px`;
        node.style.top = `${pos.y}px`;
      }
      if (handlers.onDrop) handlers.onDrop(widget, pos.x, pos.y);
    }
  };
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
}

/**
 * Redimensionado del widget con los 8 tiradores de las esquinas y de los
 * centros de los lados.  Al soltar se guarda el tamaño (y la posición si era
 * flotante) en la configuración del widget.
 */
function enableWidgetResize(node, widget, handlers) {
  addResizeHandles(node, {
    className: 'widget-resize',
    label: t('widget.resize'),
    minW: MIN_WIDGET_W,
    minH: MIN_WIDGET_H,
    // Redimensionar es una acción de edición: fuera del modo edición no.
    gate: isEditMode,
    onEnd: (rect, target) => {
      const cfg = { ...(widget.config || {}) };
      cfg.w = Math.min(rect.w, window.innerWidth);
      cfg.h = Math.min(rect.h, window.innerHeight);
      target.style.width = `${cfg.w}px`;
      target.style.height = `${cfg.h}px`;
      target.classList.add('sized');
      if (layerEl && target.parentElement === layerEl) {
        const pos = resolveInteractive(target);
        cfg.x = pos.x;
        cfg.y = pos.y;
        target.style.left = `${pos.x}px`;
        target.style.top = `${pos.y}px`;
      }
      updateWidget(widget.id, { config: cfg });
      if (handlers.onChange) handlers.onChange();
    },
  });
}

function renderClock(node, widget) {
  const time = el('div', 'clock-time');
  const update = () => {
    const date = new Date();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    let hours = date.getHours();
    let suffix = '';
    const cfg = widget.config || {};
    if (cfg.format === '12h') {
      if (cfg.ampm !== false) suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }
    time.textContent = `${String(hours).padStart(2, '0')}:${minutes}${suffix}`;
  };
  update();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(update, 1000);
  node.appendChild(time);
}

function renderDate(node, widget) {
  const date = el('div', 'clock-date');
  const now = new Date();
  const cfg = widget.config || {};
  const format = cfg.format || 'full';
  const locale = getLang() === 'en' ? 'en' : 'es';
  const optsMap = {
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    short: { day: 'numeric', month: 'numeric', year: '2-digit' },
    numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
    daymonth: { day: 'numeric', month: 'long' },
    weekday: { weekday: 'long' },
  };
  const opts = optsMap[format] || optsMap.full;
  try {
    const str = now.toLocaleDateString(locale, opts).replace(/^./, (m) => m.toUpperCase());
    date.textContent = str;
  } catch {
    date.textContent = now.toLocaleDateString();
  }
  node.appendChild(date);
}

function renderWeather(node, widget, handlers) {
  const config = widget.config || {};
  const details = (Array.isArray(config.details) ? config.details : config.detail ? [config.detail] : ['desc']);
  const wrap = el('div', 'weather');
  if (!config.location) {
    const btn = el('button', 'weather-setup', t('widget.configure'));
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (handlers.onEdit) handlers.onEdit(widget);
    });
    wrap.appendChild(btn);
    node.appendChild(wrap);
    return;
  }
  const temp = el('div', 'weather-temp', '—');
  const lines = el('div', 'weather-lines');
  wrap.appendChild(temp);
  wrap.appendChild(lines);
  node.appendChild(wrap);

  const load = async () => {
    try {
      const w = await fetchWeather(config.location);
      if (!w) {
        temp.textContent = '—';
        lines.textContent = t('weather.notFound');
        return;
      }
      const imperial = config.units === 'imperial';
      const displayTemp = (c) => imperial ? Math.round((c * 9 / 5) + 32) : Math.round(c);
      const displaySpeed = (kmh) => imperial ? Math.round(kmh / 1.609) : Math.round(kmh);
      const unit = imperial ? '°F' : '°C';
      const speedUnit = imperial ? 'mph' : 'km/h';
      temp.textContent = `${displayTemp(w.temp)}${unit}`;
      lines.innerHTML = '';
      const place = w.place !== config.location.trim() ? w.place : '';
      const row = (text) => {
        const d = el('div', 'weather-line');
        d.textContent = text;
        lines.appendChild(d);
      };
      if (details.includes('desc')) {
        row(`${weatherLabel(w.code)}${place ? ` · ${place}` : ''}`);
      }
      if (details.includes('feels')) {
        row(`${t('weather.feels')}: ${displayTemp(w.feels ?? w.temp)}${unit}`);
      }
      if (details.includes('wind')) {
        row(`${t('weather.wind')}: ${displaySpeed(w.wind)} ${speedUnit}`);
      }
      if (details.includes('humidity')) {
        row(`${t('weather.humidity')}: ${w.humidity}%`);
      }
      wrap.title = `${weatherLabel(w.code)} · ${t('weather.feels')} ${displayTemp(w.feels ?? w.temp)}${unit} · ${t('weather.humidity')} ${w.humidity}% · ${t('weather.wind')} ${displaySpeed(w.wind)} ${speedUnit}`;
    } catch {
      temp.textContent = '—';
      lines.textContent = t('weather.offline');
    }
  };
  load();
  // Refresca cada 10 minutos (acorde al caché del servicio): un único timer
  // global para que al re-renderizar no se acumulen intervalos con configs
  // antiguas (p. ej. la ciudad previa).
  if (weatherTimer) clearInterval(weatherTimer);
  weatherTimer = setInterval(load, 600000);
}

const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAYS_SHORT_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function weekdayShorts() {
  return getLang() === 'en' ? WEEKDAYS_SHORT_EN : WEEKDAYS_SHORT;
}

function renderCalendar(node, widget) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const locale = getLang() === 'en' ? 'en' : 'es';

  const wrap = el('div', 'calendar');
  const header = el('div', 'calendar-header');
  try {
    header.textContent = now.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    header.textContent = now.toLocaleDateString();
  }
  header.textContent = header.textContent.charAt(0).toUpperCase() + header.textContent.slice(1);
  wrap.appendChild(header);

  const week = el('div', 'calendar-week');
  for (const day of weekdayShorts()) {
    const cell = el('span', 'calendar-weekday', day);
    week.appendChild(cell);
  }
  wrap.appendChild(week);

  // Primer día del mes: 0 = domingo; ajustamos para empezar en lunes.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const grid = el('div', 'calendar-grid');
  for (let i = 0; i < firstWeekday; i++) {
    grid.appendChild(el('span', 'calendar-day calendar-day-blank'));
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = el('span', 'calendar-day', String(day));
    if (day === today) cell.classList.add('today');
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);
  node.appendChild(wrap);
}

function renderNotes(node, widget, handlers) {
  const wrap = el('div', 'notes');
  const area = el('textarea', 'notes-input');
  area.placeholder = t('widget.notes.placeholder');
  area.value = widget.config?.text ?? '';
  area.setAttribute('aria-label', t('widget.notes.title'));
  area.addEventListener('input', () => {
    clearTimeout(area._t);
    area._t = setTimeout(() => {
      updateWidget(widget.id, { config: { ...(widget.config || {}), text: area.value } });
    }, 400);
  });
  area.addEventListener('change', () => {
    updateWidget(widget.id, { config: { ...(widget.config || {}), text: area.value } });
  });
  // Botón "+": crea otra nota/pendientes sin salir de esta.
  const addBtn = el('button', 'widget-addnote');
  addBtn.type = 'button';
  addBtn.title = t('widget.notes.title');
  addBtn.setAttribute('aria-label', t('widget.notes.title'));
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z"/></svg>';
  addBtn.addEventListener('click', async () => {
    await addWidget('notes');
    if (handlers && handlers.onChange) handlers.onChange();
  });
  node.appendChild(addBtn);
  node.appendChild(wrap);
  wrap.appendChild(area);
}