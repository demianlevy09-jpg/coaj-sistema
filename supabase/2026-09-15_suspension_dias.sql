-- v51/v60 (15/09/2026): una Suspensión / Reanudación / Baja con `dias` cargados solo afecta a esos días de la semana.
-- v60: un Alta ya no "reactiva" una suscripción suspendida (solo Reanudación). Espejo de suspendida() de index.html. Idempotente.
create or replace function public.suspendida(p_cli integer, p_pub text, p_fecha date) returns boolean language sql stable as $$
  select coalesce((
    select n.tipo in ('Suspensión','Baja') and (n.hasta is null or n.hasta >= p_fecha)
    from public.novedades n
    where not n.anulado and n.cliente_id = p_cli and n.desde <= p_fecha
      and n.tipo in ('Suspensión','Baja','Reanudación')
      and (n.publicacion = '' or upper(p_pub) like '%'||upper(n.publicacion)||'%' or upper(n.publicacion) like '%'||upper(p_pub)||'%')
      and (n.dias is null or cardinality(n.dias) = 0 or ((extract(isodow from p_fecha))::int - 1) = any(n.dias))
    order by n.desde desc, n.id desc limit 1
  ), false);
$$;
select (pg_get_functiondef('public.suspendida'::regproc) not like '%''Alta''%') as sin_alta;
