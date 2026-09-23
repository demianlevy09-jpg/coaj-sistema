// COHAJ Sistema — arranque y eventos globales (va última)
// Parte del código de la app (antes todo estaba en index.html). Se cargan en orden, como scripts comunes: comparten las variables globales.
/* ------- latido de diagnóstico ------- */
let NEV=0;
const PINTAR={clientes:()=>{ if($('bq')) buscar(true); else pintarClientes(); } /* al volver a Clientes, saldos al día */,inicio:pintarInicio,caja:pintarCaja,precios:pintarPrecios,novedades:pintarNovedades,dist:pintarDist,reparto:pintarReparto,ventas:pintarVentas,stock:pintarStock,compras:pintarCompras};
/* ------- DELEGACIÓN GLOBAL (sobrevive a cualquier re-render) ------- */
document.addEventListener('click',function(e){
  NEV++;
  const t=e.target.closest?e.target:null; if(!t)return;
  const tab=e.target.closest('.tab');
  if(tab){ if(tab.classList.contains('mas')){$('massheet').hidden=!$('massheet').hidden;return;} $('massheet').hidden=true; const vv=ver(tab.dataset.v);const p=PINTAR[vv];if(p)p();return;}
  if($('massheet')&&!$('massheet').hidden&&(!e.target.closest('#massheet')||e.target.closest('#massheet .btn'))){ $('massheet').hidden=true; }
  if(e.target.closest('#mv-cancel')||(e.target.id==='ovl')){cerrarModal();return;}
  if(e.target.closest('#mv-ok')){mvConfirmar(parseInt(e.target.closest('#mv-ok').dataset.cli));return;}
  const mvc=e.target.closest('#mv-v .fch, #mv-s .fch, #mv-p .fch');
  if(mvc){ mvc.parentElement.querySelectorAll('.fch').forEach(x=>x.classList.toggle('on',x===mvc)); if(mvc.dataset.mvs){const alg=mvc.dataset.mvs==='algunos'; $('mv-dias').hidden=!alg; $('mv-dias-nota').hidden=!alg;} return; }
  const fch=e.target.closest('.fch');
  if(fch&&fch.dataset.f){setF(fch.dataset.f);return;}
  if(fch&&fch.dataset.rdia!=null){RDIA=parseInt(fch.dataset.rdia);pintarReparto();return;}
  const rrep=e.target.closest('[data-rrep]'); if(rrep){editarRepartidor(rrep.dataset.rrep);return;}
  const rimp=e.target.closest('[data-rimp]'); if(rimp){imprimirHojas([rimp.dataset.rimp]);return;}
  const rord=e.target.closest('[data-rord]'); if(rord){ordenPorDireccion(rord.dataset.rord);return;}
  const rva=e.target.closest('[data-rvact]'); if(rva){toggleVuelta(rva.dataset.rvact);return;}
  const mvb=e.target.closest('[data-mv]'); if(mvb){moverCliente(parseInt(mvb.dataset.mv));return;}
  const pmv=e.target.closest('[data-pmv]'); if(pmv){moverParada(pmv.closest('.parada'),pmv.dataset.pmv);return;}
  if(fch&&fch.dataset.ct){CTIPO=fch.dataset.ct;pintarCompras();return;}
  if(fch&&fch.dataset.dsel){DSEL=parseInt(fch.dataset.dsel);pintarDist();return;}
  if(fch&&fch.dataset.pedit){$('pajbox-'+fch.dataset.pedit).innerHTML=formProdHTML(prodDe(parseInt(fch.dataset.pedit)));return;}
  if(fch&&fch.dataset.pajuste){$('pajbox-'+fch.dataset.pajuste).innerHTML=formAjusteHTML(parseInt(fch.dataset.pajuste));return;}
  if(fch&&fch.dataset.pvender){const pid=fch.dataset.pvender;irTab('ventas');setTimeout(()=>{const sl=$('v-prod');if(sl){sl.value=pid;ventaProdCambio();}},80);return;}
  const ctgo=e.target.closest('[data-ctgo]'); if(ctgo){CTIPO=ctgo.dataset.ctgo;irTab('compras');setTimeout(()=>{CTIPO=ctgo.dataset.ctgo;pintarCompras();},30);return;}
  const dren=e.target.closest('[data-dren]'); if(dren){renombrarDist(parseInt(dren.dataset.dren));return;}
  const pren=e.target.closest('[data-pren]'); if(pren){renombrarProv(parseInt(pren.dataset.pren));return;}
  const pajok=e.target.closest('[data-pajok]'); if(pajok){ajustarStock(parseInt(pajok.dataset.pajok));return;}
  const prep=e.target.closest('[data-prepartir]'); if(prep){repartirUltimo(parseInt(prep.dataset.prepartir));return;}
  const edel=e.target.closest('[data-edel]'); if(edel){anularEntrega(edel.dataset.edel);return;}
  if(e.target.closest('#cmas')){CLIM+=100;pintaC();return;}
  if(e.target.closest('#fclimp')){['fcc','fcm','fcv','fcd','fch','fct','fcli'].forEach(i=>{$(i).value='';});$('fcli').dataset.cli='';$('fcdup').checked=false;CLIM=50;pintaC();return;}
  if(e.target.closest('#pf-ok')){guardarProd(parseInt(e.target.closest('#pf-ok').dataset.pid)||null);return;}
  if(e.target.closest('#pf-cancel')){const f=$('sform');if(f)f.innerHTML='';if(PSEL)abrirProd(PSEL,true);return;}
  if(e.target.closest('#pf-baja')){bajaProd(parseInt(e.target.closest('#pf-baja').dataset.pid));return;}
  if(e.target.closest('#nedit-cancel')){NEDIT=null;pintarNForm();return;}
  if(fch&&fch.dataset.femodo){document.querySelectorAll('.fch[data-femodo]').forEach(x=>x.classList.toggle('on',x===fch));$('fepubs').hidden=fch.dataset.femodo!=='parcial';return;}
  if(fch&&fch.dataset.nt){NEDIT=null;NTIPO=fch.dataset.nt;document.querySelectorAll('.fch[data-nt]').forEach(x=>x.classList.toggle('on',x.dataset.nt===NTIPO));pintarNForm();return;}
  if(e.target.closest('#fcancel')){const f=$('fform');if(f)f.innerHTML='';return;}
  if(e.target.closest('[data-nborrar]')){const x=e.target.closest('[data-nborrar]');borrarNota(parseInt(x.dataset.cli),parseInt(x.dataset.nborrar));return;}
  const del=e.target.closest('.del');
  if(del){
    if(del.dataset.mid) borrarMov(del.dataset.mid,parseInt(del.dataset.cli));
    else if(del.dataset.cid) borrarCaja(del.dataset.cid);
    else if(del.dataset.nedit) editarNovedad(del.dataset.nedit);
    else if(del.dataset.nid) borrarNov(del.dataset.nid);
    else if(del.dataset.did) borrarDist(del.dataset.did);
    else if(del.dataset.feid) borrarFeriado(del.dataset.feid);
    else if(del.dataset.dvid) borrarDevol(del.dataset.dvid);
    else if(del.dataset.vdel) anularVenta(del.dataset.vdel);
    else if(del.dataset.cdel) anularIngreso(del.dataset.cdel);
    else if(del.dataset.pdel) anularPagoProv(del.dataset.pdel);
    return;
  }
  const sf=e.target.closest('[data-sform]');
  if(sf&&!sf.dataset.done){
    const cont=sf.parentElement;
    const dd=(sf.dataset.dias||'').split(',').filter(x=>x!=='').map(Number);
    const otras=(()=>{const c=C.find(x=>x.id===parseInt(sf.dataset.cli));if(!c)return 0;return c.subs.filter(x=>x[3]==='V'&&mismaPub(unesc(x[0]),sf.dataset.pub)).length;})();
    const cerr=sf.dataset.cerrada==='1';
    const esSusp=sf.dataset.acc==='Suspensión';
    const pubH=esc(sf.dataset.pub);
    cont.innerHTML=(esSusp?`<div class="grid2"><div>`:'')+`<label>${cerr?'Reactivar':sf.dataset.acc+' de'} ${pubH}${dd.length?' ('+dd.map(d=>DIAS[d]).join(' ')+')':''} desde</label><input type="date" class="sfec" value="${hoyISO()}">`
    +(esSusp?`</div><div><label>Vuelve a recibir el <span class="mini">(opcional; vacío = hasta que la reactives)</span></label><input type="date" class="sfhasta"></div></div>`:'')+`
    ${cerr?`<div class="mini" style="margin:2px 0 6px">Esta suscripción estaba cerrada en el sistema viejo: se vuelve a dar de alta desde esa fecha (${sf.dataset.via==='S'?'vía distribuidora':'le cobrás vos'}${parseInt(sf.dataset.qty)>1?', ×'+sf.dataset.qty:''}) y devenga desde ahí.</div>`:''}
    ${otras>1&&dd.length&&sf.dataset.todas!=='1'?`<label class="chkl"><input type="checkbox" class="sftodas"> Aplicar a todas las suscripciones de ${pubH} de este cliente (${otras})</label>`:''}
    <button class="btn chico" data-sok data-pub="${pubH}" data-dias="${sf.dataset.dias||''}" data-via="${sf.dataset.via||''}" data-qty="${sf.dataset.qty||''}" ${cerr?'data-cerrada="1"':''} data-cli="${sf.dataset.cli}" data-acc="${sf.dataset.acc}">Confirmar ${cerr?'reactivación':sf.dataset.acc.toLowerCase()}</button> <button class="btn chico sec" data-fcancel="${sf.dataset.cli}">Cancelar</button>`;
    return;
  }
  const ab=e.target.closest('#altabtn');
  if(ab){
    const pubsCon=[...new Set([...PRECIOS,...LIVE.precios].map(p=>p.pub))].sort();
    $('altabox').innerHTML=`<div class="card"><b>Alta de suscripción</b>
    <label>Publicación</label><input id="apub" list="dl-apubs" placeholder="ej: CLARIN"><datalist id="dl-apubs">${pubsCon.map(p=>`<option>${p}</option>`).join('')}</datalist>
    <label>Días que la recibe</label><div class="dias diasel" id="adias">${DIAS.map((d,i)=>`<div class="dia" data-di="${i}">${d}</div>`).join('')}</div>
    <label>¿Quién cobra?</label><select id="avia"><option value="C">Le cobrás vos (cuenta corriente)</option><option value="S">Vía distribuidora (suscripción)</option></select>
    <div class="grid2"><div><label>Ejemplares por día (casi siempre 1)</label><input id="aqty" type="number" value="1" min="1"></div>
    <div><label>Desde</label><input id="adesde" type="date" value="${hoyISO()}"></div></div>
    <button class="btn" data-altaok data-cli="${ab.dataset.cli}">Guardar alta</button> <button class="btn sec" data-fcancel="${ab.dataset.cli}">Cancelar</button></div>`;
    return;
  }
  const di=e.target.closest('.diasel .dia');
  if(di){di.classList.toggle('on');return;}
  const fcn=e.target.closest('[data-fcancel]');
  if(fcn){ const y=window.scrollY; ficha(parseInt(fcn.dataset.fcancel)); window.scrollTo(0,y); return; }
  const cv=e.target.closest('[data-cvia]');
  if(cv){
    const nueva=cv.dataset.via==='S'?'C':'S';
    const dd=(cv.dataset.dias||'').split(',').filter(x=>x!=='').map(Number);
    const pubH=esc(cv.dataset.pub);
    cv.parentElement.innerHTML=`<label>${pubH}${dd.length?' ('+dd.map(d=>DIAS[d]).join(' ')+')':''}: pasa a <b>${nueva==='S'?'vía distribuidora':'le cobrás vos'}</b> desde</label><input type="date" class="cvfec" value="${hoyISO()}">
    <div class="mini" style="margin:2px 0 6px">${nueva==='C'?'Desde ese día el diario se le cobra en su cuenta corriente (precio de tapa).':'Desde ese día lo cobra la distribuidora y a vos te queda la comisión.'} La suscripción anterior se cierra el día anterior, sola.</div>
    <button class="btn chico" data-cvok data-pub="${pubH}" data-dias="${cv.dataset.dias||''}" data-via="${nueva}" data-qty="${cv.dataset.qty||1}" data-cli="${cv.dataset.cli}">Confirmar cambio</button> <button class="btn chico sec" data-fcancel="${cv.dataset.cli}">Cancelar</button>`;
    return;
  }
  const cvo=e.target.closest('[data-cvok]');
  if(cvo){
    const cli=parseInt(cvo.dataset.cli), desde=cvo.parentElement.querySelector('.cvfec').value; if(!desde){toast('Poné la fecha');return;}
    const dias=(cvo.dataset.dias||'').split(',').filter(x=>x!=='').map(Number);
    if(!dias.length){toast('Esta suscripción no tiene días fijos: dala de baja y cargá un alta nueva');return;}
    const r={id:nid(),ts:new Date().toISOString(),cli,tipo:'Alta',pub:cvo.dataset.pub,desde,hasta:'',dias,via:cvo.dataset.via,qty:parseInt(cvo.dataset.qty)||1,nota:'cambio de modalidad: '+(cvo.dataset.via==='S'?'le cobrás vos → vía distribuidora':'vía distribuidora → le cobrás vos')};
    // las suspensiones que siguen vigentes pasan a la suscripción nueva (si no, el cambio reactivaba días suspendidos)
    const sigue=suspensionesQueSiguen(cli,cvo.dataset.pub,dias,desde).map(n=>({id:nid(),ts:r.ts,cli,tipo:n.tipo,pub:unesc(n.pub||''),desde,hasta:n.hasta||'',dias:n.dias,nota:'sigue desde el '+fecha(n.desde)+' (cambio de modalidad)'}));
    guardar('novedades',[...LIVE.novedades,r,...sigue]).then(()=>{toast('Modalidad cambiada ✓ (la anterior quedó cerrada)');ficha(cli);}).catch(err=>toast('Error: '+(err&&err.message)));
    return;
  }
  const ao=e.target.closest('[data-altaok]');
  if(ao){
    const pub=($('apub').value||'').trim().toUpperCase();
    const dias=[...document.querySelectorAll('#adias .dia.on')].map(x=>parseInt(x.dataset.di));
    if(!pub){toast('Poné la publicación');return;}
    if(!dias.length){toast('Marcá al menos un día');return;}
    const cli=parseInt(ao.dataset.cli);
    const desde=$('adesde').value; if(!desde){toast('Poné desde cuándo recibe');return;}
    const c=C.find(x=>x.id===cli);
    // Bloqueo: si ya recibe esa publicación alguno de esos días (y no está suspendida/dada de baja a esa fecha), no se puede dar de alta otra vez.
    const choque=[]; if(c) c.subs.filter(x=>x[3]==='V'&&norm(x[0])===norm(pub)).forEach(x=>{const dd=FD(x[1])||[]; const com=dd.length?dd.filter(d=>dias.includes(d)):dias; if(!com.length)return; if(suspendida(cli,x[0],desde,com,altaDe(x)))return; choque.push({via:x[2],dias:com});});
    const avisoEl=$('altaaviso'); if(avisoEl) avisoEl.remove();
    if(choque.length){
      const ds=[...new Set(choque.flatMap(x=>x.dias))].sort().map(d=>DIAS[d]).join(' ');
      const via=[...new Set(choque.map(x=>x.via==='S'?'vía distribuidora':'le cobrás vos'))].join(' / ');
      ao.insertAdjacentHTML('beforebegin',`<div class="aviso" id="altaaviso" style="background:var(--rojosuave);color:var(--rojo)">⚠ Este cliente <b>ya está suscripto a ${esc(pub)}</b> los días ${ds} (${via}). No se puede dar de alta dos veces: primero dale de baja o suspendela arriba, o usá el botón "Pasar a…" si lo que querés es cambiar quién la cobra.</div>`);
      toast('Ya está suscripto a '+pub+' esos días');
      return;
    }
    const r={id:nid(),ts:new Date().toISOString(),cli,tipo:'Alta',pub,desde,hasta:'',dias,via:$('avia').value,qty:parseInt($('aqty').value)||1,nota:'alta desde la ficha'};
    guardar('novedades',[...LIVE.novedades,r]).then(()=>{toast('Alta guardada ✓');ficha(cli);}).catch(err=>toast('Error: '+(err&&err.message)));
    return;
  }
  const sok=e.target.closest('[data-sok]');
  if(sok){
    const f=sok.parentElement.querySelector('.sfec').value; if(!f){toast('Poné la fecha');return;}
    const hEl=sok.parentElement.querySelector('.sfhasta'); let hasta='';
    if(hEl&&hEl.value){ const vuelve=hEl.value; if(vuelve<=f){toast('La fecha en que vuelve tiene que ser posterior al inicio de la suspensión');return;} const d=new Date(vuelve+'T12:00:00'); d.setDate(d.getDate()-1); hasta=d.toISOString().slice(0,10); }
    const cli=parseInt(sok.dataset.cli);
    const todas=sok.parentElement.querySelector('.sftodas'); const dd=(todas&&todas.checked)?[]:(sok.dataset.dias||'').split(',').filter(x=>x!=='').map(Number);
    let r;
    if(sok.dataset.cerrada==='1'&&sok.dataset.acc==='Reanudación'){
      const dias=(sok.dataset.dias||'').split(',').filter(x=>x!=='').map(Number);
      if(!dias.length){toast('Esta suscripción no tiene días fijos: usá "+ Alta de suscripción nueva" y marcá los días');return;}
      r={id:nid(),ts:new Date().toISOString(),cli,tipo:'Alta',pub:sok.dataset.pub,desde:f,hasta:'',dias,via:sok.dataset.via||'C',qty:parseInt(sok.dataset.qty)||1,nota:'reactivación desde la ficha'};
    } else r={id:nid(),ts:new Date().toISOString(),cli,tipo:sok.dataset.acc,pub:sok.dataset.pub,desde:f,hasta,dias:dd.length?dd:null,nota:'desde la ficha'};
    guardar('novedades',[...LIVE.novedades,r]).then(()=>{SCACHE={};toast((r.tipo==='Alta'?'Reactivación':sok.dataset.acc)+' guardada ✓');ficha(cli);}).catch(err=>toast('Error: '+(err&&err.message)));
    return;
  }
  const lq=e.target.closest('.liqrow');
  if(lq){
    const dg=document.querySelector('.desglose[data-dg="'+lq.dataset.dlq+'_'+lq.dataset.dlc+'"]');
    if(dg){ if(dg.hidden){dg.innerHTML=desglose(parseInt(lq.dataset.dlc),lq.dataset.dlq);dg.hidden=false;} else dg.hidden=true; }
    return;
  }
  const fprod=e.target.closest('.fila[data-prod]');
  if(fprod&&!e.target.closest('[id^=pdet-]')){abrirProd(parseInt(fprod.dataset.prod));return;}
  const fila=e.target.closest('.fila[data-cli]');
  if(fila){ if(SELMODE) toggleSel(parseInt(fila.dataset.cli)); else ficha(parseInt(fila.dataset.cli)); return;}
  const id=e.target.closest('button')&&e.target.closest('button').id;
  const b=e.target.closest('button');
  switch(id){
    case 'bmas': MOSTR+=30;pintarLista();break;
    case 'qcobrar': ver('clientes');PINTAR.clientes();setTimeout(()=>$('bq')&&$('bq').focus(),50);break;
    case 'qcaja': ver('caja');pintarCaja();break;
    case 'qusuarios': ver('usuarios');pintarUsuarios();break;
    case 'dmas': masDist();break;
    case 'uvolver': ver('inicio');pintarInicio();break;
    case 'uok': crearUsuario();break;
    case 'uperm': abrirPermisos(b.dataset.uid);break;
    case 'upermok': guardarPermisos(b.dataset.uid);break;
    case 'uclave': cambiarClave(b.dataset.uid,b.dataset.email);break;
    case 'ubloq': bloquearUsuario(b.dataset.uid,b.dataset.email,b.dataset.bloq==='1');break;
    case 'uborrar': borrarUsuario(b.dataset.uid,b.dataset.email);break;
    case 'fvolver': ver('clientes');buscar();break;
    case 'fmas': {const y=window.scrollY;ficha(parseInt(b.dataset.cli),true);window.scrollTo(0,y);break;}
    case 'fbc': formCobro(parseInt(b.dataset.cli));break;
    case 'freact': reactivarCliente(parseInt(b.dataset.cli));break;
    case 'rimpall': imprimirHojas(vueltasActivas().map(v=>v.nombre));break;
    case 'rimpmulti': modalImpresionMasiva();break;
    case 'rim-ok': impresionMasivaOK();break;
    case 'rnvok': nuevaVuelta();break;
    case 'v-ok': vender();break;
    case 'c-ok': registrarCompra();break;
    case 'np-ok': nuevoProveedor();break;
    case 'snuevo': PSEL=null;$('sform').innerHTML=formProdHTML();window.scrollTo(0,0);break;
    case 'dnuevobtn': $('dnuevobox').hidden=!$('dnuevobox').hidden;break;
    case 'dnuevook': nuevoDist();break;
    case 'fbl': formLiq(parseInt(b.dataset.cli));break;
    case 'fcor': formCorregir(parseInt(b.dataset.cli));break;
    case 'fedit': formEditarCliente(parseInt(b.dataset.cli));break;
    case 'fedok': editarClienteOK(parseInt(b.dataset.cli));break;
    case 'fnotabtn': formNota(parseInt(b.dataset.cli));break;
    case 'fnotaok': notaOK(parseInt(b.dataset.cli));break;
    case 'fcorok': corregirSaldo(parseInt(b.dataset.cli));break;
    case 'fres': imprimirResumenes([parseInt(b.dataset.cli)]);break;
    case 'bimp': {const ids=RES.filter(x=>saldoDe(x.c,cierreISO())>0.5).map(x=>x.c.id); if(!ids.length){toast('Nadie con saldo deudor al '+fecha(cierreISO()));break;} imprimirResumenes(ids);break;}
    case 'bsel': SELMODE=true;SELCLI.clear();buscar();break;
    case 'bselno': SELMODE=false;SELCLI.clear();buscar();break;
    case 'bseltodos': RES.forEach(x=>SELCLI.add(x.c.id));buscar();break;
    case 'bimpsel': {const ids=[...SELCLI]; if(!ids.length){toast('Marcá al menos un cliente');break;} imprimirResumenes(ids);break;}
    case 'emok': guardarEmisor();break;
    case 'fok': addMov(parseInt(b.dataset.cli),b.dataset.tipo);break;
    case 'cok': addCaja();break;
    case 'tok': transferirCaja();break;
    case 'pok': addPrecio();break;
    case 'nok': addNov();break;
    case 'dok': addDist();break;
    case 'dcomok': guardarComision();break;
    case 'feok': addFeriado();break;
    case 'dvok': addDevol();break;
  }
});
document.addEventListener('input',function(e){
  NEV++;
  switch(e.target.id){
    case 'bq': buscar();break;
    case 'fct': case 'fcli': if(window.pintaC){CLIM=50;pintaC();}break;
    case 'fch2': if(window.pintaH)pintaH();break;
    case 'pfil': {const q=norm(e.target.value);document.querySelectorAll('#plist .card').forEach(c=>{c.hidden=q&&!norm(c.textContent).includes(q);});break;}
    case 'nft': if(window.pintaN)pintaN();break;
    case 'dfil': if(window.pintaDH)pintaDH();break;
  }
});
document.addEventListener('change',function(e){
  if(['fcc','fcm','fcv','fcd','fch','fcdup'].includes(e.target.id)){if(window.pintaC){CLIM=50;pintaC();}}
  if(e.target.id==='nfil'){if(window.pintaN)pintaN();}
  if(e.target.dataset&&e.target.dataset.pubdist){asignarPubDist(e.target.dataset.pubdist,parseInt(e.target.value));}

});


