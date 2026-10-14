// Map-first navigation, v2.7. Compatible with existing schemaVersion 1.
// Desktop: persistent dock that can be collapsed. Mobile: map-first bottom sheet.
export function createMapController(tour, {panel,toggle,close,floors,stage,image,markers,
  sceneList,navigate,beforeOpen=()=>{},onLayoutChange=()=>{}}) {
  const maps=Array.isArray(tour.maps)?tour.maps:[];
  if (!maps.length) {
    toggle.hidden=true;
    return {update(){},close(){},isOpen(){return false;},destroy(){}};
  }
  const root=document.querySelector('.layout');
  const label=document.getElementById('map-toggle-label');
  const desktop=window.matchMedia('(min-width:900px)');
  let selectedMap=maps[0].id;
  let shownMap='';
  let current='';
  const byId=id=>maps.find(m=>m.id===id);

  function open(value, {focusClose=false,returnFocus=false}={}) {
    if (value) beforeOpen();
    panel.hidden=!value;
    root?.classList.toggle('map-open',value);
    toggle.setAttribute('aria-expanded',String(value));
    toggle.setAttribute('aria-label',value?'エリアマップを閉じる':'エリアマップを表示');
    if (label) label.textContent=value?'マップを閉じる':'マップを表示';
    if (value) { showMap(selectedMap); if(focusClose) close.focus(); }
    else if(returnFocus) toggle.focus();
    onLayoutChange();
  }
  function selectScene(sceneId) {
    navigate(sceneId);
    // A mobile map is a navigation sheet; close it to reveal the selected panorama.
    // On desktop it remains visible for another selection.
    if(!desktop.matches) {
      open(false);
      const heading=document.getElementById('scene-name');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }
  }
  function showMap(id) {
    const map=byId(id);
    if(!map) return;
    selectedMap=id;
    // Keep the same marker elements when only the selected scene changes.
    // This preserves keyboard focus while navigating a desktop map.
    if(shownMap===id) {
      for(const group of [markers,sceneList]){
        for(const b of group?.querySelectorAll('button[data-scene-id]')||[]) {
          const active=b.dataset.sceneId===current;
          b.classList.toggle('selected',active);
          if(active)b.setAttribute('aria-current','location');
          else b.removeAttribute('aria-current');
        }
      }
      return;
    }
    if (shownMap!==id) {
      image.src='./'+map.image;
      image.alt=`${map.name}のエリア図`;
      shownMap=id;
    }
    const scenes=tour.scenes.filter(s=>s.mapId===id&&s.mapPosition);
    const dots=document.createDocumentFragment(), options=document.createDocumentFragment();
    scenes.forEach((scene,i)=>{
      const num=String(i+1), active=scene.id===current;
      const dot=document.createElement('button');
      dot.type='button';dot.className='map-marker';
      dot.style.left=`${scene.mapPosition.x*100}%`;
      dot.style.top=`${scene.mapPosition.y*100}%`;
      dot.textContent=num;
      dot.title=scene.name;
      dot.dataset.sceneId=scene.id;
      dot.setAttribute('aria-label',`${num}：${scene.name}へ移動`);
      if(active) {dot.classList.add('selected');dot.setAttribute('aria-current','location');}
      dot.addEventListener('click',()=>selectScene(scene.id));
      dots.append(dot);
      const choice=document.createElement('button');
      choice.type='button';choice.className='map-scene-choice';
      choice.dataset.sceneId=scene.id;
      const number=document.createElement('span');number.className='map-choice-number';number.textContent=num;
      const name=document.createElement('span');name.className='map-choice-name';name.textContent=scene.name;
      choice.append(number,name);
      if(active){choice.classList.add('selected');choice.setAttribute('aria-current','location');}
      choice.addEventListener('click',()=>selectScene(scene.id));
      options.append(choice);
    });
    markers.replaceChildren(dots);
    sceneList?.replaceChildren(options);
    if (sceneList) {
      const empty=document.getElementById('map-empty');
      if(empty)empty.hidden=scenes.length>0;
    }
    for(const node of floors.querySelectorAll('button')) {
      const active=node.dataset.floor===id;
      node.classList.toggle('active',active);
      node.setAttribute('aria-pressed',String(active));
    }
  }
  const floorFragment=document.createDocumentFragment();
  maps.forEach(m=>{
    const b=document.createElement('button');b.type='button';b.className='floor-button';
    b.textContent=m.name;b.dataset.floor=m.id;
    b.addEventListener('click',()=>showMap(m.id));floorFragment.append(b);
  });
  floors.replaceChildren(floorFragment);
  const onToggle=()=>open(panel.hidden,{focusClose:panel.hidden,returnFocus:!panel.hidden});
  const onClose=()=>open(false,{returnFocus:true});
  toggle.addEventListener('click',onToggle);
  close.addEventListener('click',onClose);
  // Deliberately start with the map visible, but don't steal keyboard focus.
  open(true);
  return {
    update(id){
      current=id;
      const scene=tour.scenes.find(s=>s.id===id);
      if(scene?.mapId&&byId(scene.mapId))selectedMap=scene.mapId;
      if(!panel.hidden)showMap(selectedMap);
    },
    close({returnFocus=false}={}){if(!panel.hidden)open(false,{returnFocus});},
    isOpen(){return !panel.hidden;},
    destroy(){toggle.removeEventListener('click',onToggle);close.removeEventListener('click',onClose);}
  };
}
