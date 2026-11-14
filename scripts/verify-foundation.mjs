import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const failures = [];
const checks = [];
async function filesAt(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => entry.isDirectory()
      ? filesAt(join(directory, entry.name)) : [join(directory, entry.name)]));
    return nested.flat();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function check(name, ok, detail) {
  checks.push({ name, passed: Boolean(ok), detail });
  if (!ok) failures.push(`${name}: ${detail}`);
}
const sourceFiles = (await filesAt(resolve(root, 'src'))).filter(file => /\.(?:ts|tsx|css)$/.test(file));
const sources = await Promise.all(sourceFiles.map(async file => ({ path: relative(root, file), text: await readFile(file, 'utf8') })));
const badHex = sources.filter(file => file.path !== 'src/core/config.ts' && /#[\da-f]{3,8}\b/i.test(file.text)).map(file => file.path);
check('Closed palette', badHex.length === 0, badHex.length ? badHex.join(', ') : 'Raw color literals exist only in src/core/config.ts. Context permissions still require runtime/visual review.');
const appLoops = sources.filter(file => /\b(?:requestAnimationFrame|setInterval)\s*\(/.test(file.text)).map(file => file.path);
check('No independent application RAF/interval', appLoops.length === 0, appLoops.length ? appLoops.join(', ') : 'Application source declares no requestAnimationFrame or setInterval calls. Library internals are assessed separately.');
const misplacedKeyframes = sources.filter(file => !file.path.endsWith('motion.css') && /@keyframes\b/.test(file.text)).map(file => file.path);
check('Central motion CSS', misplacedKeyframes.length === 0, misplacedKeyframes.length ? misplacedKeyframes.join(', ') : 'Any custom keyframes are confined to motion.css.');
const allSource = sources.map(file => file.text).join('\n');
const canvasCount = (allSource.match(/<Canvas(?:\s|>)/g) || []).length;
const composerCount = (allSource.match(/<EffectComposer(?:\s|>)/g) || []).length;
check('Permanent Canvas declaration', canvasCount === 1, `${canvasCount} Canvas JSX declarations; live instance count requires runtime receipt.`);
check('Persistent global composer declaration', composerCount === 1, `${composerCount} EffectComposer JSX declarations; live instance count requires runtime receipt.`);
const remoteSources = sources.filter(file => /(?:src|href)\s*=\s*['"]https?:\/\/|\b(?:fetch|import)\s*\(\s*['"]https?:\/\/|@import[^;]*https?:\/\//.test(file.text)).map(file => file.path);
check('Self-hosted application resources', remoteSources.length === 0, remoteSources.length ? remoteSources.join(', ') : 'No remote asset/import/fetch declarations in app source. Runtime request audit remains separate.');
const trackerImports = sources.filter(file => /(?:from\s+|import\s*\()['"](?:@vercel\/analytics|@vercel\/speed-insights|posthog|mixpanel|@sentry|@segment)|googletagmanager|google-analytics\.com/.test(file.text)).map(file => file.path);
check('No tracker declarations', trackerImports.length === 0, trackerImports.length ? trackerImports.join(', ') : 'No known tracker imports/hosts in application source; this is a source attestation, not a network measurement.');
const forbiddenAssets = sources.filter(file => /90-staging-conflicts|staging-conflict-(?:restrained-person|ascent-bound-person)/.test(file.text)).map(file => file.path);
check('Excluded staging imagery', forbiddenAssets.length === 0, forbiddenAssets.length ? forbiddenAssets.join(', ') : 'No references to excluded bound-person images in application source.');
// A physical dimension may equal a time marker. Inspect clock owners/readers,
// and independently assert the approved schedule rather than banning geometry numbers.
const ceremonySources = sources.filter(file => file.path !== 'src/core/config.ts' && /\b(?:gsap|ceremonyTime)\b/.test(file.text));
const duplicatedMarkers = ceremonySources.filter(file => /\b(?:6\.9|7\.35|7\.4)\b/.test(file.text)).map(file => file.path);
check('Locked markers centralized', duplicatedMarkers.length === 0, duplicatedMarkers.length ? duplicatedMarkers.join(', ') : 'Distinctive locked markers are not duplicated in GSAP/ceremony clock code outside TIMING. Geometry dimensions are not clocks.');
const timingSource = sources.find(file => file.path === 'src/core/config.ts')?.text || '';
const mergeBlock = timingSource.match(/merge:\s*\{([^}]+)\}/)?.[1] || '';
const mergeTiming = Object.fromEntries([...mergeBlock.matchAll(/(\w+):\s*([\d.]+)/g)].map(match => [match[1], Number(match[2])]));
const approvedMerge = { summon:0.4, handStart:1.6, handDuration:2.2, swordStart:3.8, swordDuration:3,
  flashStart:6.9, flashDuration:0.5, cutStart:7, cutDuration:0.35, silenceStart:7, silenceEnd:8, fork:8 };
check('Approved Merge schedule', Object.entries(approvedMerge).every(([key,value]) => mergeTiming[key] === value),
  'D03 expected markers/durations are checked explicitly, including flash/cut overlap, 7–8s silence, and the 8s Fork. Browser timing remains separate.');
const fixtureSource = sources.find(file => file.path === 'src/core/fixtures.ts')?.text || '';
const memberCount = (fixtureSource.match(/id: 'fixture-\d+'/g) || []).length;
const auditSection = fixtureSource.split('export const drainAudit')[1]?.split('export const relics')[0] || '';
const auditCount = (auditSection.match(/\{ id:/g) || []).length;
const relicCount = (fixtureSource.match(/id: 'relic-\d+'/g) || []).length;
const stationCount = (fixtureSource.match(/\{ stop:/g) || []).length;
check('Foundation fixture contracts', memberCount === 6 && auditCount >= 12 && relicCount === 3 && stationCount === 4,
  `${memberCount} member shaders, ${auditCount} illustrative audit items, ${relicCount} relic fixtures, ${stationCount} stations.`);

const exported = await filesAt(resolve(root, 'out'));
let payload = null;
if (exported.length) {
  const htmlPath = resolve(root, 'out/index.html');
  const html = await readFile(htmlPath, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1].split('?')[0]);
  const localRefs = [...new Set(refs.filter(ref => ref.startsWith('/') && /\.(?:js|css|woff2?|png|jpe?g|webp|svg|avif)$/.test(ref)))];
  const resources = [];
  for (const ref of localRefs) {
    const path = resolve(root, 'out', `.${ref}`);
    if (!path.startsWith(resolve(root, 'out') + '/')) continue;
    try {
      const buffer = await readFile(path);
      resources.push({ path: ref, rawBytes: buffer.length, gzipBytes: gzipSync(buffer).length });
    } catch (error) { check('Referenced export resource', false, `${ref}: ${error.message}`); }
  }
  const clientFiles = exported.filter(file => ['.js', '.css', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.avif'].includes(extname(file)));
  const clientStats = await Promise.all(clientFiles.map(async file => {
    const buffer = await readFile(file);
    return { path: relative(resolve(root, 'out'), file), rawBytes: buffer.length, gzipBytes: gzipSync(buffer).length };
  }));
  const totalExportBytes = (await Promise.all(exported.map(file => stat(file)))).reduce((sum, item) => sum + item.size, 0);
  const initialReferencedRawBytes = Buffer.byteLength(html) + resources.reduce((sum, item) => sum + item.rawBytes, 0);
  const initialReferencedGzipBytes = gzipSync(html).length + resources.reduce((sum, item) => sum + item.gzipBytes, 0);
  const conservativeClientRawBytes = Buffer.byteLength(html) + clientStats.reduce((sum, item) => sum + item.rawBytes, 0);
  const conservativeClientGzipBytes = gzipSync(html).length + clientStats.reduce((sum, item) => sum + item.gzipBytes, 0);
  payload = { measuredAt: new Date().toISOString(), method: 'Filesystem byte measurement of static export. Root HTML references are a lower-bound entry set; all exported JS/CSS/font/image assets plus root HTML are a conservative client-asset upper bound including lazy and not-found chunks. The small eagerly fetched measurement receipt is counted separately in conservativeAppLoadRawBytes. Gzip is estimated with node:zlib, not measured network transfer.',
    targetBytes: 4_000_000, rootHtmlBytes: Buffer.byteLength(html), initialReferencedRawBytes, initialReferencedGzipBytes,
    conservativeClientRawBytes, conservativeClientGzipBytes, totalExportBytes, exportedFileCount: exported.length,
    referencedResources: resources, clientAssets: clientStats, runtimeFps: 'Unmeasured by this script', runtimeDevice: 'Unmeasured by this script' };
  check('Static export root', html.includes('</html>'), 'out/index.html exists and contains a complete HTML document.');
  const compactReceipt = { measured: true, measuredAt: payload.measuredAt,
    method: 'Static-export filesystem bytes; initial references are a lower-bound entry set, all-client totals include lazy/not-found chunks and exclude this small diagnostic JSON. Gzip is a node:zlib estimate, not network transfer.',
    targetBytes: payload.targetBytes, initialReferencedRawBytes, initialReferencedGzipBytes,
    conservativeClientRawBytes, conservativeClientGzipBytes,
    runtimeFps: 'Unmeasured by filesystem; browser heartbeat is not a GPU/device benchmark.' };
  const receiptText = JSON.stringify(compactReceipt, null, 2) + '\n';
  await mkdir(resolve(root, 'public'), { recursive: true });
  await Promise.all(['public/foundation-receipt.json', 'out/foundation-receipt.json'].map(path => writeFile(resolve(root, path), receiptText)));
  payload.receiptRawBytes = Buffer.byteLength(receiptText);
  payload.receiptGzipBytes = gzipSync(receiptText).length;
  payload.conservativeAppLoadRawBytes = conservativeClientRawBytes + payload.receiptRawBytes;
  payload.conservativeAppLoadGzipBytes = conservativeClientGzipBytes + payload.receiptGzipBytes;
  const finalExported = await filesAt(resolve(root, 'out'));
  payload.totalExportBytes = (await Promise.all(finalExported.map(file => stat(file)))).reduce((sum, item) => sum + item.size, 0);
  payload.exportedFileCount = finalExported.length;
  check('Initial payload target (conservative raw upper bound)', payload.conservativeAppLoadRawBytes < 4_000_000,
    `${payload.conservativeAppLoadRawBytes.toLocaleString()} raw bytes across root HTML, all exported client assets, and the eager receipt JSON; gzip estimate ${payload.conservativeAppLoadGzipBytes.toLocaleString()} bytes.`);
} else {
  checks.push({ name: 'Static export and payload', passed: null, detail: 'out/ not present yet. Run after next build; no payload or export claim made.' });
}
await mkdir(resolve(root, 'docs/foundation'), { recursive: true });
const report = { checkedAt: new Date().toISOString(), checks, payload, limitations: ['Source scans do not prove library runtime loop count, contextual palette permissions, device FPS, or interactive journey behavior.', 'No public deployment was performed by this check.'] };
await writeFile(resolve(root, 'docs/foundation/static-checks.json'), JSON.stringify(report, null, 2) + '\n');
if (payload) await writeFile(resolve(root, 'docs/foundation/payload.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
