// Prueba de humo: abre la app en un Chromium sin pantalla, con la base FALSA de tests/fixture.js,
// recorre todas las pestañas y falla si aparece cualquier error de JavaScript.
// Uso:  npx playwright install chromium   (una vez)   →   node tests/humo.mjs [carpeta-para-capturas]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capturas = process.argv[2];
if (capturas) mkdirSync(capturas, { recursive: true });
const falso = readFileSync(path.join(raiz, 'tests/fake-supabase.js'), 'utf8') + '\n' + readFileSync(path.join(raiz, 'tests/fixture.js'), 'utf8') +
  '\nwindow.supabase={createClient:()=>{window.__sb=FakeSupabase.crear(FIXTURE.tablas);return window.__sb;}};';

const browser = await chromium.launch();
const errores = [];
const TABS = ['inicio', 'clientes', 'caja', 'reparto', 'ventas', 'stock', 'compras', 'novedades', 'precios', 'dist'];
for (const [nombre, vp] of [['escritorio', { width: 1280, height: 900 }], ['telefono', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', e => errores.push(`[${nombre}] ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errores.push(`[${nombre}] console: ${m.text()}`); });
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'application/javascript', body: falso }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '' }));
  await page.goto(pathToFileURL(path.join(raiz, 'index.html')).href + '#inicio');
  await page.waitForFunction(() => document.getElementById('app') && !document.getElementById('app').hidden, null, { timeout: 15000 });
  for (const t of TABS) {
    await page.evaluate(v => { ver(v); const p = PINTAR[v]; if (p) p(); if (v === 'clientes') pintarClientes(); }, t);
    await page.waitForTimeout(150);
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (desborde) errores.push(`[${nombre}] ${t}: la página se desborda a lo ancho`);
    if (capturas) await page.screenshot({ path: `${capturas}/${nombre}-${t}.png`, fullPage: true });
  }
  // ficha de un cliente
  await page.evaluate(() => ficha(3));
  await page.waitForTimeout(150);
  if (capturas) await page.screenshot({ path: `${capturas}/${nombre}-ficha.png`, fullPage: true });
  await page.close();
}
await browser.close();
if (errores.length) { console.error('ERRORES:\n' + errores.join('\n')); process.exit(1); }
console.log('Humo OK: la app abre y todas las pestañas se pintan sin errores (escritorio y teléfono).');
