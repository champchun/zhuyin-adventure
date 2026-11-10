import Phaser from 'phaser';
import './style.css';
import { VIEW_H, VIEW_W, computeFit, computeZoom, view } from './core/view';
import { G, hasSave, loadGame, loadSettings, saveGame, startNewGame } from './core/save';
import { audio } from './core/audio';
import { applyBodyClasses, hooks, openSettings, setupHud, showHud, showTitle, ui } from './core/ui';
import { generateTextures } from './gfx/sprites';
import { WorldScene } from './scenes/World';
import { BattleScene } from './scenes/Battle';

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    generateTextures(this);
    hooks.texture = (key) => (this.textures.exists(key) ? (this.textures.get(key).getSourceImage() as CanvasImageSource) : undefined);
    this.scene.start('World');
  }
}

loadSettings();
audio.loadVoiceManifest();
view.zoom = computeZoom();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  width: VIEW_W * view.zoom,
  height: VIEW_H * view.zoom,
  backgroundColor: '#1d1630',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  disableContextMenu: true,
  scale: { mode: Phaser.Scale.NONE },
  input: { touch: { capture: true } },
  scene: [BootScene, WorldScene, BattleScene],
});

// 以 CSS 把畫布貼合視窗；整數倍率時用最近鄰保持像素銳利，小數倍率改用平滑縮放避免像素粗細不均。
const applyFit = () => {
  const f = computeFit();
  view.fit = f;
  const cv = game.canvas;
  if (!cv) return;
  cv.style.width = Math.floor(VIEW_W * f) + 'px';
  cv.style.height = Math.floor(VIEW_H * f) + 'px';
  cv.style.imageRendering = Number.isInteger(f) ? 'pixelated' : 'auto';
  game.scale.refresh();
};
applyFit();

let resizeT: number | undefined;
const onResize = () => {
  clearTimeout(resizeT);
  resizeT = window.setTimeout(() => {
    const z = computeZoom();
    if (z !== view.zoom || game.scale.width !== VIEW_W * z) {
      view.zoom = z;
      game.scale.resize(VIEW_W * z, VIEW_H * z);
    }
    applyFit();
    window.dispatchEvent(new Event('fitchange'));
  }, 80);
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

let inGame = false;
let backToTitle: (() => void) | undefined;
const world = () => game.scene.getScene('World') as WorldScene;

setupHud({
  party: () => world().openParty(),
  settings: () => openSettings(async () => { await world().begin(true); }),
  title: () => { backToTitle?.(); },
});
applyBodyClasses();

// 防止 iPad 雙擊縮放／手勢縮放
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
window.addEventListener('pagehide', () => { if (inGame) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && inGame) saveGame(); });

async function waitReady() {
  while (!game.scene.isActive('World') || !(game.scene.getScene('World') as WorldScene).scene.isActive()) await new Promise((r) => setTimeout(r, 30));
}

async function flow() {
  await waitReady();
  for (;;) {
    inGame = false;
    showHud(false);
    const choice = await showTitle();
    let isNew = choice === 'new';
    if (isNew) startNewGame();
    else if (!loadGame()) { startNewGame(); isNew = true; }
    showHud(true);
    inGame = true;
    await world().begin(isNew);
    await new Promise<void>((res) => { backToTitle = res; });
    saveGame();
    audio.stopSpeech();
  }
}
flow();

// 供除錯與自動化測試使用
(window as any).__game = { game, G, audio, world, ui, hasSave };
