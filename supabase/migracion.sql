-- COHAJ — migración kv → tablas (09/09/2026). Correr DESPUÉS de schema.sql. Idempotente (borra y recarga lo migrado de NewsPaper/kv).
set search_path = public;

-- 0. tablas auxiliares temporales con las constantes que vivían en index.html
create temp table t_activos(id int) on commit drop;
insert into t_activos select unnest(array[6,7,9,12,15,16,22,28,37,40,50,76,82,84,86,91,92,94,96,97,109,110,117,119,126,141,146,169,223,230,240,244,246,254,255,265,270,272,279,288,289,291,304,324,327,328,339,341,349,350,365,369,393,395,404,406,409,418,423,426,427,434,436,448,453,455,456,458,460,472,492,504,527,543,558,579,581,600,649,662,665,667,684,713,734,753,773,781,798,815,819,825,835,838,839,841,845,847,853,871,873,883,890,891,897,905,923,929,995,1006,1043,1048,1051,1052,1057,1074,1075,1077,1098,1099,1110,1118,1157,1162,1166,1173,1181,1189,1219,1224,1231,1255,1256,1264,1266,1290,1301,1306,1322,1325,1365,1367,1374,1414,1424,1430,1466,1467,1471,1472,1480,1493,1499,1532,1534,1633,1644,1645,1649,1651,1658,1668,1671,1692,1694,1696]);
create temp table t_ajustes(cli int, imp numeric) on commit drop;
insert into t_ajustes values
(7,282.95),
(9,366.7),
(37,-29.25),
(84,-40.3),
(94,401.9),
(126,-9087.05),
(141,-445.95),
(146,149.4),
(169,-13.5),
(223,57.0),
(246,36.9),
(254,75.35),
(270,82.8),
(272,-105.85),
(288,2372.45),
(291,470.65),
(304,150.85),
(324,-402.6),
(339,15.8),
(341,-624.9),
(349,116.6),
(365,121.9),
(427,2476.0),
(436,347.6),
(448,-58.1),
(453,92.8),
(456,475.95),
(458,339.45),
(460,325.45),
(600,148.0),
(649,-94.45),
(753,-112.3),
(773,-94.9),
(781,-3.35),
(815,-1449.8),
(835,84.85),
(838,647.3),
(873,-65.1),
(891,78.1),
(929,3.25),
(995,-9.0),
(1048,91.0),
(1052,-20.0),
(1374,184.7);
create temp table t_part(cli int, obs text) on commit drop;
insert into t_part values
(1256,'TOCAR TIMBRE SIEMPRE !!!'),
(7,'Arrojar Porch'),
(9,'Arrojar Porch Sin Subir (Ojo Alarma !!!)'),
(923,'Arrojar'),
(841,'Arrojar'),
(1322,'HALL ENTRADA DE EDIFICIO'),
(141,'Lu-Vi 0630 Sa-Do 0730 TOCAR TIMBRE'),
(883,'BUZON'),
(1052,'Arrojar'),
(781,'GARITA VIGIL. SIEMPRE !!!'),
(1255,'Buzón'),
(15,'Buzón Porton Verde Lu-Vi 0700'),
(16,'Antes 7.00 Lu a Do CERRAR PUERTITA !!!'),
(50,'Bajo Felpudo Lu-Vi 0645'),
(835,'TOCAR TIMBRE SIEMPRE'),
(37,'TOCAR TIMBRE SIEMPRE'),
(12,'Bajo Puerta/Si llueve en Buzón con bolsa'),
(838,'DEJAR POR BUZON'),
(1644,'EN MANO A VIGILANCIA'),
(109,'BAJO PUERTA'),
(86,'BAJO PUERTA'),
(94,'BAJO PUERTA'),
(110,'ARROJAR POR IZQUIERDA (OJO PILETA)'),
(126,'Lu-Vi 0600 Sa-Do 0800'),
(1166,'EN PALIER PRINCIPAL'),
(230,'OJO !!! LU a VI ANTES 06.30'),
(579,'Arrojar'),
(798,'COBRAR Arrojar Puerta Caiga lejos calle'),
(527,'Bajo Puerta'),
(1189,'TEMPRANO'),
(1367,'OJO !!! DEJAR EN VIGILANCIA'),
(246,'TOCAR TIMBRE'),
(272,'TEMPRANO'),
(349,'DOMINGO MAS TEMPRANO !!!'),
(255,'Sa-Do 0730 PASAR BAJO PUERTA'),
(1006,'ANTES 06.15 HS'),
(1173,'Arrojar Portón'),
(819,'ARROJAR'),
(28,'Arrojar Portón Garage'),
(291,'Arrojar Lu-Vi 0630'),
(1365,'EN PUERTA'),
(1466,'BAJO PUERTA'),
(1467,'BAJO PUERTA'),
(1649,'DEJAR DOBLADO EN MANIJA'),
(1043,'Arrojar Pasillo'),
(460,'Arrojar Lu-Sa 0700'),
(1651,'DEJAR EN ESCALERA'),
(995,'BOLSITA TIRAR ENTRE PUERTAS GARAGE'),
(288,'Bajo Puerta Con Gomita'),
(1471,'1er ASCENSOR DEJAR EN ALFOMBRA'),
(91,'BAJO PUERTA PRINCIPAL'),
(815,'DEJAR SOBRE MANGUERA DE INCENDIO'),
(393,'Arrojar'),
(395,'Arrojar'),
(1671,'Arrojar Porton Verja'),
(404,'TOCAR TIMBRE DESPUES DE LAS 8.00 HS.'),
(891,'Bajo Puerta (con bolsita)'),
(406,'Arrojar'),
(1057,'Bajo Portón derecho Garage'),
(1668,'A ENCARGADO'),
(409,'TEMPRANO ANTES DE 9.30'),
(341,'Lu-Do 0700'),
(350,'PASAR BAJO PUERTA LO ROBAN'),
(853,'Lu-Vi 7.00 Sa-Do 8.30'),
(418,'ARROJAR'),
(1290,'ARROJAR'),
(845,'BAJO PUERTA'),
(423,'GARAGE DRAGONES IDENTIFICADO'),
(1633,'Arrojar'),
(453,'Buzón'),
(455,'Arrojar Porch'),
(456,'Arrojar Lu-Vi 0645 Sa 06.30'),
(458,'Buzón'),
(434,'Lu-Do 0630'),
(472,'Bajo Portón Garage'),
(1266,'Arrojar Porch'),
(1181,'Arrojar Porch'),
(1472,'BAJO PUERTA DESARMAR'),
(1645,'ascensor y dpto. derecha cruzar entrada'),
(905,'Arrojar Porch LU-VI 6.30 SA-DO 7.30'),
(492,'Arrojar Porch');

