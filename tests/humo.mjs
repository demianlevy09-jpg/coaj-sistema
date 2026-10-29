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
  // v96: el pase entre cajas se carga desde "Qué pasó" → Pase entre cajas (antes no había lugar para la segunda caja)
  { const r = await page.evaluate(async () => { ver('caja'); PINTAR.caja(); const s = document.getElementById('cc'); s.value = 'Transferencia entre cuentas'; cajaModo();
      const vis = !document.getElementById('cm2-w').hidden; document.getElementById('cm').value = 'Caja Kiosko'; document.getElementById('cm2').value = 'Mercadopago More'; document.getElementById('cing').value = '1000';
      const antes = Object.fromEntries(saldosCaja()); await addCaja(); const desp = Object.fromEntries(saldosCaja());
      return [vis, antes['Caja Kiosko'] - desp['Caja Kiosko'], desp['Mercadopago More'] - antes['Mercadopago More']]; });
    if (!r[0] || r[1] !== 1000 || r[2] !== 1000) errores.push(`[${nombre}] caja: el pase entre cajas no funcionó (${r})`); }
  // v97: el resumen impreso no se corta (se achica para entrar en 86 mm) y se rehace si cambió algo del mes
  { const r = await page.evaluate(async () => { const pr = window.print; window.print = () => {}; const c = C.find(x => x.id === 3);
      ['OLE', 'PERFIL', 'AMBITO', 'CRONISTA', 'BAE', 'TIEMPO'].forEach((pb, i) => { LIVE.precios.push({ id: 'h' + i, pub: pb, dia: null, desde: '2026-01-01', precio: 1000 }); c.subs.push([pb, 'Todos los días', 'C', 'V', '2024-01-01', 1, 'newspaper', null]); }); armarPIDX(); SCACHE = {};
      await imprimirResumenes([1, 3]); const ok1 = [...document.querySelectorAll('#print-area .res')].every(e => { const pa = document.getElementById('print-area'); pa.style.cssText = 'display:block;position:absolute;left:-10000px;width:194mm'; const v = e.scrollHeight <= e.clientHeight + 1; pa.style.cssText = ''; return v; });
      LIVE.movs.push({ id: 'h1', cli: 1, tipo: 'Cobro', imp: 777, f: cierreISO(), medio: 'Caja Kiosko' }); await imprimirResumenes([1]);
      const rs = (await sb.from('resumenes').select('*')).data.filter(x => x.cliente_id === 1); window.print = pr; LIVE.movs.pop();
      return [ok1, rs.length, rs.filter(x => !x.anulado).length, rs.find(x => !x.anulado).cobros]; });
    if (!r[0] || r[1] !== 2 || r[2] !== 1 || Math.round(r[3]) !== 10777) errores.push(`[${nombre}] resumen: no entra o no se rehízo (${r})`); }
  await page.close();
}
await browser.close();
if (errores.length) { console.error('ERRORES:\n' + errores.join('\n')); process.exit(1); }
console.log('Humo OK: la app abre y todas las pestañas se pintan sin errores (escritorio y teléfono).');
