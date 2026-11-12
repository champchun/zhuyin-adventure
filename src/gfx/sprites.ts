// 程式繪製的原創像素素材。所有素材以字串 key 對應貼圖；日後要換成正式圖檔，
// 只要在 Boot 階段改成 load.image / load.spritesheet 並維持相同 key 即可。
import Phaser from 'phaser';
import { MONSTER_ART, monsterRows } from './monsterArt';

export const TILE = 16;

const PAL: Record<string, string> = {
  k: '#2b2140', w: '#ffffff', o: '#f59a3c', O: '#d9701f', y: '#ffd84a', r: '#e8514a', p: '#ff9db8',
  b: '#4aa8f0', B: '#2f6fc0', c: '#7fe0e8', g: '#5ccf5c', G: '#2f9a45', n: '#8b5a3c', N: '#5c3a24',
  s: '#ffd2a8', e: '#b8b8c8', E: '#7d7d94', u: '#9a6ad8', t: '#e8c88a', l: '#d6efff',
};

type Rows = string[];
/** 太短的列自動置中，方便手寫對稱的像素圖 */
function norm(rows: Rows, size = 16): Rows {
  const out = rows.map((r) => {
    if (r.length >= size) return r.slice(0, size);
    const left = Math.floor((size - r.length) / 2);
    return '.'.repeat(left) + r + '.'.repeat(size - r.length - left);
  });
  while (out.length < size) out.push('.'.repeat(size));
  return out.slice(0, size);
}

// ───── 角色與怪獸像素圖（16×16）─────
const PLAYER_DOWN: Rows = [
  '................', '.....kkkkkk.....', '....kNNNNNNk....', '...kNNNNNNNNk...', '...kNssssssNk...',
  '...kssksskssk...', '...kssssssssk...', '....kssppssk....', '...kbbbbbbbbk...', '..kbbbbbbbbbbk..',
  '..ksbbbbbbbbsk..', '...kbbwwwwbbk...', '....kBBBBBBk....', '....kBk..kBk....', '...kkk....kkk...',
];
const PLAYER_UP: Rows = [
  '................', '.....kkkkkk.....', '....kNNNNNNk....', '...kNNNNNNNNk...', '...kNNNNNNNNk...',
  '...kNNNNNNNNk...', '...kNNNNNNNNk...', '....kNNNNNNk....', '...kbbbbbbbbk...', '..kbbbbbbbbbbk..',
  '..ksbbbbbbbbsk..', '...kbbbbbbbbk...', '....kBBBBBBk....', '....kBk..kBk....', '...kkk....kkk...',
];
const PLAYER_SIDE: Rows = [
  '................', '.....kkkkkk.....', '....kNNNNNNk....', '...kNNNNNNNNk...', '...kNNNNsssskk..',
  '...kNNNNssksk...', '...kNNNNssssk...', '....kNNNsssk....', '....kbbbbbbk....', '...kbbbbbbbbk...',
  '...kbbbbbbsbk...', '....kbbwwbbk....', '....kBBBBBk.....', '....kBk.kBk.....', '...kkk..kkk.....',
];
const NPC_GUIDE: Rows = [
  '................',
  '.....kkkkkk.....',
  '....kwwwwwwk....',
  '...kwwwwwwwwk...',
  '...kssssssssk...',
  '...klllsslllk...',
  '...klklsslklk...',
  '...kpsssssspk...',
  '...ksssppsssk...',
  '....kssrrssk....',
  '..kwwwwwwwwwwk..',
  '..kwwwwbbwwwwk..',
  '..kwwwwbbwwwwk..',
  '..kwwwwwwwwwwk..',
  '....kbbk..kbbk..',
  '....kkkk..kkkk..',
];
const EGG: Rows = [
  '', '', '.....kkkkkk.....', '....kwwwwwwk....', '...kwwwwoowwk...', '...kwwwooowwk...', '..kwwwwwwwwwwk..',
  '..kwoowwwwwwwk..', '..kwoowwwwoowk..', '..kwwwwwwwoowk..', '..kwwwoowwwwwk..', '...kwwoowwwwk...',
  '....kwwwwwwk....', '.....kkkkkk.....',
];
const PIPI: Rows = [
  '', 'kcck', 'kkbbbbbbkk', 'kbbbbbbbbbbk', 'kbbwkbbbbkwbbk', 'kbbbbyyyybbbbk', 'kBbbbbyybbbbBk',
  'kBBbbllllllbbBBk', 'kBBBbllllllbBBBk', 'kkBBbllllbBBkk', 'kkbbllllbbkk', 'kbbbbbbbbbbk', 'kkkbbbbkkk',
  'kyyk..kyyk', 'kkkk..kkkk',
];
function drawRows(tex: Phaser.Textures.CanvasTexture, rows: Rows, pal: Record<string, string>) {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 16, 16);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || c === ' ') continue;
      ctx.fillStyle = pal[c] ?? '#ff00ff';
      ctx.fillRect(x, y, 1, 1);
    }
  });
  tex.refresh();
}

