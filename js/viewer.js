// Pannellum adapter. Public site only; editor and publisher do not use this module.
// Version 1.5: optional photo / video info hot spots with arbitrary safe text.
function createMediaSpotElement(parent, details) {
  const button=document.createElement('button');
  button.type='button';
  button.className='media-spot-button';
  button.setAttribute('aria-label', `${details.type==='photo'?'写真':'動画'}：${details.text}`);
  const symbol=document.createElement('span');
  symbol.className='media-spot-symbol';
  symbol.setAttribute('aria-hidden','true');
  symbol.textContent=details.type==='photo'?'▣':'▶';
  const label=document.createElement('span');
  label.className='media-spot-label';
  label.textContent=details.text; // Do not use innerHTML for editor-provided text.
  button.append(symbol,label);
  parent.appendChild(button);
}

function createMediaSpots(scene, callbacks) {
  const hotSpots=[];
  (scene.media ?? []).forEach((media, index) => {
    if (!media.hotspot) return; // Older entries stay in the information panel.
    const spot=media.hotspot;
    hotSpots.push({
      type:'info',
      yaw:spot.yaw,
      pitch:spot.pitch,
      cssClass:'media-spot media-spot-'+(media.type==='photo'?'photo':'video'),
      createTooltipFunc:createMediaSpotElement,
      createTooltipArgs:{text:spot.text,type:media.type},
      clickHandlerFunc: (_event, _args) => callbacks.onMediaClick?.(scene.id,index)
    });
  });
  return hotSpots;
}

export function createTourViewer(elementId,tour,requestedScene,callbacks={}) {
  if (typeof window.pannellum?.viewer !== 'function') {
    throw new Error('Pannellum 2.5.7を読み込めませんでした。');
  }
  const scenes={};
  for(const scene of tour.scenes){
    const links=scene.links.map(link=>({
      type:'scene',sceneId:link.to,text:link.label,yaw:link.yaw,pitch:link.pitch,
      targetYaw:link.targetYaw,targetPitch:link.targetPitch,targetHfov:'same'
    }));
    scenes[scene.id]={
      type:'equirectangular',panorama:scene.panorama,
      ...(scene.preview ? {preview:scene.preview}:{}),
      yaw:scene.initialView.yaw,pitch:scene.initialView.pitch,hfov:scene.initialView.hfov,
      ignoreGPanoXMP:true,
      hotSpots:[...links,...createMediaSpots(scene,callbacks)]
    };
  }
  const viewer=window.pannellum.viewer(elementId,{
    default:{
      firstScene:requestedScene,autoLoad:true,escapeHTML:true,
      sceneFadeDuration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:550,
      mouseZoom:'fullscreenonly',showFullscreenCtrl:true,showZoomCtrl:true,
      compass:false,backgroundColor:[0.07,0.10,0.15]
    },scenes
  });
  viewer.on('scenechange',id=>callbacks.onSceneChange?.(id));
  viewer.on('load',()=>callbacks.onLoaded?.(viewer.getScene()));
  viewer.on('error',msg=>callbacks.onError?.(String(msg)));
  return {
    changeScene(id){if(id!==viewer.getScene())viewer.loadScene(id);},
    currentScene(){return viewer.getScene();},
    resize(){viewer.resize();},
    destroy(){viewer.destroy();}
  };
}
