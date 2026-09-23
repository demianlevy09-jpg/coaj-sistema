// COHAJ Sistema — Novedades y feriados
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- NOVEDADES ------- */
const NTIPOS=[['altacli','Cliente nuevo'],['altasub','Alta de suscripción'],['susp','Suspensión'],['rean','Reanudación'],['bajasub','Baja de suscripción'],['bajacli','Baja de cliente'],['precio','Cambio de precio']];
let NTIPO='susp', NEDIT=null; // NEDIT = id de la novedad que se está editando (se anula y se reemplaza por una nueva)
function titulo(t,sub){return `<div class="hola"><h1>${t}</h1>${sub?`<div class="mini">${sub}</div>`:''}</div>`;}
function pubsDelPadron(){
  const cnt={};
  C.filter(c=>c.act).forEach(c=>{ c.subs.filter(x=>x[3]==='V').forEach(x=>{cnt[x[0]]=(cnt[x[0]]||0)+1;}); });
  return Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]||a.localeCompare(b));
}
function pintarNovedades(){
  const rows=[...LIVE.novedades].sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
  const hoy=hoyISO(), mes=hoy.slice(0,7);
  const delMes=rows.filter(n=>(n.ts||'').startsWith(mes));
  const suspAct=C.reduce((n,c)=>n+c.subs.filter(x=>x[3]==='V'&&suspendida(c.id,x[0],hoy,FD(x[1]))).length,0);
  const bajas=C.filter(c=>!c.act).length;
  $('v-novedades').innerHTML=`
  ${titulo('Novedades','Altas, bajas y suspensiones. Cada una queda en la ficha del cliente y mueve el devengo desde su fecha.')}
  <div class="kpis">
    <div class="kpi"><i>Este mes</i><b>${delMes.length} <small>novedades</small></b><i>${delMes.filter(n=>n.tipo==='Alta').length} altas · ${delMes.filter(n=>n.tipo==='Baja').length} bajas · ${delMes.filter(n=>n.tipo==='Suspensión').length} suspensiones</i></div>
    <div class="kpi ${suspAct?'amb':'gris'}"><i>Suspendidas hoy</i><b>${suspAct} <small>suscripciones</small></b><i>no devengan hasta que se reanuden</i></div>
    <div class="kpi ${bajas?'rojo':'gris'} click" onclick="irClientes('inactivos')"><i>Clientes dados de baja →</i><b>${bajas} <small>clientes</small></b><i>fuera del padrón, con su saldo guardado</i></div>
    <div class="kpi ${FER.size?'':'gris'}"><i>Feriados sin reparto</i><b>${FER.size} <small>cargados</small></b><i>${[...FER].filter(f=>f>=hoy).length} por venir</i></div>
  </div>
  <div class="sec"><span class="dot"></span>Nueva novedad</div>
  <div class="card">
    <div class="fchips" style="margin-top:0">${NTIPOS.map(t=>`<button class="fch${NTIPO===t[0]?' on':''}" data-nt="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div id="nform"></div>
  </div>
  <div class="sec"><span class="dot"></span>Novedades cargadas</div>
  <div class="filtros"><select id="nfil" style="max-width:220px"><option value="">Tipo: todas</option><option>Alta</option><option>Baja</option><option>Suspensión</option><option>Reanudación</option></select>
  <input id="nft" type="search" placeholder="Buscar cliente o publicación…" style="margin-top:0"></div>
  <div class="card" id="nlist"></div>
  <div class="sec amb"><span class="dot"></span>Feriados</div>
  <div class="card"><div class="mini" style="margin-bottom:6px">Lo que no sale un feriado no se devenga: ni al cliente ni comisión de la distribuidora. Podés cargar el día entero sin diario, o marcar qué diarios no salen y el resto se reparte normal.</div>
    <div class="grid2"><div><label>Fecha</label><input id="fefec" type="date"></div><div><label>Motivo</label><input id="fedet" placeholder="ej: feriado nacional, paro"></div></div>
    <div class="fchips" style="margin-top:8px"><button class="fch on" data-femodo="total">Sin diario (no sale nada)</button><button class="fch" data-femodo="parcial">Con diario</button></div>
    <div id="fepubs" hidden><label>Marcá los que <b>NO</b> salen ese día <span class="mini">(ninguno marcado = salen todos; los demás se reparten normal y también reciben los que tienen "Fer")</span></label><div class="dias diasel" style="flex-wrap:wrap" id="fepubsel">${pubsDelPadron().map(pn=>`<div class="dia" data-fepub="${pn}" style="width:auto;padding:0 10px">${pn}</div>`).join('')}</div></div>
    <button class="btn chico" id="feok">Agregar feriado</button>
    <div style="margin-top:8px">${[...LIVE.feriados].sort((a,b)=>(b.f||'').localeCompare(a.f||'')).map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r.d||''}${r.d?' · ':''}${r.sp==null?'<span class="mini">sin diario</span>':(r.sp.length?'<span class="mini">con diario · no sale: '+r.sp.join(', ')+'</span>':'<span class="mini">con diario · salen todos</span>')}</span><button class="del" data-feid="${r.id}">✕</button></div>`).join('')||'<div class="mini">Ningún feriado cargado.</div>'}</div>
  </div>`;
  pintarNForm();
  window.pintaN=function(){
    const ft=$('nfil').value,q=norm($('nft').value);
    const rs=rows.filter(n=>(!ft||n.tipo===ft)&&(!q||norm(nomCli(n.cli)+' '+(n.pub||'')+' '+(n.nota||'')).includes(q)));
    $('nlist').innerHTML=rs.length?rs.slice(0,80).map(n=>`<div class="mov"><span class="f">${fecha(n.desde)}</span><span class="t"><b>${n.tipo}${!n.pub&&(n.tipo==='Baja'||n.tipo==='Reanudación')?' de cliente':''}</b> <a class="lnk" onclick="ficha(${n.cli})">${nomCli(n.cli)}</a> <span class="mini">· ${descNov(n)}${n.nota?' · '+n.nota:''}</span></span>${n.tipo!=='Cambio de precio'?`<button class="del" style="color:var(--azul)" data-nedit="${n.id}" title="Editar">✎</button>`:''}<button class="del" data-nid="${n.id}">✕</button></div>`).join(''):'<div class="mini">Ninguna todavía con ese filtro.</div>';
  }
  pintaN();
}
function pintarNForm(){
  const hoy=hoyISO();
  const allPubs=[...new Set([...PRECIOS,...LIVE.precios].map(p=>p.pub))].sort();
  const fCli=`<label>Cliente (Nº, dirección o nombre)</label><div class="acwrap"><input id="ncli" placeholder="ej: 230 o Dragones 2280 9 B" autocomplete="off" oninput="sugCli(this)" onfocus="sugCli(this)"><div class="ac" id="ncli-ac" hidden></div></div><div class="mini" id="ncli-info" style="margin-top:4px"></div><datalist id="npubs"></datalist>`;
  const fPubCli=(req)=>`<label>Publicación${req?'':' <span class="mini">(vacío = todas las del cliente)</span>'}</label><input id="npub" list="npubs" placeholder="${req?'ej: CLARIN':'todas'}" autocomplete="off">`;
  const fPubAll=`<label>Publicación</label><input id="npub" list="dl-allpubs" placeholder="ej: CLARIN" autocomplete="off"><datalist id="dl-allpubs">${allPubs.map(p=>`<option value="${p}">`).join('')}</datalist>`;
  const fSub=`<label>Días que la recibe</label><div class="dias diasel" id="ndias">${DIAS.map((d,i)=>`<div class="dia" data-di="${i}">${d}</div>`).join('')}</div>
    <div class="grid2"><div><label>¿Quién cobra?</label><select id="nvia"><option value="C">Le cobrás vos (cuenta corriente)</option><option value="S">Vía distribuidora (suscripción)</option></select></div>
    <div><label>Ejemplares por día</label><input id="nqty" type="number" value="1" min="1"></div></div>`;
  const fDesde=(l)=>`<label>${l||'Desde'}</label><input id="ndesde" type="date" value="${hoy}">`;
  const fNota=`<label>Nota</label><input id="nnota" placeholder="ej: avisó por WhatsApp">`;
  const fDiasOpc=`<label>Solo estos días <span class="mini">(vacío = todos los días de esa publicación; marcá días si, por ejemplo, suspende solo la edición del miércoles)</span></label><div class="dias diasel" id="nsdias">${DIAS7.map((d,i)=>`<div class="dia" data-di="${i}">${d}</div>`).join('')}</div>`;
  let h='';
  switch(NTIPO){
    case 'altacli': h=`<div class="mini" style="margin:6px 0 2px">Crea la ficha del cliente y, si querés, su primera suscripción. Le toca el próximo número libre.</div>
      <label>Domicilio *</label><input id="ncdom" placeholder="ej: Dragones 2280 9 B">
      <div class="grid2"><div><label>Nombre</label><input id="ncnom" placeholder="ej: García"></div><div><label>Teléfono</label><input id="nctel" type="tel" placeholder="11 …"></div></div>
      <label>Particularidad de entrega</label><input id="ncpart" placeholder="ej: bajo puerta, con bolsa siempre">
      <label>Observaciones</label><input id="ncobs" placeholder="opcional">
      <div class="sec" style="margin:18px 0 4px"><span class="dot"></span>Primera suscripción <span class="mini" style="text-transform:none;letter-spacing:0">(opcional)</span></div>
      ${fPubAll}${fSub}${fDesde('Recibe desde')}
      <button class="btn" id="nok">Crear cliente</button>`; break;
    case 'altasub': h=`${fCli}${fPubAll}${fSub}${fDesde('Recibe desde (ese día ya recibe)')}<button class="btn" id="nok">Guardar alta</button>`; break;
    case 'susp': h=`${fCli}${fPubCli(false)}${fDiasOpc}<div class="grid2"><div>${fDesde('Suspender desde (ese día ya no recibe)')}</div><div><label>Hasta <span class="mini">(último día que NO recibe; vacío = hasta que se reanude)</span></label><input id="nhasta" type="date"></div></div>${fNota}<button class="btn" id="nok">Guardar suspensión</button>`; break;
    case 'rean': h=`${fCli}${fPubCli(false)}${fDiasOpc}${fDesde('Vuelve a recibir desde (ese día ya recibe)')}${fNota}<button class="btn" id="nok">Guardar reanudación</button>`; break;
    case 'bajasub': h=`${fCli}${fPubCli(true)}${fDiasOpc}${fDesde('Deja de recibirla desde (ese día ya no recibe)')}${fNota}<button class="btn" id="nok">Dar de baja la suscripción</button>`; break;
    case 'bajacli': h=`<div class="aviso" style="margin:8px 0 0">La baja saca al cliente del padrón activo (deja de devengar todo desde la fecha). Su ficha y su saldo quedan guardados: lo ves con el filtro "Inactivos" y se puede reactivar.</div>
      ${fCli}${fDesde('Baja desde')}${fNota}<button class="btn" id="nok" style="background:var(--rojo)">Dar de baja al cliente</button>`; break;
    case 'precio': h=`<div class="mini" style="margin:8px 0">Los cambios de precio se cargan en <b>Precios</b> como una nueva vigencia (publicación, día y fecha desde la que rige). Nunca se pisa el precio anterior.</div><button class="btn chico" onclick="irTab('precios')">Ir a Precios →</button>`; break;
  }
  if(NEDIT){ const ne=LIVE.novedades.find(x=>String(x.id)===String(NEDIT)); h=`<div class="aviso" style="margin:8px 0 4px">Editando la novedad <b>${ne?ne.tipo:''}${ne&&ne.pub?' · '+ne.pub:''}</b> de <b>${ne?nomCli(ne.cli):''}</b> (fecha ${ne?fecha(ne.desde):''}). Al guardar se reemplaza por la versión nueva. <button class="btn chico sec" id="nedit-cancel" style="margin:6px 0 0">Cancelar edición</button></div>`+h.replace(/(<button class="btn" id="nok"[^>]*>)[^<]*(<\/button>)/,'$1Guardar cambios$2'); }
  $('nform').innerHTML=h;
}
function editarNovedad(id){
  const ne=LIVE.novedades.find(x=>String(x.id)===String(id)); if(!ne)return;
  if(ne.tipo==='Alta'&&!ne.dias){toast('Esa alta no tiene días; cargala de nuevo');return;}
  NEDIT=String(id);
  NTIPO=ne.tipo==='Alta'?'altasub':ne.tipo==='Suspensión'?'susp':ne.tipo==='Reanudación'?'rean':ne.tipo==='Baja'?(ne.pub?'bajasub':'bajacli'):'susp';
  document.querySelectorAll('.fch[data-nt]').forEach(x=>x.classList.toggle('on',x.dataset.nt===NTIPO));
  pintarNForm();
  elegirCli(ne.cli);
  if($('npub')) $('npub').value=ne.pub||'';
  if($('ndesde')) $('ndesde').value=ne.desde||hoyISO();
  if($('nhasta')) $('nhasta').value=ne.hasta||'';
  if($('nnota')) $('nnota').value=(ne.nota||'').replace(/^desde la ficha$/,'');
  if($('nvia')&&ne.via) $('nvia').value=ne.via;
  if($('nqty')&&ne.qty) $('nqty').value=ne.qty;
  const box=$('ndias')||$('nsdias'); if(box&&ne.dias) box.querySelectorAll('.dia').forEach(d=>d.classList.toggle('on',ne.dias.includes(parseInt(d.dataset.di))));
  const f=$('nform'); if(f) f.scrollIntoView({behavior:'smooth',block:'start'});
}
function buscarCli(q,n){
  q=norm((q||'').trim()); if(!q) return [];
  if(/^\d+$/.test(q)){const c=C.find(x=>x.id===parseInt(q));return c?[c]:[];}
  const p=q.split(/\s+/);
  const wordStart=(k,t)=>(' '+k).includes(' '+t);
  const wordExact=(k,t)=>(' '+k+' ').includes(' '+t+' ');
  return C.map(c=>{
      const k=c.k||'', kd=norm(c.d||'');
      if(!p.every(t=>k.includes(t))) return null;
      let sc=0;
      if(kd===q) sc+=100; else if(kd.includes(q)) sc+=60;
      p.forEach(t=>{ if(wordExact(kd,t)) sc+=10; else if(wordStart(kd,t)) sc+=6; else if(wordStart(k,t)) sc+=3; });
      return {c,sc};
    }).filter(Boolean).sort((a,b)=>(b.sc-a.sc)||(b.c.act-a.c.act)||(a.c.d||'').localeCompare(b.c.d||'')).map(x=>x.c).slice(0,n||12);
}
function sugCli(inp){
  const box=$('ncli-ac'); if(!box)return;
  inp.dataset.cli=''; $('ncli-info').textContent=''; $('npubs').innerHTML='';
  const rs=buscarCli(inp.value);
  if(!rs.length){box.hidden=true;return;}
  box.innerHTML=rs.map(c=>`<div class="aci" onmousedown="elegirCli(${c.id})"><b>${c.d}</b> <span class="mini">${c.n?c.n+' · ':''}Nº ${c.id}${c.act?'':' · dado de baja'}</span></div>`).join('');
  box.hidden=false;
}
function elegirCli(id){
  const c=C.find(x=>x.id===id); if(!c)return;
  const inp=$('ncli'); inp.value=c.d+' · Nº '+c.id; inp.dataset.cli=String(c.id); $('ncli-ac').hidden=true;
  const hoy=hoyISO();
  const vig=c.subs.filter(x=>x[3]==='V');
  const altas=[];
  const pubs=[...new Set(c.subs.map(x=>x[0]))];
  const diasDe=pn=>[...new Set(c.subs.filter(x=>x[0]===pn&&x[3]==='V').map(x=>x[1]||''))].filter(Boolean).join(' / ');
  $('npubs').innerHTML=pubs.map(pn=>`<option value="${pn}">${diasDe(pn)}</option>`).join('');
  const s=saldoDe(c);
  $('ncli-info').innerHTML=(vig.length||altas.length?'Recibe: '+[...vig.map(x=>x[0]+(x[1]?' ('+x[1]+')':'')+(suspendida(c.id,x[0],hoy,FD(x[1]))?' <span class="tag-susp">suspendida</span>':'')),].join(' · '):'Sin suscripciones vigentes')
    +(c.part?' · <i>'+c.part+'</i>':'')+(Math.abs(s)>0.5?' · saldo <b class="'+(s>0?'debe':'favor')+'">'+fmt(s)+(s>0?' (debe)':' (a favor)')+'</b>':'')+(c.act?'':' · <b class="debe">dado de baja</b>');
}
document.addEventListener('mousedown',e=>{if(!e.target.closest('.acwrap')){document.querySelectorAll('.ac').forEach(b=>b.hidden=true);}});
function cliElegido(){
  let cli=parseInt($('ncli').dataset.cli)||null;
  if(!cli){const rs=buscarCli($('ncli').value,2);if(rs.length===1||(rs.length&&/^\d+$/.test($('ncli').value.trim())))cli=rs[0].id;else if(rs.length>1){toast('Hay varios clientes que coinciden: elegí uno de la lista');return null;}}
  if(!cli||!C.find(x=>x.id===cli)){toast('No encontré ese cliente');return null;}
  return cli;
}
function diasOpc(){ const dd=[...document.querySelectorAll('#nsdias .dia.on')].map(x=>parseInt(x.dataset.di)); return dd.length?dd:null; }
function leerSub(){
  const pub=($('npub').value||'').trim().toUpperCase();
  const dias=[...document.querySelectorAll('#ndias .dia.on')].map(x=>parseInt(x.dataset.di));
  return {pub,dias,via:$('nvia').value,qty:parseInt($('nqty').value)||1,desde:$('ndesde').value};
}
async function addNov(){
  const ts=new Date().toISOString(), desde=$('ndesde')?$('ndesde').value:hoyISO(), nota=$('nnota')?$('nnota').value:'';
  try{
    if(NTIPO==='altacli'){
      const dom=$('ncdom').value.trim(); if(!dom){toast('Poné el domicilio');return;}
      const sub=leerSub();
      if(sub.pub&&!sub.dias.length){toast('Marcá los días de la suscripción (o dejá la publicación vacía)');return;}
      if(!sub.pub&&sub.dias.length){toast('Poné la publicación');return;}
      const fila={domicilio:dom,nombre:$('ncnom').value.trim(),telefono:$('nctel').value.trim(),particularidad:$('ncpart').value.trim(),observaciones:$('ncobs').value.trim(),activo:true,ficha:'actual',saldo_inicial:0,saldo_inicial_fecha:hoyISO()};
      const{data,error}=await sb.from('clientes').insert(fila).select('id').single(); if(error)throw new Error(error.message);
      const id=data.id;
      await cargarClientes();
      if(sub.pub){ await guardar('novedades',[...LIVE.novedades,{id:nid(),ts,cli:id,tipo:'Alta',pub:sub.pub,desde:sub.desde,hasta:'',dias:sub.dias,via:sub.via,qty:sub.qty,nota:'alta de cliente'}]); }
      recalcActivos(); SCACHE={};
      toast('Cliente creado ✓ Nº '+id); pintarInicio(); pintarClientes(); pintarNovedades(); ficha(id); return;
    }
    const cli=cliElegido(); if(!cli)return;
    let r=null;
    if(NTIPO==='altasub'){
      const sub=leerSub(); if(!sub.pub){toast('Poné la publicación');return;} if(!sub.dias.length){toast('Marcá al menos un día');return;}
      r={id:nid(),ts,cli,tipo:'Alta',pub:sub.pub,desde:sub.desde,hasta:'',dias:sub.dias,via:sub.via,qty:sub.qty,nota:'alta desde Novedades'};
    }else if(NTIPO==='susp'){
      r={id:nid(),ts,cli,tipo:'Suspensión',pub:($('npub').value||'').trim(),desde,hasta:$('nhasta').value||'',dias:diasOpc(),nota};
      if(r.hasta&&r.hasta<r.desde){toast('"Hasta" no puede ser anterior a "Desde"');return;}
    }else if(NTIPO==='rean'){
      r={id:nid(),ts,cli,tipo:'Reanudación',pub:($('npub').value||'').trim(),desde,hasta:'',dias:diasOpc(),nota};
    }else if(NTIPO==='bajasub'){
      const pub=($('npub').value||'').trim(); if(!pub){toast('Poné qué publicación se da de baja');return;}
      r={id:nid(),ts,cli,tipo:'Baja',pub,desde,hasta:'',dias:diasOpc(),nota};
    }else if(NTIPO==='bajacli'){
      const c=C.find(x=>x.id===cli), s=saldoDe(c);
      if(!confirm('¿Dar de baja a '+nomCli(cli)+' desde el '+fecha(desde)+'?'+(Math.abs(s)>0.5?'\n\nTiene saldo '+fmt(s)+(s>0?' (te debe)':' (a favor)')+'. Queda guardado en su ficha.':'')))return;
      r={id:nid(),ts,cli,tipo:'Baja',pub:'',desde,hasta:'',nota:('baja de cliente'+(nota?' · '+nota:''))};
    }else return;
    if(NEDIT){ r.nota=(r.nota||'')+(r.nota?' · ':'')+'editada'; }
    await guardar('novedades',[...LIVE.novedades.filter(x=>String(x.id)!==String(NEDIT)),r]);
    NEDIT=null;
    recalcActivos(); SCACHE={};
    toast('Novedad guardada ✓ '+nomCli(cli)); pintarInicio(); pintarClientes(); pintarNovedades();
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function reactivarCliente(cli){
  if(!confirm('¿Reactivar a '+nomCli(cli)+' desde hoy? Vuelve al padrón y sus suscripciones retoman el devengo.'))return;
  const r={id:nid(),ts:new Date().toISOString(),cli,tipo:'Reanudación',pub:'',desde:hoyISO(),hasta:'',nota:'reactivación del cliente'};
  try{ await guardar('novedades',[...LIVE.novedades,r]); recalcActivos(); SCACHE={}; toast('Cliente reactivado ✓'); pintarInicio(); pintarClientes(); ficha(cli); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
// Baja de cliente = novedad "Baja" sin publicación; "Reanudación" sin publicación lo reactiva. No toca clientes.activo (el padrón de 166 sigue siendo la base).
async function borrarNov(id){
  if(!confirm('¿Borrar?'))return;
  try{ await guardar('novedades',LIVE.novedades.filter(r=>r.id!==id)); recalcActivos(); SCACHE={}; toast('Borrada'); pintarNovedades(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
