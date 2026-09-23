// Carga el código real de la app (js/*.js) en un contexto aislado de Node, con la base falsa y una fecha "hoy" fija.
// Así los tests prueban exactamente las mismas funciones que corren en el navegador.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { crear } = require('./fake-supabase.js');
const { tablas: TABLAS_FIXTURE } = require('./fixture.js');

const RAIZ = path.resolve(__dirname, '..');
// mismo orden que en index.html, sin app.js (arranca la interfaz)
const ARCHIVOS = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')
  .match(/<script src="js\/[^"?]+/g).map(s => s.replace('<script src="', ''))
  .filter(f => f !== 'js/app.js');

function nodoFalso() {
  const n = { hidden: false, textContent: '', innerHTML: '', value: '', style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
  n.appendChild = () => {}; n.addEventListener = () => {}; n.querySelectorAll = () => []; n.querySelector = () => null; n.remove = () => {};
  return n;
}

async function cargarApp(opciones) {
  const o = Object.assign({ hoy: '2026-09-30', tablas: TABLAS_FIXTURE }, opciones || {});
  const ctx = vm.createContext({ console, setTimeout, clearTimeout });
  ctx.window = ctx;
  // "hoy" fijo: new Date() sin argumentos devuelve el mediodía de o.hoy en Argentina
  vm.runInContext(`(()=>{const R=Date;const FIJO=R.parse('${o.hoy}T15:00:00Z');
    class D extends R{constructor(...a){a.length?super(...a):super(FIJO);} static now(){return FIJO;}}
    globalThis.Date=D;})();`, ctx);
  const store = {};
  ctx.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  ctx.document = { getElementById: () => nodoFalso(), querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, createElement: () => nodoFalso(), body: nodoFalso() };
  ctx.location = { hash: '', reload() {} };
  ctx.history = { replaceState() {} };
  ctx.matchMedia = () => ({ matches: true, addEventListener() {} });
  ctx.addEventListener = () => {};
  ctx.supabase = { createClient: () => crear(o.tablas) };
  for (const f of ARCHIVOS) vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), ctx, { filename: f });
  // misma secuencia de carga que boot() en datos.js, sin pintar
  await vm.runInContext(`(async()=>{
    USUARIO={id:'u-test'}; PERFIL={rol:'admin',activo:true};
    await cargarConfig(); await cargarClientes();
    await Promise.all(['precios','caja','movs','novedades','dist','feriados','devol'].map(cargarTabla));
    await cargarTabla('vueltas'); await cargarTabla('reparto'); await cargarTabla('dists');
    await Promise.all(['prov','prod','stock','provmov','pubdist'].map(cargarTabla));
    armarPIDX(); recalcActivos();
  })()`, ctx);
  const ev = code => vm.runInContext(code, ctx);
  ev('globalThis.__cli=id=>C.find(c=>c.id===id)');
  return ev;
}

// Sin el relleno de clientes (ids ≥ 100): para cuentas donde hay que sumar todo a mano.
function tablasChicas() {
  const t = JSON.parse(JSON.stringify(TABLAS_FIXTURE));
  t.clientes = t.clientes.filter(c => c.id < 100);
  t.suscripciones = t.suscripciones.filter(s => s.cliente_id < 100);
  t.reparto = t.reparto.filter(r => r.cliente_id < 100);
  return t;
}

module.exports = { cargarApp, tablasChicas };
