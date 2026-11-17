export function mountStudioLayout(){
 const left=document.querySelector('.left-panel'),right=document.querySelector('.right-panel');
 function tabs(host,items,label){
  const nav=document.createElement('nav');nav.className='studio-tabs';nav.setAttribute('aria-label',label);nav.setAttribute('role','tablist');
  const panels=items.map(([id,title,subtitle])=>{const section=document.createElement('section');section.id='studio-'+id;section.className='studio-tab-panel';section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','tab-'+id);const h=document.createElement('div');h.className='workspace-heading';const small=document.createElement('small'),heading=document.createElement('h2'),description=document.createElement('p');small.textContent=label;heading.textContent=title;description.textContent=subtitle;h.append(small,heading,description);section.append(h);host.append(section);return section;});
  const buttons=items.map(([id,title],i)=>{const b=document.createElement('button');b.id='tab-'+id;b.type='button';b.textContent=title;b.setAttribute('role','tab');b.setAttribute('aria-controls',panels[i].id);b.onclick=()=>select(i);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;select(next);buttons[next].focus();};nav.append(b);return b;});
  function select(index){buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});host.scrollTop=0;}
  host.prepend(nav);select(0);return panels;
 }
 const leftNodes=[...left.children],rightNodes=[...right.children];
 const [live,scene,music]=tabs(left,[['broadcast','Emisión','Conectá tu canal y revisá la recepción antes de salir al aire.'],['scene','Escenario','Cámara, calidad visual y apariciones del fondo.'],['music','Música','Elegí si repetir la lista y dónde escuchar tus canciones.']],'CONTROLES');
 for(const node of leftNodes)live.append(node);
 for(const node of [live.querySelector(':scope > .settings'),live.querySelector('.movement-settings'),live.querySelector('#ambient-tests')])if(node)scene.append(node);
 const musicPanel=live.querySelector('#music-panel');if(musicPanel)music.append(musicPanel);
 const [direct,cast,dances,interaction]=tabs(right,[['direct','Directo','Meta, participantes y Top. Sus reinicios son independientes.'],['characters','Skins','Identificá a cada personaje y probá su aspecto.'],['dances','Bailes','Elegí qué bailes corresponden a cada momento.'],['interaction','Interacción','Umbrales de tap taps, seguimiento y compartidas.']],'ESTUDIO');
 for(const node of rightNodes){if(node.matches('.section-rule')){node.hidden=true;direct.append(node);}else if(node.id==='cast')cast.append(node);else if(node.matches('.dance-assignment-panel'))dances.append(node);else if(node.matches('.studio-interactions'))interaction.append(node);else direct.append(node);}
 const meta=document.querySelector('.goal-card');if(meta)direct.insertBefore(meta,direct.children[1]||null);
 document.querySelector('.top-title').textContent='Estudio creativo';document.querySelector('.preview-toolbar>span').textContent='VISTA DE EMISIÓN · 9:16';
 const preview=document.querySelector('.preview-column');const caption=document.createElement('div');caption.className='preview-caption';caption.innerHTML='<span class="live-orb"></span><span>Todo listo para tu próxima entrada</span><b>LIVE DANCE</b>';preview.prepend(caption);
 const reception=document.querySelector('.reception-details');if(reception)reception.open=true;
 const tools=document.querySelector('.connection-tools>small');if(tools)tools.textContent='Nuevo LIVE: contador en cero. Reconectar al mismo LIVE conserva el conteo.';
 const hint=document.createElement('p');hint.className='studio-shortcut';hint.textContent='Las pruebas están dentro de «Pruebas locales». Los regalos reales siempre conservan su prioridad.';live.append(hint);
 const source=document.querySelector('#music-output option[value=panel]');if(source)source.textContent='Este estudio';
}
