// Edge Function "usuarios": administración de usuarios de COHAJ Sistema.
// Solo los mails de ADMINS pueden listar / crear / cambiar clave / bloquear / borrar.
// Usa la service_role key del lado del servidor (nunca viaja al navegador).
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMINS = (Deno.env.get("ADMIN_EMAILS") ?? "demianlevy09@gmail.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sin sesión" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: uerr } = await userClient.auth.getUser(token);
    if (uerr || !user) return json({ error: "Sesión inválida" }, 401);
    if (!ADMINS.includes((user.email ?? "").toLowerCase())) return json({ error: "Solo el administrador puede hacer esto" }, 403);

    const admin = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const { accion, email, password, id, bloquear } = body ?? {};

    if (accion === "listar") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      const usuarios = data.users.map((u) => ({
        id: u.id, email: u.email, creado: u.created_at, ultimo: u.last_sign_in_at,
        confirmado: !!u.email_confirmed_at,
        bloqueado: !!u.banned_until && new Date(u.banned_until) > new Date(),
        admin: ADMINS.includes((u.email ?? "").toLowerCase()),
      })).sort((a, b) => (a.creado ?? "").localeCompare(b.creado ?? ""));
      return json({ usuarios });
    }
    if (accion === "crear") {
      if (!email || !password || String(password).length < 6) return json({ error: "Falta email o la contraseña tiene menos de 6 caracteres" }, 400);
      const { data, error } = await admin.auth.admin.createUser({ email: String(email).trim().toLowerCase(), password, email_confirm: true });
      if (error) throw error;
      return json({ ok: true, id: data.user?.id });
    }
    if (accion === "clave") {
      if (!id || !password || String(password).length < 6) return json({ error: "Contraseña de al menos 6 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      return json({ ok: true });
    }
    if (accion === "bloquear") {
      if (!id) return json({ error: "Falta id" }, 400);
      if (id === user.id) return json({ error: "No podés bloquearte a vos mismo" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: bloquear ? "876000h" : "none" });
      if (error) throw error;
      return json({ ok: true });
    }
    if (accion === "borrar") {
      if (!id) return json({ error: "Falta id" }, 400);
      if (id === user.id) return json({ error: "No podés borrarte a vos mismo" }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
