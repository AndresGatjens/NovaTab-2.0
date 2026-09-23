# Cambios del proyecto — Nova New Tab

## 2026-09-22 — Tamaño de texto MANUAL por widget

- Se elimina el auto-escalado con container queries (`cqmin`) del texto de los
  widgets: el usuario prefiere controlar el tamaño manualmente, de forma
  individual por cada widget.
- Añadido slider "Tamaño del texto" (0.5×–2×, paso 0.05) en el formulario de
  edición de CADA widget. Se guarda en `config.textScale`.
- CSS: `.widget { --widget-scale: 1 }` y todos los font-size de reloj/fecha/
  clima/calendario/notas se multiplican por `calc(… * var(--widget-scale))`.
- `.widget.sized` ya solo ajusta el padding (sin `container-type`).
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Notas: sin parpadeo al escribir + botón "+" para nueva nota

- BUG: al escribir en el widget de notas, cada guardado (`updateWidget` →
  `storage.set`) disparaba `storage.onChanged` que re-renderizaba todos los
  widgets en la misma pestaña → el textarea se reconstruía (parpadeo y pérdida
  de foco).
- Fix en index.js: `storage.onChanged` ahora omite los cambios que ya coinciden
  con el estado en memoria (proceden de esta misma pestaña), evitando re-render.
- Añadido botón "+" (`.widget-addnote`, esquina sup. derecha, visible al pasar
  el ratón) dentro del widget de notas que crea OTRA nota sin salir de esta.
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — DnD entre ventanas: auto-scroll horizontal al arrastrar

- Al arrastrar una carpeta/icono al borde derecho/izquierdo de la ventana, las
  páginas NO avanzaban (no había auto-scroll) → el tile se soltaba en la misma
  página. 
- Añadido auto-scroll en `dragover` del host (grid.js): si el puntero entra en
  los 64px del borde, avanza/retrocede una página cada ~380ms (carrusel).
- El `drop` ahora calcula la página destino por la POSICIÓN REAL del puntero
  (rect + scrollLeft), no por scrollLeft solo, más fiable durante el scroll.
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Calendario compacto

- El widget de calendario se veía "exagerado muy grande": meses con
  `min-height: 200px` y días con `aspect-ratio: 1` hacían crecer el widget.
- Ahora compacto: días con altura fija 30px, gaps 3px, cabecera 15px, días
  13px, `min-width` del widget 240px, sin `min-height`. El modo redimensionado
  mantiene celdas compactas (`height: auto` + padding).
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Texto de los widgets: más grande y con presencia

- El texto de los widgets se veía "super chiquito y sin presencia". Causas:
  mínimos del escalado `cqmin` muy bajos (9-12px) y fondo acrílico casi
  transparente (opacidad 0.12) que quitaba contraste.
- Subidos los tamaños base: reloj `clamp(34px, 6vw, 54px)` (antes 28-44) y peso
  700; fecha 16px/600; temperatura `clamp(34px, 5vw, 50px)`/700; descripción
  14px/600; calendario header 17px, días 14px/600; notas 15px.
- Escalado `.widget.sized` con mínimos mayores (reloj/temp min 24px vs 12px,
  fecha/desc min 12px, calendario min 10px, notas min 12px).
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Superficies unificadas al tono acrílico de las carpetas

- Barra de búsqueda (`.search-box`), tarjetas (.card) y widgets (.widget)
  usaban `--card-bg`/`--card-border` (blanco opaco 0.85) → creaban un segundo
  tono frente a las carpetas. Ahora todas usan `--folder-bg`/`--folder-border`
  (translúcido acrílico, el mismo de las carpetas del grid).
- `.fav-wrap` usa `--folder-preview-item-bg` en lugar del blanco fijo.
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Widget de Notas / Pendientes

- Nuevo widget tipo `notes`: un textarea editable dentro del widget. El texto se
  guarda solo (debounce 400ms y en change) en `config.text`.
- Se añade desde Configuración → Widgets → "Más widgets" → Notas / Pendientes.
- El drag no se dispara al tocar el textarea (excluido `.notes-input`), permite
  seleccionar/escribir. Escala con el marco si el widget se redimensiona
  (`.sized .notes-input` con `cqmin`).
- CSS `.notes`, `.notes-input`, `.widget-notes`. Título/nota en forms.js.
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — El texto de los widgets se adapta al redimensionar

