import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import {
  FORGE_HOME, FORGE_TARGETS, OWN_HOME, OWN_TARGET, OWN_RADIUS,
  pointFromClient, forgeHit, ownHit, fleetIntent, normalizeTrainingSeed,
} from '../src/core/gates.ts';
import { buildGateData, gateSeed } from '../src/systems/gates/geometry.ts';

// CPU interaction geometry and source ownership only. Actual pointer capture,
// GSAP settlement, shader appearance, and device performance need browser proof.
const checks = [];
function check(name, fn) { fn(); checks.push({ name, passed: true }); }
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const normalizedPoint = p => finitePoint(p) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
const sizes = [
  { width: 640, height: 400 },
  { width: 320, height: 360 },
  { width: 260, height: 290 },
];
const near = (a, b) => Math.abs(a - b) < 1e-9;

check('Authored anchors are finite, normalized, distinct, and meaningfully separated', () => {
  assert.equal(FORGE_HOME.length, 3);
  assert.equal(FORGE_TARGETS.length, 3);
  for (const p of [...FORGE_HOME, ...FORGE_TARGETS, OWN_HOME, OWN_TARGET]) assert(normalizedPoint(p));
  assert(OWN_RADIUS > 0 && OWN_RADIUS < 0.5);
  for (let i = 0; i < FORGE_HOME.length; i++) {
    assert(Math.hypot(FORGE_HOME[i].x - FORGE_TARGETS[i].x, FORGE_HOME[i].y - FORGE_TARGETS[i].y) > 0.3,
      'A Forge slot requires intentional travel away from its loose strand');
    for (let j = i + 1; j < FORGE_TARGETS.length; j++) {
      assert(Math.hypot(FORGE_TARGETS[i].x - FORGE_TARGETS[j].x, FORGE_TARGETS[i].y - FORGE_TARGETS[j].y) > 0.15,
        'Different strands must retain different destinations');
    }
  }
  assert(Math.hypot(OWN_HOME.x - OWN_TARGET.x, OWN_HOME.y - OWN_TARGET.y) > 0.3);
});

check('Client-to-board mapping preserves location under translation and resize', () => {
  for (const size of sizes) {
    for (const offset of [{ left: 0, top: 0 }, { left: 145, top: 247 }, { left: -41, top: 603 }]) {
      const rect = { ...offset, ...size };
      for (const p of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.37, y: 0.68 }]) {
        const actual = pointFromClient({ x: rect.left + p.x * size.width, y: rect.top + p.y * size.height }, rect);
        assert(finitePoint(actual));
        assert(near(actual.x, p.x) && near(actual.y, p.y), 'A resized board cannot move the logical target');
      }
    }
  }
});

check('Forge accepts the matching destination and rejects loose, wrong, and distant drops', () => {
  for (const size of sizes) {
    for (let i = 0; i < FORGE_TARGETS.length; i++) {
      const target = FORGE_TARGETS[i];
      assert.equal(forgeHit(i, target, size), true);
      assert.equal(forgeHit(i, FORGE_HOME[i], size), false, 'Clicking a loose strand does not seat it');
      for (let j = 0; j < FORGE_TARGETS.length; j++) {
        if (i !== j) assert.equal(forgeHit(i, FORGE_TARGETS[j], size), false, 'A different slot cannot satisfy this strand');
      }
      assert.equal(forgeHit(i, { x: target.x + 8 / size.width, y: target.y - 8 / size.height }, size), true,
        'Small physical targeting error remains usable across board aspect ratios');
      assert.equal(forgeHit(i, { x: target.x + Math.min(size.width, size.height) * 0.3 / size.width, y: target.y }, size), false);
    }
  }
});

check('Forge fails closed for invalid indices, coordinates, and board dimensions', () => {
  const size = sizes[0];
  for (const index of [-1, 3, 1.5, NaN, Infinity]) assert.equal(forgeHit(index, FORGE_TARGETS[0], size), false);
  for (const p of [{ x: NaN, y: 0.5 }, { x: 0.5, y: Infinity }, { x: -Infinity, y: 0 }]) assert.equal(forgeHit(0, p, size), false);
  for (const bad of [{ width: 0, height: 100 }, { width: 100, height: -1 }, { width: NaN, height: 100 }, { width: 100, height: Infinity }]) {
    assert.equal(forgeHit(0, FORGE_TARGETS[0], bad), false);
  }
});

