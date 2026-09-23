// COHAJ Sistema — Usuarios (solo admin)
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- USUARIOS (solo admin; la Edge Function "usuarios" es la que manda) ------- */
async function apiUsuarios(body){
  const{data,error}=await sb.functions.invoke('usuarios',{body});
  if(error){
    let msg=error.message||String(error);
    try{ const j=await error.context.json(); if(j&&j.error)msg=j.error; }catch(_){}
    if(/Failed to send|Failed to fetch|not found|404/i.test(msg)) msg='La función de usuarios no está publicada en Supabase todavía.';
    throw new Error(msg);
  }
  if(data&&data.error)throw new Error(data.error);
  return data;
}
let PERFILES=[];
function formPermisosHTML(pref,pf){
  pf=pf||{rol:'operador',permisos:null,vueltas:null};
  const rol=pf.rol||'operador';
  const perms=permisosDe(pf);
  return `<label>Rol</label><select id="${pref}-rol" onchange="rolCambio('${pref}')">${Object.entries(ROLES).filter(([k])=>k!=='admin').map(([k,r])=>`<option value="${k}"${rol===k?' selected':''}>${r.n} — ${r.d}</option>`).join('')}</select>
  <div class="mini" style="margin-top:6px">Secciones que ve:</div>
  <div class="permgrid" id="${pref}-perms">${SECCIONES.map(s=>`<label class="chkl"><input type="checkbox" data-sec="${s[0]}" ${perms.includes(s[0])?'checked':''} ${rol==='personalizado'?'':'disabled'}>${s[1]}</label>`).join('')}</div>
  <div id="${pref}-vbox" ${rol==='repartidor'?'':'hidden'}><div class="mini" style="margin-top:8px">Vueltas que le corresponden (si no marcás ninguna, ve todas):</div>
  <div class="permgrid">${VUELTAS.map(v=>`<label class="chkl"><input type="checkbox" data-vu="${v.nombre}" ${(pf.vueltas||[]).includes(v.nombre)?'checked':''}>${v.nombre}${v.repartidor?' <span class="mini">('+v.repartidor+')</span>':''}</label>`).join('')||'<span class="mini">No hay vueltas cargadas.</span>'}</div></div>`;
}
function rolCambio(pref){
  const rol=$(pref+'-rol').value; const preset=ROLES[rol]&&ROLES[rol].p;
  document.querySelectorAll('#'+pref+'-perms input').forEach(i=>{ i.disabled=rol!=='personalizado'; if(rol!=='personalizado') i.checked=(preset||[]).includes(i.dataset.sec); });
  $(pref+'-vbox').hidden=rol!=='repartidor';
}
function leerPermisos(pref){
  const rol=$(pref+'-rol').value;
  const permisos={}; document.querySelectorAll('#'+pref+'-perms input').forEach(i=>{permisos[i.dataset.sec]=i.checked;});
  const vueltas=[...document.querySelectorAll('#'+pref+'-vbox input:checked')].map(i=>i.dataset.vu);
  return {rol,permisos:rol==='personalizado'?permisos:null,vueltas:rol==='repartidor'&&vueltas.length?vueltas:null};
}
async function pintarUsuarios(){
  if(!esAdmin()){ver('inicio');return;}
  $('v-usuarios').innerHTML=`
  <button class="volver" id="uvolver">← Volver</button>
  ${titulo('Usuarios y ajustes','Quién entra al sistema, qué ve cada uno, y los datos del resumen de cuenta')}
  <h2>Crear usuario</h2>
  <div class="card">
    <div class="grid2"><div><label>Nombre</label><input id="unombre" placeholder="ej: Gastón"></div><div><label>Email</label><input id="uemail" type="email" autocomplete="off" placeholder="gaston@gmail.com"></div></div>
    <label>Contraseña (mín. 6)</label><input id="upass" type="text" autocomplete="off" placeholder="la que le vas a pasar">
    ${formPermisosHTML('un')}
    <button class="btn" id="uok">Crear usuario</button>
    <div class="mini" style="margin-top:8px">Queda habilitado al instante, sin confirmar mail. Pasale el email y la contraseña. Los permisos se pueden cambiar después.</div>
  </div>
  <h2>Usuarios existentes</h2>
  <div id="ulist"><div class="card mini">Cargando…</div></div>
  <h2>Resumen de cuenta</h2>${formEmisorHTML()}
  <h2>Verificar cálculos</h2>
  <div class="card"><div class="mini" style="margin-bottom:8px">Compara, cliente por cliente, el saldo que calcula la app con el que calcula la base de datos (dos programas distintos que tienen que dar lo mismo) a hoy y al último cierre, y la tapa repartida a suscriptores. Si algo no coincide, hay un error en alguno de los dos.</div>
    <button class="btn chico sec" id="uverif" onclick="verificarCalculos()">Verificar ahora</button><div id="uverif-res" style="margin-top:10px"></div></div>`;
  try{
    const[{usuarios},pfs]=await Promise.all([apiUsuarios({accion:'listar'}),sb.from('perfiles').select('*')]);
    PERFILES=pfs.data||[];
    $('ulist').innerHTML=usuarios.length?usuarios.map(u=>{const pf=PERFILES.find(p=>p.id===u.id)||{rol:u.admin?'admin':'operador'};
      return `<div class="card" style="margin-bottom:8px" id="ucard-${u.id}">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:16px">${pf.nombre||u.email||'(sin email)'}</b><span class="mini">${u.email||''}</span>
        <span class="pill ${pf.rol==='admin'?'p-susc':(pf.rol==='repartidor'?'p-mix':'p-cli')}">${nombreRol(pf)}</span>${u.bloqueado?'<span class="pill p-warn">bloqueado</span>':''}${!u.confirmado?'<span class="pill p-warn">sin confirmar</span>':''}${pf.activo===false?'<span class="pill p-warn">perfil inactivo</span>':''}</div>
      <div class="mini" style="margin-top:4px">Ve: ${pf.rol==='admin'?'todo':permisosDe(pf).map(k=>(SECCIONES.find(s=>s[0]===k)||[k,k])[1]).join(', ')||'nada'}${pf.vueltas&&pf.vueltas.length?' · vueltas: '+pf.vueltas.join(', '):''} · Creado ${fecha(u.creado)} · Último ingreso ${u.ultimo?fecha(u.ultimo):'nunca'}</div>
      ${u.admin?'':`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        <button class="btn chico sec" id="uperm" data-uid="${u.id}">Permisos</button>
        <button class="btn chico sec" id="uclave" data-uid="${u.id}" data-email="${u.email}">Cambiar clave</button>
        <button class="btn chico sec" id="ubloq" data-uid="${u.id}" data-email="${u.email}" data-bloq="${u.bloqueado?'1':'0'}">${u.bloqueado?'Desbloquear':'Bloquear'}</button>
        <button class="btn chico sec" id="uborrar" data-uid="${u.id}" data-email="${u.email}" style="color:var(--rojo);border-color:var(--rojo)">Borrar</button>
      </div><div id="uperm-${u.id}"></div>`}
    </div>`;}).join(''):'<div class="card mini">No hay usuarios.</div>';
  }catch(e){ $('ulist').innerHTML='<div class="aviso">'+(e.message||e)+'</div>'; }
}
function abrirPermisos(uid){
  const box=$('uperm-'+uid); if(!box)return; if(box.innerHTML){box.innerHTML='';return;}
  const pf=PERFILES.find(p=>p.id===uid)||{rol:'operador'};
  box.innerHTML=`<div style="border-top:1px solid var(--linea);margin-top:10px;padding-top:6px"><label>Nombre</label><input id="up-nombre-${uid}" value="${pf.nombre||''}">${formPermisosHTML('up'+uid.replace(/-/g,''),pf)}<button class="btn chico" id="upermok" data-uid="${uid}" style="margin-top:10px">Guardar permisos</button></div>`;
}
async function guardarPermisos(uid){
  const pref='up'+uid.replace(/-/g,''); const p=leerPermisos(pref); const nombre=($('up-nombre-'+uid)||{}).value||'';
  try{ const{error}=await sb.from('perfiles').update({nombre:nombre.trim(),rol:p.rol,permisos:p.permisos,vueltas:p.vueltas}).eq('id',uid); if(error)throw new Error(error.message); toast('Permisos guardados ✓ (aplican cuando el usuario recargue)'); pintarUsuarios(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function crearUsuario(){
  const email=$('uemail').value.trim(),password=$('upass').value,nombre=$('unombre').value.trim();
  if(!email||password.length<6){toast('Email y contraseña de 6 o más');return;}
  const p=leerPermisos('un');
  try{
    const r=await apiUsuarios({accion:'crear',email,password});
    const id=r&&r.id;
    if(id){ await new Promise(res=>setTimeout(res,600)); const{error}=await sb.from('perfiles').upsert({id,email:email.toLowerCase(),nombre:nombre||email.split('@')[0],rol:p.rol,permisos:p.permisos,vueltas:p.vueltas},{onConflict:'id'}); if(error) toast('Usuario creado, pero no pude guardar el rol: '+error.message); }
    toast('Usuario creado ✓'); pintarUsuarios();
  }catch(e){toast(e.message||e);}
}
async function cambiarClave(id,email){
  const password=prompt('Nueva contraseña para '+email+' (mín. 6):'); if(password===null)return;
  if(password.length<6){toast('Mínimo 6 caracteres');return;}
  try{ await apiUsuarios({accion:'clave',id,password}); toast('Clave cambiada ✓'); }catch(e){toast(e.message||e);}
}
async function bloquearUsuario(id,email,bloqueado){
  if(!confirm((bloqueado?'¿Desbloquear a ':'¿Bloquear a ')+email+'?'))return;
  try{ await apiUsuarios({accion:'bloquear',id,bloquear:!bloqueado}); toast(bloqueado?'Desbloqueado':'Bloqueado'); pintarUsuarios(); }catch(e){toast(e.message||e);}
}
async function borrarUsuario(id,email){
  if(!confirm('¿Borrar definitivamente a '+email+'? No va a poder entrar más.'))return;
  try{ await apiUsuarios({accion:'borrar',id}); toast('Borrado'); pintarUsuarios(); }catch(e){toast(e.message||e);}
}

/* ------- VERIFICAR CÁLCULOS: app (JS) vs base (SQL) con los datos reales ------- */
async function verificarCalculos(){
  const box=$('uverif-res'); if(box) box.innerHTML='<div class="mini">Comparando…</div>';
  try{
    const hoy=hoyISO(), ci=cierreISO();
    const ids=C.map(c=>c.id), data=[]; // de a 40: la vista calcula todo en la base y con muchos juntos se pasa del tiempo máximo
    for(let i=0;i<ids.length;i+=40){ const r=await sb.from('v_saldos').select('id,saldo_hoy,saldo_cierre,tapa_via_distribuidora').in('id',ids.slice(i,i+40)); if(r.error) throw new Error(r.error.message); data.push(...r.data); if(box) box.innerHTML=`<div class="mini">Comparando… ${data.length} de ${ids.length}</div>`; }
    const dif=[]; let tapaJS=0, tapaSQL=0;
    (data||[]).forEach(r=>{ const c=C.find(x=>x.id===r.id); if(!c) return;
      const a=saldoDe(c,hoy), b=saldoDe(c,ci), t=devengoDe(c,'S',hoy); tapaJS+=t; tapaSQL+=Number(r.tapa_via_distribuidora)||0;
      const d=[]; if(Math.abs(a-r.saldo_hoy)>1) d.push('hoy: app '+fmt(a)+' · base '+fmt(r.saldo_hoy)); if(Math.abs(b-r.saldo_cierre)>1) d.push('al '+fecha(ci)+': app '+fmt(b)+' · base '+fmt(r.saldo_cierre)); if(Math.abs(t-(Number(r.tapa_via_distribuidora)||0))>1) d.push('tapa S: app '+fmt(t)+' · base '+fmt(r.tapa_via_distribuidora));
      if(d.length) dif.push(`<div class="mov"><span class="t"><b>${c.d}</b> <span class="mini">Nº ${c.id}</span><br><span class="mini">${d.join(' · ')}</span></span></div>`); });
    const n=(data||[]).length;
    box.innerHTML=dif.length?`<div class="aviso">✗ ${dif.length} de ${n} clientes no coinciden. Pasale esta lista a Claude.</div>${dif.join('')}`:`<div class="ok-msg">✓ Coinciden los ${n} clientes: saldo a hoy, saldo al ${fecha(ci)} y tapa repartida (${fmt(tapaJS)}).</div>`;
  }catch(e){ if(box) box.innerHTML='<div class="aviso">No pude verificar: '+((e&&e.message)||e)+'</div>'; }
}
