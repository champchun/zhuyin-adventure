// 第八關（遊樂園）的地形與物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，
// 預覽或測試時也可以傳入假的畫布。整體繽紛暖色：紅黃粉紫藍，米黃磚地、亮綠草地、條紋帳篷。
import type { Ctx2, Make, Px } from './snowArt';

/** 簡單的決定性亂數 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 新增的圖樣 key（測試檢查用）：t_ 開頭是地形圖塊（畫滿 16×16），其餘是物件 */
export const PARK_TEXTURES = [
  't_park_brick', 't_park_grass', 't_park_path', 't_mirror_floor', 't_park_flower', 't_park_fence', 't_park_canal', 't_park_fountain',
  't_roof_tent', 't_wall_tent', 't_roof_inn_tent', 't_wall_inn_tent', 't_roof_shop_tent', 't_wall_shop_tent', 't_mirror_wall',
  'carousel_asleep', 'carousel_on', 'balloon_flat', 'balloon_big', 'ferris_gap', 'ferris_bridge',
  'fireworks_cannon', 'fireworks_lit', 'gong', 'gong_hit', 'train', 'park_gate',
] as const;

const OUT = '#3a1f4a';
const WATER = '#4aa8e8';
const WATER_D = '#2f86cc';
const RIPPLE = '#e8f6ff';

