// COHAJ Sistema — Precios
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- PRECIOS ------- */
function pintarPrecios(){
  const todos=[...PRECIOS,...LIVE.precios];
  const porPub={};
  todos.forEach(p=>{const k=p.pub+(p.dia!=null?' · '+DIAS[p.dia]:'');(porPub[k]=porPub[k]||[]).push(p);});
  const pubs=Object.keys(porPub).sort();
  $('v-precios').innerHTML=`${titulo('Precios',pubs.length+' publicaciones con precio · los cambios se cargan como nueva vigencia')}
  <div class="card"><b>Nueva vigencia de precio</b>
    <label>Publicación</label><input id="ppub" list="dl-pubs" placeholder="ej: PAGINA 12"><datalist id="dl-pubs">${[...new Set(todos.map(p=>p.pub))].sort().map(p=>`<option>${p}</option>`).join('')}</datalist>
    <label>Día (para diarios con precio distinto por día)</label><select id="pdia"><option value="">Todos / único</option>${DIAS7.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select>
    <label>Vigente desde</label><input id="pdesde" type="date" value="${hoyISO()}">
    <label>Precio de tapa $</label><input id="pprecio" type="text" inputmode="decimal" autocomplete="off">
    <button class="btn" id="pok">Guardar</button>
    <div class="mini" style="margin-top:8px">Nunca se pisa un precio viejo: se agrega la vigencia nueva y la historia queda (sirve para recalcular meses).</div></div>
  <h2>Precios por publicación</h2>
  <input id="pfil" type="search" placeholder="Filtrar publicación…" style="margin-bottom:8px">
  <div id="plist" class="gridcards">${pubs.map(p=>{const v=porPub[p].sort((a,b)=>(a.desde||'').localeCompare(b.desde||''));const u=v[v.length-1];
   return`<div class="card"><b>${p}</b> <span class="monto" style="float:right">${fmt(u.precio)}</span>
   <div class="mini" style="margin-top:4px">desde ${fecha(u.desde)}${v.length>1?' · antes: '+v.slice(-3,-1).map(x=>fmt(x.precio)+' ('+fecha(x.desde)+')').join(', '):''}${u.nuevo?' · <b>cargado acá</b> <button class="del" data-prid="'+u.id+'" title="Borrar esta vigencia (queda la anterior)">✕</button>':''}</div></div>`;}).join('')}</div>`;
}
async function addPrecio(){
  let pub=$('ppub').value.trim().toUpperCase(); const desde=$('pdesde').value, precio=num($('pprecio').value);
  if(!pub||!precio){toast('Completá publicación y precio');return;} if(!desde){toast('Poné desde cuándo rige');return;}
  let dia=$('pdia').value===''?null:parseInt($('pdia').value);
  // v94: si eligieron "EL CRONISTA COMERCIAL · Ju" de la lista, el día va en el selector, no en el nombre
  // (antes se guardaba como publicación nueva "… · JU" que ninguna suscripción usa).
  const m=pub.match(/^(.*?)\s*·\s*([A-Z]+)$/);
  if(m){ const i=DIAS.findIndex(d=>d.toUpperCase()===m[2]); if(i>=0){ pub=m[1].trim(); if(dia==null) dia=i; } }
  try{ await guardar('precios',[...LIVE.precios,{pub,dia,desde,precio,nuevo:1,ts:new Date().toISOString()}]); SCACHE={}; toast('Precio guardado ✓'); pintarPrecios(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
// v94: borrar una vigencia cargada acá (se anula, no se borra físicamente; vuelve a regir la anterior)
async function borrarPrecio(id){
  const r=LIVE.precios.find(x=>String(x.id)===String(id)); if(!r)return;
  if(!confirm('¿Borrar el precio '+fmt(r.precio)+' de '+r.pub+(r.dia!=null?' ('+DIAS[r.dia]+')':'')+' desde el '+fecha(r.desde)+'?'))return;
  try{ await guardar('precios',LIVE.precios.filter(x=>String(x.id)!==String(id))); SCACHE={}; toast('Borrado'); pintarPrecios(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
