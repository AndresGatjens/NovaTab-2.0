/** Genera un ID único sin dependencias externas. */
export function uid(prefix = 'id') {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const rand = () =>
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  return `${prefix}_${rand()}`;
}