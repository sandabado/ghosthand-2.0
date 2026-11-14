import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Matrix4, Vector3 } from 'three';
import { DRAIN_STRANDS, DRAIN_SEGMENTS, DRAIN_AUDITS, buildDrainData, sampleDrainPoint, instanceToAudit, drainReleaseAt } from '../src/systems/drain/geometry.ts';

// Node 26 strips TypeScript. These are geometry/state invariants, not GPU or input evidence.
const checks = [];
function check(name, fn) { fn(); checks.push({ name, passed: true }); }
const finite = (array, label) => assert([...array].every(Number.isFinite), `${label} must contain only finite values`);
const tolerance = 2e-4;
const data = buildDrainData();
const instances = DRAIN_STRANDS * DRAIN_SEGMENTS;

check('Instancing has bounded, finite transform and attribute data', () => {
  assert.equal(data.strandsData.length, DRAIN_STRANDS);
  assert(DRAIN_STRANDS >= DRAIN_AUDITS && DRAIN_STRANDS <= 128);
  assert(DRAIN_SEGMENTS >= 8 && DRAIN_SEGMENTS <= 128);
  assert.equal(data.matrices.length, instances * 16);
  finite(data.matrices, 'Instance matrices');
  for (const name of ['along', 'audit', 'seed', 'order', 'strand']) {
    assert.equal(data[name].length, instances, name);
    finite(data[name], name);
  }
  const matrix = new Matrix4();
  for (let i = 0; i < instances; i++) {
    matrix.fromArray(data.matrices, i * 16);
    assert(Math.abs(matrix.determinant()) > 1e-10, 'A filament segment must not collapse to zero scale');
    assert(Math.abs(matrix.elements[15] - 1) < tolerance, 'Instance matrices are affine');
  }
});

check('Filaments emerge near the camera body and rise toward distant anchors', () => {
  const roots = [], anchors = [];
  for (const strand of data.strandsData) {
    const root = sampleDrainPoint(strand, 0), anchor = sampleDrainPoint(strand, 1);
    finite(root.toArray(), 'Root'); finite(anchor.toArray(), 'Anchor');
    assert(root.y < 0, 'Camera-body attachment stays below eye level');
    assert(anchor.y > root.y + 3, 'Filament rises into the room');
    assert(anchor.z < root.z - 3, 'Anchor recedes away from the viewer');
    roots.push(root); anchors.push(anchor);
  }
  assert(roots.some(p => p.x < 0) && roots.some(p => p.x > 0), 'Attachments span both sides of the body');
  assert(anchors.some(p => p.x < 0) && anchors.some(p => p.x > 0), 'Anchors do not collapse to one side');
});

check('Segment transforms connect to the sampled curved filament without gaps', () => {
  const matrix = new Matrix4();
  for (const strand of data.strandsData) {
    for (let segment = 0; segment < DRAIN_SEGMENTS; segment++) {
      const index = strand.index * DRAIN_SEGMENTS + segment;
      matrix.fromArray(data.matrices, index * 16);
      const start = new Vector3(0, -0.5, 0).applyMatrix4(matrix);
      const end = new Vector3(0, 0.5, 0).applyMatrix4(matrix);
      const expectedStart = sampleDrainPoint(strand, segment / DRAIN_SEGMENTS);
      const expectedEnd = sampleDrainPoint(strand, (segment + 1) / DRAIN_SEGMENTS);
      const expectedAxis = expectedEnd.clone().sub(expectedStart);
      const expectedLength = expectedAxis.length();
      const actualAxis = end.clone().sub(start);
      const actualLength = actualAxis.length();
      assert(expectedLength > 1e-5 && actualLength > 1e-5, 'Every segment has physical length');
      const expectedCenter = expectedStart.clone().add(expectedEnd).multiplyScalar(0.5);
      assert(start.clone().add(end).multiplyScalar(0.5).distanceTo(expectedCenter) < tolerance, 'Segment center follows curve');
      assert(actualAxis.normalize().dot(expectedAxis.normalize()) > 0.99999, 'Cylinder axis follows sampled tangent');
      assert(actualLength / expectedLength >= 0.9999 && actualLength / expectedLength <= 1.1, 'Seam overlap is bounded and cannot leave a gap');
    }
  }
  assert(data.strandsData.some(strand => sampleDrainPoint(strand, 0.5).distanceTo(sampleDrainPoint(strand, 0).lerp(sampleDrainPoint(strand, 1), 0.5)) > 0.05), 'At least one path has meaningful curvature');
});

check('Raycast instance IDs map to valid, fully covered illustrative audit fixtures', () => {
  const covered = new Set();
  for (const strand of data.strandsData) {
    assert(Number.isInteger(strand.audit) && strand.audit >= 0 && strand.audit < DRAIN_AUDITS);
    covered.add(strand.audit);
    for (let segment = 0; segment < DRAIN_SEGMENTS; segment++) {
      const index = strand.index * DRAIN_SEGMENTS + segment;
      assert.equal(instanceToAudit(index), strand.audit);
      assert.equal(data.audit[index], strand.audit);
      assert.equal(data.strand[index], strand.index);
      assert(data.along[index] >= 0 && data.along[index] <= 1);
    }
  }
  assert.equal(covered.size, DRAIN_AUDITS, 'Every illustrative burden has a traceable filament');
  assert.equal(instanceToAudit(-1), -1, 'Invalid negative hit is not a fixture');
});

