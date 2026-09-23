/** Utilidades de geometría para el layout bidimensional de los widgets. */

export function box(node) {
  const r = node.getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
}

export function rectsOverlap(a, b, gap = 0) {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

export function isFree(rect, obstacles, gap = 0) {
  return !obstacles.some((o) => rectsOverlap(rect, o, gap));
}

export function clampRect(rect, vw, vh) {
  const x = Math.max(0, Math.min(rect.x, vw - rect.w));
  const y = Math.max(0, Math.min(rect.y, vh - rect.h));
  return { ...rect, x, y };
}

function* spiralOffsets(step) {
  let x = 0;
  let y = 0;
  yield { dx: 0, dy: 0 };
  let len = 1;
  for (let guard = 0; guard < 4000 && Math.abs(x) < 20000 && Math.abs(y) < 20000; guard++) {
    for (let i = 0; i < len; i++) {
      x += step;
      yield { dx: x, dy: y };
    }
    for (let i = 0; i < len; i++) {
      y += step;
      yield { dx: x, dy: y };
    }
    len += 1;
    for (let i = 0; i < len; i++) {
      x -= step;
      yield { dx: x, dy: y };
    }
    for (let i = 0; i < len; i++) {
      y -= step;
      yield { dx: x, dy: y };
    }
    len += 1;
  }
}

/** Posición libre más cercana a `rect`, sin salir nunca de la pantalla. */
export function nearestFree(rect, obstacles, vw, vh, gap = 0) {
  const clamped = clampRect(rect, vw, vh);
  if (isFree(clamped, obstacles, gap)) return { x: clamped.x, y: clamped.y };
  const step = 16;
  for (const { dx, dy } of spiralOffsets(step)) {
    const candidate = clampRect({ ...clamped, x: clamped.x + dx, y: clamped.y + dy }, vw, vh);
    if (isFree(candidate, obstacles, gap)) return { x: candidate.x, y: candidate.y };
  }
  return { x: clamped.x, y: clamped.y };
}

/** Reajusta un nodo flotante dentro de la pantalla y sin pisar `obstacles`. */
export function resolveFloat(node, obstacles) {
  const rect = box(node);
  if (rect.w <= 0 || rect.h <= 0) return { x: rect.x, y: rect.y, moved: false };
  const pos = nearestFree(rect, obstacles, window.innerWidth, window.innerHeight);
  if (pos.x !== rect.x || pos.y !== rect.y) {
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
  }
  return { x: pos.x, y: pos.y, moved: pos.x !== rect.x || pos.y !== rect.y };
}