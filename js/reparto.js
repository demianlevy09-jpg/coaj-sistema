// COHAJ Sistema — Reparto y hojas imprimibles
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- REPARTO (v71): paradas agrupadas por dirección y ordenadas por altura ------- */
let VUELTAS=[], REPARTO_OK=true, RDIA=null, RDRAG=null;
const DIAS_L=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
function wdDe(iso){return (new Date(iso+'T12:00:00').getDay()+6)%7;}
function fechaParaDia(wd){ // próxima fecha (hoy inclusive) que cae en ese día de semana
  const h=hoyISO(); const d=new Date(h+'T12:00:00'); const cur=(d.getDay()+6)%7; d.setDate(d.getDate()+((wd-cur+7)%7)); return d.toISOString().slice(0,10);
}
function edificioDe(dom){ // "Húsares 2255 1 14 3" → ed:"Húsares 2255" · calle:"Húsares" · alt:2255 · un:"1 14 3"
  const s=(dom||'').trim(); const m=s.match(/^(.*?\s(\d+))(\s.*)?$/);
  if(!m) return {ed:s,un:'',calle:s,alt:0};
  return {ed:m[1],un:(m[3]||'').trim(),calle:m[1].slice(0,m[1].length-m[2].length).trim(),alt:parseInt(m[2],10)||0};
}
function cmpNat(a,b){ // orden "natural": sin unidad primero, después 1 B, 4 F, 10 A (no 1, 10, 4)
  const ta=String(a||'').trim().toLowerCase().match(/\d+|\D+/g)||[], tb=String(b||'').trim().toLowerCase().match(/\d+|\D+/g)||[];
  for(let i=0;i<Math.max(ta.length,tb.length);i++){
    const x=ta[i],y=tb[i]; if(x==null)return -1; if(y==null)return 1;
    const nx=parseInt(x,10),ny=parseInt(y,10);
    if(!isNaN(nx)&&!isNaN(ny)){ if(nx!==ny) return nx-ny; }
    else { const c=norm(x.trim()).localeCompare(norm(y.trim())); if(c) return c; }
  }
  return 0;
}
function cmpDir(a,b){ const x=edificioDe(a),y=edificioDe(b); return norm(x.calle).localeCompare(norm(y.calle))||(x.alt-y.alt)||cmpNat(x.un,y.un); }
// ¿esa vuelta/día quedó ordenada a mano? Si no, manda el orden por dirección.
function ordenManual(dia,vuelta){ return LIVE.reparto.some(r=>r.dia===dia&&r.vuelta===vuelta&&r.org==='manual'); }
// Una parada por dirección (todos los pisos juntos). Default: la calle conserva su lugar en el recorrido y adentro va por altura de menor a mayor.
function agruparParadas(list,manual){
  const gm=new Map();
  (list||[]).forEach(x=>{ const e=edificioDe(x.c.d); const k=norm(e.ed); let g=gm.get(k);
    if(!g){ g={ed:e.ed,calle:e.calle,ck:norm(e.calle),alt:e.alt,cl:[],min:Infinity}; gm.set(k,g); }
    g.cl.push(x); g.min=Math.min(g.min,x.orden||0); });
  const gs=[...gm.values()];
  gs.forEach(g=>g.cl.sort((a,b)=>cmpNat(edificioDe(a.c.d).un,edificioDe(b.c.d).un)||norm(a.c.n||'').localeCompare(norm(b.c.n||''))));
  if(manual) gs.sort((a,b)=>a.min-b.min||a.ck.localeCompare(b.ck)||(a.alt-b.alt));
  else { const cm={}; gs.forEach(g=>{ if(cm[g.ck]==null||g.min<cm[g.ck]) cm[g.ck]=g.min; });
    gs.sort((a,b)=>(cm[a.ck]-cm[b.ck])||a.ck.localeCompare(b.ck)||(a.alt-b.alt)||a.ed.localeCompare(b.ed)); }
  return gs;
}
// qué recibe un cliente en una fecha (según suscripciones + altas cargadas − suspensiones/bajas/feriados)
function entregasDe(c,iso){
  const wd=wdDe(iso); const out=[], res=[];
  if(feriadoTotal(iso)) return {out,res};
  c.subs.filter(x=>vigenteEn(x,iso)).forEach(x=>{
    const dd=FD(x[1]); if(!tocaDia(dd,wd,iso)) return;
    if(!feriadoSale(iso,x[0])) return;
    if(suspendida(c.id,x[0],iso,null,altaDe(x))) return;
    const q=x[5]||1; (q<0?res:out).push({pub:x[0],qty:Math.abs(q),via:x[2]});
  });
  if(LIVE.stock) out.push(...entregasRevista(c.id,iso));
  return {out,res};
}
function vueltasActivas(){ const mv=misVueltas(); return VUELTAS.filter(v=>v.activo!==false&&(!mv||mv.includes(v.nombre))).sort((a,b)=>(a.orden||0)-(b.orden||0)); }
function pintarReparto(){
  const el=$('v-reparto');
  if(!REPARTO_OK){ el.innerHTML=titulo('Reparto','')+'<div class="aviso">Falta crear las tablas de reparto en la base (archivo <b>supabase/2026-09-10_reparto.sql</b>). Corrélo en el SQL Editor de Supabase y recargá.</div>'; return; }
  if(RDIA==null) RDIA=wdDe(hoyISO());
  const iso=fechaParaDia(RDIA);
  const feriado=FER.has(iso);
  // armar paradas del día
  const asig={}; LIVE.reparto.filter(r=>r.dia===RDIA).forEach(r=>asig[r.cli]=r);
  const porV={}; vueltasActivas().forEach(v=>porV[v.nombre]=[]);
  const sinV=[], reservas=[], totPub={};
  let nCli=0;
  C.filter(c=>c.act).forEach(c=>{
    const e=entregasDe(c,iso);
    e.res.forEach(r=>reservas.push({c,...r}));
    if(!e.out.length) return;
    nCli++;
    e.out.forEach(x=>totPub[x.pub]=(totPub[x.pub]||0)+x.qty);
    const a=asig[c.id];
    if(a&&porV[a.vuelta]) porV[a.vuelta].push({c,ent:e.out,orden:a.orden,rid:a.id});
    else sinV.push({c,ent:e.out});
  });
  const agrupar=(list,vn)=>agruparParadas(list,ordenManual(RDIA,vn));
  const totStr=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<b>${n}</b> ${p}`).join(' · ')||'—';
  const nParadas=Object.entries(porV).reduce((n,[vn,l])=>n+agrupar(l,vn).length,0);
  let h=titulo('Reparto',`${DIAS_L[RDIA][0].toUpperCase()+DIAS_L[RDIA].slice(1)} ${fecha(iso)} · ${nCli} clientes en ${nParadas} paradas · ${Object.values(totPub).reduce((a,b)=>a+b,0)} ejemplares`);
  h+=`<div class="fchips" style="margin:0 0 12px">${DIAS7.map((d,i)=>`<button class="fch${i===RDIA?' on':''}" data-rdia="${i}">${DIAS_L[i]}</button>`).join('')}<button class="fch" id="rimpall" style="margin-left:auto">🖨 Imprimir todas las vueltas</button><button class="fch" id="rimpmulti">🖨 Varios días…</button></div>`;
  if(feriado) h+=`<div class="aviso" style="margin-bottom:12px">${fecha(iso)} está cargado como feriado ${feriadoTotal(iso)?'sin reparto: no se entrega nada ese día.':'con diario'+(((LIVE.feriados.find(r=>r.f===iso)||{}).sp||[]).length?': no sale '+(LIVE.feriados.find(r=>r.f===iso)).sp.join(', ')+'.':' (salen todos); se suman las suscripciones "Fer".')}</div>`;
  h+=`<div class="kpis">
    <div class="kpi ancha"><i>Para armar los paquetes · total del día</i><div class="tots">${Object.entries(totPub).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<span><b>${n}</b> ${p}</span>`).join('')||'<span class="mini">nada que repartir</span>'}</div></div>
    <div class="kpi ${sinV.length?'amb':'gris'}"><i>Sin vuelta asignada</i><b>${sinV.length} <small>clientes</small></b><i>${sinV.length?'asignalos abajo':'todos asignados ✓'}</i></div>
    <div class="kpi ${reservas.length?'':'gris'}"><i>Reservas en la parada</i><b>${reservas.length} <small>ejemplares</small></b><i>los retiran en el puesto</i></div>
  </div>`;
  h+=`<div class="sec"><span class="dot"></span>Vueltas del ${DIAS_L[RDIA]} <span class="mini" style="text-transform:none;letter-spacing:0">— por default van agrupadas por dirección y ordenadas por altura; arrastrá las paradas para cambiar el orden o pasarlas a otra vuelta; ⇄ mueve un cliente</span></div>`;
  h+=`<div class="vgrid">`;
  const vacias=[];
  vueltasActivas().forEach(v=>{
    const list=porV[v.nombre]; const man=ordenManual(RDIA,v.nombre); const paradas=agruparParadas(list,man);
    if(!paradas.length){vacias.push(v);return;}
    const tot={}; list.forEach(x=>x.ent.forEach(e=>tot[e.pub]=(tot[e.pub]||0)+e.qty));
    const nEj=Object.values(tot).reduce((a,b)=>a+b,0);
    h+=`<div class="vcol" data-vuelta="${v.nombre}">
      <div class="vhead"><div><b>${v.nombre}</b> <span class="mini lnk" data-rrep="${v.nombre}" title="Cambiar repartidor">${v.repartidor||'sin repartidor'} ✎</span></div>
        <div class="mini">${paradas.length} paradas · ${nEj} ejemplares</div>
        <div class="mini vtot">${totStr(tot)}</div>
        <button class="btn chico sec" data-rimp="${v.nombre}" style="margin-top:6px">🖨 Hoja</button>${man?`<button class="btn chico sec" data-rord="${v.nombre}" style="margin-top:6px" title="Volver al orden automático: agrupado por dirección y por altura">↕ Orden por dirección</button>`:'<span class="mini" style="margin-top:6px">orden por dirección</span>'}</div>
      <div class="vlist" data-vuelta="${v.nombre}">`;
    paradas.forEach((p,i)=>{
      h+=`<div class="parada" draggable="true" data-ed="${p.ed}" data-vuelta="${v.nombre}" data-clis="${p.cl.map(x=>x.c.id).join(',')}">
        <div class="phead"><span class="grip">☰</span><b>${p.ed}</b><span class="mini">${i+1}</span>
          <span class="pmove"><button class="mini-btn" data-pmv="up" title="Subir">↑</button><button class="mini-btn" data-pmv="down" title="Bajar">↓</button></span></div>
        ${p.cl.map(x=>`<div class="pcli"><span class="un">${edificioDe(x.c.d).un||''}</span><span class="pe">${x.ent.map(e=>(e.qty>1?e.qty+'× ':'')+e.pub).join(' + ')}</span>${x.c.part?`<span class="pp">${x.c.part}</span>`:''}<button class="mini-btn" data-mv="${x.c.id}" title="Mover a otra vuelta">⇄</button></div>`).join('')}
      </div>`;
    });
    h+=`</div></div>`;
  });
  h+=`</div>`;
  if(vacias.length) h+=`<div class="mini" style="margin:14px 0 6px">Vueltas sin paradas el ${DIAS_L[RDIA]} (arrastrá una parada acá para usarlas):</div><div class="vgrid vacias">${vacias.map(v=>`<div class="vcol" data-vuelta="${v.nombre}"><div class="vhead"><b>${v.nombre}</b> <span class="mini lnk" data-rrep="${v.nombre}">${v.repartidor||'sin repartidor'} ✎</span></div><div class="vlist" data-vuelta="${v.nombre}"><div class="mini" style="padding:10px 6px;text-align:center">Soltá acá</div></div></div>`).join('')}</div>`;
  if(sinV.length){
    h+=`<div class="sec amb"><span class="dot"></span>Sin vuelta asignada (${sinV.length})</div><div class="card">${sinV.sort((a,b)=>cmpDir(a.c.d,b.c.d)).map(x=>`<div class="pcli"><span class="un" style="min-width:0"><b>${x.c.d}</b></span><span class="pe">${x.ent.map(e=>(e.qty>1?e.qty+'× ':'')+e.pub).join(' + ')}</span><button class="btn chico sec" data-mv="${x.c.id}" style="margin:0;padding:6px 10px;font-size:13px">Asignar a una vuelta…</button></div>`).join('')}</div>`;
  }
  if(reservas.length){
    h+=`<div class="sec"><span class="dot"></span>Reservas en la parada (${reservas.length})</div><div class="card"><div class="mini" style="margin-bottom:6px">Se los guardan en el puesto, no van en ninguna vuelta.</div>${reservas.map(r=>`<div class="pcli"><span class="un" style="min-width:0"><b>${r.c.d}</b>${r.c.n?' · '+r.c.n:''}</span><span class="pe">${r.qty>1?r.qty+'× ':''}${r.pub}</span></div>`).join('')}</div>`;
  }
  if(!misVueltas()) h+=`<div class="card" style="margin-top:14px"><b>Vueltas y repartidores</b><div class="mini" style="margin:4px 0 8px">Tocá el nombre del repartidor para cambiarlo. Las vueltas vienen de NewsPaper; se pueden agregar más.</div>
    ${VUELTAS.sort((a,b)=>(a.orden||0)-(b.orden||0)).map(v=>`<div class="mov"><span class="t"><b>${v.nombre}</b> · <span class="lnk" data-rrep="${v.nombre}">${v.repartidor||'sin repartidor'} ✎</span></span><span class="mini">${LIVE.reparto.filter(r=>r.vuelta===v.nombre).length} asignaciones</span><button class="mini-btn" data-rvact="${v.nombre}" title="${v.activo===false?'Activar':'Desactivar'}">${v.activo===false?'○':'●'}</button></div>`).join('')}
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><input id="rnv" placeholder="Nueva vuelta (ej: Moto 1)" style="margin:0;max-width:220px"><input id="rnr" placeholder="Repartidor" style="margin:0;max-width:180px"><button class="btn chico" id="rnvok" style="margin:0">Agregar</button></div></div>`;
  if(misVueltas()) h=h.replace(/<div class="sec amb"><span class="dot"><\/span>Sin vuelta asignada[\s\S]*?<\/div><div class="card">[\s\S]*?<\/div>/,'');
  el.innerHTML=h;
  // drag & drop (escritorio)
  el.querySelectorAll('.parada').forEach(p=>{
    p.addEventListener('dragstart',e=>{RDRAG=p;p.classList.add('drg');e.dataTransfer.effectAllowed='move';});
    p.addEventListener('dragend',()=>{p.classList.remove('drg');el.querySelectorAll('.vlist').forEach(l=>l.classList.remove('over'));});
    p.addEventListener('dragover',e=>{e.preventDefault(); if(!RDRAG||RDRAG===p)return; const r=p.getBoundingClientRect(); const antes=(e.clientY-r.top)<r.height/2; p.parentElement.insertBefore(RDRAG,antes?p:p.nextSibling);});
  });
  el.querySelectorAll('.vlist').forEach(l=>{
    l.addEventListener('dragover',e=>{e.preventDefault();l.classList.add('over'); if(RDRAG&&!l.contains(RDRAG)&&!e.target.closest('.parada')) l.appendChild(RDRAG);});
    l.addEventListener('dragleave',()=>l.classList.remove('over'));
    l.addEventListener('drop',e=>{e.preventDefault();l.classList.remove('over');const orig=RDRAG?RDRAG.dataset.vuelta:null;guardarOrdenDOM([l.dataset.vuelta,orig].filter(Boolean));});
  });
}
// lee el DOM y guarda vuelta+orden de todos los clientes del día (upsert por cliente/día)
async function guardarOrdenDOM(tocadas){
  const man=new Set(tocadas||[]); // vueltas que el usuario acomodó a mano en esta pantalla
  const rows=[];
  document.querySelectorAll('#v-reparto .vlist').forEach(l=>{
    const vuelta=l.dataset.vuelta;
    const manual=man.has(vuelta)||ordenManual(RDIA,vuelta);
    [...l.querySelectorAll('.parada')].forEach((p,i)=>{
      (p.dataset.clis||'').split(',').filter(Boolean).forEach(id=>rows.push({cliente_id:parseInt(id),dia:RDIA,vuelta:unesc(vuelta),orden:(i+1)*10,origen:manual?'manual':'app'}));
    });
  });
  try{
    let{error}=await sb.from('reparto').upsert(rows,{onConflict:'cliente_id,dia'});
    if(error){ // por si la columna origen no se puede escribir: guardamos igual el orden
      const r2=rows.map(({origen,...r})=>r);
      const x=await sb.from('reparto').upsert(r2,{onConflict:'cliente_id,dia'}); error=x.error;
    }
    if(error)throw new Error(error.message);
    await cargarTabla('reparto'); toast('Orden guardado ✓'); pintarReparto();
  }catch(e){toast('Error: '+((e&&e.message)||e)); pintarReparto();}
}
// dias: array de días (0=lunes) o true = todos; pos: 'fin' (default) o 'inicio'
async function asignarVuelta(cli,vuelta,dias,pos){
  if(dias===true) dias=[0,1,2,3,4,5,6]; if(!Array.isArray(dias)) dias=[RDIA];
  const rows=dias.map(d=>{const en=LIVE.reparto.filter(r=>r.dia===d&&r.vuelta===vuelta); const max=en.reduce((m,r)=>Math.max(m,r.orden||0),0), min=en.reduce((m,r)=>Math.min(m,r.orden||0),1e9); return {cliente_id:cli,dia:d,vuelta:unesc(vuelta),orden:pos==='inicio'?(en.length?min-10:10):max+10,anulado:false};});
  try{ const{error}=await sb.from('reparto').upsert(rows,{onConflict:'cliente_id,dia'}); if(error)throw new Error(error.message); await cargarTabla('reparto'); toast(nomCli(cli)+' → '+vuelta+' ('+(dias.length===7?'todos los días':dias.map(d=>DIAS[d]).join(' '))+') ✓'); pintarReparto(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function quitarDeVuelta(cli,dias){
  if(dias===true) dias=[0,1,2,3,4,5,6];
  try{ const{error}=await sb.from('reparto').update({anulado:true}).eq('cliente_id',cli).in('dia',dias); if(error)throw new Error(error.message); await cargarTabla('reparto'); toast(nomCli(cli)+' sin vuelta ('+(dias.length===7?'todos los días':dias.map(d=>DIAS[d]).join(' '))+')'); pintarReparto(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
// Texto humano de una novedad, con las fechas explícitas (convención confirmada por Demian el 15/09):
// Suspensión: desde = primer día que NO recibe, hasta = último día que NO recibe (inclusive), vuelve al día siguiente.
// Alta / Reanudación: desde = primer día que SÍ recibe. Baja: desde = primer día que NO recibe.
function descNov(n){
  const dias=n.dias&&n.dias.length&&n.tipo!=='Alta'?' ('+n.dias.map(d=>DIAS[d]).join(' ')+')':'';
  const pub=n.pub?n.pub+dias:'todas las publicaciones';
  if(n.tipo==='Suspensión'){ let t='no recibe '+pub+' desde el '+fecha(n.desde); if(n.hasta){ const d=new Date(n.hasta+'T12:00:00'); d.setDate(d.getDate()+1); t+=' hasta el '+fecha(n.hasta)+' inclusive · vuelve el '+fecha(d.toISOString().slice(0,10)); } else t+=' (hasta que se reanude)'; return t; }
  if(n.tipo==='Reanudación') return (n.pub?'vuelve a recibir '+pub:'cliente reactivado')+' desde el '+fecha(n.desde)+' (ese día ya recibe)';
  if(n.tipo==='Baja') return (n.pub?'deja de recibir '+pub:'cliente dado de baja')+' desde el '+fecha(n.desde)+' (ese día ya no recibe)';
  if(n.tipo==='Alta') return 'recibe '+(n.pub||'')+(n.dias?' ('+n.dias.map(d=>DIAS[d]).join(' ')+')':'')+' desde el '+fecha(n.desde)+' (ese día ya recibe)';
  return (n.pub||'')+' desde el '+fecha(n.desde);
}
function cerrarModal(){ const m=$('ovl'); if(m) m.remove(); }
function modalImpresionMasiva(){
  cerrarModal();
  const hoy=hoyISO(); const d=new Date(hoy+'T12:00:00'); d.setDate(d.getDate()+6); const fin=d.toISOString().slice(0,10);
  const vs=vueltasActivas().map(v=>v.nombre);
  document.body.insertAdjacentHTML('beforeend',`<div class="ovl" id="ovl"><div class="modal">
    <h3>Imprimir hojas de varios días</h3>
    <div class="mini">Una hoja por vuelta y por día, con lo que corresponde entregar cada fecha (suspensiones, altas y feriados incluidos). Desde el diálogo de impresión podés elegir "Guardar como PDF".</div>
    <div class="grid2"><div><label>Desde</label><input id="rim-desde" type="date" value="${hoy}"></div><div><label>Hasta</label><input id="rim-hasta" type="date" value="${fin}"></div></div>
    <label>Vueltas</label>
    <div class="dias diasel" id="rim-v" style="flex-wrap:wrap">${vs.map(v=>`<div class="dia on" data-rimv="${v}" style="width:auto;padding:0 10px">${v}</div>`).join('')}</div>
    <div class="acts"><button class="btn chico sec" id="mv-cancel">Cancelar</button><button class="btn chico" id="rim-ok">Imprimir / PDF</button></div>
  </div></div>`);
}
function impresionMasivaOK(){
  const a=$('rim-desde').value, b=$('rim-hasta').value; if(!a||!b||b<a){toast('Revisá las fechas');return;}
  const vs=[...document.querySelectorAll('#rim-v .dia.on')].map(x=>x.dataset.rimv); if(!vs.length){toast('Marcá al menos una vuelta');return;}
  const fechas=[]; let d=new Date(a+'T12:00:00'); while(d.toISOString().slice(0,10)<=b&&fechas.length<62){fechas.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1);}
  if(fechas.length>=62){toast('Máximo 2 meses por vez');return;}
  cerrarModal(); toast('Armando '+(fechas.length*vs.length)+' hojas…');
  imprimirHojas(vs,fechas);
}
function moverCliente(cli){
  const c=C.find(x=>x.id===cli); if(!c)return;
  const porDia=[0,1,2,3,4,5,6].map(d=>(LIVE.reparto.find(r=>r.cli===cli&&r.dia===d)||{}).vuelta||'');
  const act=porDia[RDIA];
  const conEntrega=[0,1,2,3,4,5,6].filter(d=>{const e=entregasDe(c,fechaParaDia(d)); return e.out.length||e.res.length;});
  const vs=vueltasActivas().map(v=>v.nombre);
  cerrarModal();
  const h=`<div class="ovl" id="ovl"><div class="modal">
    <h3>Mover ${c.d}</h3>
    <div class="mini">${c.n||''} · Nº ${c.id}${c.part?' · <i>'+c.part+'</i>':''}</div>
    <div class="mini" style="margin-top:8px">Hoy (${DIAS_L[RDIA]}): <b>${act||'sin vuelta'}</b>. Por día: ${DIAS7.map((d,i)=>`<span style="white-space:nowrap">${d} <b>${porDia[i]?porDia[i].replace(/^Bici /,'B').replace(/^Alan /,'A').replace(/^Pino$/,'P'):'–'}</b></span>`).join(' · ')}</div>
    <label>A qué vuelta</label>
    <div class="fchips" id="mv-v">${vs.map(v=>`<button class="fch${v===act?'':''}" data-mvv="${v}">${v}${v===act?' <span class="mini">(actual)</span>':''}</button>`).join('')}<button class="fch" data-mvv="__quitar">Sacar de la vuelta</button></div>
    <label>Qué días</label>
    <div class="fchips" id="mv-s"><button class="fch on" data-mvs="hoy">Solo ${DIAS_L[RDIA]}</button><button class="fch" data-mvs="todos">Todos los días</button><button class="fch" data-mvs="algunos">Elegir días</button></div>
    <div id="mv-dias" hidden class="dias diasel" style="margin-top:6px">${DIAS7.map((d,i)=>`<div class="dia${conEntrega.includes(i)?' on':''}" data-di="${i}">${d}</div>`).join('')}</div>
    <div class="mini" id="mv-dias-nota" hidden style="margin-top:4px">Marcados los días en que tiene entrega.</div>
    <label>Dónde ponerlo en la vuelta</label>
    <div class="fchips" id="mv-p"><button class="fch on" data-mvp="fin">Al final</button><button class="fch" data-mvp="inicio">Al principio</button></div>
    <div class="acts"><button class="btn chico sec" id="mv-cancel">Cancelar</button><button class="btn chico" id="mv-ok" data-cli="${cli}">Mover</button></div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',h);
}
function mvConfirmar(cli){
  const v=(document.querySelector('#mv-v .fch.on')||{}).dataset; if(!v||!v.mvv){toast('Elegí la vuelta');return;}
  const sc=(document.querySelector('#mv-s .fch.on')||{}).dataset.mvs||'hoy';
  let dias=sc==='todos'?true:(sc==='algunos'?[...document.querySelectorAll('#mv-dias .dia.on')].map(x=>parseInt(x.dataset.di)):[RDIA]);
  if(Array.isArray(dias)&&!dias.length){toast('Marcá al menos un día');return;}
  const pos=(document.querySelector('#mv-p .fch.on')||{}).dataset.mvp||'fin';
  cerrarModal();
  if(v.mvv==='__quitar') quitarDeVuelta(cli,dias); else asignarVuelta(cli,v.mvv,dias,pos);
}
async function editarRepartidor(nombre){
  const v=VUELTAS.find(x=>x.nombre===nombre); const r=prompt('Repartidor de '+nombre+':',v?v.repartidor||'':''); if(r===null)return;
  try{ const{error}=await sb.from('vueltas').update({repartidor:r.trim()}).eq('nombre',nombre); if(error)throw new Error(error.message); await cargarTabla('vueltas'); toast('Guardado ✓'); pintarReparto(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function toggleVuelta(nombre){
  const v=VUELTAS.find(x=>x.nombre===nombre); if(!v)return;
  try{ const{error}=await sb.from('vueltas').update({activo:v.activo===false}).eq('nombre',nombre); if(error)throw new Error(error.message); await cargarTabla('vueltas'); pintarReparto(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function nuevaVuelta(){
  const n=$('rnv').value.trim(), r=$('rnr').value.trim(); if(!n){toast('Poné el nombre de la vuelta');return;}
  try{ const{error}=await sb.from('vueltas').insert({nombre:n,repartidor:r,orden:VUELTAS.length+1}); if(error)throw new Error(error.message); await cargarTabla('vueltas'); toast('Vuelta creada ✓'); pintarReparto(); }catch(e){toast('Error: '+((e&&e.message)||e));}
}
async function ordenPorDireccion(vuelta){ // saca el orden a mano de esa vuelta/día y vuelve al automático
  try{ const{error}=await sb.from('reparto').update({origen:'app'}).eq('dia',RDIA).eq('vuelta',unesc(vuelta)); if(error)throw new Error(error.message);
    await cargarTabla('reparto'); toast('Orden por dirección ✓'); pintarReparto();
  }catch(e){toast('Error: '+((e&&e.message)||e));}
}
function moverParada(p,dir){
  const sib=dir==='up'?p.previousElementSibling:p.nextElementSibling; if(!sib||!sib.classList.contains('parada'))return;
  if(dir==='up') p.parentElement.insertBefore(p,sib); else p.parentElement.insertBefore(sib,p);
  guardarOrdenDOM([p.dataset.vuelta]);
}
function construirParadasHoja(vnombre,iso){
  const v=VUELTAS.find(x=>x.nombre===vnombre)||{nombre:vnombre};
  const wdh=wdDe(iso);
  const asig={}; LIVE.reparto.filter(r=>r.dia===wdh&&r.vuelta===vnombre).forEach(r=>asig[r.cli]=r);
  const list=[]; const tot={};
  C.filter(c=>c.act&&asig[c.id]).forEach(c=>{const e=entregasDe(c,iso); if(!e.out.length)return; e.out.forEach(x=>tot[x.pub]=(tot[x.pub]||0)+x.qty); list.push({c,ent:e.out,orden:asig[c.id].orden});});
  const paradas=agruparParadas(list,ordenManual(wdh,vnombre));
  return {v,wdh,paradas,tot,list};
}
function encabezadoHojaHTML(v,iso,wdh,tot,paradasN,clientesN,pag,pags){
  return `<div class="hh"><div><b>COHAJ · Reparto del ${DIAS_L[wdh]} ${fecha(iso)}</b><div>Vuelta <b>${v.nombre}</b>${v.repartidor?' · '+v.repartidor:''}${pags>1?` · HOJA ${pag}/${pags}`:''}</div></div><div class="ht">${Object.entries(tot).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<b>${n}</b> ${p}`).join(' · ')||'—'}<div>${paradasN} paradas · ${clientesN} clientes</div></div></div>`;
}
function paradaHojaHTML(p,n){
  return `<div class="hp"><div class="hpe">${n}. ${p.ed}</div>${p.cl.map(x=>`<div class="hpc"><span class="hq">☐</span><span class="hu">${edificioDe(x.c.d).un||''}</span><span class="he">${x.ent.map(e=>(e.qty>1?e.qty+'× ':'')+e.pub).join(' + ')}</span><span class="hpp">${x.c.part||''}</span></div>`).join('')}</div>`;
}
// Reparte las paradas en las páginas físicas que realmente entran en una hoja A4 (mide en el DOM real, igual fuente/ancho que la impresión)
function paginarParadasHoja(paradas,v,iso,wdh,tot,clientesN){
  if(!paradas.length) return [];
  const mmpx=96/25.4, anchoMM=210-16, altoUtilPx=(297-10)*mmpx;
  const cont=document.createElement('div');
  cont.className='hoja';
  cont.style.cssText=`position:fixed;left:-9999px;top:0;width:${anchoMM}mm`;
  document.body.appendChild(cont);
  cont.innerHTML=encabezadoHojaHTML(v,iso,wdh,tot,paradas.length,clientesN,1,2);
  const hHeader=cont.getBoundingClientRect().height+8;
  const alturas=paradas.map(p=>{ cont.innerHTML=paradaHojaHTML(p,1); return cont.getBoundingClientRect().height; });
  document.body.removeChild(cont);
  const pages=[]; let cur=[], h=hHeader;
  paradas.forEach((p,i)=>{
    const ph=alturas[i];
    if(cur.length&&h+ph>altoUtilPx){ pages.push(cur); cur=[]; h=hHeader; }
    cur.push(p); h+=ph;
  });
  if(cur.length) pages.push(cur);
  return pages;
}
function hojaHTML(vnombre,iso){
  const{v,wdh,paradas,tot,list}=construirParadasHoja(vnombre,iso);
  if(!paradas.length) return `<div class="hoja">${encabezadoHojaHTML(v,iso,wdh,{},0,0,1,1)}<div>Sin paradas.</div></div>`;
  const pages=paginarParadasHoja(paradas,v,iso,wdh,tot,list.length);
  const N=pages.length; let n=0;
  return pages.map((pg,ix)=>`<div class="hoja">${encabezadoHojaHTML(v,iso,wdh,tot,paradas.length,list.length,ix+1,N)}${pg.map(p=>paradaHojaHTML(p,++n)).join('')}</div>`).join('');
}
function imprimirHojas(nombres,fechas){
  const isos=fechas&&fechas.length?fechas:[fechaParaDia(RDIA)];
  const hojas=[]; isos.forEach(iso=>{ if(feriadoTotal(iso)) return; nombres.forEach(n=>{ const h=hojaHTML(n,iso); if(!/[^0-9]0 paradas · 0 clientes/.test(h)) hojas.push(h); }); });
  if(!hojas.length){toast('No hay nada para imprimir en ese rango (¿feriado sin diario?)');return;}
  $('print-area').innerHTML=hojas.join('');
  document.body.classList.add('print-hojas');
  setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('print-hojas'),500);},50);
}
