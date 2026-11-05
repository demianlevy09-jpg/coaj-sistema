// COHAJ Sistema — pantalla Inicio
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- INICIO (v82, compacto desde v85, cuatro bloques desde v98) -------
   Cuatro respuestas: quién me debe, qué tengo (plata y mercadería), qué debo (y a quién), y lo último cargado.
   Abajo, solo lo que tiene algo (nada de tarjetas en $0) y las últimas cargas. */
const signo=v=>(v<-0.5?'−':'')+fmt(v);
function filaIni(txt,val,extra){ return `<div class="p-fila"><span>${txt}</span><b${extra?' class="'+extra+'"':''}>${val}</b></div>`; }
function fechaLarga(iso){ const d=new Date(iso+'T12:00:00'); const t=d.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}); return t.charAt(0).toUpperCase()+t.slice(1); }
function pintarInicio(){
  /* v85: tarjetas chicas como Oficina: título, número y una línea. El detalle está en cada pestaña. */
  const hoy=hoyISO(), ci=cierreISO();
  const sal=C.map(c=>({c,h:saldoDe(c,hoy),m:saldoDe(c,ci)}));
  const deudH=sal.filter(x=>x.h>0.5), deudM=sal.filter(x=>x.m>0.5), fav=sal.filter(x=>x.h<-0.5);
  const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
  const cajaHoy=LIVE.caja.filter(r=>(r.f||'').startsWith(hoy));
  const netoHoy=cajaHoy.reduce((n,r)=>n+(r.ing||0)-(r.egr||0),0);
  const cajas=saldosCaja();
  const sp=new Set(); C.forEach(c=>sinPrecio(c).forEach(x=>sp.add(x[0])));
  const ult=[...LIVE.movs.map(r=>({...r,_t:'mov'})),...LIVE.caja.map(r=>({...r,_t:'caja'}))].sort((a,b)=>(b.ts||'').localeCompare(a.ts||'')).slice(0,8);
  const dists=(DISTS.length?DISTS:[{id:1,nombre:'Distribuidora'}]);
  const card=(tit,num,sub,click,cls)=>`<div class="kpi${click?' click':''}${cls?' '+cls:''}"${click?` onclick="${click}"`:''}><i>${tit}</i><b>${num}</b>${sub?`<i>${sub}</i>`:''}</div>`;
  /* v98: cuatro bloques, cada uno responde una sola pregunta. "Me deben" (clientes y la distribuidora de diarios) se separó de
     "Tengo" (plata en las cajas y mercadería), y en "Debo" cada proveedor va con su tarjeta y qué es lo que se le debe:
     Urban Point (productos) no es la distribuidora de diarios y revistas. */
  const hacer=[], deben=[], tengo=[], debo=[], hoyTxt=[];
  if(sp.size&&puede('precios')) hacer.push(card('Publicaciones sin precio',String(sp.size),[...sp].slice(0,3).join(', ')+(sp.size>3?'…':''),"irTab('precios')",'amb'));
  if(STOCK_OK&&URBAN_OK&&puede('compras')){ // v99: entregas de Urban Point que hay que revisar y marcar como recibidas
    const pend=usPendientes(); if(pend.length){ const docs=usDocs(pend); hacer.push(card('Entregas de Urban Point por recibir',String(docs.length),`${pend.length} productos · ${pend.reduce((n,l)=>n+l.qty,0)} unidades · revisá y marcá recibido`,"CTIPO='urbanpoint';irTab('compras')",'amb')); }
    const venc=usVencen(7); if(venc.length) hacer.push(card('Consignación por devolver',String(venc.length),'vence antes del '+fecha(venc[venc.length-1].vence),"CTIPO='urbanpoint';irTab('compras')",'amb'));
  }
  if(puede('clientes')){
    deben.push(card('Tus clientes',fmt(sum(deudH,'h')),`${deudH.length} clientes · al cierre ${fmt(sum(deudM,'m'))}`,"irClientes('deudores')"));
    if(fav.length) debo.push(card('A clientes con saldo a favor',fmt(sum(fav,'h')),`${fav.length} ${fav.length===1?'cliente':'clientes'} pagaron de más`,"irClientes('favor')"));
  }
  if(puede('caja')) cajas.forEach(([m,v])=>tengo.push(card(m,signo(v),'',"irTab('caja')",v<-0.5?'rojo':'')));
  if(puede('dist')) dists.forEach(d=>{ const s=cuentaDist(d.id,hoy).saldo, nom=/diario/i.test(d.nombre)?d.nombre:d.nombre+' (diarios y revistas)';
    if(s<-0.5) deben.push(card(nom,fmt(-s),'comisión por repartir a sus suscriptores, menos los diarios que te vende',`DSEL=${d.id};irTab('dist')`));
    else if(s>0.5) debo.push(card('A '+nom,fmt(s),'liquidaciones de diarios menos tu comisión',`DSEL=${d.id};irTab('dist')`,'rojo'));
    else tengo.push(card(nom,fmt(0),'cuenta a mano',`DSEL=${d.id};irTab('dist')`)); });
  if(STOCK_OK){
    const act=LIVE.prod.filter(p=>p.activo!==false);
    if(puede('compras')) LIVE.prov.filter(p=>p.activo!==false).forEach(p=>{ const s=saldoProv(p.id); if(s>0.5) debo.push(card('A '+p.nombre,fmt(s),p.pct>0?'revistas y coleccionables vendidos en consignación':'productos vendidos en consignación y compras a cuenta',"CTIPO='proveedores';irTab('compras')",'rojo')); });
    const val=act.reduce((n,p)=>n+stockDe(p.id).propio*(p.costo||0),0);
    if(val>0.5&&puede('stock')) tengo.push(card('Mercadería propia',fmt(val),'al costo · ya es tuya',"irTab('stock')"));
    if(puede('stock')){ const porProv={}; act.forEach(p=>{ const c=stockDe(p.id).consig; Object.keys(c).forEach(k=>{ const q=c[k]; if(q>0){ porProv[k]=porProv[k]||{u:0,v:0}; porProv[k].u+=q; porProv[k].v+=q*((p.costo)||0); } }); });
      Object.keys(porProv).forEach(k=>{ const pv=provDe(Number(k)); tengo.push(card('En consignación de '+(pv?pv.nombre:'otros'),fmt(porProv[k].v),`${porProv[k].u} unidades al costo · se le paga al vender o se devuelve`,"irTab('stock')")); }); }
    const vh=LIVE.stock.filter(m=>m.tipo==='venta'&&m.f===hoy);
    if(vh.length&&puede('ventas')) hoyTxt.push('ventas '+fmt(vh.reduce((n,m)=>n-m.qty*(m.precio||0),0)));
  }
  if(puede('caja')&&cajaHoy.length) hoyTxt.push('caja '+(netoHoy<-0.5?'−':'+')+fmt(netoHoy)+' en '+cajaHoy.length+' mov.');
  const bloque=(tit,cls,arr)=>arr.length?`<div class="ini-sec"><h2 class="sec ${cls}"><span class="dot"></span>${tit}</h2><div class="kpis">${arr.join('')}</div></div>`:'';
  $('v-inicio').innerHTML=`
  <div class="ini-head">
    <div class="hola"><h1>Hola${nombreUsuario()?', '+nombreUsuario():''}</h1><div class="mini">${fechaLarga(hoy)}${hoyTxt.length?' · hoy: '+hoyTxt.join(' · '):''}</div></div>
    <div class="ini-acc">${puede('clientes')?'<button class="btn chico" id="qcobrar">Cobrar a un cliente</button>':''}${puede('caja')?'<button class="btn chico sec" id="qcaja">Movimiento de caja</button>':''}</div>
  </div>
  ${bloque('Para hacer','s-amb',hacer)}${bloque('Me deben','s-ok',deben)}${bloque('Tengo','s-ok',tengo)}${bloque('Debo','s-rojo',debo)}
  ${puede('caja')||puede('clientes')?`<h2 class="sec s-neu"><span class="dot"></span>Últimas cargas</h2>
  <div class="card lista-ult">${ult.length?ult.map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r._t==='mov'?(r.tipo+' · '+nomCli(r.cli)):((r.c||'')+(r.d?' · '+r.d:''))}</span>${(()=>{const v=r.imp!=null?r.imp:((r.ing||0)-(r.egr||0));return `<span class="m">${v<0?'−':''}${fmt(v)}</span>`;})()}</div>`).join(''):'<div class="mini" style="padding:6px 0">Todavía no cargaste nada. Los cobros y movimientos de caja van a aparecer acá.</div>'}</div>`:''}`;
}
function nombreUsuario(){
  let n=(PERFIL&&PERFIL.nombre)||(USUARIO&&USUARIO.email?USUARIO.email.split('@')[0]:'')||'';
  n=n.replace(/[0-9._-]+$/,'');
  return n?n.charAt(0).toUpperCase()+n.slice(1):'';
}
function irTab(v){const t=document.querySelector('.tab[data-v='+v+']');if(t)t.click();}
function irClientes(f){FSEL.clear();if(f)FSEL.add(f);ver('clientes');pintarClientes();}
function nomCli(id){const c=C.find(x=>x.id===id);return c?(c.d||('Nº '+id)):('Nº '+id);}
