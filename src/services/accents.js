import { expandAccent } from '../utils/color.js';

/** Paletas de acento para el tema de la interfaz (cuadrícula, barra, botones).
 *  Independientes del color de fondo del tab. */
export const ACCENTS = {
  violet: { name: 'Violeta', a: '#6366f1', a2: '#8b5cf6', a3: '#22d3ee' },
  blue: { name: 'Azul', a: '#3b82f6', a2: '#2563eb', a3: '#38bdf8' },
  cyan: { name: 'Cian', a: '#06b6d4', a2: '#0891b2', a3: '#22d3ee' },
  green: { name: 'Verde', a: '#16a34a', a2: '#84cc16', a3: '#10b981' },
  orange: { name: 'Naranja', a: '#f97316', a2: '#ea580c', a3: '#fbbf24' },
  rose: { name: 'Rosa', a: '#f43f5e', a2: '#e11d48', a3: '#fb7185' },
  purple: { name: 'Púrpura', a: '#a855f7', a2: '#9333ea', a3: '#c084fc' },
  amber: { name: 'Ámbar', a: '#f59e0b', a2: '#d97706', a3: '#fde047' },
  slate: { name: 'Gris', a: '#64748b', a2: '#475569', a3: '#94a3b8' },
};

export const DEFAULT_ACCENT = 'violet';

/** Devuelve el color base de un preset (o lo amplía si es personalizado). */
export function getAccentColors(key, custom) {
  if (key === 'custom' && custom && custom.a) return custom;
  return ACCENTS[key] || ACCENTS[DEFAULT_ACCENT];
}

/** Si el color personalizado coincide con un preset, devuelve su clave. */
export function matchAccentPreset(baseHex) {
  if (!baseHex) return null;
  const target = String(baseHex).toLowerCase();
  for (const [key, c] of Object.entries(ACCENTS)) {
    if (c.a.toLowerCase() === target) return key;
  }
  return null;
}

export { expandAccent };