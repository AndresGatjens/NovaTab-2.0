# Cambios del proyecto — Nova New Tab

## 2026-09-22 — Carpetas e iconos se mezclan libremente en el grid (revueltos)

- NUEVO orden global del grid raíz: `gridOrder`, un array que mezcla carpetas e
  iconos en UNA sola secuencia (`folder:<id>` / `bookmark:<id>`). El usuario
  puede dejar carpetas entre iconos e iconos entre carpetas, como los acomode.
- Nuevo servicio `src/services/tiles.js`: `getRootTileKeys()`, `getRootItems()`,
  `reorderRootTile()`, `insertRootTile()`, `removeRootTile()`, `rootTileIndex()`.
  Si `gridOrder` no existe o está vacío, mantiene el orden clásico (carpetas
  primero, luego iconos) y rellena los tiles nuevos al final.
- `renderGrid` ahora intercala carpetas e iconos desde `getRootItems()` (ya no
  las separa con carpetas primero).
- DnD en la vista raíz usa el orden global: soltar un tile sobre otro lo
  recoloca en esa posición; soltar sobre una carpeta sigue metiéndolo DENTRO de
  esa carpeta. Soltar sobre hueco vacío lo mueve a la página/ventana destino.
- Crear carpeta o icono nuevo en raíz lo inserta en `gridOrder` en la página
  visible. Eliminar o mover a carpeta quita el tile del orden.
- `store.js` (`gridOrder` en defaults + sanitize), `import-export.js` (exporta e
  importa `gridOrder`).
- Nuevo test `tests/tiles.test.js` (4 tests del orden mezclado). Total 16 tests
  OK. Rebuild → dist/chrome (43 archivos, incluye tiles.js).

## 2026-09-22 — Iconos y carpetas arrastrables entre ventanas del grid

- `onEmptyDrop` ahora reordena TAMBIÉN los favoritos (no solo carpetas) hacia la
  página/ventana destino donde se suelta:
  - Dentro de una carpeta: `reorderBookmark(id, pageIndex * per, carpeta)`.
  - Raíz → raíz: `reorderBookmark` con offset ajustado (los bookmarks van tras
    las carpetas en el grid: `pageIndex * per - nºcarpetas`).
  - Otra carpeta → raíz: `moveBookmark` a raíz + `reorderBookmark` en la página
    destino.
- Las carpetas ya se movían a la página destino desde el cambio anterior.
- `pageSize` centralizado: se calcula igual que en grid.js (columns × rows).
- Rebuild → dist/chrome (42 archivos). 12 tests OK, node --check OK.

## 2026-09-22 — Carpetas: mover/crear en cualquier ventana del grid

- ELIMINADA la limitación "las carpetas solo se pueden soltar sobre otra
  carpeta". Ahora `onEmptyDrop` también acepta carpetas: al soltar una carpeta
  en un hueco vacío se mueve a esa página/ventana del grid (`reorderFolder` a
  `pageIndex * pageSize`), con toast "Carpeta movida". Los favoritos mantienen
  el comportamiento de salir a la raíz.
- `grid.js` pasa el `pageIndex` calculado del scroll al callback `onEmptyDrop`,
  y exporta `currentPage(host)` (página visible actual).
- Las carpetas nuevas se crean en la página/ventana visible: `addFolder` acepta
  una `position` opcional (desplaza el resto de carpetas raíz) y
  `renderFolderForm` la calcula como `currentPage(this.gridHost) * pageSize`.
  Ya no se añaden siempre al final.
- `index.js` guarda `this.gridHost` (host de páginas raíz o de carpeta) en
  `renderGrid()` para conocer la ventana activa.
- Rebuild → dist/chrome (42 archivos). 12 tests OK, node --check OK.

## 2026-09-22 — Renombrada a "Novantab"

- "Nova New Tab" ya estaba tomada en las tiendas de extensiones; la extensión
  pasa a llamarse **Novantab**.
- Actualizado: manifest.chrome.json y manifest.firefox.json (name, short_name,
  default_title del context menu, id de firma Firefox), package.json ("name"),
  título del popup (popup.html) y nombres de archivo/marca de export-import
  (`novantab-config-*.json`, `meta.app: 'novantab'`).
- Verificado con grep: sin referencias a "Nova New Tab", "NovaTab" ni
  "nova-new-tab". Rebuild → dist/chrome y dist/firefox (42 archivos c/u).

## 2026-09-22 — Redimensionado manual (Android) en lugar de presets

- Corregido bug: el botón "Guardar" del formulario de edición de widget NO hacía
  nada (falla silenciosa). Las variables `chosen`, `ampmCheck`, `locField` y
  `units` estaban declaradas DENTRO de los bloques `if` (ámbito de bloque), fuera
  del alcance del callback de Guardar → lanzaba ReferenceError. Ahora el estado
  del formulario (`clockFormat`, `clockAmpm`, `weatherLocation`, `weatherUnits`)
  vive en el ámbito de la función, y los inputs/seg se actualizan al cambiar.