/** 簡單的決定性亂數，讓圖塊每次生成都一樣 */
function rngSeed(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function generateTextures(scene: Phaser.Scene) {
  const tm = scene.textures;
  const make = (key: string, w: number, h: number, fn: (c: CanvasRenderingContext2D) => void) => {
    if (tm.exists(key)) tm.remove(key);
    const t = tm.createCanvas(key, w, h)!;
    fn(t.getContext());
    t.refresh();
    return t;
  };
  const px = (c: CanvasRenderingContext2D, col: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const grid = (key: string, rows: Rows, pal: Record<string, string> = PAL) => {
    const t = make(key, 16, 16, () => {});
    drawRows(t, norm(rows), pal);
  };

  // 角色
  grid('player_down', PLAYER_DOWN); grid('player_up', PLAYER_UP); grid('player_side', PLAYER_SIDE);
  grid('npc_guide', NPC_GUIDE); grid('egg', EGG);
  // 三隻初始夥伴是 32×32（見 monsterArt.ts）；地圖上縮成 0.5 倍跟著玩家走，戰鬥時放大
  for (const key of Object.keys(MONSTER_ART)) {
    const { rows, pal } = monsterRows(key);
    make(key, 32, 32, (c) => rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') px(c, pal[row[x]] ?? '#ff00ff', x, y); }));
  }
  grid('mon_pipi', PIPI);
  // 村民：同一套身體換髮色與衣服
  const npc = (key: string, hair: string, shirt: string, pants: string) => grid(key, PLAYER_DOWN, { ...PAL, N: hair, b: shirt, B: pants });
  npc('npc_mom', '#c86a2a', '#ff9db8', '#8b5a3c');
  npc('npc_kid', '#ffd84a', '#5ccf5c', '#2f6fc0');
  npc('npc_elder', '#e6e6f0', '#9a6ad8', '#5c3a24');
  npc('npc_girl', '#7a4a2a', '#ffd84a', '#e8514a');
  npc('npc_clerk', '#4a3a6a', '#5ccf5c', '#2f6fc0');

  // ───── 地形圖塊 ─────
  const grass = (c: CanvasRenderingContext2D, seed: number) => {
    px(c, '#7ed957', 0, 0, 16, 16);
    const r = rngSeed(seed);
    for (let i = 0; i < 9; i++) px(c, r() < 0.5 ? '#5fbf45' : '#a4ec7a', Math.floor(r() * 15), Math.floor(r() * 15), 1, 2);
  };
  make('t_grass', 16, 16, (c) => grass(c, 1));
  make('t_flower', 16, 16, (c) => {
    grass(c, 2);
    [[3, 4, '#ff9db8'], [10, 3, '#ffffff'], [7, 10, '#ffd84a'], [12, 12, '#ff9db8']].forEach(([x, y, col]) => {
      px(c, col as string, x as number, y as number, 2, 2); px(c, '#ffd84a', (x as number), (y as number), 1, 1);
    });
  });
  make('t_tree', 16, 16, (c) => {
    grass(c, 3);
    px(c, '#2b2140', 6, 11, 4, 5); px(c, '#8b5a3c', 7, 11, 2, 5);
    px(c, '#2b2140', 2, 1, 12, 11); px(c, '#2b2140', 1, 3, 14, 7);
    px(c, '#2f9a45', 2, 2, 12, 9); px(c, '#2f9a45', 1, 4, 14, 5);
    px(c, '#5ccf5c', 3, 3, 6, 4); px(c, '#8ae870', 4, 3, 3, 2);
  });
  make('t_path', 16, 16, (c) => {
    px(c, '#ecd29a', 0, 0, 16, 16);
    const r = rngSeed(4);
    for (let i = 0; i < 6; i++) px(c, '#d4b070', Math.floor(r() * 14), Math.floor(r() * 14), 2, 1);
  });
  make('t_roof', 16, 16, (c) => {
    px(c, '#e8514a', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#b03a3a', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(c, '#b03a3a', x, y, 1, 3);
    px(c, '#ff8a80', 0, 0, 16, 1);
  });
  make('t_wall', 16, 16, (c) => {
    px(c, '#fff0c8', 0, 0, 16, 16); px(c, '#d9b878', 0, 0, 16, 2); px(c, '#d9b878', 0, 14, 16, 2);
    px(c, '#2b2140', 4, 4, 8, 7); px(c, '#9fdcff', 5, 5, 6, 5); px(c, '#ffffff', 5, 5, 2, 2); px(c, '#8b5a3c', 8, 5, 1, 5);
  });
  make('t_door', 16, 16, (c) => {
    px(c, '#fff0c8', 0, 0, 16, 16); px(c, '#d9b878', 0, 0, 16, 2);
    px(c, '#2b2140', 3, 2, 10, 14); px(c, '#8b5a3c', 4, 3, 8, 13); px(c, '#5c3a24', 7, 3, 1, 13); px(c, '#ffd84a', 10, 9, 1, 2);
  });
  make('t_water', 16, 16, (c) => {
    px(c, '#4aa8f0', 0, 0, 16, 16);
    px(c, '#8ad0ff', 2, 3, 5, 1); px(c, '#8ad0ff', 9, 9, 5, 1); px(c, '#2f8ad8', 4, 12, 4, 1); px(c, '#2f8ad8', 10, 5, 3, 1);
  });
  make('t_bridge', 16, 16, (c) => {
    px(c, '#4aa8f0', 0, 0, 16, 16); px(c, '#2b2140', 0, 1, 16, 14); px(c, '#b9824f', 0, 2, 16, 12);
    for (let x = 3; x < 16; x += 4) px(c, '#8b5a3c', x, 2, 1, 12);
    px(c, '#d9a26a', 0, 2, 16, 1);
  });
  make('t_lily', 16, 16, (c) => {
    px(c, '#4aa8f0', 0, 0, 16, 16);
    px(c, '#8ad0ff', 2, 2, 4, 1); px(c, '#2f8ad8', 11, 14, 3, 1);
    px(c, '#2b2140', 5, 2, 6, 1); px(c, '#2b2140', 3, 3, 10, 1); px(c, '#2b2140', 2, 4, 12, 8); px(c, '#2b2140', 3, 12, 10, 1); px(c, '#2b2140', 5, 13, 6, 1);
    px(c, '#5ccf5c', 5, 3, 6, 1); px(c, '#5ccf5c', 3, 4, 10, 8); px(c, '#5ccf5c', 5, 12, 6, 1);
    px(c, '#2f9a45', 4, 10, 8, 2); px(c, '#2f9a45', 6, 12, 4, 1);
    px(c, '#a8f08a', 4, 5, 3, 1);
    px(c, '#4aa8f0', 8, 4, 1, 4); px(c, '#4aa8f0', 9, 4, 1, 1); // 葉面的小缺口
    px(c, '#ff9db8', 5, 7, 3, 2); px(c, '#ff9db8', 6, 6, 1, 4); px(c, '#ffd84a', 6, 7, 1, 1);
  });
  make('t_dirt', 16, 16, (c) => {
    px(c, '#d2a877', 0, 0, 16, 16);
    const r = rngSeed(7);
    for (let i = 0; i < 7; i++) px(c, r() < 0.5 ? '#b78e5c' : '#e6c397', Math.floor(r() * 14), Math.floor(r() * 14), 2, 1);
  });
  make('t_cliff', 16, 16, (c) => {
    px(c, '#8a8aa3', 0, 0, 16, 16); px(c, '#a6a6bd', 0, 0, 16, 5); px(c, '#6a6a84', 0, 11, 16, 5);
    px(c, '#55556e', 3, 6, 5, 1); px(c, '#55556e', 9, 9, 5, 1); px(c, '#55556e', 6, 2, 1, 4); px(c, '#c4c4d8', 11, 1, 3, 1);
  });

  make('t_sand', 16, 16, (c) => {
    px(c, '#f2e0a8', 0, 0, 16, 16);
    const r = rngSeed(11);
    for (let i = 0; i < 8; i++) px(c, r() < 0.5 ? '#dcc27a' : '#fff4c8', Math.floor(r() * 14), Math.floor(r() * 14), 2, 1);
  });

  // ───── 室內圖塊 ─────
  make('t_wood', 16, 16, (c) => {
    px(c, '#e0b678', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 8) { px(c, '#c99a5c', 0, y + 7, 16, 1); px(c, '#c99a5c', (y / 8) % 2 ? 4 : 11, y, 1, 7); }
  });
  make('t_rug', 16, 16, (c) => {
    px(c, '#e0b678', 0, 0, 16, 16); px(c, '#e8514a', 0, 0, 16, 16); px(c, '#ffd84a', 1, 1, 14, 1); px(c, '#ffd84a', 1, 14, 14, 1);
    px(c, '#ffd84a', 1, 1, 1, 14); px(c, '#ffd84a', 14, 1, 1, 14); px(c, '#ff8a80', 6, 6, 4, 4);
  });
  make('t_iwall', 16, 16, (c) => {
    px(c, '#fff0c8', 0, 0, 16, 16); px(c, '#e8d29a', 0, 0, 16, 1);
    for (let x = 0; x < 16; x += 4) px(c, '#f2e0b0', x, 1, 1, 15);
    px(c, '#8b5a3c', 0, 13, 16, 3); px(c, '#5c3a24', 0, 15, 16, 1);
  });
  make('t_table', 16, 16, (c) => {
    px(c, '#2b2140', 0, 2, 16, 12); px(c, '#b9824f', 0, 3, 16, 9); px(c, '#d9a26a', 0, 3, 16, 2); px(c, '#8b5a3c', 0, 12, 16, 2);
  });
  make('t_shelf', 16, 16, (c) => {
    px(c, '#2b2140', 0, 0, 16, 16); px(c, '#8b5a3c', 1, 1, 14, 14); px(c, '#5c3a24', 1, 7, 14, 1);
    [['#e8514a', 2], ['#4aa8f0', 5], ['#ffd84a', 8], ['#5ccf5c', 11]].forEach(([col, x]) => { px(c, col as string, x as number, 2, 3, 5); px(c, col as string, (x as number) + 1, 9, 3, 5); });
  });
  make('bed', 16, 16, (c) => {
    px(c, '#2b2140', 1, 1, 14, 15); px(c, '#8b5a3c', 2, 2, 12, 13); px(c, '#ffffff', 3, 3, 10, 4); px(c, '#9fdcff', 3, 7, 10, 7);
    px(c, '#6fb8e8', 3, 10, 10, 1); px(c, '#ffffff', 4, 4, 3, 2);
  });
  make('desk', 16, 16, (c) => {
    px(c, '#2b2140', 1, 4, 14, 11); px(c, '#b9824f', 2, 5, 12, 8); px(c, '#8b5a3c', 2, 12, 12, 2);
    px(c, '#ffffff', 4, 6, 5, 4); px(c, '#4aa8f0', 5, 7, 3, 1); px(c, '#ffd84a', 11, 6, 2, 3);
  });

  // ───── 物件 ─────
  make('shadow', 14, 5, (c) => { c.fillStyle = 'rgba(30,20,60,0.3)'; c.fillRect(2, 0, 10, 5); c.fillRect(0, 1, 14, 3); });
  make('chest', 16, 16, (c) => {
    px(c, '#2b2140', 2, 5, 12, 10); px(c, '#b9824f', 3, 6, 10, 8); px(c, '#8b5a3c', 3, 11, 10, 3);
    px(c, '#d9a26a', 3, 6, 10, 2); px(c, '#ffd84a', 7, 9, 2, 3); px(c, '#2b2140', 2, 9, 12, 1);
  });
  make('chest_open', 16, 16, (c) => {
    px(c, '#2b2140', 2, 8, 12, 7); px(c, '#8b5a3c', 3, 9, 10, 5); px(c, '#ffe27a', 4, 9, 8, 2);
    px(c, '#2b2140', 2, 2, 12, 5); px(c, '#b9824f', 3, 3, 10, 3);
  });
  make('rock', 16, 16, (c) => {
    px(c, '#2b2140', 2, 4, 12, 11); px(c, '#2b2140', 4, 3, 8, 13);
    px(c, '#9a9ab2', 3, 5, 10, 9); px(c, '#9a9ab2', 5, 4, 6, 11); px(c, '#c2c2d6', 5, 5, 4, 2);
    px(c, '#2b2140', 8, 5, 1, 3); px(c, '#2b2140', 7, 8, 2, 1); px(c, '#2b2140', 6, 9, 1, 3); px(c, '#2b2140', 9, 10, 1, 3);
  });
  make('leaves', 16, 16, (c) => {
    const cols = ['#e8883a', '#f2b84a', '#c86a2a', '#d9a030'];
    const r = rngSeed(9);
    px(c, '#2b2140', 1, 5, 14, 10);
    px(c, '#c86a2a', 2, 6, 12, 8);
    for (let i = 0; i < 14; i++) px(c, cols[i % 4], 2 + Math.floor(r() * 11), 5 + Math.floor(r() * 8), 3, 2);
  });
  make('woodgate', 16, 16, (c) => {
    px(c, '#2b2140', 0, 2, 16, 13); px(c, '#b9824f', 1, 3, 14, 11);
    for (let x = 4; x < 16; x += 4) px(c, '#8b5a3c', x, 3, 1, 11);
    px(c, '#8b5a3c', 1, 5, 14, 2); px(c, '#8b5a3c', 1, 10, 14, 2); px(c, '#ffd84a', 12, 8, 2, 2);
  });
  // 舌尖中音島的機關
  make('drum_big', 16, 16, (c) => {
    px(c, '#2b2140', 2, 3, 12, 12); px(c, '#2b2140', 1, 5, 14, 8);
    px(c, '#f6e2b0', 3, 3, 10, 3); px(c, '#e8514a', 2, 6, 12, 8); px(c, '#a83030', 2, 11, 12, 3); px(c, '#ffd84a', 2, 6, 12, 1); px(c, '#ffd84a', 2, 13, 12, 1);
    for (let x = 3; x < 13; x += 3) { px(c, '#ffd84a', x, 7, 1, 1); px(c, '#ffd84a', x + 1, 8, 1, 1); px(c, '#ffd84a', x + 2, 7, 1, 1); }
    px(c, '#8b5a3c', 0, 1, 2, 5); px(c, '#8b5a3c', 14, 1, 2, 5);
  });
  make('frog_statue', 16, 16, (c) => {
    px(c, 'rgba(30,20,60,0.3)', 2, 14, 12, 2);
    px(c, '#2b2140', 3, 7, 10, 8); px(c, '#2b2140', 2, 9, 12, 5); px(c, '#2b2140', 2, 2, 5, 5); px(c, '#2b2140', 9, 2, 5, 5); px(c, '#2b2140', 3, 5, 10, 3);
    px(c, '#9a9ab2', 4, 8, 8, 6); px(c, '#9a9ab2', 3, 10, 10, 3); px(c, '#6a6a84', 4, 13, 8, 1);
    px(c, '#9a9ab2', 3, 5, 10, 3); px(c, '#c2c2d6', 4, 6, 3, 1);
    px(c, '#ffffff', 3, 3, 3, 3); px(c, '#ffffff', 10, 3, 3, 3); px(c, '#2b2140', 4, 4, 2, 2); px(c, '#2b2140', 10, 4, 2, 2);
    px(c, '#2b2140', 5, 9, 6, 1); px(c, '#c2c2d6', 3, 12, 2, 2); px(c, '#c2c2d6', 11, 12, 2, 2);
  });
  make('plant_dry', 16, 16, (c) => {
    px(c, '#2b2140', 4, 10, 8, 6); px(c, '#c86a2a', 5, 10, 6, 5); px(c, '#8b4a1a', 5, 13, 6, 2);
    px(c, '#2b2140', 7, 4, 2, 7); px(c, '#a88a4a', 7, 5, 1, 6); px(c, '#a88a4a', 4, 6, 3, 1); px(c, '#a88a4a', 9, 7, 3, 1); px(c, '#8a7030', 3, 7, 1, 2); px(c, '#8a7030', 12, 8, 1, 2);
  });
  make('plant_wet', 16, 16, (c) => {
    px(c, '#2b2140', 4, 10, 8, 6); px(c, '#c86a2a', 5, 10, 6, 5); px(c, '#8b4a1a', 5, 13, 6, 2);
    px(c, '#2f9a45', 7, 5, 2, 6); px(c, '#5ccf5c', 4, 6, 3, 2); px(c, '#5ccf5c', 9, 7, 3, 2);
    px(c, '#2b2140', 5, 0, 6, 6); px(c, '#ff9db8', 6, 1, 4, 4); px(c, '#ffd84a', 7, 2, 2, 2); px(c, '#ffffff', 6, 1, 1, 1);
  });
  make('bubble_ball', 16, 16, (c) => {
    px(c, '#2b2140', 5, 1, 6, 14); px(c, '#2b2140', 2, 4, 12, 8); px(c, '#2b2140', 3, 2, 10, 12);
    px(c, '#bfe6ff', 6, 2, 4, 12); px(c, '#bfe6ff', 3, 5, 10, 6); px(c, '#bfe6ff', 4, 3, 8, 10);
    px(c, '#8ad0ff', 5, 9, 6, 3); px(c, '#ffffff', 5, 4, 3, 2); px(c, '#ffffff', 5, 6, 1, 2);
  });
  make('dam', 16, 16, (c) => {
    px(c, '#4aa8f0', 0, 0, 16, 16); px(c, '#8ad0ff', 2, 3, 4, 1); px(c, '#8ad0ff', 10, 12, 4, 1);
    for (let i = 0; i < 4; i++) { px(c, '#2b2140', 1, 2 + i * 3, 14, 4); px(c, i % 2 ? '#8b5a3c' : '#b9824f', 2, 3 + i * 3, 12, 2); px(c, '#d9a26a', 2, 3 + i * 3, 12, 1); }
  });
  make('drop', 4, 5, (c) => { px(c, '#bfe6ff', 1, 0, 2, 1); px(c, '#4aa8f0', 0, 1, 4, 3); px(c, '#2f7ad0', 1, 4, 2, 1); px(c, '#ffffff', 1, 1, 1, 1); });
  // 舌根音島的機關：搖搖樹、樹洞、冰塊
  const treeBase = (c: CanvasRenderingContext2D) => {
    px(c, '#2b2140', 5, 10, 6, 6); px(c, '#8b5a3c', 6, 10, 4, 6); px(c, '#5c3a24', 6, 14, 4, 2);
    px(c, '#2b2140', 3, 0, 10, 11); px(c, '#2b2140', 1, 2, 14, 7);
    px(c, '#2f9a45', 4, 1, 8, 9); px(c, '#2f9a45', 2, 3, 12, 5); px(c, '#5ccf5c', 4, 1, 8, 5); px(c, '#5ccf5c', 2, 3, 6, 3); px(c, '#b8f58a', 4, 2, 3, 1);
  };
  make('tree_shake', 16, 16, (c) => {
    treeBase(c);
    [[3, 4], [9, 2], [6, 6], [11, 5], [4, 8]].forEach(([x, y]) => { px(c, '#e8514a', x, y, 2, 2); px(c, '#ffffff', x, y, 1, 1); });
  });
  make('tree_shake_bare', 16, 16, (c) => {
    treeBase(c);
    px(c, '#e8514a', 1, 14, 2, 2); px(c, '#ffffff', 1, 14, 1, 1); px(c, '#e8514a', 12, 14, 2, 2); px(c, '#ffffff', 12, 14, 1, 1);
  });
  make('tree_hole', 16, 16, (c) => {
    treeBase(c);
    px(c, '#2b2140', 6, 11, 4, 4); px(c, '#120a1e', 7, 12, 2, 3);
  });
  make('tree_hole_open', 16, 16, (c) => {
    treeBase(c);
    px(c, '#2b2140', 6, 11, 4, 4); px(c, '#ffd84a', 7, 12, 2, 3); px(c, '#fff6c0', 7, 12, 1, 1);
    px(c, '#ffe27a', 5, 15, 1, 1); px(c, '#ffe27a', 10, 15, 1, 1);
  });
  make('ice_block', 16, 16, (c) => {
    px(c, '#2b2140', 1, 3, 14, 12); px(c, '#2b2140', 2, 2, 12, 13);
    px(c, '#bfe6ff', 2, 3, 12, 11); px(c, '#8ad0ff', 2, 11, 12, 3); px(c, '#8ad0ff', 11, 3, 3, 8);
    px(c, '#ffffff', 3, 4, 4, 1); px(c, '#ffffff', 3, 5, 1, 4); px(c, '#ffffff', 8, 7, 1, 1); px(c, '#ffffff', 7, 8, 1, 1);
  });
  // 迷宮的零件：樓梯口、鎖住的門、擋路的石牆
  make('stairs', 16, 16, (c) => {
    px(c, '#2b2140', 1, 1, 14, 14); px(c, '#6a6a84', 2, 2, 12, 12);
    px(c, '#8a8aa3', 2, 4, 12, 2); px(c, '#55556e', 2, 6, 12, 2); px(c, '#8a8aa3', 2, 8, 12, 2); px(c, '#3a3a52', 2, 10, 12, 2);
    px(c, '#2b2140', 4, 5, 8, 1); px(c, '#2b2140', 5, 8, 6, 1); px(c, '#2b2140', 6, 11, 4, 1);
  });
  make('lockdoor', 16, 16, (c) => {
    px(c, '#2b2140', 1, 1, 14, 15); px(c, '#b9824f', 2, 2, 12, 14); px(c, '#8b5a3c', 7, 2, 2, 14); px(c, '#d9a26a', 2, 2, 12, 1);
    px(c, '#2b2140', 5, 7, 6, 6); px(c, '#ffd84a', 6, 8, 4, 4); px(c, '#2b2140', 7, 9, 2, 2);
  });
  make('barrier', 16, 16, (c) => {
    px(c, '#2b2140', 0, 1, 16, 15); px(c, '#9a9ab2', 1, 2, 14, 13); px(c, '#c2c2d6', 1, 2, 14, 2);
    px(c, '#6a6a84', 1, 8, 14, 1); px(c, '#6a6a84', 5, 2, 1, 6); px(c, '#6a6a84', 10, 9, 1, 6); px(c, '#55556e', 1, 13, 14, 2);
  });
  make('dock', 16, 16, (c) => {
    px(c, '#4aa8f0', 0, 0, 16, 16); px(c, '#8ad0ff', 2, 3, 4, 1); px(c, '#8ad0ff', 10, 13, 4, 1);
    px(c, '#2b2140', 0, 5, 16, 7); px(c, '#b9824f', 0, 6, 16, 5); px(c, '#d9a26a', 0, 6, 16, 1);
    for (let x = 3; x < 16; x += 4) px(c, '#8b5a3c', x, 6, 1, 5);
    px(c, '#2b2140', 2, 1, 5, 4); px(c, '#e8514a', 3, 2, 3, 2); px(c, '#ffffff', 11, 1, 1, 5); px(c, '#ffffff', 11, 1, 4, 3);
  });
  make('bell', 16, 16, (c) => {
    px(c, '#2b2140', 7, 1, 2, 3); px(c, '#2b2140', 4, 3, 8, 9); px(c, '#2b2140', 3, 10, 10, 3);
    px(c, '#ffd84a', 5, 4, 6, 8); px(c, '#ffd84a', 4, 10, 8, 2); px(c, '#fff3b0', 5, 5, 2, 5);
    px(c, '#2b2140', 7, 13, 2, 2); px(c, '#c9921a', 9, 5, 2, 6);
  });
  make('fog_patch', 16, 16, (c) => {
    const blob = (x: number, y: number, w: number, h: number, col: string) => { px(c, col, x + 1, y, w - 2, h); px(c, col, x, y + 1, w, h - 2); };
    blob(0, 4, 10, 8, '#b9a8d8'); blob(5, 1, 11, 9, '#cfc2e6'); blob(2, 8, 12, 7, '#d9cfee'); blob(7, 6, 7, 5, '#ece6f8');
  });
  make('sign', 16, 16, (c) => {
    px(c, '#2b2140', 7, 9, 2, 6); px(c, '#8b5a3c', 7, 9, 2, 6);
    px(c, '#2b2140', 2, 2, 12, 8); px(c, '#e8c88a', 3, 3, 10, 6); px(c, '#8b5a3c', 4, 5, 8, 1); px(c, '#8b5a3c', 4, 7, 6, 1);
  });
  const gate = (key: string, lit: boolean) => make(key, 16, 16, (c) => {
    px(c, '#2b2140', 1, 1, 14, 15); px(c, lit ? '#e8c88a' : '#8a8aa3', 2, 2, 12, 14);
    px(c, '#2b2140', 4, 5, 8, 11); px(c, lit ? '#fff3b0' : '#55556e', 5, 6, 6, 10);
    if (lit) { px(c, '#ffe27a', 6, 8, 4, 8); px(c, '#ffffff', 7, 10, 2, 6); }
    px(c, lit ? '#f2b84a' : '#6a6a84', 2, 2, 12, 2);
  });
  gate('gate_on', true); gate('gate_off', false);
  make('exit_tile', 16, 16, (c) => {
    px(c, '#2b2140', 1, 3, 14, 11); px(c, '#4aa8f0', 2, 4, 12, 9); px(c, '#bfe6ff', 4, 6, 8, 5);
    px(c, '#2b2140', 5, 8, 6, 1); px(c, '#2b2140', 5, 8, 2, 2); px(c, '#2b2140', 5, 7, 1, 1);
  });
  make('windmill', 16, 32, (c) => {
    px(c, '#2b2140', 3, 10, 10, 22); px(c, '#fff0c8', 4, 11, 8, 21); px(c, '#d9b878', 4, 11, 2, 21);
    px(c, '#2b2140', 2, 6, 12, 6); px(c, '#e8514a', 3, 5, 10, 6); px(c, '#b03a3a', 3, 9, 10, 2);
    px(c, '#2b2140', 6, 22, 4, 10); px(c, '#8b5a3c', 7, 23, 2, 9);
    px(c, '#2b2140', 6, 15, 4, 4); px(c, '#9fdcff', 7, 16, 2, 2);
  });
  make('wm_blades', 28, 28, (c) => {
    const bl = (x: number, y: number, w: number, h: number) => { px(c, '#2b2140', x - 1, y - 1, w + 2, h + 2); px(c, '#ffffff', x, y, w, h); px(c, '#d9b878', x, y + h - 1, w, 1); };
    bl(13, 1, 3, 12); bl(13, 15, 3, 12); bl(1, 13, 12, 3); bl(15, 13, 12, 3);
    px(c, '#2b2140', 11, 11, 6, 6); px(c, '#ffd84a', 12, 12, 4, 4);
  });
  make('spark', 7, 7, (c) => { px(c, '#ffffff', 3, 0, 1, 7); px(c, '#ffffff', 0, 3, 7, 1); px(c, '#ffe27a', 2, 2, 3, 3); });
  make('puff', 6, 6, (c) => { px(c, '#ffffff', 1, 0, 4, 6); px(c, '#ffffff', 0, 1, 6, 4); });
  make('rubble', 3, 3, (c) => { px(c, '#8a8aa3', 0, 0, 3, 3); px(c, '#c4c4d8', 0, 0, 1, 1); });
  make('windline', 12, 3, (c) => { px(c, '#e6f8ff', 0, 1, 12, 1); px(c, '#ffffff', 2, 0, 6, 1); px(c, '#ffffff', 4, 2, 6, 1); });
  make('star', 9, 9, (c) => {
    px(c, '#2b2140', 3, 0, 3, 9); px(c, '#2b2140', 0, 3, 9, 3); px(c, '#2b2140', 1, 1, 7, 7);
    px(c, '#ffd84a', 4, 1, 1, 7); px(c, '#ffd84a', 1, 4, 7, 1); px(c, '#ffd84a', 2, 2, 5, 5); px(c, '#fff6b0', 3, 3, 2, 2);
  });
}
