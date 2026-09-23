// COHAJ Sistema — cálculos de plata: precios, devengo, saldos, consumo del mes, distribuidores
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- precios ------- */
let PIDX={};
function armarPIDX(){
  PIDX={};
  [...PRECIOS,...LIVE.precios].forEach(p=>{
    const k=norm(p.pub)+'|'+(p.dia==null?'x':p.dia);
    (PIDX[k]=PIDX[k]||[]).push(p);
  });
  Object.values(PIDX).forEach(v=>v.sort((a,b)=>(a.desde||'').localeCompare(b.desde||'')));
  SCACHE={};
}
function precioDe(pub,wd,dia){
  for(const k of [norm(pub)+'|'+wd,norm(pub)+'|x']){
    const v=PIDX[k]; if(!v) continue;
    let best=null;
    for(const p of v){ if(p.desde<=dia) best=p.precio; else break; }
    if(best) return best;
  }
  return null;
}
/* ------- devengo diario (desde 01/09/2026; la liquidación del 02/09 cubrió agosto) ------- */
const DEV0='2026-09-01';
// ¿La suscripción x está vigente ese día? x[3] es 'V' (sin fecha de fin) o la fecha `hasta`, EXCLUSIVA: ese día ya no recibe.
// Antes de v82 las cerradas se ignoraban del todo, aunque hubieran estado vigentes parte del mes (se perdía lo repartido antes del cierre).
function vigenteEn(x,dia){ const desde=(x[4]||'').slice(0,10); if(desde&&desde>dia) return false; return x[3]==='V'||String(x[3]).slice(0,10)>dia; }
// ¿Estuvo vigente algún día desde `desde` en adelante? (para no recorrer las suscripciones que cerraron antes)
function vigenteAlgunDia(x,desde){ return x[3]==='V'||String(x[3]).slice(0,10)>desde; }
// dias (opcional): días de la suscripción que se está evaluando; si no viene, se usa el día de la semana de `dia`.
// Una novedad con `dias` cargados solo afecta a esos días (ej: suspender LA NACION solo los miércoles).
// desdeAlta (opcional): si se evalúa un alta cargada acá, las suspensiones/bajas anteriores a su fecha no la afectan (son de la suscripción vieja).
// Un Alta nunca "reactiva" una suscripción suspendida: solo Reanudación lo hace.
function suspendida(cli,titulo,dia,dias,desdeAlta){
  let sus=false;
  const wd=(new Date(dia+'T12:00:00').getDay()+6)%7;
  const aplicaDias=n=>!n.dias||!n.dias.length||(dias&&dias.length?n.dias.some(d=>dias.includes(d)):n.dias.includes(wd));
  const nvs=LIVE.novedades.filter(n=>n.cli===cli&&n.tipo!=='Alta'&&(!desdeAlta||(n.desde||'')>=desdeAlta)&&(!n.pub||norm(titulo).includes(norm(n.pub))||norm(n.pub).includes(norm(titulo)))&&aplicaDias(n)).sort((a,b)=>(a.desde||'').localeCompare(b.desde||''));
  for(const n of nvs){
    if((n.desde||'')<=dia){
      if(n.tipo==='Suspensión'||n.tipo==='Baja'){ if(!n.hasta||n.hasta>=dia) sus=true; else sus=false; }
      if(n.tipo==='Reanudación') sus=false;
    }
  }
  return sus;
}
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
let SCACHE={};
// Modo de saldo: 'vivo' (hasta hoy) o 'cierre' (hasta el último cierre mensual = fin del mes anterior)
let MODO_SALDO='vivo', CIERRE_SEL=''; try{MODO_SALDO=localStorage.getItem('modoSaldo')||'vivo';CIERRE_SEL=localStorage.getItem('cierreSel')||'';}catch(_){}
const PRIMER_CIERRE='2026-08-31'; // primer mes vencido que existe en el sistema
function ultimoCierreISO(){const h=hoyISO();const d=new Date(h+'T12:00:00');d.setDate(0);return d.toISOString().slice(0,10);} // último día del mes anterior (según fecha de Argentina)
function cierresDisponibles(){ // del primer cierre al último mes vencido, más reciente primero
  const out=[]; let d=new Date(ultimoCierreISO()+'T12:00:00');
  while(d.toISOString().slice(0,10)>=PRIMER_CIERRE){ out.push(d.toISOString().slice(0,10)); d=new Date(d.getFullYear(),d.getMonth(),0,12); }
  return out;
}
function cierreISO(){ const disp=cierresDisponibles(); return (CIERRE_SEL&&disp.includes(CIERRE_SEL))?CIERRE_SEL:(disp[0]||ultimoCierreISO()); } // cierre elegido (por defecto, el último mes vencido)
function hastaSaldo(){return MODO_SALDO==='cierre'?cierreISO():hoyISO();}
function setModoSaldo(m,cierre){MODO_SALDO=m;if(cierre)CIERRE_SEL=cierre;try{localStorage.setItem('modoSaldo',m);localStorage.setItem('cierreSel',CIERRE_SEL);}catch(_){}pintarInicio();pintarClientes();}
function etiquetaMes(iso){const d=new Date(iso+'T12:00:00');return MESES[d.getMonth()]+' '+d.getFullYear();}
function toggleSaldoHTML(){
  const disp=cierresDisponibles(), sel=cierreISO();
  return `<div class="segm"><button class="${MODO_SALDO==='vivo'?'on':''}" onclick="setModoSaldo('vivo')">En vivo (hoy)</button><button class="${MODO_SALDO==='cierre'?'on':''}" onclick="setModoSaldo('cierre')">Mes vencido</button></div>
  <select id="selcierre" class="${MODO_SALDO==='cierre'?'':'apagado'}" style="display:inline-block;width:auto;margin:6px 0 8px 8px;padding:6px 10px;font-size:13px" onchange="setModoSaldo('cierre',this.value)">${disp.map(x=>`<option value="${x}"${x===sel?' selected':''}>al ${fecha(x)} · ${etiquetaMes(x)}</option>`).join('')}</select>`;
}
function devengoDe(c,tipo,hasta){
  tipo=tipo||'C';
  hasta=hasta||hoyISO();
  const ck='d'+tipo+c.id+'|'+hasta;
  if(SCACHE[ck]!=null) return SCACHE[ck];
  let tot=0; const porPub={};
  const items=c.subs.filter(x=>x[2]===tipo&&vigenteAlgunDia(x,DEV0)).map(x=>({t:x[0],days:FD(x[1]),desde:(x[4]||'').slice(0,10),hasta:x[3]==='V'?'':x[3].slice(0,10),q:Math.abs(x[5])||1,alta:altaDe(x)}));
  if(items.length){
    const hoy=hasta;
    let d=new Date(DEV0+'T12:00:00');
    while(d.toISOString().slice(0,10)<=hoy){
      const dia=d.toISOString().slice(0,10);
      const wd=(d.getDay()+6)%7;
      if(feriadoTotal(dia)){d.setDate(d.getDate()+1);continue;}
      for(const x of items){
        if(!tocaDia(x.days,wd,dia)) continue;
        if(x.desde&&x.desde>dia) continue;
        if(x.hasta&&x.hasta<=dia) continue; // hasta = primer día que ya no recibe (exclusivo, como NewsPaper y la base)
        if(!feriadoSale(dia,x.t)) continue;
        if(suspendida(c.id,x.t,dia,null,x.alta)) continue;
        const p=precioDe(x.t,wd,dia);
        if(p){ tot+=p*x.q; porPub[x.t]=(porPub[x.t]||0)+p*x.q; }
      }
      d.setDate(d.getDate()+1);
    }
  }
  SCACHE[ck]=tot; SCACHE['p'+tipo+c.id+'|'+hasta]=porPub;
  return tot;
}
/* ------- saldos ------- */
function saldoDe(c,hasta){
  hasta=hasta||hastaSaldo();
  let s=c.sal+devengoDe(c,'C',hasta);
  for(const m of LIVE.movs) if(m.cli===c.id&&(m.f||'').slice(0,10)<=hasta) s+=(m.tipo==='Cobro'?-m.imp:m.imp);
  return s;
}
function sinPrecio(c){
  return c.subs.filter(x=>x[3]==='V'&&x[2]==='C'&&FD(x[1])&&!precioDe(x[0],(()=>{const dd=FD(x[1])||[0];const d0=dd.find(d=>d<7);return d0==null?0:d0;})(),hoyISO()));
}
function saldoHTML(s){
  if(s>0.5)return`<span class="monto debe">${fmt(s)}</span>`;
  if(s<-0.5)return`<span class="monto favor">${fmt(s)}</span>`;
  return`<span class="monto aldia">al día</span>`;
}

