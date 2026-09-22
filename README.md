# Novantab

Extensión de **nueva pestaña** moderna, rápida y privada para Firefox, Chrome,
Chromium y navegadores compatibles con Manifest V3. Reemplaza la página de
"Nueva pestaña" con una interfaz personalizable: búsqueda, favoritos, carpetas,
widgets y configuración local.

> Inspirada en el concepto de "New Tab" moderno (sin copiar ningún producto).
> Diseño de referencia de estética UI: [uiverse.io/elements](https://uiverse.io/elements).

---

## Características

- 🔍 **Barra de búsqueda** con motor configurable: Google, Bing, DuckDuckGo,
  Brave Search, Ecosia o **motor personalizado** (`{query}` de plantilla).
- 📌 **Cuadrícula de favoritos**: añadir, editar, eliminar, reordenar,
  arrastrar y soltar, icono personalizado.
- 📁 **Carpetas**: crear, renombrar, eliminar; mover sitios dentro, fuera y
  entre carpetas; reordenar carpetas; abrir su contenido en un modal.
- 🖱️ **Drag & Drop** fluido con indicador visual de destino.
- 🎨 **Personalización**: tema (claro/oscuro/auto), fondo (color, gradiente,
  imagen local o por URL), transparencia, desenfoque, radio, tamaño de iconos,
  número de columnas, mostar/ocultar nombres y favicons.
- ⏱️ **Widgets**: reloj, fecha y **clima** (clima dejado preparado, sin API por
  privacidad). Todos pueden mostrarse, ocultarse y configurarse.
- 🔒 **100% local**: los datos viven en `storage.local`. Sin analítica, sin
  tracking, sin historial, sin servidores.
- 💾 **Importar/Exportar** la configuración en JSON (con validación).
- ⌨️ **Accesibilidad y atajos**: navegación por teclado, ARIA, focus visible,
  `Ctrl+K`, `Ctrl+Shift+A`, `Ctrl+Shift+F`, `Escape`.

---

## Instalación (versiones ya compiladas)

El build genera dos carpetas listas para instalar:

| Carpeta          | Navegador                                        |
| ---------------- | ------------------------------------------------ |
| `dist/chrome/`   | Chrome, Chromium, Brave, Edge y derivados MV3    |
| `dist/firefox/`  | Firefox, IceRaven, LibreWolf y derivados         |

### Chrome / Chromium / Quetta

1. Abre `chrome://extensions` (Chromium: `chrome://extensions`).
2. Activa el **modo desarrollador** (interruptor arriba a la derecha).
3. Pulsa **"Cargar descomprimida"**.
4. Selecciona la carpeta `dist/chrome/`.
5. Abre una **nueva pestaña** para ver la extensión.

> En Android con **Quetta**: activa "Permitir extensiones", carga la carpeta o
> el .zip de `dist/chrome/` desde Ajustes de extensiones, y usa una pestaña
> nueva para verla.

### Firefox / IceRaven

1. Abre `about:debugging#/runtime/this-firefox`.
2. Pulsa **"Cargar extensión temporal…"**.
3. Selecciona el archivo `dist/firefox/manifest.json`.
4. Abre una **nueva pestaña**.

Para instalación permanente en Firefox:

1. Comprime el contenido de `dist/firefox/` en un `.zip`.
2. Instala la extensión desde `about:addons` → engranaje → "Instalar desde archivo…".
   - Firma requerida para publicación oficial (AMO); para uso propio funciona
     con "instalar extensión temporal" o Firefox Developer Edition/Nightly.

---

## Build del proyecto

Requisitos: **Node.js ≥ 18**. Sin dependencias externas (script propio, zlib nativo).

```bash
npm run icons        # regenera los iconos PNG (opcional)
npm run build        # genera dist/chrome y dist/firefox
npm run build:chrome # solo Chrome/Chromium
npm run build:firefox# solo Firefox/IceRaven
npm test             # ejecuta los tests (validación de URLs e import/export)
```

Salida:

```
dist/
├── chrome/   → carga descomprimida en chrome://extensions
└── firefox/  → carga en about:debugging (IceRaven también)
```

---

## Estructura

```
browser-newtab/
├── src/
│   ├── background/          # script de fondo mínimo (sin banners/logs)
│   ├── components/          # search-bar, grid, modal, context-menu, settings…
│   ├── main/                # bootstrap, index (orquestador), forms, openers
│   ├── pages/newtab/        # newtab.html + main.css
│   ├── services/            # bookmarks, folders, settings, widgets, favicon, import-export
│   ├── storage/             # browser-api (wrapper) + store (persistencia)
│   ├── styles/              # variables, base, components (temas CSS)
│   └── utils/               # id, url, dom
├── public/icons/            # iconos generados (script propio, sin deps)
├── tests/                   # node --test
├── scripts/                 # build.mjs, icons.mjs
├── manifest.chrome.json
├── manifest.firefox.json
├── package.json
└── dist/                    # salidas listas para instalar
```

## Capa multiplataforma

El wrapper `src/storage/browser-api.js` detecta `browser.*` (Firefox/IceRaven)
o `chrome.*` (Chromium) y normaliza `storage.local` a Promesas, de modo que toda
la app usa `browserAPI.storage.get/set`. No hay lógica duplicada por navegador:
el único cambio entre builds es el `manifest.json`.

## Privacidad

- Todos los favoritos, carpetas, widgets y ajustes se guardan en
  `storage.local` del navegador.
- No se envía nada a servidores externos (salvo el favicon del propio sitio que
  solicita el usuario, y la búsqueda/web que el usuario pida).
- El widget de clima está **deshabilitado por defecto** y no realiza peticiones
  hasta que se integre la API.
- No hay analítica, ni publicidad, ni recopilación de historial.

## Atajos de teclado

| Atajo             | Acción                |
| ----------------- | --------------------- |
| `Ctrl+K` / `Cmd+K`| Enfocar búsqueda      |
| `Ctrl+Shift+A`    | Añadir sitio           |
| `Ctrl+Shift+F`    | Crear carpeta         |
| `Escape`          | Cerrar modal o menú    |

## Notas de compatibilidad

- **Chrome/Chromium**: Manifest V3, `chrome_url_overrides.newtab`.
- **Firefox ≥ 109**: Manifest V3 (requiere instalar como temporal si no está
  firmada). Se incluye `browser_specific_settings.gecko.id`.
- **IceRaven (Firefox para Android)**: usar `dist/firefox/`, cargar temporal o
  firmar para uso tan permanente como permita la versión.
- **Quetta (Chromium para Android)**: usar `dist/chrome/`, cargar extensiones
  desde su menú.

## Licencia

MIT. Hecho para un uso totalmente local y con respeto a la privacidad.