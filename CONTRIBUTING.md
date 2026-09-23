# Contribuir a Novantab

¡Gracias por querer mejorar Novantab! Cualquier aporte — código, diseño, docs o
reportes — es bienvenido. La extensión es **100 % local**, sin dependencias
externas ni servidores, y así debe continuar.

## Cómo empezar

1. **Fork** el repositorio.
2. Clona tu fork:
   ```bash
   git clone https://github.com/<tu-usuario>/NovaTab-2.0.git
   cd NovaTab-2.0
   ```
3. Instala y compila:
   ```bash
   npm run build          # genera dist/chrome
   npm test               # tests de URLs e import/export
   ```
   Requisito: **Node.js ≥ 18**. Sin `npm install` (no hay dependencias).

4. Carga la extensión en Chrome/Chromium/Brave/Edge:
   - `chrome://extensions` → modo desarrollador → **"Cargar descomprimida"** →
     selecciona `dist/chrome/`.

## Guía de estilo y arquitectura

- **Sin banners ni `console.log`**: nada se imprime por consola en la extensión.
- **Sin dependencias externas**: el build usa solo Node + zlib nativo. No añadas
  librerías salvo que sea imprescindible y lo discutas primero.
- **Modular**: el código vive en `src/`:
  - `components/` → UI (search-bar, grid, modal, context-menu, settings…)
  - `services/` → lógica (bookmarks, folders, settings, widgets, import-export…)
  - `storage/` → `browser-api` (wrapper multiplataforma) + `store` (persistencia)
  - `pages/newtab/` → punto de entrada HTML/CSS
- **Persistencia**: todo se guarda vía `browserAPI.storage.get/set` en
  `storage.local`. No uses ventanas/servidores nuevos para guardar.
- **Compatibilidad**: todo debe funcionar con `chrome.*` (Chrome/Chromium/Brave/
  Edge/Quetta). No asumas un `browser.*` exclusivo.
- **Privacidad**: ningún cambio puede enviar datos fuera del navegador sin
  pedirlo explícitamente al usuario.

## Cómo probar tus cambios

- `npm test`: suite con `node --test` (valida URLs e import/export).
- `npm run build`: regenera `dist/chrome/`.
- Verifica en una nueva pestaña: búsqueda, favoritos, carpetas, widgets
  (incluido arrastrar y redimensionar), temas y export/import.

## Enviar un pull request

1. Crea una rama: `git checkout -b feat/mi-mejora` (usa prefijos
   `feat/`, `fix/`, `docs/`, `refactor/`).
2. Haz commits pequeños y con mensajes claros (comportamiento, no internals).
3. Ejecuta `npm test` y `npm run build` antes de subir.
4. Abre el PR hacia `main` describiendo **qué** cambias, **por qué** y **cómo se
   probó**.
5. Si tienes captura de antes/después, inclúyela: ayuda muchísimo a revisar.

## Reportar problemas (issues)

Usa las plantillas: **Bug report** o **Feature request**. Incluye siempre:
Navegador y versión, versión de Novantab (o commit), pasos para reproducir,
resultado esperado y resultado real.

## Temas polémicos (por favor, pregunta antes)

- Cambios en la **política de privacidad** (enviar datos fuera del navegador).
- Añadir **dependencias nuevas**.
- Cambios de **licencia**.
- Rediseños grandes de la UI que rompan los temas actuales.

## Licencia

Al contribuir aceptas que tu aporte queda bajo **MIT** (igual que el proyecto),
salvo que se indique lo contrario en el PR.

---
Preguntas o dudas: abre un issue con etiqueta `question`.