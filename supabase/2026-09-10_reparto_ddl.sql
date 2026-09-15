-- 2026-09-10: RECORRIDOS (v46). Vueltas y asignación cliente→vuelta por día de semana, con orden de parada.
-- Idempotente. Semilla = hojas "POR RUTEO" de NewsPaper (mar 08/09, mié 09/09, jue 10/09, sáb 12/09, dom 13/09); lunes y viernes copian el jueves.
create table if not exists public.vueltas (
  nombre text primary key,
  repartidor text default '',
  orden integer not null default 0,
  activo boolean not null default true,
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app'
);
create table if not exists public.reparto (
  id bigserial primary key,
  cliente_id integer not null references public.clientes(id),
  dia smallint not null check (dia between 0 and 6),   -- 0 = lunes … 6 = domingo
  vuelta text not null references public.vueltas(nombre),
  orden integer not null default 0,                    -- orden de la parada dentro de la vuelta
  creado_en timestamptz default now(), creado_por uuid, modificado_en timestamptz, modificado_por uuid,
  anulado boolean not null default false, anulado_en timestamptz, anulado_por uuid, origen text default 'app',
  unique (cliente_id, dia)
);
alter table public.vueltas enable row level security;
alter table public.reparto enable row level security;
do $$ declare t text; begin
  foreach t in array array['vueltas','reparto'] loop
    execute format('drop trigger if exists tr_audit on public.%I', t);
    execute format('create trigger tr_audit before insert or update on public.%I for each row execute function public.audit_fila()', t);
    execute format('drop trigger if exists tr_log on public.%I', t);
    execute format('create trigger tr_log after insert or update or delete on public.%I for each row execute function public.log_fila()', t);
    execute format('drop policy if exists p_select on public.%I', t);
    execute format('create policy p_select on public.%I for select to authenticated using (public.es_operador())', t);
    execute format('drop policy if exists p_insert on public.%I', t);
    execute format('create policy p_insert on public.%I for insert to authenticated with check (public.es_operador())', t);
    execute format('drop policy if exists p_update on public.%I', t);
    execute format('create policy p_update on public.%I for update to authenticated using (public.es_operador()) with check (public.es_operador())', t);
    execute format('drop policy if exists p_delete on public.%I', t);
    execute format('create policy p_delete on public.%I for delete to authenticated using (public.es_operador())', t);
  end loop;
end $$;