-- limpiar lo migrado antes (permite re-correr)
delete from public.caja where origen in ('newspaper','kv','inicial');
delete from public.movimientos where origen in ('newspaper','kv','inicial');
delete from public.devoluciones where origen='kv';
delete from public.dist_movimientos where origen in ('newspaper','kv');
delete from public.feriados where origen='kv';
delete from public.novedades where origen='kv';
delete from public.precios where origen in ('newspaper','kv');
delete from public.suscripciones where origen='newspaper';
delete from public.clientes where origen='newspaper';

-- 1. distribuidora principal
insert into public.distribuidores(id, nombre, origen) values (1, 'Distribuidora principal', 'newspaper') on conflict (id) do nothing;
select setval('public.distribuidores_id_seq', greatest((select max(id) from public.distribuidores), 1));

-- 2. clientes desde seed/clientes_1..3
with src as (
  select r from public.kv, jsonb_array_elements(v->'rows') r where k in ('seed/clientes_1','seed/clientes_2','seed/clientes_3')
)
insert into public.clientes(id, domicilio, nombre, telefono, observaciones, particularidad, activo, ficha, saldo_inicial, saldo_inicial_fecha, origen)
select (r->>'id')::int, coalesce(r->>'d',''), coalesce(r->>'n',''), coalesce(r->>'tel',''), coalesce(r->>'obs',''),
       coalesce((select obs from t_part p where p.cli=(r->>'id')::int), ''),
       exists(select 1 from t_activos a where a.id=(r->>'id')::int),
       coalesce(r->>'fic','actual'),
       coalesce((r->>'sal')::numeric, 0), date '2026-08-31', 'newspaper'
from src
on conflict (id) do update set domicilio=excluded.domicilio, nombre=excluded.nombre, telefono=excluded.telefono, observaciones=excluded.observaciones,
  particularidad=excluded.particularidad, activo=excluded.activo, ficha=excluded.ficha, saldo_inicial=excluded.saldo_inicial, saldo_inicial_fecha=excluded.saldo_inicial_fecha, origen='newspaper';
select setval('public.clientes_id_seq', greatest((select max(id) from public.clientes), 2000));

