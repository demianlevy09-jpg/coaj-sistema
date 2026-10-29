// COHAJ Sistema — Caja
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- CAJA ------- */
function pintarCaja(){
  const porMedio=Object.fromEntries(saldosCaja());
  const rows=[...LIVE.caja].sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
  const hoyC=hoyISO(), deHoy=LIVE.caja.filter(r=>(r.f||'').startsWith(hoyC)), netoHoy=deHoy.reduce((n,r)=>n+(r.ing||0)-(r.egr||0),0);
  $('v-caja').innerHTML=`${titulo('Caja','Saldo por medio de pago y movimientos cargados acá')}
  <div class="kpis">${Object.keys(porMedio).length?Object.entries(porMedio).map(([m,v])=>`<div class="kpi ${v<-0.5?'rojo':'ok'}"><i>${m||'Sin medio'}</i><b>${fmt(v)}</b><i>saldo actual</i></div>`).join(''):'<div class="kpi gris"><i>Caja</i><b>—</b><i>sin movimientos aún</i></div>'}<div class="kpi ${deHoy.length?(netoHoy<0?'rojo':''):'gris'}"><i>Hoy</i><b>${deHoy.length?fmt(netoHoy):'—'}</b><i>${deHoy.length?deHoy.length+' movimientos':'sin movimientos hoy'}</i></div></div>
  <div class="card"><b>Cargar movimiento</b>
    <label>Qué pasó</label><select id="cc">${CONCEPTOS_FORM.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>
    <div id="cotro" class="aviso" hidden></div>
    <div id="ccli-w" class="campo"><label>Quién pagó</label>${acHTML('ccli','Nº, dirección o nombre del cliente')}<div class="mini" id="ccli-i" style="margin-top:6px"></div></div>
    <div id="cdist-w" class="campo" hidden><label>Distribuidor</label><select id="cdist">${DISTS.map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('')||'<option value="1">Distribuidora</option>'}</select><div class="mini" style="margin-top:6px">También queda en la cuenta del distribuidor (pestaña Distribuidores).</div></div>
    <div id="cimp-w"><div class="grid2" id="cimp-g"><div><label id="cing-l">Ingreso $</label><input id="cing" type="text" inputmode="decimal" autocomplete="off" placeholder="0"></div>
    <div id="cegr-w"><label>Egreso $</label><input id="cegr" type="text" inputmode="decimal" autocomplete="off" placeholder="0"></div></div>
    <div class="grid2"><div id="cm-w"><label id="cm-l">Caja</label><select id="cm">${LISTAS.medios.map(m=>`<option${m===cajaDef()?' selected':''}>${m}</option>`).join('')}</select></div><div id="cm2-w" hidden><label>Entra a</label><select id="cm2">${(()=>{const d=LISTAS.medios.find(m=>m!==cajaDef());return LISTAS.medios.map(m=>`<option${m===d?' selected':''}>${m}</option>`).join('');})()}</select></div></div>
    <div class="grid2"><div><label>Fecha</label><input id="cf" type="date" value="${hoyISO()}"></div><div></div></div>
    <label>Nota</label><input id="cd" placeholder="opcional, ej: pagó agosto y la mitad de septiembre">
    <div><button class="btn" id="cok">Guardar</button></div></div></div>
  ${esAdmin()?panelCajasHTML(porMedio):''}
  <h2>Movimientos cargados</h2>
  <div class="filtros"><select id="fcc"><option value="">Concepto: todos</option>${[...new Set([...CONCEPTOS_CAJA,...rows.map(r=>r.c).filter(Boolean)])].map(c=>`<option>${c}</option>`).join('')}</select>
  <select id="fcm"><option value="">Medio: todos</option>${LISTAS.medios.map(m=>`<option>${m}</option>`).join('')}</select>
  <select id="fcv"><option value="">Movimientos de caja</option><option value="cc">Cuentas de clientes (cobros y ajustes)</option></select></div>
  <div class="grid2"><div><label>Cliente</label>${acHTML('fcli','Todos · buscá por Nº, dirección o nombre')}</div><div class="grid2"><div><label>Desde</label><input id="fcd" type="date"></div><div><label>Hasta</label><input id="fch" type="date"></div></div></div>
  <div class="filtros" style="margin-top:6px"><input id="fct" type="search" placeholder="Buscar en detalle…" style="margin:0"><label style="display:flex;align-items:center;gap:6px;white-space:nowrap;margin:0"><input type="checkbox" id="fcdup" style="width:auto;margin:0">Solo posibles duplicados</label><button class="btn chico sec" id="fclimp" style="margin:0;white-space:nowrap">Limpiar filtros</button></div>
  <div class="mini" id="ctot" style="margin:6px 0"></div>
  <div class="card" id="clist"></div><button class="btn chico sec" id="cmas" hidden>Mostrar más</button>
  <h2>Histórico NewsPaper 2026 <span class="mini" style="text-transform:none">(solo consulta)</span></h2>
  <input id="fch2" type="search" placeholder="Buscar en el histórico…" style="margin-bottom:8px">
  <div class="card" id="chlist"></div>`;
  // Cobro a cliente: se elige quién pagó y el cobro entra a su cuenta y a la caja (mismo camino que la ficha)
  window.cajaModo=function(){ const c=$('cc').value, m=MODO_CONCEPTO[c]||'ambos', ir=IR_A[c];
    $('cotro').hidden=!ir; if(ir)$('cotro').innerHTML=ir.txt+' <button class="btn chico" style="margin:0 0 0 8px" onclick="'+ir.go+'">'+ir.btn+'</button>';
    $('cimp-w').hidden=!!ir; $('cok').hidden=!!ir;
    $('ccli-w').hidden=c!=='Cobro a cliente'; $('cdist-w').hidden=!(c==='Cobro distribuidora'||c==='Pago a distribuidora');
    const pase=c==='Transferencia entre cuentas'; $('cm2-w').hidden=!pase; $('cm-l').textContent=pase?'Sale de':'Caja';
    $('cegr-w').hidden=m!=='ambos'; $('cimp-g').classList.toggle('uno',m!=='ambos');
    $('cing-l').textContent=m==='ambos'?'Ingreso $':(c==='Cobro a cliente'?'Importe cobrado $':'Importe $');
    if(m!=='ambos')$('cegr').value=''; };
  window.cajaCliInfo=function(){ const el=$('ccli-i'); if(!el)return; const id=parseInt($('ccli').dataset.cli)||null; const c=id?C.find(x=>x.id===id):null; if(!c){el.textContent='';return;}
    const s=saldoDe(c,hoyISO()); el.innerHTML=(c.n?c.n+' · ':'')+(Math.abs(s)<0.5?'al día':(s>0?'te debe <b>'+fmt(s)+'</b>':'a favor <b>'+fmt(-s)+'</b>'))+' <span class="lnk" onclick="ficha('+id+')">ver ficha</span>'; };
  cajaModo();
  window.CLIM=50;
  window.pintaC=function(){
    const fc=$('fcc').value,fm=$('fcm').value,ft=norm($('fct').value),fv=$('fcv').value,cli=parseInt($('fcli').dataset.cli)||null,fd=$('fcd').value,fh=$('fch').value,soloDup=$('fcdup').checked;
    $('fcc').disabled=fv==='cc';
    const enRango=f=>(!fd||(f||'').slice(0,10)>=fd)&&(!fh||(f||'').slice(0,10)<=fh);
    if(fv==='cc'){ // cuentas de clientes
      const key=m=>m.cli+'|'+m.tipo+'|'+Math.round(m.imp)+'|'+(m.f||'').slice(0,10); const cnt={}; LIVE.movs.forEach(m=>{cnt[key(m)]=(cnt[key(m)]||0)+1;});
      const ms=[...LIVE.movs].sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||'')).filter(m=>(!cli||m.cli===cli)&&(!fm||m.medio===fm)&&enRango(m.f)&&(!ft||norm(m.tipo+' '+(m.nota||'')+' '+nomCli(m.cli)+' '+m.cli).includes(ft))&&(!soloDup||cnt[key(m)]>1));
      const cob=ms.filter(m=>m.tipo==='Cobro').reduce((n,m)=>n+m.imp,0), aj=ms.filter(m=>m.tipo!=='Cobro').reduce((n,m)=>n+m.imp,0);
      $('ctot').innerHTML=`${ms.length} movimientos · cobros <b>${fmt(cob)}</b> · ajustes/cargos <b>${fmt(aj)}</b>`;
      $('clist').innerHTML=ms.length?ms.slice(0,CLIM).map(m=>`<div class="mov"><span class="f">${fecha(m.f)}</span><span class="t"><span class="lnk" onclick="ficha(${m.cli})">${nomCli(m.cli)} · Nº ${m.cli}</span> · ${m.tipo}${m.medio?' <span class="mini">'+m.medio+'</span>':''}${m.nota?' <span class="mini">· '+m.nota+'</span>':''}${cnt[key(m)]>1?' <span class="pill p-warn">¿duplicado?</span>':''}</span><span class="m ${m.tipo==='Cobro'?'favor':'debe'}">${fmt(m.imp)}</span></div>`).join(''):'<div class="mini">Nada con ese filtro.</div>';
      $('cmas').hidden=ms.length<=CLIM; return;
    }
    const kkey=r=>r.f+'|'+r.c+'|'+(r.d||'')+'|'+(r.ing||0)+'|'+(r.egr||0); const kc={}; rows.forEach(r=>{kc[kkey(r)]=(kc[kkey(r)]||0)+1;});
    const nc=cli?norm(nomCli(cli)):''; const cliDe=r=>{ if(r.mid){ const m=LIVE.movs.find(x=>String(x.id)===r.mid); return m?m.cli:null; } return norm(r.d||'')===nc?cli:null; };
    const rs=rows.filter(r=>(!fc||r.c===fc)&&(!fm||r.m===fm)&&enRango(r.f)&&(!cli||cliDe(r)===cli)&&(!ft||norm((r.c||'')+' '+(r.d||'')).includes(ft))&&(!soloDup||kc[kkey(r)]>1));
    const ti=rs.reduce((n,r)=>n+(r.ing||0),0), te=rs.reduce((n,r)=>n+(r.egr||0),0);
    $('ctot').innerHTML=`${rs.length} movimientos · ingresos <b>${fmt(ti)}</b> · egresos <b>${fmt(te)}</b> · neto <b>${fmt(ti-te)}</b>`;
    $('cmas').hidden=rs.length<=CLIM;
    $('clist').innerHTML=rs.length?rs.slice(0,CLIM).map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r.c||''}${r.d?' · '+r.d:''} <span class="mini">${r.m||''}</span>${kc[kkey(r)]>1?' <span class="pill p-warn">¿duplicado?</span>':''}</span><span class="m ${(r.ing||0)-(r.egr||0)<0?'debe':'favor'}">${(r.ing||0)-(r.egr||0)<0?'−':''}${fmt((r.ing||0)-(r.egr||0))}</span>${r.fijo?'':`<button class="del" data-cid="${r.id}">✕</button>`}</div>`).join(''):'<div class="mini">Nada con ese filtro.</div>';
  }
  window.pintaH=function(){
    const ft=norm($('fch2').value);
    const rs=CAJAH.filter(r=>!ft||norm((r.c||'')+' '+(r.d||'')).includes(ft));
    $('chlist').innerHTML=rs.slice(-30).reverse().map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r.c||''}${r.d?' · '+r.d:''}</span><span class="m">${r.e?'−':''}${fmt(r.i||r.e)}</span></div>`).join('')||'<div class="mini">Nada con ese filtro.</div>';
  }
  pintaC();pintaH();
}
async function addCaja(){
  const c=$('cc').value, f=$('cf').value, m=$('cm').value, nota=$('cd').value.trim(), modo=MODO_CONCEPTO[c]||'ambos';
  if(IR_A[c]){toast(IR_A[c].txt);return;}
  if(!f){toast('Poné la fecha');return;}
  if(c==='Cobro a cliente'){
    let id=parseInt($('ccli').dataset.cli)||null;
    if(!id){ const q=$('ccli').value.trim(), rs=q?buscarCli(q,2):[]; if(rs.length===1||(rs.length&&/^\d+$/.test(q)))id=rs[0].id; else if(rs.length>1){toast('Hay varios clientes que coinciden: elegí uno de la lista');return;} }
    if(!id){toast('Elegí qué cliente pagó');$('ccli').focus();return;}
    const imp=num($('cing').value)||0; if(imp<=0){toast('Poné el importe cobrado');return;}
    try{ if(await cobrarCliente(id,imp,m,f,nota)){ toast('Cobro de '+nomCli(id)+' guardado ✓'); pintarCaja(); } }catch(e){toast('No se pudo guardar: '+((e&&e.message)||e));}
    return;
  }
  if(c==='Transferencia entre cuentas') return transferirCaja(m,$('cm2').value,num($('cing').value)||0,f,nota);
  let ing=num($('cing').value)||0, egr=num($('cegr').value)||0;
  if(modo==='egr'){ egr=ing; ing=0; }
  if(ing<0||egr<0){toast('El importe va sin signo');return;}
  if(!ing&&!egr){toast('Poné un importe');return;}
  if(ing&&egr){toast('Poné ingreso o egreso, no los dos (si fueron dos cosas, cargalas por separado)');return;}
  if(c==='Cobro distribuidora'||c==='Pago a distribuidora') return pagoDistCaja(parseInt($('cdist').value)||1,c==='Cobro distribuidora'?ing:-egr,m,f,nota);
  const r={id:nid(),ts:new Date().toISOString(),f,c,d:nota,ing,egr,m};
  try{ await guardar('caja',[...LIVE.caja,r]); toast('Caja guardada ✓'); pintarCaja(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
// Cobro/pago con un distribuidor: va a la caja y a la cuenta del distribuidor a la vez.
// imp>0 = te pagó (entra plata, te debe menos); imp<0 = le pagaste (sale plata, le debés menos). medio vacío = no pasó por caja.
async function pagoDistCaja(dist,imp,medio,f,nota,detDist){
  const nom=unesc(nomDist(dist)), ts=new Date().toISOString(), abs=Math.abs(imp);
  const rd={id:nid(),ts,f,d:detDist||((imp>0?nom+' te pagó':'Le pagaste a '+nom)+(nota?' · '+nota:'')),imp:imp>0?abs:-abs,dist};
  try{
    await guardar('dist',[...LIVE.dist,rd]);
    if(medio){ const rc={id:nid(),ts,f,c:imp>0?'Cobro distribuidora':'Pago a distribuidora',d:nom+(nota?' · '+nota:''),ing:imp>0?abs:0,egr:imp>0?0:abs,m:medio};
      try{ await guardar('caja',[...LIVE.caja,rc]); }catch(e){ await guardar('dist',LIVE.dist.filter(x=>x.id!==rd.id)).catch(()=>{}); throw e; } }
    toast((imp>0?'Cobro':'Pago')+' de '+fmt(abs)+' guardado ✓'+(medio?' · '+medio+' y cuenta de '+nom:' · solo en la cuenta de '+nom));
    if($('v-caja')&&!$('v-caja').hidden) pintarCaja(); if($('v-dist')&&!$('v-dist').hidden) pintarDist(); pintarInicio();
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
// pareja caja ↔ cuenta del distribuidor de un cobro/pago cargado junto (misma fecha e importe, guardados con segundos de diferencia)
function parDist(r){ if(!r||!(r.c==='Cobro distribuidora'||r.c==='Pago a distribuidora'))return null; const imp=r.c==='Cobro distribuidora'?r.ing:-r.egr;
  const cs=LIVE.dist.filter(x=>x.f===r.f&&Math.abs(x.imp-imp)<0.5&&Math.abs(new Date(x.ts)-new Date(r.ts))<120000); return cs.length===1?cs[0]:null; }
function cajaDeDist(d){ if(!d)return null; const cs=LIVE.caja.filter(r=>(r.c==='Cobro distribuidora'||r.c==='Pago a distribuidora')&&parDist(r)===d); return cs.length===1?cs[0]:null; }
let TRANSF_BUSY=false;
async function transferirCaja(de,a,imp,f,nota){
  if(de===a){toast('Elegí dos cajas distintas');return;} if(imp<=0){toast('Poné el importe');return;} if(!f){toast('Poné la fecha');return;} if(TRANSF_BUSY)return;
  const d=de+' → '+a+(nota?' · '+nota:''), ts=new Date().toISOString();
  const r1={id:nid(),ts,f,c:'Transferencia entre cuentas',d,ing:0,egr:imp,m:de}, r2={id:nid(),ts,f,c:'Transferencia entre cuentas',d,ing:imp,egr:0,m:a};
  TRANSF_BUSY=true;
  try{ await guardar('caja',[...LIVE.caja,r1,r2]); toast(`Pasado ${fmt(imp)} de ${de} a ${a} ✓`); pintarCaja(); }catch(e){toast('Error: '+((e&&e.message)||e));} finally{TRANSF_BUSY=false;}
}
// contraparte de una transferencia entre cajas (misma fecha, detalle e importe, del otro lado)
function parTransf(r){ if(!r||r.c!=='Transferencia entre cuentas'||!/ → /.test(r.d||''))return null; return LIVE.caja.find(x=>x.id!==r.id&&x.c===r.c&&x.f===r.f&&x.d===r.d&&Math.abs((x.ing||0)-(r.egr||0))<0.5&&Math.abs((x.egr||0)-(r.ing||0))<0.5)||null; }
async function borrarCaja(id){
  const r=LIVE.caja.find(x=>x.id===id), p=parTransf(r);
  if(!r) return;
  // lo que nació en otra pantalla se borra desde ahí, para que no quede la mitad (cobro sin caja, venta sin plata, pago a proveedor descontado)
  const cob=r.c==='Cobro a cliente'?LIVE.movs.find(m=>m.tipo==='Cobro'&&(r.mid?String(m.id)===r.mid:cajaDeCobro(m)===r)):null;
  if(cob){ toast('Es el cobro de '+nomCli(cob.cli)+': borralo desde su ficha y sale de los dos lados'); ficha(cob.cli); return; }
  if(STOCK_OK&&LIVE.stock.some(m=>String(m.cajaId)===String(r.id))){ toast('Viene de una venta o compra de stock: anulala desde Ventas o Compras'); return; }
  if(STOCK_OK&&LIVE.provmov.some(m=>String(m.cajaId)===String(r.id))){ toast('Es un pago a proveedor: anulalo desde Compras → Proveedores'); return; }
  const pd=parDist(r);
  if(!confirm(p?'¿Borrar esta transferencia entre cajas? Se borran las dos partes ('+(r.egr?r.m+' → '+p.m:p.m+' → '+r.m)+').':(pd?'¿Borrar? También se saca de la cuenta de '+unesc(nomDist(pd.dist||1))+'.':'¿Borrar?')))return;
  try{ await guardar('caja',LIVE.caja.filter(x=>x.id!==id&&(!p||x.id!==p.id))); if(pd) await guardar('dist',LIVE.dist.filter(x=>x.id!==pd.id)); toast('Borrado'); pintarCaja(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}

/* ---- v97: CAJAS Y MEDIOS DE PAGO (solo admin): agregar, renombrar, ordenar, fijar y sacar ---- */
function panelCajasHTML(porMedio){
  const fijas=cajasFijas(), sal=m=>{ let v=0; LIVE.caja.forEach(r=>{ if(r.m===m) v+=(r.ing||0)-(r.egr||0); }); return v; };
  return `<details class="card plegable" id="pcajas"><summary>Cajas y medios de pago <span class="mini">agregar, renombrar, ordenar o sacar</span></summary>
    <div class="mini" style="margin:12px 0 6px">La primera es la que viene elegida por defecto. "Siempre visible" = se ve en Inicio y Caja aunque esté en $0. Renombrar cambia el nombre en todos los movimientos cargados acá (el histórico de NewsPaper no se toca).</div>
    ${LISTAS.medios.map((m,i)=>{ const v=sal(m); const mm=esc(m); return `<div class="mov" style="align-items:center"><span class="t"><b>${mm}</b>${i===0?' <span class="pill p-cli">por defecto</span>':''} <span class="mini">${fmt(v)}</span></span>
      <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end"><label class="chkl" style="font-size:13px;margin:0;padding:0"><input type="checkbox" ${fijas.includes(m)?'checked':''} onchange="cajaFija(${i},this.checked)"> siempre visible</label>
      <button class="mini-btn" title="Subir" onclick="cajaSubir(${i})" ${i>0?'':'style="visibility:hidden"'}>↑</button><button class="mini-btn" title="Renombrar" onclick="cajaRenombrar(${i})">✎</button><button class="mini-btn" title="Sacar de la lista" onclick="cajaSacar(${i})">✕</button></span></div>`; }).join('')}
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px"><input id="cnueva" placeholder="Nueva caja o medio (ej: Banco Galicia)" style="margin:0;max-width:280px"><button class="btn chico" style="margin:0" onclick="cajaAgregar()">Agregar</button></div></details>`;
}
async function guardarCajas(medios,fijas,msg){
  const{error}=await sb.from('config').upsert({clave:'medios',valor:medios}); if(error)throw new Error(error.message);
  const{error:e2}=await sb.from('config').upsert({clave:'cajas_fijas',valor:fijas}); if(e2)throw new Error(e2.message);
  LISTAS.medios=medios; CONFIG.raw=CONFIG.raw||{}; CONFIG.raw.medios=medios; CONFIG.raw.cajas_fijas=fijas;
  toast(msg); pintarCaja(); const d=$('pcajas'); if(d) d.open=true; pintarInicio();
}
async function cajaAgregar(){ const n=($('cnueva').value||'').trim(); if(!n){toast('Poné el nombre');return;}
  if(LISTAS.medios.some(m=>norm(m)===norm(n))){toast('Ya existe');return;}
  try{ await guardarCajas([...LISTAS.medios,n],[...cajasFijas(),n],'Agregada: '+n+' ✓'); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function cajaFija(i,on){ const m=LISTAS.medios[i]; const f=cajasFijas().filter(x=>x!==m); if(on) f.push(m);
  try{ await guardarCajas(LISTAS.medios,f,on?m+': siempre visible':m+': solo cuando tiene saldo'); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function cajaSubir(i){ const l=[...LISTAS.medios]; [l[i-1],l[i]]=[l[i],l[i-1]];
  try{ await guardarCajas(l,cajasFijas(),i===1?l[0]+' es ahora la caja por defecto':'Orden guardado'); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function cajaSacar(i){ const m=LISTAS.medios[i]; let v=0; LIVE.caja.forEach(r=>{ if(r.m===m) v+=(r.ing||0)-(r.egr||0); });
  if(Math.abs(v)>0.5){ toast(m+' tiene '+fmt(v)+': primero pasá la plata a otra caja (Pase entre cajas)'); return; }
  if(LISTAS.medios.length<2){toast('Tiene que quedar al menos una');return;}
  if(!confirm('¿Sacar "'+m+'" de la lista? Los movimientos viejos conservan el nombre; no se puede elegir más para cargar.'))return;
  try{ await guardarCajas(LISTAS.medios.filter(x=>x!==m),cajasFijas().filter(x=>x!==m),'Sacada: '+m); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function cajaRenombrar(i){ const m=LISTAS.medios[i]; const t=prompt('Nuevo nombre para "'+m+'":',m); if(t===null)return; const n=t.trim(); if(!n||n===m)return;
  if(LISTAS.medios.some(x=>x!==m&&norm(x)===norm(n))){toast('Ya hay una con ese nombre');return;}
  if(!confirm('Se cambia "'+m+'" por "'+n+'" en la lista y en todos los movimientos cargados acá (caja, cobros y ventas). ¿Seguir?'))return;
  try{
    for(const t of ['caja','movimientos','stock_mov']){ const{error}=await sb.from(t).update({medio:n}).eq('medio',m).or('origen.is.null,origen.neq.newspaper'); if(error&&!(t==='stock_mov'&&!STOCK_OK))throw new Error(t+': '+error.message); }
    await Promise.all(['caja','movs'].concat(STOCK_OK?['stock']:[]).map(cargarTabla));
    await guardarCajas(LISTAS.medios.map(x=>x===m?n:x),cajasFijas().map(x=>x===m?n:x),'"'+m+'" ahora se llama "'+n+'" ✓');
  }catch(e){toast('Error: '+((e&&e.message)||e));} }
