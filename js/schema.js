// School Tour schema v1: browser / Node shared validator (no DOM, no network).
const ID = /^[a-z][a-z0-9-]{1,39}$/;
const SAFE_ASSET = /^assets\/(?:panoramas|previews|photos|maps)\/[A-Za-z0-9_/-]+\.(?:jpg|jpeg|png)$/i;
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (x, a, b) => typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b;
const named = (x, max=80) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
export const assetPath = x => typeof x === 'string' && x.length <= 250 && SAFE_ASSET.test(x) &&
  !x.includes('..') && !x.includes('//') && !/[\\%?#:&]/.test(x);
export function safeExternalUrl(x) {
  if (typeof x !== 'string' || x.length > 2048) return false;
  try {const u=new URL(x); return u.protocol==='https:' && !!u.hostname && !u.username && !u.password;}
  catch{return false;}
}
export function validateTour(tour) {
  const errors=[];
  if (!obj(tour)) return {ok:false,errors:['ルートはJSONオブジェクトにしてください。']};
  if (tour.schemaVersion !== 1) errors.push('schemaVersion は 1 が必要です。');
  if (!Array.isArray(tour.scenes) || tour.scenes.length < 1 || tour.scenes.length > 49) {
    errors.push('scenes は1～49件にしてください。');return {ok:false,errors};
  }
  const ids=new Set();
  for (const [i,s] of tour.scenes.entries()) {
    const loc=`scenes[${i}]`;
    if (!obj(s)) {errors.push(`${loc} はオブジェクトではありません。`);continue;}
    if (!ID.test(s.id ?? '')) errors.push(`${loc}.id は英小文字で始まる2～40文字のIDが必要です。`);
    if (ids.has(s.id)) errors.push(`地点IDが重複しています：${s.id}`);
    ids.add(s.id);
    if (!named(s.name)) errors.push(`${loc}.name が不正です。`);
    if (typeof s.description !== 'string' || s.description.length>1500) errors.push(`${loc}.description が不正です。`);
    for (const [field,folder] of [['panorama','panoramas'],['preview','previews']]) {
      if (field==='preview' && s[field]===undefined) continue;
      if (!assetPath(s[field]) || !s[field].startsWith(`assets/${folder}/`) || !/\.jpe?g$/i.test(s[field])) errors.push(`${loc}.${field} は${folder}内のJPEGにしてください。`);
    }
    if (!obj(s.initialView) || !num(s.initialView.yaw,-180,180) || !num(s.initialView.pitch,-90,90) || !num(s.initialView.hfov,50,120)) errors.push(`${loc}.initialView が不正です。`);
    if (!Array.isArray(s.links) || s.links.length>30) errors.push(`${loc}.links は0～30件にしてください。`);
    else s.links.forEach((l,j)=>{
      if (!obj(l) || !ID.test(l.to??'') || !named(l.label) || !num(l.yaw,-180,180) || !num(l.pitch,-90,90) || !num(l.targetYaw,-180,180) || !num(l.targetPitch,-90,90)) errors.push(`${loc}.links[${j}] が不正です。`);
    });
    if (s.mapId!==undefined && !ID.test(s.mapId)) errors.push(`${loc}.mapId が不正です。`);
    if ((s.mapId!==undefined || s.mapPosition!==undefined) && (!obj(s.mapPosition) || !num(s.mapPosition.x,0,1) || !num(s.mapPosition.y,0,1))) errors.push(`${loc}.mapPosition は0～1のx,yが必要です。`);
    if (s.mapPosition!==undefined && s.mapId===undefined) errors.push(`${loc}.mapId が必要です。`);
    if (s.media!==undefined) {
      if (!Array.isArray(s.media) || s.media.length>20) errors.push(`${loc}.media が不正です。`);
      else s.media.forEach((m,j)=>{
        const validKind = obj(m) && (m.type==='photo' || m.type==='video-link');
        const validSource = validKind && (
          m.type==='photo' ? assetPath(m.src) && m.src.startsWith('assets/photos/') && /\.(?:jpe?g|png)$/i.test(m.src)
          : safeExternalUrl(m.url));
        const validSpot = !obj(m) || m.hotspot===undefined || (
          obj(m.hotspot) && named(m.hotspot.text) &&
          num(m.hotspot.yaw,-180,180) && num(m.hotspot.pitch,-90,90) &&
          (m.hotspot.description===undefined ||
           (m.type==='photo' && typeof m.hotspot.description==='string' && m.hotspot.description.length<=500)));
        if (!validKind || !named(m.label) || !validSource || !validSpot)
          errors.push(`${loc}.media[${j}] が不正です。`);
      });
    }
  }
  if (!ids.has(tour.startSceneId)) errors.push('startSceneId に登録済み地点を指定してください。');
  for (const s of tour.scenes) if (obj(s) && Array.isArray(s.links))
    for (const l of s.links) if(obj(l) && !ids.has(l.to)) errors.push(`未登録の移動先：${s.id} → ${l.to}`);
  if (tour.maps!==undefined) {
    if (!Array.isArray(tour.maps) || tour.maps.length>15) errors.push('maps は0～15件の配列にしてください。');
    else {
      const maps=new Set();
      tour.maps.forEach((m,i)=>{
        if(!obj(m) || !ID.test(m.id??'') || !named(m.name) || !assetPath(m.image) || !m.image.startsWith('assets/maps/')) errors.push(`maps[${i}] が不正です。`);
        else {if(maps.has(m.id)) errors.push(`マップID重複：${m.id}`);maps.add(m.id);}
      });
      for(const s of tour.scenes) if(obj(s) && s.mapId!==undefined && !maps.has(s.mapId)) errors.push(`未登録マップ：${s.id} → ${s.mapId}`);
    }
  } else if (tour.scenes.some(s=>obj(s) && s.mapId!==undefined)) errors.push('maps の定義が必要です。');
  return {ok:errors.length===0,errors};
}
