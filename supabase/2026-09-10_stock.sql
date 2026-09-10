-- 2026-09-10: STOCK / VENTAS / COMPRAS / PROVEEDORES + varios distribuidores (v47). Idempotente.

-- distribuidores: comisión propia y publicaciones asignadas
alter table public.distribuidores add column if not exists comision numeric(6,2) not null default 32;
create table if not exists public.publicaciones_dist (
  publicacion text primary key,
  distribuidor_id integer not null references public.distribuidores(id),
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);

-- proveedores de mercadería (aparte de los distribuidores de diarios)
create table if not exists public.proveedores (
  id serial primary key,
  nombre text not null,
  telefono text default '',
  nota text default '',
  activo boolean not null default true,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
-- productos del puesto (lo que no es diario/revista del reparto)
create table if not exists public.productos (
  id serial primary key,
  nombre text not null,
  categoria text default '',
  proveedor_id integer references public.proveedores(id),   -- proveedor habitual (opcional)
  modo_precio text not null default 'fijo' check (modo_precio in ('fijo','margen')),
  precio_venta numeric(14,2) not null default 0,             -- si modo_precio = fijo
  margen numeric(6,2) not null default 0,                    -- % sobre el costo si modo_precio = margen
  costo numeric(14,2) not null default 0,                    -- último costo conocido
  activo boolean not null default true,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
-- movimientos de stock: cantidad positiva entra, negativa sale
create table if not exists public.stock_mov (
  id bigserial primary key,
  producto_id integer not null references public.productos(id),
  fecha date not null,
  tipo text not null check (tipo in ('compra','recepcion','venta','devolucion','ajuste')),
  cantidad integer not null,
  propiedad text not null default 'propio' check (propiedad in ('propio','consignacion')),
  proveedor_id integer references public.proveedores(id),
  costo_unit numeric(14,2) not null default 0,
  precio_unit numeric(14,2) not null default 0,
  medio text default '',
  cliente_id integer references public.clientes(id),   -- venta anotada en la CC de un cliente
  caja_id bigint, prov_mov_id bigint, mov_id bigint,    -- filas enlazadas (caja / CC proveedor / CC cliente)
  nota text default '',
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
-- cuenta corriente con cada proveedor: positivo = le debemos más
create table if not exists public.prov_movimientos (
  id bigserial primary key,
  proveedor_id integer not null references public.proveedores(id),
  fecha date not null,
  tipo text not null check (tipo in ('compra','consignacion','pago','credito','ajuste')),
  importe numeric(14,2) not null,
  detalle text default '',
  caja_id bigint,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);

do $$ declare t text; begin
  foreach t in array array['publicaciones_dist','proveedores','productos','stock_mov','prov_movimientos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists tr_audit on public.%I', t);
    execute format('create trigger tr_audit before insert or update on public.%I for each row execute function public.audit_fila()', t);
    execute format('drop trigger if exists tr_log on public.%I', t);
    execute format('create trigger tr_log after insert or update or delete on public.%I for each row execute function public.log_fila()', t);
    execute format('drop policy if exists p_select on public.%I', t);
    execute format('create policy p_select on public.%I for select to authenticated using (public.es_operador())', t);
    execute format('drop policy if exists p_insert on public.%I', t);
    execute format('create policy p_insert on public.%I for insert to authenticated with check (public.es_operador())', t);
    execute format('drop policy if exists p_update on public.%I', t);
    execute format('create policy p_update on public.%I for update to authenticated using (public.es_operador()) with check (public.es_operador())', t);
    execute format('drop policy if exists p_delete on public.%I', t);
    execute format('create policy p_delete on public.%I for delete to authenticated using (public.es_admin())', t);
  end loop;
end $$;

-- el distribuidor 1 (principal) toma la comisión que había en config
update public.distribuidores d set comision = coalesce((select (valor)::numeric from public.config where clave='comision'), 32) where d.id = 1;
select id, nombre, comision from public.distribuidores;
