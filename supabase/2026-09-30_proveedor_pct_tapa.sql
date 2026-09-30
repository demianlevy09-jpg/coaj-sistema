-- v93: % del precio de tapa que se le debe al proveedor por cada unidad vendida en consignación
-- (ej. Distribuidora principal: 68% → revista de tapa $10.900 = $7.412 por cada una vendida, la vendas al precio que la vendas).
-- 0 = sin regla: se usa el costo pactado que se carga a mano en la recepción.
alter table public.proveedores add column if not exists pct_tapa numeric not null default 0;
update public.proveedores set pct_tapa = 68 where nombre ilike 'distribuidora principal' and pct_tapa = 0;
