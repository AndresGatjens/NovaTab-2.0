# Memoria del proyecto — Nova New Tab

## Estado

Versión 1.2.0 completa y compilada. Extensión de nueva pestaña (New Tab)
moderna, para Firefox/IceRaven (MV3) y Chrome/Chromium/Quetta (MV3).
Todos los datos locales (storage.local). Sin dependencias de npm: build con
script propio en Node (zlib nativo), iconos generados por script.

## Entregado (FASE 1-12)

- Búsqueda con 5 motores + personalizado con plantilla `{query}`.
- Cuadrícula de favoritos: añadir, editar, eliminar, reordenar, DnD, icono
  personalizado (dataURL/URL), favicon del sitio o icono generado.
- Carpetas de un nivel (listas para anidadas): crear, renombrar, eliminar,
  mover sitios dentro/fuera, reordenar. Al tocar una carpeta se navega DENTRO
  de ella en la propia cuadrícula, con una barra de navegación (volver,
  título, nº de elementos, botón "+") para añadir favorito ahí. Sin modal.
- Drag & Drop con indicador `.drop-target` y reordenamiento con posiciones.
- Personalización: tema claro/oscuro/auto, fondo color/gradiente/imagen
  local/URL, transparencia, blur, radio, icon-size, columnas, espaciado,
  mostrar/ocultar nombres y favicons, animaciones.
- Widgets: reloj (12h/24h), fecha, clima (dejado preparado, sin API por
  privacidad).
- Importar/exportar JSON con validación.
- Wrapper multiplataforma `src/storage/browser-api.js` (browser.* / chrome.*).
- Atajos: Ctrl+K, Ctrl+Shift+A, Ctrl+Shift+F, Escape.
- Accesibilidad: ARIA, roles, teclado, focus visible.
- Build: scripts/build.mjs genera dist/chrome y dist/firefox con sus manifests.

## Build y tests

- `npm run build` → dist/chrome + dist/firefox (cada uno 37 archivos).
- `npm test` → 12 tests OK (url, import/export).
- Smoke test manual: la app arranca sin errores con DOM simulado.

## Decisiones técnicas

- JavaScript moderno (ESM), sin TypeScript: menor complejidad, cero deps.
- Sin bundler: el árbol de `src/` se copia tal cual y el manifest apunta a
  `src/pages/newtab/newtab.html` (rutas relativas intactas).
- El background es un IIFE sin módulos para compatibilidad MV3 en ambos.
- Los iconos se generan con `scripts/icons.mjs` (encoder PNG propio + zlib) y
  se guardan en `public/icons/`.

## Pendientes / futuro

- Widget de clima: conectar API externa solo si el usuario la configura.
- Carpetas anidadas (el modelo ya tiene `parentId`).
- Publicar en las tiendas (requiere firma AMO para Firefox).