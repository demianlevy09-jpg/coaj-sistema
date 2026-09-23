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
    <label>Publicación</label><input id="ppub" list="dl-pubs" placeholder="ej: PAGINA 12"><datalist id="dl-pubs">${pubs.map(p=>`<option>${p}</option>`).join('')}</datalist>
    <label>Día (para diarios con precio distinto por día)</label><select id="pdia"><option value="">Todos / único</option>${DIAS7.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select>
    <label>Vigente desde</label><input id="pdesde" type="date" value="${hoyISO()}">
    <label>Precio de tapa $</label><input id="pprecio" type="number" inputmode="decimal">
    <button class="btn" id="pok">Guardar</button>
    <div class="mini" style="margin-top:8px">Nunca se pisa un precio viejo: se agrega la vigencia nueva y la historia queda (sirve para recalcular meses).</div></div>
  <h2>Precios por publicación</h2>
  <input id="pfil" type="search" placeholder="Filtrar publicación…" style="margin-bottom:8px">
  <div id="plist" class="gridcards">${pubs.map(p=>{const v=porPub[p].sort((a,b)=>(a.desde||'').localeCompare(b.desde||''));const u=v[v.length-1];
   return`<div class="card"><b>${p}</b> <span class="monto" style="float:right">${fmt(u.precio)}</span>
   <div class="mini" style="margin-top:4px">desde ${fecha(u.desde)}${v.length>1?' · antes: '+v.slice(-3,-1).map(x=>fmt(x.precio)+' ('+fecha(x.desde)+')').join(', '):''}${u.nuevo?' · <b>cargado acá</b>':''}</div></div>`;}).join('')}</div>`;
}
async function addPrecio(){
  const pub=$('ppub').value.trim().toUpperCase(), desde=$('pdesde').value, precio=parseFloat($('pprecio').value);
  if(!pub||!precio){toast('Completá publicación y precio');return;}
  const dia=$('pdia').value===''?null:parseInt($('pdia').value);
  try{ await guardar('precios',[...LIVE.precios,{pub,dia,desde,precio,nuevo:1,ts:new Date().toISOString()}]); toast('Precio guardado ✓'); pintarPrecios(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
