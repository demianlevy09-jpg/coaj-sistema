// Tests de los bugs corregidos en v83 (cada uno reproduce el caso que fallaba).
// Precios de tests/fixture.js: CLARIN Lu–Vi $1.500 ($1.700 desde el 15/09) · Sá $2.000 · Do $3.000; LA NACION Lu–Vi $1.600 · Sá $2.200 · Do $3.500.
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp, tablasChicas } = require('./cargar.js');

const FIN = '2026-09-30';
let nid = 5000;
const nov = (cliente_id, tipo, publicacion, desde, hasta, extra) => Object.assign({ id: nid++, anulado: false, creado_en: '2026-09-01T12:00:00Z', cliente_id, tipo, publicacion, desde, hasta: hasta || null, dias: null, via: null, cantidad: null, nota: '' }, extra || {});
async function con(mod, hoy) { const t = tablasChicas(); mod(t); return cargarApp(hoy ? { tablas: t, hoy } : { tablas: t }); }

test('una suspensión ya terminada no levanta otra abierta anterior', async () => {
  // cliente 1: CLARIN Lu–Vi "le cobrás vos". Suspensión abierta desde el 01/09 y otra del 05/09 al 08/09.
  const app = await con(t => t.novedades.push(nov(1, 'Suspensión', 'CLARIN', '2026-09-01'), nov(1, 'Suspensión', 'CLARIN', '2026-09-05', '2026-09-08')));
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 0);
});

test('una baja de cliente no se levanta cuando termina una suspensión de una publicación', async () => {
  const app = await con(t => t.novedades.push(nov(1, 'Baja', '', '2026-09-10'), nov(1, 'Suspensión', 'CLARIN', '2026-09-20', '2026-09-22')));
  // solo del 01 al 09/09: 1–4 y 8–9 (el 7 es feriado sin diario) = 6 días × 1.500
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 6 * 1500);
});

test('reactivar el cliente no revive la baja de una suscripción puntual', async () => {
  const app = await con(t => t.novedades.push(nov(1, 'Baja', 'CLARIN', '2026-09-05'), nov(1, 'Baja', '', '2026-09-10'), nov(1, 'Reanudación', '', '2026-09-20')));
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 4 * 1500); // solo 1–4/09 (Ma–Vi); desde el 05 CLARIN está dada de baja aunque el cliente se reactive
});

test('una reanudación de una publicación no levanta la baja del cliente', async () => {
  const app = await con(t => t.novedades.push(nov(1, 'Baja', '', '2026-09-10'), nov(1, 'Reanudación', 'CLARIN', '2026-09-15')));
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 6 * 1500);
});

test('la publicación se compara exacta: suspender "CLARIN REVISTA" no toca CLARIN', async () => {
  const app = await con(t => t.novedades.push(nov(1, 'Suspensión', 'CLARIN REVISTA', '2026-09-01')));
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 9 * 1500 + 12 * 1700);
  assert.equal(app(`mismaPub('Clarín ','CLARIN')`), true);
});

test('novedad sin fecha "desde" no cuenta (igual que la base)', async () => {
  const app = await con(t => t.novedades.push(nov(1, 'Suspensión', 'CLARIN', null)));
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 9 * 1500 + 12 * 1700);
});

test('precio "Todos / único" más nuevo le gana a un precio por día más viejo', async () => {
  const app = await con(t => t.precios.push({ id: 9001, anulado: false, origen: 'app', publicacion: 'CLARIN', dia: null, desde: '2026-09-20', precio: 5000 }));
  assert.equal(app(`precioDe('CLARIN',0,'2026-09-21')`), 5000);
  assert.equal(app(`precioDe('CLARIN',0,'2026-09-14')`), 1500);
  // con la misma fecha gana el del día
  const app2 = await con(t => t.precios.push({ id: 9002, anulado: false, origen: 'app', publicacion: 'CLARIN', dia: null, desde: '2026-09-15', precio: 5000 }));
  assert.equal(app2(`precioDe('CLARIN',0,'2026-09-16')`), 1700);
});

test('resumen de meses anteriores: el día "hasta" de una suscripción es exclusivo', async () => {
  // LA NACION sábados "le cobrás vos" del 01/08 al 15/08 (exclusivo): sábados 1 y 8 → 2 ejemplares, no 3
  const app = await con(t => t.suscripciones.push({ id: 7001, anulado: false, cliente_id: 8, publicacion: 'LA NACION', dias_texto: 'Sábado', dias: [5], via: 'C', desde: '2026-08-01', hasta: '2026-08-15', cantidad: 1, origen: 'newspaper', novedad_id: null }));
  assert.equal(app(`consumoMes(__cli(8),2026,7).agg['LA NACION'].n`), 2);
});

