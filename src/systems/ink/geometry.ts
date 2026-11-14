import { BufferAttribute, BufferGeometry } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

export type StrokePoint = [number, number, number];
export interface InkPath {
  id: string;
  points: StrokePoint[];
  width: number;
  pressure: number;
  seed: number;
  start: number;
  span: number;
}
export interface BrushGeometryOptions {
  width?: number;
  pressure?: number;
  seed?: number;
  start?: number;
  span?: number;
}
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const finite = (value: number | undefined, fallback: number) => Number.isFinite(value) ? Number(value) : fallback;

/**
 * Browser-only SVG → world-space centerlines. No URLs are loaded. At scale 1 the
 * source viewBox is six world units tall, centered, with SVG Y flipped to 3D Y.
 * Each subpath receives a contiguous arc-length share of the shared reveal.
 */
export function svgToStrokes(source: string, options: { scale?: number; segments?: number } = {}): InkPath[] {
  const parsed = new SVGLoader().parse(source);
  const values = (parsed.xml.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0) {
    throw new Error('Ink source needs a finite, positive SVG viewBox.');
  }
  const [vx, vy, vw, vh] = values;
  const factor = 6 / vh * clamp(finite(options.scale, 1), 0.001, 100);
  const divisions = Math.round(clamp(finite(options.segments, 80), 12, 240));
  const pending: (Omit<InkPath, 'start' | 'span'> & { length: number })[] = [];
  for (const [pathIndex, shape] of parsed.paths.entries()) {
    const data = shape.userData as { node?: Element; style?: { strokeWidth?: number } } | undefined;
    const node = data?.node;
    const width = Math.max(0.0001, finite(data?.style?.strokeWidth, 1) * factor);
    const pressure = clamp(finite(Number(node?.getAttribute('data-pressure') ?? 1), 1), 0.1, 2);
    const seedValue = finite(Number(node?.getAttribute('data-seed') ?? (pathIndex * 0.173) % 1), 0.5);
    const seed = ((seedValue % 1) + 1) % 1;
    for (const [subIndex, curve] of shape.subPaths.entries()) {
      const length = curve.getLength() * factor;
      if (!Number.isFinite(length) || length <= 0.00001) continue;
      const points: StrokePoint[] = curve.getSpacedPoints(divisions).map(point => [
        (point.x - vx - vw / 2) * factor,
        (vy + vh / 2 - point.y) * factor,
        0,
      ]);
      pending.push({ id: `${node?.id || `ink-${pathIndex}`}-${subIndex}`, points, width, pressure, seed, length });
    }
  }
  const total = pending.reduce((sum, path) => sum + path.length, 0);
  if (!total) return [];
  let start = 0;
  return pending.map(({ length, ...path }, index) => {
    const span = index === pending.length - 1 ? 1 - start : length / total;
    const result = { ...path, start, span };
    start += span;
    return result;
  });
}

function samples(path: StrokePoint[]) {
  const points: StrokePoint[] = [];
  for (const point of path) {
    if (point.length !== 3 || !point.every(Number.isFinite)) throw new Error('Ink path contains a non-finite coordinate.');
    const previous = points.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1], point[2] - previous[2]) > 0.000001) {
      points.push([...point]);
    }
  }
  if (points.length < 2) throw new Error('Ink path needs two distinct points.');
  const distances = new Float64Array(points.length);
  for (let i = 1; i < points.length; i++) {
    distances[i] = distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]);
  }
  const length = distances.at(-1)!;
  const along = [...distances].map(value => value / length);
  return { points, along };
}

/** Broad, deterministic pressure taper; shader bleed makes the final wet edge. */
function pressureAt(t: number, strength: number, seed: number) {
  const taper = 0.14 + 0.86 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.53);
  const hand = 0.86 + Math.sin(t * 15 + seed * 7) * 0.09 + Math.sin(t * 37 + seed * 13) * 0.05;
  return Math.max(0.035, taper * strength * hand);
}

function optionsFor(options: BrushGeometryOptions) {
  return { width: Math.max(0.0001, finite(options.width, 0.11)), pressure: clamp(finite(options.pressure, 1), 0.05, 3),
    seed: ((finite(options.seed, 0.5) % 1) + 1) % 1, start: finite(options.start, 0), span: Math.max(0, finite(options.span, 1)) };
}

/** Indexed XY ribbon with arc-length UVs. Duplicate samples and zero tangents are safe. */
export function createBrushGeometry(path: StrokePoint[], options: BrushGeometryOptions = {}): BufferGeometry {
  const { points, along } = samples(path);
  const settings = optionsFor(options);
  const count = points.length;
  const position = new Float32Array(count * 6), uv = new Float32Array(count * 4);
  const progress = new Float32Array(count * 2), pressure = new Float32Array(count * 2), seed = new Float32Array(count * 2);
  const indices: number[] = [];
  let nx = 0, ny = 1;
  for (let i = 0; i < count; i++) {
    const before = points[Math.max(0, i - 1)], after = points[Math.min(count - 1, i + 1)];
    const dx = after[0] - before[0], dy = after[1] - before[1], length = Math.hypot(dx, dy);
    if (length > 0.000001) { nx = -dy / length; ny = dx / length; }
    const t = along[i], weight = pressureAt(t, settings.pressure, settings.seed);
    const halfWidth = settings.width * weight * 0.5;
    for (let side = 0; side < 2; side++) {
      const vertex = i * 2 + side, direction = side === 0 ? -1 : 1;
      position[vertex * 3] = points[i][0] + nx * halfWidth * direction;
      position[vertex * 3 + 1] = points[i][1] + ny * halfWidth * direction;
      position[vertex * 3 + 2] = points[i][2];
      uv[vertex * 2] = t; uv[vertex * 2 + 1] = side;
      progress[vertex] = settings.start + settings.span * t;
      pressure[vertex] = weight;
      seed[vertex] = settings.seed;
    }
    if (i < count - 1) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('aAlong', new BufferAttribute(progress, 1));
  geometry.setAttribute('aPressure', new BufferAttribute(pressure, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

/** Three seeded droplets per sample; motion and decay belong to shared uniforms. */
export function createTipGeometry(path: StrokePoint[], options: BrushGeometryOptions = {}): BufferGeometry {
  const { points, along } = samples(path), settings = optionsFor(options);
  const copies = 3, count = points.length * copies;
  const position = new Float32Array(count * 3), progress = new Float32Array(count);
  const seeds = new Float32Array(count), sides = new Float32Array(count), pressures = new Float32Array(count);
  for (let i = 0; i < points.length; i++) for (let copy = 0; copy < copies; copy++) {
    const index = i * copies + copy;
    position.set(points[i], index * 3);
    progress[index] = settings.start + settings.span * along[i];
    seeds[index] = (((i * 37 + copy * 19) % 101) / 101 + settings.seed) % 1;
    sides[index] = copy - 1;
    pressures[index] = pressureAt(along[i], settings.pressure, settings.seed);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('aAlong', new BufferAttribute(progress, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('aSide', new BufferAttribute(sides, 1));
  geometry.setAttribute('aPressure', new BufferAttribute(pressures, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
