/**
 * Script de fondo mínimo, sin módulos (compatible con Chrome y Firefox MV3).
 * Sin banners ni console.log: la extensión no imprime nada por consola.
 */
(function () {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  if (!api || !api.runtime) return;
  api.runtime.onInstalled && api.runtime.onInstalled.addListener(function () {
    // Listo para servicios futuros (clima, sincronización). Sin acciones por ahora.
  });
})();