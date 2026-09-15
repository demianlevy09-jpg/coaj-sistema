-- v55–v57 (15/09/2026). Espejo de feriadoSale()/tocaDia() de index.html. Idempotente.
-- feriados.sin_pubs: NULL = feriado sin diario (no sale nada); '{}' = con diario, salen todos; '{A,B}' = con diario, A y B no salen.
-- suscripciones.dias: el código 7 = "Fer": la suscripción se entrega SOLO los feriados con diario (además de los días normales que tenga).
alter table public.feriados add column if not exists sin_pubs text[];

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
    and not public.suspendida(p_cli, s.publicacion, d.dia)
    and public.precio_en(s.publicacion, d.dia) is not null;
$$;
select (pg_get_functiondef('public.devengo'::regproc) like '%7 = any(s.dias)%') as devengo_ok;
