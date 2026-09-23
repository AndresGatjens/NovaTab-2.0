import { el } from '../utils/dom.js';
import { store } from '../storage/store.js';
import { enabledWidgets, updateWidget, widgets, addWidget } from '../services/widgets.js';
import { showContextMenu } from './context-menu.js';
import { fetchWeather, weatherLabel } from '../services/weather-api.js';

/** Widgets: reloj, fecha y clima (clima preparado, sin API aún). */
let clockTimer = null;

export function renderWidgetsBar(app, handlers) {
  const widgetsState = widgets();
  const bar = el('div', 'widgets-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Widgets');
  const layer = el('div', 'widgets-layer');

  const sorted = enabledWidgets().slice().sort((a, b) => a.position - b.position);
  for (const widget of sorted) {
    const cfg = widget.config || {};
    const node = renderWidget(widget, handlers);
    if (typeof cfg.x === 'number' && typeof cfg.y === 'number') {
      const maxLeft = Math.max(0, window.innerWidth - 160);
      const maxTop = Math.max(0, window.innerHeight - 60);
      node.style.left = `${Math.min(Math.max(0, cfg.x), maxLeft)}px`;
      node.style.top = `${Math.min(Math.max(0, cfg.y), maxTop)}px`;
      node.classList.add('floating');
      layer.appendChild(node);
    } else {
      bar.appendChild(node);
    }
  }

  if (layer.childElementCount === 0) layer.remove();
  const wrap = el('div', 'widgets-wrap');
  wrap.appendChild(bar);
  wrap.appendChild(layer);
  return wrap;
}

function renderWidget(widget, handlers) {
  const node = el('div', `widget widget-${widget.type}`);
  node.setAttribute('role', 'group');
  node.setAttribute('aria-live', 'polite');
  const cfg = widget.config || {};
  if (cfg.units === 'imperial') node.dataset.units = 'imperial';
  if (typeof cfg.w === 'number' && cfg.w >= 90) node.style.width = `${cfg.w}px`;
  if (typeof cfg.h === 'number' && cfg.h >= 48) node.style.height = `${cfg.h}px`;
  if (typeof cfg.w === 'number' && typeof cfg.h === 'number') node.classList.add('sized');
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
  toggle.title = 'Ocultar widget';
  toggle.setAttribute('aria-label', 'Ocultar widget');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  toggle.addEventListener('click', () => {
    updateWidget(widget.id, { enabled: false });
    if (handlers.onChange) handlers.onChange();
  });
  node.appendChild(toggle);

  // Asa de redimensionado en la esquina inferior derecha (estilo Android).
  const resize = el('button', 'widget-resize');
  resize.type = 'button';
  resize.title = 'Redimensionar (arrastrar la esquina)';
  resize.setAttribute('aria-label', 'Redimensionar widget');
  resize.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 20V16H6V18H18V6H16V4H20V20H4Z" opacity="0"/><path fill="currentColor" d="M20 4H16v2h2v2h-6V4h-2v2H8v2H6V4H4v2h2v2h2v6H6v2H4v2h2v2h2v2h2v-2h2v-2h-6v-2h6V8h2V6h2V4q0-1 1-1h1V4Z"/></svg>';
  node.appendChild(resize);

  enableWidgetDrag(node, widget, handlers);
  enableWidgetResize(node, widget, resize, handlers);

  node.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [
      {
        label: 'Editar…',
        onClick: () => {
          if (handlers.onEdit) handlers.onEdit(widget);
        },
      },
      {
        label: node.classList.contains('floating') ? 'Volver a la barra' : 'Ocultar widget',
        onClick: () => {
          if (node.classList.contains('floating')) {
            updateWidget(widget.id, { config: { ...(widget.config || {}), x: undefined, y: undefined } });
          } else {
            updateWidget(widget.id, { enabled: false });
          }
          if (handlers.onChange) handlers.onChange();
        },
      },
    ];
    if (node.classList.contains('floating')) {
      items.push({
        label: 'Ocultar widget',
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
      // Posición final calculada del puntero, siempre dentro del viewport
      // (nunca puede quedar fuera de la pantalla).
      const maxLeft = Math.max(0, window.innerWidth - 160);
      const maxTop = Math.max(0, window.innerHeight - 60);
      const left = Math.min(Math.max(0, e.clientX - offsetX), maxLeft);
      const top = Math.min(Math.max(0, e.clientY - offsetY), maxTop);
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.classList.add('floating');
      if (handlers.onDrop) handlers.onDrop(widget, left, top);
    }
  };
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
}

/** Permite redimensionar el widget arrastrando su asa de esquina (Android). */
function enableWidgetResize(node, widget, handle, handlers) {
  if (typeof PointerEvent === 'undefined') return;
  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = node.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    node.classList.add('sized', 'resizing');
    if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const w = Math.max(72, Math.min(window.innerWidth, startW + (e.clientX - startX)));
    const h = Math.max(44, Math.min(window.innerHeight, startH + (e.clientY - startY)));
    node.style.width = `${w}px`;
    node.style.height = `${h}px`;
  });
  const end = (e) => {
    if (!resizing) return;
    resizing = false;
    node.classList.remove('resizing');
    if (handle.releasePointerCapture) handle.releasePointerCapture(e.pointerId);
    const rect = node.getBoundingClientRect();
    const cfg = { ...(widget.config || {}) };
    cfg.w = Math.round(rect.width);
    cfg.h = Math.round(rect.height);
    updateWidget(widget.id, { config: cfg });
    if (handlers.onChange) handlers.onChange();
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
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
  try {
    const locale = widget.config.locale || store.getSettings()?.locale || 'es';
    date.textContent = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    date.textContent = now.toLocaleDateString();
  }
  node.appendChild(date);
}

