-- v75: revistas que se reparten a suscriptores cuando llega cada número
alter table public.productos add column if not exists publicaciones text[] not null default '{}';
alter table public.stock_mov drop constraint if exists stock_mov_tipo_check;
alter table public.stock_mov add constraint stock_mov_tipo_check check (tipo in ('compra','recepcion','venta','devolucion','ajuste','entrega'));
