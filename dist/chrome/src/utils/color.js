/** Utilidades de conversión de color HEX <-> HSL. */

/** Convierte HEX a HSL {h,s,l} 0..360 / 0..100. */
export function hexToHsl(hex) {
  let hx = String(hex || '#000000').replace('#', '');
  if (hx.length === 3) hx = hx.split('').map((c) => c + c).join('');
  if (hx.length !== 6) return { h: 0, s: 0, l: 0 };
  const r = parseInt(hx.substring(0, 2), 16) / 255;
  const g = parseInt(hx.substring(2, 4), 16) / 255;
  const b = parseInt(hx.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      default: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Convierte HSL a HEX #rrggbb. */
export function hslToHex(h, s, l) {
  const ss = s / 100;
  const ll = l / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Deriva una tríada {a, a2, a3} a partir de un color base. */
export function expandAccent(baseHex) {
  const { h, s, l } = hexToHsl(baseHex);
  return {
    a: baseHex,
    a2: hslToHex(h, s, clamp(l - 25, 0, 100)),
    a3: hslToHex(h, s, clamp(l + 22, 0, 100)),
  };
}