function bajaVigente(c,dia){
  dia=dia||hoyISO(); let b=false;
  LIVE.novedades.filter(n=>n.cli===c.id&&!n.pub&&(n.tipo==='Baja'||n.tipo==='Reanudación')&&(n.desde||'')<=dia).sort((x,y)=>(x.desde||'').localeCompare(y.desde||'')||(x.ts||'').localeCompare(y.ts||'')).forEach(n=>{b=(n.tipo==='Baja');});
  return b;
}
function recalcActivos(){ C.forEach(c=>{c.act=bajaVigente(c)?0:1;}); }
let DSEL=1;
function distDe(id){ return DISTS.find(d=>d.id===id); }
function nomDist(id){ const d=distDe(id); return d?d.nombre:('Distribuidor '+id); }
function pubDist(pub){ const k=norm(pub); const r=LIVE.pubdist.find(x=>norm(x.pub)===k); return r?r.dist:1; }
function devengoPubs(c,tipo,hasta){ hasta=hasta||hoyISO(); devengoDe(c,tipo,hasta); return SCACHE['p'+tipo+c.id+'|'+hasta]||{}; }
function comisionDist(id){ const d=distDe(id); return d&&typeof d.comision==='number'?d.comision:CONFIG.comision; }
/* ---- Cuenta con cada distribuidor (v82) ----
   Positivo = le debés; negativo = te debe. Todo se calcula solo desde el 01/09/2026 (DEV0), sin saldo anterior:
   + diarios que te vende para tus clientes "le cobrás vos": tapa × (100% − comisión)  (lo compra al costo y lo cobra a tapa)
   − comisión por repartir a SUS suscriptores ("vía distribuidora"): tapa × comisión
   − devoluciones de lo que no se vendió (al costo)
   ± movimientos cargados a mano (mercadería para el mostrador, pagos de un lado y del otro, créditos) */
