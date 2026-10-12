import {validateTour, safeExternalUrl} from './schema.js';
import {createTourViewer} from './viewer.js';

const $ = id => document.getElementById(id);
const els = {
  panel:$('scene-panel'), menu:$('menu-toggle'), close:$('close-panel'), list:$('scene-list'),
  title:$('scene-name'), label:$('scene-caption'), description:$('scene-description'),
  links:$('scene-links'), status:$('loading-status'), error:$('error-banner'), errorText:$('error-text'),
  media:$('scene-media'), retry:$('retry-button'), intro:$('intro-message')
};
let tour, viewer, currentId;

function setStatus(message, busy) {
  els.status.textContent = message;
  els.status.hidden = !message;
  els.status.setAttribute('aria-busy', String(busy));
}
function showError(message) {
  els.error.hidden = false;
  els.errorText.textContent = message;
  setStatus('', false);
}
function togglePanel(open) {
  els.panel.hidden = !open;
  els.menu.setAttribute('aria-expanded', String(open));
  if (open) els.close.focus(); else els.menu.focus();
}
function button(text, handler, extraClass='') {
  const el = document.createElement('button');
  el.type='button'; el.className=extraClass; el.textContent=text;
  el.addEventListener('click',handler);
  return el;
}
function renderList() {
  const fragment=document.createDocumentFragment();
  for (const scene of tour.scenes) {
    const item=button(scene.name,()=>selectScene(scene.id, true),'scene-choice');
    item.dataset.sceneId=scene.id;
    fragment.append(item);
  }
  els.list.replaceChildren(fragment);
}
function addMedia(scene) {
  const fragment = document.createDocumentFragment();
  for (const item of scene.media ?? []) {
    if (item.type === 'photo') {
      const image = document.createElement('img');
      image.src=item.src; image.alt=item.label; image.loading='lazy'; image.decoding='async';
      fragment.append(image);
    } else if (item.type === 'video-link' && safeExternalUrl(item.url)) {
      const a=document.createElement('a');
      a.href=item.url; a.textContent=`動画を見る：${item.label}`;
      a.target='_blank'; a.rel='noopener noreferrer';
      fragment.append(a);
    }
  }
  const hasMedia = fragment.childNodes.length > 0;
  els.media.replaceChildren(fragment);
  els.media.hidden = !hasMedia;
}
function updateScene(id) {
  const scene=tour.scenes.find(s=>s.id===id);
  if (!scene) return;
  currentId=id;
  els.title.textContent=scene.name;
  els.label.textContent=`試作データ ・ ${tour.scenes.findIndex(s=>s.id===id)+1} / ${tour.scenes.length}`;
  els.description.textContent=scene.description;
  const quickLinks=document.createDocumentFragment();
  for (const link of scene.links) {
    const destination=tour.scenes.find(s=>s.id===link.to);
    quickLinks.append(button(`→ ${destination.name}`,()=>selectScene(link.to), 'quick-link'));
  }
  els.links.replaceChildren(quickLinks);
  for (const node of els.list.querySelectorAll('button')) {
    const active=node.dataset.sceneId===id;
    node.classList.toggle('active',active);
    if (active) node.setAttribute('aria-current','location');
    else node.removeAttribute('aria-current');
  }
  addMedia(scene);
  const url = new URL(window.location.href);
  url.searchParams.set('scene',id);
  window.history.replaceState(null,'',url);
  setStatus('360°画像を読み込んでいます…',true);
}
function selectScene(id, close=false) {
  if (!tour.scenes.some(s=>s.id===id)) return;
  if (close && !els.panel.hidden) togglePanel(false);
  viewer.changeScene(id);
}
async function start() {
  els.menu.addEventListener('click',()=>togglePanel(els.panel.hidden));
  els.close.addEventListener('click',()=>togglePanel(false));
  els.retry.addEventListener('click',()=>window.location.reload());
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !els.panel.hidden) togglePanel(false);});
  try {
    const response=await fetch('./data/tour.json',{cache:'no-cache'});
    if (!response.ok) throw new Error(`設定JSONを取得できません（HTTP ${response.status}）。`);
    tour=await response.json();
    const validation=validateTour(tour);
    if (!validation.ok) throw new Error(`設定ファイルが不正です：${validation.errors.slice(0,4).join(' / ')}`);
    const queryId=new URLSearchParams(window.location.search).get('scene');
    const startId=tour.scenes.some(s=>s.id===queryId) ? queryId : tour.startSceneId;
    renderList();
    // Update immediately too: Pannellum only emits scenechange after a later switch.
    updateScene(startId);
    viewer=createTourViewer('panorama',tour,startId,{
      onSceneChange: id => updateScene(id),
      onLoaded: () => { setStatus('',false); els.intro.hidden=true; },
      onError: () => showError('360°画像の読み込みに失敗しました。画像ファイルの存在・形式・通信状態を確認してください。')
    });
  } catch(e) {
    showError(e instanceof Error ? e.message : '起動に失敗しました。');
    els.intro.hidden=true;
  }
}
start();
