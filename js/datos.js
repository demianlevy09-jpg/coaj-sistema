// COHAJ Sistema — capa de datos: lectura y escritura en las tablas de Supabase
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- capa de datos: tablas de Supabase (v33) ------- */
const TABLAS={movs:'movimientos',caja:'caja',precios:'precios',novedades:'novedades',dist:'dist_movimientos',feriados:'feriados',devol:'devoluciones',reparto:'reparto',vueltas:'vueltas',prov:'proveedores',prod:'productos',stock:'stock_mov',provmov:'prov_movimientos',pubdist:'publicaciones_dist',dists:'distribuidores'};
const ORDEN_COL={feriados:'fecha',vueltas:'orden',pubdist:'publicacion'};
const A_DB={
  movs:r=>({cliente_id:r.cli,fecha:r.f,tipo:r.tipo,importe:r.imp,medio:r.medio||'',nota:r.nota||''}),
  caja:r=>({fecha:r.f,concepto:r.c,detalle:r.d||'',ingreso:r.ing||0,egreso:r.egr||0,medio:r.m||'Efectivo',movimiento_id:r.mid||null}),
  precios:r=>({publicacion:r.pub,dia:r.dia==null?null:r.dia,desde:r.desde,precio:r.precio}),
  novedades:r=>({cliente_id:r.cli,tipo:r.tipo,publicacion:r.pub||'',desde:r.desde||null,hasta:r.hasta||null,dias:r.dias||null,via:r.via||null,cantidad:r.qty||null,nota:r.nota||''}),
  dist:r=>({distribuidor_id:r.dist||1,fecha:r.f,detalle:r.d||'',importe:r.imp}),
  feriados:r=>({fecha:r.f,motivo:r.d||'',sin_pubs:r.sp==null?null:r.sp}),
  devol:r=>({distribuidor_id:r.dist||1,fecha:r.f,publicacion:r.pub,cantidad:r.qty,nota:r.nota||'',valor_unit:r.vu==null?null:r.vu,importe:r.imp==null?null:r.imp}),
  reparto:r=>({cliente_id:r.cli,dia:r.dia,vuelta:r.vuelta,orden:r.orden||0}),
  vueltas:r=>({nombre:r.nombre,repartidor:r.repartidor||'',orden:r.orden||0,activo:r.activo!==false})
};
const DE_DB={
  movs:x=>({id:String(x.id),ts:x.creado_en,cli:x.cliente_id,tipo:x.tipo,imp:Number(x.importe),f:x.fecha,medio:x.medio||'',nota:x.nota||'',fijo:x.fijo?1:0}),
  caja:x=>({id:String(x.id),ts:x.creado_en,f:x.fecha,c:x.concepto,d:x.detalle||'',ing:Number(x.ingreso)||0,egr:Number(x.egreso)||0,m:x.medio||'',fijo:x.fijo?1:0}),
  precios:x=>({id:String(x.id),pub:x.publicacion,dia:x.dia==null?null:x.dia,desde:x.desde,precio:Number(x.precio),nuevo:x.origen!=='newspaper'?1:0,ts:x.creado_en}),
  novedades:x=>({id:String(x.id),ts:x.creado_en,cli:x.cliente_id,tipo:x.tipo,pub:x.publicacion||'',desde:x.desde||'',hasta:x.hasta||'',dias:x.dias||null,via:x.via||null,qty:x.cantidad||null,nota:x.nota||''}),
  dist:x=>({id:String(x.id),ts:x.creado_en,f:x.fecha,d:x.detalle||'',imp:Number(x.importe),dist:x.distribuidor_id}),
  feriados:x=>({id:x.fecha,f:x.fecha,d:x.motivo||'',sp:x.sin_pubs||null}),
  devol:x=>({id:String(x.id),ts:x.creado_en,f:x.fecha,pub:x.publicacion,qty:x.cantidad,nota:x.nota||'',dist:x.distribuidor_id,vu:x.valor_unit==null?null:Number(x.valor_unit),imp:x.importe==null?null:Number(x.importe)}),
  reparto:x=>({id:String(x.id),cli:x.cliente_id,dia:x.dia,vuelta:x.vuelta,orden:x.orden||0,org:x.origen||''}),
  vueltas:x=>({id:x.nombre,nombre:x.nombre,repartidor:x.repartidor||'',orden:x.orden||0,activo:x.activo!==false}),
  prov:x=>({id:x.id,nombre:x.nombre,tel:x.telefono||'',nota:x.nota||'',activo:x.activo!==false}),
  prod:x=>({id:x.id,nombre:x.nombre,cat:x.categoria||'',prov:x.proveedor_id,modo:x.modo_precio||'fijo',precio:Number(x.precio_venta)||0,margen:Number(x.margen)||0,costo:Number(x.costo)||0,activo:x.activo!==false,pubs:x.publicaciones||[]}),
  stock:x=>({id:String(x.id),ts:x.creado_en,prod:x.producto_id,f:x.fecha,tipo:x.tipo,qty:x.cantidad,prop:x.propiedad,prov:x.proveedor_id,costo:Number(x.costo_unit)||0,precio:Number(x.precio_unit)||0,medio:x.medio||'',cli:x.cliente_id,cajaId:x.caja_id,provMovId:x.prov_mov_id,movId:x.mov_id,nota:x.nota||'',ed:x.edicion||''}),
  provmov:x=>({id:String(x.id),ts:x.creado_en,prov:x.proveedor_id,f:x.fecha,tipo:x.tipo,imp:Number(x.importe),d:x.detalle||'',cajaId:x.caja_id}),
  pubdist:x=>({id:x.publicacion,pub:x.publicacion,dist:x.distribuidor_id}),
  dists:x=>({id:x.id,nombre:x.nombre,activo:x.activo!==false,comision:x.comision==null?null:Number(x.comision)})
};
async function todo(mk){ // trae todas las filas paginando de a 1000
  let out=[],from=0;
  for(;;){ const{data,error}=await mk().range(from,from+999); if(error)throw error; out.push(...data); if(data.length<1000)break; from+=1000; }
  return out;
}
async function cargarTabla(col){
  const t=TABLAS[col];
  let rows=await todo(()=>sb.from(t).select('*').eq('anulado',false).order(ORDEN_COL[col]||'id',{ascending:true}));
  if(col==='movs'){ const ids=new Set(C.map(c=>c.id)); rows=rows.filter(x=>x.origen!=='newspaper'&&ids.has(x.cliente_id)); }
  if(col==='caja'){ CAJAH=rows.filter(x=>x.origen==='newspaper').map(x=>escObj({f:x.fecha+(x.hora?' '+String(x.hora).slice(0,5):''),c:x.concepto,d:x.detalle||'',i:Number(x.ingreso)||0,e:Number(x.egreso)||0,m:x.medio||''})); rows=rows.filter(x=>x.origen!=='newspaper'); }
  if(col==='precios'){ PRECIOS=rows.filter(x=>x.origen==='newspaper').map(x=>escObj(DE_DB.precios(x))); rows=rows.filter(x=>x.origen!=='newspaper'); }
  if(col==='dist'){ DISTH=rows.filter(x=>x.historico).map(x=>escObj({f:x.fecha,d:x.detalle||'',imp:Number(x.importe)})); rows=rows.filter(x=>!x.historico); }
  LIVE[col]=rows.map(x=>escObj(DE_DB[col](x))); // texto escapado para que un nombre/nota con <script> no se ejecute al pintar
  if(col==='feriados'){ FER=new Set(LIVE.feriados.map(r=>r.f)); FERP={}; LIVE.feriados.forEach(r=>{FERP[r.f]=r.sp==null?null:r.sp.map(norm);}); }
  if(col==='vueltas') VUELTAS=LIVE.vueltas;
  if(col==='dists'){ DISTS=LIVE.dists.filter(d=>d.activo); const d1=DISTS.find(d=>d.id===1); if(d1&&typeof d1.comision==='number') CONFIG.comision=d1.comision; }
  if(col==='novedades') recalcActivos();
  if(col==='precios') armarPIDX();
  SCACHE={};
}
async function cargarClientes(){
  const cl=await todo(()=>sb.from('clientes').select('*').eq('activo',true).eq('anulado',false).order('id'));
  C=cl.map(x=>({id:x.id,d:esc(x.domicilio),n:esc(x.nombre||''),cat:'',act:1,fic:x.ficha||'actual',tel:esc(x.telefono||''),obs:esc(x.observaciones||''),part:esc(x.particularidad||''),sal:Number(x.saldo_inicial)||0,salf:x.saldo_inicial_fecha,dud:0,subs:[],movs:[]}));
  const idx={}; C.forEach(c=>idx[c.id]=c);
  const ids=C.map(c=>c.id);
  const subs=await todo(()=>sb.from('suscripciones').select('*').in('cliente_id',ids).eq('anulado',false).order('id'));
  subs.forEach(x=>{const c=idx[x.cliente_id]; if(!c) return; let txt=x.dias_texto||''; if(FD(txt)==null&&x.dias&&x.dias.length) txt=x.dias.map(d=>DIAS[d]||'').join(' '); c.subs.push([esc(x.publicacion),esc(txt),x.via,x.hasta?x.hasta:'V',x.desde||'',x.cantidad||1,x.origen||'',x.novedad_id||null]);});
  const movs=await todo(()=>sb.from('movimientos').select('*').in('cliente_id',ids).eq('anulado',false).eq('origen','newspaper').order('fecha'));
  movs.forEach(x=>{const c=idx[x.cliente_id]; if(c) c.movs.push([x.fecha,x.tipo,x.tipo==='Cobro'?-Number(x.importe):Number(x.importe),x.medio||'']);});
  C.forEach(c=>{c.k=norm(c.d+' '+c.n+' '+c.id+' '+c.subs.map(x=>x[0]).join(' '));});
  recalcActivos();
}
async function cargarConfig(){
  const{data,error}=await sb.from('config').select('*'); if(error)throw error;
  const cf={}; (data||[]).forEach(r=>cf[r.clave]=r.valor);
  if(typeof cf.comision==='number') CONFIG.comision=cf.comision;
  if(Array.isArray(cf.medios)) LISTAS.medios=cf.medios;
  CONFIG.raw=cf;
}
async function boot(){
  db=true;
  try{
    const{data:pf}=await sb.from('perfiles').select('*').eq('id',USUARIO.id).maybeSingle(); PERFIL=pf||{rol:'operador',activo:true};
    await cargarConfig();
    await cargarClientes();
    await Promise.all(['precios','caja','movs','novedades','dist','feriados','devol'].map(cargarTabla));
    try{ await cargarTabla('vueltas'); await cargarTabla('reparto'); REPARTO_OK=true; }catch(e){ REPARTO_OK=false; console.warn('reparto',e); }
    try{ await cargarTabla('dists'); }catch(e){ console.warn('dists',e); }
    try{ await Promise.all(['prov','prod','stock','provmov','pubdist'].map(cargarTabla)); STOCK_OK=true; }catch(e){ STOCK_OK=false; console.warn('stock',e); }
  }catch(e){
    $('cargando').innerHTML='No pude leer los datos: '+((e&&e.message)||e)+'<br><br><button class="btn" onclick="location.reload()">Recargar</button> <button class="btn sec" id="lsalir">Volver a entrar</button>';
    return;
  }
  if(!C.length){
    $('cargando').innerHTML='No hay clientes activos cargados (o la sesión venció).<br><br><button class="btn" onclick="location.reload()">Recargar</button> <button class="btn sec" id="lsalir">Volver a entrar</button>';
    return;
  }
  armarPIDX(); recalcActivos();
  $('cargando').hidden=true; $('app').hidden=false; $('tabs').hidden=false;
  $('estado-db').textContent='☁ guardado';
  pintarInicio(); pintarClientes(); pintarCaja(); pintarPrecios(); pintarNovedades(); pintarDist();
}
// guardar(col, filas): compara con lo que hay en memoria → inserta las nuevas y anula las que faltan, fila por fila (sin pisar a otros usuarios)
async function guardar(col,rows){
  const t=TABLAS[col];
  const antes=new Map(LIVE[col].map(r=>[String(r.id),r]));
  const nuevos=rows.filter(r=>!antes.has(String(r.id)));
  const idsDespues=new Set(rows.map(r=>String(r.id)));
  const anulados=LIVE[col].filter(r=>!idsDespues.has(String(r.id))&&!r.fijo);
  for(const r of nuevos){ const fila=unescObj(A_DB[col](r)); const{error}=await (t==='feriados'?sb.from(t).upsert({...fila,anulado:false,anulado_en:null,anulado_por:null},{onConflict:'fecha'}):sb.from(t).insert(fila)); if(error)throw new Error(error.message); }
  for(const r of anulados){
    const q=sb.from(t).update({anulado:true}); const{error}=await (t==='feriados'?q.eq('fecha',r.id):q.eq('id',r.id)); if(error)throw new Error(error.message);
  }
  await cargarTabla(col);
  if(col==='novedades'){ await cargarClientes(); SCACHE={}; }
}
async function exportarTodo(){
  try{
    const{data,error}=await sb.rpc('exportar_todo'); if(error)throw error;
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cohaj-backup-'+hoyISO()+'.json'; a.click();
    toast('Backup descargado ✓');
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
function nid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
