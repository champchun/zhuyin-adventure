// 第九關（古堡）的地形與物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，
// 預覽或測試時也可以傳入假的畫布。夜晚的紫藍色調加橘色點綴，友善可愛、不陰森。
import type { Ctx2, Make, Px } from './snowArt';

/** 簡單的決定性亂數 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 新增的圖樣 key（測試檢查用）：t_ 開頭是地形圖塊（畫滿 16×16），其餘是物件 */
export const HAUNT_TEXTURES = [
  't_haunt_stone', 't_haunt_grass', 't_haunt_path', 't_castle_floor', 't_haunt_tree', 't_haunt_fence', 't_haunt_moat', 't_haunt_pond',
  't_roof_pumpkin', 't_wall_pumpkin', 't_roof_inn_haunt', 't_wall_inn_haunt', 't_roof_shop_haunt', 't_wall_shop_haunt', 't_castle_wall',
  'spiderweb_thick', 'spiderweb_clear', 'pumpkin_dark', 'pumpkin_lit', 'drawbridge_gap', 'drawbridge',
  'ghost_door', 'ghost_door_open', 'broom', 'haunt_gate',
] as const;

const OUT = '#1c1030';
const WATER = '#3a3a8a';
const WATER_D = '#2a2a6a';
const RIPPLE = '#9a9ae0';

