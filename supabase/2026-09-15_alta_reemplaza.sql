-- v67 (15/09/2026): UNA ALTA REEMPLAZA A LA SUSCRIPCIÓN VIEJA.
-- Antes: cambiar una suscripción de "vía distribuidora" (S) a "le cobrás vos" (C) se hacía con Suspender (sin hasta) + Alta,
-- y la vieja quedaba "vigente" para siempre (aunque no devengara). Ahora cada novedad "Alta" cierra automáticamente
-- toda suscripción del mismo cliente y la misma publicación con días en común, poniéndole hasta = desde de la alta
-- (hasta es exclusivo: la vieja devenga hasta el día anterior). Se anota cerrada_por = id de la novedad; si la alta
-- se anula, la vieja se reabre. Idempotente.
alter table public.suscripciones add column if not exists cerrada_por bigint;
create index if not exists ix_susc_cerrada_por on public.suscripciones(cerrada_por);

create or replace function public.sync_alta_suscripcion() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo <> 'Alta' or new.dias is null or cardinality(new.dias) = 0 then return new; end if;
  if new.anulado then
    update public.suscripciones set anulado=true, anulado_en=now() where novedad_id=new.id and not anulado;
    -- la alta se anula: las que había reemplazado vuelven a estar vigentes
    update public.suscripciones set hasta=null, cerrada_por=null where cerrada_por=new.id and not anulado;
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
  -- si la alta se editó (cambió el desde), las que cerró la siguen
  update public.suscripciones set hasta=new.desde where cerrada_por=new.id and not anulado and hasta is distinct from new.desde;
  -- cierra las superpuestas: mismo cliente, misma publicación, días en común (o sin día determinado), vigentes al desde de la alta
  update public.suscripciones s set hasta=new.desde, cerrada_por=new.id
    where s.cliente_id=new.cliente_id and not s.anulado
      and (s.novedad_id is null or s.novedad_id<>new.id)
      and upper(trim(s.publicacion))=upper(trim(new.publicacion))
      and (s.hasta is null or s.hasta>new.desde)
      and (s.dias is null or cardinality(s.dias)=0 or s.dias && new.dias);
  return new;
end $$;
drop trigger if exists trg_sync_alta on public.novedades;
create trigger trg_sync_alta after insert or update on public.novedades for each row execute function public.sync_alta_suscripcion();

-- Aplicar a las altas ya cargadas (por si quedó alguna vieja abierta): misma regla, una sola vez.
update public.suscripciones s set hasta=n.desde, cerrada_por=n.id
  from public.novedades n
  where n.tipo='Alta' and not n.anulado and n.dias is not null and cardinality(n.dias)>0
    and s.cliente_id=n.cliente_id and not s.anulado
    and (s.novedad_id is null or s.novedad_id<>n.id)
    and upper(trim(s.publicacion))=upper(trim(n.publicacion))
    and (s.hasta is null or s.hasta>n.desde)
    and (s.dias is null or cardinality(s.dias)=0 or s.dias && n.dias);

-- Verificación: pares de suscripciones vigentes superpuestas (debe dar 0 filas)
select a.cliente_id, a.publicacion, a.id as id_a, a.via as via_a, b.id as id_b, b.via as via_b
from public.suscripciones a join public.suscripciones b
  on b.cliente_id=a.cliente_id and b.id>a.id and upper(trim(b.publicacion))=upper(trim(a.publicacion))
 and (a.dias is null or b.dias is null or a.dias && b.dias)
where not a.anulado and not b.anulado and (a.hasta is null or a.hasta>current_date) and (b.hasta is null or b.hasta>current_date)
  and a.cliente_id in (select id from public.clientes where activo);
