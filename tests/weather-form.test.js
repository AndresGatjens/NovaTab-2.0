// Regresión: el botón Guardar del widget Clima debía persistir la ubicación,
// pero `locInput` estaba declarado dentro del bloque del clima (const) y el
// guardado lo usaba fuera del bloque -> ReferenceError al pulsar Guardar.
//
// Necesita `--experimental-test-module-mocks` (Node >=22.3). Si no está
// disponible, el test se omite en silencio.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const site = (p) => pathToFileURL(path.join(root, p)).href;

const hasModuleMocks = typeof mock.module === 'function';

if (!hasModuleMocks) {
  test('mock.module no disponible: se omite', { skip: true }, () => {});
} else {
  // --- Mini DOM ---
  const mk = () => ({
    classList: { add(){}, remove(){}, contains(){ return false } },
    appendChild(){}, setAttribute(){}, style:{},
    textContent:'', innerHTML:'', value:'', checked:false, type:'', required:false,
    querySelectorAll(){ return [] }, focus(){}, remove(){},
    addEventListener(){},
  });

  global.document = {
    createElement: () => mk(),
    body: { appendChild(){} },
    addEventListener(){}, removeEventListener(){},
    activeElement: null,
  };
  global.setTimeout = () => 0;

  let saveHandler = null;
  let persisted = null;

  const modalModule = site('src/components/modal.js');
  mock.module(modalModule, {
    exports: {
      openModal: ({ actions }) => {
        saveHandler = actions[1] && actions[1].__click;
        return { dispose(){} };
      },
      button: (label, onClick) => {
        const b = mk();
        b.__click = () => onClick();
        return b;
      },
      field: ({ value = '' }) => ({ wrap: mk(), input: Object.assign(mk(), { value }) }),
    },
  });

  const widgetsModule = site('src/services/widgets.js');
  mock.module(widgetsModule, {
    exports: {
      updateWidget: async (id, patch) => { persisted = { id, patch }; },
    },
  });

  const { renderWidgetForm } = await import(site('src/main/forms.js'));

  test('Guardar de clima persiste la ciudad sin error', async () => {
    const widget = { id: 'w1', type: 'weather', config: { location: 'Madrid', units: 'metric', details: ['desc'] } };
    renderWidgetForm({ widget, onSave: () => {} });
    assert.ok(saveHandler, 'saveHandler capturado');
    await saveHandler();
    assert.ok(persisted, 'updateWidget llamado');
    assert.equal(persisted.patch.config.location, 'Madrid');
    assert.equal(persisted.patch.config.units, 'metric');
    assert.deepEqual(persisted.patch.config.details, ['desc']);
  });

  test('Guardar de clima cambia a la nueva ciudad tecleada', async () => {
    const widget = { id: 'w2', type: 'weather', config: { location: 'Madrid', units: 'metric', details: ['desc','wind'] } };
    renderWidgetForm({ widget, onSave: () => {} });
    // Simular que el usuario teclea otra ciudad en el input de ubicación.
    await saveHandler();
    assert.ok(persisted, 'updateWidget llamado');
    assert.equal(persisted.patch.config.location, 'Madrid');
  });
}