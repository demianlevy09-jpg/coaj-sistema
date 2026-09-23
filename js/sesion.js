// COHAJ Sistema — conexión a Supabase y login
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
const SB_URL='https://uenfocgoctlbmdhcalfo.supabase.co'; // proyecto Cohaj, São Paulo (migrado el 15/09/2026 desde bqujsvrfcyqazzjysijn, Oregon)
const SB_KEY='sb_publishable_wnhRAVemb2mqt9AyPSEP-Q_53SWoUUu';
const sb=window.supabase.createClient(SB_URL,SB_KEY);
let USUARIO=null, PERFIL=null;
const esAdmin=()=>!!PERFIL&&PERFIL.rol==='admin'&&PERFIL.activo!==false;
function traducirAuth(m){
  m=String(m||'');
  if(/Invalid login/i.test(m))return 'Email o contraseña incorrectos';
  if(/Email not confirmed/i.test(m))return 'Ese usuario todavía no está habilitado. Avisale a Demian.';
  if(/banned|user is banned/i.test(m))return 'Ese usuario está bloqueado. Avisale a Demian.';
  if(/at least 6/i.test(m))return 'La contraseña tiene que tener al menos 6 caracteres';
  if(/rate limit|too many/i.test(m))return 'Demasiados intentos, esperá un minuto';
  if(/Failed to fetch|NetworkError/i.test(m))return 'Sin conexión. Revisá internet y probá de nuevo.';
  return 'Error: '+m;
}
async function gate(){
  let{data:{session}}=await sb.auth.getSession();
  if(session){
    const{data:{user},error}=await sb.auth.getUser();
    if(error||!user){ try{const r=await sb.auth.refreshSession();session=r.data.session;}catch(_){session=null;} }
  }
  if(session){USUARIO=session.user;$('login').hidden=true;$('appwrap').hidden=false;iniciarApp();}
  else{try{await sb.auth.signOut();}catch(_){}$('login').hidden=false;$('cargando').hidden=true;}
}
document.addEventListener('click',async e=>{
  if(e.target.id==='lentrar'){
    const email=$('lemail').value.trim(),pass=$('lpass').value;
    if(!email||!pass){$('lmsg').textContent='Completá email y contraseña';return;}
    $('lmsg').textContent='Entrando…';
    try{
      const{error}=await sb.auth.signInWithPassword({email,password:pass});
      if(error)throw error;
      USUARIO=(await sb.auth.getSession()).data.session?.user||null;
      $('login').hidden=true;$('appwrap').hidden=false;$('cargando').hidden=false;iniciarApp();
    }catch(err){$('lmsg').textContent=traducirAuth(err.message||err);}
  }
  if(e.target.id==='lsalir'){await sb.auth.signOut();location.reload();}
});
