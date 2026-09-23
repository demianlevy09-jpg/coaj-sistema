// COHAJ Sistema — Caja
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- CAJA ------- */
function pintarCaja(){
  const porMedio=Object.fromEntries(saldosCaja());
  const rows=[...LIVE.caja].sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
  const hoyC=hoyISO(), deHoy=LIVE.caja.filter(r=>(r.f||'').startsWith(hoyC)), netoHoy=deHoy.reduce((n,r)=>n+(r.ing||0)-(r.egr||0),0);
  $('v-caja').innerHTML=`${titulo('Caja','Saldo por medio de pago y movimientos cargados acá')}
  <div class="kpis">${Object.keys(porMedio).length?Object.entries(porMedio).map(([m,v])=>`<div class="kpi ${v<-0.5?'rojo':'ok'}"><i>${m||'Sin medio'}</i><b>${fmt(v)}</b><i>saldo actual</i></div>`).join(''):'<div class="kpi gris"><i>Caja</i><b>—</b><i>sin movimientos aún</i></div>'}<div class="kpi ${deHoy.length?(netoHoy<0?'rojo':''):'gris'}"><i>Hoy</i><b>${deHoy.length?fmt(netoHoy):'—'}</b><i>${deHoy.length?deHoy.length+' movimientos':'sin movimientos hoy'}</i></div></div>
  <div class="card"><b>Pasar plata entre cajas</b><div class="mini" style="margin:2px 0 4px">Ej: depositaste efectivo y ahora está en la cuenta. Sale de una caja y entra en la otra; el total no cambia.</div>
    <div class="grid2"><div><label>Sale de</label><select id="tdesde">${LISTAS.medios.map(m=>`<option${m==='Efectivo'?' selected':''}>${m}</option>`).join('')}</select></div>
    <div><label>Entra a</label><select id="thacia">${LISTAS.medios.map(m=>`<option${m==='Transferencia'?' selected':''}>${m}</option>`).join('')}</select></div></div>
    <div class="grid2"><div><label>Importe $</label><input id="timp" type="number" inputmode="decimal" placeholder="0"></div><div><label>Fecha</label><input id="tf" type="date" value="${hoyISO()}"></div></div>
    <label>Nota</label><input id="tnota" placeholder="opcional, ej: depósito en el banco">
    <button class="btn" id="tok">Pasar</button></div>
  <div class="card"><b>Cargar movimiento de caja</b>
    <label>Concepto</label><select id="cc">${CONCEPTOS_CAJA.map(c=>`<option>${c}</option>`).join('')}</select>
    <div class="grid2"><div><label>Ingreso $</label><input id="cing" type="number" inputmode="decimal" placeholder="0"></div>
    <div><label>Egreso $</label><input id="cegr" type="number" inputmode="decimal" placeholder="0"></div></div>
    <label>Medio</label><select id="cm">${LISTAS.medios.map(m=>`<option>${m}</option>`).join('')}</select>
    <label>Detalle</label><input id="cd" placeholder="ej: pago distribuidora semana 36">
    <label>Fecha</label><input id="cf" type="date" value="${hoyISO()}">
    <button class="btn" id="cok">Guardar</button></div>
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
    const nc=cli?norm(nomCli(cli)):'';
    const rs=rows.filter(r=>(!fc||r.c===fc)&&(!fm||r.m===fm)&&enRango(r.f)&&(!cli||norm(r.d||'')===nc||norm(r.d||'').includes(nc))&&(!ft||norm((r.c||'')+' '+(r.d||'')).includes(ft))&&(!soloDup||kc[kkey(r)]>1));
    const ti=rs.reduce((n,r)=>n+(r.ing||0),0), te=rs.reduce((n,r)=>n+(r.egr||0),0);
    $('ctot').innerHTML=`${rs.length} movimientos · ingresos <b>${fmt(ti)}</b> · egresos <b>${fmt(te)}</b> · neto <b>${fmt(ti-te)}</b>`;
    $('cmas').hidden=rs.length<=CLIM;
    $('clist').innerHTML=rs.length?rs.slice(0,CLIM).map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r.c||''}${r.d?' · '+r.d:''} <span class="mini">${r.m||''}</span>${kc[kkey(r)]>1?' <span class="pill p-warn">¿duplicado?</span>':''}</span><span class="m ${r.egr?'debe':'favor'}">${r.egr?'−':''}${fmt(r.ing||r.egr)}</span>${r.fijo?'':`<button class="del" data-cid="${r.id}">✕</button>`}</div>`).join(''):'<div class="mini">Nada con ese filtro.</div>';
  }
  window.pintaH=function(){
    const ft=norm($('fch2').value);
    const rs=CAJAH.filter(r=>!ft||norm((r.c||'')+' '+(r.d||'')).includes(ft));
    $('chlist').innerHTML=rs.slice(-30).reverse().map(r=>`<div class="mov"><span class="f">${fecha(r.f)}</span><span class="t">${r.c||''}${r.d?' · '+r.d:''}</span><span class="m">${r.e?'−':''}${fmt(r.i||r.e)}</span></div>`).join('')||'<div class="mini">Nada con ese filtro.</div>';
  }
  pintaC();pintaH();
}
async function addCaja(){
  const ing=parseFloat($('cing').value)||0, egr=parseFloat($('cegr').value)||0;
  if(!ing&&!egr){toast('Poné un importe');return;}
  const r={id:nid(),ts:new Date().toISOString(),f:$('cf').value,c:$('cc').value,d:$('cd').value,ing,egr,m:$('cm').value};
  try{ await guardar('caja',[...LIVE.caja,r]); toast('Caja guardada ✓'); pintarCaja(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
let TRANSF_BUSY=false;
async function transferirCaja(){
  const de=$('tdesde').value, a=$('thacia').value, imp=parseFloat($('timp').value)||0, f=$('tf').value, nota=$('tnota').value.trim();
  if(de===a){toast('Elegí dos cajas distintas');return;} if(imp<=0){toast('Poné el importe');return;} if(TRANSF_BUSY)return;
  const d=de+' → '+a+(nota?' · '+nota:''), ts=new Date().toISOString();
  const r1={id:nid(),ts,f,c:'Transferencia entre cuentas',d,ing:0,egr:imp,m:de}, r2={id:nid(),ts,f,c:'Transferencia entre cuentas',d,ing:imp,egr:0,m:a};
  TRANSF_BUSY=true;
  try{ await guardar('caja',[...LIVE.caja,r1,r2]); toast(`Pasado ${fmt(imp)} de ${de} a ${a} ✓`); pintarCaja(); }catch(e){toast('Error: '+((e&&e.message)||e));} finally{TRANSF_BUSY=false;}
}
// contraparte de una transferencia entre cajas (misma fecha, detalle e importe, del otro lado)
function parTransf(r){ if(!r||r.c!=='Transferencia entre cuentas'||!/ → /.test(r.d||''))return null; return LIVE.caja.find(x=>x.id!==r.id&&x.c===r.c&&x.f===r.f&&x.d===r.d&&Math.abs((x.ing||0)-(r.egr||0))<0.5&&Math.abs((x.egr||0)-(r.ing||0))<0.5)||null; }
async function borrarCaja(id){
  const r=LIVE.caja.find(x=>x.id===id), p=parTransf(r);
  if(!confirm(p?'¿Borrar esta transferencia entre cajas? Se borran las dos partes ('+(r.egr?r.m+' → '+p.m:p.m+' → '+r.m)+').':'¿Borrar?'))return;
  try{ await guardar('caja',LIVE.caja.filter(x=>x.id!==id&&(!p||x.id!==p.id))); toast('Borrado'); pintarCaja(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
