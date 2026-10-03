import type { Point, Shape, StencilDefinition, TransferPoint, ValidationResult } from '../types';

export const GRID_SIZE = 256;

export function polygon(points: readonly Point[]): Shape { return { type: 'polygon', points }; }
export function ellipse(cx: number, cy: number, rx: number, ry: number): Shape { return { type: 'ellipse', cx, cy, rx, ry }; }
export function rect(x: number, y: number, width: number, height: number): Shape { return { type: 'rect', x, y, width, height }; }

export function star(cx: number, cy: number, outer: number, inner: number, points = 5, rotation = -Math.PI / 2): Shape {
  const result: Point[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (Math.PI * i) / points;
    result.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return polygon(result);
}

export function shapePolygon(shape: Shape, segments = 48): Point[] {
  if (shape.type === 'polygon') return [...shape.points];
  if (shape.type === 'rect') return [[shape.x, shape.y], [shape.x + shape.width, shape.y], [shape.x + shape.width, shape.y + shape.height], [shape.x, shape.y + shape.height]];
  return Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;
    return [shape.cx + Math.cos(angle) * shape.rx, shape.cy + Math.sin(angle) * shape.ry] as Point;
  });
}

export function pointInPolygon(x: number, y: number, points: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]; const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointInShape(x: number, y: number, shape: Shape): boolean {
  if (shape.type === 'ellipse') return ((x - shape.cx) / shape.rx) ** 2 + ((y - shape.cy) / shape.ry) ** 2 <= 1;
  if (shape.type === 'rect') return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
  return pointInPolygon(x, y, shape.points);
}

export function rasterize(shapes: readonly Shape[], size = GRID_SIZE): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const px = ((x + 0.5) / size) * 100; const py = ((y + 0.5) / size) * 100;
    if (shapes.some(shape => pointInShape(px, py, shape))) mask[y * size + x] = 1;
  }
  return mask;
}

export function validateMask(mask: Uint8Array, width: number, height: number, minimumBridgeCells = 3): ValidationResult {
  const visited = new Uint8Array(mask.length); const queue: number[] = [];
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (!mask[index] && !visited[index]) { visited[index] = 1; queue.push(index); }
  };
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y += 1) { add(0, y); add(width - 1, y); }
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head]; const x = index % width; const y = Math.floor(index / width);
    add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
  }
  let islandCount = 0; const counted = new Uint8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] || visited[index] || counted[index]) continue;
    islandCount += 1; const component = [index]; counted[index] = 1;
    for (let head = 0; head < component.length; head += 1) {
      const current = component[head]; const x = current % width; const y = Math.floor(current / width);
      for (const next of [current - 1, current + 1, current - width, current + width]) {
        if (next < 0 || next >= mask.length) continue;
        const nx = next % width; if (Math.abs(nx - x) > 1) continue;
        if (!mask[next] && !visited[next] && !counted[next]) { counted[next] = 1; component.push(next); }
      }
    }
  }
  let weakBridgeCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    let x = 1;
    while (x < width - 1) {
      if (mask[y * width + x]) { x += 1; continue; }
      const start = x; while (x < width - 1 && !mask[y * width + x]) x += 1;
      const length = x - start;
      if (start > 1 && x < width - 1 && length < minimumBridgeCells) weakBridgeCount += 1;
    }
  }
  const valid = islandCount === 0 && weakBridgeCount === 0;
  return {
    valid, islandCount, weakBridgeCount,
    message: valid ? 'Carve-ready: every retained area is connected.' : `${islandCount ? `${islandCount} disconnected area${islandCount === 1 ? '' : 's'}` : ''}${islandCount && weakBridgeCount ? ' · ' : ''}${weakBridgeCount ? `${weakBridgeCount} weak bridge${weakBridgeCount === 1 ? '' : 's'}` : ''}`
  };
}

export function validateStencil(stencil: StencilDefinition): ValidationResult {
  // Curated vector contours have already-defined bridge widths; a one-cell threshold
  // avoids treating antialiased diagonal corners as weak raster bridges. Imported
  // artwork uses the stricter three-cell scan in UploadEditor.
  return validateMask(rasterize(stencil.shapes), GRID_SIZE, GRID_SIZE, 1);
}

export function maskToShapes(mask: Uint8Array, width: number, height: number): Shape[] {
  type Edge = { from: number; to: number; direction: number; used: boolean };
  const edges: Edge[] = [];
  const outgoing = new Map<number, number[]>();
  const vertex = (x: number, y: number) => y * (width + 1) + x;
  const black = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
  const add = (from: number, to: number, direction: number) => {
    const index = edges.length; edges.push({ from, to, direction, used: false });
    const list = outgoing.get(from) || []; list.push(index); outgoing.set(from, list);
  };
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!black(x, y)) continue;
    if (!black(x, y - 1)) add(vertex(x, y), vertex(x + 1, y), 0);
    if (!black(x + 1, y)) add(vertex(x + 1, y), vertex(x + 1, y + 1), 1);
    if (!black(x, y + 1)) add(vertex(x + 1, y + 1), vertex(x, y + 1), 2);
    if (!black(x - 1, y)) add(vertex(x, y + 1), vertex(x, y), 3);
  }
  const shapes: Shape[] = [];
  for (const first of edges) {
    if (first.used) continue;
    const contour: Point[] = []; let current = first;
    do {
      current.used = true;
      contour.push([((current.from % (width + 1)) / width) * 100, (Math.floor(current.from / (width + 1)) / height) * 100]);
      const choices = (outgoing.get(current.to) || []).map(index => edges[index]).filter(edge => !edge.used);
      const priority = [1, 0, 3, 2];
      current = choices.sort((a, b) => priority.indexOf((a.direction - current.direction + 4) % 4) - priority.indexOf((b.direction - current.direction + 4) % 4))[0];
    } while (current && current.from !== first.from && contour.length <= edges.length);
    if (contour.length < 8) continue;
    // Pixel stair steps are condensed to the actual turns before vector export.
    const turns = contour.filter((point, index) => {
      const before = contour[(index - 1 + contour.length) % contour.length]; const after = contour[(index + 1) % contour.length];
      return (point[0] - before[0]) * (after[1] - point[1]) !== (point[1] - before[1]) * (after[0] - point[0]);
    });
    if (turns.length >= 3) shapes.push(polygon(turns));
  }
  return shapes;
}

export function sampleTransferPoints(shapes: readonly Shape[], widthMm: number, heightMm: number, spacingMm = 2): TransferPoint[] {
  const result: TransferPoint[] = []; let sequence = 1;
  for (const shape of shapes) {
    const points = shapePolygon(shape);
    for (let index = 0; index < points.length; index += 1) {
      const from = points[index]; const to = points[(index + 1) % points.length];
      const dx = ((to[0] - from[0]) / 100) * widthMm; const dy = ((to[1] - from[1]) / 100) * heightMm;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / spacingMm));
      for (let step = 0; step < steps; step += 1) {
        const ratio = step / steps; const x = from[0] + (to[0] - from[0]) * ratio; const y = from[1] + (to[1] - from[1]) * ratio;
        const xMm = (x / 100) * widthMm; const yMm = (y / 100) * heightMm;
        result.push({ x, y, directionX: dx, directionY: -dy, sequence, row: Math.floor((heightMm - yMm) / 5) + 1, column: Math.floor(xMm / 5) + 1 });
        sequence += 1;
      }
    }
  }
  return result;
}