export function drawHauntTextures(make: Make, px: Px) {
  const stone = (c: Ctx2, seed: number) => {
    px(c, '#6f7ca0', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 8) px(c, '#59668a', 0, y + 7, 16, 1);
    px(c, '#59668a', 5, 0, 1, 7); px(c, '#59668a', 12, 8, 1, 7);
    const r = rng(seed);
    for (let i = 0; i < 6; i++) px(c, r() < 0.5 ? '#8a8ab8' : '#8493b4', Math.floor(r() * 13), Math.floor(r() * 14), 3, 1);
    px(c, '#9a8ac8', 1, 2, 2, 1); px(c, '#9a8ac8', 8, 10, 2, 1);
  };
  const grass = (c: Ctx2, seed: number) => {
    px(c, '#3a5a5a', 0, 0, 16, 16);
    const r = rng(seed);
    for (let i = 0; i < 10; i++) px(c, r() < 0.5 ? '#4e7a64' : '#5a4a8a', Math.floor(r() * 14), Math.floor(r() * 14), 1, 2);
    for (let i = 0; i < 3; i++) px(c, '#7aa87a', Math.floor(r() * 14), Math.floor(r() * 14), 1, 1);
  };
  /** 護城河：深藍紫水＋淺色波紋，吊橋兩張圖也用它當底，才接得起來 */
  const moat = (c: Ctx2) => {
    px(c, WATER, 0, 0, 16, 16); px(c, WATER_D, 0, 8, 16, 8);
    px(c, '#5a5ab0', 0, 0, 16, 1);
    for (const [x, y] of [[1, 3], [9, 2], [4, 7], [11, 9], [2, 12], [9, 14]]) { px(c, RIPPLE, x, y, 4, 1); px(c, RIPPLE, x + 1, y - 1, 2, 1); }
  };
  /** 屋頂：橫向瓦片，頂端有一小排裝飾 */
  const roof = (c: Ctx2, a: string, aD: string, aL: string) => {
    px(c, a, 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      px(c, aD, 0, y + 3, 16, 1);
      const o = (y / 4) % 2 ? 0 : 3;
      for (let x = o; x < 16; x += 6) { px(c, aL, x, y, 3, 1); px(c, aD, x + 5, y, 1, 3); }
    }
    px(c, OUT, 0, 0, 16, 1); px(c, OUT, 0, 15, 16, 1);
  };
  const wall = (c: Ctx2, base: string, dark: string) => {
    px(c, base, 0, 0, 16, 16); px(c, dark, 0, 14, 16, 2); px(c, dark, 0, 0, 16, 1);
    px(c, dark, 0, 7, 1, 1); px(c, dark, 8, 4, 1, 1);
  };

  // ───── 地形 ─────
  make('t_haunt_stone', 16, 16, (c) => stone(c, 91));
  make('t_haunt_grass', 16, 16, (c) => grass(c, 92));
  // 南瓜小徑：橘褐色小方磚
  make('t_haunt_path', 16, 16, (c) => {
    px(c, '#6a3a1a', 0, 0, 16, 16);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const o = j % 2 ? 2 : 0;
      const x = (i * 4 + o) % 16;
      px(c, (i + j) % 3 ? '#d8782a' : '#e8923a', x + 1, j * 4 + 1, 3, 3);
      px(c, '#a85a1a', x + 1, j * 4 + 3, 3, 1); px(c, '#f8b05a', x + 1, j * 4 + 1, 1, 1);
    }
  });
  // 古堡地磚：深紫灰棋盤
  make('t_castle_floor', 16, 16, (c) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) px(c, (i + j) % 2 ? '#4a4468' : '#5e5882', i * 4, j * 4, 4, 4);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) px(c, '#7a74a0', i * 4, j * 4, 2, 1);
    px(c, '#363054', 0, 15, 16, 1); px(c, '#363054', 15, 0, 1, 16);
  });
  // 枯樹叢（不可走）：彎彎的黑紫小樹，掛一顆小南瓜
  make('t_haunt_tree', 16, 16, (c) => {
    grass(c, 93);
    px(c, '#2a1a3a', 7, 7, 3, 9); px(c, '#4a3a5a', 7, 7, 1, 9);
    px(c, '#2a1a3a', 5, 6, 2, 2); px(c, '#2a1a3a', 3, 4, 2, 2); px(c, '#2a1a3a', 2, 2, 2, 2);
    px(c, '#2a1a3a', 10, 5, 2, 2); px(c, '#2a1a3a', 12, 3, 2, 2); px(c, '#2a1a3a', 13, 1, 2, 2);
    px(c, '#2a1a3a', 8, 3, 2, 4); px(c, '#2a1a3a', 7, 1, 2, 2); px(c, '#2a1a3a', 5, 3, 1, 1);
    px(c, '#4a3a5a', 3, 4, 1, 1); px(c, '#4a3a5a', 11, 5, 1, 1);
    // 小南瓜
    px(c, OUT, 1, 9, 5, 4); px(c, '#ff9a2a', 2, 9, 3, 4); px(c, '#ff9a2a', 1, 10, 5, 2); px(c, '#ffc060', 2, 10, 1, 1);
    px(c, '#2a8a3a', 3, 8, 1, 1); px(c, '#2a1a3a', 3, 7, 1, 1);
  });
  // 鐵欄杆（不可走）：黑色欄杆、小尖頂
  make('t_haunt_fence', 16, 16, (c) => {
    grass(c, 94);
    px(c, '#2a2438', 0, 8, 16, 2); px(c, '#2a2438', 0, 13, 16, 2); px(c, '#5a5470', 0, 8, 16, 1);
    for (const x of [1, 5, 9, 13]) {
      px(c, '#2a2438', x, 5, 2, 11); px(c, '#5a5470', x, 5, 1, 11);
      px(c, '#2a2438', x, 3, 2, 2); px(c, '#2a2438', x, 2, 1, 1); px(c, '#8a84a8', x, 3, 1, 1);
    }
  });
  make('t_haunt_moat', 16, 16, (c) => moat(c));
  // 魔法池（不可走）：石邊、紫色池水、冒泡亮點
  make('t_haunt_pond', 16, 16, (c) => {
    stone(c, 95);
    px(c, OUT, 1, 1, 14, 14); px(c, '#8a84a8', 2, 2, 12, 12); px(c, '#b0aad0', 2, 2, 12, 1);
    px(c, '#8a3ad0', 3, 3, 10, 10); px(c, '#6a2aa8', 3, 9, 10, 4); px(c, '#b070f0', 3, 3, 10, 1);
    for (const [x, y] of [[5, 5], [9, 4], [8, 8], [11, 10], [4, 10]]) { px(c, '#f0d8ff', x, y, 1, 1); }
    px(c, '#ffffff', 9, 4, 1, 1); px(c, '#e8b8ff', 5, 6, 1, 1); px(c, '#e8b8ff', 8, 7, 2, 1); px(c, '#e8b8ff', 11, 9, 1, 1);
  });

  // ───── 屋子：南瓜屋、紫色旅館、綠色商店 ─────
  make('t_roof_pumpkin', 16, 16, (c) => {
    roof(c, '#f08a2a', '#c8601a', '#ffb050');
    px(c, '#2a8a3a', 7, 0, 2, 2); px(c, '#4ac060', 8, 1, 1, 1);
  });
  make('t_wall_pumpkin', 16, 16, (c) => {
    wall(c, '#d8c0a0', '#a88a6a');
    px(c, OUT, 5, 5, 6, 10); px(c, OUT, 6, 4, 4, 1); px(c, '#8a4a2a', 6, 6, 4, 9); px(c, '#8a4a2a', 7, 5, 2, 1); px(c, '#ffd23f', 9, 10, 1, 1);
    px(c, '#ffd870', 1, 6, 2, 2); px(c, '#ffd870', 13, 6, 2, 2);
  });
  make('t_roof_inn_haunt', 16, 16, (c) => {
    roof(c, '#7a4ab8', '#5a2f94', '#9a6ad8');
    for (const [x, y] of [[3, 2], [11, 2], [7, 6], [2, 9], [12, 9], [7, 12]]) { px(c, '#ffe870', x, y, 1, 1); px(c, '#fff8c0', x, y - 1, 1, 1); px(c, '#fff8c0', x, y + 1, 1, 1); px(c, '#fff8c0', x - 1, y, 1, 1); px(c, '#fff8c0', x + 1, y, 1, 1); }
  });
  make('t_wall_inn_haunt', 16, 16, (c) => {
    wall(c, '#c8b8e0', '#9a88b8');
    for (const x of [1, 9]) { px(c, OUT, x, 5, 6, 8); px(c, OUT, x + 1, 4, 4, 1); px(c, '#ffe680', x + 1, 6, 4, 6); px(c, '#ffe680', x + 2, 5, 2, 1); px(c, '#fff8c0', x + 1, 6, 2, 2); px(c, '#c89a30', x + 2, 6, 1, 6); }
  });
  make('t_roof_shop_haunt', 16, 16, (c) => {
    roof(c, '#3a9a6a', '#2a7a52', '#5ac08a');
    for (let x = 0; x < 16; x += 4) px(c, '#e8fff0', x, 5, 2, 3);
  });
  make('t_wall_shop_haunt', 16, 16, (c) => {
    wall(c, '#d0e4d4', '#9ab8a0');
    px(c, OUT, 1, 5, 14, 8); px(c, '#fff4d0', 2, 6, 12, 6); px(c, '#ffffff', 3, 7, 3, 1); px(c, '#ff9a2a', 8, 8, 3, 3); px(c, '#7a4ab8', 11, 9, 2, 3);
  });
  // 古堡石牆（不可走）：灰石磚帶一點苔蘚
  make('t_castle_wall', 16, 16, (c) => {
    px(c, '#8a8aa0', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#5a5a74', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) { const o = (y / 4) % 2 ? 0 : 4; px(c, '#5a5a74', o + 2, y, 1, 3); px(c, '#5a5a74', o + 10, y, 1, 3); }
    for (let y = 0; y < 16; y += 4) px(c, '#a8a8c0', (y / 4) % 2 ? 3 : 7, y, 3, 1);
    px(c, '#5a9a5a', 1, 0, 3, 1); px(c, '#5a9a5a', 1, 1, 1, 1); px(c, '#7ac07a', 2, 0, 1, 1);
    px(c, '#5a9a5a', 11, 8, 3, 1); px(c, '#5a9a5a', 13, 9, 1, 1); px(c, '#5a9a5a', 5, 12, 2, 1);
  });

  // ───── 物件（背景透明，放在石板／地磚上）─────
  /** 蜘蛛網：thick＝灰白大網＋小黑蜘蛛；clear＝網破一半、蜘蛛不見 */
  make('spiderweb_thick', 16, 16, (c) => {
    const W = '#e8e8f4';
    // 外框：左上到右下的三角大網，由中心放射
    for (let i = 0; i < 14; i++) { px(c, W, 1 + i, 1, 1, 1); px(c, W, 1, 1 + i, 1, 1); px(c, W, 1 + i, 14, 1, 1); px(c, W, 14, 1 + i, 1, 1); }
    for (let i = 0; i < 14; i++) { px(c, W, 1 + i, 1 + i, 1, 1); px(c, W, 14 - i, 1 + i, 1, 1); }
    px(c, W, 8, 1, 1, 14); px(c, W, 1, 8, 14, 1);
    // 內圈
    for (let i = 4; i <= 11; i++) { px(c, '#b8b8d0', i, 4, 1, 1); px(c, '#b8b8d0', i, 11, 1, 1); px(c, '#b8b8d0', 4, i, 1, 1); px(c, '#b8b8d0', 11, i, 1, 1); }
    // 小蜘蛛
    px(c, OUT, 6, 6, 4, 4); px(c, '#3a2a5a', 7, 7, 2, 2);
    for (const [x, y] of [[5, 5], [10, 5], [5, 10], [10, 10], [4, 7], [11, 7], [4, 8], [11, 8]]) px(c, OUT, x, y, 1, 1);
    px(c, '#ffffff', 6, 7, 1, 1); px(c, '#ffffff', 9, 7, 1, 1);
  });
  make('spiderweb_clear', 16, 16, (c) => {
    const W = '#e8e8f4';
    // 只剩左上一半的網，邊緣破破的
    for (let i = 0; i < 9; i++) { px(c, W, 1 + i, 1, 1, 1); px(c, W, 1, 1 + i, 1, 1); }
    for (let i = 0; i < 8; i++) px(c, W, 1 + i, 1 + i, 1, 1);
    px(c, W, 8, 1, 1, 5); px(c, W, 1, 8, 5, 1);
    for (let i = 4; i <= 8; i++) px(c, '#b8b8d0', i, 4, 1, 1);
    for (let i = 4; i <= 7; i++) px(c, '#b8b8d0', 4, i, 1, 1);
    // 飄落的碎絲
    px(c, '#b8b8d0', 10, 9, 2, 1); px(c, W, 12, 11, 1, 1); px(c, '#b8b8d0', 7, 12, 1, 2); px(c, W, 11, 13, 2, 1);
    // 閃亮的小星
    px(c, '#fff070', 12, 3, 1, 1); px(c, '#fff8c0', 11, 3, 1, 1); px(c, '#fff8c0', 13, 3, 1, 1); px(c, '#fff8c0', 12, 2, 1, 1); px(c, '#fff8c0', 12, 4, 1, 1);
  });

  /** 南瓜燈：dark＝灰橘色、眼嘴黑；lit＝亮橘色、眼嘴發黃光 */
  const pumpkin = (c: Ctx2, lit: boolean) => {
    const body = lit ? '#ff9a1a' : '#b07a58';
    const hi = lit ? '#ffc84a' : '#c8987a';
    const lo = lit ? '#d86a0a' : '#8a5a42';
    px(c, OUT, 1, 5, 14, 10); px(c, OUT, 3, 4, 10, 1); px(c, OUT, 3, 15, 10, 1);
    px(c, body, 2, 6, 12, 8); px(c, body, 3, 5, 10, 1); px(c, body, 3, 14, 10, 1);
    px(c, lo, 5, 5, 1, 10); px(c, lo, 10, 5, 1, 10); px(c, lo, 2, 12, 12, 2);
    px(c, hi, 3, 6, 2, 2); px(c, hi, 11, 6, 1, 1);
    // 蒂頭
    px(c, OUT, 7, 1, 3, 4); px(c, lit ? '#3aa04a' : '#5a7a5a', 8, 2, 1, 3); px(c, lit ? '#4ac060' : '#6a8a6a', 9, 3, 1, 1);
    const f = lit ? '#fff070' : OUT;
    // 三角眼、彎彎笑嘴
    px(c, f, 4, 7, 3, 1); px(c, f, 5, 8, 1, 1); px(c, f, 9, 7, 3, 1); px(c, f, 10, 8, 1, 1);
    px(c, f, 4, 10, 8, 1); px(c, f, 5, 11, 1, 1); px(c, f, 7, 11, 2, 1); px(c, f, 10, 11, 1, 1);
    if (lit) { px(c, '#fff8c0', 5, 7, 1, 1); px(c, '#fff8c0', 10, 7, 1, 1); px(c, '#fff8c0', 7, 10, 2, 1); px(c, '#fff070', 0, 3, 1, 1); px(c, '#fff070', 15, 3, 1, 1); px(c, '#fff070', 1, 1, 1, 1); px(c, '#fff070', 14, 1, 1, 1); }
  };
  make('pumpkin_dark', 16, 16, (c) => pumpkin(c, false));
  make('pumpkin_lit', 16, 16, (c) => pumpkin(c, true));

  // 護城河缺口：水一格，岸邊兩個石柱，中間斷開（畫滿整格）
  make('drawbridge_gap', 16, 16, (c) => {
    moat(c);
    for (const x of [0, 13]) {
      px(c, OUT, x, 2, 3, 12); px(c, '#8a8aa0', x + 1, 3, 1, 10); px(c, '#b0b0c8', x + 1, 3, 1, 3);
      px(c, OUT, x, 1, 3, 1); px(c, '#ff9a2a', x + 1, 0, 1, 1);
    }
    // 吊橋殘鏈從兩邊垂下
    px(c, '#9a98a8', 3, 4, 1, 1); px(c, '#9a98a8', 4, 5, 1, 1); px(c, '#9a98a8', 12, 4, 1, 1); px(c, '#9a98a8', 11, 5, 1, 1);
    px(c, '#1c1c58', 5, 7, 6, 6); px(c, '#14144a', 5, 11, 6, 2);
  });
  // 吊橋：一座木板吊橋，兩側鐵鍊（畫滿整格）
  make('drawbridge', 16, 16, (c) => {
    moat(c);
    px(c, OUT, 0, 4, 16, 8);
    px(c, '#b8783a', 0, 5, 16, 6);
    for (let x = 0; x < 16; x += 4) { px(c, '#7a4a22', x + 3, 5, 1, 6); px(c, '#d8985a', x, 5, 2, 1); }
    px(c, '#7a4a22', 0, 10, 16, 1);
    // 鐵鍊
    for (let x = 0; x < 16; x += 2) { px(c, '#c8c8d8', x, 3, 1, 1); px(c, '#8a8aa0', x + 1, 12, 1, 1); }
    px(c, OUT, 0, 2, 2, 1); px(c, OUT, 14, 2, 2, 1);
    px(c, '#2a2a6a', 1, 13, 14, 1);
  });

  // 鬼門：關＝紫色木門帶鐵環；開＝開了一條縫，透出黃光與小幽靈
  make('ghost_door', 16, 16, (c) => {
    px(c, OUT, 2, 1, 12, 15); px(c, OUT, 4, 0, 8, 1);
    px(c, '#6a3aa8', 3, 2, 10, 14); px(c, '#6a3aa8', 4, 1, 8, 1);
    px(c, '#8a5ac8', 3, 2, 1, 14); px(c, '#4a2a7a', 12, 2, 1, 14); px(c, '#4a2a7a', 7, 2, 2, 14); px(c, '#8a5ac8', 6, 2, 1, 14);
    // 鐵條與鐵環
    px(c, '#2a2438', 3, 5, 10, 1); px(c, '#2a2438', 3, 11, 10, 1);
    px(c, OUT, 5, 7, 2, 2); px(c, '#ffc84a', 5, 7, 2, 1); px(c, '#ffc84a', 5, 8, 1, 1);
    px(c, OUT, 9, 7, 2, 2); px(c, '#ffc84a', 9, 7, 2, 1); px(c, '#ffc84a', 10, 8, 1, 1);
    // 門上小月亮
    px(c, '#fff070', 7, 3, 2, 1); px(c, '#fff070', 7, 4, 1, 1);
  });
  make('ghost_door_open', 16, 16, (c) => {
    px(c, OUT, 2, 1, 12, 15); px(c, OUT, 4, 0, 8, 1);
    // 門洞透出黃光
    px(c, '#ffd23f', 4, 2, 8, 14); px(c, '#ffd23f', 5, 1, 6, 1); px(c, '#fff4b0', 5, 4, 6, 12); px(c, '#fff4b0', 6, 3, 4, 1);
    // 小幽靈
    px(c, '#ffffff', 6, 6, 4, 8); px(c, '#ffffff', 7, 5, 2, 1);
    px(c, '#ffffff', 6, 14, 1, 1); px(c, '#ffffff', 9, 14, 1, 1);
    px(c, '#e0e0f0', 6, 12, 4, 1);
    px(c, OUT, 7, 7, 1, 2); px(c, OUT, 9, 7, 1, 2); px(c, '#ff9ab8', 6, 10, 1, 1); px(c, '#ff9ab8', 10, 10, 1, 1); px(c, OUT, 8, 10, 1, 1);
    // 開了的門板：兩側各一條窄窄的紫色木板
    px(c, '#6a3aa8', 3, 2, 1, 14); px(c, '#6a3aa8', 12, 2, 1, 14); px(c, '#8a5ac8', 3, 2, 1, 14);
    px(c, '#6a3aa8', 2, 2, 1, 14); px(c, '#6a3aa8', 13, 2, 1, 14);
  });

  // 掃帚（碼頭）：斜放的掃帚、紅色蝴蝶結，旁邊有一個小月亮
  make('broom', 16, 16, (c) => {
    // 小月亮
    px(c, '#fff070', 11, 1, 3, 1); px(c, '#fff070', 10, 2, 1, 3); px(c, '#fff070', 11, 5, 3, 1); px(c, '#fff8c0', 11, 2, 1, 1); px(c, '#fff070', 13, 4, 1, 1); px(c, '#fff070', 13, 2, 1, 1);
    // 柄：由右上到左下
    for (let i = 0; i < 10; i++) { px(c, OUT, 12 - i, 3 + i, 2, 1); px(c, '#a86a30', 12 - i, 4 + i - 1, 1, 1); }
    // 掃把頭：左下的稻草
    px(c, OUT, 0, 10, 8, 6); px(c, OUT, 1, 9, 5, 1);
    px(c, '#f0c850', 1, 11, 6, 4); px(c, '#ffe080', 1, 11, 6, 1); px(c, '#c89a30', 1, 14, 6, 1);
    px(c, '#c89a30', 3, 12, 1, 3); px(c, '#c89a30', 5, 12, 1, 3);
    px(c, '#f0c850', 1, 15, 1, 1); px(c, '#f0c850', 3, 15, 1, 1); px(c, '#f0c850', 5, 15, 1, 1);
    // 紅蝴蝶結
    px(c, '#ff4a4a', 6, 7, 2, 2); px(c, '#ff4a4a', 9, 7, 2, 2); px(c, '#ffb0b0', 6, 7, 1, 1); px(c, '#ffb0b0', 9, 7, 1, 1); px(c, '#c42a3a', 8, 7, 1, 2);
  });

  // 古堡大門（出入口）：尖頂拱門、兩側小塔樓、頂上有蝙蝠剪影
  make('haunt_gate', 16, 16, (c) => {
    // 兩側塔樓
    for (const x of [0, 12]) {
      px(c, OUT, x, 3, 4, 13); px(c, '#8a8aa0', x + 1, 4, 2, 12); px(c, '#b0b0c8', x + 1, 4, 1, 12); px(c, '#5a5a74', x + 2, 6, 1, 10);
      px(c, '#ffd23f', x + 1, 7, 2, 2);
      // 尖頂
      px(c, OUT, x, 2, 4, 1); px(c, '#7a4ab8', x + 1, 1, 2, 1); px(c, OUT, x + 1, 0, 2, 1);
    }
    // 門樓上緣：城垛
    px(c, OUT, 4, 3, 8, 3); px(c, '#8a8aa0', 4, 4, 8, 2);
    for (const x of [4, 7, 10]) px(c, OUT, x, 2, 2, 1);
    // 尖頂拱門：深色通道
    px(c, '#2a1a4a', 5, 7, 6, 9); px(c, '#2a1a4a', 6, 6, 4, 1); px(c, '#2a1a4a', 7, 5, 2, 1);
    px(c, '#5a3a8a', 6, 8, 4, 8); px(c, '#5a3a8a', 7, 7, 2, 1);
    px(c, '#ffd23f', 7, 13, 2, 3); px(c, '#fff4b0', 7, 13, 1, 1);
    px(c, OUT, 4, 7, 1, 9); px(c, OUT, 11, 7, 1, 9);
    // 蝙蝠剪影
    px(c, OUT, 6, 0, 1, 1); px(c, OUT, 9, 0, 1, 1); px(c, OUT, 7, 1, 2, 1); px(c, OUT, 5, 1, 1, 1); px(c, OUT, 10, 1, 1, 1);
    px(c, '#ffd23f', 7, 1, 1, 1); px(c, '#ffd23f', 8, 1, 1, 1);
  });
}
