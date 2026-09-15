-- v61 (15/09/2026): las devoluciones a la distribuidora (ejemplares no vendidos) descuentan del saldo con ella.
-- valor_unit = lo que acredita por ejemplar (por defecto precio de tapa, editable); importe = cantidad × valor_unit. Idempotente.
alter table public.devoluciones add column if not exists valor_unit numeric;
alter table public.devoluciones add column if not exists importe numeric;
select (select count(*) from information_schema.columns where table_name='devoluciones' and column_name in ('valor_unit','importe')) as cols;