-- 3. suscripciones desde subs [pub, dias, via, estado, desde, qty]
create or replace function public.dias_desde_texto(t text) returns smallint[] language sql immutable as $$
  select case lower(translate(coalesce(t,''), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
    when 'lunes' then '{0}'::smallint[] when 'martes' then '{1}' when 'miercoles' then '{2}' when 'jueves' then '{3}' when 'viernes' then '{4}'
    when 'sabado' then '{5}' when 'domingo' then '{6}' when 'todos los dias' then '{0,1,2,3,4,5,6}'
    when 'de lunes a viernes' then '{0,1,2,3,4}' when 'lunes a viernes' then '{0,1,2,3,4}'
    when 'de lunes a sabado' then '{0,1,2,3,4,5}' when 'lunes a sabado' then '{0,1,2,3,4,5}'
    when 'sabado y domingo' then '{5,6}' when 'lunes y jueves' then '{0,3}' when 'lunes, miercoles y viernes' then '{0,2,4}'
    when 'martes y viernes' then '{1,4}' when 'martes y jueves' then '{1,3}' when 'jueves y sabado' then '{3,5}'
    else '{}'::smallint[] end;
$$;
with src as (
  select (r->>'id')::int as cli, s from public.kv, jsonb_array_elements(v->'rows') r, jsonb_array_elements(r->'subs') s
  where k in ('seed/clientes_1','seed/clientes_2','seed/clientes_3')
)
insert into public.suscripciones(cliente_id, publicacion, dias_texto, dias, via, cantidad, desde, hasta, origen)
select cli, s->>0, coalesce(s->>1,''), public.dias_desde_texto(s->>1), case when s->>2='S' then 'S' else 'C' end,
       greatest(abs(coalesce((s->>5)::int,1)),1),
       nullif(left(s->>4,10),'')::date,
       case when s->>3='V' then null else nullif(left(s->>3,10),'')::date end,
       'newspaper'
from src where cli in (select id from public.clientes);

-- 4. movimientos NewsPaper 2024+ (informativos: el saldo inicial ya los incluye) [fecha, tipo, imp, medio]
with src as (
  select (r->>'id')::int as cli, m from public.kv, jsonb_array_elements(v->'rows') r, jsonb_array_elements(r->'movs') m
  where k in ('seed/clientes_1','seed/clientes_2','seed/clientes_3')
)
insert into public.movimientos(cliente_id, fecha, tipo, importe, medio, nota, origen)
select cli, left(m->>0,10)::date, case when m->>1 in ('Cobro','Liquidación','Ajuste') then m->>1 else 'Ajuste' end,
       abs(coalesce((m->>2)::numeric,0)), coalesce(m->>3,''), '', 'newspaper'
from src where cli in (select id from public.clientes);

-- 5. ajustes iniciales (v32): suscriptores puros con resto NewsPaper → saldo a cero, fecha 31/08
insert into public.movimientos(cliente_id, fecha, tipo, importe, medio, nota, fijo, origen)
select cli, date '2026-08-31', 'Ajuste', imp, '', 'Saldo a cero: resto de NewsPaper anterior a 2024', true, 'inicial' from t_ajustes;

-- 6. movimientos cargados en la app (live/movs)
insert into public.movimientos(cliente_id, fecha, tipo, importe, medio, nota, origen, creado_en)
select (r->>'cli')::int, (r->>'f')::date, r->>'tipo', (r->>'imp')::numeric, coalesce(r->>'medio',''), coalesce(r->>'nota',''), 'kv', coalesce((r->>'ts')::timestamptz, now())
from public.kv, jsonb_array_elements(v->'rows') r where k='live/movs' and (r->>'cli')::int in (select id from public.clientes);

-- 7. caja: histórico NewsPaper 2026 + saldo inicial + cargado en la app
insert into public.caja(fecha, hora, concepto, detalle, ingreso, egreso, medio, origen)
select left(r->>'f',10)::date, nullif(substr(r->>'f',12,5),'')::time, coalesce(r->>'c',''), coalesce(r->>'d',''), coalesce((r->>'i')::numeric,0), coalesce((r->>'e')::numeric,0), coalesce(r->>'m','Efectivo'), 'newspaper'
from public.kv, jsonb_array_elements(v->'rows') r where k='seed/caja_hist';
insert into public.caja(fecha, concepto, detalle, ingreso, egreso, medio, fijo, origen)
values (date '2026-09-08', 'Cambio inicial', 'Caja chica al 08/09 (saldo inicial)', 130000, 0, 'Efectivo', true, 'inicial');
insert into public.caja(fecha, concepto, detalle, ingreso, egreso, medio, origen, creado_en)
select (r->>'f')::date, coalesce(r->>'c',''), coalesce(r->>'d',''), coalesce((r->>'ing')::numeric,0), coalesce((r->>'egr')::numeric,0), coalesce(r->>'m','Efectivo'), 'kv', coalesce((r->>'ts')::timestamptz, now())
from public.kv, jsonb_array_elements(v->'rows') r where k='live/caja';

-- 8. precios: NewsPaper + cargados en la app
insert into public.precios(publicacion, dia, desde, precio, origen)
select r->>'pub', (r->>'dia')::smallint, (r->>'desde')::date, (r->>'precio')::numeric, 'newspaper'
from public.kv, jsonb_array_elements(v->'rows') r where k='seed/precios' and (r->>'precio')::numeric > 0 and r->>'desde' is not null;
insert into public.precios(publicacion, dia, desde, precio, origen, creado_en)
select r->>'pub', (r->>'dia')::smallint, (r->>'desde')::date, (r->>'precio')::numeric, 'kv', coalesce((r->>'ts')::timestamptz, now())
from public.kv, jsonb_array_elements(v->'rows') r where k='live/precios';

-- 9. novedades cargadas en la app
insert into public.novedades(cliente_id, tipo, publicacion, desde, hasta, dias, via, cantidad, nota, origen, creado_en)
select (r->>'cli')::int, r->>'tipo', coalesce(r->>'pub',''), nullif(r->>'desde','')::date, nullif(r->>'hasta','')::date,
       case when r ? 'dias' then (select array_agg(x::smallint) from jsonb_array_elements_text(r->'dias') x) end,
       nullif(r->>'via',''), (r->>'qty')::int, coalesce(r->>'nota',''), 'kv', coalesce((r->>'ts')::timestamptz, now())
from public.kv, jsonb_array_elements(v->'rows') r where k='live/novedades' and (r->>'cli')::int in (select id from public.clientes);

-- 10. feriados y devoluciones
insert into public.feriados(fecha, motivo, origen)
select (r->>'f')::date, coalesce(r->>'d',''), 'kv' from public.kv, jsonb_array_elements(v->'rows') r where k='live/feriados'
on conflict (fecha) do nothing;
insert into public.devoluciones(distribuidor_id, fecha, publicacion, cantidad, nota, origen, creado_en)
select 1, (r->>'f')::date, r->>'pub', (r->>'qty')::int, coalesce(r->>'nota',''), 'kv', coalesce((r->>'ts')::timestamptz, now())
from public.kv, jsonb_array_elements(v->'rows') r where k='live/devol';

-- 11. distribuidora: histórico NewsPaper (solo consulta) + cargado en la app
insert into public.dist_movimientos(distribuidor_id, fecha, detalle, importe, historico, origen)
select 1, (r->>'f')::date, coalesce(r->>'d',''), coalesce((r->>'imp')::numeric,0), true, 'newspaper'
from public.kv, jsonb_array_elements(v->'rows') r where k='seed/dist';
insert into public.dist_movimientos(distribuidor_id, fecha, detalle, importe, historico, origen, creado_en)
select 1, (r->>'f')::date, coalesce(r->>'d',''), (r->>'imp')::numeric, false, 'kv', coalesce((r->>'ts')::timestamptz, now())
from public.kv, jsonb_array_elements(v->'rows') r where k='live/dist';

-- 12. config
insert into public.config(clave, valor) values
 ('comision', to_jsonb(coalesce((select (v->>'comision')::numeric from public.kv where k='live/config'), 32))),
 ('devengo_desde', to_jsonb('2026-09-01'::text)),
 ('medios', '["Efectivo","Mercado Pago","Modo","Tarjeta de débito","Tarjeta de crédito","Transferencia"]'::jsonb),
 ('conceptos_caja', '["Cobro a cliente","Venta mostrador","Cobro distribuidora","Pago a distribuidora","Pago a empleado","Gasto","Retiro","Cambio inicial","Transferencia entre cuentas","Otro"]'::jsonb),
 ('admins', '["demianlevy09@gmail.com"]'::jsonb)
on conflict (clave) do update set valor = excluded.valor, modificado_en = now();

-- resumen
select 'clientes' t, count(*) n, count(*) filter (where activo) activos from public.clientes
union all select 'suscripciones', count(*), count(*) filter (where hasta is null) from public.suscripciones
union all select 'movimientos', count(*), count(*) filter (where origen<>'newspaper') from public.movimientos
union all select 'caja', count(*), count(*) filter (where origen<>'newspaper') from public.caja
union all select 'precios', count(*), count(*) filter (where origen<>'newspaper') from public.precios
union all select 'novedades', count(*), 0 from public.novedades
union all select 'feriados', count(*), 0 from public.feriados
union all select 'devoluciones', count(*), 0 from public.devoluciones
union all select 'dist_movimientos', count(*), count(*) filter (where not historico) from public.dist_movimientos;
