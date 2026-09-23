# Tests

Dos niveles, los dos con datos **ficticios** (`fixture.js`; el repo es público, nunca poner datos reales acá):

- `node --test tests/*.test.js` — reglas de plata: días, precios por fecha, devengo, suspensiones, feriados, saldos, comisión y cuenta con la distribuidora. Los importes esperados están calculados a mano en cada test. Corre el mismo código de `js/` que usa la app (`cargar.js`).
- `node tests/humo.mjs [carpeta]` — abre la app en un Chromium sin pantalla con una base falsa (`fake-supabase.js`), recorre todas las pestañas en escritorio y teléfono y falla si hay un error de JavaScript o algo se desborda a lo ancho. Con carpeta, guarda capturas. Necesita `npm i --no-save playwright && npx playwright install chromium`.

GitHub los corre solos en cada push (`.github/workflows/tests.yml`).

Con los datos reales: en la app, **Usuarios → Verificar cálculos** compara cliente por cliente el saldo de la app con el de la base (`v_saldos`).

Regla: cada bug de plata que se arregle suma un test que lo reproduce antes del arreglo.
