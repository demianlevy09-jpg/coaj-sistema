-- 2026-09-11: PERMISOS EN EL BACKEND (v49). Idempotente.
-- 1) columnas de perfil
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('admin','operador','canillita','repartidor','personalizado'));
alter table public.perfiles add column if not exists permisos jsonb;
alter table public.perfiles add column if not exists vueltas text[];

-- 2) función: ¿el usuario actual tiene permiso sobre una sección? (mismos presets que ROLES en index.html)
create or replace function public.tiene_permiso(sec text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select activo and (
      rol = 'admin'
      or rol = 'operador'
      or (rol = 'canillita'  and sec in ('inicio','clientes','caja','ventas','stock','novedades','reparto'))
      or (rol = 'repartidor' and sec in ('reparto'))
      or (rol = 'personalizado' and coalesce((permisos->>sec)::boolean, false))
    ) from public.perfiles where id = auth.uid()
  ), false);
$$;
grant execute on function public.tiene_permiso(text) to authenticated;

-- 3) políticas por tabla: leer / escribir según sección; borrar físico solo admin

drop policy if exists p_select on public.clientes; create policy p_select on public.clientes for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.clientes; create policy p_insert on public.clientes for insert to authenticated with check (public.tiene_permiso('clientes') or public.tiene_permiso('novedades'));
drop policy if exists p_update on public.clientes; create policy p_update on public.clientes for update to authenticated using (public.tiene_permiso('clientes') or public.tiene_permiso('novedades')) with check (public.tiene_permiso('clientes') or public.tiene_permiso('novedades'));
drop policy if exists p_delete on public.clientes; create policy p_delete on public.clientes for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.suscripciones; create policy p_select on public.suscripciones for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.suscripciones; create policy p_insert on public.suscripciones for insert to authenticated with check (public.tiene_permiso('clientes') or public.tiene_permiso('novedades'));
drop policy if exists p_update on public.suscripciones; create policy p_update on public.suscripciones for update to authenticated using (public.tiene_permiso('clientes') or public.tiene_permiso('novedades')) with check (public.tiene_permiso('clientes') or public.tiene_permiso('novedades'));
drop policy if exists p_delete on public.suscripciones; create policy p_delete on public.suscripciones for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.novedades; create policy p_select on public.novedades for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.novedades; create policy p_insert on public.novedades for insert to authenticated with check (public.tiene_permiso('clientes') or public.tiene_permiso('novedades'));
drop policy if exists p_update on public.novedades; create policy p_update on public.novedades for update to authenticated using (public.tiene_permiso('clientes') or public.tiene_permiso('novedades')) with check (public.tiene_permiso('clientes') or public.tiene_permiso('novedades'));
drop policy if exists p_delete on public.novedades; create policy p_delete on public.novedades for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.movimientos; create policy p_select on public.movimientos for select to authenticated using (public.tiene_permiso('clientes'));
drop policy if exists p_insert on public.movimientos; create policy p_insert on public.movimientos for insert to authenticated with check (public.tiene_permiso('clientes') or public.tiene_permiso('ventas'));
drop policy if exists p_update on public.movimientos; create policy p_update on public.movimientos for update to authenticated using (public.tiene_permiso('clientes') or public.tiene_permiso('ventas')) with check (public.tiene_permiso('clientes') or public.tiene_permiso('ventas'));
drop policy if exists p_delete on public.movimientos; create policy p_delete on public.movimientos for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.resumenes; create policy p_select on public.resumenes for select to authenticated using (public.tiene_permiso('clientes'));
drop policy if exists p_insert on public.resumenes; create policy p_insert on public.resumenes for insert to authenticated with check (public.tiene_permiso('clientes'));
drop policy if exists p_update on public.resumenes; create policy p_update on public.resumenes for update to authenticated using (public.tiene_permiso('clientes')) with check (public.tiene_permiso('clientes'));
drop policy if exists p_delete on public.resumenes; create policy p_delete on public.resumenes for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.caja; create policy p_select on public.caja for select to authenticated using (public.tiene_permiso('caja'));
drop policy if exists p_insert on public.caja; create policy p_insert on public.caja for insert to authenticated with check (public.tiene_permiso('caja') or public.tiene_permiso('ventas') or public.tiene_permiso('compras'));
drop policy if exists p_update on public.caja; create policy p_update on public.caja for update to authenticated using (public.tiene_permiso('caja') or public.tiene_permiso('ventas') or public.tiene_permiso('compras')) with check (public.tiene_permiso('caja') or public.tiene_permiso('ventas') or public.tiene_permiso('compras'));
drop policy if exists p_delete on public.caja; create policy p_delete on public.caja for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.precios; create policy p_select on public.precios for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.precios; create policy p_insert on public.precios for insert to authenticated with check (public.tiene_permiso('precios'));
drop policy if exists p_update on public.precios; create policy p_update on public.precios for update to authenticated using (public.tiene_permiso('precios')) with check (public.tiene_permiso('precios'));
drop policy if exists p_delete on public.precios; create policy p_delete on public.precios for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.feriados; create policy p_select on public.feriados for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.feriados; create policy p_insert on public.feriados for insert to authenticated with check (public.tiene_permiso('novedades'));
drop policy if exists p_update on public.feriados; create policy p_update on public.feriados for update to authenticated using (public.tiene_permiso('novedades')) with check (public.tiene_permiso('novedades'));
drop policy if exists p_delete on public.feriados; create policy p_delete on public.feriados for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.distribuidores; create policy p_select on public.distribuidores for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.distribuidores; create policy p_insert on public.distribuidores for insert to authenticated with check (public.tiene_permiso('dist'));
drop policy if exists p_update on public.distribuidores; create policy p_update on public.distribuidores for update to authenticated using (public.tiene_permiso('dist')) with check (public.tiene_permiso('dist'));
drop policy if exists p_delete on public.distribuidores; create policy p_delete on public.distribuidores for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.publicaciones_dist; create policy p_select on public.publicaciones_dist for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.publicaciones_dist; create policy p_insert on public.publicaciones_dist for insert to authenticated with check (public.tiene_permiso('dist'));
drop policy if exists p_update on public.publicaciones_dist; create policy p_update on public.publicaciones_dist for update to authenticated using (public.tiene_permiso('dist')) with check (public.tiene_permiso('dist'));
drop policy if exists p_delete on public.publicaciones_dist; create policy p_delete on public.publicaciones_dist for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.dist_movimientos; create policy p_select on public.dist_movimientos for select to authenticated using (public.tiene_permiso('dist'));
drop policy if exists p_insert on public.dist_movimientos; create policy p_insert on public.dist_movimientos for insert to authenticated with check (public.tiene_permiso('dist'));
drop policy if exists p_update on public.dist_movimientos; create policy p_update on public.dist_movimientos for update to authenticated using (public.tiene_permiso('dist')) with check (public.tiene_permiso('dist'));
drop policy if exists p_delete on public.dist_movimientos; create policy p_delete on public.dist_movimientos for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.devoluciones; create policy p_select on public.devoluciones for select to authenticated using (public.tiene_permiso('dist'));
drop policy if exists p_insert on public.devoluciones; create policy p_insert on public.devoluciones for insert to authenticated with check (public.tiene_permiso('dist'));
drop policy if exists p_update on public.devoluciones; create policy p_update on public.devoluciones for update to authenticated using (public.tiene_permiso('dist')) with check (public.tiene_permiso('dist'));
drop policy if exists p_delete on public.devoluciones; create policy p_delete on public.devoluciones for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.vueltas; create policy p_select on public.vueltas for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.vueltas; create policy p_insert on public.vueltas for insert to authenticated with check (public.tiene_permiso('reparto'));
drop policy if exists p_update on public.vueltas; create policy p_update on public.vueltas for update to authenticated using (public.tiene_permiso('reparto')) with check (public.tiene_permiso('reparto'));
drop policy if exists p_delete on public.vueltas; create policy p_delete on public.vueltas for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.reparto; create policy p_select on public.reparto for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.reparto; create policy p_insert on public.reparto for insert to authenticated with check (public.tiene_permiso('reparto'));
drop policy if exists p_update on public.reparto; create policy p_update on public.reparto for update to authenticated using (public.tiene_permiso('reparto')) with check (public.tiene_permiso('reparto'));
drop policy if exists p_delete on public.reparto; create policy p_delete on public.reparto for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.productos; create policy p_select on public.productos for select to authenticated using (public.es_operador());
drop policy if exists p_insert on public.productos; create policy p_insert on public.productos for insert to authenticated with check (public.tiene_permiso('stock') or public.tiene_permiso('compras'));
drop policy if exists p_update on public.productos; create policy p_update on public.productos for update to authenticated using (public.tiene_permiso('stock') or public.tiene_permiso('compras')) with check (public.tiene_permiso('stock') or public.tiene_permiso('compras'));
drop policy if exists p_delete on public.productos; create policy p_delete on public.productos for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.stock_mov; create policy p_select on public.stock_mov for select to authenticated using (public.tiene_permiso('stock') or public.tiene_permiso('ventas') or public.tiene_permiso('compras'));
drop policy if exists p_insert on public.stock_mov; create policy p_insert on public.stock_mov for insert to authenticated with check (public.tiene_permiso('stock') or public.tiene_permiso('ventas') or public.tiene_permiso('compras'));
drop policy if exists p_update on public.stock_mov; create policy p_update on public.stock_mov for update to authenticated using (public.tiene_permiso('stock') or public.tiene_permiso('ventas') or public.tiene_permiso('compras')) with check (public.tiene_permiso('stock') or public.tiene_permiso('ventas') or public.tiene_permiso('compras'));
drop policy if exists p_delete on public.stock_mov; create policy p_delete on public.stock_mov for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.proveedores; create policy p_select on public.proveedores for select to authenticated using (public.tiene_permiso('stock') or public.tiene_permiso('ventas') or public.tiene_permiso('compras'));
drop policy if exists p_insert on public.proveedores; create policy p_insert on public.proveedores for insert to authenticated with check (public.tiene_permiso('compras') or public.tiene_permiso('stock'));
drop policy if exists p_update on public.proveedores; create policy p_update on public.proveedores for update to authenticated using (public.tiene_permiso('compras') or public.tiene_permiso('stock')) with check (public.tiene_permiso('compras') or public.tiene_permiso('stock'));
drop policy if exists p_delete on public.proveedores; create policy p_delete on public.proveedores for delete to authenticated using (public.es_admin());
drop policy if exists p_select on public.prov_movimientos; create policy p_select on public.prov_movimientos for select to authenticated using (public.tiene_permiso('compras'));
drop policy if exists p_insert on public.prov_movimientos; create policy p_insert on public.prov_movimientos for insert to authenticated with check (public.tiene_permiso('compras') or public.tiene_permiso('ventas'));
drop policy if exists p_update on public.prov_movimientos; create policy p_update on public.prov_movimientos for update to authenticated using (public.tiene_permiso('compras') or public.tiene_permiso('ventas')) with check (public.tiene_permiso('compras') or public.tiene_permiso('ventas'));
drop policy if exists p_delete on public.prov_movimientos; create policy p_delete on public.prov_movimientos for delete to authenticated using (public.es_admin());

