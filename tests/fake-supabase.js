// Supabase falso, en memoria, para tests y para abrir la app sin tocar la base real.
// Implementa solo lo que usa la app: from().select/insert/update/upsert/delete con eq/in/match/order/range/single/maybeSingle, rpc y auth.
(function (root) {
  function crear(tablas, usuario) {
    const T = JSON.parse(JSON.stringify(tablas || {}));
    let nextId = 900000;
    const user = usuario || { id: 'u-test', email: 'test@cohaj.local' };
    const log = [];
    function q(tabla) {
      const st = { tabla, op: 'select', filtros: [], orden: null, rango: null, uno: null, fila: null, cambios: null, conflicto: null, devolver: false };
      const api = {
        select() { if (st.op !== 'select') st.devolver = true; return api; },
        eq(c, v) { st.filtros.push(r => r[c] === v || (r[c] != null && v != null && typeof v !== 'boolean' && String(r[c]) === String(v)) || (r[c] == null && v === false && c === 'anulado')); return api; },
        in(c, vs) { const s = new Set(vs); st.filtros.push(r => s.has(r[c])); return api; },
        match(o) { for (const k in o) api.eq(k, o[k]); return api; },
        order(c, o) { st.orden = { c, asc: !o || o.ascending !== false }; return api; },
        range(a, b) { st.rango = [a, b]; return api; },
        limit(n) { st.rango = [0, n - 1]; return api; },
        single() { st.uno = 'single'; return api; },
        maybeSingle() { st.uno = 'maybe'; return api; },
        insert(fila) { st.op = 'insert'; st.fila = fila; return api; },
        update(c) { st.op = 'update'; st.cambios = c; return api; },
        upsert(fila, opt) { st.op = 'upsert'; st.fila = fila; st.conflicto = (opt && opt.onConflict) || 'id'; return api; },
        delete() { st.op = 'delete'; return api; },
        then(ok, err) { return Promise.resolve().then(ejecutar).then(ok, err); }
      };
      function ejecutar() {
        const filas = T[tabla] = T[tabla] || [];
        const pasa = r => st.filtros.every(f => f(r));
        log.push({ tabla, op: st.op });
        if (st.op === 'insert' || st.op === 'upsert') {
          const nuevas = (Array.isArray(st.fila) ? st.fila : [st.fila]).map(f => {
            if (st.op === 'upsert') {
              const ks = st.conflicto.split(',');
              const ex = filas.find(r => ks.every(k => r[k] === f[k]));
              if (ex) { Object.assign(ex, f); return ex; }
            }
            const r = Object.assign({ id: nextId++, anulado: false, creado_en: new Date().toISOString(), origen: 'app' }, f);
            filas.push(r); return r;
          });
          return { data: st.uno ? nuevas[0] : nuevas, error: null };
        }
        if (st.op === 'update') { const rs = filas.filter(pasa); rs.forEach(r => Object.assign(r, st.cambios)); return { data: rs, error: null }; }
        if (st.op === 'delete') { const rs = filas.filter(pasa); T[tabla] = filas.filter(r => !pasa(r)); return { data: rs, error: null }; }
        let rs = filas.filter(pasa);
        if (st.orden) { const { c, asc } = st.orden; rs = rs.slice().sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
        if (st.rango) rs = rs.slice(st.rango[0], st.rango[1] + 1);
        rs = JSON.parse(JSON.stringify(rs));
        if (st.uno) return { data: rs[0] || null, error: (st.uno === 'single' && !rs.length) ? { message: 'no rows' } : null };
        return { data: rs, error: null };
      }
      return api;
    }
    const sesion = { access_token: 'x', user };
    return {
      _tablas: T, _log: log,
      from: q,
      rpc: async () => ({ data: null, error: null }),
      functions: { invoke: async () => ({ data: null, error: null }) },
      auth: {
        getSession: async () => ({ data: { session: sesion } }),
        getUser: async () => ({ data: { user }, error: null }),
        refreshSession: async () => ({ data: { session: sesion } }),
        signOut: async () => ({}),
        signInWithPassword: async () => ({ error: null })
      }
    };
  }
  const exp = { crear };
  if (typeof module !== 'undefined' && module.exports) module.exports = exp;
  root.FakeSupabase = exp;
})(typeof globalThis !== 'undefined' ? globalThis : this);