async function iniciarApp(){
  try{
    await boot();
    if(!C.length)return;
    (function(){
      const hs=(location.hash||'').slice(1);
      if(!hs)return;
      const mf=hs.match(/^ficha-(\d+)$/);
      if(mf){ficha(parseInt(mf[1]));return;}
      if(hs==='usuarios'){if(esAdmin()){ver('usuarios');pintarUsuarios();}return;}
      if(VISTAS.includes(hs)&&hs!=='ficha'){const vv=ver(hs);const p=PINTAR[vv];if(p&&vv!=='inicio')p();}
    })();
    aplicarPermisos();
    const hdrEl=document.getElementById('hbtns');
    if(hdrEl&&!document.getElementById('lsalir')){
      if(esAdmin()){const x=document.createElement('button');x.id='qexport';x.className='btn chico sec';x.textContent='Backup';x.title='Descargar una copia de todos los datos';x.onclick=exportarTodo;hdrEl.appendChild(x);const u=document.createElement('button');u.id='qusuarios';u.className='btn chico sec';u.textContent='Usuarios';hdrEl.appendChild(u);}
      const b=document.createElement('button');b.id='lsalir';b.className='btn chico sec';b.textContent='Salir';hdrEl.appendChild(b);
      if(PERFIL&&PERFIL.rol){const e=$('estado-db');e.textContent='☁ guardado · '+nombreRol(PERFIL).toLowerCase();e.title=USUARIO.email||'';}
      const su=$('sb-user');if(su){su.textContent=nombreUsuario()+' · '+nombreRol(PERFIL).toLowerCase()+' · '+$('lat').textContent;su.title=USUARIO.email||'';}
    }
    ubicarBotones();
  }catch(e){$('cargando').innerHTML='Error: '+(e.message||e);}
}
function ubicarBotones(){
  const esc=window.matchMedia('(min-width:900px)').matches;
  const h=$('hbtns'), dest=esc?$('sb-foot'):$('massheet');
  if(h&&dest&&h.parentElement!==dest)dest.appendChild(h);
}
try{window.matchMedia('(min-width:900px)').addEventListener('change',ubicarBotones);}catch(_){}
/* ------- Doble toque (v83) -------
   Las acciones que guardan quedan bloqueadas mientras se están guardando: un segundo toque no carga dos veces
   (pasaba con Caja, Corregir saldo, Vender, Compras, Repartir revista, Distribuidores, Precios, Resumen...). */
let ULT_BTN=null; document.addEventListener('click',e=>{ULT_BTN=e.target.closest&&e.target.closest('button');},true);
function bloq(fn){ let ocupado=false; return async function(...a){ if(ocupado){ toast('Guardando…'); return; } ocupado=true; const b=ULT_BTN; if(b) b.disabled=true; try{ return await fn.apply(this,a); } finally{ ocupado=false; if(b) b.disabled=false; } }; }
['addCaja','transferirCaja','borrarCaja','editarClienteOK','notaOK','borrarNota','corregirSaldo','borrarMov','nuevoDist','addFeriado','borrarFeriado','addDevol','borrarDevol','guardarComision','addDist','borrarDist','addNov','reactivarCliente','borrarNov','addPrecio','asignarVuelta','quitarDeVuelta','nuevaVuelta','imprimirResumenes','guardarEmisor','repartirUltimo','anularEntrega','guardarProd','bajaProd','ajustarStock','vender','anularVenta','registrarCompra','anularIngreso','anularPagoProv','nuevoProveedor','guardarPermisos','crearUsuario','cambiarClave','bloquearUsuario','borrarUsuario']
  .forEach(n=>{ if(typeof window[n]==='function') window[n]=bloq(window[n]); });
gate();