-- 4) perfiles: cada uno ve solo el suyo; el admin ve y edita todos
drop policy if exists p_select on public.perfiles; create policy p_select on public.perfiles for select to authenticated using (id = auth.uid() or public.es_admin());
drop policy if exists p_insert on public.perfiles;
drop policy if exists p_update on public.perfiles;
drop policy if exists p_delete on public.perfiles;
drop policy if exists p_perfiles_w on public.perfiles; create policy p_perfiles_w on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- 5) log_cambios y cierres: solo admin lee; config la leen todos, escribe admin
drop policy if exists p_select on public.log_cambios; create policy p_select on public.log_cambios for select to authenticated using (public.es_admin());
drop policy if exists p_update on public.log_cambios; drop policy if exists p_delete on public.log_cambios;
drop policy if exists p_select on public.cierres; create policy p_select on public.cierres for select to authenticated using (public.tiene_permiso('clientes'));

-- 6) backup completo: solo admin (antes cualquier usuario logueado podía bajar toda la base)
create or replace function public.exportar_todo() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede exportar la base'; end if;
  return jsonb_build_object(
    'exportado_en', now(),
    'clientes', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.clientes t),
    'suscripciones', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.suscripciones t),
    'movimientos', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.movimientos t),
    'caja', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.caja t),
    'precios', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.precios t),
    'novedades', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.novedades t),
    'feriados', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.feriados t),
    'distribuidores', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.distribuidores t),
    'publicaciones_dist', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.publicaciones_dist t),
    'dist_movimientos', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.dist_movimientos t),
    'devoluciones', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.devoluciones t),
    'vueltas', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.vueltas t),
    'reparto', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.reparto t),
    'proveedores', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.proveedores t),
    'productos', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.productos t),
    'stock_mov', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.stock_mov t),
    'prov_movimientos', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.prov_movimientos t),
    'resumenes', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.resumenes t),
    'config', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.config t),
    'cierres', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.cierres t),
    'perfiles', (select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.perfiles t)
  );
end $$;

-- 7) función SQL de cierre ya chequea es_admin(); config: lee cualquier activo, escribe admin (sin cambios)

select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename, policyname;
