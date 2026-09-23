// COHAJ Sistema — pantalla Inicio
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- INICIO (v82) -------
   Tres respuestas grandes arriba: cuánto te deben, cuánta plata tenés, cómo estás con cada distribuidor.
   Abajo, solo lo que tiene algo (nada de tarjetas en $0) y las últimas cargas. */
const signo=v=>(v<-0.5?'−':'')+fmt(v);
function filaIni(txt,val,extra){ return `<div class="p-fila"><span>${txt}</span><b${extra?' class="'+extra+'"':''}>${val}</b></div>`; }
function fechaLarga(iso){ const d=new Date(iso+'T12:00:00'); const t=d.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}); return t.charAt(0).toUpperCase()+t.slice(1); }
function pintarInicio(){
  const hoy=hoyISO(), ci=cierreISO();
  const sal=C.map(c=>({c,h:saldoDe(c,hoy),m:saldoDe(c,ci)}));
  const deudH=sal.filter(x=>x.h>0.5), deudM=sal.filter(x=>x.m>0.5), fav=sal.filter(x=>x.h<-0.5);
  const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
  const cajaHoy=LIVE.caja.filter(r=>(r.f||'').startsWith(hoy));
  const netoHoy=cajaHoy.reduce((n,r)=>n+(r.ing||0)-(r.egr||0),0);
  const cajas=saldosCaja(), totCaja=cajas.reduce((n,[,v])=>n+v,0);
  const sp=new Set(); C.forEach(c=>sinPrecio(c).forEach(x=>sp.add(x[0])));
  const ult=[...LIVE.movs.map(r=>({...r,_t:'mov'})),...LIVE.caja.map(r=>({...r,_t:'caja'}))].sort((a,b)=>(b.ts||'').localeCompare(a.ts||'')).slice(0,8);
  const dists=(DISTS.length?DISTS:[{id:1,nombre:'Distribuidora'}]);
  const panelDist=d=>{ const k=cuentaDist(d.id,hoy); const s=k.saldo;
    const est=s<-0.5?'Te debe':(s>0.5?'Le debés':'Están a mano');
    return `<section class="panel click" onclick="DSEL=${d.id};irTab('dist')">
      <div class="p-tit">${d.nombre}</div>
      <div class="p-num${s>0.5?' debe':''}"><small>${est}</small> ${fmt(s)}</div>
      <div class="p-sub">Cuenta desde el ${fecha(DEV0)}</div>
      <div class="p-filas">
        ${filaIni('Comisión por repartir a sus suscriptores','+'+fmt(k.comision),'favor')}
        ${filaIni('Diarios para tus clientes (al costo)','−'+fmt(k.costo))}
        ${k.devol?filaIni('Devoluciones que te acredita','+'+fmt(k.devol),'favor'):''}
        ${Math.abs(k.movs)>0.5?filaIni('Pagos y otros movimientos',(k.movs>0?'−':'+')+fmt(k.movs)):''}
      </div>
      <span class="p-link">Ver mes por mes</span>
    </section>`; };
  const extras=[];
  if(fav.length) extras.push(`<button class="x-fila" onclick="irClientes('favor')"><span>Saldos a favor de clientes<small>${fav.length} ${fav.length===1?'cliente te pagó':'clientes te pagaron'} de más o por adelantado</small></span><b>${fmt(sum(fav,'h'))}</b></button>`);
  if(STOCK_OK){
    const dp=LIVE.prov.map(p=>saldoProv(p.id)).filter(x=>x>0.5);
    if(dp.length) extras.push(`<button class="x-fila" onclick="CTIPO='proveedores';irTab('compras')"><span>Debés a proveedores<small>${dp.length} con saldo</small></span><b class="debe">${fmt(dp.reduce((a,b)=>a+b,0))}</b></button>`);
    const vh=LIVE.stock.filter(m=>m.tipo==='venta'&&m.f===hoy);
    if(vh.length) extras.push(`<button class="x-fila" onclick="irTab('ventas')"><span>Ventas de hoy<small>${vh.reduce((n,m)=>n-m.qty,0)} unidades</small></span><b>${fmt(vh.reduce((n,m)=>n-m.qty*(m.precio||0),0))}</b></button>`);
    const val=LIVE.prod.filter(p=>p.activo!==false).reduce((n,p)=>n+stockDe(p.id).propio*(p.costo||0),0);
    if(val>0.5) extras.push(`<button class="x-fila" onclick="irTab('stock')"><span>Stock propio<small>valuado al costo</small></span><b>${fmt(val)}</b></button>`);
  }
  $('v-inicio').innerHTML=`
  <div class="ini-head">
    <div class="hola"><h1>Hola${nombreUsuario()?', '+nombreUsuario():''}</h1><div class="mini">${fechaLarga(hoy)}</div></div>
    <div class="ini-acc"><button class="btn" id="qcobrar">Cobrar a un cliente</button><button class="btn sec" id="qcaja">Movimiento de caja</button></div>
  </div>
  ${sp.size?`<div class="aviso click" onclick="irTab('precios')"><b>${sp.size} ${sp.size===1?'publicación no tiene':'publicaciones no tienen'} precio cargado</b> y no se están cobrando: ${[...sp].slice(0,4).join(', ')}${sp.size>4?'…':''}. Cargalas en Precios.</div>`:''}
  <div class="paneles">
    <section class="panel click" onclick="irClientes('deudores')">
      <div class="p-tit">Te deben tus clientes</div>
      <div class="p-num">${fmt(sum(deudH,'h'))}</div>
      <div class="p-sub">${deudH.length} ${deudH.length===1?'cliente':'clientes'} con deuda, a hoy</div>
      <div class="p-filas">
        ${filaIni('Al cierre de '+etiquetaMes(ci).split(' ')[0],fmt(sum(deudM,'m')))}
        ${filaIni('Sumado en '+etiquetaMes(hoy).split(' ')[0]+' (sin cobrar)',fmt(sum(deudH,'h')-sum(deudM,'m')))}
      </div>
      <span class="p-link">Ver deudores</span>
    </section>
    <section class="panel click" onclick="irTab('caja')">
      <div class="p-tit">Plata en caja</div>
      <div class="p-num${totCaja<-0.5?' debe':''}">${signo(totCaja)}</div>
      <div class="p-sub">${cajaHoy.length?('Hoy '+(netoHoy<0?'salieron ':'entraron ')+fmt(netoHoy)+' en '+cajaHoy.length+' '+(cajaHoy.length===1?'movimiento':'movimientos')):'Hoy no hubo movimientos'}</div>
      <div class="p-filas">${cajas.filter(([,v])=>Math.abs(v)>0.5).map(([m,v])=>filaIni(m,signo(v),v<-0.5?'debe':'')).join('')||'<div class="p-sub">Todas las cajas en $0</div>'}</div>
      <span class="p-link">Ir a Caja</span>
    </section>
    ${dists.map(panelDist).join('')}
  </div>
  ${extras.length?`<h2 class="sec">También</h2><div class="x-lista">${extras.join('')}</div>`:''}
  <h2 class="sec">Últimas cargas</h2>
  <div class="card">${ult.length?ult.map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r._t==='mov'?(r.tipo+' · '+nomCli(r.cli)):((r.c||'')+(r.d?' · '+r.d:''))}</span>${(()=>{const v=r.imp!=null?r.imp:((r.ing||0)-(r.egr||0));return `<span class="m">${v<0?'−':''}${fmt(v)}</span>`;})()}</div>`).join(''):'<div class="mini" style="padding:6px 0">Todavía no cargaste nada. Los cobros y movimientos de caja van a aparecer acá.</div>'}</div>`;
}
function nombreUsuario(){
  let n=(PERFIL&&PERFIL.nombre)||(USUARIO&&USUARIO.email?USUARIO.email.split('@')[0]:'')||'';
  n=n.replace(/[0-9._-]+$/,'');
  return n?n.charAt(0).toUpperCase()+n.slice(1):'';
}
function irTab(v){const t=document.querySelector('.tab[data-v='+v+']');if(t)t.click();}
function irClientes(f){FSEL.clear();if(f)FSEL.add(f);ver('clientes');pintarClientes();}
function nomCli(id){const c=C.find(x=>x.id===id);return c?(c.d||('Nº '+id)):('Nº '+id);}
