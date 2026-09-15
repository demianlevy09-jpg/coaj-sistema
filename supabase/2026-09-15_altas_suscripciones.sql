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
