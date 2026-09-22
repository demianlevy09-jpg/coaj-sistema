-- v74: número de edición en los movimientos de stock (revistas mensuales, coleccionables)
alter table public.stock_mov add column if not exists edicion text not null default '';
create index if not exists stock_mov_prod_ed on public.stock_mov(producto_id, edicion) where not anulado;
