import { el } from '../utils/dom.js';
import { store } from '../storage/store.js';
import { updateSettings, updateBackground } from '../services/settings.js';
import { widgets, updateWidget, addWidget } from '../services/widgets.js';
import { ACCENTS, DEFAULT_ACCENT, matchAccentPreset, expandAccent } from '../services/accents.js';
import { hexToHsl, hslToHex } from '../utils/color.js';
import { SEARCH_ENGINES } from '../utils/url.js';
import { toast } from './toast.js';
import { importFile, downloadConfig } from '../services/export-config.js';

/** Paleta de colores para fondos (evita el diálogo nativo que se sale de la página). */
const PALETTE = [
  '#0f172a', '#1e293b', '#334155', '#475569',
  '#111827', '#18181b', '#7f1d1d', '#b91c1c',
  '#be185d', '#7c3aed', '#4f46e5', '#1d4ed8',
  '#0284c7', '#0891b2', '#0d9488', '#059669',
  '#16a34a', '#4d7c0f', '#a16207', '#b45309',
  '#a21caf', '#64748b', '#cbd5e1', '#f1f5f9',
];

/** Paleta rápida de presets. */
function palette(elSwWrap, value, onChange) {
  const wrap = el('div', 'palette');
  wrap._swatches = [];
  for (const color of PALETTE) {
    const sw = el('button', 'palette-swatch');
    sw.type = 'button';
    sw.style.setProperty('--sw', color);
    sw.setAttribute('aria-label', `Color ${color}`);
    sw.title = color;
    sw.addEventListener('click', () => {
      wrap._setActive(color);
      onChange(color);
    });
    wrap._swatches.push(sw);
    wrap.appendChild(sw);
  }
  wrap._setActive = (hex) => {
    wrap._swatches.forEach((s) => s.classList.toggle('active', s.style.getPropertyValue('--sw').toLowerCase() === String(hex).toLowerCase()));
  };
  wrap._setActive(value);
  return wrap;
}

/** Barra de color completa (Matiz/Saturación/Luz) + preview. Cubre todos los tonos. */
function colorBar(value, onChange) {
  const wrap = el('div', 'color-bar');
  const preview = el('div', 'color-preview');
  const hRange = el('input', 'range color-range');
  hRange.type = 'range'; hRange.min = '0'; hRange.max = '360'; hRange.step = '1';
  const sRange = el('input', 'range color-range');
  sRange.type = 'range'; sRange.min = '0'; sRange.max = '100'; hRange.step = '1'; sRange.step = '1';
  const lRange = el('input', 'range color-range');
  lRange.type = 'range'; lRange.min = '0'; lRange.max = '100'; lRange.step = '1';

  function setValue(hex) {
    const { h, s, l } = hexToHsl(hex);
    hRange.value = String(h);
    sRange.value = String(s);
    lRange.value = String(l);
    preview.style.background = hex;
  }
  function hex() {
    return hslToHex(hRange.valueAsNumber, sRange.valueAsNumber, lRange.valueAsNumber);
  }

  hRange.addEventListener('input', () => { preview.style.background = hex(); });
  sRange.addEventListener('input', () => { preview.style.background = hex(); });
  lRange.addEventListener('input', () => { preview.style.background = hex(); });
  [hRange, sRange, lRange].forEach((r) => r.addEventListener('change', () => onChange(hex())));
  setValue(value);

  const label = (txt) => {
    const row = el('div', 'color-label-row');
    row.appendChild(el('span', 'color-label', txt));
    row.appendChild(el('span', 'color-value', ''));
    return row;
  };

  const build = el('div', 'color-controls');
  build.appendChild(preview);
  const hb = label('Matiz'); build.appendChild(hb); build.appendChild(hRange);
  const sb = label('Saturación'); build.appendChild(sb); build.appendChild(sRange);
  const lb = label('Luz'); build.appendChild(lb); build.appendChild(lRange);
  wrap.appendChild(build);
  wrap._setValue = setValue;
  return wrap;
}

