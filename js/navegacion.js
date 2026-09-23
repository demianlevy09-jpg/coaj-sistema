// COHAJ Sistema — navegación y permisos por rol
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- navegación ------- */
const VISTAS=['inicio','clientes','caja','precios','novedades','dist','reparto','ventas','stock','compras','ficha','usuarios'];
function ver(v){
  if(PERFIL&&v!=='ficha'&&v!=='usuarios'&&!puede(v)){ v=primeraVista(); }
  if(v==='ficha'&&PERFIL&&!puede('clientes')){ v=primeraVista(); }
  if(v!=='ficha'){try{history.replaceState(null,'','#'+v);}catch(_){}}
  VISTAS.forEach(x=>$('v-'+x).hidden=(x!==v));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===v));
  window.scrollTo(0,0);
  return v; // la vista que quedó (si no tenía permiso, otra)
}


/* ------- PERMISOS (v49): roles y secciones por usuario ------- */
const SECCIONES=[['inicio','Inicio'],['clientes','Clientes y cuentas corrientes'],['caja','Caja'],['reparto','Reparto'],['ventas','Ventas'],['stock','Stock'],['compras','Compras e ingresos'],['novedades','Novedades'],['precios','Precios'],['dist','Distribuidores']];
const ROLES={
  admin:{n:'Administrador',d:'Todo, incluidos usuarios, backup y ajustes',p:null},
  operador:{n:'Operador',d:'Todas las secciones; no administra usuarios',p:SECCIONES.map(s=>s[0])},
  canillita:{n:'Canillita',d:'Atiende el puesto: cobros, caja, ventas, stock, novedades y reparto',p:['inicio','clientes','caja','ventas','stock','novedades','reparto']},
  repartidor:{n:'Repartidor',d:'Solo Reparto, y solo sus vueltas',p:['reparto']},
  personalizado:{n:'Personalizado',d:'Elegís sección por sección',p:[]}
};
function permisosDe(pf){ pf=pf||PERFIL||{}; if(pf.activo===false) return []; if(pf.rol==='admin') return SECCIONES.map(s=>s[0]); if(pf.rol==='personalizado') /* igual que tiene_permiso() en la base: los permisos sueltos solo cuentan para 'personalizado' */ return SECCIONES.map(s=>s[0]).filter(k=>pf.permisos&&pf.permisos[k]); const r=ROLES[pf.rol]; return r&&r.p?r.p:ROLES.operador.p; }
function puede(sec){ if(!PERFIL) return true; if(sec==='usuarios') return esAdmin(); return permisosDe(PERFIL).includes(sec); }
function primeraVista(){ const p=permisosDe(PERFIL); return p[0]||'inicio'; }
function misVueltas(){ return (PERFIL&&PERFIL.rol!=='admin'&&Array.isArray(PERFIL.vueltas)&&PERFIL.vueltas.length)?PERFIL.vueltas.map(esc):null; } // escapadas, como los nombres de VUELTAS
function aplicarPermisos(){
  document.querySelectorAll('.tab[data-v]').forEach(t=>{ t.hidden=!puede(t.dataset.v); });
  const hoy=location.hash.slice(1);
  if(!puede('inicio')||(hoy&&VISTAS.includes(hoy)&&!puede(hoy.replace(/^ficha-.*/,'clientes')))){ const v=primeraVista(); ver(v); const p=PINTAR[v]; if(p&&v!=='inicio')p(); }
}
function nombreRol(pf){ const r=ROLES[(pf||{}).rol]; return r?r.n:((pf||{}).rol||'operador'); }
