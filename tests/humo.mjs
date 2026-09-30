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
  // v92: los <select> abren el menú con buscador (js/buscador.js)
  await page.evaluate(() => { ver('compras'); PINTAR.compras(); scrollTo(0, 0);
    const d = document.createElement('div'); d.className = 'card'; d.id = 't-busc';
    d.innerHTML = '<label>Prueba</label><select id="t-sel" onchange="window.__cambio=this.value"><option value="">Elegí…</option>' +
      ['Autitos Toy Story', 'Elle Moda', 'Jardín', 'Revista Noticias', 'Mini Mascotas', 'Oh La La', 'Lugares', 'Muñeca Tiny'].map((t, i) => `<option value="${i + 1}">${t}</option>`).join('') + '</select>';
    document.getElementById('app').prepend(d); });
  const abrirSel = async () => { const b = await page.locator('#t-sel').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(80); };
  await abrirSel();
  if (!(await page.locator('.bpop .bq').count())) errores.push(`[${nombre}] buscador: no se abrió el menú con buscador`);
  else {
    await page.keyboard.type('jardin'); await page.keyboard.press('Enter'); await page.waitForTimeout(50);
    const r1 = await page.evaluate(() => [document.getElementById('t-sel').value, window.__cambio, !!document.querySelector('.bpop')]);
    if (r1[0] !== '3' || r1[1] !== '3' || r1[2]) errores.push(`[${nombre}] buscador: Enter no eligió "Jardín" (${r1})`);
    await abrirSel(); await page.keyboard.type('revis not'); await page.locator('.bpop .bopt').first().click(); await page.waitForTimeout(50);
    const r2 = await page.evaluate(() => [document.getElementById('t-sel').value, window.__cambio, document.querySelectorAll('.bpop').length]);
    if (r2[0] !== '4' || r2[1] !== '4' || r2[2]) errores.push(`[${nombre}] buscador: el clic no eligió "Revista Noticias" (${r2})`);
    await abrirSel(); await page.keyboard.type('zzz');
    if (!(await page.locator('.bpop .bvacio').count())) errores.push(`[${nombre}] buscador: sin resultados no avisa`);
    await page.keyboard.press('Escape');
    if (await page.locator('.bpop').count()) errores.push(`[${nombre}] buscador: Escape no cierra`);
  }
  await page.evaluate(() => document.getElementById('t-busc').remove());
  // en Compras, buscar algo que no existe y elegir "＋ Nuevo producto…" pasa lo buscado al nombre
  await page.evaluate(() => { ver('compras'); PINTAR.compras(); scrollTo(0, 0); const s = document.getElementById('c-prod'); for (let i = 0; i < 8; i++) s.add(new Option('Producto ' + i, 'x' + i), 1); });
  { const b = await page.locator('#c-prod').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(80);
    await page.keyboard.type('Revista Inventada'); await page.keyboard.press('Enter'); await page.waitForTimeout(50);
    const r = await page.evaluate(() => [document.getElementById('c-prod').value, document.getElementById('c-prod-nombre').value, document.getElementById('c-prod-nuevo').hidden]);
    if (r[0] !== 'nuevo' || r[1] !== 'Revista Inventada' || r[2]) errores.push(`[${nombre}] buscador: "Nuevo producto" no tomó lo buscado (${r})`); }
  // ficha de un cliente
  await page.evaluate(() => ficha(3));
  await page.waitForTimeout(150);
  if (capturas) await page.screenshot({ path: `${capturas}/${nombre}-ficha.png`, fullPage: true });
  await page.close();
}
await browser.close();
if (errores.length) { console.error('ERRORES:\n' + errores.join('\n')); process.exit(1); }
console.log('Humo OK: la app abre y todas las pestañas se pintan sin errores (escritorio y teléfono).');
