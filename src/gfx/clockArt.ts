// 第十關（齒輪鐘塔城）的地形與物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，
// 預覽或測試時也可以傳入假的畫布。銅色與暗金色加一點藍綠點綴，溫暖可愛、不冰冷。
import type { Ctx2, Make, Px } from './snowArt';

/** 簡單的決定性亂數 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 新增的圖樣 key（測試檢查用）：t_ 開頭是地形圖塊（畫滿 16×16），其餘是物件 */
export const CLOCK_TEXTURES = [
  't_clock_floor', 't_clock_moss', 't_clock_path', 't_tower_floor', 't_clock_gear', 't_clock_fence', 't_clock_oil', 't_clock_steam',
  't_roof_gear', 't_wall_gear', 't_roof_inn_clock', 't_wall_inn_clock', 't_roof_shop_clock', 't_wall_shop_clock', 't_tower_wall',
  'gear_stuck', 'gear_turning', 'musicbox_still', 'musicbox_play', 'gearbridge_gap', 'gearbridge',
  'belldoor', 'belldoor_open', 'keyhole', 'keyhole_open', 'winder_off', 'winder_on', 'cablecar', 'clock_gate',
] as const;

const OUT = '#2a1608';
const OIL = '#3a2210';
const OIL_D = '#26140a';
const OIL_L = '#c88a3a';