function tapaDe(tipo,distId,hasta){ let t=0; C.forEach(c=>{const m=devengoPubs(c,tipo,hasta); for(const p in m){ if(distId==null||pubDist(p)===distId) t+=m[p]; }}); return t; }
function tapaRepartida(distId,hasta){ return tapaDe('S',distId,hasta); }   // a suscriptores de la distribuidora
function tapaPropia(distId,hasta){ return tapaDe('C',distId,hasta); }      // a clientes del puesto
function distsParaSumar(){ return DISTS.length?DISTS.map(d=>d.id):[null]; }
function comisionDevengada(distId,hasta){ if(distId==null&&DISTS.length) return DISTS.reduce((n,d)=>n+comisionDevengada(d.id,hasta),0); return tapaRepartida(distId,hasta)*(distId==null?CONFIG.comision:comisionDist(distId))/100; }
function costoDiariosPropios(distId,hasta){ if(distId==null&&DISTS.length) return DISTS.reduce((n,d)=>n+costoDiariosPropios(d.id,hasta),0); return tapaPropia(distId,hasta)*(1-(distId==null?CONFIG.comision:comisionDist(distId))/100); }
const enRango=(f,desde,hasta)=>(!desde||(f||'')>=desde)&&(!hasta||(f||'')<=hasta);
function devolucionesDist(distId,hasta,desde){ return LIVE.devol.filter(r=>(distId==null||(r.dist||1)===distId)&&enRango(r.f,desde,hasta)).reduce((n,r)=>n+(r.imp||0),0); }
function movimientosDist(distId,hasta,desde){ return LIVE.dist.filter(r=>(distId==null||(r.dist||1)===distId)&&enRango(r.f,desde,hasta)).reduce((n,r)=>n+(r.imp||0),0); }
function cuentaDist(distId,hasta){
  hasta=hasta||hoyISO();
  const pct=distId==null?CONFIG.comision:comisionDist(distId);
  const tapaS=tapaRepartida(distId,hasta), tapaC=tapaPropia(distId,hasta);
  const comision=tapaS*pct/100, costo=tapaC*(1-pct/100);
  const devol=devolucionesDist(distId,hasta), movs=movimientosDist(distId,hasta);
  return {pct,tapaS,tapaC,comision,costo,devol,movs,saldo:movs+costo-comision-devol};
}
function saldoDist(distId,hasta){ return cuentaDist(distId,hasta).saldo; }
function saldoDistribuidora(hasta){ return distsParaSumar().reduce((n,id)=>n+saldoDist(id,hasta),0); }
// Mes por mes desde septiembre 2026: lo que pasó en cada mes (no acumulado) y el saldo acumulado al final del mes.
function cuentaDistPorMes(distId){
  const hoy=hoyISO(), out=[]; let d=new Date(DEV0.slice(0,7)+'-01T12:00:00'), antes=null;
  while(d.toISOString().slice(0,7)<=hoy.slice(0,7)){
    const fin0=new Date(d.getFullYear(),d.getMonth()+1,0,12).toISOString().slice(0,10), fin=fin0<hoy?fin0:hoy;
    const a=cuentaDist(distId,fin), mes={mes:d.toISOString().slice(0,7),hasta:fin,parcial:fin<fin0,saldoAcum:a.saldo};
    ['tapaS','tapaC','comision','costo','devol','movs','saldo'].forEach(k=>mes[k]=a[k]-(antes?antes[k]:0));
    out.push(mes); antes=a; d=new Date(d.getFullYear(),d.getMonth()+1,1,12);
  }
  return out;
}
/* ------- desglose de una liquidación (reconstrucción) ------- */
// consumo de un mes (solo lo que cobra COHAJ): {agg:{pub:{n,tot,sp}}, tot}
function consumoMes(c,y,m){ // misma regla que devengoDe (via C): suscripciones vigentes + altas cargadas acá − suspensiones − feriados
  const ini=new Date(y,m,1,12), fin=new Date(y,m+1,0,12); // mediodía: toISOString da el mismo día en cualquier huso
  const agg={}; let sinPrecioN=0;
  const items=c.subs.filter(x=>x[2]==='C'&&vigenteAlgunDia(x,DEV0)).map(x=>({t:x[0],days:FD(x[1]),desde:(x[4]||'').slice(0,10),hasta:x[3]==='V'?'':x[3].slice(0,10),q:Math.abs(x[5])||1,alta:altaDe(x)}));
  let dd=new Date(ini);
  while(dd<=fin){
    const dia=dd.toISOString().slice(0,10), wd=(dd.getDay()+6)%7;
    if(feriadoTotal(dia)){dd.setDate(dd.getDate()+1);continue;}
    if(dia<DEV0){ // meses anteriores al devengo automático: reconstrucción con las suscripciones de NewsPaper vigentes ese día (como hasta v56)
      for(const x of c.subs){
        if(x[2]!=='C')continue;
        if(!feriadoSale(dia,x[0]))continue;
        const desde=(x[4]||'').slice(0,10), hasta=x[3]==='V'?'9999':(x[3]||'');
        if(!desde||desde>dia||hasta<dia)continue;
        if(!tocaDia(FD(x[1]),wd,dia))continue;
        const p=precioDe(x[0],wd,dia), k=x[0], qn=Math.abs(x[5])||1;
        agg[k]=agg[k]||{n:0,tot:0,sp:0}; agg[k].n+=qn;
        if(p)agg[k].tot+=p*qn; else {agg[k].sp++;sinPrecioN++;}
      }
      dd.setDate(dd.getDate()+1);continue;
    }
    for(const x of items){
      if(!tocaDia(x.days,wd,dia))continue;
      if(x.desde&&x.desde>dia)continue;
      if(x.hasta&&x.hasta<=dia)continue;
      if(!feriadoSale(dia,x.t))continue;
      if(suspendida(c.id,x.t,dia,null,x.alta))continue;
      const p=precioDe(x.t,wd,dia);
      const k=x.t;
      agg[k]=agg[k]||{n:0,tot:0,sp:0};
      agg[k].n+=x.q;
      if(p)agg[k].tot+=p*x.q; else {agg[k].sp++;sinPrecioN++;}
    }
    dd.setDate(dd.getDate()+1);
  }
  let tot=0; Object.values(agg).forEach(a=>tot+=a.tot);
  return {agg,tot,sinPrecio:sinPrecioN};
}
function desglose(cid,fliq){
  const c=C.find(x=>x.id===cid); if(!c)return '<div class="mini">?</div>';
  const d=new Date(fliq+'T12:00:00');
  let y=d.getFullYear(),m=d.getMonth();
  if(d.getDate()<=5){m--;if(m<0){m=11;y--;}}
  const {agg}=consumoMes(c,y,m);
  const meses=MESES;
  const ks=Object.keys(agg);
  if(!ks.length)return '<div class="mini">No pude reconstruir este período: las suscripciones vigentes hoy no alcanzan a ese mes (pudo haber cambios que NewsPaper ya no conserva).</div>';
  let tot=0;
  let h='<div class="mini" style="margin-bottom:6px">Reconstrucción aproximada del consumo de <b>'+meses[m]+' '+y+'</b> (suscripciones × días × precio de tapa de cada fecha):</div>';
  for(const k of ks){
    tot+=agg[k].tot;
    h+='<div class="dl"><span>'+k+' · '+agg[k].n+' ejemplares'+(agg[k].sp?' <span class="tag-susp">(faltan precios de '+agg[k].sp+' días)</span>':'')+'</span><span>'+(agg[k].tot?fmt(agg[k].tot):'—')+'</span></div>';
  }
  h+='<div class="dl tot"><span>Total reconstruido</span><span>'+fmt(tot)+'</span></div>';
  h+='<div class="mini" style="margin-top:6px">Puede diferir del importe liquidado por NewsPaper: suspensiones puntuales, extras o precios que la base no conserva.</div>';
  return h;
}
