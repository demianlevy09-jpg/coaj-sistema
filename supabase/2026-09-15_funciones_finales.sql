-- 15/09/2026: versión final de suspendida() y devengo() (después de v51/v55/v57/v60/v65). Idempotente. Correr al final de todo.
drop function if exists public.suspendida(integer, text, date);
create or replace function public.suspendida(p_cli integer, p_pub text, p_fecha date, p_desde_alta date default null) returns boolean language sql stable as $$
  select coalesce((
    select n.tipo in ('Suspensión','Baja') and (n.hasta is null or n.hasta >= p_fecha)
    from public.novedades n
    where not n.anulado and n.cliente_id = p_cli and n.desde <= p_fecha
      and n.tipo in ('Suspensión','Baja','Reanudación')
      and (p_desde_alta is null or n.desde >= p_desde_alta)
      and (n.publicacion = '' or upper(p_pub) like '%'||upper(n.publicacion)||'%' or upper(n.publicacion) like '%'||upper(p_pub)||'%')
      and (n.dias is null or cardinality(n.dias) = 0 or ((extract(isodow from p_fecha))::int - 1) = any(n.dias))
    order by n.desde desc, n.id desc limit 1
  ), false);
$$;
create or replace function public.devengo(p_cli integer, p_via char, p_desde date, p_hasta date) returns numeric language sql stable as $$
  select coalesce(sum(public.precio_en(s.publicacion, d.dia) * abs(s.cantidad)), 0)
  from public.suscripciones s
  cross join lateral generate_series(greatest(p_desde, coalesce(s.desde, p_desde)), least(p_hasta, coalesce(s.hasta - 1, p_hasta)), interval '1 day') as g(dia)
  cross join lateral (select g.dia::date as dia) d
  where not s.anulado and s.cliente_id = p_cli and s.via = p_via
    and (s.hasta is null or s.hasta > d.dia)
    and cardinality(s.dias) > 0
    and ( (((extract(isodow from d.dia))::int - 1) = any(s.dias))
          or (7 = any(s.dias) and exists (select 1 from public.feriados f where f.fecha = d.dia and not f.anulado and f.sin_pubs is not null)) )
    and not exists (
      select 1 from public.feriados f
      where f.fecha = d.dia and not f.anulado
        and (f.sin_pubs is null
             or exists (select 1 from unnest(f.sin_pubs) p where upper(p) = upper(s.publicacion)))
    )
    and not public.suspendida(p_cli, s.publicacion, d.dia, case when s.origen='app' then s.desde end)
    and public.precio_en(s.publicacion, d.dia) is not null;
$$;
revoke execute on all functions in schema public from anon;
