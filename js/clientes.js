// COHAJ Sistema — Clientes, ficha y cuenta corriente
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- CLIENTES ------- */
let RES=[],MOSTR=30,FSEL=new Set(); // filtros seleccionados (varios a la vez)
let SELMODE=false, SELCLI=new Set(); // selección de clientes para imprimir resúmenes
// Grupos de filtros: dentro de un grupo se suman (O); entre grupos se cruzan (Y).
// Tipo: puesto = SOLO le cobrás vos · distrib = SOLO vía distribuidora · mixto = las dos cosas.
const FGRUPOS={tipo:['puesto','distrib','mixto','sinsub'],saldo:['deudores','favor'],estado:['inactivos','recup']};
const FTEST={
  puesto:c=>catDe(c)==='Cliente', distrib:c=>catDe(c)==='Suscriptor', mixto:c=>catDe(c)==='Mixto', sinsub:c=>catDe(c)==='',
  deudores:(c,s)=>s>0.5, favor:(c,s)=>s<-0.5,
  inactivos:c=>!c.act, recup:c=>c.fic==='recuperado'
};
function setF(f){
  if(f==='todos') FSEL.clear(); else if(FSEL.has(f)) FSEL.delete(f); else FSEL.add(f);
  document.querySelectorAll('.fch').forEach(x=>x.classList.toggle('on',x.dataset.f==='todos'?FSEL.size===0:FSEL.has(x.dataset.f)));
  buscar();
}
const FDEFS=[['todos','Todos'],['puesto','Del puesto'],['distrib','De la distribuidora'],['mixto','Mixtos'],['sinsub','Sin suscripción vigente'],['deudores','Deudores'],['favor','A favor'],['inactivos','Inactivos'],['recup','Ficha recuperada']];
function pintarClientes(){
  $('v-clientes').innerHTML=`${titulo('Clientes',C.filter(c=>c.act).length+' activos · tocá uno para ver su cuenta corriente')}<div style="position:sticky;top:0;background:var(--papel);padding:8px 0;z-index:5">
  <input id="bq" type="search" placeholder="Dirección, nombre, Nº o publicación (ej: ole)…" autocomplete="off" oninput="buscar()">
  ${toggleSaldoHTML()}
  <div class="fchips">${FDEFS.map(f=>`<button class="fch${(f[0]==='todos'?FSEL.size===0:FSEL.has(f[0]))?' on':''}" data-f="${f[0]}">${f[1]}</button>`).join('')}</div></div>
  <div class="mini" id="bres" style="margin-bottom:6px"></div>
  <div id="blist"></div><button class="btn sec" id="bmas" hidden style="width:100%">Mostrar más</button>`;
  buscar();
}
function pasaFiltro(c,s){
  for(const g of Object.values(FGRUPOS)){
    const act=g.filter(k=>FSEL.has(k));
    if(act.length&&!act.some(k=>FTEST[k](c,s))) return false;
  }
  return true;
}
function buscar(){
 try{
  const el=$('bq');
  const q=norm(((el||{}).value||'').trim());
  window.__dbg='q=«'+q+'»';
  let base=C.map(c=>({c,s:saldoDe(c)}));
  if(q){const p=q.split(/\s+/);base=base.filter(x=>p.every(t=>(x.c.k||'').includes(t)));}
  else if(!FSEL.has('inactivos')) base=base.filter(x=>x.c.act);
  base=base.filter(x=>pasaFiltro(x.c,x.s));
  RES=base.sort((a,b)=>(b.c.act-a.c.act)||Math.abs(b.s)-Math.abs(a.s));
  MOSTR=30;pintarLista();
  const tot=RES.reduce((n,x)=>n+x.s,0);
  const conDeuda=RES.filter(x=>saldoDe(x.c,cierreISO())>0.5).length;
  $('bres').innerHTML=RES.length+' clientes · saldo neto '+(tot>=0?'debe ':'a favor ')+fmt(tot)+
    `<div class="fchips" style="margin:6px 0 0">${SELMODE
      ?`<button class="fch on" id="bimpsel" style="margin-top:0">🖨 Imprimir seleccionados (${SELCLI.size})</button><button class="fch" id="bseltodos" style="margin-top:0">Marcar todos</button><button class="fch" id="bselno" style="margin-top:0">Cancelar</button>`
      :`<button class="fch" id="bsel" style="margin-top:0">☑ Elegir varios</button>${conDeuda?`<button class="fch" id="bimp" style="margin-top:0">🖨 Imprimir todos los listados con deuda al ${fecha(cierreISO())} (${conDeuda})</button>`:''}`}</div>`;
  window.__dbg+=' → '+RES.length+' result.';
 }catch(e){
  window.__dbg='ERROR buscar: '+(e&&e.message);
  const b=$('bres'); if(b) b.textContent='ERROR: '+(e&&e.message);
 }
}
function toggleSel(id){ if(SELCLI.has(id))SELCLI.delete(id); else SELCLI.add(id); const y=window.scrollY; buscar(); window.scrollTo(0,y); }
function pintarLista(){
  const l=$('blist');l.innerHTML='';
  RES.slice(0,MOSTR).forEach(x=>{
    const c=x.c,s=x.s;
    const vig=c.subs.filter(y=>y[3]==='V').length;
    const div=document.createElement('div');div.className='fila'+(SELMODE&&SELCLI.has(c.id)?' sel':'');div.dataset.cli=c.id;
    div.innerHTML=`${SELMODE?`<div class="chk${SELCLI.has(c.id)?' on':''}"></div>`:''}<div><div class="dom">${c.d||'(sin domicilio)'} <span class="mini">Nº ${c.id}</span></div><div class="nom">${c.n||''}</div></div>
    <div class="der">${saldoHTML(s)}<div class="mini">${!c.act?'dado de baja':(vig?vig+' susc.':'sin reparto')}</div></div>`;
    l.appendChild(div);
  });
  if(!RES.length) l.innerHTML='<div class="mini" style="text-align:center;padding:24px">Sin resultados. Probá con menos letras, o solo el número de puerta.</div>';
  $('bmas').hidden=RES.length<=MOSTR;
}
function catDe(c){
  const hoy=hoyISO();
  const vias=new Set();
  c.subs.forEach(x=>{ if(x[3]==='V'&&!suspendida(c.id,x[0],hoy,null,altaDe(x))) vias.add(x[2]==='S'?'S':'C'); });
  if(vias.has('S')&&vias.has('C'))return 'Mixto';
  if(vias.has('S'))return 'Suscriptor';
  if(vias.has('C'))return 'Cliente';
  return '';
}
function pillCat(c){
  if(!c.act)return'<span class="pill p-inact">Dado de baja</span>';
  const k=catDe(c);
  if(k==='Suscriptor')return'<span class="pill p-susc">Suscriptor</span>';
  if(k==='Mixto')return'<span class="pill p-mix">Mixto</span>';
  if(k==='Cliente')return'<span class="pill p-cli">Cliente</span>';
  return'<span class="pill p-inact">Sin suscripción vigente</span>';
}
function diasHTML(fr){
  const dd=FD(fr);
  if(!dd)return fr?`<div class="mini" style="margin-top:6px">${fr}</div>`:'';
  return diasHTMLArr(dd);
}
function diasHTMLArr(dd,susp){ susp=susp||[]; return '<div class="dias">'+DIAS.map((d,i)=>{const s=dd.includes(i)&&susp.includes(i);return `<div class="dia${dd.includes(i)&&!s?' on':''}${s?' susp':''}"${s?' title="Suspendido"':''}>${d}</div>`;}).join('')+'</div>'; }
function sumarDias(iso,n){ const d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
// desde cuándo están suspendidos esos días (suspensión/baja vigente hoy más antigua) y hasta cuándo
function infoSusp(cid,pub,dias){
  const h=hoyISO(); const ns=LIVE.novedades.filter(n=>n.cli===cid&&(n.tipo==='Suspensión'||n.tipo==='Baja')&&(!n.pub||norm(pub).includes(norm(n.pub))||norm(n.pub).includes(norm(pub)))&&(!n.dias||!n.dias.length||n.dias.some(d=>dias.includes(d)))&&(n.desde||'')<=h&&(!n.hasta||n.hasta>=h));
  if(!ns.length) return null; const desde=ns.map(n=>n.desde).sort()[0]; const hs=ns.map(n=>n.hasta||''); const hasta=hs.includes('')?'':hs.sort().pop(); return {desde,hasta,baja:ns.some(n=>n.tipo==='Baja')};
}
function diasSuspHoy(cid,pub,dias,alta){
  if(!dias||!dias.length) return [];
  const hoy0=hoyISO();
  return dias.filter(d=>{
    for(let i=0;i<7;i++){
      const dt=new Date(hoy0+'T12:00:00'); dt.setDate(dt.getDate()+i);
      if((dt.getDay()+6)%7===d) return suspendida(cid,pub,dt.toISOString().slice(0,10),null,alta);
    }
    return false;
  });
}
// Agrupa filas de suscripción de la misma publicación y modalidad (NewsPaper tiene una fila por día para los diarios): una tarjeta con todos los días
function agruparSubs(rows){
  const g=[]; const idx={};
  rows.forEach(x=>{
    const dd=FD(x[1]);
    const k=dd?x[0]+'|'+x[2]:null;
    if(!k){ g.push({pub:x[0],via:x[2],dias:null,txt:x[1]||'',desde:x[4],qty:Math.abs(x[5])||1,rows:[x],app:x[6]==='app'}); return; }
    if(idx[k]==null){ idx[k]=g.length; g.push({pub:x[0],via:x[2],dias:[],txt:'',desde:x[4],qty:Math.abs(x[5])||1,rows:[]}); }
    const e=g[idx[k]]; dd.forEach(d=>{if(!e.dias.includes(d))e.dias.push(d);}); e.rows.push(x);
    if((x[4]||'')<(e.desde||'')) e.desde=x[4];
    if((Math.abs(x[5])||1)!==e.qty) e.qtyMix=true;
    if(x[6]==='app') e.app=true;
  });
  g.forEach(e=>{ if(e.dias) e.dias.sort((a,b)=>a-b); });
  return g;
}
let FMOSTR=20, FULT=null;
function ficha(id,mas){
  const c=C.find(x=>x.id===id); if(!c)return;
  if(FULT!==id){FMOSTR=20;FULT=id;} if(mas)FMOSTR+=40;
  const s=saldoDe(c);
  const hoy0=hoyISO();
  const vig=[],susp=[];
  c.subs.forEach(x=>{
    if(x[3]==='V'&&!suspendida(c.id,x[0],hoy0,null,altaDe(x))) vig.push(x);
    else susp.push(x);
  });
  susp.sort((a,b)=>(b[3]||'').localeCompare(a[3]||''));
  const movLive=LIVE.movs.filter(m=>m.cli===id).map(m=>({f:m.f,tipo:m.tipo,imp:(m.tipo==='Cobro'?-m.imp:m.imp),medio:m.medio,id:m.fijo?'':m.id,nota:m.nota}));
  const movs=[...c.movs.map(m=>({f:m[0],tipo:m[1],imp:m[2],medio:m[3]})),...movLive].sort((a,b)=>(b.f||'').localeCompare(a.f||''));
  const novs=LIVE.novedades.filter(n=>n.cli===id);
  let h=`<button class="volver" id="fvolver">← Volver</button>
  <div class="card cabecera">
    <div class="dom">${c.d||'(sin domicilio)'}</div>
    <div class="mini" style="font-size:15px">${c.n||'Sin nombre'} · Nº ${c.id}</div>
    <div class="chips">${pillCat(c)}${c.fic==='recuperado'?'<span class="pill p-warn">Ficha recuperada</span>':''}</div>
    <div class="saldonum ${s>0.5?'debe':(s<-0.5?'favor':'aldia')}">${Math.abs(s)>0.5?fmt(s):'Al día'}</div>
    <div class="mini">${s>0.5?'te debe':(s<-0.5?'tiene a favor':'sin deuda')} · ${MODO_SALDO==='cierre'?'saldo al '+fecha(cierreISO())+' (mes vencido)':'saldo a hoy'}</div>
    ${(()=>{const o=saldoDe(c,MODO_SALDO==='cierre'?hoyISO():cierreISO());return `<div class="mini" style="margin-top:2px">${MODO_SALDO==='cierre'?'Saldo a hoy':'Saldo al '+fecha(cierreISO())+' (mes vencido)'}: <b>${Math.abs(o)>0.5?fmt(o):'al día'}</b></div>`;})()}
    ${devengoDe(c,'C',hastaSaldo())>0?`<div class="mini" style="margin-top:4px">incluye ${fmt(devengoDe(c,'C',hastaSaldo()))} de consumo devengado automático desde el 01/09</div>`:''}
    ${devengoDe(c,'S')>0?`<div class="mini" style="margin-top:4px;color:var(--ok)">Vía distribuidora: repartido ${fmt(devengoDe(c,'S'))} de tapa desde el 01/09 → te genera ${fmt(devengoDe(c,'S')*CONFIG.comision/100)} de comisión (no es deuda del cliente)</div>`:''}
    ${!c.act?`<div class="aviso" style="background:var(--rojosuave);color:var(--rojo)">Cliente dado de baja${(()=>{const n=LIVE.novedades.filter(x=>x.cli===id&&x.tipo==='Baja'&&!x.pub).sort((x,y)=>(y.desde||'').localeCompare(x.desde||''))[0];return n?' desde el '+fecha(n.desde):'';})()}: no devenga y no figura en el padrón. <button class="btn chico sec" id="freact" data-cli="${id}" style="margin:6px 0 0">Reactivar cliente</button></div>`:''}
    ${sinPrecio(c).length?`<div class="aviso">⚠ ${sinPrecio(c).map(x=>x[0]).join(', ')}: sin precio cargado, no devenga. Cargalo en Precios.</div>`:''}
    <div class="datoscli">${c.tel?`<div>Tel: <a style="color:var(--azul)" href="tel:${c.tel.replace(/[^0-9+]/g,'')}">${c.tel}</a></div>`:''}${c.part?`<div>Entrega: <i>${c.part}</i></div>`:''}</div>
    <div class="grid2">
      <button class="btn chico" id="fbc" data-cli="${id}">＋ Cobro</button>
      <button class="btn chico sec" id="fbl" data-cli="${id}">＋ Ajuste</button>
      <button class="btn chico sec" id="fcor" data-cli="${id}">✎ Corregir saldo</button>
      <button class="btn chico sec" id="fres" data-cli="${id}">🖨 Resumen ${MESES[new Date(cierreISO()+'T12:00:00').getMonth()]}</button>
      <button class="btn chico sec" id="fedit" data-cli="${id}">✎ Editar datos</button>
      <button class="btn chico sec" id="fnotabtn" data-cli="${id}">📝 Anotación</button>
    </div>
    <div id="fform"></div>
  </div>`;
  const notas=notasDe(c);
  h+=`<h2>Anotaciones${notas.length?' ('+notas.length+')':''}</h2><div class="card" id="notascard">${notas.length?notas.map((n,i)=>`<div class="nota"><div class="nt">${n.f?`<span class="nf">${n.f}${n.a?' · '+n.a:''}</span>`:''}${n.t}</div><button class="mini-btn" data-nborrar="${i}" data-cli="${id}" title="Borrar anotación">✕</button></div>`).join(''):'<div class="mini">Sin anotaciones. Usá “📝 Anotación” para dejar algo registrado (ej. “paga los 10”, “avisar antes de tocar timbre”).</div>'}</div>`;
  if(novs.length){h+=`<h2>Novedades cargadas acá</h2><div class="card">`+novs.map(n=>`<div class="subrow"><b>${n.tipo}</b> <span class="mini">${descNov(n)}${n.nota?' · '+n.nota:''}</span></div>`).join('')+`</div>`;}
  h+=`<h2>Suscripciones vigentes (${vig.length})</h2>`;
  if(vig.length) agruparSubs(vig).forEach((e,ix)=>{const todasDeLaPub=vig.filter(x=>x[0]===e.pub).length===e.rows.length;const dsx=e.dias?diasSuspHoy(id,e.pub,e.dias,altaDe(e.rows[0])):[];h+=`<div class="card"><b>${e.pub}</b>${e.qty>1&&!e.qtyMix?` <span class="mini">×${e.qty}</span>`:''} <span class="pill ${e.via==='S'?'p-susc':'p-cli'}">${e.via==='S'?'vía distribuidora':'le cobrás vos'}</span>${e.app?' <span class="pill p-warn">alta cargada acá</span>':''}${e.dias?diasHTMLArr(e.dias,dsx):(e.txt?`<div class="mini" style="margin-top:6px">${e.txt}</div>`:'')}${dsx.length?(()=>{const todo=dsx.length===e.dias.length, is=infoSusp(id,e.pub,dsx); return `<div class="mini" style="margin-top:4px">${todo?'<b>Suspendida: hoy no recibe ningún día</b> (no se reparte ni se cobra)':'No recibe '+dsx.map(d=>DIAS[d]).join(', ')}${is?' · desde el '+fecha(is.desde)+(is.hasta?', vuelve el '+fecha(sumarDias(is.hasta,1)):' hasta que se reanude'):''}</div>`;})():''}${e.rows.length>1?`<div class="mini" style="margin-top:4px">${e.rows.length} suscripciones agrupadas (una por día)</div>`:''}<div class="mini" style="margin-top:6px">desde ${fecha(e.desde)}</div>
  <div id="sf-${ix}"><button class="btn chico sec" data-sform="${ix}" data-pub="${e.pub}" data-dias="${(e.dias||[]).join(',')}" ${todasDeLaPub?'data-todas="1"':''} data-cli="${id}" data-acc="Suspensión">Suspender / dar de baja</button>${e.dias&&e.dias.length?` <button class="btn chico sec" data-cvia="${ix}" data-pub="${e.pub}" data-dias="${e.dias.join(',')}" data-via="${e.via}" data-qty="${e.qty}" data-cli="${id}">${e.via==='S'?'Pasar a "le cobrás vos"':'Pasar a "vía distribuidora"'}</button>`:''}</div></div>`;});
  else h+='<div class="card mini">Sin publicaciones vigentes.</div>';
  h+=`<div id="altabox"><button class="btn chico" id="altabtn" data-cli="${id}">＋ Alta de suscripción nueva</button></div>`;
  const altasTodas=c.subs.filter(x=>x[6]==='app'&&x[3]==='V').map(x=>({pub:x[0],desde:(x[4]||'').slice(0,10),dias:FD(x[1])||[]}));
  const reactivada=x=>x[3]!=='V'&&altasTodas.some(n=>n.pub===x[0]&&(n.desde||'')>=(x[3]||'').slice(0,10)&&(!(FD(x[1])||[]).length||n.dias.some(d=>(FD(x[1])||[]).includes(d))));
  const suspVis=susp.filter(x=>!reactivada(x));
  const suspG=(()=>{ const out=[]; const byEstado={}; suspVis.forEach(x=>{const k=x[3]==='V'?'V':(x[3]||'').slice(0,10); (byEstado[k]=byEstado[k]||[]).push(x);}); Object.keys(byEstado).sort((a,b)=>b.localeCompare(a)).forEach(k=>{ agruparSubs(byEstado[k]).forEach(e=>out.push(e)); }); return out; })();
  if(suspG.length){h+=`<h2>Suspendidas (${suspG.length})</h2><div class="card">`+suspG.slice(0,12).map((e,ix)=>{
    const x=[e.pub,e.dias?e.dias.map(d=>DIAS[d]).join(' '):e.txt,e.via,e.rows[0][3],e.desde,e.qty];
    const porNov=x[3]==='V';
    const vuelve=(()=>{ if(!porNov) return ''; const dsx=e.dias||[]; const nv=LIVE.novedades.filter(n=>n.cli===id&&n.tipo==='Suspensión'&&n.hasta&&(!n.pub||norm(x[0]).includes(norm(n.pub))||norm(n.pub).includes(norm(x[0])))&&(!n.dias||!n.dias.length||!dsx.length||n.dias.some(d=>dsx.includes(d)))).sort((p,q)=>(q.desde||'').localeCompare(p.desde||''))[0]; if(!nv) return ''; const d=new Date(nv.hasta+'T12:00:00'); d.setDate(d.getDate()+1); return ' desde el '+fecha(nv.desde)+' · vuelve el '+fecha(d.toISOString().slice(0,10)); })();
    return `<div class="subrow">${x[0]} <span class="tag-susp">${porNov?'suspendida acá'+vuelve:'cerrada el '+fecha(x[3])}</span> <span class="mini">${x[1]||''}</span>
    <div id="rf-${ix}"><button class="btn chico sec" data-sform="r${ix}" data-pub="${x[0]}" data-dias="${(e.dias||[]).join(',')}" data-via="${x[2]||'C'}" data-qty="${Math.abs(x[5])||1}" ${porNov?'':'data-cerrada="1"'} data-cli="${id}" data-acc="Reanudación">Reactivar</button></div></div>`;}).join('')+`</div>`;}
  h+=`<h2>Movimientos <span class="mini" style="text-transform:none">— tocá una liquidación para ver el desglose</span></h2><div class="card">`+(movs.length?movs.slice(0,FMOSTR).map((m,i)=>{
    const esLiq=m.tipo==='Liquidación'&&!m.id;
    return `<div class="mov${esLiq?' liqrow':''}"${esLiq?` data-dlq="${m.f.slice(0,10)}" data-dlc="${id}"`:''}><span class="f">${fecha(m.f)}</span><span class="t">${m.tipo}${m.tipo==='Cobro'&&m.medio?' · '+m.medio:''}${m.nota?' <span class="mini">· '+m.nota+'</span>':''}</span><span class="m ${(m.tipo==='Cobro'||m.imp<0)?'favor':''}">${(m.tipo==='Cobro'||m.imp<0)?'−':''}${fmt(m.imp)}</span>${m.id?`<button class="del" data-mid="${m.id}" data-cli="${id}">✕</button>`:''}</div><div class="desglose" data-dg="${m.f.slice(0,10)}_${id}" hidden></div>`;
  }).join(''):'<div class="mini">Sin movimientos desde 2024.</div>')+`</div>
  ${movs.length>FMOSTR?`<div style="text-align:center"><button class="btn chico sec" id="fmas" data-cli="${id}">Ver más (${movs.length-FMOSTR} anteriores)</button></div>`:''}
  <div class="mini" style="margin:8px 0 20px">Cobro = pagó (baja deuda) · el consumo diario se devenga solo según sus suscripciones y precios. Las filas con ✕ se cargaron en este sistema y se pueden borrar.</div>`;
  $('v-ficha').innerHTML=h; ver('ficha'); try{history.replaceState(null,'','#ficha-'+id);}catch(_){}
}
/* ------- DATOS DEL CLIENTE Y ANOTACIONES (v70) ------- */
// Las anotaciones viven en clientes.observaciones, una por línea, la más nueva arriba: "dd/mm/aa · Autor: texto" (saltos de línea internos como ⏎).
function notasDe(c){
  return (c.obs||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^(\d\d\/\d\d\/\d\d) · ([^:]{0,40}): ([\s\S]*)$/);return m?{f:m[1],a:m[2],t:m[3].replace(/ ⏎ /g,'\n'),raw:l}:{f:'',a:'',t:l,raw:l};});
}
async function guardarCliente(id,campos){
  const c=C.find(x=>x.id===id); if(!c) throw new Error('cliente no encontrado');
  const{error}=await sb.from('clientes').update({...campos,modificado_en:new Date().toISOString(),modificado_por:USUARIO&&USUARIO.id||null}).eq('id',id);
  if(error) throw new Error(error.message);
  if('domicilio' in campos) c.d=esc(campos.domicilio);
  if('nombre' in campos) c.n=esc(campos.nombre);
  if('telefono' in campos) c.tel=esc(campos.telefono);
  if('particularidad' in campos) c.part=esc(campos.particularidad);
  if('observaciones' in campos) c.obs=esc(campos.observaciones);
  c.k=norm(c.d+' '+c.n+' '+c.id+' '+c.subs.map(x=>x[0]).join(' '));
}
function formEditarCliente(id){
  const c=C.find(x=>x.id===id); if(!c)return;
  $('fform').innerHTML=`<div class="mini" style="margin:10px 0 2px"><b>Datos del cliente Nº ${id}</b></div>
  <label>Domicilio</label><input id="ed-dom" value="${c.d||''}">
  <label>Nombre</label><input id="ed-nom" value="${c.n||''}">
  <label>Teléfono</label><input id="ed-tel" type="tel" value="${c.tel||''}">
  <label>Particularidad de entrega (sale en la hoja de reparto)</label><input id="ed-part" value="${c.part||''}" placeholder="ej: bajo puerta, dejar en portería">
  <div class="grid2" style="margin-top:12px"><button class="btn chico" id="fedok" data-cli="${id}">Guardar datos</button><button class="btn chico sec" id="fcancel" data-cli="${id}">Cancelar</button></div>`;
  $('ed-dom').focus();
}
async function editarClienteOK(id){
  const dom=$('ed-dom').value.trim(); if(!dom){toast('El domicilio no puede quedar vacío');return;}
  try{ await guardarCliente(id,{domicilio:dom,nombre:$('ed-nom').value.trim(),telefono:$('ed-tel').value.trim(),particularidad:$('ed-part').value.trim()}); toast('Datos guardados ✓'); ficha(id); }
  catch(e){toast('No se pudo guardar: '+((e&&e.message)||e));}
}
function formNota(id){
  $('fform').innerHTML=`<label>Anotación</label><textarea id="nt-txt" placeholder="ej: paga a fin de mes · pidió factura · avisar antes de suspender"></textarea>
  <div class="grid2" style="margin-top:12px"><button class="btn chico" id="fnotaok" data-cli="${id}">Guardar anotación</button><button class="btn chico sec" id="fcancel" data-cli="${id}">Cancelar</button></div>`;
  $('nt-txt').focus();
}
async function notaOK(id){
  const c=C.find(x=>x.id===id); if(!c)return;
  const t=$('nt-txt').value.trim().replace(/\r?\n+/g,' ⏎ '); if(!t){toast('Escribí la anotación');return;}
  const autor=(nombreUsuario()||'').slice(0,40).replace(/:/g,'');
  const linea=fecha(hoyISO())+' · '+autor+': '+t;
  const obs=[linea,...notasDe(c).map(n=>unesc(n.raw))].join('\n');
  try{ await guardarCliente(id,{observaciones:obs}); toast('Anotación guardada ✓'); ficha(id); }
  catch(e){toast('No se pudo guardar: '+((e&&e.message)||e));}
}
async function borrarNota(id,i){
  const c=C.find(x=>x.id===id); if(!c)return;
  if(!confirm('¿Borrar esta anotación?'))return;
  const obs=notasDe(c).filter((_,k)=>k!==i).map(n=>unesc(n.raw)).join('\n');
  try{ await guardarCliente(id,{observaciones:obs}); toast('Anotación borrada'); ficha(id); }
  catch(e){toast('No se pudo borrar: '+((e&&e.message)||e));}
}
function formCobro(id){
  $('fform').innerHTML=`<label>Importe cobrado</label><input id="fimp" type="number" inputmode="decimal" placeholder="0">
  <label>Medio de pago</label><select id="fmed">${LISTAS.medios.map(m=>`<option>${m}</option>`).join('')}</select>
  <label>Fecha</label><input id="ffec" type="date" value="${hoyISO()}">
  <button class="btn" id="fok" data-cli="${id}" data-tipo="Cobro">Guardar cobro</button>`;
  $('fimp').focus();
}
function formLiq(id){
  $('fform').innerHTML=`<label>Importe del ajuste (positivo suma deuda, negativo la baja; el consumo diario ya se devenga solo)</label><input id="fimp" type="number" inputmode="decimal" step="any" placeholder="0">
  <label>Fecha</label><input id="ffec" type="date" value="${hoyISO()}">
  <label>Nota</label><input id="fnota" placeholder="ej: venta extra revista">
  <button class="btn" id="fok" data-cli="${id}" data-tipo="Ajuste">Guardar ajuste</button>`;
  $('fimp').focus();
}
function formCorregir(id){
  const c=C.find(x=>x.id===id); if(!c)return;
  $('fform').innerHTML=`<div class="mini" style="margin-bottom:4px"><b>Corrección por revisión.</b> Ponés el saldo que tiene que quedar y el sistema carga un Ajuste por la diferencia (queda registrado, se puede borrar). Por defecto se corrige el saldo <b>al cierre del mes vencido (${fecha(cierreISO())})</b>: lo de este mes sigue corriendo solo por devengo.</div>
  <label>Fecha de la corrección</label><input id="ffec" type="date" value="${cierreISO()}">
  <div class="mini" style="margin:4px 0">Saldo del sistema a esa fecha: <b id="fcor-act"></b></div>
  <label>Saldo correcto (positivo = te debe, negativo = a favor, 0 = al día)</label><input id="fimp" type="number" inputmode="decimal" step="any" placeholder="0">
  <div class="mini" style="margin:4px 0">Ajuste que se va a cargar: <b id="fcor-dif">—</b></div>
  <label>Nota</label><input id="fnota" value="Corrección por revisión">
  <button class="btn" id="fcorok" data-cli="${id}">Guardar corrección</button>`;
  const act=()=>{const s=saldoDe(c,$('ffec').value||hoyISO()); $('fcor-act').textContent=Math.abs(s)>0.5?fmt(s):'al día ($0)'; return s;};
  const dif=()=>{const s=act(); const v=parseFloat($('fimp').value); const d=isNaN(v)?null:v-s; $('fcor-dif').textContent=d===null?'—':(Math.abs(d)<0.5?'nada (ya coincide)':(d>0?'+':'−')+fmt(Math.abs(d))+(d>0?' (sube la deuda)':' (baja la deuda)'));};
  $('ffec').onchange=dif; $('fimp').oninput=dif; act(); $('fimp').focus();
}
async function corregirSaldo(id){
  const c=C.find(x=>x.id===id); if(!c)return;
  const v=parseFloat($('fimp').value); if(isNaN(v)){toast('Poné el saldo correcto');return;}
  const fch=$('ffec').value||hoyISO();
  const d=Math.round((v-saldoDe(c,fch))*100)/100;
  if(Math.abs(d)<0.5){toast('El saldo ya coincide, no hay nada que corregir');return;}
  const nota=($('fnota').value||'Corrección por revisión')+' (saldo fijado en '+(v<0?'−':'')+fmt(v)+' al '+fecha(fch)+')';
  const r={id:nid(),ts:new Date().toISOString(),cli:id,tipo:'Ajuste',imp:d,f:fch,medio:'',nota};
  try{ await guardar('movs',[...LIVE.movs,r]); toast('Saldo corregido ✓'); ficha(id); }
  catch(e){toast('No se pudo guardar: '+((e&&e.message)||e));}
}
async function addMov(id,tipo){
  const imp=parseFloat($('fimp').value);
  if(!imp||(imp<=0&&tipo!=='Ajuste')){toast('Poné un importe');return;}
  const nota=$('fnota')?$('fnota').value:'';
  const r={id:nid(),ts:new Date().toISOString(),cli:id,tipo,imp,f:$('ffec').value,medio:tipo==='Cobro'?$('fmed').value:'',nota};
  if(tipo==='Cobro'){ const dup=LIVE.movs.filter(m=>m.cli===id&&m.tipo==='Cobro'&&Math.abs(m.imp-imp)<0.5&&(m.f||'').slice(0,10)===r.f);
    if(dup.length&&!confirm(`Ya hay ${dup.length===1?'un cobro':dup.length+' cobros'} de ${fmt(imp)} para este cliente con fecha ${fecha(r.f)} (${dup.map(m=>(m.medio||'')+' '+(m.ts||'').slice(11,16)).join(', ')}).\n\n¿Es un cobro NUEVO y lo querés cargar igual?`))return; }
  if(ADDMOV_BUSY){toast('Guardando…');return;} ADDMOV_BUSY=true;
  try{
    await guardar('movs',[...LIVE.movs,r]);
    if(tipo==='Cobro'){
      const cc={id:nid(),ts:r.ts,f:r.f,c:'Cobro a cliente',d:nomCli(id),ing:imp,egr:0,m:r.medio};
      await guardar('caja',[...LIVE.caja,cc]);
    }
    toast(tipo+' guardado ✓'); ficha(id);
  }catch(e){toast('No se pudo guardar: '+((e&&e.message)||e));}
  finally{ ADDMOV_BUSY=false; }
}
let ADDMOV_BUSY=false;
async function borrarMov(mid,cli){
  const m=LIVE.movs.find(x=>x.id===mid);
  const k=m&&m.tipo==='Cobro'?LIVE.caja.filter(x=>x.c==='Cobro a cliente'&&x.f===(m.f||'').slice(0,10)&&Math.abs((x.ing||0)-m.imp)<0.5&&(x.m||'')===(m.medio||'')&&(x.d||'')===nomCli(cli)).sort((a,b)=>Math.abs(new Date(a.ts)-new Date(m.ts))-Math.abs(new Date(b.ts)-new Date(m.ts)))[0]:null;
  if(!confirm('¿Borrar este movimiento?'+(k?' También se saca de la caja ('+fmt(k.ing)+' '+(k.m||'')+').':'')))return;
  try{ await guardar('movs',LIVE.movs.filter(x=>x.id!==mid)); if(k) await guardar('caja',LIVE.caja.filter(x=>x.id!==k.id)); toast('Borrado'); ficha(cli);}catch(e){toast('Error: '+((e&&e.message)||e));}
}
