const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const logic = require('./logic.js');

// 1. Pace conversions & non-finite guards
assert.equal(logic.formatTime(logic.convertPace(8 * 60, 'mi')), '04:58', '8:00 min/mi -> 04:58 min/km');
assert.equal(logic.formatTime(logic.convertPace(5 * 60, 'km')), '08:03', '5:00 min/km -> 08:03 min/mi');
assert.equal(logic.convertPace(0, 'mi'), 0);
assert.equal(logic.convertPace(-60, 'km'), 0);
assert.equal(logic.convertPace(Infinity, 'mi'), 0);
assert.equal(logic.convertPace(NaN, 'mi'), 0);

// 2. Finish time calculations
assert.equal(
    logic.formatTime(logic.calculateFinishTime(8 * 60, 'mi', logic.raceDistancesKm['5k'])),
    '24:51',
    '5K at 8:00/mi should be 24:51'
);
assert.equal(
    logic.formatTime(logic.calculateFinishTime(8 * 60, 'mi', logic.raceDistancesKm['full'])),
    '3:29:45',
    'Marathon at 8:00/mi should be 3:29:45'
);
assert.equal(
    logic.formatTime(logic.calculateFinishTime(8 * 60, 'mi', logic.convertMilesToKm(0.25))),
    '02:00',
    'Exact 0.25 mi at 8:00/mi should be 02:00 without rounding drift'
);
assert.equal(logic.calculateFinishTime(0, 'mi', 5), 0, 'Zero pace returns 0');
assert.equal(logic.calculateFinishTime(480, 'mi', Infinity), 0, 'Infinite distance returns 0');
assert.equal(logic.calculateFinishTime(Infinity, 'mi', 5), 0, 'Infinite pace returns 0');

// 3. Reverse pace calculations
const sub20PaceMi = Math.round(logic.calculatePaceFromTimeAndDistance(20 * 60, logic.raceDistancesKm['5k'], 'mi'));
assert.equal(logic.formatTime(sub20PaceMi), '06:26', '20:00 5K -> 06:26/mi');
const sub20PaceKm = Math.round(logic.calculatePaceFromTimeAndDistance(20 * 60, logic.raceDistancesKm['5k'], 'km'));
assert.equal(logic.formatTime(sub20PaceKm), '04:00', '20:00 5K -> 04:00/km');
assert.equal(logic.calculatePaceFromTimeAndDistance(Infinity, 5, 'mi'), 0);
assert.equal(logic.calculatePaceFromTimeAndDistance(1200, Infinity, 'mi'), 0);

// 4. Treadmill speed <-> pace conversions
assert.equal(logic.paceToSpeed(8 * 60, 'mi', 'mph').toFixed(1), '7.5', '8:00/mi -> 7.5 mph');
assert.equal(logic.paceToSpeed(8 * 60, 'mi', 'kmh').toFixed(1), '12.1', '8:00/mi -> 12.1 km/h');
assert.equal(logic.paceToSpeed(5 * 60, 'km', 'kmh').toFixed(1), '12.0', '5:00/km -> 12.0 km/h');
assert.equal(logic.paceToSpeed(0, 'mi', 'mph'), 0);
assert.equal(logic.paceToSpeed(Infinity, 'mi', 'mph'), 0);
assert.equal(Math.round(logic.speedToPace(7.5, 'mph', 'mi')), 480, '7.5 mph -> 480s/mi');
assert.equal(Math.round(logic.speedToPace(12, 'kmh', 'km')), 300, '12 km/h -> 300s/km');
assert.equal(Math.round(logic.speedToPace(12, 'kmh', 'mi')), 483, '12 km/h -> 08:03/mi');
assert.equal(logic.speedToPace(0, 'mph', 'mi'), 0);
assert.equal(logic.speedToPace(Infinity, 'mph', 'mi'), 0);

// 5. Distance conversions
assert.equal(logic.convertMilesToKm(1).toFixed(6), '1.609344');
assert.equal(logic.convertKmToMiles(5).toFixed(3), '3.107');
assert.equal(logic.convertMilesToKm(Infinity), 0);
assert.equal(logic.convertKmToMiles(NaN), 0);

// 6. Decimal input parser (dot & comma locales, mid-typing dots, rejecting junk/Infinity)
assert.equal(logic.parseDecimal('10'), 10);
assert.equal(logic.parseDecimal(' 3.107 '), 3.107);
assert.equal(logic.parseDecimal('12,5'), 12.5);
assert.equal(logic.parseDecimal('12.'), 12);
assert.equal(logic.parseDecimal('12,'), 12);
assert.equal(logic.parseDecimal('.5'), 0.5);
assert.equal(logic.parseDecimal(',5'), 0.5);
assert.equal(logic.parseDecimal('0'), 0);
assert.ok(Number.isNaN(logic.parseDecimal('')));
assert.ok(Number.isNaN(logic.parseDecimal('.')));
assert.ok(Number.isNaN(logic.parseDecimal(',')));
assert.ok(Number.isNaN(logic.parseDecimal('-5')));
assert.ok(Number.isNaN(logic.parseDecimal('10abc')));
assert.ok(Number.isNaN(logic.parseDecimal('5..3')));
assert.ok(Number.isNaN(logic.parseDecimal('1,2,3')));
assert.ok(Number.isNaN(logic.parseDecimal('1e309')));
assert.ok(Number.isNaN(logic.parseDecimal('Infinity')));
assert.ok(Number.isNaN(logic.parseDecimal(null)));

// 7. formatTime rollover & edge cases
assert.equal(logic.formatTime(59.6), '01:00', '59.6s rolls over to 01:00');
assert.equal(logic.formatTime(3599.6), '1:00:00', '3599.6s rolls over to 1:00:00');
assert.equal(logic.formatTime(-5), '00:00', 'Negative seconds clamp to 00:00');
assert.equal(logic.formatTime(Infinity), '00:00', 'Infinity clamps to 00:00');