/** Campo de color: presets rápidos + barra completa sincronizados. */
function colorField(label, value, onChange) {
  const block = el('div', 'settings-block');
  block.appendChild(el('span', 'settings-label', label));
  const paletteWrap = palette(null, value, (hex) => {
    bar._setValue(hex);
    onChange(hex);
  });
  const bar = colorBar(value, (hex) => {
    paletteWrap._setActive(hex);
    onChange(hex);
  });
  block.appendChild(paletteWrap);
  block.appendChild(bar);
  return block;
}

/** Panel de configuración (overlay lateral) con secciones. */
export function openSettingsPanel(onClose) {
  const overlay = el('div', 'settings-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Configuración');

  const panel = el('aside', 'settings-panel');
  const header = el('div', 'settings-header');
  const title = el('h2', 'settings-title', 'Configuración');
  const close = el('button', 'modal-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar configuración');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  close.addEventListener('click', dispose);

  header.appendChild(title);
  header.appendChild(close);
  panel.appendChild(header);

  const nav = el('nav', 'settings-nav');
  const sections = ['general', 'apariencia', 'widgets', 'cuadricula', 'privacidad', 'datos'];
  const labels = { general: 'General', apariencia: 'Apariencia', widgets: 'Widgets', cuadricula: 'Cuadrícula', privacidad: 'Privacidad', datos: 'Datos' };
  const content = el('div', 'settings-content');
  const navButtons = [];

  for (const key of sections) {
    const btn = el('button', 'settings-tab');
    btn.type = 'button';
    btn.textContent = labels[key];
    btn.dataset.sec = key;
    btn.setAttribute('aria-controls', `settings-${key}`);
    btn.addEventListener('click', () => {
      navButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderSection(key);
    });
    navButtons.push(btn);
    nav.appendChild(btn);
  }
  panel.appendChild(nav);
  panel.appendChild(content);

  function renderSection(key) {
    content.innerHTML = '';
    if (key === 'general') renderGeneral(content);
    else if (key === 'apariencia') renderApariencia(content);
    else if (key === 'widgets') renderWidgets(content);
    else if (key === 'cuadricula') renderCuadricula(content);
    else if (key === 'privacidad') renderPrivacidad(content);
    else if (key === 'datos') renderDatos(content);
  }

  function sectionTitle(text) {
    const h = el('h3', 'settings-section-title', text);
    return h;
  }

  function renderGeneral(host) {
    host.appendChild(sectionTitle('Buscar'));
    const settings = store.getSettings();
    row(host, 'Motor de búsqueda', selectEngine(settings.searchEngine));
    row(host, 'URL personalizada', inputText(settings.customSearchUrl, async (v) => {
      await updateSettings({ customSearchUrl: v.trim() });
      toast('Motor personalizado actualizado');
    }, `https://example.com/search?q={query}`));
    host.appendChild(sectionTitle('Enlaces'));
    row(host, 'Abrir enlaces favoritos', selectLinkBehavior(settings.linkBehavior));
  }

  function selectEngine(value) {
    const sel = el('select', 'sel');
    const options = [...Object.keys(SEARCH_ENGINES).map((k) => [k, SEARCH_ENGINES[k].name]), ['custom', 'Personalizado']];
    for (const [key, name] of options) {
      const opt = el('option', '', name);
      opt.value = key;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener('change', async () => {
      await updateSettings({ searchEngine: sel.value });
      toast('Motor de búsqueda cambiado');
    });
    return sel;
  }

  function selectLinkBehavior(value) {
    const sel = el('select', 'sel');
    for (const [v, l] of [['current', 'En la misma pestaña'], ['new', 'En pestaña nueva']]) {
      const opt = el('option', '', l);
      opt.value = v;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener('change', async () => {
      await updateSettings({ linkBehavior: sel.value });
    });
    return sel;
  }

  function renderApariencia(host) {
    host.appendChild(sectionTitle('Tema'));
    const settings = store.getSettings();
    const themeWrap = el('div', 'seg');
    for (const [v, l] of [['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Automático']]) {
      const btn = el('button', 'seg-btn');
      btn.type = 'button';
      btn.textContent = l;
      if (settings.theme === v) btn.classList.add('active');
      btn.addEventListener('click', async () => {
        await updateSettings({ theme: v });
        host.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyTheme();
      });
      themeWrap.appendChild(btn);
    }
    host.appendChild(themeWrap);

    host.appendChild(sectionTitle('Color de tema'));
    const note = el('p', 'settings-note');
    note.textContent = 'Cambia los colores de la cuadrícula, la barra de búsqueda y los botones. El fondo se configura aparte, abajo.';
    host.appendChild(note);
    const accentState = store.getSettings().accentCustom && store.getSettings().accent === 'custom'
      ? store.getSettings().accentCustom
      : null;
    const accentBase = accentState ? accentState.a : ACCENTS[store.getSettings().accent]?.a || ACCENTS[DEFAULT_ACCENT].a;
    let accentBar;
    const applyAccent = async (hex) => {
      const matched = matchAccentPreset(hex);
      if (matched) {
        await updateSettings({ accent: matched, accentCustom: null });
      } else {
        await updateSettings({ accent: 'custom', accentCustom: expandAccent(hex) });
      }
      accentBar._setValue(hex);
      applyTheme();
    };
    host.appendChild(palette(null, accentBase, applyAccent));
    const customLabel = el('div', 'color-label-row');
    customLabel.appendChild(el('span', 'color-label', 'Personalizado'));
    host.appendChild(customLabel);
    accentBar = colorBar(accentBase, applyAccent);
    host.appendChild(accentBar);

    host.appendChild(sectionTitle('Fondo'));
    const bgWrap = el('div', 'bg-options');
    const types = [
      ['color', 'Color sólido'],
      ['gradient', 'Gradiente'],
      ['image', 'Imagen'],
    ];
    for (const [t, l] of types) {
      const btn = el('button', 'bg-type');
      btn.type = 'button';
      btn.textContent = l;
      if (settings.background.type === t) btn.classList.add('active');
      btn.addEventListener('click', async () => {
        await updateBackground({ type: t });
        bgWrap.querySelectorAll('.bg-type').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyTheme();
        renderApariencia(host);
      });
      bgWrap.appendChild(btn);
    }
    host.appendChild(bgWrap);

    if (settings.background.type === 'color') {
      colorBlock(host, 'Color', settings.background.color, async (v) => {
        await updateBackground({ color: v });
        applyTheme();
      });
    }
    if (settings.background.type === 'gradient') {
      colorBlock(host, 'De', settings.background.gradient.from, async (v) => {
        await updateBackground({ gradient: { ...settings.background.gradient, from: v } });
        applyTheme();
      });
      colorBlock(host, 'A', settings.background.gradient.to, async (v) => {
        await updateBackground({ gradient: { ...settings.background.gradient, to: v } });
        applyTheme();
      });
      row(host, 'Ángulo (°)', inputRange(settings.background.gradient.angle, 0, 360, 15, async (v) => {
        await updateBackground({ gradient: { ...settings.background.gradient, angle: Number(v) } });
        applyTheme();
      }));
    }
    if (settings.background.type === 'image') {
      row(host, 'Imagen por URL', inputText(settings.background.image, async (v) => {
        await updateBackground({ image: v.trim() });
        applyTheme();
      }, 'https://...'));
      row(host, 'Imagen local', filePicker(async (f) => {
        const dataUrl = await readAsDataURL(f);
        await updateBackground({ image: dataUrl });
        applyTheme();
        toast('Imagen de fondo establecida');
      }));
    }

    host.appendChild(sectionTitle('Tarjetas'));
    row(host, `Transparencia (${Math.round(settings.transparency * 100)}%)`, inputRange(settings.transparency, 0.3, 1, 0.05, async (v) => {
      await updateSettings({ transparency: Number(v) });
      applyTheme();
    }));
    row(host, `Desenfoque (${settings.blur}px)`, inputRange(settings.blur, 0, 24, 1, async (v) => {
      await updateSettings({ blur: Number(v) });
      applyTheme();
    }));
    row(host, `Radio de tarjetas (${settings.cardRadius}px)`, inputRange(settings.cardRadius, 4, 32, 1, async (v) => {
      await updateSettings({ cardRadius: Number(v) });
      applyTheme();
    }));
  }

  function renderWidgets(host) {
    host.appendChild(sectionTitle('Widgets'));
    const note = el('p', 'settings-note');
    note.textContent = 'Restaura los widgets que ocultaste o añade los que falten.';
    host.appendChild(note);

    const all = widgets();
    const visible = all.filter((w) => w.enabled);
    const hidden = all.filter((w) => !w.enabled);
    const hasWeather = all.some((w) => w.type === 'weather');
    const hasCalendar = all.some((w) => w.type === 'calendar');
    const hasNotes = all.some((w) => w.type === 'notes');

    if (visible.length) {
      host.appendChild(sectionTitle('Activos'));
      for (const w of visible) {
        row(host, widgetLabel(w.type), buttonSmall('Ocultar', async () => {
          await updateWidget(w.id, { enabled: false });
          renderWidgets(host);
        }));
      }
    }
    if (hidden.length) {
      host.appendChild(sectionTitle('Ocultos'));
      for (const w of hidden) {
        row(host, widgetLabel(w.type), buttonSmall('Restaurar', async () => {
          await updateWidget(w.id, { enabled: true });
          renderWidgets(host);
        }));
      }
    }
    const missing = [];
    if (!hasWeather) missing.push(['weather', 'Clima (Open-Meteo)']);
    if (!hasCalendar) missing.push(['calendar', 'Calendario']);
    if (!hasNotes) missing.push(['notes', 'Notas / Pendientes']);
    if (missing.length) {
      host.appendChild(sectionTitle('Más widgets'));
      for (const [type, label] of missing) {
        row(host, label, buttonSmall('Añadir', async () => {
          await addWidget(type);
          renderWidgets(host);
        }));
      }
    }
    if (!visible.length && !hidden.length) {
      const p = el('p', 'settings-note');
      p.textContent = 'No hay widgets. Añade alguno desde "Más widgets".';
      host.appendChild(p);
    }
  }

  function widgetLabel(type) {
    return { clock: 'Reloj', date: 'Fecha', weather: 'Clima', calendar: 'Calendario', notes: 'Notas / Pendientes' }[type] ?? type;
  }

  function buttonSmall(label, onClick) {
    const btn = el('button', 'btn');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderCuadricula(host) {
    const settings = store.getSettings();
    host.appendChild(sectionTitle('Cuadrícula'));
    row(host, `Columnas (${settings.gridColumns})`, inputRange(settings.gridColumns, 3, 12, 1, async (v) => {
      await updateSettings({ gridColumns: Number(v) });
      applyTheme();
    }));
    row(host, `Filas por página (${settings.gridRows})`, inputRange(settings.gridRows, 1, 8, 1, async (v) => {
      await updateSettings({ gridRows: Number(v) });
      applyTheme();
    }));
    row(host, `Tamaño iconos (${settings.iconSize}px)`, inputRange(settings.iconSize, 32, 96, 2, async (v) => {
      await updateSettings({ iconSize: Number(v) });
      applyTheme();
    }));
    row(host, `Espaciado (${settings.gridSpacing}px)`, inputRange(settings.gridSpacing, 4, 48, 2, async (v) => {
      await updateSettings({ gridSpacing: Number(v) });
      applyTheme();
    }));
    host.appendChild(sectionTitle('Visibilidad'));
    row(host, 'Mostrar nombres', checkbox(settings.showLabels, async (v) => {
      await updateSettings({ showLabels: v });
      applyTheme();
    }));
    row(host, 'Mostrar favicons', checkbox(settings.showFavicons, async (v) => {
      await updateSettings({ showFavicons: v });
      applyTheme();
    }));
    row(host, 'Animaciones', checkbox(settings.animations, async (v) => {
      await updateSettings({ animations: v });
      applyTheme();
    }));
  }

  function renderPrivacidad(host) {
    host.appendChild(sectionTitle('Privacidad'));
    const p = el('p', 'privacy-note');
    p.innerHTML = `
      <ul>
        <li>Todo se almacena en el <strong>storage local del navegador</strong>.</li>
        <li>No se envían favoritos ni datos a servidores externos.</li>
        <li>No se recopila historial ni datos personales.</li>
        <li>El clima requiere una API externa si la configuras; por defecto está desactivado.</li>
      </ul>`;
    host.appendChild(p);
  }

  function renderDatos(host) {
    host.appendChild(sectionTitle('Datos'));
    const rowBtns = el('div', 'data-actions');

    const exportBtn = el('button', 'btn btn-primary', 'Exportar configuración');
    exportBtn.type = 'button';
    exportBtn.addEventListener('click', async () => {
      await downloadConfig();
      toast('Configuración exportada');
    });

    const importBtn = el('button', 'btn', 'Importar configuración');
    importBtn.type = 'button';
    importBtn.addEventListener('click', async () => {
      const file = await importFile();
      if (!file || file.error) {
        if (file?.error) toast(file.error, 'error');
        return;
      }
      toast('Configuración importada', 'success');
      dispose();
    });

    rowBtns.appendChild(exportBtn);
    rowBtns.appendChild(importBtn);
    host.appendChild(rowBtns);
  }

  function row(parent, label, control) {
    const r = el('div', 'settings-row');
    r.appendChild(el('span', 'settings-label', label));
    r.appendChild(control);
    parent.appendChild(r);
  }

  function colorBlock(parent, label, value, onChange) {
    parent.appendChild(colorField(label, value, onChange));
  }

  function inputColor(value, onInput) {
    const input = el('input', 'color');
    input.type = 'color';
    input.value = value;
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function inputRange(value, min, max, step, onInput) {
    const input = el('input', 'range');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function inputText(value, onChange, placeholder = '') {
    const input = el('input', 'text');
    input.type = 'text';
    input.value = value ?? '';
    input.placeholder = placeholder;
    input.addEventListener('change', () => onChange(input.value));
    return input;
  }

  function checkbox(value, onChange) {
    const input = el('input', 'checkbox');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', () => onChange(input.checked));
    return input;
  }

  function dispose() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose({});
  }

  function onKey(e) {
    if (e.key === 'Escape') dispose();
  }

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);

  navButtons[0].classList.add('active');
  renderSection('general');
  setTimeout(() => close.focus(), 30);

  return { dispose, renderSection, panel };
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Selector de archivo con botón visible (el input nativo es casi invisible). */
function filePicker(onChange) {
  const input = el('input', 'file-input-hidden');
  input.type = 'file';
  input.accept = 'image/*';
  const btn = el('button', 'btn');
  btn.type = 'button';
  btn.textContent = 'Elegir imagen…';
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (f) onChange(f);
    input.value = '';
  });
  const wrap = el('div', 'file-wrap');
  wrap.appendChild(btn);
  wrap.appendChild(input);
  return wrap;
}

function applyTheme() {
  // Se re-aplica el CSS del tema vía evento global (definido en main).
  document.dispatchEvent(new CustomEvent('nova:theme'));
}