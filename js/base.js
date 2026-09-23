// COHAJ Sistema — variables globales y utilidades (fechas, días, formato)
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
window.addEventListener('error',e=>{const l=$('lat');if(l)l.textContent='⚠ '+(e.message||'error');});

let db=null, C=[], PRECIOS=[], CAJAH=[], LISTAS={medios:[],conceptos:[],tipos:[]};
const CAJAS_FIJAS=['Efectivo','Caja Grande','Transferencia','Mercadopago More']; // se muestran siempre en Inicio y Caja, aunque estén en $0
function saldosCaja(){ const pm={}; CAJAS_FIJAS.filter(m=>LISTAS.medios.includes(m)||m==='Efectivo').forEach(m=>pm[m]=0); LIVE.caja.forEach(r=>{pm[r.m||'Sin medio']=(pm[r.m||'Sin medio']||0)+(r.ing||0)-(r.egr||0);}); return Object.entries(pm).filter(([m,v])=>Math.abs(v)>0.5||CAJAS_FIJAS.includes(m)); }
const CONCEPTOS_CAJA=['Cobro a cliente','Venta mostrador','Venta de stock','Compra de mercadería','Pago a proveedor','Cobro distribuidora','Pago a distribuidora','Pago a empleado','Gasto','Retiro','Cambio inicial','Transferencia entre cuentas','Otro'];
let LIVE={movs:[],caja:[],precios:[],novedades:[],dist:[],feriados:[],devol:[],reparto:[],vueltas:[],prov:[],prod:[],stock:[],provmov:[],pubdist:[],dists:[]};
let FER=new Set(); // fechas ISO cargadas como feriado
let FERP={}; // fecha -> lista normalizada de publicaciones que NO salen ese día (vacía/null = no sale nada)
// ¿Sale esta publicación ese día? (feriado total: no; feriado parcial: solo si no está en la lista de "no salen")
function feriadoSale(dia,pub){ if(!FER.has(dia)) return true; const sp=FERP[dia]; if(sp==null) return false; return !sp.includes(norm(pub)); }
const altaDe=x=>x[6]==='app'?(x[4]||'').slice(0,10):undefined; // suscripciones creadas desde la app: las suspensiones anteriores a su alta no las afectan
function feriadoTotal(dia){ return FER.has(dia)&&FERP[dia]==null; }
let CONFIG={comision:32}; // % del precio de tapa que le corresponde a COHAJ por lo repartido a suscriptores (dato de Demian 09/09: 32%)
let DISTH=[];
const $=id=>document.getElementById(id);
const fmt=n=>'$'+Math.abs(n).toLocaleString('es-AR',{maximumFractionDigits:0});
const esc=v=>typeof v==='string'?v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):v;
const unesc=v=>typeof v==='string'?v.replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&'):v;
const escObj=o=>{ if(!o||typeof o!=='object') return o; for(const k in o){ const v=o[k]; if(typeof v==='string') o[k]=esc(v); else if(Array.isArray(v)) o[k]=v.map(x=>typeof x==='string'?esc(x):x); } return o; };
const unescObj=o=>{ if(!o||typeof o!=='object') return o; for(const k in o){ const v=o[k]; if(typeof v==='string') o[k]=unesc(v); else if(Array.isArray(v)) o[k]=v.map(x=>typeof x==='string'?unesc(x):x); } return o; };
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const hoyISO=()=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(_){return new Date().toISOString().slice(0,10);}};
const fecha=s=>{if(!s)return'';const[a,m,d]=s.slice(0,10).split('-');return d+'/'+m+'/'+a.slice(2);};
const DIAS=['Lu','Ma','Mi','Ju','Vi','Sa','Do','Fer']; // 7 = "Fer": solo los días feriados (con diario)
const DIAS7=DIAS.slice(0,7);
// Días de una suscripción a partir de su texto ("Sábado y domingo", "Miércoles, Jueves, Viernes, Sábado", "Lu Ma Vi", "Feriados"...). null si no se entiende ("Sin día determinado").
const FD_CACHE={};
function FD(fr){
  const k=norm(fr||'').trim(); if(!k) return null;
  if(FDIAS[k]) return FDIAS[k];
  if(k in FD_CACHE) return FD_CACHE[k];
  const one={'lu':0,'lun':0,'lunes':0,'ma':1,'mar':1,'martes':1,'mi':2,'mie':2,'miercoles':2,'ju':3,'jue':3,'jueves':3,'vi':4,'vie':4,'viernes':4,'sa':5,'sab':5,'sabado':5,'sabados':5,'do':6,'dom':6,'domingo':6,'domingos':6,'fer':7,'feriado':7,'feriados':7};
  const toks=k.replace(/\b(y|e)\b/g,',').split(/[,\s]+/).filter(Boolean);
  const out=[]; let ok=toks.length>0;
  toks.forEach(t=>{ const d=one[t]; if(d==null){ok=false;return;} if(!out.includes(d)) out.push(d); });
  FD_CACHE[k]=ok?out.sort((a,b)=>a-b):null; return FD_CACHE[k];
}
// ¿Le toca a esta suscripción (days) el día `dia` (weekday wd)? Incluye el caso "Fer": feriado cargado con diario.
function tocaDia(days,wd,dia){ if(!days) return false; if(days.includes(wd)) return true; return days.includes(7)&&FER.has(dia)&&!feriadoTotal(dia); }
const FDIAS={'lunes':[0],'martes':[1],'miercoles':[2],'jueves':[3],'viernes':[4],'sabado':[5],'domingo':[6],'feriados':[7],'feriado':[7],'solo feriados':[7],'dias feriados':[7],'todos los dias':[0,1,2,3,4,5,6],'de lunes a viernes':[0,1,2,3,4],'lunes a viernes':[0,1,2,3,4],'de lunes a sabado':[0,1,2,3,4,5],'lunes a sabado':[0,1,2,3,4,5],'sabado y domingo':[5,6],'lunes y jueves':[0,3],'lunes, miercoles y viernes':[0,2,4],'martes y viernes':[1,4],'martes y jueves':[1,3],'jueves y sabado':[3,5]};
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('ver');setTimeout(()=>t.classList.remove('ver'),2200);}
const dget=snap=>(snap&&typeof snap.data==='function')?snap.data():snap;
