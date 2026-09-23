-- 23/09/2026 (v83): mismas reglas que la app en la base. Idempotente. Correr entero en el SQL Editor de Supabase.
-- Verificado antes de publicar: con los datos actuales no cambia ningún saldo (la app ya calcula así desde v83).

-- 1) suspendida(): suspendida si hay una Suspensión/Baja que cubre ese día y ninguna Reanudación posterior la levantó.
--    Antes mandaba solo la última novedad: una suspensión terminada "tapaba" otra abierta anterior o una baja de cliente.
--    Publicación exacta (antes LIKE en los dos sentidos: 'CLARIN' agarraba 'MUESTRA CLARIN').
--    Reanudación sin publicación levanta todo menos la baja de una suscripción puntual; con publicación, solo esa publicación.
create or replace function public.suspendida(p_cli integer, p_pub text, p_fecha date, p_desde_alta date default null) returns boolean language sql stable as $$
  with nv as (
    select n.id, n.tipo, coalesce(n.publicacion,'') as pub, n.desde, n.hasta
    from public.novedades n
    where not n.anulado and n.cliente_id = p_cli and n.desde is not null and n.desde <= p_fecha
      and n.tipo in ('Suspensión','Baja','Reanudación')
      and (p_desde_alta is null or n.desde >= p_desde_alta)
      and (coalesce(n.publicacion,'') = '' or upper(trim(n.publicacion)) = upper(trim(p_pub)))
      and (n.dias is null or cardinality(n.dias) = 0 or ((extract(isodow from p_fecha))::int - 1) = any(n.dias))
  )
  select exists (
    select 1 from nv s
    where s.tipo in ('Suspensión','Baja') and (s.hasta is null or s.hasta >= p_fecha)
      and not exists (
        select 1 from nv r
        where r.tipo = 'Reanudación' and (r.desde > s.desde or (r.desde = s.desde and r.id > s.id))
          and (case when r.pub = '' then not (s.tipo = 'Baja' and s.pub <> '')
                    else s.pub <> '' and upper(trim(r.pub)) = upper(trim(s.pub)) end)
      )
  );
$$;

-- 2) precio_en(): el precio con fecha "desde" más reciente entre el del día de la semana y el "Todos / único";
--    si empatan gana el del día; si hay dos iguales, el último cargado (antes el del día ganaba aunque fuera más viejo).
create or replace function public.precio_en(p_pub text, p_fecha date) returns numeric language sql stable as $$
  with del_dia as (
    select p.precio, p.desde from public.precios p
    where not p.anulado and upper(p.publicacion) = upper(p_pub) and p.desde <= p_fecha and p.dia = ((extract(isodow from p_fecha))::int - 1)
    order by p.desde desc, p.id desc limit 1
  ), unico as (
    select p.precio, p.desde from public.precios p
    where not p.anulado and upper(p.publicacion) = upper(p_pub) and p.desde <= p_fecha and p.dia is null
    order by p.desde desc, p.id desc limit 1
  ), c as (
    select precio, desde, 1 as pri from del_dia where precio > 0
    union all select precio, desde, 0 from unico where precio > 0
  )
  select precio from c order by desde desc, pri desc limit 1;
$$;

-- 3) Un solo resumen por cliente y mes (doble toque en "Imprimir" creaba dos números).
create unique index if not exists resumenes_cliente_periodo_uq on public.resumenes (cliente_id, periodo) where not anulado;

-- 4) Novedades sin fecha "desde" no se pueden guardar (la app ya lo valida).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'novedades_desde_ok') then
    alter table public.novedades add constraint novedades_desde_ok check (anulado or tipo = 'Cambio de precio' or desde is not null) not valid;
  end if;
end $$;

revoke execute on all functions in schema public from anon;
-- Chequeo: debe devolver 0 filas (clientes activos donde app y base difieren se ven con Usuarios → Verificar cálculos en la app).
select 'ok' as listo;
