-- v99 (05/11/2026): integración con la API de Urban Soft (mercadería de Urban Point).
-- Idempotente. Correr en el SQL Editor del proyecto Cohaj.
--
-- 1. SKU en productos (hasta ahora vivía solo en la nota de la recepción).
alter table public.productos add column if not exists sku text;
create index if not exists productos_sku_idx on public.productos (lower(sku));
update public.productos p set sku = s.sku
from (
  select distinct on (producto_id) producto_id, (regexp_match(nota, 'SKU\s*([^\s·]+)'))[1] as sku
  from public.stock_mov where nota ~ 'SKU\s' and tipo in ('recepcion','compra') order by producto_id, id
) s
where s.producto_id = p.id and p.sku is null;

-- 2. Espejo de lo que Urban Soft dice que mandó al kiosko. Lo escribe la Edge Function "urbansoft" (service role);
--    la app solo lee y marca cada línea como recibida / rechazada.
create table if not exists public.urbansoft_lineas (
  id text primary key,                        -- 'S<salida>:<producto>' o 'P<pedido>:<producto>'
  tipo text not null check (tipo in ('consignacion','pedido')),
  doc_id text not null,                       -- salida_id o pedido_id en Urban Soft
  producto_us text not null,                  -- id del producto en Urban Soft
  sku text, nombre text, categoria text, foto text,
  fecha date, vence date,
  cantidad integer not null default 0,        -- lo que Urban Soft dice que mandó (vigente)
  estado_us text,                             -- vigente / en_liquidacion / cerrada · pendiente / debitado / anulado
  costo numeric(12,2), pvp numeric(12,2),
  estado text not null default 'pendiente' check (estado in ('pendiente','recibida','rechazada')),
  cantidad_recibida integer, stock_mov_id bigint, recibido_en timestamptz, recibido_por uuid, nota text default '',
  visto_en timestamptz not null default now(),
  creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(),
  anulado boolean not null default false
);
create index if not exists urbansoft_lineas_estado_idx on public.urbansoft_lineas (estado, tipo, doc_id);

create table if not exists public.urbansoft_sync (
  id bigserial primary key,
  en timestamptz not null default now(),
  ok boolean not null,
  detalle text default '',
  lineas integer default 0, nuevas integer default 0, pendientes integer default 0,
  anulado boolean not null default false
);

alter table public.urbansoft_lineas enable row level security;
alter table public.urbansoft_sync enable row level security;
drop policy if exists p_select on public.urbansoft_lineas;
create policy p_select on public.urbansoft_lineas for select to authenticated using (public.es_operador());
drop policy if exists p_update on public.urbansoft_lineas;
create policy p_update on public.urbansoft_lineas for update to authenticated
  using (public.tiene_permiso('compras') or public.tiene_permiso('stock')) with check (public.tiene_permiso('compras') or public.tiene_permiso('stock'));
drop policy if exists p_select on public.urbansoft_sync;
create policy p_select on public.urbansoft_sync for select to authenticated using (public.es_operador());
grant select, update on public.urbansoft_lineas to authenticated;
grant select on public.urbansoft_sync to authenticated;

-- 3. Configuración: vendedor del kiosko en Urban Soft y proveedor de cohaj que corresponde.
insert into public.config (clave, valor) values ('urbansoft_vendedor', '"169"') on conflict (clave) do nothing;
insert into public.config (clave, valor)
  select 'urbansoft_proveedor', to_jsonb(id) from public.proveedores where nombre = 'Urban Point' and anulado = false order by id limit 1
  on conflict (clave) do nothing;
