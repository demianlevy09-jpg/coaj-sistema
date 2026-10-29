-- v97 (29/10/2026). Dos cambios: (A) altas "sin día fijo" para revistas; (B) renombrar vueltas desde la app.
-- Correr entero en el SQL Editor de Supabase. Idempotente.

-- (A) ------------------------------------------------------------------------------------------------
-- v97 (29/10/2026): ALTAS "SIN DÍA FIJO" (revistas).
-- Antes el trigger ignoraba las novedades Alta con dias vacío, así que no se podía dar de alta una revista desde la app.
-- Ahora: dias = '{}' (vacío, no null) → suscripción con dias '{}' y dias_texto 'Sin día determinado' (como las revistas de NewsPaper:
-- no devengan por día; se entregan y cobran número por número desde Stock). dias null sigue sin hacer nada.
-- Misma lógica que 2026-09-15_alta_reemplaza.sql en todo lo demás. Idempotente.
create or replace function public.sync_alta_suscripcion() returns trigger language plpgsql security definer set search_path = public as $$
declare dt text;
begin
  if new.tipo <> 'Alta' or new.dias is null then return new; end if;
  dt := case when cardinality(new.dias) = 0 then 'Sin día determinado' else public.dias_texto_de(new.dias) end;
  if new.anulado then
    update public.suscripciones set anulado=true, anulado_en=now() where novedad_id=new.id and not anulado;
    update public.suscripciones set hasta=null, cerrada_por=null where cerrada_por=new.id and not anulado;
    return new;
  end if;
  if exists (select 1 from public.suscripciones where novedad_id=new.id) then
    update public.suscripciones set cliente_id=new.cliente_id, publicacion=new.publicacion, dias=new.dias, dias_texto=dt,
      via=coalesce(new.via,'C'), cantidad=coalesce(new.cantidad,1), desde=new.desde, hasta=null, anulado=false, anulado_en=null
      where novedad_id=new.id;
  else
    insert into public.suscripciones (cliente_id, publicacion, dias, dias_texto, via, cantidad, desde, hasta, origen, novedad_id)
      values (new.cliente_id, new.publicacion, new.dias, dt, coalesce(new.via,'C'), coalesce(new.cantidad,1), new.desde, null, 'app', new.id);
  end if;
  update public.suscripciones set hasta=new.desde where cerrada_por=new.id and not anulado and hasta is distinct from new.desde;
  -- cierra las superpuestas: misma publicación y días en común; una alta sin día fijo cierra las sin día de esa publicación
  update public.suscripciones s set hasta=new.desde, cerrada_por=new.id
    where s.cliente_id=new.cliente_id and not s.anulado
      and (s.novedad_id is null or s.novedad_id<>new.id)
      and upper(trim(s.publicacion))=upper(trim(new.publicacion))
      and (s.hasta is null or s.hasta>new.desde)
      and (s.dias is null or cardinality(s.dias)=0 or s.dias && new.dias);
  return new;
end $$;
-- el trigger ya existe (trg_sync_alta); se recrea por las dudas
drop trigger if exists trg_sync_alta on public.novedades;
create trigger trg_sync_alta after insert or update on public.novedades for each row execute function public.sync_alta_suscripcion();

-- (B) ------------------------------------------------------------------------------------------------
-- reparto.vuelta referencia vueltas(nombre) sin "on update cascade": cambiar el nombre fallaba. Ahora el cambio arrastra el reparto.
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid='public.reparto'::regclass and contype='f'
    and confrelid='public.vueltas'::regclass limit 1;
  if c is not null then execute format('alter table public.reparto drop constraint %I', c); end if;
end $$;
alter table public.reparto add constraint reparto_vuelta_fkey foreign key (vuelta) references public.vueltas(nombre) on update cascade;

-- renombrar_vuelta: cambia el nombre (el reparto lo sigue por la FK) y las vueltas asignadas a los repartidores (perfiles.vueltas)
create or replace function public.renombrar_vuelta(p_viejo text, p_nuevo text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tiene_permiso('reparto') then raise exception 'sin permiso para Reparto'; end if;
  if coalesce(trim(p_nuevo),'') = '' then raise exception 'falta el nombre nuevo'; end if;
  if exists (select 1 from public.vueltas where lower(nombre)=lower(trim(p_nuevo)) and nombre<>p_viejo) then raise exception 'ya hay una vuelta con ese nombre'; end if;
  update public.vueltas set nombre=trim(p_nuevo) where nombre=p_viejo;
  if not found then raise exception 'no existe la vuelta %', p_viejo; end if;
  update public.perfiles set vueltas=array_replace(vueltas,p_viejo,trim(p_nuevo)) where p_viejo = any(vueltas);
end $$;
revoke all on function public.renombrar_vuelta(text,text) from public, anon;
grant execute on function public.renombrar_vuelta(text,text) to authenticated;

-- Verificación: debe devolver la FK con confupdtype = 'c' (cascade)
select conname, confupdtype from pg_constraint where conrelid='public.reparto'::regclass and contype='f';
