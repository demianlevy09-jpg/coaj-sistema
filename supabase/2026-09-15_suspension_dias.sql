-- v51 (15/09/2026): una Suspensión / Reanudación / Baja con `dias` cargados solo afecta a esos días de la semana.
-- Ej.: suspender LA NACION solo los miércoles no toca la suscripción de sábado y domingo.
-- Las novedades sin `dias` (null o vacío) siguen aplicando a todos los días, como hasta ahora.
-- Espejo de la función suspendida() de index.html (v51). Idempotente.
create or replace function public.suspendida(p_cli integer, p_pub text, p_fecha date) returns boolean language sql stable as $$
  select coalesce((
    select n.tipo in ('Suspensión','Baja') and (n.hasta is null or n.hasta >= p_fecha)
    from public.novedades n
    where not n.anulado and n.cliente_id = p_cli and n.desde <= p_fecha
      and n.tipo in ('Suspensión','Baja','Reanudación','Alta')
      and (n.publicacion = '' or upper(p_pub) like '%'||upper(n.publicacion)||'%' or upper(n.publicacion) like '%'||upper(p_pub)||'%')
      and (n.dias is null or cardinality(n.dias) = 0 or ((extract(isodow from p_fecha))::int - 1) = any(n.dias))
    order by n.desde desc, n.id desc limit 1
  ), false);
$$;
