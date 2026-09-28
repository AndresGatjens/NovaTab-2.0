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
  // `node --check` solo mira la sintaxis: un `export` que falta en un módulo
  // NO da error ahí, pero revienta la página con "does not provide an export
  // named ...".  Se resuelve cada import contra los exports reales del archivo.
  const exportsCache = new Map();
  const exportsOf = (file) => {
    if (exportsCache.has(file)) return exportsCache.get(file);
    const src = readFileSync(file, 'utf8');
    const names = new Set();
    for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z0-9_$]+)/gm)) {
      names.add(m[1]);
    }
    for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (name) names.add(name);
      }
    }
    if (/^export\s+default/m.test(src)) names.add('default');
    exportsCache.set(file, names);
    return names;
  };

  const problems = [];
  for (const file of files) {
    if (!existsSync(file) || !file.endsWith('.js')) continue;
    const src = readFileSync(file, 'utf8');
    const dir = dirname(file);
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
      const target = join(dir, m[2]);
      if (!existsSync(target)) {
        problems.push(`${file.replace(dir + '/', '')}: no existe el módulo "${m[2]}"`);
        continue;
      }
      const available = exportsOf(target);
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name && !available.has(name)) {
          problems.push(
            `${file.replace(dir + '/', '')}: importa "${name}" de "${m[2]}", pero ese módulo no lo exporta`
          );
        }
      }
    }
  }
  if (problems.length) {
    console.error('  ERROR de exports:');
    for (const p of problems) console.error(`   - ${p}`);
    process.exitCode = 1;
    throw new Error('Faltan exports: corrige los imports antes de publicar.');
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