export function drawClockTextures(make: Make, px: Px) {
  /** 畫在 0..15 之內才算數（齒輪會超出格子） */
  const dot = (c: Ctx2, col: string, x: number, y: number) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) px(c, col, x, y, 1, 1); };
  /** 小齒輪：body 半徑、tooth 齒高、n 齒數、rot 轉角；亮面在左上、暗面在右下 */
  const gear = (c: Ctx2, cx: number, cy: number, body: number, tooth: number, n: number, col: [string, string, string], hole: string | null, rot = 0) => {
    const R = Math.ceil(body + 0.5);
    const shade = (dx: number, dy: number) => (dx + dy > body * 0.6 ? col[2] : dx + dy < -body * 0.6 ? col[1] : col[0]);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (Math.hypot(dx, dy) <= body + 0.3) dot(c, shade(dx, dy), cx + dx, cy + dy);
    // 齒：沿圓周排成方塊（tooth>=1.5 用 2×2，否則 1×1）
    if (tooth > 0) {
      const sz = tooth >= 1.5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const a = rot + (2 * Math.PI * i) / n;
        const tx = Math.round(cx + Math.cos(a) * (body + tooth * 0.55) - (sz - 1) / 2), ty = Math.round(cy + Math.sin(a) * (body + tooth * 0.55) - (sz - 1) / 2);
        for (let j = 0; j < sz; j++) for (let k = 0; k < sz; k++) dot(c, shade(tx - cx, ty - cy), tx + k, ty + j);
      }
    }
    if (hole) { dot(c, hole, cx, cy); if (body >= 3) { dot(c, hole, cx - 1, cy); dot(c, hole, cx + 1, cy); dot(c, hole, cx, cy - 1); dot(c, hole, cx, cy + 1); } }
  };
  const COPPER: [string, string, string] = ['#c87a3a', '#e8a460', '#8a4a1e'];
  const BRASS: [string, string, string] = ['#e8b840', '#fff0a0', '#b88820'];
  const IRON: [string, string, string] = ['#8a8078', '#b0a89c', '#5a544e'];

  /** 油溝：深琥珀色的油帶亮點的流動，缺口與橋也用它當底，才接得起來 */
  const oil = (c: Ctx2) => {
    px(c, OIL, 0, 0, 16, 16); px(c, OIL_D, 0, 8, 16, 8);
    px(c, '#5a3818', 0, 0, 16, 1);
    for (const [x, y] of [[1, 3], [9, 2], [4, 7], [11, 9], [2, 12], [9, 14]]) { px(c, OIL_L, x, y, 3, 1); px(c, '#f0c060', x + 1, y - 1, 1, 1); }
  };
  const floor = (c: Ctx2) => {
    px(c, '#d8a070', 0, 0, 16, 16);
    for (const o of [0, 8]) { px(c, '#b87a48', 0, o + 7, 16, 1); px(c, '#b87a48', o + 7, 0, 1, 16); }
    for (const [x, y] of [[1, 1], [9, 1], [1, 9], [9, 9]]) { px(c, '#8a4e26', x + 1, y + 1, 1, 1); px(c, '#f4cc98', x, y, 1, 1); }
    px(c, '#e8b888', 4, 4, 2, 1); px(c, '#e8b888', 12, 5, 2, 1); px(c, '#e8b888', 5, 12, 2, 1); px(c, '#e8b888', 13, 13, 1, 1);
  };
  /** 屋頂：銅色鱗片，頂端有一排小裝飾 */
  const roof = (c: Ctx2, a: string, aD: string, aL: string) => {
    px(c, a, 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      px(c, aD, 0, y + 3, 16, 1);
      const o = (y / 4) % 2 ? 0 : 3;
      for (let x = o; x < 16; x += 6) { px(c, aL, x, y, 3, 1); px(c, aD, x + 5, y, 1, 3); px(c, aL, x + 1, y + 1, 1, 1); }
    }
    px(c, OUT, 0, 0, 16, 1); px(c, OUT, 0, 15, 16, 1);
  };
  const wall = (c: Ctx2, base: string, dark: string) => {
    px(c, base, 0, 0, 16, 16); px(c, dark, 0, 14, 16, 2); px(c, dark, 0, 0, 16, 1);
    px(c, dark, 0, 7, 1, 1); px(c, dark, 8, 4, 1, 1);
  };

  // ───── 地形 ─────
  make('t_clock_floor', 16, 16, (c) => floor(c));
  // 青銅苔地：帶綠鏽的銅色
  make('t_clock_moss', 16, 16, (c) => {
    px(c, '#b07a48', 0, 0, 16, 16);
    const r = rng(101);
    for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 12), y = Math.floor(r() * 13); px(c, '#5aa890', x, y, 3, 2); px(c, '#7ac8b0', x, y, 2, 1); px(c, '#3e8a74', x + 1, y + 2, 2, 1); }
    for (let i = 0; i < 5; i++) px(c, '#d49a62', Math.floor(r() * 14), Math.floor(r() * 14), 2, 1);
    px(c, '#8a5a30', 0, 15, 16, 1); px(c, '#8a5a30', 15, 0, 1, 16);
  });
  // 銅管小徑：橫向排列的黃銅管
  make('t_clock_path', 16, 16, (c) => {
    px(c, '#6a3c14', 0, 0, 16, 16);
    for (let j = 0; j < 4; j++) {
      const y = j * 4;
      px(c, '#e0b040', 0, y, 16, 3); px(c, '#fff0a0', 0, y, 16, 1); px(c, '#b88820', 0, y + 2, 16, 1);
      const o = j % 2 ? 5 : 11;
      px(c, '#a87a20', o, y, 2, 3); px(c, '#8a5e14', o, y + 2, 2, 1);
      px(c, '#fff0a0', (o + 7) % 16, y + 1, 1, 1);
    }
  });
  // 鐘塔地磚：深棕與銅色棋盤
  make('t_tower_floor', 16, 16, (c) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) px(c, (i + j) % 2 ? '#4a2c1a' : '#8a5a30', i * 4, j * 4, 4, 4);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2 === 0) { px(c, '#b07a48', i * 4, j * 4, 2, 1); px(c, '#6a4020', i * 4 + 3, j * 4 + 3, 1, 1); }
    px(c, '#32190c', 0, 15, 16, 1); px(c, '#32190c', 15, 0, 1, 16);
  });
  // 大齒輪叢（不可走）：幾個咬在一起的小齒輪
  make('t_clock_gear', 16, 16, (c) => {
    px(c, '#6a4020', 0, 0, 16, 16);
    px(c, '#563218', 0, 0, 16, 1); px(c, '#563218', 0, 0, 1, 16);
    gear(c, 5, 5, 3, 1.4, 8, COPPER, '#3a2010', 0.2);
    gear(c, 11, 6, 2, 1.3, 6, BRASS, '#6a4a10', 0.5);
    gear(c, 8, 12, 3, 1.4, 8, BRASS, '#6a4a10', 0.4);
    gear(c, 13, 13, 1, 1, 4, COPPER, null, 0);
    gear(c, 2, 12, 1, 1, 4, IRON, null, 0);
  });
  // 黃銅欄杆（不可走）：銅色地、黃銅橫桿與直柱，小齒輪裝飾
  make('t_clock_fence', 16, 16, (c) => {
    floor(c);
    px(c, '#8a5a1a', 0, 6, 16, 2); px(c, '#e0b040', 0, 5, 16, 2); px(c, '#fff0a0', 0, 5, 16, 1);
    px(c, '#8a5a1a', 0, 12, 16, 2); px(c, '#e0b040', 0, 11, 16, 2); px(c, '#fff0a0', 0, 11, 16, 1);
    for (const x of [1, 6, 11]) { px(c, '#8a5a1a', x, 3, 3, 13); px(c, '#e0b040', x, 3, 2, 12); px(c, '#fff0a0', x, 3, 1, 12); px(c, '#e0b040', x, 2, 2, 1); }
    gear(c, 9, 8, 1, 1.3, 6, COPPER, null, 0.3);
    gear(c, 14, 8, 1, 1.3, 6, COPPER, null, 0.3);
  });
  make('t_clock_oil', 16, 16, (c) => oil(c));
  // 蒸氣池（不可走）：金屬邊、藍灰色池水、幾縷白色蒸氣
  make('t_clock_steam', 16, 16, (c) => {
    px(c, '#8a5a30', 0, 0, 16, 16);
    px(c, OUT, 1, 1, 14, 14); px(c, '#c8945a', 2, 2, 12, 12); px(c, '#e8b888', 2, 2, 12, 1);
    px(c, '#6a8aa0', 3, 3, 10, 10); px(c, '#587890', 3, 9, 10, 4); px(c, '#8aaac0', 3, 3, 10, 1);
    px(c, '#d8e8f0', 5, 11, 3, 1); px(c, '#d8e8f0', 10, 8, 2, 1);
    for (const [x, y] of [[5, 8], [9, 5], [11, 10]]) { px(c, '#ffffff', x, y, 1, 3); px(c, '#e8f0f8', x + 1, y - 1, 1, 2); px(c, '#ffffff', x - 1, y + 1, 1, 2); }
    px(c, '#b8d0e0', 4, 4, 1, 1); px(c, '#b8d0e0', 12, 5, 1, 1);
    px(c, '#6a3c14', 1, 1, 1, 1); px(c, '#6a3c14', 14, 14, 1, 1);
  });

  // ───── 屋子：銅色民宅、藍色旅館、綠色商店 ─────
  make('t_roof_gear', 16, 16, (c) => {
    roof(c, '#c8782e', '#9a5018', '#e8a458');
    gear(c, 8, 7, 2, 1.3, 6, BRASS, '#7a4a10', 0.3);
  });
  make('t_wall_gear', 16, 16, (c) => {
    wall(c, '#e0c8a0', '#b09068');
    px(c, OUT, 5, 5, 6, 10); px(c, OUT, 6, 4, 4, 1); px(c, '#8a4a2a', 6, 6, 4, 9); px(c, '#8a4a2a', 7, 5, 2, 1); px(c, '#ffd23f', 9, 10, 1, 1);
    gear(c, 3, 8, 1, 1.2, 6, COPPER, null, 0.3); gear(c, 13, 8, 1, 1.2, 6, COPPER, null, 0.3);
  });
  make('t_roof_inn_clock', 16, 16, (c) => {
    roof(c, '#4a7ab8', '#2e5a94', '#74a0d8');
    for (const [x, y] of [[3, 2], [11, 2], [7, 6], [2, 9], [12, 9], [7, 12]]) { px(c, '#ffe870', x, y, 1, 1); px(c, '#fff8c0', x, y - 1, 1, 1); px(c, '#fff8c0', x, y + 1, 1, 1); px(c, '#fff8c0', x - 1, y, 1, 1); px(c, '#fff8c0', x + 1, y, 1, 1); }
  });
  make('t_wall_inn_clock', 16, 16, (c) => {
    wall(c, '#e8d8b8', '#b8a07a');
    for (const x of [1, 9]) { px(c, OUT, x, 5, 6, 8); px(c, OUT, x + 1, 4, 4, 1); px(c, '#ffe680', x + 1, 6, 4, 6); px(c, '#ffe680', x + 2, 5, 2, 1); px(c, '#fff8c0', x + 1, 6, 2, 2); px(c, '#c87a30', x + 2, 6, 1, 6); }
  });
  make('t_roof_shop_clock', 16, 16, (c) => {
    roof(c, '#4a9a6a', '#2e7a4e', '#74c492');
    for (let x = 0; x < 16; x += 4) px(c, '#e8fff0', x, 5, 2, 3);
  });
  make('t_wall_shop_clock', 16, 16, (c) => {
    wall(c, '#e8dcb8', '#b8a47a');
    px(c, OUT, 1, 5, 14, 8); px(c, '#fff4d0', 2, 6, 12, 6); px(c, '#ffffff', 3, 7, 3, 1);
    gear(c, 9, 9, 2, 1.2, 6, BRASS, '#6a4a10', 0.3); px(c, '#4a9a6a', 12, 8, 2, 3);
  });
  // 鐘塔石牆（不可走）：暗棕色磚加小齒輪浮雕
  make('t_tower_wall', 16, 16, (c) => {
    px(c, '#7a5238', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#3a2418', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) { const o = (y / 4) % 2 ? 0 : 4; px(c, '#3a2418', o + 2, y, 1, 3); px(c, '#3a2418', o + 10, y, 1, 3); }
    for (let y = 0; y < 16; y += 4) px(c, '#9a7050', (y / 4) % 2 ? 3 : 7, y, 3, 1);
    px(c, '#4a3020', 5, 5, 6, 6);
    gear(c, 8, 8, 2, 1.3, 6, BRASS, '#4a3020', 0.4);
  });

  // ───── 物件（背景透明，放在銅板地／地磚上）─────
  /** 大齒輪：stuck＝灰銅色、卡住；turning＝亮金色、帶轉動線條與閃光 */
  make('gear_stuck', 16, 16, (c) => {
    gear(c, 8, 8, 5, 2.3, 8, IRON, OUT, 0);
    gear(c, 8, 8, 2, 0, 1, ['#6a625a', '#8a8078', '#4a443e'], OUT, 0);
    // 卡住的小木楔與裂痕
    px(c, '#8a5a2a', 12, 13, 3, 2); px(c, '#5a3a18', 14, 14, 1, 1); px(c, OUT, 5, 5, 1, 1); px(c, OUT, 6, 6, 1, 1);
    px(c, '#ffd23f', 1, 2, 1, 1); px(c, '#ffd23f', 14, 2, 1, 1);
  });
  make('gear_turning', 16, 16, (c) => {
    gear(c, 8, 8, 5, 2.3, 8, BRASS, '#6a4a10', Math.PI / 8);
    gear(c, 8, 8, 2, 0, 1, ['#d89a20', '#f0c860', '#a87a10'], '#6a4a10', 0);
    // 轉動線條
    px(c, '#fff0a0', 1, 3, 2, 1); px(c, '#fff0a0', 0, 5, 1, 2); px(c, '#fff0a0', 13, 12, 2, 1); px(c, '#fff0a0', 15, 9, 1, 2);
    px(c, '#ffffff', 13, 1, 1, 1); px(c, '#fff8c0', 12, 1, 1, 1); px(c, '#fff8c0', 14, 1, 1, 1); px(c, '#fff8c0', 13, 0, 1, 1); px(c, '#fff8c0', 13, 2, 1, 1);
  });

  /** 八音盒：still＝合著的木盒子；play＝盒蓋開、音符飄出 */
  const notes = (c: Ctx2, x: number, y: number, col: string) => { px(c, col, x, y + 3, 2, 2); px(c, col, x + 1, y, 1, 4); px(c, col, x + 2, y, 1, 1); px(c, col, x + 2, y + 1, 1, 1); };
  make('musicbox_still', 16, 16, (c) => {
    px(c, OUT, 1, 6, 14, 9); px(c, '#9a5a2a', 2, 7, 12, 7); px(c, '#c8803c', 2, 7, 12, 2); px(c, '#6a3a18', 2, 12, 12, 2);
    px(c, OUT, 2, 4, 12, 3); px(c, '#b0702e', 3, 5, 10, 2); px(c, '#d89850', 3, 5, 10, 1);
    px(c, '#e8b840', 7, 8, 2, 3); px(c, '#fff0a0', 7, 8, 1, 1); px(c, OUT, 8, 10, 1, 1);
    px(c, '#e8b840', 3, 8, 1, 1); px(c, '#e8b840', 12, 8, 1, 1);
    px(c, OUT, 2, 15, 3, 1); px(c, OUT, 11, 15, 3, 1);
  });
  make('musicbox_play', 16, 16, (c) => {
    // 盒蓋掀開，立在後面
    px(c, OUT, 2, 3, 12, 4); px(c, '#b0702e', 3, 4, 10, 2); px(c, '#d89850', 3, 4, 10, 1);
    px(c, OUT, 1, 8, 14, 7); px(c, '#9a5a2a', 2, 9, 12, 5); px(c, '#c8803c', 2, 9, 12, 1); px(c, '#6a3a18', 2, 13, 12, 1);
    // 盒裡的金色梳子與小滾筒
    px(c, '#e8b840', 3, 7, 10, 2); px(c, '#fff0a0', 3, 7, 10, 1);
    for (let x = 4; x < 13; x += 2) px(c, '#b88820', x, 9, 1, 1);
    px(c, '#5a8aa8', 11, 10, 2, 2);
    notes(c, 1, 0, '#e8a020'); notes(c, 10, 0, '#4a9ab8'); px(c, '#ff7a8a', 6, 1, 1, 1); px(c, '#ff7a8a', 7, 0, 1, 1);
    px(c, OUT, 2, 15, 3, 1); px(c, OUT, 11, 15, 3, 1);
  });

  // 齒輪橋缺口：油溝一格（溝是橫向的，玩家由上往下走），上下岸邊各兩根銅柱，中間斷開。
  // 畫滿整格；左 3 欄與右 3 欄保留純油溝，才和左右相鄰的 t_clock_oil 接得起來
  make('gearbridge_gap', 16, 16, (c) => {
    oil(c);
    for (const [x, y] of [[3, 0], [10, 0], [3, 12], [10, 12]]) {
      px(c, OUT, x, y, 3, 4); px(c, '#b8782e', x + 1, y + 1, 2, 2); px(c, '#e8a460', x + 1, y + 1, 1, 2);
      px(c, '#e8b840', x, y === 0 ? 3 : 12, 3, 1);
    }
    // 柱子伸出的斷掉的齒輪牙
    px(c, '#e8b840', 7, 3, 1, 1); px(c, '#b88820', 8, 12, 1, 1);
    px(c, '#1a0c04', 4, 5, 8, 6); px(c, '#120802', 4, 9, 8, 2);
  });
  // 齒輪橋：一排咬合的齒輪排成豎排的橋，由上往下貫通，可以踩（畫滿整格；左 3 欄與右 3 欄保留純油溝）
  make('gearbridge', 16, 16, (c) => {
    oil(c);
    px(c, OUT, 4, 0, 8, 16);
    px(c, '#7a4a1a', 7, 0, 2, 16);
    gear(c, 8, 2, 2.5, 1.5, 8, BRASS, '#6a4a10', 0); gear(c, 8, 8, 2.5, 1.5, 8, COPPER, '#3a2010', Math.PI / 8); gear(c, 8, 14, 2.5, 1.5, 8, BRASS, '#6a4a10', 0);
    px(c, '#26140a', 12, 0, 1, 16);
  });

  // 鐘樓大門：關＝厚重木門帶銅鉸鏈；開＝門開一縫，透出暖光
  make('belldoor', 16, 16, (c) => {
    px(c, OUT, 2, 1, 12, 15); px(c, OUT, 4, 0, 8, 1);
    px(c, '#8a5028', 3, 2, 10, 14); px(c, '#8a5028', 4, 1, 8, 1);
    px(c, '#b87a42', 3, 2, 1, 14); px(c, '#5a3418', 12, 2, 1, 14); px(c, '#5a3418', 7, 2, 2, 14); px(c, '#b87a42', 6, 2, 1, 14);
    // 銅鉸鏈
    for (const y of [4, 11]) { px(c, '#e0a050', 3, y, 10, 2); px(c, '#fff0a0', 3, y, 10, 1); px(c, '#8a5a1a', 3, y + 1, 10, 1); px(c, OUT, 5, y, 1, 1); px(c, OUT, 10, y, 1, 1); }
    // 小鐘與門環
    px(c, '#ffd23f', 7, 7, 2, 2); px(c, '#fff0a0', 7, 7, 1, 1); px(c, OUT, 7, 9, 2, 1);
  });
  make('belldoor_open', 16, 16, (c) => {
    px(c, OUT, 2, 1, 12, 15); px(c, OUT, 4, 0, 8, 1);
    px(c, '#ffc850', 4, 2, 8, 14); px(c, '#ffc850', 5, 1, 6, 1); px(c, '#fff0b0', 5, 4, 6, 12); px(c, '#fff0b0', 6, 3, 4, 1);
    // 光裡的小齒輪剪影與地上的光
    gear(c, 8, 8, 1, 1.3, 6, ['#e8a030', '#f8c860', '#c88010'], null, 0.3);
    px(c, '#ffe080', 4, 15, 8, 1);
    // 開了的門板：兩側各一條窄窄的木板與鉸鏈
    px(c, '#8a5028', 3, 2, 1, 14); px(c, '#8a5028', 12, 2, 1, 14); px(c, '#b87a42', 3, 2, 1, 14);
    px(c, '#8a5028', 2, 2, 1, 14); px(c, '#8a5028', 13, 2, 1, 14);
    for (const y of [4, 11]) { px(c, '#e0a050', 2, y, 2, 2); px(c, '#e0a050', 12, y, 2, 2); }
  });

  // 鑰匙孔：鎖住＝銅色大鎖孔；轉開＝鎖孔旁出現亮光與一把鑰匙
  const plate = (c: Ctx2, w: number) => {
    px(c, OUT, 1, 2, w, 12); px(c, '#c87a3a', 2, 3, w - 2, 10); px(c, '#e8a460', 2, 3, w - 2, 1); px(c, '#8a4a1e', 2, 12, w - 2, 1);
    for (const [x, y] of [[3, 4], [w - 2, 4], [3, 11], [w - 2, 11]]) { px(c, '#ffe0a0', x, y, 1, 1); }
  };
  make('keyhole', 16, 16, (c) => {
    plate(c, 14);
    px(c, OUT, 6, 5, 4, 4); px(c, OUT, 5, 6, 6, 2); px(c, OUT, 7, 9, 2, 3);
    px(c, '#e8a460', 5, 4, 1, 1); px(c, '#e8a460', 10, 4, 1, 1);
  });
  make('keyhole_open', 16, 16, (c) => {
    plate(c, 10);
    // 鎖孔發光
    px(c, '#ffe880', 4, 5, 4, 4); px(c, '#ffe880', 3, 6, 6, 2); px(c, '#ffe880', 5, 9, 2, 3); px(c, '#ffffff', 5, 6, 2, 2);
    px(c, '#fff8c0', 1, 1, 1, 1); px(c, '#fff8c0', 9, 1, 1, 1); px(c, '#fff8c0', 0, 7, 1, 1);
    // 一把金鑰匙躺在旁邊
    px(c, OUT, 10, 5, 5, 4); px(c, '#e8b840', 11, 6, 3, 2); px(c, '#fff0a0', 11, 6, 1, 1); px(c, OUT, 12, 7, 1, 1);
    px(c, OUT, 9, 9, 6, 3); px(c, '#e8b840', 10, 10, 5, 1); px(c, '#e8b840', 12, 11, 1, 2); px(c, '#e8b840', 14, 11, 1, 2);
    px(c, '#ffffff', 14, 4, 1, 1);
  });

  // 大發條：停＝大發條鑰匙插在機器上；轉＝鑰匙轉動、有轉動線條，機器亮起
  const winderBase = (c: Ctx2, lamp: string) => {
    px(c, OUT, 2, 9, 12, 7); px(c, '#9a5a2a', 3, 10, 10, 5); px(c, '#c8803c', 3, 10, 10, 1);
    px(c, '#e8b840', 2, 8, 12, 2); px(c, '#fff0a0', 2, 8, 12, 1);
    px(c, lamp, 4, 12, 2, 2); px(c, '#6a3a18', 3, 14, 10, 1);
    gear(c, 10, 12, 1, 1.2, 6, COPPER, null, 0.3);
  };
  make('winder_off', 16, 16, (c) => {
    winderBase(c, '#8a8a8a');
    // 鑰匙：直立的柄，兩片橫向蝴蝶翼
    px(c, OUT, 7, 3, 2, 6); px(c, '#e8b840', 7, 3, 1, 6); px(c, '#b88820', 8, 3, 1, 6);
    for (const x of [1, 10]) { px(c, OUT, x, 1, 5, 5); px(c, '#e8b840', x + 1, 2, 3, 3); px(c, '#fff0a0', x + 1, 2, 3, 1); px(c, '#b88820', x + 1, 4, 3, 1); }
    px(c, OUT, 5, 2, 2, 3); px(c, OUT, 9, 2, 2, 3); px(c, '#b88820', 5, 3, 2, 1); px(c, '#b88820', 9, 3, 2, 1);
  });
  make('winder_on', 16, 16, (c) => {
    winderBase(c, '#7ae07a');
    // 鑰匙轉了四分之一圈：翼片在上下
    px(c, OUT, 7, 1, 2, 8); px(c, '#e8b840', 7, 1, 1, 8); px(c, '#b88820', 8, 1, 1, 8);
    px(c, OUT, 5, 0, 6, 3); px(c, '#fff0a0', 6, 0, 4, 2); px(c, '#e8b840', 6, 2, 4, 1);
    px(c, OUT, 5, 5, 6, 3); px(c, '#e8b840', 6, 5, 4, 2); px(c, '#fff0a0', 6, 5, 4, 1);
    // 轉動線條
    px(c, '#fff0a0', 2, 2, 2, 1); px(c, '#fff0a0', 1, 4, 1, 2); px(c, '#fff0a0', 12, 6, 2, 1); px(c, '#fff0a0', 14, 3, 1, 2);
    px(c, '#ffffff', 13, 1, 1, 1);
  });

  // 熱氣纜車（碼頭）：吊在鋼索上的小纜車，紅色車廂、藍色氣球
  make('cablecar', 16, 16, (c) => {
    // 鋼索
    px(c, '#4a4658', 0, 1, 16, 1); px(c, '#8a8aa0', 0, 0, 16, 1);
    // 藍色氣球
    px(c, OUT, 3, 2, 10, 6); px(c, OUT, 4, 1, 8, 1); px(c, OUT, 4, 8, 8, 1);
    px(c, '#4a8ad8', 4, 2, 8, 6); px(c, '#4a8ad8', 5, 1, 6, 1); px(c, '#7ab0f0', 4, 2, 3, 3); px(c, '#2e62a8', 9, 5, 3, 3); px(c, '#2e62a8', 5, 7, 6, 1);
    px(c, '#ffe880', 7, 2, 2, 6); px(c, '#ffffff', 5, 3, 1, 1);
    // 吊繩
    px(c, '#6a4a2a', 5, 8, 1, 3); px(c, '#6a4a2a', 10, 8, 1, 3);
    // 紅色車廂
    px(c, OUT, 2, 10, 12, 6); px(c, '#d84a3a', 3, 11, 10, 4); px(c, '#ff7a6a', 3, 11, 10, 1); px(c, '#a82a22', 3, 14, 10, 1);
    px(c, '#ffffff', 2, 10, 12, 1);
    px(c, '#ffe8a0', 4, 12, 2, 2); px(c, '#ffe8a0', 7, 12, 2, 2); px(c, '#ffe8a0', 10, 12, 2, 2);
  });

  // 鐘塔大門（出入口）：尖頂拱門、中間一面大鐘、兩側齒輪
  make('clock_gate', 16, 16, (c) => {
    // 兩側塔身
    for (const x of [0, 12]) { px(c, OUT, x, 2, 4, 14); px(c, '#9a6a44', x + 1, 3, 2, 13); px(c, '#c89264', x + 1, 3, 1, 13); px(c, '#6a4228', x + 2, 5, 1, 11); }
    gear(c, 2, 10, 1, 1.3, 6, BRASS, null, 0.2); gear(c, 13, 6, 1, 1.3, 6, BRASS, null, 0.5);
    px(c, OUT, 0, 1, 4, 1); px(c, '#4a8ad8', 1, 0, 2, 1); px(c, OUT, 12, 1, 4, 1); px(c, '#4a8ad8', 13, 0, 2, 1);
    // 大鐘：圓形鐘面，指針指著十二點
    px(c, OUT, 4, 0, 8, 8); px(c, OUT, 3, 1, 10, 6);
    px(c, '#e8b840', 4, 1, 8, 6); px(c, '#e8b840', 5, 0, 6, 8);
    px(c, '#fff4d8', 5, 2, 6, 4); px(c, '#fff4d8', 6, 1, 4, 6);
    px(c, OUT, 8, 2, 1, 3); px(c, OUT, 8, 4, 2, 1); px(c, '#d84a3a', 8, 1, 1, 1);
    px(c, '#fff0a0', 4, 1, 1, 1);
    // 尖頂拱門：深色通道，一道暖光
    px(c, OUT, 4, 8, 8, 8); px(c, '#2a1608', 5, 9, 6, 7); px(c, '#4a2c1a', 6, 9, 4, 7); px(c, '#4a2c1a', 7, 8, 2, 1);
    px(c, '#ffc850', 7, 12, 2, 4); px(c, '#fff0b0', 7, 12, 1, 1);
    px(c, '#c87a3a', 4, 8, 1, 8); px(c, '#c87a3a', 11, 8, 1, 8);
  });
}
