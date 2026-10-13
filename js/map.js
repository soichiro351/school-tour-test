// Optional map panel. Map markers use relative coordinates over the image itself.
export function createMapController(tour, {panel,toggle,close,floors,stage,image,markers,navigate,beforeOpen=()=>{}}) {
  const maps=Array.isArray(tour.maps)?tour.maps:[];
  if(!maps.length){toggle.hidden=true;return {update(){},destroy(){}};}
  let selectedMap=maps[0].id;
  let current='';
  const byId=id=>maps.find(m=>m.id===id);
  function open(value) {
    panel.hidden=!value;
    toggle.setAttribute('aria-expanded',String(value));
    if(value){beforeOpen();showMap(selectedMap);close.focus();}else toggle.focus();
  }
  function showMap(id) {
    const map=byId(id);if(!map)return;
    selectedMap=id; image.src='./'+map.image;image.alt=`${map.name}のエリア図`;
    const fragment=document.createDocumentFragment();
    for(const scene of tour.scenes.filter(s=>s.mapId===id && s.mapPosition)) {
      const b=document.createElement('button');b.type='button';b.className='map-marker';
      b.style.left=`${scene.mapPosition.x*100}%`;b.style.top=`${scene.mapPosition.y*100}%`;
      b.textContent=scene.name; b.title=scene.name;
      b.setAttribute('aria-label',`${scene.name}へ移動`);
      if(scene.id===current){b.classList.add('selected');b.setAttribute('aria-current','location');}
      b.addEventListener('click',()=>{navigate(scene.id);open(false);}); fragment.append(b);
    }
    markers.replaceChildren(fragment);
    for(const node of floors.querySelectorAll('button')){
      const active=node.dataset.floor===id;
      node.classList.toggle('active',active);node.setAttribute('aria-pressed',String(active));
    }
  }
  const floorFragment=document.createDocumentFragment();
  maps.forEach(m=>{
    const b=document.createElement('button');b.type='button';b.className='floor-button';
    b.textContent=m.name;b.dataset.floor=m.id;b.addEventListener('click',()=>showMap(m.id));floorFragment.append(b);
  });
  floors.replaceChildren(floorFragment);
  const onToggle=()=>open(panel.hidden),onClose=()=>open(false);
  toggle.addEventListener('click',onToggle);close.addEventListener('click',onClose);
  showMap(selectedMap);
  return {
    update(id){current=id;const scene=tour.scenes.find(s=>s.id===id);
      if(scene?.mapId) selectedMap=scene.mapId;
      if(!panel.hidden) showMap(selectedMap);},
    close(){if(!panel.hidden)open(false);},
    isOpen(){return !panel.hidden;},
    destroy(){toggle.removeEventListener('click',onToggle);close.removeEventListener('click',onClose);}
  };
}
