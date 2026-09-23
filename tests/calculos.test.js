// Tests de las reglas de plata. Correr con:  node --test tests/
// Los importes esperados están calculados a mano (día por día) para septiembre de 2026, con los precios de tests/fixture.js:
//   CLARIN   Lu–Vi $1.500 (desde el 15/09 $1.700) · Sá $2.000 · Do $3.000
//   LA NACION Lu–Vi $1.600 · Sá $2.200 · Do $3.500
//   Feriados: 07/09 SIN diario (no se reparte nada) · 21/09 CON diario (se reparte normal)
// Septiembre 2026 arranca martes. Días hábiles sin el 07/09: 1–4, 8–11, 14 (9 antes del 15) y 15–18, 21–25, 28–30 (12 desde el 15).
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp, tablasChicas } = require('./cargar.js');

const FIN = '2026-09-30';
let app, chica;
test.before(async () => { app = await cargarApp(); chica = await cargarApp({ tablas: tablasChicas() }); });

test('días de una suscripción: entiende cualquier forma de escribirlos', () => {
  const FD = t => JSON.stringify(app(`FD(${JSON.stringify(t)})`));
  assert.equal(FD('De lunes a viernes'), '[0,1,2,3,4]');
  assert.equal(FD('Miércoles, Jueves, Viernes, Sábado'), '[2,3,4,5]');
  assert.equal(FD('Lu Ma Vi'), '[0,1,4]');
  assert.equal(FD('Sábado y domingo'), '[5,6]');
  assert.equal(FD('Feriados'), '[7]');
  assert.equal(FD('Sin día determinado'), 'null');
  assert.equal(FD(''), 'null');
});

test('precio: se usa el vigente en la fecha (aumento del 15/09)', () => {
  assert.equal(app(`precioDe('CLARIN',0,'2026-09-14')`), 1500);
  assert.equal(app(`precioDe('CLARIN',0,'2026-09-15')`), 1700);
  assert.equal(app(`precioDe('CLARIN',5,'2026-09-20')`), 2000);
  assert.equal(app(`precioDe('REVISTA SIN PRECIO',0,'2026-09-20')`), null);
});

test('devengo "le cobrás vos": Lu–Vi con aumento y feriado sin diario', () => {
  // 9 días × 1.500 + 12 días × 1.700
  assert.equal(app(`devengoDe(__cli(1),'C','${FIN}')`), 9 * 1500 + 12 * 1700);
  assert.equal(app(`devengoDe(__cli(1),'S','${FIN}')`), 0);
});

test('saldo = saldo inicial + devengo − cobros ± ajustes (lo de NewsPaper no suma)', () => {
  assert.equal(app(`saldoDe(__cli(1),'2026-08-31')`), 10000);
  assert.equal(app(`saldoDe(__cli(1),'${FIN}')`), 10000 + 33900 - 10000);
  // cliente 3: 5.000 inicial + CLARIN Sá/Do (4×2.000 + 4×3.000) − cobro 3.000 − ajuste 1.000
  assert.equal(app(`saldoDe(__cli(3),'${FIN}')`), 5000 + 20000 - 3000 - 1000);
  assert.equal(app(`saldoDe(__cli(8),'${FIN}')`), -5000);
});

test('suspensión con fechas: no devenga dentro del período (inclusive)', () => {
  // LA NACION domingos 6, 13, 20, 27; suspendido del 10 al 20 → solo 6 y 27
  assert.equal(app(`devengoDe(__cli(4),'C','${FIN}')`), 2 * 3500);
  assert.equal(app(`suspendida(4,'LA NACION','2026-09-20')`), true);
  assert.equal(app(`suspendida(4,'LA NACION','2026-09-21')`), false);
});

test('suspensión de un solo día de la semana: el resto sigue', () => {
  // CLARIN Lu–Vi sin miércoles: 7 días × 1.500 antes del 15 + 9 × 1.700 después
  assert.equal(app(`devengoDe(__cli(5),'S','${FIN}')`), 7 * 1500 + 9 * 1700);
  assert.equal(app(`entregasDe(__cli(5),'2026-09-16').out.length`), 0); // miércoles
  assert.equal(app(`entregasDe(__cli(5),'2026-09-17').out.length`), 1); // jueves
});

test('día "Fer": solo se entrega y cobra en feriados CON diario', () => {
  assert.equal(app(`devengoDe(__cli(6),'C','${FIN}')`), 1600);
  assert.equal(app(`entregasDe(__cli(6),'2026-09-21').out.length`), 1);
  assert.equal(app(`entregasDe(__cli(6),'2026-09-22').out.length`), 0);
});

