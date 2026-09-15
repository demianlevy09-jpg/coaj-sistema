-- 15/09/2026 (ejecutado desde la app con la sesión de Demian, vía supabase-js; queda acá como registro).
-- Chequeo de suscripciones vigentes superpuestas (mismo cliente, misma publicación, días en común) en los 166 activos:
-- 2 pares, los dos generados hoy desde la ficha con "Suspender" (sin hasta) + "Alta" como C para pasar de "vía distribuidora" a "le cobrás vos".
-- La suspensión ya evitaba el doble devengo (devengo S = 0), pero la suscripción vieja seguía "vigente". Se cierra al 01/09 (fin 31/08), igual que el fix del 10/09.
update public.suscripciones set hasta='2026-09-01' where id=3296 and cliente_id=119 and publicacion='LA NACION' and via='S' and hasta is null;        -- Dragones 2280 1 ENC
update public.suscripciones set hasta='2026-09-01' where id=1551 and cliente_id=845 and publicacion='TIEMPO ARGENTINO' and via='S' and hasta is null; -- Monroe 883
-- Verificado después: 0 pares superpuestos, 362 vigentes, "Me deben" $3.431.474 (37) y comisión devengada sin cambios.