function renderWeather(node, widget, handlers) {
  const config = widget.config || {};
  const wrap = el('div', 'weather');
  if (!config.location) {
    const btn = el('button', 'weather-setup', 'Configurar clima');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (handlers.onWeatherConfig) handlers.onWeatherConfig(widget);
    });
    wrap.appendChild(btn);
  } else {
    const temp = el('div', 'weather-temp', '—');
    const desc = el('div', 'weather-desc', 'Cargando…');
    wrap.appendChild(temp);
    wrap.appendChild(desc);

    const load = async () => {
      try {
        const w = await fetchWeather(config.location);
        if (!w) {
          temp.textContent = '—';
          desc.textContent = 'No se encontró la ciudad';
          return;
        }
        const imperial = config.units === 'imperial';
        const displayTemp = (c) => imperial ? Math.round((c * 9 / 5) + 32) : Math.round(c);
        const displaySpeed = (kmh) => imperial ? Math.round(kmh / 1.609) : Math.round(kmh);
        const unit = imperial ? '°F' : '°';
        temp.textContent = `${displayTemp(w.temp)}${unit}`;
        const place = w.place !== config.location.trim() ? w.place : '';
        desc.textContent = `${weatherLabel(w.code)}${place ? ` · ${place}` : ''}`;
        desc.title = `${weatherLabel(w.code)} · Sensación ${displayTemp(w.feels ?? w.temp)}${unit} · Humedad ${w.humidity}% · Viento ${displaySpeed(w.wind)} ${imperial ? 'mph' : 'km/h'}`;
      } catch {
        temp.textContent = '—';
        desc.textContent = 'Sin conexión';
      }
    };
    load();
    // Refresca cada 10 minutos (acorde al caché del servicio).
    setInterval(load, 600000);
  }
  node.appendChild(wrap);
}

const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function renderCalendar(node, widget) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const locale = widget.config.locale || store.getSettings()?.locale || 'es';

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
  for (const day of WEEKDAYS_SHORT) {
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
  area.placeholder = 'Pendientes…';
  area.value = widget.config?.text ?? '';
  area.setAttribute('aria-label', 'Notas y pendientes');
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
  addBtn.title = 'Nueva nota';
  addBtn.setAttribute('aria-label', 'Nueva nota');
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z"/></svg>';
  addBtn.addEventListener('click', async () => {
    await addWidget('notes');
    if (handlers && handlers.onChange) handlers.onChange();
  });
  node.appendChild(addBtn);
  node.appendChild(wrap);
  wrap.appendChild(area);
}