- Al agrandar o reducir un widget, su contenido (reloj, clima, fecha,
  calendario) ahora ESCALA con el marco usando container queries: `.widget.sized
  { container-type: size }` y fuentes en unidades `cqmin`
  (`clamp(12px, 40cqmin, 90px)` etc.). Con `overflow: hidden` el texto jamás se
  sale del borde.
- La clase `sized` se aplica al render si el widget ya tiene w/h guardados, y en
  vivo al iniciar el resize (pointerdown). Estilos por tipo (reloj/clima
  grandes, fecha/desc, calendario compacto).
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Clima: temperatura centrada en el cuadro

- La temperatura del widget de clima salía desplazada/de lado. Nueva regla
  `.weather`: flex column con `align-items/justify-content: center`,
  `width: 100%` y `text-align: center`; además `text-align: center` en
  `.weather-temp`. Ahora la temperatura queda centrada dentro del cuadro.
- Rebuild → dist/chrome (43 archivos). 16 tests OK.

## 2026-09-22 — Widget de Calendario

- NUEVO widget de **Calendario** (`type: 'calendar'`): muestra el mes actual con
  cabecera en mayúsculas, fila de días de la semana (L-D), rejilla del mes y el
  día de hoy resaltado con el color de acento. Desactivado por defecto en
  `DEFAULT_WIDGETS` (como el clima) y añadible desde Configuración > Widgets >
  "Más widgets" junto a Clima.
- `renderCalendar` en widgets.js (días en lunes, hoy con `--accent`).
- Formulario de edición: "Editar calendario" sin ajustes extra.
- CSS: `.calendar`, `.calendar-header`, `.calendar-week(day)`, `.calendar-grid`,
  `.calendar-day(.today/.blank)`, `.widget-calendar` (min-width 250px).
- Rebuild → dist/chrome (43 archivos). 16 tests OK, node --check OK.

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

## 2026-09-22 — i18n ES completo; EN pendiente de 18 claves (RETOMAR)
- Verificación autoritativa por bloques (`src/services/i18n.js`): **es = 152
  claves, en = 134**. `ES` está **COMPLETO** — las 18 claves que faltaban ya
  están insertadas y comprobadas una a una en el bloque es.
- **PENDIENTE (única tarea):** el bloque `en` NO tiene estas 18 claves usadas.
  Insertarlas en `en` con su traducción (todas existen en `es`, solo copiar
  valor EN):
    1. folderForm.create
    2. siteForm.add
    3. siteForm.iconEmpty
    4. siteForm.iconError
    5. siteForm.iconFailed
    6. siteForm.iconHint
    7. siteForm.iconPreview
    8. siteForm.iconTitle
    9. siteForm.saveIcon
   10. siteForm.useFavicon
   11. weatherForm.city
   12. weatherForm.configured
   13. weatherForm.hint
   14. widget.clock.ampm
   15. widget.clock.format
   16. widget.clock.h12
   17. widget.clock.h24
   18. widget.weather.units
- Cómo verificar al retomar (script fiable, PARSING DE BLOQUES, no grep
  simple): `python3 _check_i18n.mjs` no funciona (imports relativos); usar el
  heredoc de `blk('es')`/`blk('en')` con regex `'([^']+)':` y comparar contra
  las usadas por `\bt\('([^']+)'\)` en `src/**/*.js`. Objetivo: 0 faltantes
  en ES y EN.
- SIN commitear: 18 claves de EN aún no están. Hacer commit único cuando EN
  quede completo (norma: no commitear a medias).
## 2026-09-22 — i18n COMPLETO (ES+EN) y captura de referencia — LISTO
- **i18n.js: es=152, en=152, 0 claves faltantes** (verificado por análisis de
  bloques + uso real vía `t('...')` en src/**/*.js).
- ES ya estaba completo; se completó EN añadiendo las 18 claves que faltaban
  (siteForm.add/iconEmpty/iconError/iconFailed/iconHint/iconPreview/
  iconTitle/saveIcon/useFavicon, folderForm.create, weatherForm.city/
  configured/hint, widget.clock.ampm/format/h12/h24, widget.weather.units).
- Tests: 16/16 OK · Build: dist/chrome (44 archivos) OK.
- **Estado: TODO VERIFICADO. Commit único pendiente de ejecutar:**
  `git add -A && git commit -m "i18n completo (es/en) + captura de referencia"`
  seguido de `git tag v2.0.0 && git push origin main --tags` y release
  "Novantab v2.0.0" (asset novantab-chrome.zip). Revisar antes `git status`.
