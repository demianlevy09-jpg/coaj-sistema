// COHAJ Sistema — Urban Point / Urban Soft (v99)
// Parte del código de la app. Se carga después de stock.js: usa LIVE, ins, cargarTabla, prodDe, provDe, stockDe.
/* ------- ENTREGAS DE URBAN POINT (v99) -------
   La Edge Function "urbansoft" espeja en la tabla urbansoft_lineas lo que Urban Soft dice que mandó al kiosko
   (consignaciones por salida y pedidos directos). Acá NO se suma nada solo: las líneas quedan "pendientes" hasta que
   el admin revisa lo que llegó y las marca como recibidas; recién ahí entran al stock (recepción en consignación
   o compra propia, con el costo real de Urban Soft). Las devoluciones salen por el formulario de siempre; esta
   pantalla avisa cuáles vencen. */
let URBAN_OK=false;
function usProvId(){ const v=CONFIG.raw&&CONFIG.raw.urbansoft_proveedor; if(v) return Number(v); const p=LIVE.prov.find(p=>/urban ?point/i.test(p.nombre)); return p?p.id:null; }
function usPendientes(){ return (LIVE.uslineas||[]).filter(l=>l.estado==='pendiente'&&l.estadoUs!=='cerrada'); }
function usDocs(ls){ const g={}; ls.forEach(l=>{ const k=(l.tipo==='consignacion'?'S':'P')+l.doc; g[k]=g[k]||{k,tipo:l.tipo,doc:l.doc,fecha:l.fecha,vence:l.vence,ls:[]}; g[k].ls.push(l); }); return Object.values(g).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')); }
function usVencen(dias){ // consignación recibida que hay que devolver pronto (y todavía hay stock del producto)
  const h=hoyISO(), lim=new Date(h+'T12:00:00'); lim.setDate(lim.getDate()+(dias||7)); const L=lim.toISOString().slice(0,10);
  return (LIVE.uslineas||[]).filter(l=>l.tipo==='consignacion'&&l.estado==='recibida'&&l.estadoUs!=='cerrada'&&l.vence&&l.vence<=L).map(l=>({...l,p:prodPorSku(l.sku)})).filter(x=>x.p&&(stockDe(x.p.id).consig[usProvId()||0]||0)>0).sort((a,b)=>(a.vence||'').localeCompare(b.vence||''));
}
function prodPorSku(sku){ const k=normSku(sku); if(!k) return null; return LIVE.prod.find(p=>normSku(p.sku)===k)||null; }
function normSku(s){ return String(s||'').replace(/[\s\-]/g,'').toLowerCase(); }
async function apiUrbansoft(body){
  const{data,error}=await sb.functions.invoke('urbansoft',{body});
  if(error){ let msg=error.message||String(error), j=null; try{ j=await error.context.json(); if(j&&j.error)msg=j.error; }catch(_){}
    if(!(j&&j.error)&&(/Failed to send|Failed to fetch/i.test(msg)||(error.context&&error.context.status===404))) msg='La función "urbansoft" no está publicada en Supabase todavía.';
    throw new Error(msg); }
  if(data&&data.error) throw new Error(data.error);
  return data;
}
// v100: consulta automática al abrir la app (si la última es de hace más de 4 horas). Nadie tiene que acordarse de apretar el botón.
async function urbansoftAuto(){
  if(!STOCK_OK||!URBAN_OK||!puede('compras')) return;
  const ult=(LIVE.ussync||[]).slice(-1)[0]; if(ult&&ult.ts&&(Date.now()-new Date(ult.ts).getTime())<4*3600*1000) return;
  try{ const antes=usPendientes().length; const r=await apiUrbansoft({accion:'sync'}); await Promise.all(['uslineas','ussync'].map(cargarTabla));
    const ahora=usPendientes().length; if(r&&r.nuevas&&ahora>antes) toast(`Llegó una entrega de Urban Point: ${ahora-antes} productos por recibir (Inicio → Para hacer)`);
    if($('v-inicio')&&!$('v-inicio').hidden) pintarInicio(); if($('v-compras')&&!$('v-compras').hidden&&CTIPO==='urbanpoint') pintarCompras();
  }catch(e){ console.warn('urbansoft auto',e); /* sin token o sin red: se intenta en la próxima apertura; el botón manual muestra el error */ }
}
async function sincronizarUrbansoft(){
  const b=$('us-sync'); if(b){b.disabled=true;b.textContent='Consultando…';}
  try{ const r=await apiUrbansoft({accion:'sync'}); await Promise.all(['uslineas','ussync'].map(cargarTabla)); toast(`Urban Soft: ${r.lineas} líneas, ${r.nuevas} nuevas, ${r.pendientes} por recibir`); }
  catch(e){ toast('Error: '+((e&&e.message)||e)); }
  if(CTIPO==='urbanpoint') pintarCompras(); pintarInicio();
}
function pintarUrbansoft(){
  if(!URBAN_OK) return `<div class="aviso">Falta crear las tablas de Urban Soft en la base (archivo <b>supabase/2026-11-05_urbansoft.sql</b>) y publicar la función <b>urbansoft</b>.</div>`;
  const pend=usPendientes(), docs=usDocs(pend), ult=(LIVE.ussync||[]).slice(-1)[0], venc=usVencen(7);
  const prov=usProvId();
  let h=`<div class="mini" style="margin:6px 0 2px">Lo que Urban Soft dice que Urban Point le mandó al kiosko. Nada entra al stock hasta que lo revisás y lo marcás como recibido.</div>
  <div class="acc" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 12px"><button class="btn chico" id="us-sync" onclick="sincronizarUrbansoft()">Actualizar desde Urban Soft</button><span class="mini">${ult?(ult.ok?'Última consulta '+fechaHora(ult.ts)+' · '+ult.d:'<span class="rojo">Última consulta falló: '+ult.d+'</span>'):'Todavía no se consultó nunca.'}</span></div>`;
  if(!prov) h+=`<div class="aviso">No encuentro el proveedor "Urban Point" en Compras → Proveedores. Crealo (sin % de tapa) para poder recibir.</div>`;
  if(!docs.length) h+=`<div class="card"><b>No hay entregas pendientes.</b><div class="mini">Cuando Urban Point mande algo nuevo, aparece acá y en Inicio.</div></div>`;
  docs.forEach(d=>{
    const u=d.ls.reduce((n,l)=>n+l.qty,0), tot=d.ls.reduce((n,l)=>n+l.qty*(l.pvp||0),0);
    h+=`<div class="card" id="usdoc-${d.k}" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><b>${d.tipo==='consignacion'?'Salida #'+d.doc+' · consignación':'Pedido #'+d.doc+' · compra (stock propio)'}</b><span class="mini">${d.fecha?fecha(d.fecha):''}${d.vence?' · devolver antes del '+fecha(d.vence):''} · ${d.ls.length} productos · ${u} u. · ${fmt(tot)} a PVP</span></div>
    <table class="tabla" style="margin-top:8px"><thead><tr><th>Producto</th><th>SKU</th><th>Enviado</th><th>Llegó</th><th>Costo</th><th>PVP</th><th></th></tr></thead><tbody>
    ${d.ls.map(l=>{ const p=prodPorSku(l.sku); return `<tr id="usl-${cssId(l.id)}"><td data-l="Producto">${l.nombre||'(sin nombre)'}${p?'':' <span class="mini">· producto nuevo</span>'}</td><td class="mini" data-l="SKU">${l.sku||''}</td><td data-l="Enviado">${l.qty}</td><td data-l="Llegó"><input type="number" inputmode="numeric" min="0" max="${l.qty}" value="${l.qty}" data-usq="${l.id}" style="width:64px"></td><td data-l="Costo">${fmt(l.costo||0)}</td><td data-l="PVP">${fmt(l.pvp||0)}</td><td data-l=""><button class="btn chico sec" onclick="usNoLlego('${l.id}')" title="No vino en esta entrega">No llegó</button></td></tr>`; }).join('')}
    </tbody></table>
    <div class="acc" style="margin-top:8px"><button class="btn chico" onclick="usRecibirDoc('${d.k}')">Marcar como recibida${d.ls.length>1?' (todo el documento)':''}</button></div></div>`;
  });
  if(venc.length) h+=`<div class="sec" style="margin-top:18px"><span class="dot"></span>Para devolver antes de que venza</div><div class="card"><div class="mini">Consignación cuyo plazo de devolución vence en los próximos 7 días (o ya venció) y todavía tiene stock. Se devuelve desde "Devolución a proveedor".</div><table class="tabla" style="margin-top:6px"><thead><tr><th>Producto</th><th>Vence</th><th>En stock</th><th></th></tr></thead><tbody>${venc.map(x=>`<tr><td data-l="Producto">${x.p.nombre}</td><td data-l="Vence" class="${x.vence<hoyISO()?'rojo':''}">${fecha(x.vence)}</td><td data-l="En stock">${stockDe(x.p.id).consig[prov||0]||0}</td><td data-l=""><button class="btn chico sec" onclick="usIrDevolver(${x.p.id})">Devolver</button></td></tr>`).join('')}</tbody></table></div>`;
  const rec=(LIVE.uslineas||[]).filter(l=>l.estado!=='pendiente').sort((a,b)=>(b.recibidoEn||'').localeCompare(a.recibidoEn||'')).slice(0,15);
  if(rec.length) h+=`<div class="sec" style="margin-top:18px"><span class="dot"></span>Últimas recibidas</div><div class="card lista-ult">${rec.map(l=>`<div class="mov"><span class="f">${l.recibidoEn?fecha(l.recibidoEn.slice(0,10)):''}</span><span class="t">${l.tipo==='consignacion'?'Salida #':'Pedido #'}${l.doc} · ${l.nombre||l.sku||''} · ${l.estado==='rechazada'?'no llegó':(l.qtyRec!=null&&l.qtyRec!==l.qty?l.qtyRec+' de '+l.qty:l.qty)}${l.nota?' · '+l.nota:''}</span></div>`).join('')}</div>`;
  return h;
}
function cssId(s){ return String(s).replace(/[^A-Za-z0-9_-]/g,'_'); }
function fechaHora(ts){ if(!ts) return ''; const d=new Date(ts); return d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}); }
async function usRecibirLinea(l,qty,quien){
  // producto: por SKU; si no existe, se crea con los datos de Urban Soft
  let p=prodPorSku(l.sku);
  if(!p){ const pid=await ins('productos',{nombre:l.nombre||('Producto '+(l.sku||l.productoUs)),categoria:l.cat||'Mercadería Urban Point',proveedor_id:quien,modo_precio:'fijo',precio_venta:l.pvp||0,margen:0,costo:l.costo||0,sku:l.sku||null,origen:'urbansoft_api'}); await cargarTabla('prod'); p=prodDe(pid); }
  else { const up={}; if(l.costo&&p.costo!==l.costo) up.costo=l.costo; if(l.pvp&&p.modo==='fijo'&&p.precio!==l.pvp) up.precio_venta=l.pvp; if(!p.sku&&l.sku) up.sku=l.sku; if(Object.keys(up).length) await sb.from('productos').update(up).eq('id',p.id); }
  const consig=l.tipo==='consignacion';
  const nota=(consig?'Salida #':'Pedido #')+l.doc+' · SKU '+(l.sku||'')+(consig&&l.vence?' · devolver antes del '+l.vence:'')+(qty!==l.qty?' · llegaron '+qty+' de '+l.qty:'')+' · Urban Soft';
  const mid=await ins('stock_mov',{producto_id:p.id,fecha:hoyISO(),tipo:consig?'recepcion':'compra',cantidad:qty,propiedad:consig?'consignacion':'propio',proveedor_id:quien,costo_unit:l.costo||0,precio_unit:l.pvp||0,medio:'',nota,origen:'urbansoft_api',edicion:''});
  const{error}=await sb.from('urbansoft_lineas').update({estado:'recibida',cantidad_recibida:qty,stock_mov_id:mid,recibido_en:new Date().toISOString(),recibido_por:USUARIO&&USUARIO.id||null,nota:qty!==l.qty?'llegaron '+qty+' de '+l.qty:''}).eq('id',l.id); if(error) throw new Error(error.message);
}
async function usRecibirDoc(k){
  const d=usDocs(usPendientes()).find(x=>x.k===k); if(!d) return;
  const quien=usProvId(); if(!quien){toast('Falta el proveedor Urban Point');return;}
  const plan=d.ls.map(l=>{ const i=document.querySelector(`[data-usq="${l.id}"]`); return {l,qty:Math.max(0,Math.min(l.qty,parseInt(i&&i.value)||0))}; });
  const u=plan.reduce((n,x)=>n+x.qty,0), faltan=plan.filter(x=>x.qty<x.l.qty).length;
  if(!confirm(`¿Marcar como recibida ${d.tipo==='consignacion'?'la salida #':'el pedido #'}${d.doc}? Entran ${u} unidades al stock${d.tipo==='consignacion'?' en consignación de Urban Point':' como propias'}${faltan?` (${faltan} productos con menos de lo enviado)`:''}.`)) return;
  try{
    for(const x of plan){ if(x.qty>0) await usRecibirLinea(x.l,x.qty,quien); else { const{error}=await sb.from('urbansoft_lineas').update({estado:'rechazada',cantidad_recibida:0,recibido_en:new Date().toISOString(),recibido_por:USUARIO&&USUARIO.id||null,nota:'no llegó'}).eq('id',x.l.id); if(error) throw new Error(error.message); } }
    await Promise.all(['stock','prod','uslineas'].map(cargarTabla)); SCACHE={}; toast('Recibido ✓ · '+u+' unidades'); pintarCompras(); pintarInicio();
  }catch(e){ toast('Error: '+((e&&e.message)||e)); await Promise.all(['stock','prod','uslineas'].map(cargarTabla)); pintarCompras(); }
}
async function usNoLlego(id){
  const l=(LIVE.uslineas||[]).find(x=>x.id===id); if(!l) return;
  if(!confirm(`¿Marcar "${l.nombre||l.sku}" como no recibido? Queda registrado para reclamarle a Urban Point; no entra al stock.`)) return;
  try{ const{error}=await sb.from('urbansoft_lineas').update({estado:'rechazada',cantidad_recibida:0,recibido_en:new Date().toISOString(),recibido_por:USUARIO&&USUARIO.id||null,nota:'no llegó'}).eq('id',id); if(error) throw new Error(error.message); await cargarTabla('uslineas'); toast('Anotado: no llegó'); pintarCompras(); pintarInicio(); }
  catch(e){ toast('Error: '+((e&&e.message)||e)); }
}
function usIrDevolver(pid){ CTIPO='devolucion'; pintarCompras(); setTimeout(()=>{ const s=$('c-prov'); if(s&&usProvId()){ s.value=String(usProvId()); s.dispatchEvent(new Event('change')); } const p=$('c-prod'); if(p){ p.value=String(pid); p.dispatchEvent(new Event('change')); } const c=$('cform'); if(c) c.scrollIntoView({behavior:'smooth'}); },50); }
