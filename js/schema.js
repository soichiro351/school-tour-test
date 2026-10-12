// Pure validator for schemaVersion 1. No DOM and no network access.
const ID_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;
const ASSET_PATTERN = /^assets\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function validateTour(input) {
  const errors = [];
  if (!isObject(input)) return {ok:false, errors:['設定ファイルのルートがオブジェクトではありません。']};
  if (input.schemaVersion !== 1) errors.push('schemaVersion は 1 にしてください。');
  if (!Array.isArray(input.scenes) || input.scenes.length < 1 || input.scenes.length > 49) {
    errors.push('scenes は1～49地点の配列である必要があります。');
    return {ok:false, errors};
  }
  const ids = new Set();
  for (const [index, scene] of input.scenes.entries()) {
    const path = `scenes[${index}]`;
    if (!isObject(scene)) { errors.push(`${path} が不正です。`); continue; }
    if (!ID_PATTERN.test(scene.id ?? '')) errors.push(`${path}.id は英小文字で始まる英小文字・数字・ハイフンの2～40文字にしてください。`);
    if (ids.has(scene.id)) errors.push(`${path}.id が重複しています: ${scene.id}`);
    ids.add(scene.id);
    if (!validText(scene.name, 80)) errors.push(`${path}.name が不正です。`);
    if (typeof scene.description !== 'string' || scene.description.length > 1500) errors.push(`${path}.description が不正です。`);
    if (!ASSET_PATTERN.test(scene.panorama ?? '')) errors.push(`${path}.panorama のファイルパスが不正です。`);
    if (scene.preview !== undefined && !ASSET_PATTERN.test(scene.preview)) errors.push(`${path}.preview のファイルパスが不正です。`);
    if (!isObject(scene.initialView) || !inRange(scene.initialView.yaw,-180,180) || !inRange(scene.initialView.pitch,-90,90) || !inRange(scene.initialView.hfov,50,120)) {
      errors.push(`${path}.initialView の値が不正です。`);
    }
    if (!Array.isArray(scene.links) || scene.links.length > 30) { errors.push(`${path}.links が不正です。`); continue; }
    for (const [j, link] of scene.links.entries()) {
      const lpath = `${path}.links[${j}]`;
      if (!isObject(link) || !ID_PATTERN.test(link.to ?? '') || !validText(link.label,80) ||
          !inRange(link.yaw,-180,180) || !inRange(link.pitch,-90,90) ||
          !inRange(link.targetYaw,-180,180) || !inRange(link.targetPitch,-90,90)) {
        errors.push(`${lpath} が不正です。`);
      }
    }
    if (scene.media !== undefined && (!Array.isArray(scene.media) || scene.media.length > 20)) errors.push(`${path}.media が不正です。`);
    if (Array.isArray(scene.media)) {
      for (const [j, item] of scene.media.entries()) {
        if (!isObject(item) || !['photo','video-link'].includes(item.type) || !validText(item.label,80) ||
            (item.type === 'photo' && !ASSET_PATTERN.test(item.src ?? '')) ||
            (item.type === 'video-link' && !safeExternalUrl(item.url))) {
          errors.push(`${path}.media[${j}] が不正です。`);
        }
      }
    }
  }
  if (!ids.has(input.startSceneId)) errors.push('startSceneId に存在しない地点が指定されています。');
  for (const scene of input.scenes) {
    if (isObject(scene) && Array.isArray(scene.links)) for (const link of scene.links) {
      if (isObject(link) && !ids.has(link.to)) errors.push(`地点 ${scene.id} から未登録の地点 ${link.to} にリンクしています。`);
    }
  }
  return {ok:errors.length===0,errors};
}

export function safeExternalUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try { const u = new URL(value); return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password; }
  catch {return false;}
}
