-- COHAJ Sistema — esquema relacional (v33, 09/09/2026)
-- Reemplaza la tabla kv (documentos JSON) por tablas de verdad, con auditoría, roles y borrado lógico.
-- Idempotente: se puede correr más de una vez.

create extension if not exists pgcrypto;

-- ---------- 0. Perfiles y roles ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  nombre text,
  rol text not null default 'operador' check (rol in ('admin','operador')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create or replace function public.crear_perfil() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre, rol)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
          case when lower(new.email) = 'demianlevy09@gmail.com' then 'admin' else 'operador' end)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
drop trigger if exists tr_crear_perfil on auth.users;
create trigger tr_crear_perfil after insert on auth.users for each row execute function public.crear_perfil();
-- perfiles para usuarios que ya existían
insert into public.perfiles (id, email, nombre, rol)
select u.id, u.email, split_part(u.email,'@',1), case when lower(u.email)='demianlevy09@gmail.com' then 'admin' else 'operador' end
from auth.users u on conflict (id) do nothing;

create or replace function public.es_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' and activo from public.perfiles where id = auth.uid()), false);
$$;
create or replace function public.es_operador() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select activo from public.perfiles where id = auth.uid()), false);
$$;

-- ---------- 1. Auditoría común ----------
create or replace function public.audit_fila() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.creado_en := coalesce(new.creado_en, now());
    new.creado_por := coalesce(new.creado_por, auth.uid());
  end if;
  new.modificado_en := now();
  new.modificado_por := auth.uid();
  if tg_op = 'UPDATE' and new.anulado and not old.anulado then
    new.anulado_en := now(); new.anulado_por := auth.uid();
  end if;
  return new;
end $$;

-- macro manual: columnas de auditoría que llevan todas las tablas de negocio
-- creado_en, creado_por, modificado_en, modificado_por, anulado, anulado_en, anulado_por, origen

-- ---------- 2. Tablas ----------
create table if not exists public.distribuidores (
  id serial primary key,
  nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);

