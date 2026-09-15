-- 15/09/2026 SEGURIDAD (CORRIDO). Idempotente.
drop policy if exists kv_select on public.kv; drop policy if exists kv_insert on public.kv; drop policy if exists kv_update on public.kv;
drop policy if exists kv_admin on public.kv; create policy kv_admin on public.kv for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;
revoke insert, update, delete on public.log_cambios from authenticated;
