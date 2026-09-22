import { buildExportPayload, serialize, download, applyImport, validateImport } from './import-export.js';

/** Descarga la configuración de la extensión como JSON. */
export async function downloadConfig() {
  const payload = buildExportPayload();
  const json = JSON.stringify(payload, null, 2);
  download(json, `novantab-config-${new Date().toISOString().slice(0, 10)}.json`);
  return json;
}

/** Abre el selector de archivo y aplica una configuración importada. */
export async function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  const file = await new Promise((resolve) => {
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.click();
  });
  if (!file) return null;
  const text = await file.text();
  const { ok, errors, data } = validateImport(text);
  if (!ok) {
    return { error: errors.join(' ') };
  }
  await applyImport(data);
  return { ok: true, data };
}

export { serialize };