test('feriado sin diario: nadie recibe nada', () => {
  assert.equal(app(`C.filter(c=>entregasDe(c,'2026-09-07').out.length).length`), 0);
});

test('suscripción cerrada a mitad de mes: cuenta hasta el día anterior al cierre', () => {
  // CLARIN "le cobrás vos" hasta el 15/09 (exclusivo) y desde el 15/09 "vía distribuidora"
  assert.equal(app(`devengoDe(__cli(7),'C','${FIN}')`), 9 * 1500);
  assert.equal(app(`devengoDe(__cli(7),'S','${FIN}')`), 12 * 1700);
  assert.equal(app(`entregasDe(__cli(7),'2026-09-14').out.map(o=>o.via).join()`), 'C');
  assert.equal(app(`entregasDe(__cli(7),'2026-09-15').out.map(o=>o.via).join()`), 'S');
});

test('cantidad: 2 ejemplares cobran doble', () => {
  assert.equal(app(`devengoDe(__cli(9),'C','${FIN}')`), 4 * 2200 * 2);
  assert.equal(app(`entregasDe(__cli(9),'2026-09-19').out[0].qty`), 2);
});

test('reserva en la parada (cantidad −1): se cobra pero no va en el recorrido', () => {
  assert.equal(app(`devengoDe(__cli(10),'C','${FIN}')`), 4 * 3000);
  assert.equal(app(`entregasDe(__cli(10),'2026-09-20').out.length`), 0);
  assert.equal(app(`entregasDe(__cli(10),'2026-09-20').res.length`), 1);
});

test('consumo del mes del resumen coincide con el devengo', () => {
  for (const id of [1, 3, 4, 6, 7, 9, 10]) {
    assert.equal(app(`consumoMes(__cli(${id}),2026,8).tot`), app(`devengoDe(__cli(${id}),'C','${FIN}')`), 'cliente ' + id);
  }
});

test('clientes inactivos no se cargan', () => {
  assert.equal(app(`!!__cli(11)`), false);
});

test('comisión: 32% de la tapa repartida a suscriptores de la distribuidora', () => {
  // tapa S: cliente 2 (LA NACION todos los días) 21×1.600 + 4×2.200 + 4×3.500 = 56.400
  //         cliente 3 (LA NACION Lu–Vi) 21×1.600 = 33.600 · cliente 5 = 25.800 · cliente 7 = 20.400
  const tapa = 56400 + 33600 + 25800 + 20400;
  assert.equal(chica(`tapaRepartida(1)`), tapa);
  assert.equal(chica(`Math.round(comisionDevengada(1))`), Math.round(tapa * 0.32));
});

test('distribuidora: comisión a favor, diarios de tus clientes al costo, devoluciones y pagos', () => {
  // tapa de tus clientes ("le cobrás vos"): 33.900 + 20.000 + 7.000 + 1.600 + 13.500 + 17.600 + 12.000 = 105.600
  const tapaC = 105600, tapaS = 136200;
  const c = chica(`cuentaDist(1)`);
  assert.equal(c.tapaC, tapaC);
  assert.equal(Math.round(c.costo), Math.round(tapaC * 0.68));     // te los vende a tapa − 32%
  assert.equal(Math.round(c.comision), Math.round(tapaS * 0.32));
  assert.equal(c.devol, 3060);
  assert.equal(c.movs, 20000);                                     // lo histórico de NewsPaper no suma
  assert.equal(Math.round(c.saldo), Math.round(20000 + tapaC * 0.68 - tapaS * 0.32 - 3060));
  assert.equal(Math.round(chica(`saldoDist(1)`)), Math.round(c.saldo));
});

test('distribuidora mes por mes: los meses suman el saldo total', async () => {
  const oct = await cargarApp({ tablas: tablasChicas(), hoy: '2026-10-05' });
  const meses = oct(`cuentaDistPorMes(1)`);
  assert.equal(meses.map(m => m.mes).join(), '2026-09,2026-10');
  assert.equal(meses[1].parcial, true);
  assert.equal(Math.round(meses[0].saldo), Math.round(chica(`cuentaDist(1)`).saldo)); // septiembre = lo calculado al 30/09
  const total = oct(`cuentaDist(1)`).saldo;
  assert.equal(Math.round(meses[0].saldo + meses[1].saldo), Math.round(total));
  assert.equal(Math.round(meses[1].saldoAcum), Math.round(total));
});