// 8. parseTime (colon-separated and mobile colon-free entries)
assert.equal(logic.parseTime('24:51'), 24 * 60 + 51);
assert.equal(logic.parseTime('3:29:34'), 3 * 3600 + 29 * 60 + 34);
assert.equal(logic.parseTime('2000'), 20 * 60, 'Colon-free 2000 -> 20:00');
assert.equal(logic.parseTime('500'), 5 * 60, 'Colon-free 500 -> 05:00');
assert.equal(logic.parseTime('13000'), 3600 + 30 * 60, 'Colon-free 13000 -> 1:30:00');
assert.equal(logic.parseTime('032934'), 3 * 3600 + 29 * 60 + 34, 'Colon-free 032934 -> 3:29:34');
assert.equal(logic.parseTime('45'), 45, 'Two-digit 45 -> 45s');
assert.equal(logic.parseTime('0:90'), 90, '90 seconds stopwatch entry -> 90s');
assert.equal(logic.parseTime(''), 0);
assert.equal(logic.parseTime('-5:00'), 0);
assert.equal(logic.parseTime('25:'), 0);
assert.equal(logic.parseTime('abc'), 0);
assert.equal(logic.parseTime('1234567'), 0, '>6 digits rejected');

// 9. Live stopwatch digit formatting for mobile numeric keypad
assert.equal(logic.formatTimeInput(''), '');
assert.equal(logic.formatTimeInput('0'), '');
assert.equal(logic.formatTimeInput('000'), '');
assert.equal(logic.formatTimeInput('2'), '0:02');
assert.equal(logic.formatTimeInput('0:020'), '0:20');
assert.equal(logic.formatTimeInput('0:200'), '2:00');
assert.equal(logic.formatTimeInput('2:000'), '20:00');
assert.equal(logic.formatTimeInput('14500'), '1:45:00');
assert.equal(logic.formatTimeInput('10500'), '1:05:00');
assert.equal(logic.formatTimeInput('103000'), '10:30:00');
assert.equal(logic.formatTimeInput('10:30:005'), '10:30:00', '7th digit capped cleanly at 6 digits');
assert.equal(logic.formatTimeInput('20:0'), '2:00', 'Backspace from 20:00 -> 2:00');
assert.equal(logic.formatTimeInput('0:0'), '', 'Backspace from 0:02 -> empty');
assert.equal(logic.formatTimeInput(null), '');

// 10. PWA manifest, service worker cache list, SEO metadata, and version consistency
const rootDir = __dirname;
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const swSource = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

const badgeMatch = html.match(/<span class="version-badge">v([^<]+)<\/span>/);
const cacheMatch = swSource.match(/const CACHE_NAME = 'runner-math-v([^']+)';/);
assert.ok(badgeMatch && cacheMatch, 'Version badge and SW CACHE_NAME must exist');
const appVersion = cacheMatch[1];
assert.equal(badgeMatch[1], appVersion, 'index.html version badge must match sw.js CACHE_NAME');

const htmlQueryVersions = [...html.matchAll(/\?v=([^"'\s>]+)/g)].map(m => m[1]);
assert.equal(htmlQueryVersions.length, 9, 'index.html must carry ?v= stamps on all 9 linked assets');
for (const qv of htmlQueryVersions) {
    assert.equal(qv, appVersion, `index.html asset ?v=${qv} must match v${appVersion}`);
}

assert.ok(!html.includes('github.io'), 'index.html must not contain stale github.io URLs');
assert.ok(
    html.includes('<link rel="canonical" href="https://runner-math.khomyak.net/">'),
    'index.html must declare canonical custom domain URL'
);
assert.ok(!html.includes('role="button"'), 'Interactive rows must use native <button> instead of role="button"');

const urlsArrayMatch = swSource.match(/const urlsToCache = \[([\s\S]*?)\];/);
assert.ok(urlsArrayMatch, 'urlsToCache list must exist in sw.js');
const cachedUrls = [...urlsArrayMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
for (const relUrl of cachedUrls) {
    if (relUrl === './') continue;
    const diskPath = path.join(rootDir, relUrl.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(diskPath), `Cached asset must exist on disk: ${relUrl}`);
}

for (const icon of manifest.icons) {
    const [cleanSrc, query = ''] = icon.src.split('?');
    assert.equal(query, `v=${appVersion}`, `Manifest icon ${cleanSrc} query must match v${appVersion}`);
    assert.ok(fs.existsSync(path.join(rootDir, cleanSrc)), `Manifest icon must exist on disk: ${cleanSrc}`);
}

// 11. Repository & SEO files (LICENSE, robots.txt, sitemap.xml, README screenshots)
const requiredRepoFiles = [
    'LICENSE',
    'robots.txt',
    'sitemap.xml',
    'screenshots/pace-dark.png',
    'screenshots/distance-light.png'
];
for (const relFile of requiredRepoFiles) {
    assert.ok(fs.existsSync(path.join(rootDir, relFile)), `Required repo file must exist: ${relFile}`);
}
const robotsTxt = fs.readFileSync(path.join(rootDir, 'robots.txt'), 'utf8');
const sitemapXml = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
const readmeMd = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
assert.ok(robotsTxt.includes('https://runner-math.khomyak.net/sitemap.xml'), 'robots.txt must reference custom domain sitemap');
assert.ok(sitemapXml.includes('<loc>https://runner-math.khomyak.net/</loc>'), 'sitemap.xml must list custom domain root');
assert.ok(!readmeMd.includes('github.io'), 'README.md must not contain stale github.io URLs');

console.log('All strict unit and integrity tests passed!');