check('Own uses a physical circle at every tested board aspect ratio', () => {
  for (const size of sizes) {
    const r = Math.min(size.width, size.height) * OWN_RADIUS;
    assert.equal(ownHit(OWN_TARGET, size), true);
    assert.equal(ownHit(OWN_HOME, size), false);
    const corner = { x: OWN_TARGET.x + r * 0.82 / size.width, y: OWN_TARGET.y + r * 0.82 / size.height };
    assert.equal(ownHit(corner, size), false, 'A point inside the bounding rectangle but outside the circle must not lock');
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const point = scale => ({ x: OWN_TARGET.x + Math.cos(angle) * r * scale / size.width,
        y: OWN_TARGET.y + Math.sin(angle) * r * scale / size.height });
      assert.equal(ownHit(point(0.7), size), true, 'Equivalent physical offsets must behave equally in every direction');
      assert.equal(ownHit(point(1.2), size), false);
    }
  }
});

check('Own fails closed for non-finite input and collapsed board dimensions', () => {
  for (const p of [{ x: NaN, y: 0.42 }, { x: 0.66, y: Infinity }]) assert.equal(ownHit(p, sizes[0]), false);
  for (const bad of [{ width: 0, height: 100 }, { width: -1, height: 100 }, { width: 100, height: NaN }, { width: Infinity, height: 100 }]) {
    assert.equal(ownHit(OWN_TARGET, bad), false);
  }
});

check('Fleet recognizes intentional upward flicks and longer deliberate sweeps', () => {
  for (const input of [{ dx: 0, dy: -60, elapsed: 100 }, { dx: 20, dy: -70, elapsed: 350 }, { dx: -20, dy: -120, elapsed: 2200 }]) {
    assert.equal(fleetIntent(input), true);
  }
  assert.equal(fleetIntent({ dx: 0, dy: -48, elapsed: 750 }), true, 'A complete boundary flick is accepted');
  assert.equal(fleetIntent({ dx: 0, dy: -48, elapsed: 751 }), false, 'Short slow dragging is not a flick');
  assert.equal(fleetIntent({ dx: 0, dy: -96, elapsed: 2200 }), true, 'A longer sweep remains a deliberate alternative');
});

check('Fleet rejects clicks, short or wrong-way travel, and invalid timing', () => {
  const invalid = [
    { dx: 0, dy: 0, elapsed: 120 }, { dx: 0, dy: -10, elapsed: 100 }, { dx: 0, dy: 90, elapsed: 100 },
    { dx: 120, dy: -60, elapsed: 100 }, { dx: 100, dy: 0, elapsed: 100 }, { dx: 0, dy: -90, elapsed: 1200 },
    { dx: 0, dy: -100, elapsed: 0 }, { dx: 0, dy: -100, elapsed: -1 },
    { dx: NaN, dy: -100, elapsed: 100 }, { dx: 0, dy: -Infinity, elapsed: 100 }, { dx: 0, dy: -100, elapsed: Infinity },
  ];
  for (const input of invalid) assert.equal(fleetIntent(input), false);
});

check('Training seed is three Unicode code points of inert text with controls excluded', () => {
  assert.equal(normalizeTrainingSeed(''), null);
  assert.equal(normalizeTrainingSeed('ab'), null);
  assert.equal(normalizeTrainingSeed('  ab  '), null);
  assert.equal(normalizeTrainingSeed('abc'), 'abc');
  assert.equal(normalizeTrainingSeed('abcdef'), 'abc', 'Paste follows the same first-three-code-point rule');
  assert.equal(normalizeTrainingSeed('\u0000a\nbc\u007f'), 'abc');
  assert.equal(normalizeTrainingSeed('😀火手'), '😀火手', 'A non-BMP code point is not split into surrogate halves');
  assert.equal([...normalizeTrainingSeed('😀🔥🖐more')].length, 3);
  assert.equal(normalizeTrainingSeed('<>&'), '<>&', 'User input is retained as text, not interpreted as markup');
});

