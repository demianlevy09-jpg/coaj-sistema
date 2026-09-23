// Prueba de impresión de las hojas de reparto (v89): arma vueltas sintéticas de 40 a 90 paradas, las pagina con el código real
// de la app, imprime a PDF A4 en Chromium y verifica que salgan tantas páginas físicas como hojas armadas
// (si una hoja se desborda, lo que sobra sale en una página extra SIN encabezado).
// Se prueba con el área normal, con A4 achicada 16 y 30 mm (Safari con encabezados/pies, impresora con márgenes grandes) y con papel Carta
// achicado 20 mm (v90: en la Mac de Demian el jueves salía en 6 páginas en vez de 4).
// Uso:  node tests/impresion.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const falso = readFileSync(path.join(raiz, 'tests/fake-supabase.js'), 'utf8') + '\n' + readFileSync(path.join(raiz, 'tests/fixture.js'), 'utf8') +
  '\nwindow.supabase={createClient:()=>{window.__sb=FakeSupabase.crear(FIXTURE.tablas);return window.__sb;}};';
const browser = await chromium.launch();
const fallas = [];
for (const [extraMM, papel] of [[0, 'A4'], [8, 'A4'], [15, 'A4'], [10, 'letter']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'application/javascript', body: falso }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '' }));
  await page.goto(pathToFileURL(path.join(raiz, 'index.html')).href + '#reparto');
  await page.waitForFunction(() => document.getElementById('app') && !document.getElementById('app').hidden, null, { timeout: 15000 });
  const hojas = await page.evaluate(([extraMM, papel]) => {
    const calles = ['Mendoza', 'Húsares', 'Cazadores', 'Dragones', 'Juramento', 'B.Encalada', 'Olazabal', 'Sucre'];
    const pubs = ['LA NACION', 'CLARIN', 'LA NACION + CLARIN', 'POPULAR', 'HOLA ARGENTINA'];
    const parts = ['', '', 'bajo puerta', 'dejar en portería', 'con bolsa siempre, arrojar Lu-Vi 05:45', ''];
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const mk = (n) => Array.from({ length: n }, (_, i) => {
      const calle = calles[i % calles.length] + ' ' + (900 + i * 13); const k = rnd() < 0.25 ? Math.ceil(rnd() * 9) : 1;
      return { ed: calle, cl: Array.from({ length: k }, () => { const un = k > 1 ? Math.ceil(rnd() * 15) + ' ' + 'ABCDEF'[Math.floor(rnd() * 6)] : '';
        return { c: { d: calle + (un ? ' ' + un : ''), part: parts[Math.floor(rnd() * parts.length)] }, ent: pubs[Math.floor(rnd() * pubs.length)].split(' + ').map(p => ({ pub: p, qty: 1 })) }; }) };
    });
    const v = { nombre: 'Prueba', repartidor: 'X' }, iso = '2026-09-27', wdh = 6, tot = { 'LA NACION': 60, 'CLARIN': 20 };
    const html = []; let nh = 0;
    for (const N of [40, 55, 70, 90]) { const ps = mk(N); const pages = paginarParadasHoja(ps, v, iso, wdh, tot, N * 2); let n = 0;
      pages.forEach((pg, ix) => { html.push(`<div class="hoja">${encabezadoHojaHTML(v, iso, wdh, tot, ps.length, N * 2, ix + 1, pages.length)}${pg.map(p => paradaHojaHTML(p, ++n)).join('')}</div>`); nh++; }); }
    document.getElementById('print-area').innerHTML = html.join('');
    document.body.classList.add('print-hojas');
    if (extraMM || papel !== 'A4') { const st = document.createElement('style'); st.textContent = `@media print{@page{size:${papel} portrait;margin:${5 + extraMM}mm 8mm}}`; document.head.appendChild(st); }
    return nh;
  }, [extraMM, papel]);
  await page.emulateMedia({ media: 'print' });
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1');
  const paginas = (pdf.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  const txt = `${papel === 'A4' ? 'A4' : 'Carta'} con área útil −${2 * extraMM} mm: ${hojas} hojas armadas → ${paginas} páginas impresas`;
  if (paginas !== hojas) fallas.push(txt); else console.log('OK  ' + txt);
  await page.close();
}
await browser.close();
if (fallas.length) { console.error('FALLA (hay páginas sin encabezado):\n' + fallas.join('\n')); process.exit(1); }
console.log('Impresión OK: cada página física de las hojas de reparto empieza con su encabezado.');
