// COHAJ Sistema — v92: todos los menús desplegables (<select>) abren un menú propio con buscador.
// El <select> original queda en su lugar (mismo aspecto, mismo .value, mismo onchange): app.css le saca
// los toques (pointer-events:none con html.busc-on) y este archivo abre el menú al tocar donde está.
// Con MIN_BUSCAR opciones o más aparece el campo "Buscar…" (sin tildes, varias palabras en cualquier orden).
// Para que un <select> siga siendo el nativo: class="nobusc".
(function(){
  const MIN_BUSCAR=7;
  const sinTilde=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const usable=s=>!!s&&s.tagName==='SELECT'&&!s.multiple&&!(s.size>1)&&!s.disabled&&!s.classList.contains('nobusc');
  const telefono=()=>window.innerWidth<600;
  let POP=null; // {sel, el, fondo, inp, lista, items, vis, idx, teclado}

  function etiqueta(sel){ const l=sel.previousElementSibling; if(!l||l.tagName!=='LABEL')return ''; const t=(l.firstChild&&l.firstChild.nodeType===3?l.firstChild.textContent:l.textContent).trim(); return t; }

  function cerrar(volverFoco){ if(!POP)return; const {sel,el,fondo}=POP; POP=null; el.remove(); if(fondo)fondo.remove(); if(volverFoco)try{sel.focus({preventScroll:true});}catch(e){} }

  function elegir(k){
    if(!POP)return; const it=POP.vis[k]; if(!it||it.o.disabled)return;
    const sel=POP.sel, cambio=sel.selectedIndex!==it.i, buscado=POP.inp?POP.inp.value.trim():'';
    sel.selectedIndex=it.i; cerrar(POP.teclado);
    // si eligió "＋ Nuevo…" después de buscar, lo buscado pasa al campo del nombre nuevo (ej. c-prod-nombre)
    const nom=it.o.value==='nuevo'&&buscado&&sel.id?document.getElementById(sel.id+'-nombre'):null;
    if(nom&&!nom.value)nom.value=buscado;
    if(cambio){ sel.dispatchEvent(new Event('input',{bubbles:true})); sel.dispatchEvent(new Event('change',{bubbles:true})); }
  }

  function marcar(){ if(!POP)return; POP.lista.querySelectorAll('.bopt').forEach(d=>d.classList.toggle('on',+d.dataset.k===POP.idx)); const on=POP.lista.querySelector('.bopt.on'); if(on)on.scrollIntoView({block:'nearest'}); }
  function mover(d){ if(!POP||!POP.vis.length)return; let k=POP.idx; for(let n=0;n<POP.vis.length;n++){ k=Math.min(POP.vis.length-1,Math.max(0,k+d)); if(!POP.vis[k].o.disabled)break; } POP.idx=k; marcar(); }

  function pintar(inicial){
    const q=POP.inp?sinTilde(POP.inp.value).split(/\s+/).filter(Boolean):[];
    // buscando, se esconde el "Elegí…" (opción vacía) para que Enter tome el primer resultado real
    // "＋ Nuevo producto/proveedor…" (value="nuevo") queda siempre a mano aunque no coincida con lo buscado
    POP.vis=q.length?POP.items.filter(it=>it.o.value==='nuevo'||(it.o.value!==''&&q.every(w=>it.t.includes(w)))):POP.items;
    if(inicial&&!q.length) POP.idx=Math.max(0,POP.vis.findIndex(it=>it.i===POP.sel.selectedIndex));
    else { POP.idx=POP.vis.findIndex(it=>!it.o.disabled&&it.o.value!=='nuevo'); if(POP.idx<0)POP.idx=POP.vis.findIndex(it=>!it.o.disabled); }
    POP.lista.innerHTML=POP.vis.length?POP.vis.map((it,k)=>`<div class="bopt${it.i===POP.sel.selectedIndex?' elegida':''}${it.o.disabled?' off':''}" data-k="${k}" role="option">${esc(it.o.textContent)}</div>`).join('')
      :'<div class="bvacio">Sin resultados</div>';
    marcar();
  }

  function ubicar(){
    if(!POP)return; const el=POP.el;
    if(!document.contains(POP.sel)){cerrar();return;}
    if(telefono()){ const vv=window.visualViewport; const top=(vv?vv.offsetTop:0)+12, alto=(vv?vv.height:window.innerHeight)-24;
      el.classList.add('hoja'); el.style.top=top+'px'; el.style.maxHeight=Math.min(alto,560)+'px'; return; }
    const r=POP.sel.getBoundingClientRect(), vh=window.innerHeight, abajo=vh-r.bottom-10, arriba=r.top-10;
    const w=Math.min(Math.max(r.width,280),window.innerWidth-16), left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));
    el.style.left=left+'px'; el.style.width=w+'px';
    if(abajo>=240||abajo>=arriba){ el.style.top=(r.bottom+4)+'px'; el.style.bottom=''; el.style.maxHeight=Math.min(400,abajo)+'px'; }
    else { el.style.bottom=(vh-r.top+4)+'px'; el.style.top=''; el.style.maxHeight=Math.min(400,arriba)+'px'; }
  }

  function abrir(sel,teclado,letra){
    cerrar();
    const items=[...sel.options].map((o,i)=>({o,i,t:sinTilde(o.textContent)})).filter(it=>!it.o.hidden);
    const conBusc=items.length>=MIN_BUSCAR, tel=telefono();
    let fondo=null; if(tel){ fondo=document.createElement('div'); fondo.className='bfondo'; fondo.addEventListener('click',()=>cerrar()); document.body.appendChild(fondo); }
    const el=document.createElement('div'); el.className='bpop'; el.tabIndex=-1; el.setAttribute('role','listbox');
    const lab=tel?etiqueta(sel):'';
    el.innerHTML=(lab?`<div class="btit">${esc(lab)}</div>`:'')+(conBusc?'<input class="bq" type="search" placeholder="Buscar…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">':'')+'<div class="blista"></div>';
    document.body.appendChild(el);
    POP={sel,el,fondo,inp:el.querySelector('.bq'),lista:el.querySelector('.blista'),items,vis:[],idx:-1,teclado};
    if(POP.inp&&letra)POP.inp.value=letra;
    pintar(!letra); ubicar();
    if(POP.inp){ POP.inp.addEventListener('input',()=>pintar(false)); POP.inp.focus({preventScroll:true}); } else el.focus({preventScroll:true});
    // tocar/cliquear una opción no le saca el foco al buscador (en el teléfono no se cierra el teclado antes de tiempo)
    el.addEventListener('mousedown',e=>{ if(e.target!==POP?.inp)e.preventDefault(); });
    POP.lista.addEventListener('mousemove',e=>{ const d=e.target.closest('.bopt'); if(d&&POP&&+d.dataset.k!==POP.idx){POP.idx=+d.dataset.k;marcar();} });
    POP.lista.addEventListener('click',e=>{ const d=e.target.closest('.bopt'); if(d)elegir(+d.dataset.k); });
  }

  // qué <select> quedó debajo del toque (y que no esté tapado por otra cosa, ej. sugerencias o un cartel)
  function bajo(x,y){
    const hit=document.elementFromPoint(x,y); if(!hit)return null;
    for(const s of document.querySelectorAll('select')){
      if(!usable(s))continue; const r=s.getBoundingClientRect();
      if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&hit.contains(s))return s;
    }
    return null;
  }

  document.addEventListener('click',e=>{
    if(POP&&POP.el.contains(e.target))return;
    if(!e.clientX&&!e.clientY){ if(POP)cerrar(); return; } // click por teclado o por código
    const sel=bajo(e.clientX,e.clientY);
    if(POP){ const mismo=sel===POP.sel; cerrar(); if(mismo){e.preventDefault();return;} }
    if(sel){ e.preventDefault(); e.stopPropagation(); abrir(sel,false); }
  },true);

  document.addEventListener('keydown',e=>{
    if(POP){ const k=e.key;
      if(k==='ArrowDown'||k==='ArrowUp'){ e.preventDefault(); mover(k==='ArrowDown'?1:-1); }
      else if(k==='Enter'){ e.preventDefault(); elegir(POP.idx); }
      else if(k==='Escape'){ e.preventDefault(); e.stopPropagation(); cerrar(true); }
      else if(k==='Tab'){ cerrar(false); }
      return;
    }
    const s=e.target; if(!usable(s)||e.metaKey||e.ctrlKey)return;
    const k=e.key;
    if(k==='Enter'||k===' '||k==='ArrowDown'||k==='ArrowUp'||k==='F4'){ e.preventDefault(); abrir(s,true); }
    else if(k.length===1&&!e.altKey){ e.preventDefault(); abrir(s,true,k); }
  },true);

  window.addEventListener('scroll',e=>{ if(POP&&!telefono()&&!POP.el.contains(e.target))cerrar(); },true);
  window.addEventListener('resize',()=>{ if(POP)ubicar(); });
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>{ if(POP)ubicar(); });

  document.documentElement.classList.add('busc-on');
  window.cerrarBuscador=cerrar;
})();