check('Seeded variation is deterministic and keeps release order and radii bounded', () => {
  const repeated = buildDrainData();
  for (const name of ['matrices', 'along', 'audit', 'seed', 'order', 'strand']) assert.deepEqual([...data[name]], [...repeated[name]], name);
  assert(new Set(data.strandsData.map(strand => strand.seed)).size > DRAIN_AUDITS, 'Filaments have distinct seeds');
  for (const strand of data.strandsData) {
    assert(strand.seed >= 0 && strand.seed < 1, 'Seeds are normalized');
    assert(strand.order >= 0 && strand.order <= 1, 'Release order is normalized');
    assert(strand.radius > 0 && strand.radius < 0.2, 'Filament radius is physical and bounded');
  }
  assert(new Set(data.strandsData.map(strand => strand.radius)).size > 1, 'Tension field has varied strand weight');
});

check('Release remains bounded and monotonic, with a staggered body-to-anchor cascade', () => {
  for (const order of [0, 0.25, 0.6, 1]) {
    for (const along of [0, 0.2, 0.6, 1]) {
      assert.equal(drainReleaseAt(0, order, along), 0);
      assert.equal(drainReleaseAt(1, order, along), 1);
      let previous = 0;
      for (let step = 0; step <= 100; step++) {
        const value = drainReleaseAt(step / 100, order, along);
        assert(Number.isFinite(value) && value >= 0 && value <= 1);
        assert(value + 1e-7 >= previous, 'A released fragment does not reattach');
        previous = value;
      }
    }
  }
  const mid = data.strandsData.flatMap(strand => [0.15, 0.5, 0.85].map(along => drainReleaseAt(0.5, strand.order, along)));
  assert(Math.max(...mid) - Math.min(...mid) > 0.3, 'Release is not one uniform disappearance');
  assert(drainReleaseAt(0.5, 0, 0.1) >= drainReleaseAt(0.5, 0, 0.9), 'Release reaches the body end before the ceiling end');
  assert(drainReleaseAt(0.5, 0.1, 0.4) >= drainReleaseAt(0.5, 0.9, 0.4), 'Later-order strands release no earlier');
});

check('Dissolution particle fixtures remain finite, mapped, and bounded', () => {
  const count = data.particlePositions.length / 3;
  assert(Number.isInteger(count) && count > 0 && count <= DRAIN_STRANDS * DRAIN_SEGMENTS * 8);
  finite(data.particlePositions, 'Dissolution positions');
  for (const name of ['particleAlong', 'particleSeed', 'particleOrder', 'particleAudit']) {
    assert.equal(data[name].length, count);
    finite(data[name], name);
  }
  assert([...data.particleSeed].every(value => value >= 0 && value < 1));
  assert([...data.particleAlong].every(value => value >= 0 && value <= 1));
  assert([...data.particleAudit].every(value => Number.isInteger(value) && value >= 0 && value < DRAIN_AUDITS));
});

check('Custom instance budgets preserve shape and fixture mapping', () => {
  const small = buildDrainData({ strands: 14, segments: 8, auditCount: 7 });
  assert.equal(small.strandsData.length, 14);
  assert.equal(small.matrices.length, 14 * 8 * 16);
  finite(small.matrices, 'Custom matrices');
  for (const strand of small.strandsData) {
    for (let segment = 0; segment < 8; segment++) assert.equal(instanceToAudit(strand.index * 8 + segment, 8, 7), strand.audit);
  }
  assert.equal(new Set(small.strandsData.map(strand => strand.audit)).size, 7);
});

const drainFiles = (await readdir(resolve('src/systems/drain'))).filter(name => /\.(?:ts|tsx)$/.test(name));
const rendererSources = await Promise.all(drainFiles.map(file => readFile(resolve('src/systems/drain', file), 'utf8')));
check('Drain rendering consumes the shared clock, palette, and global grade', () => {
  for (const source of rendererSources) {
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.(?:ticker|timeline)|new\s+Clock\s*\(/.test(source), 'No independent renderer clock');
    assert(!/<(?:Canvas|EffectComposer)\b|\bnew\s+EffectComposer\b/.test(source), 'No scene-owned Canvas or composer');
    assert(!/#[\da-f]{3,8}\b/i.test(source), 'No new raw palette color');
  }
});

const result = {
  checkedAt: new Date().toISOString(), checks,
  counts: { strands: DRAIN_STRANDS, segmentsPerStrand: DRAIN_SEGMENTS, instances, auditFixtures: DRAIN_AUDITS, particles: data.particlePositions.length / 3 },
  limitations: [
    'CPU geometry and source checks do not establish actual GPU raycast targeting, shader appearance, input behavior, or the emotional quality of release/dawn.',
    'Ordinary-scroll safety, deliberate gesture/keyboard parity, camera orientation, settled advancement, lifecycle cleanup, and Merge timing require browser evidence.',
    'No GPU/device FPS or physical mobile acceptance is inferred.'
  ]
};
await mkdir(resolve('docs/drain-v4'), { recursive: true });
await writeFile(resolve('docs/drain-v4/geometry-checks.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