- ELIMINADOS los presets de tamaño del formulario (Compacto/Normal/Grande,
  config `shape`, dataset `data-shape` y su CSS). El usuario prefirió ajuste
  manual.
- NUEVO redimensionado manual estilo Android: cada widget lleva un asa en la
  esquina inferior derecha (`.widget-resize`, cursor nwse-resize) que permite
  arrastrar para cambiar ancho/alto (mín 72x44, sin exceder el viewport).
  Al soltar se guarda en la config del widget (`w` y `h`) y se re-renderiza.
- `renderWidget` aplica `cfg.w`/`cfg.h` como tamaño inline si existen y sigue
  centrando el contenido. `enableWidgetResize` usa pointer events con captura
  en el asa (los movimientos se re-targetan al asa, no al nodo).
- CSS: `.widget-resize` visible al hover (como la X), estado `.widget.resizing`
  desactiva selección. El asa es `button` para que el drag del widget
  (`closest('button')`) lo ignore y no entren en conflicto.
- Rebuild → dist/chrome y dist/firefox (42 archivos c/u). 12 tests OK,
  node --check OK.

## 2026-09-22 — Widgets: restauración en Configuración + clic derecho Editar

- ELIMINADO el botón "+" (widget-add) de la barra de widgets de inicio: ya no
  aparece para restaurar widgets. También eliminado su drag/menú flotante y el
  ajuste `widgetAddPos`. Limpiados imports (addWidget/updateSettings/clearNode),
  defaults y CSS (.widget-add).
- NUEVA sección "Widgets" en Configuración (pestaña entre Apariencia y
  Cuadrícula): lista de widgets Activos ("Ocultar"), Ocultos ("Restaurar") y,
  si no existe, "Más widgets → Clima (Añadir)". Refresca el panel al tocar.
- Clic derecho sobre un widget abre menú con "Editar…" (siempre) + Volver a la
  barra / Ocultar (según corresponda). `handlers.onEdit` → `renderWidgetForm`.
- NUEVO formulario de edición de widget (`renderWidgetForm` en forms.js):
  - Reloj: formato 12h/24h (seg) y checkbox "Mostrar AM/PM" (config `ampm`).
  - Clima: ciudad + unidades °C/°F (config `units`, conversión en renderWeather).
  - Todos: Tamaño como en Android — Compacto/Normal/Grande (config `shape`,
    CSS `[data-shape]`: min-width, padding y font del reloj/clima).
- widgets.js: `renderWidget` aplica `data-shape`/`data-units`; clock y weather
  respetan las nuevas config. Capa `.widgets-layer` ya no es aria-hidden.
- Rebuild → dist/chrome y dist/firefox (42 archivos c/u). 12 tests OK,
  node --check OK. Verificado en dist (widgetAddPos fuera, Editar dentro).

## 2026-09-22 — Botón "+" de widgets arrastrable (flotante)

- El botón de añadir/restaurar widgets (el "+" que aparece cuando hay widgets
  ocultos o falta el clima) ahora es arrastrable: se puede soltar en cualquier
  punto y queda ahí, recordando la posición en `settings.widgetAddPos`
  (`{x,y}`). Nuevo campo en `DEFAULT_SETTINGS`.
- Si hay posición guardada se renderiza `floating` en la capa de widgets; si
  no, en la barra. Clic abre el menú de restauración como antes; arrastrar
  no dispara el menú (dataset.dragged).
- Menú contextual (clic derecho) en el botón flotante: "Volver a la barra"
  (borra `widgetAddPos`).
- CSS: `.widget-add.floating` y `.widget-add.floating.dragging`
  (position fixed, grab, z-index). Capa `.widgets-layer` ya no es aria-hidden
  para que el botón sea accesible.
- NOTA: revertido en el cambio siguiente — el usuario prefirió mover la
  restauración de widgets a Configuración y quitar el botón del inicio.
- Rebuild → dist/chrome y dist/firefox (42 archivos c/u). 12 tests OK.

## 2026-09-22 — Carpeta de color claro ya no se queda oscura (fix)

- `.folder-card`, `.folder-preview(-item/-empty)` usaban `rgba(255,255,255,…)`
  fijos pensados para el tema oscuro; en tema claro las carpetas quedaban
  transparentes/oscuras.
- Nuevas variables por tema en `variables.css`: `--folder-bg`, `--folder-bg-hover`,
  `--folder-border`, `--folder-preview-bg`, `--folder-preview-item-bg`,
  `--folder-preview-empty-bg`. En `[data-theme="light"]` se definen valores
  claros (blanco translúcido alto); en `[data-theme="dark"]` se conservan los
  valores originales. Componentes actualizados para usarlas.