const geometryCounts = [];
check('All four gate fields expose bounded finite non-collapsed affine instances and particles', () => {
  for (const gate of [1, 2, 3, 4]) {
    const data = buildGateData(gate);
    assert.equal(data.gate, gate);
    assert(Number.isInteger(data.bars) && data.bars > 0 && data.bars < 256);
    assert.equal(data.matrices.length, data.bars * 16);
    for (const name of ['kind', 'channel', 'along', 'seed']) assert.equal(data[name].length, data.bars, name);
    for (const name of ['matrices', 'kind', 'channel', 'along', 'seed', 'particlePositions', 'particleSeed', 'particleChannel']) {
      assert([...data[name]].every(Number.isFinite), `${name} must remain finite`);
    }
    assert([...data.kind].every(x => Number.isInteger(x) && x >= 0 && x <= 3));
    assert([...data.channel].every(x => Number.isInteger(x) && x >= 0 && x <= 2));
    for (const name of ['along', 'seed']) assert([...data[name]].every(x => x >= 0 && x <= 1), name);
    for (let i = 0; i < data.bars; i++) {
      const m = data.matrices.subarray(i * 16, (i + 1) * 16);
      assert(near(m[3], 0) && near(m[7], 0) && near(m[11], 0) && near(m[15], 1), 'Instance transform remains affine');
      const determinant = m[0] * (m[5] * m[10] - m[9] * m[6])
        - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
      assert(Math.abs(determinant) > 1e-12, 'A bar transform must not collapse to a plane, line, or point');
    }
    const particles = data.particlePositions.length / 3;
    assert(Number.isInteger(particles) && particles > 0 && particles <= 384);
    assert.equal(data.particleSeed.length, particles);
    assert.equal(data.particleChannel.length, particles);
    assert([...data.particleSeed].every(x => x >= 0 && x <= 1));
    assert([...data.particleChannel].every(x => Number.isInteger(x) && x >= 0 && x <= 2));
    geometryCounts.push({ gate, bars: data.bars, particles });
  }
});

check('Gate field instance and particle fixtures are seeded deterministically', () => {
  const seeds = new Set();
  for (let i = 0; i < 64; i++) {
    assert(Number.isFinite(gateSeed(i)) && gateSeed(i) >= 0 && gateSeed(i) < 1);
    seeds.add(gateSeed(i));
  }
  assert(seeds.size > 48, 'Seeded variation must not collapse into identical field samples');
  for (const gate of [1, 2, 3, 4]) {
    const a = buildGateData(gate), b = buildGateData(gate);
    for (const name of ['matrices', 'kind', 'channel', 'along', 'seed', 'particlePositions', 'particleSeed', 'particleChannel']) {
      assert.deepEqual([...a[name]], [...b[name]], name);
    }
  }
});

async function filesAt(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? filesAt(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}
const rendererFiles = (await filesAt(resolve('src/systems/gates'))).filter(file => /\.(?:ts|tsx)$/.test(file));
const visualPaths = [resolve('src/components/GatesScene.tsx'), resolve('src/app/gates.css'), ...rendererFiles];
const visuals = await Promise.all(visualPaths.map(async path => ({ path: relative(process.cwd(), path), text: await readFile(path, 'utf8') })));
check('Gate visual systems retain shared clock, grade, and contextual palette ownership', () => {
  assert(rendererFiles.length > 0, 'Gate renderer files must be present');
  for (const source of visuals) {
    assert(!/\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(|gsap\.(?:ticker|timeline)|new\s+Clock\s*\(/.test(source.text), `${source.path}: no independent visual clock`);
    assert(!/<(?:Canvas|EffectComposer)\b|\bnew\s+EffectComposer\b/.test(source.text), `${source.path}: no gate-owned Canvas/composer`);
    assert(!/#[\da-f]{3,8}\b/i.test(source.text), `${source.path}: no raw palette literal`);
    assert(!/PALETTE\.(?:enemy|blood|flash)\b|var\(--(?:enemy|blood|white-flash)\)/.test(source.text), `${source.path}: Craft excludes enemy blue, crimson, and white flash`);
    assert(!/@keyframes\b/.test(source.text), `${source.path}: gate CSS must not establish its own animation clock`);
  }
});

const result = {
  checkedAt: new Date().toISOString(), checks,
  contracts: { forgeStrands: FORGE_TARGETS.length, fleetHands: 3, trainingSeedCodePoints: 3, testedBoardSizes: sizes }, geometryCounts,
  limitations: [
    'Pure math and source checks do not establish actual pointer capture, cursor tracking, cancellation, keyboard/touch parity, animation settlement, GPU appearance, or emotional quality.',
    'Replay, duplicate action guards, lifecycle cleanup, shared native callback count, reduced-motion behavior, and locked Merge timing require separate browser evidence.',
    'No GPU presented FPS or physical mobile acceptance is inferred. Training and fleet remain local demonstrations, not executed code or external agents.'
  ]
};
await mkdir(resolve('docs/gates-v5'), { recursive: true });
await writeFile(resolve('docs/gates-v5/geometry-checks.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
