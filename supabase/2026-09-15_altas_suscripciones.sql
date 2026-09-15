-- v65 (15/09/2026): UNA SOLA FUENTE DE VERDAD PARA LAS SUSCRIPCIONES.
-- Cada novedad "Alta" (con días) genera/actualiza una fila en suscripciones (origen='app', novedad_id = id de la novedad).
-- Si la novedad se anula, la suscripción también. Así devengo() en SQL y la app ven lo mismo. Idempotente.
alter table public.suscripciones add column if not exists novedad_id bigint;
create index if not exists ix_susc_novedad on public.suscripciones(novedad_id);

create or replace function public.dias_texto_de(d smallint[]) returns text language sql immutable as $$
  select coalesce(array_to_string(array(select (array['Lu','Ma','Mi','Ju','Vi','Sa','Do','Fer'])[x+1] from unnest(d) x order by x), ' '), '');
$$;

create or replace function public.sync_alta_suscripcion() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo <> 'Alta' or new.dias is null or cardinality(new.dias) = 0 then return new; end if;
  if new.anulado then
    update public.suscripciones set anulado=true, anulado_en=now() where novedad_id=new.id and not anulado;
    return new;
  end if;
  if exists (select 1 from public.suscripciones where novedad_id=new.id) then
    update public.suscripciones set cliente_id=new.cliente_id, publicacion=new.publicacion, dias=new.dias, dias_texto=public.dias_texto_de(new.dias),
      via=coalesce(new.via,'C'), cantidad=coalesce(new.cantidad,1), desde=new.desde, hasta=null, anulado=false, anulado_en=null
      where novedad_id=new.id;
  else
    insert into public.suscripciones (cliente_id, publicacion, dias, dias_texto, via, cantidad, desde, hasta, origen, novedad_id)
      values (new.cliente_id, new.publicacion, new.dias, public.dias_texto_de(new.dias), coalesce(new.via,'C'), coalesce(new.cantidad,1), new.desde, null, 'app', new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_sync_alta on public.novedades;
create trigger trg_sync_alta after insert or update on public.novedades for each row execute function public.sync_alta_suscripcion();

-- migración de las altas ya cargadas
insert into public.suscripciones (cliente_id, publicacion, dias, dias_texto, via, cantidad, desde, hasta, origen, novedad_id)
select n.cliente_id, n.publicacion, n.dias, public.dias_texto_de(n.dias), coalesce(n.via,'C'), coalesce(n.cantidad,1), n.desde, null, 'app', n.id
from public.novedades n where n.tipo='Alta' and not n.anulado and n.dias is not null and cardinality(n.dias)>0
  and not exists (select 1 from public.suscripciones s where s.novedad_id=n.id);
select count(*) as altas_sincronizadas from public.suscripciones where origen='app' and novedad_id is not null and not anulado;

-- suspendida() con 4º parámetro: para suscripciones origen='app' se ignoran las suspensiones/bajas anteriores a su alta (espejo de altaDe() en JS)
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
-- devengo(): idem 2026-09-15_feriados_parciales.sql pero llamando suspendida(..., case when s.origen='app' then s.desde end)
