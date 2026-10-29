// Supabase falso, en memoria, para tests y para abrir la app sin tocar la base real.
// Implementa solo lo que usa la app: from().select/insert/update/upsert/delete con eq/in/match/order/range/single/maybeSingle, rpc y auth.
(function (root) {
  function crear(tablas, usuario) {
    const T = JSON.parse(JSON.stringify(tablas || {}));
    let nextId = 900000;
    const user = usuario || { id: 'u-test', email: 'test@cohaj.local' };
    const log = [];
    // espejo del trigger sync_alta_suscripcion (supabase/2026-10-29_v97.sql): una novedad Alta crea su suscripción y cierra las superpuestas
    const DT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do', 'Fer'];
    function syncAlta(n) {
      if (n.tipo !== 'Alta' || !Array.isArray(n.dias)) return;
      const S = T.suscripciones = T.suscripciones || [];
      const dt = n.dias.length ? n.dias.slice().sort().map(d => DT[d]).join(' ') : 'Sin día determinado';
      if (n.anulado) { S.forEach(x => { if (x.novedad_id === n.id && !x.anulado) x.anulado = true; }); S.forEach(x => { if (x.cerrada_por === n.id && !x.anulado) { x.hasta = null; x.cerrada_por = null; } }); return; }
      let m = S.find(x => x.novedad_id === n.id);
      if (m) Object.assign(m, { cliente_id: n.cliente_id, publicacion: n.publicacion, dias: n.dias, dias_texto: dt, via: n.via || 'C', cantidad: n.cantidad || 1, desde: n.desde, hasta: null, anulado: false });
      else { m = { id: nextId++, cliente_id: n.cliente_id, publicacion: n.publicacion, dias: n.dias, dias_texto: dt, via: n.via || 'C', cantidad: n.cantidad || 1, desde: n.desde, hasta: null, origen: 'app', novedad_id: n.id, anulado: false, creado_en: new Date().toISOString() }; S.push(m); }
      S.forEach(x => { if (x === m || x.anulado || x.cliente_id !== n.cliente_id) return; if (String(x.publicacion).trim().toUpperCase() !== String(n.publicacion).trim().toUpperCase()) return; if (x.hasta && x.hasta <= n.desde) return;
        if (x.dias == null || !x.dias.length || x.dias.some(d => n.dias.includes(d))) { x.hasta = n.desde; x.cerrada_por = n.id; } });
    }
    function q(tabla) {
      const st = { tabla, op: 'select', filtros: [], orden: null, rango: null, uno: null, fila: null, cambios: null, conflicto: null, devolver: false };
      const api = {
        select() { if (st.op !== 'select') st.devolver = true; return api; },
        eq(c, v) { st.filtros.push(r => r[c] === v || (r[c] != null && v != null && typeof v !== 'boolean' && String(r[c]) === String(v)) || (r[c] == null && v === false && c === 'anulado')); return api; },
        in(c, vs) { const s = new Set(vs); st.filtros.push(r => s.has(r[c])); return api; },
        match(o) { for (const k in o) api.eq(k, o[k]); return api; },
        or(expr) { const cs = expr.split(',').map(x => { const [c, op, ...v] = x.split('.'); const val = v.join('.'); return r => op === 'is' ? (val === 'null' ? r[c] == null : String(r[c]) === val) : op === 'eq' ? String(r[c]) === val : op === 'neq' ? (r[c] != null && String(r[c]) !== val) : false; }); st.filtros.push(r => cs.some(f => f(r))); return api; },
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
          if (tabla === 'novedades') nuevas.forEach(syncAlta);
          return { data: st.uno ? nuevas[0] : nuevas, error: null };
        }
        if (st.op === 'update') { const rs = filas.filter(pasa); rs.forEach(r => Object.assign(r, st.cambios)); if (tabla === 'novedades') rs.forEach(syncAlta); return { data: rs, error: null }; }
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
      rpc: async (fn, a) => {
        if (fn === 'renombrar_vuelta') { const v = (T.vueltas || []).find(x => x.nombre === a.p_viejo); if (!v) return { data: null, error: { message: 'no existe la vuelta' } };
          v.nombre = a.p_nuevo; (T.reparto || []).forEach(r => { if (r.vuelta === a.p_viejo) r.vuelta = a.p_nuevo; }); (T.perfiles || []).forEach(p => { if (Array.isArray(p.vueltas)) p.vueltas = p.vueltas.map(x => x === a.p_viejo ? a.p_nuevo : x); }); }
        return { data: null, error: null }; },
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
