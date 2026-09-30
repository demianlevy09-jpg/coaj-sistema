// v93: consignación con "% de la tapa" por proveedor (Distribuidora principal: 68%).
const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp, tablasChicas } = require('./cargar.js');

const base = { activo: true, anulado: false, creado_en: '2026-09-01T12:00:00Z' };
async function con() {
  const t = tablasChicas();
  t.proveedores.push(Object.assign({ id: 1, nombre: 'Distribuidora principal', telefono: '', nota: '', pct_tapa: 68 }, base),
                     Object.assign({ id: 2, nombre: 'Juguetería', telefono: '', nota: '', pct_tapa: 0 }, base));
  t.productos.push(Object.assign({ id: 1, nombre: 'Revista Noticias', categoria: 'Revista', proveedor_id: 1, modo_precio: 'fijo', precio_venta: 10900, margen: 0, costo: 5000, publicaciones: [] }, base));
  return cargarApp({ tablas: t });
}

test('con % de la tapa, se le debe ese % del precio de tapa (no el costo cargado)', async () => {
  const app = await con();
  assert.equal(app('costoConsig(prodDe(1),1)'), 7412); // 68% de 10.900
});

test('sin % de la tapa, se usa el costo pactado del producto', async () => {
  const app = await con();
  assert.equal(app('costoConsig(prodDe(1),2)'), 5000);
});
