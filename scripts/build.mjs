/**
 * Build de la extensión: genera dist/chrome/.
 * Sin dependencias: copia el árbol de src/, los iconos y añade el manifest
 * de Chrome.
 *
 * Uso: node scripts/build.mjs
 */
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

function build() {
  const out = join(DIST, 'chrome');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // 1. Copiar el árbol de src/ preservando rutas relativas.
  cpSync(join(ROOT, 'src'), join(out, 'src'), { recursive: true });

  // 2. Copiar el background a la raíz del manifest (MV3 lo exige en raíz).
  cpSync(join(ROOT, 'src', 'background', 'background.js'), join(out, 'background.js'));

  // 3. Iconos.
  const icons = join(ROOT, 'public', 'icons');
  if (existsSync(icons)) cpSync(icons, join(out, 'icons'), { recursive: true });

  // 4. Manifest de Chrome.
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.chrome.json'), 'utf8'));
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  // 5. Comprobación de sintaxis de los JS del paquete.
  checkJsInTree(out);
  console.log(`  OK: dist/chrome/ (${countFiles(out)} archivos)`);
}

function collectJs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...collectJs(full));
    else if (entry.endsWith('.js')) results.push(full);
  }
  return results;
}

function checkJsInTree(dir) {
  const files = [join(dir, 'background.js'), ...collectJs(join(dir, 'src'))];
  for (const file of files) {
    if (!existsSync(file)) continue;
    execSync(`node --check "${file}"`, { stdio: 'inherit' });
  }
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    n += stat.isDirectory() ? countFiles(full) : 1;
  }
  return n;
}

build();
console.log('Build completado.');