create table if not exists public.clientes (
  id integer primary key,                      -- Nº de cliente (heredado de NewsPaper; los nuevos siguen la secuencia)
  domicilio text not null,
  nombre text default '',
  telefono text default '',
  observaciones text default '',
  particularidad text default '',               -- instrucción de entrega ("bajo puerta", "arrojar porch"...)
  activo boolean not null default true,
  ficha text default 'actual',                  -- 'actual' | 'recuperado' (origen de la ficha en NewsPaper)
  saldo_inicial numeric(14,2) not null default 0, -- saldo NewsPaper al cierre inicial (positivo = debe)
  saldo_inicial_fecha date not null default '2026-08-31',
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create sequence if not exists public.clientes_id_seq;
select setval('public.clientes_id_seq', greatest((select coalesce(max(id),0) from public.clientes), 2000));
alter table public.clientes alter column id set default nextval('public.clientes_id_seq');

create table if not exists public.suscripciones (
  id bigserial primary key,
  cliente_id integer not null references public.clientes(id),
  publicacion text not null,
  dias_texto text default '',                   -- etiqueta original ("Sábado y domingo", "Sin día determinado")
  dias smallint[] not null default '{}',        -- 0=lunes … 6=domingo; vacío = sin día determinado
  via char(1) not null default 'C' check (via in ('C','S')), -- C = le cobra COHAJ, S = vía distribuidora
  cantidad integer not null default 1,
  desde date,
  hasta date,                                   -- null = vigente
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create index if not exists ix_susc_cliente on public.suscripciones(cliente_id);

create table if not exists public.movimientos (                -- cuenta corriente de clientes
  id bigserial primary key,
  cliente_id integer not null references public.clientes(id),
  fecha date not null,
  tipo text not null check (tipo in ('Cobro','Liquidación','Ajuste')),
  importe numeric(14,2) not null,               -- Cobro y Liquidación: positivo (el tipo da el efecto); Ajuste: con signo (+ sube la deuda, − la baja)
  constraint ck_mov_importe check (tipo = 'Ajuste' or importe >= 0),
  medio text default '',
  nota text default '',
  fijo boolean not null default false,          -- filas del sistema (ajustes iniciales), no se anulan desde la app
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create index if not exists ix_mov_cliente on public.movimientos(cliente_id, fecha);

create table if not exists public.caja (
  id bigserial primary key,
  fecha date not null,
  hora time,
  concepto text not null,
  detalle text default '',
  ingreso numeric(14,2) not null default 0,
  egreso numeric(14,2) not null default 0,
  medio text default 'Efectivo',
  movimiento_id bigint references public.movimientos(id), -- si vino de un cobro a cliente
  fijo boolean not null default false,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create index if not exists ix_caja_fecha on public.caja(fecha);

create table if not exists public.precios (
  id bigserial primary key,
  publicacion text not null,
  dia smallint,                                 -- 0..6, null = todos los días
  desde date not null,
  precio numeric(14,2) not null,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create index if not exists ix_precios_pub on public.precios(publicacion, dia, desde);

create table if not exists public.novedades (
  id bigserial primary key,
  cliente_id integer references public.clientes(id),
  tipo text not null check (tipo in ('Alta','Baja','Suspensión','Reanudación','Cambio de precio','Cambio de modalidad')),
  publicacion text default '',
  desde date,
  hasta date,
  dias smallint[],
  via char(1),
  cantidad integer,
  nota text default '',
  aplicada boolean not null default true,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create index if not exists ix_nov_cliente on public.novedades(cliente_id, desde);

create table if not exists public.feriados (
  fecha date primary key,
  motivo text default '',
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);

create table if not exists public.dist_movimientos (             -- cuenta corriente con cada distribuidora
  id bigserial primary key,
  distribuidor_id integer not null references public.distribuidores(id),
  fecha date not null,
  detalle text default '',
  importe numeric(14,2) not null,               -- positivo = le debemos más (liquidación); negativo = pago o crédito
  historico boolean not null default false,     -- filas de NewsPaper 2024–2026: solo consulta, no suman al saldo
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);

create table if not exists public.devoluciones (
  id bigserial primary key,
  distribuidor_id integer not null references public.distribuidores(id),
  fecha date not null,
  publicacion text not null,
  cantidad integer not null,
  nota text default '',
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);

create table if not exists public.config (
  clave text primary key,
  valor jsonb not null,
  modificado_en timestamptz default now(), modificado_por uuid
);

create table if not exists public.cierres (                      -- foto del saldo de cada cliente al fin de mes
  periodo date not null,                        -- último día del mes
  cliente_id integer not null references public.clientes(id),
  saldo numeric(14,2) not null,
  devengado numeric(14,2) not null default 0,
  cobrado numeric(14,2) not null default 0,
  creado_en timestamptz default now(),
  primary key (periodo, cliente_id)
);

create table if not exists public.log_cambios (                  -- historial de cambios (quién, qué, cuándo)
  id bigserial primary key,
  tabla text not null, fila_id text not null, operacion text not null,
  antes jsonb, despues jsonb,
  usuario uuid default auth.uid(), fecha timestamptz default now()
);
create or replace function public.log_fila() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.log_cambios(tabla, fila_id, operacion, antes, despues)
  values (tg_table_name,
          coalesce((case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', (case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'fecha', '?'),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

-- triggers de auditoría y log en todas las tablas de negocio
do $$
declare t text;
begin
  foreach t in array array['distribuidores','clientes','suscripciones','movimientos','caja','precios','novedades','feriados','dist_movimientos','devoluciones'] loop
    execute format('drop trigger if exists tr_audit on public.%I', t);
    execute format('create trigger tr_audit before insert or update on public.%I for each row execute function public.audit_fila()', t);
    execute format('drop trigger if exists tr_log on public.%I', t);
    execute format('create trigger tr_log after insert or update or delete on public.%I for each row execute function public.log_fila()', t);
  end loop;
end $$;

-- ---------- 3. RLS ----------
do $$
declare t text;
begin
  foreach t in array array['perfiles','distribuidores','clientes','suscripciones','movimientos','caja','precios','novedades','feriados','dist_movimientos','devoluciones','config','cierres','log_cambios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists p_select on public.%I', t);
    execute format('create policy p_select on public.%I for select to authenticated using (public.es_operador())', t);
  end loop;
  -- operador y admin: insertar y modificar (borrado lógico) en tablas operativas; nadie borra físico salvo admin
  foreach t in array array['distribuidores','clientes','suscripciones','movimientos','caja','precios','novedades','feriados','dist_movimientos','devoluciones'] loop
    execute format('drop policy if exists p_insert on public.%I', t);
    execute format('create policy p_insert on public.%I for insert to authenticated with check (public.es_operador())', t);
    execute format('drop policy if exists p_update on public.%I', t);
    execute format('create policy p_update on public.%I for update to authenticated using (public.es_operador()) with check (public.es_operador())', t);
    execute format('drop policy if exists p_delete on public.%I', t);
    execute format('create policy p_delete on public.%I for delete to authenticated using (public.es_admin())', t);
  end loop;
end $$;
-- config y cierres: solo admin escribe; perfiles: solo admin
drop policy if exists p_config_w on public.config;
create policy p_config_w on public.config for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists p_cierres_w on public.cierres;
create policy p_cierres_w on public.cierres for all to authenticated using (public.es_admin()) with check (public.es_admin());
drop policy if exists p_perfiles_w on public.perfiles;
create policy p_perfiles_w on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ---------- 4. Cálculos en la base ----------
-- Fecha de hoy en Argentina (el servidor está en UTC)
create or replace function public.hoy_ar() returns date language sql stable as $$ select (now() at time zone 'America/Argentina/Buenos_Aires')::date; $$;
-- Precio de tapa vigente de una publicación en una fecha (busca precio por día de semana, si no por "todos los días")
create or replace function public.precio_en(p_pub text, p_fecha date) returns numeric language sql stable as $$
  with d as (select ((extract(isodow from p_fecha))::int - 1) as wd)
  select coalesce(
    (select precio from public.precios p, d where not p.anulado and upper(p.publicacion)=upper(p_pub) and p.dia = d.wd and p.desde <= p_fecha order by p.desde desc limit 1),
    (select precio from public.precios p where not p.anulado and upper(p.publicacion)=upper(p_pub) and p.dia is null and p.desde <= p_fecha order by p.desde desc limit 1)
  );
$$;

-- ¿Está suspendida esta publicación de este cliente ese día? (última novedad aplicable manda)
create or replace function public.suspendida(p_cli integer, p_pub text, p_fecha date) returns boolean language sql stable as $$
  select coalesce((
    select n.tipo in ('Suspensión','Baja') and (n.hasta is null or n.hasta >= p_fecha)
    from public.novedades n
    where not n.anulado and n.cliente_id = p_cli and n.desde <= p_fecha
      and n.tipo in ('Suspensión','Baja','Reanudación','Alta')
      and (n.publicacion = '' or upper(p_pub) like '%'||upper(n.publicacion)||'%' or upper(n.publicacion) like '%'||upper(p_pub)||'%')
    order by n.desde desc, n.id desc limit 1
  ), false);
$$;

-- Devengo de un cliente entre dos fechas para una modalidad (C: a su CC; S: vía distribuidora)
create or replace function public.devengo(p_cli integer, p_via char, p_desde date, p_hasta date) returns numeric language sql stable as $$
  select coalesce(sum(public.precio_en(s.publicacion, d.dia) * abs(s.cantidad)), 0)
  from public.suscripciones s
  cross join lateral generate_series(greatest(p_desde, coalesce(s.desde, p_desde)), least(p_hasta, coalesce(s.hasta - 1, p_hasta)), interval '1 day') as g(dia)
  cross join lateral (select g.dia::date as dia) d
  where not s.anulado and s.cliente_id = p_cli and s.via = p_via
    and (s.hasta is null or s.hasta > d.dia)   -- hasta = fecha de suspensión (exclusiva), como en NewsPaper
    and cardinality(s.dias) > 0 and (((extract(isodow from d.dia))::int - 1) = any(s.dias))
    and not exists (select 1 from public.feriados f where f.fecha = d.dia and not f.anulado)
    and not public.suspendida(p_cli, s.publicacion, d.dia)
    and public.precio_en(s.publicacion, d.dia) is not null;
$$;

-- Saldo de un cliente a una fecha = saldo inicial (NewsPaper, ya incluye sus propios movimientos)
--   + devengo C desde el día siguiente al saldo inicial + movimientos cargados en este sistema (origen <> 'newspaper')
create or replace function public.saldo_cliente(p_cli integer, p_hasta date default (now() at time zone 'America/Argentina/Buenos_Aires')::date) returns numeric language sql stable as $$
  select c.saldo_inicial
       + public.devengo(c.id, 'C', c.saldo_inicial_fecha + 1, p_hasta)
       + coalesce((select sum(case when m.tipo='Cobro' then -m.importe else m.importe end) from public.movimientos m
                   where m.cliente_id = c.id and not m.anulado and m.origen <> 'newspaper' and m.fecha <= p_hasta), 0)
  from public.clientes c where c.id = p_cli;
$$;

-- Vista de saldos a hoy (para listados y reportes)
create or replace view public.v_saldos as
  select c.id, c.domicilio, c.nombre, c.activo,
         public.saldo_cliente(c.id, public.hoy_ar()) as saldo_hoy,
         public.saldo_cliente(c.id, (date_trunc('month', public.hoy_ar()) - interval '1 day')::date) as saldo_cierre,
         public.devengo(c.id, 'S', c.saldo_inicial_fecha + 1, public.hoy_ar()) as tapa_via_distribuidora
  from public.clientes c where not c.anulado;

-- Cerrar un mes: guarda la foto de saldos (solo admin)
create or replace function public.cerrar_mes(p_periodo date) returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede cerrar el mes'; end if;
  insert into public.cierres(periodo, cliente_id, saldo, devengado, cobrado)
  select p_periodo, c.id, public.saldo_cliente(c.id, p_periodo),
         public.devengo(c.id,'C', date_trunc('month', p_periodo)::date, p_periodo),
         coalesce((select sum(importe) from public.movimientos m where m.cliente_id=c.id and m.tipo='Cobro' and not m.anulado and m.fecha between date_trunc('month', p_periodo)::date and p_periodo),0)
  from public.clientes c where not c.anulado
  on conflict (periodo, cliente_id) do update set saldo=excluded.saldo, devengado=excluded.devengado, cobrado=excluded.cobrado, creado_en=now();
  get diagnostics n = row_count; return n;
end $$;

-- Exportar todo (backup) en un solo JSON
create or replace function public.exportar_todo() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exportado_en', now(),
    'clientes', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.clientes t),
    'suscripciones', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.suscripciones t),
    'movimientos', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.movimientos t),
    'caja', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.caja t),
    'precios', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.precios t),
    'novedades', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.novedades t),
    'feriados', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.feriados t),
    'distribuidores', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.distribuidores t),
    'dist_movimientos', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.dist_movimientos t),
    'devoluciones', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.devoluciones t),
    'config', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.config t),
    'cierres', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.cierres t)
  );
$$;