test('importes escritos como en Argentina', async () => {
  const app = await cargarApp();
  assert.equal(app(`num('1.500')`), 1500);
  assert.equal(app(`num('1.500,50')`), 1500.5);
  assert.equal(app(`num('$ 12.000')`), 12000);
  assert.equal(app(`num('1799.9')`), 1799.9);
  assert.equal(app(`Number.isNaN(num(''))`), true);
});

test('borrar un cobro repetido no saca de la caja el único ingreso', async () => {
  // dos cobros iguales (mismo cliente, día e importe) y una sola fila de caja, sin enlace: no se toca la caja
  const app = await con(t => {
    t.movimientos.push({ id: 8001, anulado: false, origen: 'app', cliente_id: 2, fecha: '2026-09-22', tipo: 'Cobro', importe: 158300, medio: 'Transferencia', nota: '', creado_en: '2026-09-22T14:27:00Z' });
    t.movimientos.push({ id: 8002, anulado: false, origen: 'app', cliente_id: 2, fecha: '2026-09-22', tipo: 'Cobro', importe: 158300, medio: 'Transferencia', nota: '', creado_en: '2026-09-22T14:30:00Z' });
    t.caja.push({ id: 8101, anulado: false, origen: 'app', fecha: '2026-09-22', concepto: 'Cobro a cliente', detalle: 'Calle Uno 100 2 B', ingreso: 158300, egreso: 0, medio: 'Transferencia', movimiento_id: null, creado_en: '2026-09-22T14:27:01Z' });
  });
  assert.equal(app(`cajaDeCobro(LIVE.movs.find(m=>m.id==='8002'))`), null);
  // con enlace, se encuentra la suya
  const app2 = await con(t => {
    t.movimientos.push({ id: 8003, anulado: false, origen: 'app', cliente_id: 2, fecha: '2026-09-22', tipo: 'Cobro', importe: 5000, medio: 'Efectivo', nota: '' });
    t.caja.push({ id: 8102, anulado: false, origen: 'app', fecha: '2026-09-22', concepto: 'Cobro a cliente', detalle: 'otro texto', ingreso: 5000, egreso: 0, medio: 'Efectivo', movimiento_id: 8003 });
  });
  assert.equal(app2(`cajaDeCobro(LIVE.movs.find(m=>m.id==='8003')).id`), '8102');
});

test('"Pasar a…" arrastra las suspensiones que siguen vigentes', async () => {
  const app = await cargarApp();
  // cliente 5: CLARIN Lu–Vi con los miércoles suspendidos sin fecha de vuelta (fixture)
  const s = app(`suspensionesQueSiguen(5,'CLARIN',[0,1,2,3,4],'2026-09-23').map(n=>n.tipo+':'+JSON.stringify(n.dias)).join()`);
  assert.equal(s, 'Suspensión:[2]');
  // una suspensión que ya terminó no se copia
  assert.equal(app(`suspensionesQueSiguen(4,'LA NACION',[6],'2026-09-23').length`), 0);
});

test('dirección con números en el nombre de la calle', async () => {
  const app = await cargarApp();
  assert.equal(app(`edificioDe('11 de Septiembre de 1888 1990 3 A').ed`), '11 de Septiembre de 1888 1990');
  assert.equal(app(`edificioDe('Av. 9 de Julio 1234 5 A').alt`), 1234);
  assert.equal(app(`edificioDe('Húsares 2255 1 14 3').un`), '1 14 3');
});

test('revista a suscriptores: no se entregan más ejemplares de los que llegaron', async () => {
  const app = await con(t => {
    t.productos.push({ id: 1, nombre: 'Revista X', categoria: 'Revista mensual', proveedor_id: null, modo_precio: 'fijo', precio_venta: 3000, margen: 0, costo: 2000, activo: true, publicaciones: ['CLARIN'], anulado: false });
    t.stock_mov.push({ id: 1, anulado: false, producto_id: 1, fecha: '2026-09-29', tipo: 'compra', cantidad: 2, propiedad: 'propio', proveedor_id: null, costo_unit: 2000, precio_unit: 0, edicion: '10' });
  }, '2026-09-29');
  const g = await app(`generarEntregas(1,'10','2026-09-29','propio',null)`);
  assert.equal(g.n, 2);        // llegaron 2
  assert.ok(g.faltan >= 1);    // y hay más suscriptores de CLARIN (1, 3, 5, 7, 10)
});
