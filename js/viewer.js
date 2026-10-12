// The only module depending on Pannellum. It can be replaced independently.
export function createTourViewer(elementId, tour, requestedScene, callbacks={}) {
  if (typeof window.pannellum?.viewer !== 'function') {
    throw new Error('Pannellum 2.5.7を読み込めませんでした。通信接続とライブラリの設定を確認してください。');
  }
  const scenes = {};
  for (const scene of tour.scenes) {
    scenes[scene.id] = {
      type: 'equirectangular',
      panorama: scene.panorama,
      ...(scene.preview ? {preview: scene.preview} : {}),
      yaw: scene.initialView.yaw,
      pitch: scene.initialView.pitch,
      hfov: scene.initialView.hfov,
      // Do not honor unverified GPano metadata from uploaded files.
      ignoreGPanoXMP: true,
      hotSpots: scene.links.map(link => ({
        type: 'scene', sceneId: link.to, text: link.label,
        yaw: link.yaw, pitch: link.pitch,
        targetYaw: link.targetYaw, targetPitch: link.targetPitch,
        targetHfov: 'same'
      }))
    };
  }
  const viewer = window.pannellum.viewer(elementId, {
    default: {
      firstScene: requestedScene,
      autoLoad: true,
      escapeHTML: true,
      sceneFadeDuration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550,
      mouseZoom: 'fullscreenonly',
      showFullscreenCtrl: true,
      showZoomCtrl: true,
      compass: false,
      backgroundColor: [0.07,0.10,0.15]
    }, scenes
  });
  viewer.on('scenechange', id => callbacks.onSceneChange?.(id));
  viewer.on('load', () => callbacks.onLoaded?.(viewer.getScene()));
  viewer.on('error', message => callbacks.onError?.(String(message)));
  return {
    changeScene(id) { if (id !== viewer.getScene()) viewer.loadScene(id); },
    currentScene() { return viewer.getScene(); },
    resize() { viewer.resize(); },
    destroy() { viewer.destroy(); }
  };
}
