// Datos FICTICIOS para tests (el repo es público: acá nunca van datos reales de clientes).
// Cada caso está pensado para probar una regla del negocio; los comentarios dicen cuál.
(function (root) {
  const fil = (o) => Object.assign({ anulado: false, origen: 'app', creado_en: '2026-09-01T12:00:00Z' }, o);
  const cli = (id, dom, sal, extra) => fil(Object.assign({ id, domicilio: dom, nombre: '', ficha: 'actual', telefono: '', observaciones: '', particularidad: '', saldo_inicial: sal || 0, saldo_inicial_fecha: '2026-08-31', activo: true, origen: 'newspaper' }, extra || {}));
  let sid = 1;
  const sub = (cliente_id, publicacion, dias_texto, via, o) => fil(Object.assign({ id: sid++, cliente_id, publicacion, dias_texto, dias: null, via, hasta: null, desde: '2024-01-01', cantidad: 1, origen: 'newspaper', novedad_id: null }, o || {}));

  // Precios: 0=lunes … 6=domingo. CLARIN y LA NACION tienen precio distinto el fin de semana.
  const precios = [];
  let pid = 1;
  [['CLARIN', 1500, 2000, 3000], ['LA NACION', 1600, 2200, 3500]].forEach(([p, sem, sab, dom]) => {
    for (let d = 0; d < 7; d++) precios.push(fil({ id: pid++, publicacion: p, dia: d, desde: '2026-01-01', precio: d < 5 ? sem : d === 5 ? sab : dom, origen: 'newspaper' }));
  });
  // Aumento de CLARIN los días de semana desde el 15/09
  for (let d = 0; d < 5; d++) precios.push(fil({ id: pid++, publicacion: 'CLARIN', dia: d, desde: '2026-09-15', precio: 1700 }));
  precios.push(fil({ id: pid++, publicacion: 'PAGINA 12', dia: 6, desde: '2026-01-01', precio: 2100, origen: 'newspaper' }));

  const clientes = [
    cli(1, 'Calle Uno 100 1 A', 10000),        // C CLARIN Lu-Vi, debe 10.000 al 31/08
    cli(2, 'Calle Uno 100 2 B', 0),            // S LA NACION todos los días (comisión)
    cli(3, 'Calle Dos 200', 5000),             // mixto: C CLARIN Sa/Do + S LA NACION Lu-Vi
    cli(4, 'Calle Dos 250 3 C', 0),            // C LA NACION Do, suspendido del 10 al 20/09
    cli(5, 'Calle Tres 300', 0),               // S CLARIN Lu-Vi, suspendido solo los miércoles
    cli(6, 'Calle Tres 310 PB', 0),            // C LA NACION solo feriados ("Fer")
    cli(7, 'Calle Cuatro 400 5 D', 0),         // C CLARIN Lu-Vi hasta el 15/09, después pasa a S (alta de la app)
    cli(8, 'Calle Cuatro 410', -5000),         // saldo a favor, sin suscripciones
    cli(9, 'Calle Cinco 500 1 A', 0),          // C LA NACION Sa x2 ejemplares
    cli(10, 'Calle Cinco 520', 0),             // reserva en la parada (cantidad −1): se cobra pero no va en el recorrido
    cli(11, 'Calle Seis 600', 0, { activo: false }) // inactivo: no se carga
  ];
  // relleno para que las pantallas se vean con volumen
  const calles = ['Húsares', 'Mendoza', 'Olazabal', 'Juramento', 'Sucre', 'Monroe', 'Dragones', 'Cazadores'];
  for (let i = 0; i < 24; i++) clientes.push(cli(100 + i, `${calles[i % 8]} ${1000 + i * 37} ${1 + (i % 9)} ${'ABCDEF'[i % 6]}`, i % 5 === 0 ? 20000 + i * 1000 : (i % 7 === 0 ? -3000 : 0)));

  const suscripciones = [
    sub(1, 'CLARIN', 'De lunes a viernes', 'C'),
    sub(2, 'LA NACION', 'Todos los días', 'S'),
    sub(3, 'CLARIN', 'Sábado y domingo', 'C'),
    sub(3, 'LA NACION', 'Lunes a viernes', 'S'),
    sub(4, 'LA NACION', 'Domingo', 'C'),
    sub(5, 'CLARIN', 'Lunes, Martes, Miércoles, Jueves, Viernes', 'S'),
    sub(6, 'LA NACION', 'Feriados', 'C'),
    sub(7, 'CLARIN', 'De lunes a viernes', 'C', { hasta: '2026-09-15' }),               // cerrada por el alta de abajo
    sub(7, 'CLARIN', 'De lunes a viernes', 'S', { desde: '2026-09-15', origen: 'app', novedad_id: 3, dias: [0, 1, 2, 3, 4] }),
    sub(9, 'LA NACION', 'Sábado', 'C', { cantidad: 2 }),
    sub(10, 'CLARIN', 'Domingo', 'C', { cantidad: -1 }),
    sub(11, 'CLARIN', 'Todos los días', 'C')
  ];
  for (let i = 0; i < 24; i++) {
    suscripciones.push(sub(100 + i, i % 2 ? 'LA NACION' : 'CLARIN', ['Todos los días', 'De lunes a viernes', 'Sábado y domingo', 'Domingo'][i % 4], i % 3 === 0 ? 'C' : 'S'));
    if (i % 6 === 0) suscripciones.push(sub(100 + i, 'PAGINA 12', 'Domingo', 'C'));
  }

  const novedades = [
    fil({ id: 1, cliente_id: 4, tipo: 'Suspensión', publicacion: 'LA NACION', desde: '2026-09-10', hasta: '2026-09-20', dias: null, via: null, cantidad: null, nota: '' }),
    fil({ id: 2, cliente_id: 5, tipo: 'Suspensión', publicacion: 'CLARIN', desde: '2026-09-01', hasta: null, dias: [2], via: null, cantidad: null, nota: '' }),
    fil({ id: 3, cliente_id: 7, tipo: 'Alta', publicacion: 'CLARIN', desde: '2026-09-15', hasta: null, dias: [0, 1, 2, 3, 4], via: 'S', cantidad: 1, nota: 'cambio de modalidad' })
  ];
  const feriados = [
    fil({ fecha: '2026-09-07', motivo: 'Feriado sin diario', sin_pubs: null }),
    fil({ fecha: '2026-09-21', motivo: 'Feriado con diario', sin_pubs: [] })
  ];
  let mid = 1;
  const mov = (cliente_id, fecha, tipo, importe, o) => fil(Object.assign({ id: mid++, cliente_id, fecha, tipo, importe, medio: tipo === 'Cobro' ? 'Efectivo' : '', nota: '', fijo: false }, o || {}));
  const movimientos = [
    mov(1, '2026-09-05', 'Cobro', 10000),
    mov(3, '2026-09-10', 'Cobro', 3000, { medio: 'Transferencia' }),
    mov(3, '2026-09-12', 'Ajuste', -1000, { nota: 'redondeo' }),
    mov(1, '2026-08-20', 'Cobro', 999999, { origen: 'newspaper' }) // de NewsPaper: ya está dentro del saldo inicial, no suma
  ];
  let cid = 1;
  const caja = [
    fil({ id: cid++, fecha: '2026-09-08', concepto: 'Cambio inicial', detalle: 'Saldo inicial', ingreso: 130000, egreso: 0, medio: 'Efectivo', fijo: true, origen: 'inicial' }),
    fil({ id: cid++, fecha: '2026-09-05', concepto: 'Cobro a cliente', detalle: 'Calle Uno 100 1 A', ingreso: 10000, egreso: 0, medio: 'Efectivo', movimiento_id: 1 }),
    fil({ id: cid++, fecha: '2026-09-10', concepto: 'Cobro a cliente', detalle: 'Calle Dos 200', ingreso: 3000, egreso: 0, medio: 'Transferencia', movimiento_id: 2 }),
    fil({ id: cid++, fecha: '2026-09-15', concepto: 'Gasto', detalle: 'Bolsas', ingreso: 0, egreso: 4500, medio: 'Efectivo' })
  ];
  const dist_movimientos = [
    fil({ id: 1, fecha: '2025-12-31', detalle: 'Liquidación NewsPaper', importe: 41500000, distribuidor_id: 1, historico: true, origen: 'newspaper' }),
    fil({ id: 2, fecha: '2026-09-10', detalle: 'Transferencia de la distribuidora', importe: 20000, distribuidor_id: 1, historico: false })
  ];
  const devoluciones = [
    fil({ id: 1, fecha: '2026-09-14', publicacion: 'CLARIN', cantidad: 3, nota: 'sobrantes', distribuidor_id: 1, valor_unit: 1020, importe: 3060 })
  ];
  const vueltas = [fil({ nombre: 'Bici 1', repartidor: 'Gastón', orden: 1, activo: true }), fil({ nombre: 'Pino', repartidor: 'Oscar', orden: 2, activo: true })];
  const reparto = [];
  let rid = 1;
  clientes.filter(c => c.activo).forEach((c, i) => { for (let d = 0; d < 7; d++) reparto.push(fil({ id: rid++, cliente_id: c.id, dia: d, vuelta: i % 2 ? 'Pino' : 'Bici 1', orden: i * 10, origen: 'hojas' })); });
  const config = [{ clave: 'comision', valor: 32 }, { clave: 'medios', valor: ['Efectivo', 'Caja Grande', 'Mercadopago More', 'Transferencia'] }];
  const distribuidores = [fil({ id: 1, nombre: 'Distribuidora principal', activo: true, comision: 32 })];
  const perfiles = [{ id: 'u-test', rol: 'admin', activo: true, nombre: 'Demian' }];

  const tablas = { clientes, suscripciones, precios, novedades, feriados, movimientos, caja, dist_movimientos, devoluciones, vueltas, reparto, config, distribuidores, perfiles, publicaciones_dist: [], proveedores: [], productos: [], stock_mov: [], prov_movimientos: [] };
  const exp = { tablas };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  root.FIXTURE = exp;
})(typeof globalThis !== 'undefined' ? globalThis : this);