- Rebuild → dist/chrome y dist/firefox (42 archivos c/u). 12 tests OK.

## 2026-09-22 — Ver el contenido de las carpetas sin abrirlas en modal (v1.2.0)

- Al tocar una carpeta ya NO se abre un modal: se navega dentro de la carpeta
  en la propia cuadrícula principal, con una barra de navegación (`.folder-bar`)
  con botón "Volver" (←), título clicable (también vuelve), contador de
  elementos y botón "+" para añadir un favorito directamente en esa carpeta.
- `index.js`: `showFolder()` ahora renderiza `renderFolderBar()` + la
  cuadrícula de la carpeta en `grid-slot` (subcontenedor
  `.folder-grid-host` para que el `clearNode` de `renderFolderGrid` no borre
  la barra). Nuevo `goUpToRoot()`. Eliminado el flujo del modal
  (`openFolderView`, `renderFolderContent`, `_folderGridSlot`).
- Borrar la carpeta en la que estás vuelve automáticamente al nivel superior.
- Eliminado `src/components/folder-view.js` (código muerto) y su CSS
  (`.folder-view`, `.folder-view-heading`), reemplazado por estilos de
  `.folder-bar` (+ media query que oculta el contador en móvil).
- Menú contextual de carpeta: "Abrir carpeta" → "Entrar".
- Versión 1.1.0 → 1.2.0 en ambos manifests.
- Verificación: `npm run build` OK (41 archivos c/u), 12 tests OK, smoke test
  de arranque con DOM simulado que valida entrar/volver en carpetas y el
  borrado de la carpeta actual.

## 2026-09-22 — Creación y build v1.0.0

- Creado el proyecto en `Proyectos_En_Proceso/browser-newtab` (permisos fijados
  con sudo: propietario anonymous).
- Estructura `src/` (background, components, main, pages, services, storage,
  styles, utils) + public/icons + scripts + tests.
- Wrapper multiplataforma `browser-api.js` (detecta browser./chrome., storage
  promisificado).
- Estado en `storage/store.js` (clave `novaNewTab.state.v1`, sanitiza y aplica
  defaults). Servicios: bookmarks, folders, settings, widgets, favicon,
  import-export.
- Componentes: search-bar, grid (con DnD), modal, context-menu, settings-panel,
  widgets, folder-view, toast.
- Página `src/pages/newtab/newtab.html` + main.css + temas en CSS variables.
- Manifests: manifest.chrome.json y manifest.firefox.json (MV3; gecko.id para
  Firefox ≥ 109). Build: `scripts/build.mjs` → dist/chrome y dist/firefox.
- Iconos PNG generados con `scripts/icons.mjs` (sin dependencias).
- Tests en `tests/` (url + import-export): 12 tests OK.
- README.md con instrucciones para Chrome/Chromium/Quetta y Firefox/IceRaven.
- Verificación: imports resuelven, referencias del HTML existen, smoke test de
  arranque sin errores.
## 2026-09-22 — Arreglos de diseño y más motores (v1.0.1)

- Menú de motores: elevado por encima de la cuadrícula (`.search-slot z-index: 30`)
  y con scroll/max-height. Ya no queda oculto tras las tarjetas.
- Botón selector de motor con elipse (nombres largos no rompen la barra).
- Añadidos todos los motores de búsqueda existentes (19 total): Google, Bing,
  DuckDuckGo, Brave, Ecosia, Startpage, Qwant, Yahoo, Yandex, Mojeek, SearXNG,
  AOL, Ask, OneSearch, Naver, Baidu, Seznam, Swisscows, Presearch, Marginalia.
  Sin API keys: URLs públicas con plantilla `{query}`.
- Editar iconos: nueva opción "Cambiar icono…" en el menú de cada favorito, con
  formulario propio (preview en vivo, validación, "Usar favicon del sitio").
- Botón ⋯ de cada tarjeta ahora siempre semi-visible (opacity 0.55) para que se
  note que es editable.
- Favicon robusto: se valida el icono personalizado (https/data/blob); si la
  imagen falla al cargar, cae al icono generado automáticamente.
- Tests: 12 OK. Rebuild dist/chrome y dist/firefox (37 archivos c/u).
- Scrollbar del menú de motores visible (thumb con color accent, thin en Firefox).
- Selector de color de fondo: reemplazado el diálogo nativo (se salía de la
  página) por una paleta de 24 colores integrada en el panel; extensible al
  gradiente (de/a). Scrollbar del menú de motores visible.
- Restaurada/clarificada la carga de imagen de fondo: botón visible "Elegir
  imagen…" (el input nativo era casi invisible en tema oscuro y parecía que
  se había quitado). Se mantiene "Imagen por URL".