--- 2026-09-22 · CIERRE DE SESIÓN (guardar y continuar mañana) ---
- ✅ i18n COMPLETO y VERIFICADO: es=152, en=152, used=106, **0 faltantes**
  (script por bloques `blk('es')`/`blk('en')` + uso real `t(...)` en src/**).
- ✅ 16/16 tests OK · build OK (dist/chrome, 44 archivos) · SINTAXIS OK en
  i18n.js/forms.js/index.js.
- ✅ Commit único `bafb39d` (i18n + captura preview.png + README) PUSHEADO a
  origin/main.
- ✅ Captura de referencia subida al repo (screenshots/preview.png, referenciada
  en README sección "🤖 ¿Cómo se ve?").
- ⚠️ PENDIENTE DECIDIR mañana (NO forzado hoy): el tag v2.0.0 está en
  389d721 (commit anterior), NO incluye el i18n. Opciones: (a) `git tag -f
  v2.0.0` + `git push origin v2.0.0 --force` (release v2.0.0 pasa a incluir
  el i18n), o (b) crear v2.0.1. Elegir con el usuario. El release de GitHub
  apunta al tag v2.0.0.
- Próximo paso mañana: confirmar con el usuario tag/release (a/b) y, si toca,
  editar el release para adjuntar el asset novantab-chrome.zip desde dist/chrome.
## 2026-09-22 — Release v2.0.1 publicado con i18n completo ✓
- **Release `v2.0.1`** (tag `v2.0.1`, id 394286701) con asset
  `novantab-chrome.zip` (64 914 bytes) → el zip que incluye el i18n ES/EN
  completo + captura. Download:
  https://github.com/AndresGatjens/NovaTab-2.0/releases/download/v2.0.1/novantab-chrome.zip
- Commit subyacente: `bafb39d` (i18n 152/152 por idioma, 0 faltantes) pusheado
  a origin/main. 16/16 tests OK · build OK (dist/chrome 44 archivos).
- TAREA CERRADA. ✔
## 2026-09-23 — Sección "Gestor Nova" en Configuración → Datos
- Nueva sección en el panel de config (src/components/settings-panel.js, renderDatos):
  botón "Abrir Gestor Nova" que abre http://127.0.0.1:8734 (chrome.tabs.create)
  + estado del servidor local (fetch a /api/datos con AbortSignal.timeout 1500,
  indicador .gestor-status con punto verde/rojo).
- i18n: 4 claves nuevas es/en (config.gestor.title/note/open/online/offline = 5).
- CSS: .gestor-status y .ok (components.css).
- manifest.chrome.json: host_permission http://127.0.0.1:8734/* añadido para
  poder comprobar el estado del servidor desde la extensión.
- Build OK (dist/chrome 44 archivos), sintaxis OK.
- MOVIMIENTO: según el usuario, la sección "Gestor Nova" encaja mejor en la
  pestaña Cuadrícula (maneja carpetas/enlaces del grid) que en Datos.
  Movida de renderDatos a renderCuadricula (al final). Build OK.
- CAPTURAS de referencia subidas: screenshots/settings-cuadricula.png
  (panel con el botón Gestor Nova) y screenshots/gestor-nova.png (la app),
  referenciadas en el README en la sección "¿Cómo se ve?".
- SINCRONIZACIÓN en ambas direcciones (sección Cuadrícula → Gestor Nova):
  - "Enviar a Gestor": POST /api/guardar con buildExportPayload() → el
    servidor valida y escribe el archivo (ya existía el endpoint).
  - "Aplicar del Gestor": GET /api/datos → validateImport/applyImport →
    toast + dispose() (onClose re-renderiza el grid).
  - i18n: config.gestor.push/pull/sent/applied/error + nota actualizada
    (es/en).
- IMPORTANTE: Guardar en la herramienta NO cambia la página; hay que pulsar
  "Aplicar del Gestor" en Configuración › Cuadrícula (o importar el JSON).
- Gestor web: mensaje post-Guardar avisa de ese paso.
- FIX BUG: context-menu.js tiraba "item.onClick is not a function" al hacer clic
  en items con submenú sin onClick ("Mover a carpeta…"). Ahora se comprueba
  typeof onClick antes de llamarlo (también en los items del submenú).
  16/16 tests OK.
## 2026-09-23 — Widgets flotantes con resolución + fecha/clima configurables — LISTO
- **Widgets flotantes inteligentes** (src/utils/layout.js NUEVO): resolveFloat/
  nearestFree/clampRect mantienen cada widget flotante DENTRO de la pantalla y
  SIN pisar la barra de widgets ni otros flotantes. Correcciones persistidas:
  - Al renderizar (resolve() en renderWidgetsBar → persiste x/y si los datos
    guardados quedaron antiguos/fuera de pantalla).
  - Al soltar un drag (resolveInteractive en pointerup).
  - Al terminar un resize (también clampea w/h al viewport).
  - Al redimensionar la ventana (listener resize en index.js con debounce 150ms).
  - renderWidgetsBar ahora devuelve { wrap, resolve } en vez del nodo directo
    (index.js adaptado).
- **Fecha configurable** (renderDate): 7 formatos vía config.format
  (full/long/medium/short/numeric/daymonth/weekday) + inicial en mayúscula.
  Selector en renderWidgetForm + claves i18n es/en nuevas (widget.date.*).
- **Clima con detalle configurable** (renderWeather): config.detail
  (desc/wind/humidity/feels), unidades correctas °C/°F y km/h/mph;
  selector en renderWidgetForm + i18n (widget.weather.detail/desc + reúso
  weather.wind/humidity/feels).
- **defaultConfig(type)** en services/widgets.js: reloj 12h+ampm, fecha full,
  clima metric+desc, notes {text:''}.
- Quitado el submenú "Mover a carpeta…" del menú contextual de favoritos
  (bookmarkMenu) junto con import de topLevelFolders.
- **Limpieza**: dist/ removido del tracking de git (ya estaba en .gitignore;
  ahora el repo solo versiona src/). Build regenera dist/chrome.
- Verificación: 16/16 tests OK · sintaxis OK · build OK (45 archivos) ·
  i18n ES=172 EN=172 con 0 claves faltantes de las 128 usadas.
- Commit c10bbbe pusheado a origin/main.
## 2026-09-23 — Clima arreglado: multiselección de detalles + edición real - commit d120a03
- **BUG RAIZ:** renderWeatherForm guardaba `config: { location }` REEMPLAZANDO todo el
  config (borraba unidades, detalle, textScale...). Además el detalle era 1 sola opción
  y una vez guardada la ubicación no había botón para corregirla.
- **Fix flujo:** eliminado renderWeatherForm y su enlace onWeatherConfig. El botón
  "Configurar clima" y el menú contextual "Editar…" abren el MISMO editor
  (renderWidgetForm) con ubicación siempre editable.
- **Detalles multiselección:** config.details pasa a ser ARRAY. Checkboxes
  (descripción/viento/humedad/sensación) se marcan varias a la vez y el widget
  muestra una línea por opción marcada (`.weather-lines`/`.weather-line`).
  Retrocompat: si existe `detail` string se migra a `[detail]`.
- i18n: quitadas weatherForm.configured y weatherForm.hint (sin uso). ES=EN=170.
- Verificado: 16/16 tests · build OK (45) · sintaxis OK · API Open-Meteo OK
  (geocoding 3598132 Ciudad de Guatemala + forecast 200 OK).
- PUSHED a origin/main (d120a03). dist/ sigue fuera del repo.
## 2026-09-23 — Fix: cambiar ciudad no refrescaba el clima - commit 7a3c42d
- **CAUSA:** en weather-api.js el caché weatherCache NO guardaba qué ciudad se
  pidió; dentro de los 10 min servía el clima de la ciudad ANTERIOR aunque se
  hubiera guardado una uba nueva.
- **Fix:** variable weatherCacheCity; el caché solo se usa si coincide con la
  ciudad actual (case-insensitive). Probado en simulación: Madrid 20° → guardar
  París 15° (4 fetches: 2 geocoding + 2 forecast). OK.
- **Fix 2:** el setInterval de refresco en renderWeather era global/único
  (weatherTimer) en vez de acumular timers viejos con la config anterior.
- 16/16 tests OK · build OK · PUSHED a origin/main (7a3c42d).
## 2026-09-23 — Fix: botón Guardar del clima roto - commit 0fed69c
- **CAUSA:** en forms.js `locInput` se declaraba `const` DENTRO del bloque
  `if (widget.type === 'weather')`, pero el handler del botón Guardar (fuera del
  bloque) lo usaba -> ReferenceError al pulsar Guardar = no guardaba la ciudad.
- **Fix:** `locInput` ahora `let` a nivel de función, asignado dentro del bloque.
- **Test de regresión:** tests/weather-form.test.js (ejecuta renderWidgetForm y
  pulsa Guardar con mock.module). `npm test` ahora con
  `--experimental-test-module-mocks` (Node >=22.3). 18/18 tests OK · build OK.
- PUSHED a origin/main (0fed69c).