export function drawParkTextures(make: Make, px: Px) {
  const brick = (c: Ctx2, seed: number) => {
    px(c, '#f4e2b4', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#d9bd84', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) { const o = (y / 4) % 2 ? 0 : 4; px(c, '#d9bd84', o + 2, y, 1, 3); px(c, '#d9bd84', o + 10, y, 1, 3); }
    const r = rng(seed);
    for (let i = 0; i < 5; i++) px(c, '#fff6d8', Math.floor(r() * 14), Math.floor(r() * 3) * 4, 2, 1);
  };
  const grass = (c: Ctx2, seed: number) => {
    px(c, '#6fd25a', 0, 0, 16, 16);
    const r = rng(seed);
    for (let i = 0; i < 9; i++) px(c, r() < 0.5 ? '#8ae870' : '#52b844', Math.floor(r() * 14), Math.floor(r() * 14), 1, 2);
  };
  /** 水溝：藍水＋白色波紋，ferris 的兩張圖也用它當底，才接得起來 */
  const canal = (c: Ctx2) => {
    px(c, WATER, 0, 0, 16, 16); px(c, WATER_D, 0, 8, 16, 8);
    px(c, '#7cc6f4', 0, 0, 16, 1);
    for (const [x, y] of [[1, 3], [9, 2], [4, 7], [11, 9], [2, 12], [9, 14]]) { px(c, RIPPLE, x, y, 4, 1); px(c, RIPPLE, x + 1, y - 1, 2, 1); px(c, RIPPLE, x + 4, y + 1, 1, 1); }
  };
  /** 條紋帳篷頂：直條紋，下緣一圈鋸齒，頂端有尖 */
  const tentRoof = (c: Ctx2, a: string, aD: string, b: string, bD: string) => {
    for (let x = 0; x < 16; x++) {
      const stripe = Math.floor(x / 4) % 2 === 0;
      px(c, stripe ? a : b, x, 0, 1, 16); px(c, stripe ? aD : bD, x, 11, 1, 5);
    }
    px(c, OUT, 0, 0, 16, 1);
    // 下緣鋸齒（深色三角）
    for (let x = 0; x < 16; x += 4) { px(c, OUT, x, 15, 4, 1); px(c, OUT, x + 1, 14, 2, 1); }
    // 斜向高光
    for (let i = 0; i < 4; i++) px(c, '#ffffff', 1 + i * 4, 2 + i % 2, 1, 2);
  };
  /** 帳篷牆：素色，帶一條彩旗邊與小窗 */
  const tentWall = (c: Ctx2, base: string, dark: string, flag1: string, flag2: string) => {
    px(c, base, 0, 0, 16, 16); px(c, dark, 0, 14, 16, 2);
    for (let x = 0; x < 16; x += 4) { px(c, x % 8 ? flag2 : flag1, x, 0, 4, 1); px(c, x % 8 ? flag2 : flag1, x + 1, 1, 2, 1); }
    px(c, dark, 0, 2, 16, 1);
  };

  // ───── 地形 ─────
  make('t_park_brick', 16, 16, (c) => brick(c, 81));
  make('t_park_grass', 16, 16, (c) => grass(c, 82));
  // 彩色小徑：紅黃藍相間的小方磚
  make('t_park_path', 16, 16, (c) => {
    px(c, '#fff3d0', 0, 0, 16, 16);
    const cols: [string, string][] = [['#ff5a5a', '#c93a3a'], ['#ffd23f', '#d6a21a'], ['#4aa8f0', '#2a78c0']];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const [m, d] = cols[(i + j) % 3];
      px(c, m, i * 4 + 1, j * 4 + 1, 3, 3); px(c, d, i * 4 + 1, j * 4 + 3, 3, 1); px(c, '#ffffff', i * 4 + 1, j * 4 + 1, 1, 1);
    }
  });
  // 鏡廳地磚：淡黑白棋盤
  make('t_mirror_floor', 16, 16, (c) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) px(c, (i + j) % 2 ? '#8e8aa0' : '#eeeaf6', i * 4, j * 4, 4, 4);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) px(c, '#ffffff', i * 4, j * 4, 1, 1);
    px(c, '#6c6884', 0, 0, 16, 1);
  });
  // 花叢（不可走）：草地上粉紅與黃色的花
  make('t_park_flower', 16, 16, (c) => {
    grass(c, 83);
    const flower = (x: number, y: number, petal: string, mid: string) => {
      px(c, '#2f8f3a', x + 1, y + 3, 1, 3);
      px(c, petal, x + 1, y, 1, 3); px(c, petal, x, y + 1, 3, 1); px(c, mid, x + 1, y + 1, 1, 1);
      px(c, petal, x, y, 1, 1); px(c, petal, x + 2, y + 2, 1, 1);
    };
    flower(1, 1, '#ff7fb8', '#fff070'); flower(8, 0, '#ffe04a', '#ff7a3a'); flower(12, 5, '#ff7fb8', '#fff070');
    flower(3, 7, '#c78cff', '#fff070'); flower(9, 9, '#ff7fb8', '#ffffff'); flower(0, 11, '#ffe04a', '#ff7a3a'); flower(13, 11, '#c78cff', '#fff070');
  });
  // 彩旗柵欄（不可走）：草地上的木柵欄，掛一串三角彩旗
  make('t_park_fence', 16, 16, (c) => {
    grass(c, 84);
    px(c, '#7a4a22', 0, 9, 16, 2); px(c, '#7a4a22', 0, 13, 16, 2); px(c, '#d49a5a', 0, 9, 16, 1); px(c, '#d49a5a', 0, 13, 16, 1);
    for (const x of [1, 7, 13]) { px(c, '#7a4a22', x, 6, 3, 10); px(c, '#d49a5a', x, 6, 1, 10); px(c, '#5a3414', x + 2, 7, 1, 9); px(c, '#d49a5a', x, 5, 3, 1); }
    // 一條繩，三角旗
    px(c, '#5a3414', 0, 1, 16, 1);
    const flag = (x: number, col: string) => { px(c, col, x, 2, 4, 1); px(c, col, x + 1, 3, 2, 1); px(c, col, x + 1, 4, 1, 1); px(c, '#ffffff', x, 2, 1, 1); };
    flag(0, '#ff5a5a'); flag(4, '#ffd23f'); flag(8, '#4aa8f0'); flag(12, '#c78cff');
  });
  // 水溝（不可走）
  make('t_park_canal', 16, 16, (c) => canal(c));
  // 噴水池（不可走）：石池、藍水、中間水柱
  make('t_park_fountain', 16, 16, (c) => {
    brick(c, 85);
    px(c, OUT, 1, 1, 14, 14); px(c, '#bdb5c8', 2, 2, 12, 12); px(c, '#e8e2f0', 2, 2, 12, 1); px(c, '#8f88a0', 2, 13, 12, 1);
    px(c, WATER, 3, 3, 10, 10); px(c, WATER_D, 3, 9, 10, 4); px(c, RIPPLE, 3, 11, 3, 1); px(c, RIPPLE, 10, 5, 3, 1);
    // 中間水柱與水花
    px(c, '#bde6ff', 7, 3, 2, 8); px(c, '#ffffff', 7, 3, 1, 7);
    px(c, '#bde6ff', 5, 4, 1, 3); px(c, '#bde6ff', 10, 4, 1, 3); px(c, '#ffffff', 6, 3, 1, 1); px(c, '#ffffff', 9, 3, 1, 1);
    px(c, '#ffffff', 6, 11, 4, 1); px(c, '#bdb5c8', 6, 10, 4, 1); px(c, '#ffffff', 7, 10, 2, 1);
  });

  // ───── 帳篷屋：條紋帳篷頂、素色牆 ─────
  make('t_roof_tent', 16, 16, (c) => tentRoof(c, '#ff5a5a', '#d63a3a', '#fff5f0', '#e8d8d0'));
  make('t_wall_tent', 16, 16, (c) => {
    tentWall(c, '#fff0e0', '#e0c8b0', '#ff5a5a', '#ffd23f');
    px(c, OUT, 5, 5, 6, 10); px(c, OUT, 6, 4, 4, 1); px(c, '#ff7fb8', 6, 6, 4, 9); px(c, '#ff7fb8', 7, 5, 2, 1); px(c, '#fff070', 9, 10, 1, 1);
  });
  make('t_roof_inn_tent', 16, 16, (c) => tentRoof(c, '#ffd23f', '#d6a21a', '#fffbe8', '#ece0b8'));
  make('t_wall_inn_tent', 16, 16, (c) => {
    tentWall(c, '#fffbe0', '#e0d49a', '#ffd23f', '#ff9a3a');
    for (const x of [1, 9]) { px(c, OUT, x, 5, 6, 8); px(c, OUT, x + 1, 4, 4, 1); px(c, '#ffe680', x + 1, 6, 4, 6); px(c, '#ffe680', x + 2, 5, 2, 1); px(c, '#fffbd0', x + 1, 6, 2, 2); px(c, '#d6a21a', x + 2, 6, 1, 6); }
  });
  make('t_roof_shop_tent', 16, 16, (c) => tentRoof(c, '#4aa8f0', '#2a78c0', '#f0f8ff', '#c8d8e8'));
  make('t_wall_shop_tent', 16, 16, (c) => {
    tentWall(c, '#eef6ff', '#b8c8dc', '#4aa8f0', '#ff7fb8');
    px(c, OUT, 1, 5, 14, 8); px(c, '#fffbe8', 2, 6, 12, 6); px(c, '#ffffff', 3, 7, 3, 1); px(c, '#ff5a5a', 8, 8, 3, 3); px(c, '#ffd23f', 11, 9, 2, 3);
  });
  // 鏡牆（不可走）：銀藍色鏡面，斜光
  make('t_mirror_wall', 16, 16, (c) => {
    px(c, '#9ab4d8', 0, 0, 16, 16); px(c, '#b8d0ec', 1, 1, 14, 14); px(c, '#7e98c0', 0, 0, 16, 1); px(c, '#7e98c0', 0, 15, 16, 1); px(c, '#7e98c0', 0, 0, 1, 16); px(c, '#7e98c0', 15, 0, 1, 16);
    for (let i = 0; i < 9; i++) { px(c, '#ffffff', 2 + i, 11 - i, 1, 1); px(c, '#e4f0ff', 3 + i, 11 - i, 1, 1); }
    for (let i = 0; i < 4; i++) px(c, '#ffffff', 9 + i, 14 - i, 1, 1);
    px(c, '#ffffff', 2, 3, 2, 1); px(c, '#8ea8cc', 11, 4, 3, 1); px(c, '#8ea8cc', 3, 9, 2, 1);
  });

  // ───── 物件（背景透明，放在草地／磚地上）─────
  /** 旋轉木馬：平台、中柱、傘狀頂、兩匹木馬；on＝燈亮、木馬抬頭 */
  const carousel = (c: Ctx2, on: boolean) => {
    const roofA = on ? '#ff5a5a' : '#9a8c96';
    const roofB = on ? '#fff5f0' : '#c4bcc4';
    const horse = on ? '#fff0f4' : '#a8a0b0';
    const mane = on ? '#ff7fb8' : '#6c6478';
    // 平台
    px(c, OUT, 0, 12, 16, 4); px(c, on ? '#ffd23f' : '#8c8078', 1, 12, 14, 2); px(c, on ? '#c78cff' : '#6c6478', 1, 14, 14, 1);
    // 三根柱子
    for (const x of [1, 7, 14]) { px(c, on ? '#ffe680' : '#948c8c', x, 5, 1, 7); }
    // 傘頂：一層層加寬，直條紋
    const rows: [number, number, number][] = [[0, 7, 2], [1, 5, 6], [2, 3, 10], [3, 1, 14], [4, 0, 16]];
    for (const [y, x0, w] of rows) {
      px(c, OUT, x0, y, w, 1);
      for (let x = x0 + 1; x < x0 + w - 1; x++) px(c, Math.floor(x / 2) % 2 ? roofB : roofA, x, y, 1, 1);
    }
    px(c, OUT, 0, 5, 16, 1);
    px(c, on ? '#fff070' : '#6c6478', 7, 0, 2, 1);
    // 燈泡
    for (const x of [1, 4, 7, 10, 14]) px(c, on ? '#fff070' : '#6c6478', x, 6, 1, 1);
    // 木馬：身體、四條腿、頭（抬頭／低頭）與鬃毛
    const pony = (x: number, up: boolean) => {
      const y = 8;
      px(c, horse, x, y, 5, 3); px(c, OUT, x, y + 3, 1, 1); px(c, OUT, x + 4, y + 3, 1, 1); px(c, OUT, x + 1, y + 3, 1, 1); px(c, OUT, x + 3, y + 3, 1, 1);
      px(c, mane, x, y, 1, 2); px(c, OUT, x, y + 2, 5, 1);
      if (up) { px(c, horse, x + 4, y - 2, 2, 3); px(c, mane, x + 4, y - 2, 1, 1); px(c, OUT, x + 5, y - 1, 1, 1); }
      else { px(c, horse, x + 4, y + 1, 2, 3); px(c, OUT, x + 5, y + 3, 1, 1); px(c, mane, x + 4, y, 1, 1); }
    };
    pony(2, on); pony(8, on);
    if (!on) { px(c, '#5a5266', 3, 7, 3, 1); px(c, '#5a5266', 9, 7, 3, 1); }
    else { px(c, '#ffffff', 3, 1, 1, 1); px(c, '#ffffff', 12, 3, 1, 1); }
  };
  make('carousel_asleep', 16, 16, (c) => carousel(c, false));
  make('carousel_on', 16, 16, (c) => carousel(c, true));

  // 氣球：洩氣＝軟趴趴地躺在地上；鼓起＝大圓球飄起帶繩
  make('balloon_flat', 16, 16, (c) => {
    px(c, OUT, 2, 10, 10, 5); px(c, OUT, 4, 9, 6, 1); px(c, OUT, 12, 12, 2, 2);
    px(c, '#d94a4a', 3, 11, 8, 3); px(c, '#d94a4a', 5, 10, 4, 1); px(c, '#ff7a7a', 4, 11, 4, 1); px(c, '#9a2a2a', 3, 13, 8, 1);
    px(c, '#d94a4a', 12, 12, 1, 1); px(c, OUT, 13, 11, 1, 1); px(c, '#ffd23f', 14, 12, 1, 2);
    px(c, OUT, 5, 12, 1, 1); px(c, OUT, 8, 12, 1, 1);
  });
  make('balloon_big', 16, 16, (c) => {
    px(c, OUT, 2, 1, 12, 10); px(c, OUT, 4, 0, 8, 12); px(c, OUT, 6, 12, 4, 1);
    px(c, '#ff4a4a', 3, 2, 10, 8); px(c, '#ff4a4a', 5, 1, 6, 10); px(c, '#ff4a4a', 7, 11, 2, 1);
    px(c, '#c42a3a', 10, 4, 3, 5); px(c, '#c42a3a', 6, 9, 5, 2);
    px(c, '#ff9a9a', 4, 3, 3, 3); px(c, '#ffffff', 4, 3, 2, 2);
    px(c, OUT, 7, 12, 2, 1);
    // 繩子
    px(c, '#5a3a6a', 8, 13, 1, 1); px(c, '#5a3a6a', 7, 14, 1, 1); px(c, '#5a3a6a', 8, 15, 1, 1);
  });

  // 摩天輪缺口：水溝一格，岸邊兩個支架，中間斷開
  make('ferris_gap', 16, 16, (c) => {
    canal(c);
    for (const x of [0, 13]) {
      px(c, OUT, x, 2, 3, 12); px(c, '#ff5a5a', x + 1, 3, 1, 10); px(c, '#ffd23f', x + 1, 5, 1, 1); px(c, '#ffd23f', x + 1, 9, 1, 1);
      px(c, OUT, x - 0, 1, 3, 1);
    }
    // 兩端伸出的短短車廂臂
    px(c, OUT, 3, 5, 2, 1); px(c, OUT, 11, 5, 2, 1); px(c, '#ffd23f', 3, 6, 1, 1); px(c, '#ffd23f', 12, 6, 1, 1);
    // 缺口：深色水
    px(c, '#1f6aa8', 5, 7, 6, 6); px(c, '#17588e', 5, 11, 6, 2);
  });
  // 摩天輪橋：一排彩色車廂排成橋
  make('ferris_bridge', 16, 16, (c) => {
    canal(c);
    px(c, OUT, 0, 4, 16, 1); px(c, OUT, 0, 11, 16, 1);
    const cabin = (x: number, col: string, hi: string) => {
      px(c, OUT, x, 5, 5, 6); px(c, col, x + 1, 6, 3, 4); px(c, hi, x + 1, 6, 3, 1); px(c, '#ffffff', x + 2, 7, 1, 1); px(c, OUT, x + 2, 4, 1, 1);
    };
    cabin(0, '#ff5a5a', '#ff9a9a'); cabin(5, '#ffd23f', '#fff070'); cabin(10, '#c78cff', '#e4c8ff');
    px(c, '#2f86cc', 1, 12, 14, 1);
  });

  // 煙火筒：黑色粗筒、導火線；點燃時筒口噴出火花
  const cannon = (c: Ctx2, lit: boolean) => {
    const y0 = lit ? 8 : 4;
    px(c, OUT, 4, y0, 8, 15 - y0); px(c, '#3c3c4a', 5, y0, 6, 15 - y0); px(c, '#6c6c80', 5, y0, 1, 15 - y0); px(c, '#222230', 10, y0, 1, 15 - y0);
    px(c, '#ffd23f', 5, y0 + 2, 6, 1); px(c, '#ff5a5a', 5, y0 + 4, 6, 1);
    px(c, OUT, 3, 14, 10, 2); px(c, '#6c6c80', 4, 14, 8, 1);
    px(c, '#2a2a38', 5, y0 - 1, 6, 1);
    if (!lit) {
      px(c, '#b08850', 8, 2, 1, 2); px(c, '#b08850', 9, 1, 1, 1); px(c, '#ff9a3a', 10, 0, 1, 1);
    } else {
      px(c, '#ff5a5a', 7, 5, 2, 3); px(c, '#ffd23f', 7, 3, 2, 2); px(c, '#ffffff', 8, 4, 1, 1);
      for (const [x, y, col] of [[3, 2, '#ffd23f'], [12, 2, '#ff7fb8'], [1, 5, '#ff5a5a'], [14, 5, '#4aa8f0'], [5, 0, '#c78cff'], [10, 0, '#ffd23f'], [2, 7, '#fff070'], [13, 7, '#ffffff']] as [number, number, string][]) px(c, col, x, y, 1, 1);
      px(c, '#ffd23f', 4, 3, 1, 1); px(c, '#ff7fb8', 11, 3, 1, 1);
    }
  };
  make('fireworks_cannon', 16, 16, (c) => cannon(c, false));
  make('fireworks_lit', 16, 16, (c) => cannon(c, true));

  // 大鑼：金色圓鑼掛在木架上；敲響＝鑼面外圈波紋
  const gong = (c: Ctx2, hit: boolean) => {
    // 木架
    px(c, OUT, 0, 14, 16, 2); px(c, '#a86a30', 1, 14, 14, 1);
    px(c, OUT, 1, 1, 3, 14); px(c, '#a86a30', 2, 2, 1, 12); px(c, OUT, 12, 1, 3, 14); px(c, '#a86a30', 13, 2, 1, 12);
    px(c, OUT, 1, 0, 14, 2); px(c, '#c88a48', 2, 1, 12, 1);
    px(c, '#ff5a5a', 4, 1, 1, 1); px(c, '#ff5a5a', 11, 1, 1, 1);
    // 鑼面
    px(c, OUT, 4, 3, 8, 10); px(c, OUT, 3, 4, 10, 8); px(c, OUT, 5, 2, 6, 12);
    px(c, '#ffc83a', 5, 4, 6, 8); px(c, '#ffc83a', 4, 5, 8, 6); px(c, '#ffc83a', 6, 3, 4, 10);
    px(c, '#fff08a', 5, 4, 3, 1); px(c, '#fff08a', 4, 5, 1, 3); px(c, '#d99a1a', 6, 6, 4, 4); px(c, '#ffe05a', 7, 7, 2, 2); px(c, '#a86a1a', 5, 11, 5, 1);
    if (hit) {
      for (const [x, y, w, h] of [[0, 4, 1, 8], [15, 4, 1, 8], [4, 0, 8, 1]] as [number, number, number, number][]) px(c, '#fff070', x, y, w, h);
      px(c, '#ff7fb8', 3, 2, 1, 1); px(c, '#ff7fb8', 12, 2, 1, 1); px(c, '#ffffff', 2, 8, 1, 1); px(c, '#ffffff', 13, 8, 1, 1);
    }
  };
  make('gong', 16, 16, (c) => gong(c, false));
  make('gong_hit', 16, 16, (c) => gong(c, true));

  // 小火車（碼頭）：紅色車頭、煙囪冒煙、一小段鐵軌
  make('train', 16, 16, (c) => {
    // 鐵軌與枕木
    px(c, '#6a4a2a', 0, 14, 16, 2); for (let x = 1; x < 16; x += 4) px(c, '#9a6a3a', x, 14, 2, 2);
    px(c, '#9a98a8', 0, 13, 16, 1);
    // 車身
    px(c, OUT, 1, 6, 14, 7); px(c, '#ff4a4a', 2, 7, 12, 5); px(c, '#ff8a8a', 2, 7, 12, 1); px(c, '#c42a3a', 2, 11, 12, 1);
    // 駕駛室
    px(c, OUT, 9, 2, 6, 5); px(c, '#ffd23f', 10, 3, 4, 3); px(c, '#4aa8f0', 11, 4, 2, 2);
    // 煙囪與煙
    px(c, OUT, 2, 3, 3, 4); px(c, '#3c3c4a', 3, 3, 1, 3); px(c, OUT, 1, 2, 5, 1);
    px(c, '#e8e8f0', 2, 0, 2, 1); px(c, '#ffffff', 4, 1, 1, 1);
    // 車輪
    for (const x of [2, 6, 11]) { px(c, OUT, x, 11, 3, 3); px(c, '#ffd23f', x + 1, 12, 1, 1); }
    px(c, '#ffd23f', 0, 9, 1, 2);
  });

  // 遊樂園大門（出入口）：彩旗拱門，頂上一顆星，門洞下面是彩色小徑
  make('park_gate', 16, 16, (c) => {
    // 門洞：深色的通道
    px(c, '#4a2a6a', 4, 5, 8, 11); px(c, '#4a2a6a', 5, 4, 6, 1); px(c, '#7a4aa8', 5, 6, 6, 10); px(c, '#7a4aa8', 6, 5, 4, 1);
    // 彩色小徑
    px(c, '#ff5a5a', 5, 13, 2, 3); px(c, '#ffd23f', 7, 13, 2, 3); px(c, '#4aa8f0', 9, 13, 2, 3); px(c, '#ffffff', 5, 13, 1, 1);
    // 左右柱（紅黃條紋）
    for (const x of [0, 12]) {
      px(c, OUT, x, 4, 4, 12);
      for (let y = 5; y < 16; y++) px(c, Math.floor((y - 5) / 2) % 2 ? '#fff5f0' : '#ff5a5a', x + 1, y, 2, 1);
    }
    // 拱頂橫樑
    px(c, OUT, 0, 2, 16, 3); px(c, '#ffd23f', 1, 3, 14, 1);
    // 星星
    px(c, OUT, 6, 0, 4, 1); px(c, '#fff070', 7, 0, 2, 1); px(c, '#fff070', 6, 1, 4, 1);
    px(c, OUT, 5, 1, 1, 1); px(c, OUT, 10, 1, 1, 1); px(c, '#ffffff', 7, 1, 1, 1);
    // 彩旗
    const flag = (x: number, col: string) => { px(c, col, x, 5, 2, 1); px(c, col, x, 6, 1, 1); };
    flag(4, '#ff7fb8'); flag(6, '#4aa8f0'); flag(8, '#ffd23f'); flag(10, '#c78cff');
  });
}
