// COHAJ Sistema — Resumen de cuenta imprimible
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- RESUMEN DE CUENTA (imprimible, 3 por A4) ------- */
function emisor(){ return Object.assign({nombre:'',domicilio:'',condicion:'',alias:'',cvu:'',titular:'',titulo:'Resumen de cuenta — no válido como factura',leyenda:''},(CONFIG.raw&&CONFIG.raw.emisor)||{}); }
function armarResumen(c,periodo){ // periodo = último día del mes (ISO)
  const d=new Date(periodo+'T12:00:00'); const y=d.getFullYear(), m=d.getMonth();
  const ini=`${y}-${String(m+1).padStart(2,'0')}-01`;
  const saldo=saldoDe(c,periodo);
  const cm=consumoMes(c,y,m);
  const enMes=f=>f&&f.slice(0,10)>=ini&&f.slice(0,10)<=periodo;
  let cobros=0, ajustes=0;
  c.movs.forEach(x=>{ if(!enMes(x[0]))return; if(x[1]==='Cobro') cobros+=-x[2]; else if(x[1]==='Ajuste') ajustes+=x[2]; });
  LIVE.movs.forEach(x=>{ if(x.cli!==c.id||!enMes(x.f))return; if(x.tipo==='Cobro') cobros+=x.imp; else if(x.tipo==='Ajuste') ajustes+=x.imp; });
  const anterior=saldo-cm.tot-ajustes+cobros;
  const detalle=Object.entries(cm.agg).map(([pub,a])=>({pub,n:a.n,tot:a.tot}));
  return {cliente_id:c.id,periodo,saldo_anterior:+anterior.toFixed(2),consumo:+cm.tot.toFixed(2),cobros:+cobros.toFixed(2),ajustes:+ajustes.toFixed(2),saldo:+saldo.toFixed(2),detalle};
}
function htmlResumen(c,r){
  const e=emisor(); const d=new Date(r.periodo+'T12:00:00');
  const mes0=MESES[d.getMonth()]; const per=mes0.charAt(0).toUpperCase()+mes0.slice(1)+' '+d.getFullYear();
  const f=n=>(n<0?'−':'')+'$'+Math.abs(n).toLocaleString('es-AR',{maximumFractionDigits:0});
  const det=(r.detalle||[]).map(x=>`<tr><td>&nbsp;&nbsp;${x.pub} · ${x.n} ejemplares</td><td>${f(x.tot)}</td></tr>`).join('');
  return `<div class="res">
    <div class="rh"><div class="em"><b>${e.nombre}</b><div>${e.domicilio}</div><div>${e.condicion}</div></div>
      <div class="nr"><div>Resumen Nº <b>${String(r.numero||'').padStart(6,'0')}</b></div><div>Emitido: ${fecha(hoyISO())}</div><div>Período: <b>${per}</b></div></div></div>
    <div class="rt">${e.titulo}</div>
    <div class="cl"><div><b>${c.d}</b><br>${c.n||''}</div><div style="text-align:right">Cliente Nº ${c.id}</div></div>
    <table>
      <tr><td>Saldo anterior</td><td>${f(r.saldo_anterior)}</td></tr>
      <tr><td>Consumo de ${per}</td><td>${f(r.consumo)}</td></tr>${det}
      ${r.ajustes?`<tr><td>Ajustes</td><td>${f(r.ajustes)}</td></tr>`:''}
      ${r.cobros?`<tr><td>Pagos recibidos en ${per}</td><td>−${f(r.cobros)}</td></tr>`:''}
      <tr class="tot"><td>Saldo al ${fecha(r.periodo)}</td><td>${f(r.saldo)}</td></tr>
    </table>
    <div class="pago"><div>Transferencia: Alias <b>${e.alias}</b> · CVU <b>${e.cvu}</b><br>Titular: ${e.titular}</div><div style="text-align:right">Efectivo: en el puesto</div></div>
    ${(()=>{const u=ultimosCobros(c,3); return u.length?`<div class="ult"><b>Últimos pagos:</b> ${u.map(x=>fecha(x.f)+' '+f(x.imp)+(x.medio?' ('+x.medio.toLowerCase()+')':'')).join(' · ')}</div>`:'';})()}
    ${e.leyenda?`<div class="ley">${e.leyenda}</div>`:''}
  </div>`;
}
// últimos N cobros del cliente (NewsPaper + cargados acá), más reciente primero
function ultimosCobros(c,nn){
  const l=[];
  c.movs.forEach(m=>{ if(m[1]==='Cobro') l.push({f:(m[0]||'').slice(0,10),imp:Math.abs(m[2]),medio:m[3]||''}); });
  LIVE.movs.forEach(m=>{ if(m.cli===c.id&&m.tipo==='Cobro') l.push({f:(m.f||'').slice(0,10),imp:Math.abs(m.imp),medio:m.medio||''}); });
  return l.sort((a,b)=>b.f.localeCompare(a.f)).slice(0,nn||3);
}
async function imprimirResumenes(ids){
  const periodo=cierreISO();
  toast('Armando '+ids.length+' resumen'+(ids.length>1?'es':'')+'…');
  try{
    const {data:prev,error}=await sb.from('resumenes').select('*').in('cliente_id',ids).eq('periodo',periodo).eq('anulado',false).order('numero',{ascending:false});
    if(error)throw error;
    const ya={}; (prev||[]).forEach(r=>{ if(!ya[r.cliente_id]) ya[r.cliente_id]=r; });
    const nuevos=[];
    for(const id of ids){ const c=C.find(x=>x.id===id); if(!c||ya[id])continue; nuevos.push(armarResumen(c,periodo)); }
    if(nuevos.length){
      const {data:ins,error:e2}=await sb.from('resumenes').insert(nuevos).select('*'); if(e2)throw e2;
      ins.forEach(r=>{ya[r.cliente_id]=r;});
    }
    const bloques=ids.map(id=>{const c=C.find(x=>x.id===id); const r=ya[id]; return (c&&r)?htmlResumen(c,{...r,saldo_anterior:+r.saldo_anterior,consumo:+r.consumo,cobros:+r.cobros,ajustes:+r.ajustes,saldo:+r.saldo}):'';}).filter(Boolean);
    let html=''; for(let i=0;i<bloques.length;i+=3) html+='<div class="pagina">'+bloques.slice(i,i+3).join('')+'</div>';
    $('print-area').innerHTML=html;
    setTimeout(()=>{window.print();},150);
    if(nuevos.length) toast(nuevos.length+' resumen'+(nuevos.length>1?'es nuevos':' nuevo')+' guardado'+(nuevos.length>1?'s':''));
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function guardarEmisor(){
  const v={nombre:$('emn').value.trim(),domicilio:$('emd').value.trim(),condicion:$('emc').value.trim(),alias:$('ema').value.trim(),cvu:$('emv').value.trim(),titular:$('emt').value.trim(),titulo:$('emti').value.trim(),leyenda:$('eml').value.trim()};
  try{ const{error}=await sb.from('config').upsert({clave:'emisor',valor:v}); if(error)throw error; CONFIG.raw=CONFIG.raw||{}; CONFIG.raw.emisor=v; toast('Datos del resumen guardados ✓'); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
function formEmisorHTML(){
  const e=emisor();
  return `<div class="card"><b>Datos del resumen de cuenta</b><div class="mini" style="margin:4px 0 6px">Aparecen en el encabezado y al pie de cada resumen impreso.</div>
    <label>Nombre / razón social</label><input id="emn" value="${e.nombre}">
    <label>Domicilio</label><input id="emd" value="${e.domicilio}">
    <label>Condición (ej. Responsable Inscripto)</label><input id="emc" value="${e.condicion}">
    <div class="grid2"><div><label>Alias</label><input id="ema" value="${e.alias}"></div><div><label>CVU</label><input id="emv" value="${e.cvu}"></div></div>
    <label>Titular de la cuenta</label><input id="emt" value="${e.titular}">
    <label>Título del documento</label><input id="emti" value="${e.titulo}">
    <label>Leyenda al pie</label><input id="eml" value="${e.leyenda}">
    <button class="btn chico" id="emok">Guardar</button></div>`;
}
