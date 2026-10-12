import {validateTour,safeExternalUrl} from './schema.js';
import {createTourViewer} from './viewer.js';
import {createMapController} from './map.js';
const $=id=>document.getElementById(id);
const el={panel:$('scene-panel'),menu:$('menu-toggle'),close:$('close-panel'),list:$('scene-list'),
 title:$('scene-name'),caption:$('scene-caption'),description:$('scene-description'),links:$('scene-links'),
 status:$('loading-status'),error:$('error-banner'),errorText:$('error-text'),media:$('scene-media'),
 retry:$('retry-button'),intro:$('intro-message')};
let tour,viewer,map;
function setStatus(msg,busy=false){el.status.textContent=msg;el.status.hidden=!msg;el.status.setAttribute('aria-busy',String(busy));}
function showError(msg){el.error.hidden=false;el.errorText.textContent=msg;setStatus('');}
function panel(open){el.panel.hidden=!open;el.menu.setAttribute('aria-expanded',String(open));
 if(open){map?.close();el.close.focus();}else el.menu.focus();}
function action(label,cb,cls){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.addEventListener('click',cb);return b;}
function list(){const f=document.createDocumentFragment();tour.scenes.forEach(s=>{
 const b=action(s.name,()=>change(s.id,true),'scene-choice');b.dataset.sceneId=s.id;f.append(b);
});el.list.replaceChildren(f);}
function renderMedia(s){const f=document.createDocumentFragment();for(const m of s.media??[]){
 if(m.type==='photo'){const img=document.createElement('img');img.src='./'+m.src;img.alt=m.label;img.loading='lazy';f.append(img);}
 if(m.type==='video-link' && safeExternalUrl(m.url)){const a=document.createElement('a');a.href=m.url;a.textContent=`動画を見る：${m.label}`;a.target='_blank';a.rel='noopener noreferrer';f.append(a);}
}const has=f.childNodes.length>0;el.media.replaceChildren(f);el.media.hidden=!has;}
function updateScene(id){const s=tour.scenes.find(s=>s.id===id);if(!s)return;
 el.title.textContent=s.name;el.caption.textContent=`${tour.scenes.findIndex(v=>v.id===id)+1} / ${tour.scenes.length} 地点`;
 el.description.textContent=s.description;
 const f=document.createDocumentFragment();for(const l of s.links){const target=tour.scenes.find(t=>t.id===l.to);if(target)f.append(action(`→ ${target.name}`,()=>change(l.to,false),'quick-link'));}
 el.links.replaceChildren(f);
 for(const b of el.list.querySelectorAll('button')){const on=b.dataset.sceneId===id;b.classList.toggle('active',on);on?b.setAttribute('aria-current','location'):b.removeAttribute('aria-current');}
 renderMedia(s);map?.update(id);
 const u=new URL(location.href);u.searchParams.set('scene',id);history.replaceState(null,'',u);
 setStatus('360°画像を読み込んでいます…',true);
}
function change(id,closePanel=false){if(!tour.scenes.some(s=>s.id===id))return;if(closePanel&&!el.panel.hidden)panel(false);viewer?.changeScene(id);}
async function start(){
 el.menu.addEventListener('click',()=>panel(el.panel.hidden));el.close.addEventListener('click',()=>panel(false));
 el.retry.addEventListener('click',()=>location.reload());
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!el.panel.hidden)panel(false);else map?.close();}});
 try{
  const response=await fetch('./data/tour.json',{cache:'no-cache'});if(!response.ok)throw new Error('設定JSON取得失敗（HTTP '+response.status+'）');
  tour=await response.json();const result=validateTour(tour);if(!result.ok)throw new Error('JSONが不正です：'+result.errors.slice(0,4).join(' / '));
  const requested=new URLSearchParams(location.search).get('scene');const first=tour.scenes.some(s=>s.id===requested)?requested:tour.startSceneId;
  list();map=createMapController(tour,{
    panel:$('map-panel'),toggle:$('map-toggle'),close:$('close-map'),floors:$('map-floors'),
    stage:$('map-stage'),image:$('map-image'),markers:$('map-markers'),navigate:id=>change(id,false),
    beforeOpen:()=>{if(!el.panel.hidden)panel(false);}
  });
  updateScene(first);
  viewer=createTourViewer('panorama',tour,first,{
    onSceneChange:id=>updateScene(id),
    onLoaded:()=>{setStatus('');el.intro.hidden=true;},
    onError:()=>showError('360°画像の読み込みに失敗しました。通信状態や画像ファイルを確認してください。')
  });
 }catch(err){showError(err.message||'起動に失敗しました。');el.intro.hidden=true;}
}
start();
