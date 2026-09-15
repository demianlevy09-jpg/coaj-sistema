-- v55 (15/09/2026): feriados "con diario": feriados.sin_pubs = publicaciones que NO salen ese día.
-- null / vacío = feriado sin diario (no sale nada, como hasta ahora). Espejo de feriadoSale() en index.html. Idempotente.
alter table public.feriados add column if not exists sin_pubs text[];

create or replace function public.devengo(p_cli integer, p_via char, p_desde date, p_hasta date) returns numeric language sql stable as $$
  select coalesce(sum(public.precio_en(s.publicacion, d.dia) * abs(s.cantidad)), 0)
  from public.suscripciones s
  cross join lateral generate_series(greatest(p_desde, coalesce(s.desde, p_desde)), least(p_hasta, coalesce(s.hasta - 1, p_hasta)), interval '1 day') as g(dia)
  cross join lateral (select g.dia::date as dia) d
  where not s.anulado and s.cliente_id = p_cli and s.via = p_via
    and (s.hasta is null or s.hasta > d.dia)
    and cardinality(s.dias) > 0 and (((extract(isodow from d.dia))::int - 1) = any(s.dias))
    and not exists (
      select 1 from public.feriados f
      where f.fecha = d.dia and not f.anulado
        and (f.sin_pubs is null or cardinality(f.sin_pubs) = 0
             or exists (select 1 from unnest(f.sin_pubs) p where upper(p) = upper(s.publicacion)))
    )
    and not public.suspendida(p_cli, s.publicacion, d.dia)
    and public.precio_en(s.publicacion, d.dia) is not null;
$$;
select 'ok' as resultado;
