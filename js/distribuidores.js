// COHAJ Sistema — Distribuidores
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ---- DISTRIBUIDORES (varios) ---- */
async function nuevoDist(){ const n=$('dnuevo').value.trim(); if(!n){toast('Poné el nombre');return;} try{ const id=await ins('distribuidores',{nombre:n,comision:32}); await cargarTabla('dists'); DSEL=id; toast('Distribuidor creado ✓'); pintarDist(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function renombrarDist(id){ const d=distDe(id); const n=prompt('Nombre del distribuidor:',d?unesc(d.nombre):''); if(n===null||!n.trim())return; try{ const{error}=await sb.from('distribuidores').update({nombre:n.trim()}).eq('id',id); if(error)throw new Error(error.message); await cargarTabla('dists'); pintarDist(); pintarInicio(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function asignarPubDist(pub,distId){ try{ const{error}=await sb.from('publicaciones_dist').upsert({publicacion:unesc(pub),distribuidor_id:distId,anulado:false},{onConflict:'publicacion'}); if(error)throw new Error(error.message); await cargarTabla('pubdist'); SCACHE={}; toast(pub+' → '+nomDist(distId)); pintarDist(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
function todasLasPubs(){ const s=new Set([...PRECIOS,...LIVE.precios].map(p=>p.pub)); C.forEach(c=>c.subs.forEach(x=>s.add(x[0]))); return [...s].filter(Boolean).sort(); }

/* ------- DISTRIBUIDORA ------- */
function pintarDist(){
  if(!distDe(DSEL)) DSEL=(DISTS[0]||{id:1}).id;
  const d=distDe(DSEL)||{id:DSEL,nombre:'Distribuidora',comision:CONFIG.comision};
  const k=cuentaDist(DSEL), s=k.saldo, pct=k.pct;
  const meses=cuentaDistPorMes(DSEL).slice().reverse();
  const pubs=todasLasPubs();
  const misPubs=pubs.filter(p=>pubDist(p)===DSEL);
  const est=s<-0.5?'Te debe':(s>0.5?'Le debés':'Están a mano');
  const nMes=m=>{const t=etiquetaMes(m.mes+'-15');return t.charAt(0).toUpperCase()+t.slice(1);};
  const mas=v=>(v>0.5?'+':'')+fmt(v), menos=v=>(v>0.5?'−':'')+fmt(v);
  $('v-dist').innerHTML=`${titulo('Distribuidores','Cuánto te debe (o le debés a) cada distribuidor de diarios y revistas')}
  ${DISTS.length>1||true?`<div class="fchips" style="margin:0 0 16px">${DISTS.map(x=>`<button class="fch${x.id===DSEL?' on':''}" data-dsel="${x.id}">${x.nombre}</button>`).join('')}<button class="fch" id="dnuevobtn">＋ Distribuidor</button></div>`:''}
  <div id="dnuevobox" hidden class="card" style="margin-bottom:12px"><label>Nombre del nuevo distribuidor</label><div style="display:flex;gap:8px"><input id="dnuevo" placeholder="ej: Distribuidora Norte" style="margin:0"><button class="btn chico" id="dnuevook" style="margin:0">Crear</button></div></div>
  <section class="panel dist-hero">
    <div class="p-tit">${d.nombre} <span class="lnk" data-dren="${d.id}" title="Cambiar nombre">✎</span></div>
    <div class="p-num${s>0.5?' debe':''}"><small>${est}</small> ${fmt(s)}</div>
    <div class="p-sub">Al ${fecha(hoyISO())}. Cuenta desde el ${fecha(DEV0)}, se calcula sola con lo que se repartió.</div>
    <div class="p-filas">
      ${filaIni(`Comisión por repartir a sus suscriptores<small>${pct}% de ${fmt(k.tapaS)} de tapa</small>`,mas(k.comision),'favor')}
      ${filaIni(`Diarios que te vende para tus clientes<small>${fmt(k.tapaC)} de tapa, menos tu ${pct}%</small>`,menos(k.costo))}
      ${filaIni(`Devoluciones que te acredita<small>ejemplares no vendidos, al costo</small>`,mas(k.devol),k.devol?'favor':'')}
      ${filaIni(`Pagos y otros movimientos<small>los que cargás abajo</small>`,k.movs>0.5?'−'+fmt(k.movs):mas(-k.movs))}
      <div class="p-fila p-total"><span>${s<-0.5?'Te debe':(s>0.5?'Le debés':'Saldo')}</span><b class="${s>0.5?'debe':''}">${fmt(s)}</b></div>
    </div>
  </section>
  <h2>Mes por mes</h2>
  <div class="card tabla-wrap"><table class="tabla">
    <thead><tr><th>Mes</th><th>Comisión</th><th>Diarios para tus clientes</th><th>Devoluciones</th><th>Pagos y otros</th><th>Resultado del mes</th><th>Saldo al cierre</th></tr></thead>
    <tbody>${meses.map(m=>`<tr><td data-l="Mes"><b>${nMes(m)}</b>${m.parcial?' <span class="mini">hasta hoy</span>':''}</td><td data-l="Comisión" class="favor">${mas(m.comision)}</td><td data-l="Diarios para tus clientes">${menos(m.costo)}</td><td data-l="Devoluciones">${mas(m.devol)}</td><td data-l="Pagos y otros">${m.movs>0.5?'−'+fmt(m.movs):mas(-m.movs)}</td><td data-l="Resultado del mes"><b class="${m.saldo>0.5?'debe':'favor'}">${m.saldo>0.5?'le debés ':'a tu favor '}${fmt(m.saldo)}</b></td><td data-l="Saldo al cierre">${m.saldoAcum>0.5?'le debés ':(m.saldoAcum<-0.5?'te debe ':'')}${fmt(m.saldoAcum)}</td></tr>`).join('')}</tbody>
  </table>
  <div class="mini" style="margin-top:12px">Usalo para controlar la liquidación de ${d.nombre}: si su número no coincide con el del mes, la diferencia se carga abajo como movimiento.</div></div>
  <h2>Cargar un pago o movimiento</h2>
  <div class="card">
    <div class="mini">La comisión, los diarios de tus clientes y las devoluciones se calculan solos: no los cargues acá.</div>
    <label>Qué pasó</label><select id="dtipo"><option value="2">${d.nombre} te pagó</option><option value="-1">Le pagaste a ${d.nombre}</option><option value="1">Te vendió mercadería para el mostrador (le debés más)</option><option value="-2">Te hizo un crédito o nota de crédito (le debés menos)</option></select>
    <div class="grid2"><div><label>Importe $</label><input id="dimp" type="text" inputmode="decimal" autocomplete="off"></div><div><label>Fecha</label><input id="dfec" type="date" value="${hoyISO()}"></div></div>
    <label>Detalle (opcional)</label><input id="ddet" placeholder="ej: liquidación de septiembre">
    <button class="btn" id="dok">Guardar movimiento</button></div>
  <details class="card plegable"><summary>Qué publicaciones son de ${d.nombre} <span class="mini">${misPubs.length} publicaciones</span></summary><div class="mini" style="margin:12px 0 6px">Cada publicación pertenece a un distribuidor: su comisión y su CC se calculan con eso. Las que no asignes quedan en ${nomDist(1)}.</div>
    <input id="dpubq" type="search" placeholder="Filtrar publicación…" style="margin-bottom:8px" oninput="document.querySelectorAll('#dpubs .mov').forEach(r=>r.hidden=!norm(r.dataset.pub).includes(norm(this.value)))">
    <div id="dpubs">${pubs.map(p=>`<div class="mov" data-pub="${p}"><span class="t">${p}</span><select class="sel-pubdist" data-pubdist="${p}" style="width:auto;margin:0;padding:5px 8px;font-size:13px">${DISTS.map(x=>`<option value="${x.id}"${pubDist(p)===x.id?' selected':''}>${x.nombre}</option>`).join('')}</select></div>`).join('')}</div></details>
  <h2>Devoluciones a ${d.nombre}</h2>
  <div class="card"><div class="mini" style="margin-bottom:6px">Diarios o revistas <b>no vendidos</b> que el encargado le devuelve a ${d.nombre}. El valor de la devolución <b>se descuenta del saldo</b> con el distribuidor (te lo acredita). Se acredita <b>al costo</b> (precio de tapa menos tu ${comisionDist(DSEL)}% de margen: no perdés ni ganás); el valor unitario se propone solo y podés corregirlo.</div>
    <div class="grid2"><div><label>Fecha</label><input id="dvfec" type="date" value="${hoyISO()}" onchange="dvSugerir()"></div><div><label>Cantidad</label><input id="dvqty" type="number" inputmode="numeric" min="1" placeholder="0" oninput="dvTotal()"></div></div>
    <label>Publicación</label><input id="dvpub" list="dvpubs" placeholder="ej: CLARIN" oninput="dvSugerir()" onchange="dvSugerir()"><datalist id="dvpubs">${misPubs.map(p=>`<option value="${p}">`).join('')}</datalist>
    <div class="grid2"><div><label>Valor unitario que te acredita $ <span class="mini">(costo)</span></label><input id="dvvu" type="text" inputmode="decimal" autocomplete="off" step="any" placeholder="costo" oninput="dvTotal()"></div><div><label>Total a descontar</label><div id="dvtot" style="padding:11px 0;font-weight:700;font-size:18px">—</div></div></div>
    <label>Nota</label><input id="dvnota" placeholder="ej: sobrantes del domingo">
    <button class="btn chico" id="dvok">Registrar devolución</button>
    <div style="margin-top:8px">${(()=>{const rs=[...LIVE.devol].filter(r=>(r.dist||1)===DSEL).sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||''));const mes=hoyISO().slice(0,7);const tot=rs.filter(r=>(r.f||'').startsWith(mes)).reduce((n,r)=>n+(r.qty||0),0);return (tot?`<div class="mini" style="margin-bottom:6px">Este mes: <b>${tot}</b> ejemplares devueltos.</div>`:'')+(rs.slice(0,30).map(r=>{const wd=(new Date(r.f+'T12:00:00').getDay()+6)%7;const p=precioDe(r.pub,wd,r.f)||0;return `<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t"><b>${r.qty}</b> × ${r.pub}${r.vu!=null?' <span class="mini">a '+fmt(r.vu)+' c/u</span>':''}${r.nota?' · '+r.nota:''}</span><span class="m favor">${r.imp!=null?'−'+fmt(r.imp):(p?'<span class="mini">ref. '+fmt(p*r.qty)+'</span>':'—')}</span><button class="del" data-dvid="${r.id}">✕</button></div>`;}).join('')||'<div class="mini">Ninguna devolución cargada.</div>');})()}</div>
  </div>
  <h2>Movimientos cargados</h2>
  <div class="filtros"><input id="dfil" type="search" placeholder="Buscar por detalle o fecha" style="margin:0"><label class="chkl" style="white-space:nowrap"><input type="checkbox" id="dhist" onchange="pintaDH()"> Ver histórico de NewsPaper</label></div>
  <div class="card" id="dhlist"></div>
  <div style="text-align:center"><button class="btn chico sec" id="dmas">Ver más</button></div>
  <h2>Comisión</h2>
  <div class="card"><div class="mini" style="margin-bottom:8px">Porcentaje del precio de tapa que te corresponde. Se usa para la comisión por repartir a sus suscriptores y para el costo de los diarios que te vende.</div>
    <div style="display:flex;gap:8px;align-items:center"><input id="dcom" type="text" inputmode="decimal" autocomplete="off" step="0.5" min="0" max="100" value="${comisionDist(DSEL)}" style="max-width:110px;margin:0"> <span>%</span> <button class="btn chico sec" id="dcomok" style="margin:0">Guardar</button></div>
  </div>`;
  let DMOSTR=40;
  window.pintaDH=function(){
    const q=norm($('dfil').value);
    const hist=(DSEL===1&&$('dhist')&&$('dhist').checked)?DISTH.map(r=>({...r,_h:1})):[];
    const todos=[...hist,...LIVE.dist.filter(r=>(r.dist||1)===DSEL)].filter(r=>!q||norm((r.d||'')+' '+r.f+' '+fecha(r.f)).includes(q)).sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||''));
    const rs=todos.slice(0,DMOSTR);
    $('dhlist').innerHTML=rs.map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r.d||''}${r._h?' <span class="mini">· NewsPaper</span>':''}</span><span class="m" title="${r.imp>0?'le debés más / te debe menos':'le debés menos / te debe más'}">${r._h?(r.imp<0?'−':''):(r.imp>0?'−':'+')}${fmt(r.imp)}</span>${r._h?'':`<button class="del" data-did="${r.id}">✕</button>`}</div>`).join('')||(q?'<div class="mini">Nada con ese filtro.</div>':'<div class="mini">Todavía no cargaste pagos ni movimientos con este distribuidor.</div>');
    $('dmas').hidden=todos.length<=DMOSTR;
  }
  window.masDist=function(){DMOSTR+=40;pintaDH();};
  pintaDH();
}
async function addFeriado(){
  const f=$('fefec').value; if(!f){toast('Poné la fecha');return;}
  if(FER.has(f)){toast('Ese día ya está cargado (borralo y volvé a cargarlo si querés cambiarlo)');return;}
  const parcial=!!document.querySelector('.fch[data-femodo="parcial"].on');
  const sp=parcial?[...document.querySelectorAll('#fepubsel .dia.on')].map(x=>x.dataset.fepub):null;
  const r={id:nid(),ts:new Date().toISOString(),f,d:$('fedet').value||'',sp};
  try{ await guardar('feriados',[...LIVE.feriados,r]); SCACHE={}; toast('Feriado guardado ✓'); pintarNovedades(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function borrarFeriado(id){
  if(!confirm('¿Borrar este feriado?'))return;
  try{ await guardar('feriados',LIVE.feriados.filter(r=>r.id!==id)); SCACHE={}; toast('Borrado'); pintarNovedades(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
window.dvSugerir=function(){ const pub=($('dvpub').value||'').trim().toUpperCase(), f=$('dvfec').value; if(!pub||!f)return; const wd=(new Date(f+'T12:00:00').getDay()+6)%7; const p=precioDe(pub,wd,f); const el=$('dvvu'); if(p&&(!el.value||el.dataset.auto==='1')){el.value=Math.round(p*(100-comisionDist(DSEL))/100);el.dataset.auto='1';} dvTotal(); };
window.dvTotal=function(){ const q=parseInt($('dvqty').value)||0, vu=num($('dvvu').value)||0; if(document.activeElement===$('dvvu')) $('dvvu').dataset.auto=''; $('dvtot').textContent=(q&&vu)?fmt(q*vu):'—'; };
async function addDevol(){
  const qty=parseInt($('dvqty').value),pub=$('dvpub').value.trim().toUpperCase(),f=$('dvfec').value;
  if(!qty||qty<=0||!pub||!f){toast('Completá fecha, cantidad y publicación');return;}
  const vu=num($('dvvu').value); if(isNaN(vu)||vu<0){toast('Poné el valor unitario que te acredita (si no lo sabés, dejá el precio de tapa)');return;}
  const r={id:nid(),ts:new Date().toISOString(),f,pub,qty,nota:$('dvnota').value||'',dist:DSEL,vu,imp:Math.round(qty*vu*100)/100};
  try{ await guardar('devol',[...LIVE.devol,r]); toast('Devolución registrada ✓ · se descontó '+fmt(r.imp)); pintarDist(); pintarInicio(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function borrarDevol(id){
  if(!confirm('¿Borrar esta devolución?'))return;
  try{ await guardar('devol',LIVE.devol.filter(r=>r.id!==id)); toast('Borrado'); pintarDist(); pintarInicio(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function guardarComision(){
  const v=num($('dcom').value);
  if(isNaN(v)||v<0||v>100){toast('Poné un porcentaje entre 0 y 100');return;}
  try{ const{error}=await sb.from('distribuidores').update({comision:v}).eq('id',DSEL); if(error)throw error; if(DSEL===1){ await sb.from('config').upsert({clave:'comision',valor:v}); CONFIG.comision=v; } await cargarTabla('dists'); SCACHE={}; toast('Comisión guardada ✓'); pintarDist(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function addDist(){
  const imp=num($('dimp').value);
  if(!imp||imp<=0){toast('Poné un importe');return;}
  const t=$('dtipo').value;
  const r={id:nid(),ts:new Date().toISOString(),f:$('dfec').value,d:$('ddet').value||($('dtipo').selectedOptions[0].textContent.split('(')[0].trim()),imp:(t==='1'||t==='2')?imp:-imp,dist:DSEL};
  try{ await guardar('dist',[...LIVE.dist,r]); toast('Guardado ✓'); pintarDist(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function borrarDist(id){
  if(!confirm('¿Borrar?'))return;
  try{ await guardar('dist',LIVE.dist.filter(r=>r.id!==id)); toast('Borrado'); pintarDist(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
