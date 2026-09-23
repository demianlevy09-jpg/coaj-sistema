// COHAJ Sistema — Stock, ventas, compras y proveedores
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- STOCK / VENTAS / COMPRAS / PROVEEDORES (v47) ------- */
let DISTS=[], STOCK_OK=true, CTIPO='compra', PSEL=null, VLOTE='';
const r0=n=>Math.round(n||0);
function precioVenta(p){ return p.modo==='margen'?r0(p.costo*(1+(p.margen||0)/100)):(p.precio||0); }
function prodDe(id){ return LIVE.prod.find(p=>p.id===id); }
function provDe(id){ return LIVE.prov.find(p=>p.id===id); }
function nomProv(id){ const p=provDe(id); return p?p.nombre:(id?'Prov. '+id:'—'); }
function stockDe(pid){
  const s={total:0,propio:0,consig:{}};
  LIVE.stock.filter(m=>m.prod===pid).forEach(m=>{ s.total+=m.qty; if(m.prop==='consignacion'){ s.consig[m.prov||0]=(s.consig[m.prov||0]||0)+m.qty; } else s.propio+=m.qty; });
  Object.keys(s.consig).forEach(k=>{ if(!s.consig[k]) delete s.consig[k]; });
  return s;
}
// ediciones (revistas mensuales): stock por número; orden numérico
function cmpEd(a,b){ const na=parseFloat(a),nb=parseFloat(b); if(!isNaN(na)&&!isNaN(nb)&&na!==nb)return na-nb; return String(a).localeCompare(String(b),'es',{numeric:true}); }
function edsDe(pid,prop,prov){ const m={}; LIVE.stock.filter(x=>x.prod===pid&&(!prop||x.prop===prop)&&(prov==null||(x.prov||0)===prov)).forEach(x=>{m[x.ed||'']=(m[x.ed||'']||0)+x.qty;}); return Object.keys(m).filter(k=>m[k]).sort(cmpEd).map(k=>({ed:k,qty:m[k]})); }
function edTxt(ed){ return ed?'nº '+ed:''; }
// ediciones viejas con stock cuando ya llegó una más nueva → para devolver
function paraDevolver(){ const r=[]; LIVE.prod.filter(p=>p.activo!==false).forEach(p=>{ const all=[...new Set(LIVE.stock.filter(x=>x.prod===p.id&&x.ed&&x.qty>0).map(x=>x.ed))].sort(cmpEd); if(all.length<2)return; const ult=all[all.length-1]; edsDe(p.id).filter(e=>e.ed&&e.qty>0&&cmpEd(e.ed,ult)<0).forEach(e=>r.push({p,ed:e.ed,qty:e.qty,nuevo:ult})); }); return r; }
// ---- revistas a suscriptores (v75): al llegar un número se genera una "entrega" por suscriptor en su próximo día de reparto
function pubsRevista(){ const cnt={}; C.filter(c=>c.act).forEach(c=>c.subs.filter(x=>x[3]==='V'&&!(FD(x[1])||[]).length).forEach(x=>{cnt[x[0]]=(cnt[x[0]]||0)+1;})); return Object.keys(cnt).sort((a,b)=>a.localeCompare(b)); }
function proximoReparto(cid,F){ const dias=new Set(LIVE.reparto.filter(r=>r.cli===cid).map(r=>r.dia)); const d=new Date(F+'T12:00:00'); for(let i=1;i<=21;i++){ d.setDate(d.getDate()+1); const iso=d.toISOString().slice(0,10); if(feriadoTotal(iso)) continue; if(!dias.size||dias.has(wdDe(iso))) return iso; } return null; }
function suscriptoresDe(p,F){ const keys=(p.pubs||[]).map(norm); if(!keys.length) return []; const out=[]; C.filter(c=>c.act).forEach(c=>{ const x=c.subs.find(x=>x[3]==='V'&&keys.includes(norm(x[0]))&&(x[4]||'').slice(0,10)<=F); if(x) out.push({c,x}); }); return out; }
async function generarEntregas(pid,ed,F,prop,prov){
  const p=prodDe(pid); if(!p||!(p.pubs||[]).length||!ed) return {n:0,sinPrecio:0};
  const ya=new Set(LIVE.stock.filter(m=>m.tipo==='entrega'&&m.prod===pid&&m.ed===ed).map(m=>m.cli));
  const pr=precioVenta(p); let n=0, sinPrecio=0;
  for(const {c,x} of suscriptoresDe(p,F)){
    if(ya.has(c.id)) continue;
    const D=proximoReparto(c.id,F); if(!D) continue;
    if(suspendida(c.id,x[0],D,null,altaDe(x))) continue;
    const q=Math.abs(x[5]||1); const det=q+'× '+p.nombre+' '+edTxt(ed);
    let movId=null, provMovId=null, nota='suscripción '+x[0];
    if(x[2]!=='S'){ // le cobrás vos: se anota en su cuenta y, si es consignación, se le debe al proveedor
      if(pr>0){ movId=await ins('movimientos',{cliente_id:c.id,fecha:D,tipo:'Ajuste',importe:q*pr,medio:'',nota:'Revista: '+det}); if(prop==='consignacion'&&prov) provMovId=await ins('prov_movimientos',{proveedor_id:prov,fecha:D,tipo:'consignacion',importe:q*(p.costo||0),detalle:'Entregado a suscriptor: '+det}); }
      else { sinPrecio++; nota+=' · SIN COBRAR (faltaba el precio)'; }
    }
    await ins('stock_mov',{producto_id:pid,fecha:D,tipo:'entrega',cantidad:-q,propiedad:prop||'propio',proveedor_id:prov||null,costo_unit:p.costo||0,precio_unit:x[2]!=='S'?pr:0,cliente_id:c.id,mov_id:movId,prov_mov_id:provMovId,edicion:ed,nota});
    n++;
  }
  return {n,sinPrecio};
}
function entregasRevista(cid,iso){ return LIVE.stock.filter(m=>m.tipo==='entrega'&&m.cli===cid&&m.f===iso).map(m=>({pub:((prodDe(m.prod)||{}).nombre||'Revista')+(m.ed?' '+edTxt(m.ed):''),qty:-m.qty,via:'R'})); }
function pendientesDe(pid,ed){ const h=hoyISO(); return LIVE.stock.filter(m=>m.tipo==='entrega'&&m.prod===pid&&m.f>h&&(ed==null||m.ed===ed)); }
async function repartirUltimo(pid){
  const p=prodDe(pid); if(!p)return; if(!(p.pubs||[]).length){toast('Primero editá el producto y marcá qué suscripciones la reciben');return;}
  const r=LIVE.stock.filter(m=>m.prod===pid&&(m.tipo==='recepcion'||m.tipo==='compra')&&m.ed).sort((a,b)=>cmpEd(a.ed,b.ed)).pop(); if(!r){toast('No hay una llegada con número cargado');return;}
  try{ const g=await generarEntregas(pid,r.ed,r.f,r.prop,r.prov); await Promise.all(['stock','movs','provmov'].map(cargarTabla)); SCACHE={}; toast(g.n?`${g.n} entregas de ${edTxt(r.ed)} agregadas al reparto ✓`+(g.sinPrecio?` (${g.sinPrecio} sin cobrar: falta el precio)`:''):'No había suscriptores nuevos para repartir'); pintarStock(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function anularEntrega(id){ const m=LIVE.stock.find(x=>x.id===id); if(!m)return; if(!confirm('¿Sacar esta entrega del reparto? Vuelve al stock'+(m.movId?' y se revierte el cargo en la cuenta del cliente':'')+'.'))return;
  try{ await anularFila('stock_mov',id); await anularFila('movimientos',m.movId); await anularFila('prov_movimientos',m.provMovId); await Promise.all(['stock','movs','provmov'].map(cargarTabla)); SCACHE={}; toast('Entrega anulada'); pintarStock(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
function saldoProv(pid){ return LIVE.provmov.filter(m=>m.prov===pid).reduce((n,m)=>n+(m.imp||0),0); }
async function ins(table,row){ const{data,error}=await sb.from(table).insert(row).select('id').single(); if(error)throw new Error(error.message); return data.id; }
async function anularFila(table,id){ if(!id)return; const{error}=await sb.from(table).update({anulado:true}).eq('id',id); if(error)throw new Error(error.message); }
function optsProv(sel){ return LIVE.prov.filter(p=>p.activo!==false).map(p=>`<option value="${p.id}"${p.id==sel?' selected':''}>${p.nombre}</option>`).join(''); }
function optsProd(conStock,sel){ return LIVE.prod.filter(p=>p.activo!==false).map(p=>({p,s:stockDe(p.id)})).filter(x=>!conStock||x.s.total>0).sort((a,b)=>a.p.nombre.localeCompare(b.p.nombre)).map(x=>`<option value="${x.p.id}"${x.p.id==sel?' selected':''}>${x.p.nombre}${conStock?' · stock '+x.s.total:''}</option>`).join(''); }
function optsMedios(){ return LISTAS.medios.map(m=>`<option value="${m}">${m}</option>`).join(''); }
// autocompletado genérico de cliente (id del input + caja de sugerencias "<id>-ac")
function sugCliG(inp){
  const box=$(inp.id+'-ac'); if(!box)return; inp.dataset.cli='';
  const rs=buscarCli(inp.value); if(!rs.length){box.hidden=true;return;}
  box.innerHTML=rs.map(c=>`<div class="aci" onmousedown="elegirCliG('${inp.id}',${c.id})"><b>${c.d}</b> <span class="mini">${c.n?c.n+' · ':''}Nº ${c.id}</span></div>`).join(''); box.hidden=false;
}
function elegirCliG(inpId,id){ const c=C.find(x=>x.id===id); const inp=$(inpId); if(!c||!inp)return; inp.value=c.d+' · Nº '+c.id; inp.dataset.cli=String(id); $(inpId+'-ac').hidden=true; if(inpId==='fcli'&&window.pintaC){CLIM=50;pintaC();} }
function acHTML(id,ph){ return `<div class="acwrap"><input id="${id}" placeholder="${ph||'Nº, dirección o nombre'}" autocomplete="off" oninput="sugCliG(this)" onfocus="sugCliG(this)"><div class="ac" id="${id}-ac" hidden></div></div>`; }
function faltaSQL(v){ return titulo(v,'')+'<div class="aviso">Falta crear las tablas en la base (archivo <b>supabase/2026-09-10_stock.sql</b>). Corrélo en el SQL Editor de Supabase y recargá.</div>'; }

/* ---- STOCK ---- */
function pintarStock(){
  const el=$('v-stock'); if(!STOCK_OK){el.innerHTML=faltaSQL('Stock');return;}
  const prods=LIVE.prod.filter(p=>p.activo!==false).map(p=>({p,s:stockDe(p.id)}));
  const unid=prods.reduce((n,x)=>n+x.s.total,0), valor=prods.reduce((n,x)=>n+x.s.propio*(x.p.costo||0),0), cons=prods.reduce((n,x)=>n+Object.values(x.s.consig).reduce((a,b)=>a+b,0),0);
  const venta=prods.reduce((n,x)=>n+x.s.total*precioVenta(x.p),0);
  const qv=($('sq')||{}).value||'';
  el.innerHTML=`${titulo('Stock','Mercadería propia del puesto y en consignación. Los diarios del reparto no van acá.')}
  <div class="kpis">
    <div class="kpi"><i>Productos</i><b>${prods.length}</b><i>${unid} unidades en total</i></div>
    <div class="kpi ok"><i>Stock propio a costo</i><b>${fmt(valor)}</b><i>lo que ya es tuyo</i></div>
    <div class="kpi ${cons?'amb':'gris'}"><i>En consignación</i><b>${cons} <small>unidades</small></b><i>se deben al venderse</i></div>
    <div class="kpi"><i>Valor de venta del stock</i><b>${fmt(venta)}</b><i>todo lo que hay, a precio de venta</i></div>
  </div>
  ${(()=>{const pd=paraDevolver(); return pd.length?`<div class="sec"><span class="dot"></span>Para devolver (ya llegó el número nuevo)</div><div class="card">${pd.map(x=>`<div class="mov"><span class="t"><b>${x.p.nombre}</b> ${edTxt(x.ed)} <span class="mini">· ya llegó el nº ${x.nuevo}</span></span><span class="m debe">${x.qty}</span></div>`).join('')}<div class="mini" style="margin-top:6px">Registralas en Compras → Devolución a proveedor, eligiendo el número.</div></div>`:'';})()}
  <div class="sec"><span class="dot"></span>Productos</div>
  <div class="filtros"><input id="sq" type="search" placeholder="Buscar producto o categoría…" value="${qv}" style="margin-top:0" oninput="pintarStockLista()"><button class="btn chico" id="snuevo" style="margin:0;white-space:nowrap">＋ Producto</button></div>
  <div id="sform"></div>
  <div id="slist"></div>`;
  pintarStockLista();
}
function pintarStockLista(){
  const q=norm(($('sq')||{}).value||'');
  const prods=LIVE.prod.filter(p=>p.activo!==false&&(!q||norm(p.nombre+' '+(p.cat||'')+' '+nomProv(p.prov)).includes(q))).map(p=>({p,s:stockDe(p.id)})).sort((a,b)=>a.p.nombre.localeCompare(b.p.nombre));
  $('slist').innerHTML=prods.length?prods.map(({p,s})=>`<div class="fila" data-prod="${p.id}" style="flex-wrap:wrap"><div style="flex:1;min-width:180px"><div class="dom">${p.nombre} ${p.cat?`<span class="pill p-inact">${p.cat}</span>`:''}</div><div class="nom">${nomProv(p.prov)!=='—'?'Prov. habitual: '+nomProv(p.prov)+' · ':''}costo ${fmt(p.costo)} · ${p.modo==='margen'?'costo +'+p.margen+'%':'precio fijo'}</div></div>
    <div class="der"><div class="monto">${fmt(precioVenta(p))}</div><div class="mini ${s.total<=0?'debe':''}">${s.total} en stock${s.propio?' · '+s.propio+' propio':''}${Object.entries(s.consig).map(([k,v])=>' · '+v+' consig. '+nomProv(parseInt(k))).join('')}</div>${(()=>{const es=edsDe(p.id).filter(e=>e.ed);const pe=pendientesDe(p.id); return (es.length?`<div class="mini">${es.map(e=>edTxt(e.ed)+': '+e.qty).join(' · ')}${pe.length?' libres':''}</div>`:'')+(pe.length?`<div class="mini" style="color:var(--azul)">+${pe.reduce((n,m)=>n-m.qty,0)} reservadas para suscriptores (reparto hasta el ${fecha(pe.map(m=>m.f).sort().pop())})</div>`:'');})()}</div>
    <div id="pdet-${p.id}" hidden style="flex-basis:100%"></div></div>`).join(''):'<div class="mini" style="padding:20px;text-align:center">Todavía no hay productos. Cargá el primero con "＋ Producto" o desde Compras.</div>';
  if(PSEL) abrirProd(PSEL,true);
}
function formProdHTML(p){
  p=p||{};
  return `<div class="card"><b>${p.id?'Editar producto':'Nuevo producto'}</b>
    <div class="grid2"><div><label>Nombre *</label><input id="pf-nombre" value="${p.nombre||''}" placeholder="ej: Colección Mercedes-Benz nº 3"></div><div><label>Categoría</label><input id="pf-cat" value="${p.cat||''}" placeholder="ej: coleccionables, golosinas"></div></div>
    <label>Proveedor habitual</label><select id="pf-prov"><option value="">— ninguno —</option>${optsProv(p.prov)}</select>
    <div class="grid2"><div><label>Precio de venta</label><select id="pf-modo" onchange="$('pf-precio').disabled=this.value!=='fijo';$('pf-margen').disabled=this.value!=='margen'"><option value="fijo"${p.modo!=='margen'?' selected':''}>Precio fijo</option><option value="margen"${p.modo==='margen'?' selected':''}>Costo + % de ganancia</option></select></div>
    <div><label>Costo unitario</label><input id="pf-costo" type="number" inputmode="decimal" value="${p.costo||''}" placeholder="0"></div></div>
    <div class="grid2"><div><label>Precio fijo $</label><input id="pf-precio" type="number" inputmode="decimal" value="${p.precio||''}" ${p.modo==='margen'?'disabled':''}></div><div><label>% de ganancia</label><input id="pf-margen" type="number" inputmode="decimal" value="${p.margen||''}" ${p.modo!=='margen'?'disabled':''}></div></div>
    <label>Se reparte a los suscriptores de <span class="mini">(al cargar la llegada de un número, esos clientes aparecen en Reparto en su próximo día)</span></label><div class="dias diasel" id="pf-pubs" style="flex-wrap:wrap">${[...new Set([...(p.pubs||[]),...pubsRevista()])].map(x=>`<div class="dia${(p.pubs||[]).includes(x)?' on':''}" data-pfpub="${x}" style="width:auto;padding:0 8px">${x}</div>`).join('')}</div>
    ${p.id?'':'<label>Stock inicial (propio, ya en tu poder)</label><input id="pf-stock" type="number" inputmode="numeric" placeholder="0">'}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="pf-ok" data-pid="${p.id||''}">${p.id?'Guardar cambios':'Crear producto'}</button><button class="btn sec" id="pf-cancel">Cancelar</button>${p.id?`<button class="btn sec" id="pf-baja" data-pid="${p.id}" style="color:var(--rojo);border-color:var(--rojo)">Dar de baja</button>`:''}</div></div>`;
}
async function guardarProd(pid){
  const nombre=$('pf-nombre').value.trim(); if(!nombre){toast('Poné el nombre');return;}
  const row={nombre,categoria:$('pf-cat').value.trim(),proveedor_id:$('pf-prov').value?parseInt($('pf-prov').value):null,modo_precio:$('pf-modo').value,precio_venta:parseFloat($('pf-precio').value)||0,margen:parseFloat($('pf-margen').value)||0,costo:parseFloat($('pf-costo').value)||0,publicaciones:[...document.querySelectorAll('#pf-pubs .dia.on')].map(x=>unesc(x.dataset.pfpub))};
  try{
    if(pid){ const{error}=await sb.from('productos').update(row).eq('id',pid); if(error)throw new Error(error.message); }
    else{ const id=await ins('productos',row); const st=parseInt(($('pf-stock')||{}).value)||0; if(st) await ins('stock_mov',{producto_id:id,fecha:hoyISO(),tipo:'ajuste',cantidad:st,propiedad:'propio',costo_unit:row.costo,nota:'stock inicial'}); }
    await cargarTabla('prod'); await cargarTabla('stock'); PSEL=null; toast('Producto guardado ✓'); pintarStock();
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function bajaProd(pid){ if(!confirm('¿Dar de baja este producto? Deja de aparecer; su historial queda.'))return; try{ const{error}=await sb.from('productos').update({activo:false}).eq('id',pid); if(error)throw new Error(error.message); await cargarTabla('prod'); PSEL=null; toast('Producto dado de baja'); pintarStock(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
function abrirProd(pid,keep){
  const p=prodDe(pid); const box=$('pdet-'+pid); if(!p||!box)return;
  if(!keep&&PSEL===pid&&!box.hidden){box.hidden=true;PSEL=null;return;}
  document.querySelectorAll('[id^=pdet-]').forEach(b=>b.hidden=true); PSEL=pid;
  const movs=LIVE.stock.filter(m=>m.prod===pid).sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||'')).slice(0,40);
  box.innerHTML=`<div style="border-top:1px solid var(--linea);margin-top:10px;padding-top:10px">
    <div class="fchips" style="margin:0 0 8px"><button class="fch" data-pedit="${pid}">✎ Editar</button><button class="fch" data-pajuste="${pid}">± Ajustar stock</button><button class="fch" data-pvender="${pid}">Vender</button>${(p.pubs||[]).length?`<button class="fch" data-prepartir="${pid}">📦 Repartir último número a suscriptores</button>`:''}</div>${(p.pubs||[]).length?`<div class="mini" style="margin-bottom:6px">La reciben: ${p.pubs.join(', ')} · ${suscriptoresDe(p,hoyISO()).length} suscriptores activos</div>`:''}
    <div id="pajbox-${pid}"></div>
    <div class="mini" style="margin-bottom:4px">Últimos movimientos</div>${movs.map(m=>`<div class="mov"><span class="f">${fecha(m.f)}</span><span class="t">${m.tipo}${m.ed?' '+edTxt(m.ed):''}${m.prop==='consignacion'?' (consig. '+nomProv(m.prov)+')':''}${m.cli?' · '+nomCli(m.cli):''}${m.medio?' · '+m.medio:''}${m.nota?' <span class="mini">· '+m.nota+'</span>':''}</span><span class="m ${m.qty<0?'debe':'favor'}">${m.qty>0?'+':''}${m.qty}</span>${m.tipo==='entrega'?`<button class="del" data-edel="${m.id}">✕</button>`:''}</div>`).join('')||'<div class="mini">Sin movimientos.</div>'}</div>`;
  box.hidden=false;
}
function formAjusteHTML(pid){ return `<div class="card" style="margin:6px 0"><b>Ajuste de stock</b><div class="mini" style="margin:2px 0 4px">Conteo, rotura, faltante. Positivo suma, negativo resta.</div><div class="grid2"><div><label>Cantidad (±)</label><input id="paj-q" type="number" inputmode="numeric" placeholder="ej: -2"></div><div><label>De qué stock</label><select id="paj-prop" onchange="$('paj-provbox').hidden=this.value!=='consignacion'"><option value="propio">Propio</option><option value="consignacion">En consignación</option></select></div></div><div id="paj-provbox" hidden><label>Proveedor</label><select id="paj-prov">${optsProv()}</select></div><label>Número / edición (opcional)</label><input id="paj-ed" placeholder="ej: 389"><label>Motivo</label><input id="paj-nota" placeholder="ej: conteo de fin de mes"><button class="btn chico" data-pajok="${pid}">Guardar ajuste</button></div>`; }
async function ajustarStock(pid){
  const q=parseInt($('paj-q').value); if(!q){toast('Poné la cantidad (+ suma, − resta)');return;}
  const prop=$('paj-prop').value; const prov=prop==='consignacion'?parseInt($('paj-prov').value)||null:null;
  if(prop==='consignacion'&&!prov){toast('Elegí el proveedor de la consignación');return;}
  try{ await ins('stock_mov',{producto_id:pid,fecha:hoyISO(),tipo:'ajuste',cantidad:q,propiedad:prop,proveedor_id:prov,costo_unit:(prodDe(pid)||{}).costo||0,edicion:($('paj-ed').value||'').trim(),nota:$('paj-nota').value||'ajuste'}); await cargarTabla('stock'); toast('Stock ajustado ✓'); pintarStock(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}

/* ---- VENTAS ---- */
function pintarVentas(){
  const el=$('v-ventas'); if(!STOCK_OK){el.innerHTML=faltaSQL('Ventas');return;}
  const hoy=hoyISO(), mes=hoy.slice(0,7);
  const ventas=LIVE.stock.filter(m=>m.tipo==='venta');
  const vh=ventas.filter(m=>m.f===hoy), vm=ventas.filter(m=>(m.f||'').startsWith(mes));
  const imp=l=>l.reduce((n,m)=>n+(-m.qty)*(m.precio||0),0);
  el.innerHTML=`${titulo('Ventas','Venta de stock en el mostrador. Entra a la caja del medio elegido o se anota en la cuenta del cliente.')}
  <div class="kpis">
    <div class="kpi ok"><i>Vendido hoy</i><b>${fmt(imp(vh))}</b><i>${vh.reduce((n,m)=>n-m.qty,0)} unidades · ${vh.length} ventas</i></div>
    <div class="kpi"><i>Vendido en el mes</i><b>${fmt(imp(vm))}</b><i>${vm.reduce((n,m)=>n-m.qty,0)} unidades</i></div>
    <div class="kpi ${vm.length?'':'gris'}"><i>Ganancia estimada del mes</i><b>${fmt(vm.reduce((n,m)=>n+(-m.qty)*((m.precio||0)-(m.costo||0)),0))}</b><i>precio − costo de lo vendido</i></div>
  </div>
  <div class="sec"><span class="dot"></span>Nueva venta</div>
  <div class="card">
    <label>Producto</label><select id="v-prod" onchange="ventaProdCambio()"><option value="">Elegí un producto con stock…</option>${optsProd(true)}</select>
    <div id="v-lote"></div>
    <div class="grid2"><div><label>Cantidad</label><input id="v-qty" type="number" inputmode="numeric" value="1" min="1" oninput="ventaTotal()"></div><div><label>Precio unitario $</label><input id="v-precio" type="number" inputmode="decimal" placeholder="0" oninput="ventaTotal()"></div></div>
    <div class="mini" id="v-total" style="margin-top:6px"></div>
    <label>Cobro</label><select id="v-medio" onchange="$('v-clibox').hidden=this.value!=='CC'">${optsMedios()}<option value="CC">Anotar en la cuenta de un cliente</option></select>
    <div id="v-clibox" hidden><label>Cliente</label>${acHTML('v-cli')}</div>
    <div class="grid2"><div><label>Fecha</label><input id="v-fecha" type="date" value="${hoy}"></div><div><label>Nota</label><input id="v-nota" placeholder="opcional"></div></div>
    <button class="btn" id="v-ok">Vender</button>
  </div>
  <div class="sec"><span class="dot"></span>Últimas ventas</div>
  <div class="card">${ventas.sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||'')).slice(0,40).map(m=>`<div class="mov"><span class="f">${fecha(m.f)}</span><span class="t"><b>${-m.qty}×</b> ${(prodDe(m.prod)||{}).nombre||'?'}${m.ed?' '+edTxt(m.ed):''} <span class="mini">· ${m.cli?'CC '+nomCli(m.cli):m.medio}${m.prop==='consignacion'?' · consig. '+nomProv(m.prov):''}${m.nota?' · '+m.nota:''}</span></span><span class="m">${fmt(-m.qty*(m.precio||0))}</span><button class="del" data-vdel="${m.id}">✕</button></div>`).join('')||'<div class="mini">Ninguna venta todavía.</div>'}</div>`;
}
function ventaProdCambio(){
  const p=prodDe(parseInt($('v-prod').value)); const lb=$('v-lote'); VLOTE='';
  if(!p){lb.innerHTML='';return;}
  $('v-precio').value=precioVenta(p)||'';
  const lotes=[]; edsDe(p.id,'propio').filter(e=>e.qty>0).forEach(e=>lotes.push({k:'propio||'+e.ed,t:'Stock propio'+(e.ed?' · '+edTxt(e.ed):'')+' ('+e.qty+')'}));
  const provs=[...new Set(LIVE.stock.filter(x=>x.prod===p.id&&x.prop==='consignacion').map(x=>x.prov||0))];
  provs.forEach(pv=>edsDe(p.id,'consignacion',pv).filter(e=>e.qty>0).forEach(e=>lotes.push({k:'consignacion|'+pv+'|'+e.ed,t:'Consignación de '+nomProv(pv)+(e.ed?' · '+edTxt(e.ed):'')+' ('+e.qty+')'})));
  if(lotes.length>1){ const cs=lotes.filter(l=>l.k.startsWith('consig')); VLOTE=(cs.length?cs[cs.length-1]:lotes[lotes.length-1]).k; lb.innerHTML=`<label>Sale de</label><select id="v-lotesel" onchange="VLOTE=this.value">${lotes.map(l=>`<option value="${l.k}"${l.k===VLOTE?' selected':''}>${l.t}</option>`).join('')}</select>`; }
  else { VLOTE=lotes.length?lotes[0].k:'propio|'; lb.innerHTML=lotes.length?`<div class="mini" style="margin-top:4px">Sale de: ${lotes[0].t}</div>`:''; }
  ventaTotal();
}
function ventaTotal(){ const q=parseInt($('v-qty').value)||0, pr=parseFloat($('v-precio').value)||0; $('v-total').innerHTML=q&&pr?`Total: <b>${fmt(q*pr)}</b>`:''; }
async function vender(){
  const pid=parseInt($('v-prod').value); const p=prodDe(pid); if(!p){toast('Elegí el producto');return;}
  const q=parseInt($('v-qty').value)||0, pr=parseFloat($('v-precio').value)||0; if(q<=0||pr<=0){toast('Cantidad y precio');return;}
  const parts=(VLOTE||'propio|').split('|'); const prop=parts[0]; const prov=parts[1]?parseInt(parts[1]):null; const ed=parts[2]||'';
  const disp=edsDe(pid,prop,prop==='propio'?null:(prov||0)).filter(e=>e.ed===ed).reduce((n,e)=>n+e.qty,0);
  if(q>disp&&!confirm('Hay '+disp+' en ese stock y querés vender '+q+'. ¿Seguir igual? (queda en negativo)'))return;
  const medio=$('v-medio').value, f=$('v-fecha').value, nota=$('v-nota').value.trim();
  let cli=null; if(medio==='CC'){ cli=parseInt($('v-cli').dataset.cli)||null; if(!cli){toast('Elegí el cliente');return;} }
  const det=q+'× '+p.nombre+(ed?' '+edTxt(ed):'');
  try{
    let cajaId=null, movId=null, provMovId=null;
    if(cli){ movId=await ins('movimientos',{cliente_id:cli,fecha:f,tipo:'Ajuste',importe:q*pr,medio:'',nota:'Venta: '+det+(nota?' · '+nota:'')}); }
    else { cajaId=await ins('caja',{fecha:f,concepto:'Venta de stock',detalle:det+(nota?' · '+nota:''),ingreso:q*pr,egreso:0,medio}); }
    if(prop==='consignacion'&&prov){ provMovId=await ins('prov_movimientos',{proveedor_id:prov,fecha:f,tipo:'consignacion',importe:q*(p.costo||0),detalle:'Vendido en consignación: '+det}); }
    await ins('stock_mov',{producto_id:pid,fecha:f,tipo:'venta',cantidad:-q,propiedad:prop,proveedor_id:prov,costo_unit:p.costo||0,precio_unit:pr,medio:cli?'':medio,cliente_id:cli,caja_id:cajaId,mov_id:movId,prov_mov_id:provMovId,edicion:ed,nota});
    await Promise.all(['stock','caja','movs','provmov'].map(cargarTabla)); SCACHE={};
    toast('Venta guardada ✓ '+fmt(q*pr)); pintarVentas(); pintarInicio();
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function anularVenta(id){
  const m=LIVE.stock.find(x=>x.id===id); if(!m)return; if(!confirm('¿Anular esta venta? Vuelve el stock y se revierte la caja / cuenta.'))return;
  try{ await anularFila('stock_mov',id); await anularFila('caja',m.cajaId); await anularFila('movimientos',m.movId); await anularFila('prov_movimientos',m.provMovId); await Promise.all(['stock','caja','movs','provmov'].map(cargarTabla)); SCACHE={}; toast('Venta anulada'); pintarVentas(); pintarInicio(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}

/* ---- COMPRAS / INGRESOS / PROVEEDORES ---- */
const CTIPOS=[['compra','Compra'],['recepcion','Recepción en consignación'],['devolucion','Devolución a proveedor'],['pago','Pago a proveedor'],['proveedores','Proveedores']];
function pintarCompras(){
  const el=$('v-compras'); if(!STOCK_OK){el.innerHTML=faltaSQL('Compras');return;}
  const mes=hoyISO().slice(0,7);
  const compras=LIVE.stock.filter(m=>m.tipo==='compra'&&(m.f||'').startsWith(mes)), recs=LIVE.stock.filter(m=>m.tipo==='recepcion'&&(m.f||'').startsWith(mes));
  const deuda=LIVE.prov.map(p=>saldoProv(p.id)).filter(s=>s>0.5).reduce((a,b)=>a+b,0);
  el.innerHTML=`${titulo('Compras e ingresos','Lo que comprás (tuyo) y lo que recibís en consignación (del proveedor hasta que se vende).')}
  <div class="kpis">
    <div class="kpi"><i>Comprado en el mes</i><b>${fmt(compras.reduce((n,m)=>n+m.qty*(m.costo||0),0))}</b><i>${compras.reduce((n,m)=>n+m.qty,0)} unidades</i></div>
    <div class="kpi ${recs.length?'amb':'gris'}"><i>Recibido en consignación</i><b>${recs.reduce((n,m)=>n+m.qty,0)} <small>unidades</small></b><i>este mes</i></div>
    <div class="kpi ${deuda>0.5?'rojo':'gris'} click" data-ctgo="proveedores"><i>Debo a proveedores →</i><b>${fmt(deuda)}</b><i>${LIVE.prov.filter(p=>saldoProv(p.id)>0.5).length} proveedores con saldo</i></div>
  </div>
  <div class="sec"><span class="dot"></span>Operación</div>
  <div class="card"><div class="fchips" style="margin-top:0">${CTIPOS.map(t=>`<button class="fch${CTIPO===t[0]?' on':''}" data-ct="${t[0]}">${t[1]}</button>`).join('')}</div><div id="cform"></div></div>
  <div id="clista"></div>`;
  pintarCForm();
}
function provSelHTML(id){ return `<label>Proveedor</label><select id="${id}" onchange="$('${id}-nuevo').hidden=this.value!=='nuevo'"><option value="">Elegí…</option>${optsProv()}<option value="nuevo">＋ Nuevo proveedor…</option></select><div id="${id}-nuevo" hidden class="grid2"><div><label>Nombre del proveedor</label><input id="${id}-nombre"></div><div><label>Teléfono</label><input id="${id}-tel"></div></div>`; }
function prodSelHTML(id,conStock){ return `<label>Producto</label><select id="${id}" onchange="if($('${id}-nuevo'))$('${id}-nuevo').hidden=this.value!=='nuevo';prodSelCambio('${id}')"><option value="">Elegí…</option>${optsProd(conStock)}${conStock?'':'<option value="nuevo">＋ Nuevo producto…</option>'}</select>${conStock?'':`<div id="${id}-nuevo" hidden><div class="grid2"><div><label>Nombre del producto</label><input id="${id}-nombre"></div><div><label>Categoría</label><input id="${id}-cat"></div></div><div class="grid2"><div><label>Precio de venta</label><select id="${id}-modo"><option value="fijo">Precio fijo</option><option value="margen">Costo + %</option></select></div><div><label>Precio fijo $ / % ganancia</label><input id="${id}-pv" type="number" inputmode="decimal"></div></div></div>`}`; }
function prodSelCambio(id){ const p=prodDe(parseInt($(id).value)); const c=$('c-costo'); if(p&&c&&!c.value){ c.value=p.costo||''; compraTotal(); }
  const box=$('c-edsel'); if(box&&CTIPO==='devolucion'){ const es=p?edsDe(p.id).filter(e=>e.qty>0):[]; box.innerHTML=es.some(e=>e.ed)?`<label>Número / edición</label><select id="c-ed">${es.map(e=>`<option value="${e.ed}">${e.ed?edTxt(e.ed):'sin número'} (${e.qty})</option>`).join('')}</select>`:''; if(es.length&&$('c-qty'))$('c-qty').value=es[0].qty; } }
async function resolverProv(id){
  const v=$(id).value; if(!v){toast('Elegí el proveedor');return null;}
  if(v!=='nuevo') return parseInt(v);
  const nombre=$(id+'-nombre').value.trim(); if(!nombre){toast('Poné el nombre del proveedor');return null;}
  const nuevo=await ins('proveedores',{nombre,telefono:$(id+'-tel').value.trim()}); await cargarTabla('prov'); return nuevo;
}
async function resolverProd(id,costo){
  const v=$(id).value; if(!v){toast('Elegí el producto');return null;}
  if(v!=='nuevo') return parseInt(v);
  const nombre=$(id+'-nombre').value.trim(); if(!nombre){toast('Poné el nombre del producto');return null;}
  const modo=$(id+'-modo').value, pv=parseFloat($(id+'-pv').value)||0;
  const pid=await ins('productos',{nombre,categoria:$(id+'-cat').value.trim(),modo_precio:modo,precio_venta:modo==='fijo'?pv:0,margen:modo==='margen'?pv:0,costo:costo||0}); await cargarTabla('prod'); return pid;
}
function pintarCForm(){
  const hoy=hoyISO(); let h='';
  const fFecha=`<div class="grid2"><div><label>Fecha</label><input id="c-fecha" type="date" value="${hoy}"></div><div><label>Nota</label><input id="c-nota" placeholder="opcional"></div></div>`;
  if(CTIPO==='compra') h=`<div class="mini" style="margin:6px 0 2px">La mercadería pasa a ser tuya. Si la pagás ahora sale de caja; si es a cuenta, queda en la CC del proveedor.</div>${provSelHTML('c-prov')}${prodSelHTML('c-prod')}
    <div class="grid2"><div><label>Cantidad</label><input id="c-qty" type="number" inputmode="numeric" min="1" value="1" oninput="compraTotal()"></div><div><label>Costo unitario $</label><input id="c-costo" type="number" inputmode="decimal" placeholder="0" oninput="compraTotal()"></div></div>
    <div id="c-edbox"><label>Número / edición <span class="mini">(revistas y coleccionables; vacío si no aplica)</span></label><input id="c-ed" placeholder="ej: 389"></div><div class="mini" id="c-total" style="margin-top:6px"></div>
    <label>Pago</label><select id="c-pago"><option value="cuenta">A cuenta (queda en la CC del proveedor)</option>${LISTAS.medios.map(m=>`<option value="${m}">Pagado ahora · ${m}</option>`).join('')}</select>${fFecha}<button class="btn" id="c-ok">Registrar compra</button>`;
  else if(CTIPO==='recepcion') h=`<div class="mini" style="margin:6px 0 2px">Entra al stock como del proveedor. No mueve caja ni cuenta: se le debe solo lo que se venda.</div>${provSelHTML('c-prov')}${prodSelHTML('c-prod')}
    <div class="grid2"><div><label>Cantidad</label><input id="c-qty" type="number" inputmode="numeric" min="1" value="1" oninput="compraTotal()"></div><div><label>Costo pactado por unidad $</label><input id="c-costo" type="number" inputmode="decimal" placeholder="lo que le vas a deber por cada uno vendido" oninput="compraTotal()"></div></div>
    <div id="c-edbox"><label>Número / edición <span class="mini">(revistas y coleccionables; vacío si no aplica)</span></label><input id="c-ed" placeholder="ej: 389"></div><div class="mini" id="c-total" style="margin-top:6px"></div>${fFecha}<button class="btn" id="c-ok">Registrar recepción</button>`;
  else if(CTIPO==='devolucion') h=`<div class="mini" style="margin:6px 0 2px">Mercadería que vuelve al proveedor. Si era consignación no pasa nada más; si era tuya y a cuenta, podés acreditarla en su CC.</div>${provSelHTML('c-prov')}${prodSelHTML('c-prod',true)}<div id="c-edsel"></div>
    <div class="grid2"><div><label>Cantidad</label><input id="c-qty" type="number" inputmode="numeric" min="1" value="1"></div><div><label>Sale de</label><select id="c-prop"><option value="consignacion">Stock en consignación</option><option value="propio">Stock propio</option></select></div></div>
    <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="c-credito" style="width:auto;margin:0">Acreditar en la CC del proveedor (nota de crédito)</label>
    <label>Costo unitario a acreditar $</label><input id="c-costo" type="number" inputmode="decimal">${fFecha}<button class="btn" id="c-ok">Registrar devolución</button>`;
  else if(CTIPO==='pago') h=`${provSelHTML('c-prov')}<div class="grid2"><div><label>Importe $</label><input id="c-imp" type="number" inputmode="decimal"></div><div><label>Medio</label><select id="c-medio">${optsMedios()}</select></div></div>${fFecha}<button class="btn" id="c-ok">Registrar pago</button>`;
  else if(CTIPO==='proveedores') h=`<div class="grid2"><div><label>Nuevo proveedor</label><input id="np-nombre" placeholder="nombre"></div><div><label>Teléfono</label><input id="np-tel"></div></div><button class="btn chico" id="np-ok">Agregar proveedor</button>`;
  $('cform').innerHTML=h;
  const L=$('clista');
  if(CTIPO==='proveedores'){
    L.innerHTML=`<div class="sec"><span class="dot"></span>Proveedores y cuentas corrientes</div>`+(LIVE.prov.length?LIVE.prov.map(p=>{const s=saldoProv(p.id); const movs=LIVE.provmov.filter(m=>m.prov===p.id).sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||'')).slice(0,10);
      return `<div class="card"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="flex:1"><b style="font-size:16px">${p.nombre}</b>${p.tel?' <span class="mini">· '+p.tel+'</span>':''} <span class="mini lnk" data-pren="${p.id}">✎</span></div><div class="der">${s>0.5?`<span class="monto debe">${fmt(s)}</span><div class="mini">le debés</div>`:(s<-0.5?`<span class="monto favor">${fmt(s)}</span><div class="mini">a tu favor</div>`:'<span class="monto aldia">al día</span>')}</div></div>
      ${movs.map(m=>`<div class="mov"><span class="f">${fecha(m.f)}</span><span class="t">${m.tipo}${m.d?' · '+m.d:''}</span><span class="m ${m.imp>0?'debe':'favor'}">${m.imp<0?'−':''}${fmt(m.imp)}</span></div>`).join('')||'<div class="mini" style="margin-top:6px">Sin movimientos.</div>'}</div>`;}).join(''):'<div class="card mini">Ningún proveedor todavía.</div>');
  } else if(CTIPO==='pago'){
    const ps=LIVE.provmov.filter(m=>m.tipo==='pago').sort((a,b)=>(b.f||'').localeCompare(a.f||'')).slice(0,30);
    L.innerHTML=`<div class="sec"><span class="dot"></span>Últimos pagos</div><div class="card">${ps.map(m=>`<div class="mov"><span class="f">${fecha(m.f)}</span><span class="t">${nomProv(m.prov)}${m.d?' · '+m.d:''}</span><span class="m">${fmt(m.imp)}</span><button class="del" data-pdel="${m.id}">✕</button></div>`).join('')||'<div class="mini">Ninguno.</div>'}</div>`;
  } else {
    const ms=LIVE.stock.filter(m=>m.tipo===CTIPO).sort((a,b)=>(b.f||'').localeCompare(a.f||'')||(b.ts||'').localeCompare(a.ts||'')).slice(0,30);
    L.innerHTML=`<div class="sec"><span class="dot"></span>Últimos movimientos</div><div class="card">${ms.map(m=>`<div class="mov"><span class="f">${fecha(m.f)}</span><span class="t"><b>${Math.abs(m.qty)}×</b> ${(prodDe(m.prod)||{}).nombre||'?'}${m.ed?' '+edTxt(m.ed):''} <span class="mini">· ${nomProv(m.prov)}${m.medio?' · '+m.medio:''}${m.nota?' · '+m.nota:''}</span></span><span class="m">${fmt(Math.abs(m.qty)*(m.costo||0))}</span><button class="del" data-cdel="${m.id}">✕</button></div>`).join('')||'<div class="mini">Ninguno.</div>'}</div>`;
  }
}
function compraTotal(){ const q=parseInt(($('c-qty')||{}).value)||0, c=parseFloat(($('c-costo')||{}).value)||0; const t=$('c-total'); if(t) t.innerHTML=q&&c?`Total: <b>${fmt(q*c)}</b>`:''; }
async function registrarCompra(){
  const f=$('c-fecha').value, nota=$('c-nota').value.trim();
  try{
    if(CTIPO==='pago'){
      const prov=await resolverProv('c-prov'); if(!prov)return; const imp=parseFloat($('c-imp').value)||0; if(imp<=0){toast('Poné el importe');return;}
      const medio=$('c-medio').value; const cajaId=await ins('caja',{fecha:f,concepto:'Pago a proveedor',detalle:nomProv(prov)+(nota?' · '+nota:''),ingreso:0,egreso:imp,medio});
      await ins('prov_movimientos',{proveedor_id:prov,fecha:f,tipo:'pago',importe:-imp,detalle:(medio+(nota?' · '+nota:'')),caja_id:cajaId});
      await Promise.all(['caja','provmov'].map(cargarTabla)); toast('Pago registrado ✓'); pintarCompras(); pintarInicio(); return;
    }
    const prov=await resolverProv('c-prov'); if(!prov)return;
    const q=parseInt($('c-qty').value)||0; if(q<=0){toast('Poné la cantidad');return;}
    const costo=parseFloat(($('c-costo')||{}).value)||0;
    const pid=await resolverProd('c-prod',costo); if(!pid)return; const p=prodDe(pid);
    const ed=(($('c-ed')||{}).value||'').trim();
    const det=q+'× '+(p?p.nombre:'')+(ed?' '+edTxt(ed):'');
    if(CTIPO==='compra'){
      if(!costo){toast('Poné el costo unitario');return;}
      const pago=$('c-pago').value; let cajaId=null, provMovId=null;
      if(pago==='cuenta') provMovId=await ins('prov_movimientos',{proveedor_id:prov,fecha:f,tipo:'compra',importe:q*costo,detalle:'Compra: '+det+(nota?' · '+nota:'')});
      else cajaId=await ins('caja',{fecha:f,concepto:'Compra de mercadería',detalle:det+' · '+nomProv(prov)+(nota?' · '+nota:''),ingreso:0,egreso:q*costo,medio:pago});
      await ins('stock_mov',{producto_id:pid,fecha:f,tipo:'compra',cantidad:q,propiedad:'propio',proveedor_id:prov,costo_unit:costo,medio:pago==='cuenta'?'':pago,caja_id:cajaId,prov_mov_id:provMovId,edicion:ed,nota});
      if(p&&p.costo!==costo) await sb.from('productos').update({costo}).eq('id',pid);
    } else if(CTIPO==='recepcion'){
      if(!costo){toast('Poné el costo pactado por unidad');return;}
      await ins('stock_mov',{producto_id:pid,fecha:f,tipo:'recepcion',cantidad:q,propiedad:'consignacion',proveedor_id:prov,costo_unit:costo,edicion:ed,nota});
      if(p&&p.costo!==costo) await sb.from('productos').update({costo}).eq('id',pid);
    } else if(CTIPO==='devolucion'){
      const prop=$('c-prop').value; let provMovId=null;
      if($('c-credito').checked&&costo) provMovId=await ins('prov_movimientos',{proveedor_id:prov,fecha:f,tipo:'credito',importe:-q*costo,detalle:'Devolución: '+det});
      await ins('stock_mov',{producto_id:pid,fecha:f,tipo:'devolucion',cantidad:-q,propiedad:prop,proveedor_id:prov,costo_unit:costo,prov_mov_id:provMovId,edicion:ed,nota});
    }
    let msg='Registrado ✓';
    if((CTIPO==='compra'||CTIPO==='recepcion')&&ed){ await cargarTabla('stock'); await cargarTabla('prod'); const g=await generarEntregas(pid,ed,f,CTIPO==='recepcion'?'consignacion':'propio',prov); if(g.n) msg+=` · ${g.n} suscriptores lo reciben en su próximo reparto`+(g.sinPrecio?` (${g.sinPrecio} sin cobrar: falta el precio)`:''); }
    await Promise.all(['stock','caja','provmov','prod','movs'].map(cargarTabla)); SCACHE={}; toast(msg); pintarCompras(); pintarInicio();
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function anularIngreso(id){
  const m=LIVE.stock.find(x=>x.id===id); if(!m)return; const pe=(m.tipo==='recepcion'||m.tipo==='compra')&&m.ed?pendientesDe(m.prod,m.ed):[];
  if(!confirm('¿Anular este movimiento? Se revierte el stock y lo enlazado (caja / CC proveedor).'+(pe.length?' También se sacan del reparto las '+pe.length+' entregas pendientes de ese número.':'')))return;
  try{ for(const e of pe){ await anularFila('stock_mov',e.id); await anularFila('movimientos',e.movId); await anularFila('prov_movimientos',e.provMovId); } if(pe.length) await Promise.all(['movs','provmov'].map(cargarTabla));
    await anularFila('stock_mov',id); await anularFila('caja',m.cajaId); await anularFila('prov_movimientos',m.provMovId); await Promise.all(['stock','caja','provmov'].map(cargarTabla)); toast('Anulado'); pintarCompras(); pintarInicio(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function anularPagoProv(id){
  const m=LIVE.provmov.find(x=>x.id===id); if(!m)return; if(!confirm('¿Anular este pago? Vuelve a la caja y a la CC del proveedor.'))return;
  try{ await anularFila('prov_movimientos',id); await anularFila('caja',m.cajaId); await Promise.all(['caja','provmov'].map(cargarTabla)); toast('Anulado'); pintarCompras(); pintarInicio(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function nuevoProveedor(){ const n=$('np-nombre').value.trim(); if(!n){toast('Poné el nombre');return;} try{ await ins('proveedores',{nombre:n,telefono:$('np-tel').value.trim()}); await cargarTabla('prov'); toast('Proveedor creado ✓'); pintarCompras(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
async function renombrarProv(id){ const p=provDe(id); const n=prompt('Nombre del proveedor:',p?p.nombre:''); if(n===null||!n.trim())return; const t=prompt('Teléfono:',p?p.tel||'':''); try{ const{error}=await sb.from('proveedores').update({nombre:n.trim(),telefono:(t||'').trim()}).eq('id',id); if(error)throw new Error(error.message); await cargarTabla('prov'); pintarCompras(); }catch(e){toast('Error: '+((e&&e.message)||e));} }