- Color de fondo: barra completa de color (Matiz 0-360 + Saturación + Luz con
  vista previa) que cubre todos los tonos, junto a la paleta de presets;
  ambas sincronizadas. Sigue sin usar el diálogo nativo.
- Separado el concepto Tema/Fondo: nuevo ajuste `accent` = color de la
  interfaz (cuadrícula, barra de búsqueda, botones, sliders). 9 paletas
  selectables en Configuración > Apariencia > "Color de tema". El fondo se
  sigue configurando aparte en la sección "Fondo". Aplica vía CSS vars
  --accent/--accent-2/--accent-3 en applyTheme().
- "Color de tema": además de los 9 presets, barra de color completa
  (Matiz/Saturación/Luz) para acento personalizado. Si el color coincide con
  un preset vuelve a él; si no, se guarda como accent:'custom' con tríada
  derivada (expandAccent). Utilidades de color movidas a src/utils/color.js.
- "Color de tema": añadida la misma paleta de presets que el fondo (24
  colores) para elegir el acento rápido; sincronizada con la barra.
## 2026-09-22 — Quitados los círculos grandes de "Color de tema" (v1.0.2)

- Eliminados la rejilla de 9 círculos grandes (`accent-grid`/`accent-opt`)
  de la sección "Color de tema": ya no aportaban nada porque debajo está la
  cuadrícula de 24 colores de la paleta, que las cubre.
- El código `src/` ya no los generaba; quedaban solo por un dist desactualizado.
- Rebuild: `npm run build` → dist/chrome y dist/firefox (39 archivos c/u,
  sin `accent-opt`).
## 2026-09-22 — Tarjetas más pequeñas y ajustadas (en src/styles/components.css)

- Las tarjetas ya no ocupan toda la celda de la cuadrícula: ahora se centran y
  se ajustan al contenido (`width: fit-content`, `justify-self: center`,
  `max-width: 100%`, `min-width: 84px`).
- Padding reducido (20/14 → 12/10) y gap interno de 8 → 6px para que el
  rectángulo translúcido quede pegado al icono.
- Rebuild → dist/chrome y dist/firefox (39 archivos c/u).
## 2026-09-22 — Popup del icono anclado: añadir página actual (v1.1.0)

- Al hacer clic en el icono de la extensión (anclado en la barra del navegador)
  se abre un popup (`src/pages/popup/`) que muestra la pestaña activa (título,
  dominio, favicon) con el botón "Agregar a la cuadrícula".
- Si la URL ya existe en la cuadrícula, solo actualiza el título y avisa
  "Ya está en la cuadrícula". Si la página no es HTTP(S) (chrome://, about:…)
  avisa que no se puede añadir.
- Botón secundario "Nueva pestaña" (mismo comportamiento que antes).
- Manifests: añadido `default_popup` al `action` y permiso `activeTab`.
- La pestaña nueva abierta se refresca sola al añadir (listener
  `storage.onChanged` en main/index.js) → la cuadrícula se actualiza al vuelo.
- Rebuild → dist/chrome y dist/firefox (42 archivos c/u).
## 2026-09-22 — Despliegue al Armor 24 (v1.1.0)

- Versión subida a 1.1.0 en ambos manifests.
- Empaquetado (python3, sin `zip`): `novatab-quetta.zip` (dist/chrome) y
  `novatab-iceraven.xpi` (dist/firefox), manifest en raíz, 42 archivos c/u.
- Subidos al Armor 24 por ADB USB a `/sdcard/Download/` (reemplazan a los
  anteriores). Queda recargar la extensión en Quetta e IceRaven desde el
  propio teléfono.
## 2026-09-22 — Adiós a los tres puntos: mantener pulsado 7s para editar

- Eliminado el botón ⋯ (`.card-menu`) de las tarjetas de favoritos y carpetas.
- Nueva interacción táctil: **mantener pulsado 7 s** sobre un icono o carpeta
  abre su menú contextual (editar/cambiar icono/mover/renombrar/eliminar).
  Con barra de progreso bajo la tarjeta (`.card.holding` + keyframes) y
  vibración al abrirse.
- El clic corto sigue abriendo el enlace; con ratón sigue el clic derecho para
  el menú. Al mantener pulsado se suprime el clic posterior que abriría la web.
- CSS: limpiado `.card-menu`, añadido cursor pointer y `-webkit-touch-callout`
  para evitar el menú nativo de Android.
- Desplegado: dist/chrome (Brave de la PC lo carga descomprimido desde
  dist/chrome, id efpabklg) + `novatab-quetta.zip`/`novatab-iceraven.xpi`
  subidos de nuevo al Armor por ADB (verificado: longpress dentro, sin
  card-menu).
