// 第六關（天空島）的地形與物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，
// 預覽或測試時也可以傳入假的畫布。整體淡藍、白、金色星光。
import type { Ctx2, Make, Px } from './snowArt';

/** 簡單的決定性亂數 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 新增的圖樣 key（測試檢查用）：t_ 開頭是地形圖塊（畫滿 16×16），其餘是物件 */
export const SKY_TEXTURES = [
  't_cloud', 't_mist', 't_starpool', 't_starstar', 't_cloudwall',
  't_roof_cloud', 't_wall_cloud', 't_roof_inn_cloud', 't_wall_inn_cloud', 't_roof_shop_cloud', 't_wall_shop_cloud',
  'zip_curtain', 'zip_curtain_open', 'cloud_block', 'rainbow_gap', 'rainbow_bridge', 'balloon_empty', 'balloon', 'cloud_boat',
] as const;

const OUT = '#2b2140';
const GOLD = '#ffd84a';

export function drawSkyTextures(make: Make, px: Px) {
  const cloud = (c: Ctx2, seed: number) => {
    px(c, '#dff1ff', 0, 0, 16, 16);
    const r = rng(seed);
    for (let i = 0; i < 6; i++) px(c, r() < 0.5 ? '#ffffff' : '#bfe0fa', Math.floor(r() * 12), Math.floor(r() * 14), 3 + Math.floor(r() * 2), 1);
  };

  // ───── 地形 ─────
  // 雲地（可走）：淡藍的底，白色的雲紋
  make('t_cloud', 16, 16, (c) => cloud(c, 61));
  // 霧氣（可走，裝飾）：雲地上飄著幾縷白霧
  make('t_mist', 16, 16, (c) => {
    cloud(c, 62);
    for (const [x, y, w] of [[1, 3, 8], [6, 7, 9], [0, 11, 7], [9, 13, 6]]) { px(c, '#ffffff', x, y, w, 2); px(c, '#eef8ff', x + 1, y - 1, w - 2, 1); }
  });
  // 星光水池（不可走）：深藍的水，金色星光閃閃，邊緣一圈白雲
  make('t_starpool', 16, 16, (c) => {
    px(c, '#3d6fd0', 0, 0, 16, 16); px(c, '#2a4fa8', 0, 9, 16, 7); px(c, '#6aa0f0', 3, 4, 6, 1); px(c, '#6aa0f0', 8, 12, 6, 1);
    px(c, '#ffffff', 0, 0, 16, 2); px(c, '#dff1ff', 0, 2, 16, 1); px(c, '#ffffff', 0, 0, 2, 16); px(c, '#ffffff', 14, 0, 2, 16); px(c, '#dff1ff', 2, 3, 1, 12); px(c, '#dff1ff', 13, 3, 1, 12);
    px(c, '#ffffff', 0, 14, 16, 2);
    for (const [x, y] of [[5, 6], [10, 9], [7, 12]]) { px(c, GOLD, x, y, 1, 1); px(c, '#fff6b0', x - 1, y, 3, 1); px(c, '#fff6b0', x, y - 1, 1, 3); }
  });
  // 星形裝飾（不可走）：雲地上立著一顆金色大星星
  make('t_starstar', 16, 16, (c) => {
    cloud(c, 63);
    px(c, OUT, 6, 1, 4, 14); px(c, OUT, 1, 5, 14, 5); px(c, OUT, 3, 3, 10, 10); px(c, OUT, 2, 11, 4, 4); px(c, OUT, 10, 11, 4, 4);
    px(c, GOLD, 7, 2, 2, 12); px(c, GOLD, 2, 6, 12, 3); px(c, GOLD, 4, 4, 8, 8); px(c, GOLD, 3, 11, 2, 3); px(c, GOLD, 11, 11, 2, 3);
    px(c, '#fff6b0', 7, 3, 2, 4); px(c, '#fff6b0', 5, 6, 3, 2); px(c, '#e0a820', 8, 9, 3, 3); px(c, '#e0a820', 7, 12, 2, 2);
  });
  // 雲牆（不可走，天空島邊界）：一團團厚厚的灰藍雲
  make('t_cloudwall', 16, 16, (c) => {
    px(c, '#8fb4e0', 0, 0, 16, 16);
    for (const [x, y, w, h] of [[0, 1, 7, 5], [5, 0, 7, 4], [9, 3, 7, 5], [1, 7, 8, 5], [8, 9, 8, 5], [0, 12, 6, 4]]) { px(c, '#c4dcf5', x, y, w, h); px(c, '#eaf4ff', x + 1, y, w - 2, 1); px(c, '#6f94c8', x + 1, y + h - 1, w - 2, 1); }
    px(c, '#6f94c8', 0, 15, 16, 1);
  });

  // ───── 雲屋：白色的雲磚牆、淡藍或粉彩的屋頂 ─────
  // 民宅：淡藍屋頂
  make('t_roof_cloud', 16, 16, (c) => {
    px(c, '#7fb8f0', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#4f8ad0', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(c, '#4f8ad0', x, y, 1, 3);
    px(c, '#bfe0fa', 0, 0, 16, 1); px(c, GOLD, 7, 1, 2, 1);
  });
  make('t_wall_cloud', 16, 16, (c) => {
    px(c, '#f4faff', 0, 0, 16, 16); px(c, '#b8d8f4', 0, 0, 16, 2); px(c, '#d0e6f8', 0, 14, 16, 2);
    px(c, OUT, 5, 5, 6, 8); px(c, OUT, 6, 4, 4, 1); px(c, '#6a8fc8', 6, 6, 4, 7); px(c, '#6a8fc8', 7, 5, 2, 1); px(c, GOLD, 9, 9, 1, 1);
    px(c, '#d0e6f8', 1, 6, 2, 1); px(c, '#d0e6f8', 13, 8, 2, 1);
  });
  // 旅館：粉紫屋頂、暖黃燈窗
  make('t_roof_inn_cloud', 16, 16, (c) => {
    px(c, '#b89af0', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#8a68d0', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) px(c, '#8a68d0', x, y, 1, 3);
    px(c, '#dccaff', 0, 0, 16, 1);
  });
  make('t_wall_inn_cloud', 16, 16, (c) => {
    px(c, '#f4faff', 0, 0, 16, 16); px(c, '#b8d8f4', 0, 0, 16, 2); px(c, '#9a8ad0', 0, 14, 16, 2);
    for (const x of [1, 9]) { px(c, OUT, x, 5, 6, 8); px(c, OUT, x + 1, 4, 4, 1); px(c, GOLD, x + 1, 6, 4, 6); px(c, GOLD, x + 2, 5, 2, 1); px(c, '#fff3a0', x + 1, 6, 2, 2); px(c, '#9a8ad0', x + 2, 6, 1, 6); }
  });
  // 商店：金白條紋遮陽棚
  make('t_roof_shop_cloud', 16, 16, (c) => {
    px(c, '#ffffff', 0, 0, 16, 16);
    for (let x = 0; x < 16; x += 8) px(c, GOLD, x, 0, 4, 16);
    px(c, '#e0a820', 0, 14, 16, 2); px(c, '#dff1ff', 0, 0, 16, 1);
    for (let x = 0; x < 16; x += 4) px(c, '#e0a820', x + 3, 14, 1, 2);
  });
  make('t_wall_shop_cloud', 16, 16, (c) => {
    px(c, '#f4faff', 0, 0, 16, 16); px(c, '#b8d8f4', 0, 0, 16, 2); px(c, '#e0a820', 0, 14, 16, 2);
    px(c, OUT, 1, 5, 14, 8); px(c, '#e8f4ff', 2, 6, 12, 6); px(c, '#ffffff', 3, 7, 3, 1); px(c, GOLD, 8, 8, 3, 3); px(c, '#7fb8f0', 11, 9, 2, 3);
  });

  // ───── 物件（背景透明，放在雲地上）─────
  // 拉鍊雲幕（ㄗ 機關）：一整面白雲幕，中間一條金色拉鍊拉鍊頭在上面，拉上了擋住路
  make('zip_curtain', 16, 16, (c) => {
    px(c, OUT, 2, 0, 12, 16); px(c, OUT, 0, 2, 16, 12);
    px(c, '#ffffff', 3, 1, 10, 14); px(c, '#ffffff', 1, 3, 14, 10);
    px(c, '#cfe6fa', 3, 10, 5, 4); px(c, '#cfe6fa', 10, 4, 4, 5); px(c, '#eef8ff', 2, 3, 3, 1);
    for (let y = 1; y < 15; y += 2) { px(c, GOLD, 7, y, 2, 1); px(c, '#e0a820', 8, y + 1, 1, 1); }
    px(c, OUT, 6, 0, 4, 4); px(c, GOLD, 7, 1, 2, 2); px(c, '#fff6b0', 7, 1, 1, 1);
  });
  // 拉開的雲幕（ㄗ 之後）：兩邊的雲幕往兩側縮起來，中間露出通道，金色拉鍊兩排牙
  make('zip_curtain_open', 16, 16, (c) => {
    px(c, OUT, 0, 2, 5, 12); px(c, OUT, 11, 2, 5, 12);
    px(c, '#ffffff', 0, 3, 4, 10); px(c, '#ffffff', 12, 3, 4, 10); px(c, '#cfe6fa', 0, 10, 3, 3); px(c, '#cfe6fa', 13, 10, 3, 3);
    for (let y = 3; y < 13; y += 2) { px(c, GOLD, 4, y, 1, 1); px(c, GOLD, 11, y, 1, 1); }
    px(c, OUT, 6, 12, 4, 3); px(c, GOLD, 7, 12, 2, 2);
  });
  // 擋路雲團（ㄘ 機關）：又胖又鼓的灰藍烏雲，帶一點刺刺的尖角
  make('cloud_block', 16, 16, (c) => {
    px(c, OUT, 1, 4, 14, 10); px(c, OUT, 3, 2, 10, 14); px(c, OUT, 0, 7, 16, 4);
    px(c, '#9fb6d8', 2, 5, 12, 8); px(c, '#9fb6d8', 4, 3, 8, 12); px(c, '#9fb6d8', 1, 7, 14, 4);
    px(c, '#c4d4ec', 4, 4, 4, 1); px(c, '#c4d4ec', 3, 6, 3, 1); px(c, '#7f94b8', 3, 12, 10, 1); px(c, '#7f94b8', 9, 8, 4, 1);
    px(c, OUT, 5, 7, 2, 2); px(c, OUT, 9, 7, 2, 2); px(c, OUT, 6, 11, 4, 1);
    for (const [x, y] of [[0, 3], [14, 3], [0, 12], [14, 12], [7, 0], [7, 15]]) px(c, '#fff6b0', x, y, 2, 1);
  });
  // 彩虹橋缺口（ㄙ 機關）：雲地上斷掉的缺口，露出下面的天空，兩端有彩虹的斷面
  make('rainbow_gap', 16, 16, (c) => {
    px(c, OUT, 0, 3, 16, 10); px(c, '#6aa0f0', 0, 4, 16, 8); px(c, '#9ac4f8', 0, 4, 16, 2);
    px(c, '#ffffff', 5, 8, 4, 1); px(c, '#ffffff', 6, 7, 2, 1);
    px(c, '#e8514a', 0, 5, 2, 1); px(c, '#ffd84a', 0, 7, 2, 1); px(c, '#4cc38a', 0, 9, 2, 1);
    px(c, '#e8514a', 14, 5, 2, 1); px(c, '#ffd84a', 14, 7, 2, 1); px(c, '#4cc38a', 14, 9, 2, 1);
    px(c, OUT, 0, 12, 16, 1);
  });
  // 彩虹橋（ㄙ 之後）：缺口上橫過一道彩虹，可以走過去
  make('rainbow_bridge', 16, 16, (c) => {
    px(c, OUT, 0, 3, 16, 10); px(c, '#6aa0f0', 0, 4, 16, 8);
    px(c, OUT, 0, 4, 16, 8);
    const bands = ['#e8514a', '#ff9a3a', '#ffd84a', '#4cc38a', '#4aa8f0', '#9a6ae8'];
    bands.forEach((col, i) => px(c, col, 0, 5 + i, 16, 1));
    px(c, '#ffffff', 2, 5, 3, 1); px(c, '#ffffff', 10, 6, 3, 1);
    px(c, '#ffffff', 0, 3, 2, 2); px(c, '#ffffff', 14, 3, 2, 2); px(c, '#ffffff', 0, 12, 3, 1); px(c, '#ffffff', 13, 12, 3, 1);
  });
  // 沒氣的熱氣球：癟癟的球皮軟軟垂在籃子旁邊
  make('balloon_empty', 16, 16, (c) => {
    px(c, OUT, 2, 9, 9, 6); px(c, OUT, 4, 7, 6, 3); px(c, '#e8514a', 3, 10, 7, 4); px(c, '#e8514a', 5, 8, 4, 2);
    px(c, '#ffffff', 5, 10, 2, 4); px(c, '#b03a3a', 8, 10, 2, 4); px(c, '#ff8a80', 4, 10, 2, 1);
    px(c, OUT, 10, 11, 5, 5); px(c, '#c98a4a', 11, 12, 3, 3); px(c, '#e8b06a', 11, 12, 3, 1); px(c, '#8b5a3c', 11, 14, 3, 1);
    px(c, OUT, 9, 10, 2, 1); px(c, '#6a5a4a', 9, 11, 2, 1);
  });
  // 鼓起的熱氣球：圓圓的紅白條紋球皮、小籃子，金色星星
  make('balloon', 16, 16, (c) => {
    px(c, OUT, 3, 0, 10, 11); px(c, OUT, 1, 2, 14, 6); px(c, OUT, 4, 10, 8, 2);
    px(c, '#e8514a', 4, 1, 8, 9); px(c, '#e8514a', 2, 3, 12, 4); px(c, '#ffffff', 6, 1, 2, 9); px(c, '#ffffff', 3, 3, 1, 4); px(c, '#ffffff', 12, 3, 1, 4);
    px(c, '#b03a3a', 10, 2, 2, 8); px(c, '#ff8a80', 4, 3, 2, 1); px(c, GOLD, 7, 4, 2, 2);
    px(c, OUT, 5, 11, 1, 2); px(c, OUT, 10, 11, 1, 2); px(c, OUT, 4, 13, 8, 3); px(c, '#c98a4a', 5, 13, 6, 2); px(c, '#e8b06a', 5, 13, 6, 1); px(c, '#8b5a3c', 5, 15, 6, 1);
  });
  // 雲朵小船（停機坪與小船碼頭）：一朵白雲托著小木船，上面插一面金色小旗
  make('cloud_boat', 16, 16, (c) => {
    px(c, OUT, 0, 11, 16, 5); px(c, OUT, 1, 9, 5, 3); px(c, OUT, 10, 9, 5, 3); px(c, '#ffffff', 1, 12, 14, 3); px(c, '#ffffff', 2, 10, 3, 2); px(c, '#ffffff', 11, 10, 3, 2); px(c, '#bfe0fa', 2, 14, 12, 1);
    px(c, OUT, 3, 7, 10, 5); px(c, '#c98a4a', 4, 8, 8, 3); px(c, '#e8b06a', 4, 8, 8, 1); px(c, '#8b5a3c', 5, 10, 6, 1);
    px(c, OUT, 7, 1, 2, 8); px(c, '#6a4a2a', 7, 2, 1, 6); px(c, GOLD, 8, 1, 4, 3); px(c, '#fff6b0', 8, 1, 2, 1);
  });
}
