// 第四關（雪花鎮、企鵝冰原）的地形與物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，
// 預覽或測試時也可以傳入假的畫布。所有圖塊左右上下無縫（週期整除 16）。
export type Ctx2 = { fillStyle: string | CanvasGradient | CanvasPattern; fillRect(x: number, y: number, w: number, h: number): void };
export type Make = (key: string, w: number, h: number, fn: (c: Ctx2) => void) => unknown;
export type Px = (c: Ctx2, col: string, x: number, y: number, w?: number, h?: number) => void;

/** 簡單的決定性亂數 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 新增的圖樣 key（測試檢查用） */
export const SNOW_TEXTURES = [
  't_snow', 't_ice', 't_pond_ice', 't_icebridge', 't_tree_dead', 't_snowman',
  't_roof_snow', 't_wall_snow', 't_roof_inn_snow', 't_wall_inn_snow', 't_roof_shop_snow', 't_wall_shop_snow',
  'snow_pile', 'snow_pile_gone', 'ice_rock', 'ice_bridge',
] as const;

export function drawSnowTextures(make: Make, px: Px) {
  const snow = (c: Ctx2, seed: number) => {
    px(c, '#f2f8ff', 0, 0, 16, 16);
    const r = rng(seed);
    for (let i = 0; i < 8; i++) px(c, r() < 0.5 ? '#d3e4f7' : '#ffffff', Math.floor(r() * 14), Math.floor(r() * 14), 2, 1);
  };

  // ───── 地形 ─────
  make('t_snow', 16, 16, (c) => snow(c, 21));
  // 冰面（可走）：淺藍色、有斜斜的反光，滑溜溜的
  make('t_ice', 16, 16, (c) => {
    px(c, '#bfe6ff', 0, 0, 16, 16);
    for (const [x, y] of [[2, 10], [3, 9], [4, 8], [5, 7], [10, 4], [11, 3], [12, 2]]) px(c, '#eaf8ff', x, y, 2, 1);
    px(c, '#8ad0ff', 8, 12, 5, 1); px(c, '#8ad0ff', 1, 3, 4, 1); px(c, '#ffffff', 13, 9, 1, 1);
  });
  // 結冰的小池（不可走）：比冰面深的青藍色、有裂紋，看起來是一池水凍住
  make('t_pond_ice', 16, 16, (c) => {
    px(c, '#5db4ea', 0, 0, 16, 16);
    px(c, '#8ad0ff', 1, 2, 6, 1); px(c, '#8ad0ff', 9, 9, 6, 1); px(c, '#ffffff', 2, 2, 2, 1); px(c, '#ffffff', 10, 9, 2, 1);
    for (const [x, y, w, h] of [[6, 3, 1, 3], [7, 6, 2, 1], [9, 7, 1, 3], [3, 11, 3, 1], [5, 12, 1, 3]]) px(c, '#2f78c0', x, y, w, h);
  });
  // 冰橋（河面凍成的橋）：水上一排淺藍冰板；當地形與物件共用
  const iceBridge = (c: Ctx2) => {
    px(c, '#4aa8f0', 0, 0, 16, 16); px(c, '#2b2140', 0, 1, 16, 14); px(c, '#bfe6ff', 0, 2, 16, 12);
    for (let x = 3; x < 16; x += 4) px(c, '#8ad0ff', x, 2, 1, 12);
    px(c, '#eaf8ff', 0, 2, 16, 1); px(c, '#ffffff', 1, 5, 2, 1); px(c, '#ffffff', 9, 9, 2, 1); px(c, '#8ad0ff', 0, 13, 16, 1);
  };
  make('t_icebridge', 16, 16, iceBridge);
  make('ice_bridge', 16, 16, iceBridge);

  // 枯樹（不可走）：雪地上光禿禿的樹，枝上積了雪
  make('t_tree_dead', 16, 16, (c) => {
    snow(c, 22);
    px(c, '#2b2140', 6, 8, 4, 8); px(c, '#6b4a34', 7, 8, 2, 8);
    px(c, '#2b2140', 7, 1, 2, 8); px(c, '#6b4a34', 7, 2, 2, 7);
    px(c, '#2b2140', 3, 3, 5, 2); px(c, '#6b4a34', 4, 3, 4, 1);
    px(c, '#2b2140', 9, 5, 5, 2); px(c, '#6b4a34', 9, 5, 4, 1);
    px(c, '#2b2140', 2, 1, 2, 3); px(c, '#6b4a34', 3, 1, 1, 3);
    px(c, '#2b2140', 12, 3, 2, 3); px(c, '#6b4a34', 12, 3, 1, 3);
    px(c, '#ffffff', 4, 2, 3, 1); px(c, '#ffffff', 10, 4, 3, 1); px(c, '#ffffff', 6, 0, 4, 1); px(c, '#ffffff', 5, 14, 6, 1);
  });
  // 雪人（不可走）：兩顆雪球、紅圍巾、胡蘿蔔鼻、樹枝手
  make('t_snowman', 16, 16, (c) => {
    snow(c, 23);
    px(c, '#2b2140', 3, 8, 10, 8); px(c, '#2b2140', 2, 10, 12, 4); px(c, '#ffffff', 4, 9, 8, 6); px(c, '#ffffff', 3, 10, 10, 4); px(c, '#d3e4f7', 4, 13, 8, 2);
    px(c, '#2b2140', 4, 1, 8, 8); px(c, '#2b2140', 3, 2, 10, 6); px(c, '#ffffff', 5, 2, 6, 6); px(c, '#ffffff', 4, 3, 8, 4);
    px(c, '#2b2140', 3, 0, 10, 2); px(c, '#4a4f6a', 4, 0, 8, 1); // 小帽子
    px(c, '#2b2140', 6, 4, 1, 1); px(c, '#2b2140', 9, 4, 1, 1); px(c, '#f59a3c', 7, 5, 3, 1);
    px(c, '#e8514a', 4, 8, 8, 2); px(c, '#b03a3a', 4, 9, 3, 2);
    px(c, '#6b4a34', 0, 10, 3, 1); px(c, '#6b4a34', 13, 10, 3, 1); px(c, '#2b2140', 7, 11, 1, 1); px(c, '#2b2140', 7, 13, 1, 1);
  });

  // ───── 雪色的房子：每種保持原本的主色，上面蓋雪 ─────
  // 民宅：紅瓦蓋雪、牆有雪簷
  make('t_roof_snow', 16, 16, (c) => {
    px(c, '#e8514a', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#b03a3a', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(c, '#b03a3a', x, y, 1, 3);
    px(c, '#ffffff', 0, 0, 16, 5); px(c, '#d3e4f7', 0, 5, 16, 1);
    for (let x = 1; x < 16; x += 4) px(c, '#ffffff', x, 6, 2, 1);
  });
  make('t_wall_snow', 16, 16, (c) => {
    px(c, '#fff0c8', 0, 0, 16, 16); px(c, '#ffffff', 0, 0, 16, 3); px(c, '#d3e4f7', 0, 3, 16, 1); px(c, '#d9b878', 0, 14, 16, 2);
    px(c, '#2b2140', 4, 5, 8, 7); px(c, '#9fdcff', 5, 6, 6, 5); px(c, '#ffffff', 5, 6, 2, 2); px(c, '#8b5a3c', 8, 6, 1, 5); px(c, '#ffffff', 4, 4, 8, 1);
    px(c, '#ffffff', 0, 14, 16, 2);
  });
  // 旅館：藍瓦蓋雪、暖黃燈窗
  make('t_roof_inn_snow', 16, 16, (c) => {
    px(c, '#4a78c8', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#2f4f94', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(c, '#2f4f94', x, y, 1, 3);
    px(c, '#ffffff', 0, 0, 16, 5); px(c, '#c8d8f4', 0, 5, 16, 1);
    for (let x = 3; x < 16; x += 4) px(c, '#ffffff', x, 6, 2, 1);
  });
  make('t_wall_inn_snow', 16, 16, (c) => {
    px(c, '#ffe6b0', 0, 0, 16, 16); px(c, '#ffffff', 0, 0, 16, 3); px(c, '#d3e4f7', 0, 3, 16, 1); px(c, '#8b5a3c', 0, 14, 16, 2);
    for (const x of [1, 9]) { px(c, '#2b2140', x, 5, 6, 7); px(c, '#ffd84a', x + 1, 6, 4, 5); px(c, '#fff3a0', x + 1, 6, 2, 2); px(c, '#8b5a3c', x + 2, 6, 1, 5); px(c, '#ffffff', x, 4, 6, 1); }
    px(c, '#ffffff', 0, 14, 16, 2);
  });
  // 商店：綠白條紋棚頂蓋雪
  make('t_roof_shop_snow', 16, 16, (c) => {
    px(c, '#ffffff', 0, 0, 16, 16);
    for (let x = 0; x < 16; x += 8) px(c, '#3fae5a', x, 5, 4, 11);
    px(c, '#2f8a45', 0, 14, 16, 2); px(c, '#d3e4f7', 0, 4, 16, 1);
    for (let x = 0; x < 16; x += 4) px(c, '#2f8a45', x + 3, 14, 1, 2);
    px(c, '#ffffff', 2, 7, 1, 1); px(c, '#ffffff', 10, 9, 1, 1);
  });
  make('t_wall_shop_snow', 16, 16, (c) => {
    px(c, '#ffe4b8', 0, 0, 16, 16); px(c, '#ffffff', 0, 0, 16, 3); px(c, '#d3e4f7', 0, 3, 16, 1); px(c, '#d9701f', 0, 14, 16, 2);
    px(c, '#2b2140', 1, 5, 14, 7); px(c, '#9fdcff', 2, 6, 12, 5); px(c, '#ffffff', 3, 7, 3, 1); px(c, '#e8514a', 8, 8, 3, 3); px(c, '#ffd84a', 11, 9, 2, 2);
    px(c, '#ffffff', 1, 4, 14, 1); px(c, '#ffffff', 0, 14, 16, 2);
  });

  // ───── 物件 ─────
  // 雪堆：擋路的一大堆雪（用「ㄒ」吹開）
  make('snow_pile', 16, 16, (c) => {
    px(c, '#2b2140', 1, 7, 14, 9); px(c, '#2b2140', 3, 4, 10, 12); px(c, '#2b2140', 5, 3, 6, 13);
    px(c, '#ffffff', 2, 8, 12, 7); px(c, '#ffffff', 4, 5, 8, 10); px(c, '#ffffff', 6, 4, 4, 11);
    px(c, '#d3e4f7', 2, 12, 12, 3); px(c, '#d3e4f7', 10, 7, 3, 5); px(c, '#b3cbea', 3, 14, 10, 1);
    px(c, '#b3cbea', 6, 8, 2, 1); px(c, '#b3cbea', 5, 11, 2, 1);
  });
  // 雪被吹開之後：只剩幾小撮碎雪（底下是雪地，所以背景透明）
  make('snow_pile_gone', 16, 16, (c) => {
    px(c, '#d3e4f7', 3, 13, 4, 1); px(c, '#ffffff', 3, 12, 3, 1); px(c, '#d3e4f7', 10, 11, 3, 1); px(c, '#ffffff', 10, 10, 2, 1);
    px(c, '#ffffff', 7, 14, 1, 1); px(c, '#ffffff', 13, 14, 1, 1);
  });
  // 薄冰面的石頭：灰石頭上蓋了一層冰（用「ㄑ」滑過去撞碎）
  make('ice_rock', 16, 16, (c) => {
    px(c, '#2b2140', 2, 4, 12, 11); px(c, '#2b2140', 4, 3, 8, 13);
    px(c, '#9a9ab2', 3, 5, 10, 9); px(c, '#9a9ab2', 5, 4, 6, 11);
    px(c, '#bfe6ff', 3, 5, 10, 4); px(c, '#bfe6ff', 5, 4, 6, 2); px(c, '#eaf8ff', 5, 5, 4, 1); px(c, '#8ad0ff', 3, 9, 10, 1);
    px(c, '#ffffff', 4, 6, 1, 2); px(c, '#6a6a84', 5, 11, 6, 1);
    px(c, '#2b2140', 8, 8, 1, 3); px(c, '#2b2140', 7, 11, 2, 1); px(c, '#2b2140', 6, 12, 1, 2);
  });
}
