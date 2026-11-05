// Edge Function "urbansoft": consulta la API de Urban Soft (lo que Urban Point le mandó al kiosko) y lo espeja en
// public.urbansoft_lineas. NO toca el stock: la app muestra las líneas pendientes y el admin las marca como recibidas.
// Secretos: URBANSOFT_TOKEN (bearer que emite Urban Soft), opcional URBANSOFT_URL (default sistema7000.belnu.com.ar).
// Config (tabla config): urbansoft_vendedor (id del vendedor en Urban Soft, ej. "169").
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type Linea = {
  id: string; tipo: "consignacion" | "pedido"; doc_id: string; producto_us: string;
  sku: string | null; nombre: string | null; categoria: string | null; foto: string | null;
  fecha: string | null; vence: string | null; cantidad: number; estado_us: string | null;
  costo: number | null; pvp: number | null;
};

async function pagina(base: string, token: string, path: string, params: Record<string, string>) {
  const out: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const u = new URL(base + path);
    Object.entries({ ...params, limit: "100" }).forEach(([k, v]) => u.searchParams.set(k, v));
    if (cursor) u.searchParams.set("cursor", cursor);
    const r = await fetch(u, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
    if (!r.ok) throw new Error(`Urban Soft respondió ${r.status} en ${path}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    out.push(...(j.data ?? []));
    cursor = j.next_cursor ?? null;
    if (!cursor) break;
  }
  return out;
}
const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Sin sesión" }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: uerr } = await userClient.auth.getUser(jwt);
    if (uerr || !user) return json({ error: "Sesión inválida" }, 401);
    const admin = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: perfil } = await admin.from("perfiles").select("rol,activo").eq("id", user.id).maybeSingle();
    if (!perfil || perfil.activo === false) return json({ error: "Tu usuario no tiene permisos" }, 403);

    const body = await req.json().catch(() => ({}));
    const accion = body?.accion ?? "sync";
    if (accion !== "sync") return json({ error: "Acción desconocida" }, 400);

    const token = Deno.env.get("URBANSOFT_TOKEN");
    if (!token) return json({ error: "Falta el secreto URBANSOFT_TOKEN en Supabase (Edge Functions → Secrets)." }, 400);
    const base = (Deno.env.get("URBANSOFT_URL") ?? "https://sistema7000.belnu.com.ar").replace(/\/$/, "");
    const { data: cfg } = await admin.from("config").select("valor").eq("clave", "urbansoft_vendedor").maybeSingle();
    const vendedor = String(cfg?.valor ?? "169").replace(/"/g, "");

    // ---- leer Urban Soft ----
    const [cons, peds, cat] = await Promise.all([
      pagina(base, token, `/api/v1/operaciones/vendedores/${vendedor}/consignaciones/`, {}),
      pagina(base, token, `/api/v1/operaciones/pedidos/`, { vendedor_id: vendedor }),
      pagina(base, token, `/api/v1/operaciones/vendedores/${vendedor}/catalogo/`, {}).catch(() => []),
    ]);
    const info: Record<string, { nombre?: string; foto?: string; sku?: string }> = {};
    for (const c of cat) info[String(c.producto_id)] = { nombre: c.nombre, sku: c.sku, foto: c.imagenes?.find((i: any) => i.principal)?.url ?? c.imagenes?.[0]?.url };

    const lineas: Linea[] = [];
    for (const l of cons) {
      const pid = String(l.producto_id), i = info[pid] ?? {};
      lineas.push({
        id: `S${l.salida_id}:${pid}`, tipo: "consignacion", doc_id: String(l.salida_id), producto_us: pid,
        sku: l.sku ?? i.sku ?? null, nombre: i.nombre ?? null, categoria: null, foto: i.foto ?? null,
        fecha: l.fecha_carga ?? null, vence: l.fecha_devolucion ?? null, cantidad: Number(l.cantidad_vigente) || 0,
        estado_us: l.estado ?? null, costo: num(l.precio_vendedor_final_historico ?? l.precio_vendedor_actual), pvp: num(l.pvp_actual ?? l.pvp_historico),
      });
    }
    for (const l of peds) {
      const pid = String(l.producto_id), i = info[pid] ?? {};
      lineas.push({
        id: `P${l.pedido_id}:${pid}`, tipo: "pedido", doc_id: String(l.pedido_id), producto_us: pid,
        sku: l.sku ?? i.sku ?? null, nombre: l.nombre ?? i.nombre ?? null, categoria: null, foto: i.foto ?? null,
        fecha: l.fecha ?? null, vence: null, cantidad: Number(l.cantidad_documentada) || 0,
        estado_us: (l.estado_debito ?? "") + (l.entrega_documentada === false ? " · sin entrega documentada" : ""),
        costo: num(l.precio_vendedor_final_historico ?? l.precio_vendedor_actual), pvp: num(l.pvp_actual ?? l.pvp_historico),
      });
    }

    // ---- espejar ----
    const { data: previas } = await admin.from("urbansoft_lineas").select("id,estado,cantidad");
    const prevIds = new Set((previas ?? []).map((p: any) => p.id));
    const ahora = new Date().toISOString();
    // las líneas que ya no están en Urban Soft (consignación liquidada / devuelta) quedan marcadas, no se borran
    const idsApi = new Set(lineas.map((l) => l.id));
    const cerradas = (previas ?? []).filter((p: any) => !idsApi.has(p.id)).map((p: any) => p.id);
    if (cerradas.length) await admin.from("urbansoft_lineas").update({ estado_us: "cerrada", actualizado_en: ahora }).in("id", cerradas).neq("estado_us", "cerrada");

    // bootstrap: una línea nueva cuya recepción/compra ya está cargada en cohaj (por la carga del 05/11 o una anterior) nace como recibida
    const nuevas = lineas.filter((l) => !prevIds.has(l.id));
    const { data: movs } = nuevas.length
      ? await admin.from("stock_mov").select("id,nota,cantidad").eq("anulado", false).in("tipo", ["recepcion", "compra"]).in("origen", ["urbansoft_api", "consigna_98"])
      : { data: [] as any[] };
    const norm = (s: string) => String(s ?? "").replace(/[\s\-]/g, "").toLowerCase();
    const yaCargada = (l: Linea) => (movs ?? []).find((m: any) => {
      const mm = String(m.nota ?? "").match(/(Salida|Pedido) #(\w+) · SKU ([^\s·]+)/);
      return mm && mm[2] === l.doc_id && ((mm[1] === "Salida") === (l.tipo === "consignacion")) && norm(mm[3]) === norm(l.sku ?? "");
    });

    let altas = 0;
    for (const l of lineas) {
      const fila: any = { ...l, visto_en: ahora, actualizado_en: ahora };
      if (!prevIds.has(l.id)) {
        const m = yaCargada(l);
        if (m) { fila.estado = "recibida"; fila.cantidad_recibida = m.cantidad; fila.stock_mov_id = m.id; fila.recibido_en = ahora; fila.nota = "ya estaba cargada en cohaj"; }
        altas++;
        const { error } = await admin.from("urbansoft_lineas").insert(fila);
        if (error) throw new Error("insert " + l.id + ": " + error.message);
      } else {
        const { error } = await admin.from("urbansoft_lineas").update(fila).eq("id", l.id);
        if (error) throw new Error("update " + l.id + ": " + error.message);
      }
    }
    const { count: pendientes } = await admin.from("urbansoft_lineas").select("id", { count: "exact", head: true }).eq("estado", "pendiente");
    await admin.from("urbansoft_sync").insert({ ok: true, detalle: `vendedor ${vendedor} · ${lineas.length} líneas (${cons.length} consignación, ${peds.length} pedidos) · ${altas} nuevas`, lineas: lineas.length, nuevas: altas, pendientes: pendientes ?? 0 });
    return json({ ok: true, lineas: lineas.length, nuevas: altas, pendientes: pendientes ?? 0, cerradas: cerradas.length });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      await admin.from("urbansoft_sync").insert({ ok: false, detalle: msg.slice(0, 500) });
    } catch (_) { /* sin log */ }
    return json({ error: msg }, 500);
  }
});
