/**
 * Genera los iconos PNG de la extensión (16, 32, 48, 128) sin dependencias.
 * Dibuja un cuadrado redondeado con gradiente y una "cuadrícula" de 4 puntos.
 * Usa zlib (nativo de Node) para comprimir los scanlines.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');

const SIZES = [16, 32, 48, 128];

// ---- PNG encoder mínimo ----
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Escribir un PNG RGBA de width×height.
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Dibujo con supersampling 3x ----
function render(size) {
  const ss = 3;
  const S = size * ss;
  const buf = Buffer.alloc(S * S * 4);
  const gradient = (y) => {
    const t = y / S;
    return [79, 70, 229 + (34 - 70) * t * 40, 5]; // indigo → cyan-ish
  };

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const nx = px / S;
      const ny = py / S;
      // Cuadrado redondeado (radio ~22% del lado).
      const r = 0.22;
      const dx = Math.max(Math.abs(nx - 0.5) - (0.5 - r), 0);
      const dy = Math.max(Math.abs(ny - 0.5) - (0.5 - r), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = 1 - Math.min(1, dist / (2 / S));
      if (alpha <= 0) continue;

      const from = [79, 70, 229];
      const to = [34, 211, 238];
      const t = ny;
      const r_ = Math.round(from[0] + (to[0] - from[0]) * t);
      const g_ = Math.round(from[1] + (to[1] - from[1]) * t);
      const b_ = Math.round(from[2] + (to[2] - from[2]) * t);

      const idx = (py * S + px) * 4;
      buf[idx] = r_;
      buf[idx + 1] = g_;
      buf[idx + 2] = b_;
      buf[idx + 3] = Math.round(alpha * 255);
    }
  }

  // Cuadrícula blanca: 4 puntos redondos en las esquinas del centro.
  const dotR = S * 0.13;
  const center = S / 2;
  const off = S * 0.24;
  const dots = [
    [center - off, center - off],
    [center + off, center - off],
    [center - off, center + off],
    [center + off, center + off],
  ];
  for (const [cx, cy] of dots) {
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        let a = 1 - Math.min(1, Math.max(0, d - dotR * 0.92));
        if (a <= 0) continue;
        const idx = (py * S + px) * 4;
        const exist = buf[idx + 3] / 255;
        buf[idx] = 255;
        buf[idx + 1] = 255;
        buf[idx + 2] = 255;
        buf[idx + 3] = Math.round(Math.min(255, exist * 255 + a * 255));
      }
    }
  }

  // Downsample 3x → destino y premultiplicar.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let [rr, gg, bb, aa] = [0, 0, 0, 0];
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const idx = ((y * ss + sy) * S + x * ss + sx) * 4;
          const a = buf[idx + 3] / 255;
          rr += buf[idx] * a;
          gg += buf[idx + 1] * a;
          bb += buf[idx + 2] * a;
          aa += a;
        }
      }
      const total = ss * ss;
      const oidx = (y * size + x) * 4;
      out[oidx] = Math.round(rr / total);
      out[oidx + 1] = Math.round(gg / total);
      out[oidx + 2] = Math.round(bb / total);
      out[oidx + 3] = Math.round((aa / total) * 255);
    }
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
for (const s of SIZES) {
  const rgba = render(s);
  const png = encodePng(s, s, rgba);
  const name = s === 16 ? 'icon16.png' : s === 32 ? 'icon32.png' : s === 48 ? 'icon48.png' : 'icon128.png';
  writeFileSync(join(OUT, name), png);
  process.stdout.write(`Icono generado: public/icons/${name}\n`);
}