// 第七關（海底）的地形與物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，
// 預覽或測試時也可以傳入假的畫布。整體青藍綠，米黃海沙、粉紅珊瑚、白色泡泡。
import type { Ctx2, Make, Px } from './snowArt';

/** 簡單的決定性亂數 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 新增的圖樣 key（測試檢查用）：t_ 開頭是地形圖塊（畫滿 16×16），其餘是物件 */
export const SEA_TEXTURES = [
  't_sea_sand', 't_sea_kelp', 't_sea_path', 't_wreck_deck', 't_sea_coral', 't_sea_rock', 't_sea_deep', 't_sea_pool',
  't_roof_shell', 't_wall_shell', 't_roof_inn_shell', 't_wall_inn_shell', 't_roof_shop_shell', 't_wall_shop_shell', 't_wreck_wall',
  'lantern_jelly', 'lantern_jelly_on', 'giant_clam', 'giant_clam_open', 'bubble_gap', 'bubble_bridge', 'seahorse', 'bubble_gate',
] as const;

const OUT = '#12304a';
const BUB = '#e6fbff';
const BUB_D = '#8fd8ee';

export function drawSeaTextures(make: Make, px: Px) {
  const sand = (c: Ctx2, seed: number) => {
    px(c, '#f2dfae', 0, 0, 16, 16);
    const r = rng(seed);
    for (let i = 0; i < 7; i++) px(c, r() < 0.5 ? '#fff1cc' : '#dcc58a', Math.floor(r() * 14), Math.floor(r() * 15), 1, 1);
  };
  /** 一顆小泡泡（圓圈加亮點） */
  const bubble = (c: Ctx2, x: number, y: number, s: number) => {
    if (s <= 2) { px(c, BUB, x, y, s, s); return; }
    px(c, BUB_D, x + 1, y, s - 2, s); px(c, BUB_D, x, y + 1, s, s - 2);
    px(c, '#c4f1fb', x + 1, y + 1, s - 2, s - 2);
    px(c, '#ffffff', x + 1, y + 1, 1, 1);
  };
  /** 扇貝屋頂：一排排圓弧貼片 */
  const shellRoof = (c: Ctx2, base: string, dark: string, light: string) => {
    px(c, dark, 0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      for (let x0 = (row % 2) * 4 - 4; x0 < 16; x0 += 8) {
        // 一片魚鱗狀的扇貝：上寬下圓，下緣一圈深色，上緣一道亮邊
        px(c, base, x0, y, 8, 2); px(c, base, x0 + 1, y + 2, 6, 1); px(c, base, x0 + 2, y + 3, 4, 1);
        px(c, dark, x0, y + 2, 1, 1); px(c, dark, x0 + 1, y + 3, 1, 1); px(c, dark, x0 + 6, y + 3, 1, 1); px(c, dark, x0 + 7, y + 2, 1, 1);
        px(c, light, x0 + 1, y, 6, 1); px(c, light, x0 + 3, y + 1, 1, 2); px(c, light, x0 + 5, y + 1, 1, 2);
      }
    }
  };
  /** 貝殼屋牆：素色，一扇圓窗、一個小門洞 */
  const shellWall = (c: Ctx2, base: string, dark: string, trim: string) => {
    px(c, base, 0, 0, 16, 16); px(c, trim, 0, 0, 16, 2); px(c, dark, 0, 14, 16, 2);
    px(c, dark, 1, 6, 1, 1); px(c, dark, 14, 9, 1, 1); px(c, dark, 8, 10, 1, 1);
  };

  // ───── 地形 ─────
  // 海沙（可走）：米黃沙地，幾道小波紋
  make('t_sea_sand', 16, 16, (c) => {
    sand(c, 71);
    for (const [x, y] of [[2, 4], [9, 9], [4, 13]]) { px(c, '#e2cb92', x, y, 4, 1); px(c, '#fff7dc', x + 1, y - 1, 2, 1); }
  });
  // 淺藻地（可走，裝飾）：深綠的底，一片片小葉
  make('t_sea_kelp', 16, 16, (c) => {
    px(c, '#2e8a5e', 0, 0, 16, 16);
    const r = rng(72);
    for (let i = 0; i < 6; i++) px(c, '#236f4c', Math.floor(r() * 14), Math.floor(r() * 15), 2, 1);
    for (const [x, y] of [[2, 3], [10, 2], [6, 9], [13, 11], [1, 12]]) {
      px(c, '#58c47e', x, y, 1, 3); px(c, '#58c47e', x + 1, y + 1, 1, 1); px(c, '#8fe6a4', x, y, 1, 1);
      px(c, '#58c47e', x - 1, y + 2, 1, 1);
    }
  });
  // 貝殼小路（可走）：粉白色的小貝殼鋪在沙上
  make('t_sea_path', 16, 16, (c) => {
    sand(c, 73);
    const shell = (x: number, y: number, col: string) => {
      px(c, '#d99aa8', x, y + 1, 5, 3); px(c, col, x + 1, y, 3, 4); px(c, '#ffffff', x + 1, y + 1, 3, 1);
      px(c, '#d99aa8', x + 2, y + 1, 1, 3);
    };
    shell(0, 0, '#ffe3ea'); shell(7, 1, '#fff2f5'); shell(3, 6, '#ffd3de'); shell(10, 7, '#ffe3ea'); shell(0, 11, '#fff2f5'); shell(7, 12, '#ffd3de');
  });
  // 沉船甲板（可走）：淺褐木板，橫向木紋
  make('t_wreck_deck', 16, 16, (c) => {
    px(c, '#c99a5e', 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) px(c, '#8f6434', 0, y + 3, 16, 1);
    for (let y = 0; y < 16; y += 4) px(c, '#e0b678', 0, y, 16, 1);
    for (const [x, y] of [[2, 1], [9, 2], [5, 5], [12, 6], [1, 9], [8, 10], [4, 13], [11, 14]]) px(c, '#a87a44', x, y, 3, 1);
    for (const [x, y] of [[7, 0], [3, 4], [13, 8], [6, 12]]) px(c, '#6a4624', x, y, 1, 1);
  });
  // 珊瑚叢（不可走）：海沙上長著粉紅與橘色的珊瑚
  make('t_sea_coral', 16, 16, (c) => {
    sand(c, 74);
    // 粉紅珊瑚
    px(c, '#c2457a', 3, 6, 3, 9); px(c, '#c2457a', 1, 4, 2, 4); px(c, '#c2457a', 6, 3, 2, 5); px(c, '#c2457a', 4, 2, 2, 5);
    px(c, '#ff7fb0', 4, 5, 1, 9); px(c, '#ff7fb0', 1, 4, 1, 3); px(c, '#ff7fb0', 4, 2, 1, 3); px(c, '#ff7fb0', 6, 3, 1, 3);
    // 橘色珊瑚
    px(c, '#d9641e', 9, 5, 3, 10); px(c, '#d9641e', 12, 3, 2, 6); px(c, '#d9641e', 8, 3, 2, 4);
    px(c, '#ffa04a', 10, 4, 1, 10); px(c, '#ffa04a', 12, 3, 1, 4); px(c, '#ffa04a', 8, 3, 1, 3);
    px(c, '#ffd09a', 10, 4, 1, 1); px(c, '#ffc2dc', 4, 2, 1, 1);
    px(c, '#a88c58', 2, 14, 12, 2);
  });
  // 礁岩（不可走）：灰藍的岩石，帶裂紋與青苔
  make('t_sea_rock', 16, 16, (c) => {
    px(c, '#5a7188', 0, 0, 16, 16);
    for (const [x, y, w, h] of [[0, 0, 7, 6], [7, 1, 9, 6], [1, 7, 8, 8], [9, 8, 7, 8]]) {
      px(c, '#7f98ae', x, y, w, h); px(c, '#a9bfd0', x, y, w, 1); px(c, '#a9bfd0', x, y, 1, h - 1); px(c, '#3f5468', x + 1, y + h - 1, w - 1, 1);
    }
    px(c, '#3f5468', 7, 2, 1, 4); px(c, '#3f5468', 5, 10, 1, 4); px(c, '#4fae7c', 2, 2, 3, 1); px(c, '#4fae7c', 11, 9, 3, 1); px(c, '#4fae7c', 3, 13, 2, 1);
  });
  // 深水溝（不可走）：很深的深藍，越往下越暗，只剩一點點亮紋
  make('t_sea_deep', 16, 16, (c) => {
    px(c, '#0c2f6a', 0, 0, 16, 16); px(c, '#0a2556', 0, 5, 16, 6); px(c, '#071a40', 0, 10, 16, 6); px(c, '#04112c', 3, 12, 10, 4);
    px(c, '#1b4f9a', 0, 0, 16, 1); px(c, '#2663b8', 2, 1, 5, 1); px(c, '#1b4f9a', 9, 3, 5, 1);
    px(c, '#16408a', 3, 7, 3, 1); px(c, '#16408a', 10, 9, 3, 1);
    px(c, '#2b6ac0', 7, 6, 1, 1); px(c, '#2b6ac0', 12, 13, 1, 1);
  });
  // 泡泡池（不可走）：淺藍的水，一顆顆白泡泡，邊緣一圈白
  make('t_sea_pool', 16, 16, (c) => {
    px(c, '#7ed3f0', 0, 0, 16, 16); px(c, '#5bbbe0', 0, 8, 16, 8); px(c, '#a6e6f8', 2, 3, 6, 1); px(c, '#a6e6f8', 8, 12, 6, 1);
    px(c, '#e6fbff', 0, 0, 16, 1); px(c, '#e6fbff', 0, 15, 16, 1); px(c, '#e6fbff', 0, 0, 1, 16); px(c, '#e6fbff', 15, 0, 1, 16);
    bubble(c, 2, 2, 5); bubble(c, 9, 4, 4); bubble(c, 4, 9, 4); bubble(c, 10, 10, 5);
    px(c, '#ffffff', 8, 2, 1, 1); px(c, '#ffffff', 3, 12, 1, 1); px(c, '#ffffff', 13, 6, 1, 1);
  });

  // ───── 貝殼屋：扇貝形屋頂、素色牆 ─────
  make('t_roof_shell', 16, 16, (c) => shellRoof(c, '#ff9fbf', '#c8578a', '#ffd6e4'));
  make('t_wall_shell', 16, 16, (c) => {
    shellWall(c, '#fdeef0', '#d9b3bd', '#f2c9d4');
    px(c, OUT, 5, 5, 6, 9); px(c, OUT, 6, 4, 4, 1); px(c, '#4a9fbf', 6, 6, 4, 8); px(c, '#4a9fbf', 7, 5, 2, 1); px(c, '#ffe9a0', 9, 10, 1, 1);
  });
  make('t_roof_inn_shell', 16, 16, (c) => shellRoof(c, '#ffd75a', '#c8932a', '#fff2a8'));
  make('t_wall_inn_shell', 16, 16, (c) => {
    shellWall(c, '#fdf6dc', '#d6c48a', '#f2e29a');
    for (const x of [1, 9]) { px(c, OUT, x, 5, 6, 8); px(c, OUT, x + 1, 4, 4, 1); px(c, '#ffd75a', x + 1, 6, 4, 6); px(c, '#ffd75a', x + 2, 5, 2, 1); px(c, '#fff6b0', x + 1, 6, 2, 2); px(c, '#c8932a', x + 2, 6, 1, 6); }
  });
  make('t_roof_shop_shell', 16, 16, (c) => shellRoof(c, '#6ec3f2', '#2f76b0', '#c4e8fb'));
  make('t_wall_shop_shell', 16, 16, (c) => {
    shellWall(c, '#eaf6fb', '#a8c8d8', '#bfe0f0');
    px(c, OUT, 1, 5, 14, 8); px(c, '#fdf6dc', 2, 6, 12, 6); px(c, '#ffffff', 3, 7, 3, 1); px(c, '#ff9fbf', 8, 8, 3, 3); px(c, '#ffd75a', 11, 9, 2, 3);
  });
  // 沉船木牆（不可走）：深褐木板，圓圓的鐵釘
  make('t_wreck_wall', 16, 16, (c) => {
    px(c, '#5a3a22', 0, 0, 16, 16);
    for (let x = 0; x < 16; x += 5) { px(c, '#3a2314', x + 4, 0, 1, 16); px(c, '#7a5232', x, 0, 1, 16); }
    for (const x of [1, 6, 11]) for (const y of [2, 10]) { px(c, '#8a8f96', x + 1, y, 2, 2); px(c, '#d4d9de', x + 1, y, 1, 1); px(c, '#3a3f46', x + 2, y + 1, 1, 1); }
    px(c, '#3a2314', 0, 15, 16, 1); px(c, '#4fae7c', 3, 14, 4, 1); px(c, '#4fae7c', 11, 14, 3, 1);
  });

  // ───── 物件（背景透明，放在海沙上）─────
  /** 燈籠水母：傘狀的身體與垂下的觸手，on 時整隻發光 */
  const jelly = (c: Ctx2, on: boolean) => {
    const body = on ? '#fff3a0' : '#9aa6b0';
    const hi = on ? '#ffffff' : '#c0c8d0';
    const shade = on ? '#ffd84a' : '#6f7c88';
    const tent = on ? '#ffe680' : '#7f8c98';
    if (on) { px(c, '#fff6c8', 1, 1, 14, 9); px(c, '#fff6c8', 3, 0, 10, 12); px(c, '#fff6c8', 0, 3, 16, 5); }
    px(c, OUT, 3, 2, 10, 8); px(c, OUT, 4, 1, 8, 1); px(c, OUT, 2, 4, 1, 5); px(c, OUT, 13, 4, 1, 5);
    px(c, body, 4, 2, 8, 7); px(c, body, 3, 4, 10, 4); px(c, hi, 5, 3, 3, 2); px(c, hi, 4, 5, 1, 1); px(c, shade, 4, 8, 8, 1); px(c, shade, 10, 5, 2, 3);
    px(c, OUT, 5, 5, 1, 2); px(c, OUT, 10, 5, 1, 2);
    for (const [x, off] of [[4, 0], [6, 1], [9, 0], [11, 1]]) { px(c, tent, x, 10, 1, 4); px(c, tent, x + (off ? 1 : -1), 12, 1, 3); }
    px(c, OUT, 7, 14, 2, 1);
    if (!on) { px(c, '#5a6672', 6, 7, 4, 1); }
  };
  make('lantern_jelly', 16, 16, (c) => jelly(c, false));
  make('lantern_jelly_on', 16, 16, (c) => jelly(c, true));

  /** 大貝殼：下殼在底，關＝上殼蓋著，開＝上殼往上張開、裡面有珍珠 */
  make('giant_clam', 16, 16, (c) => {
    px(c, OUT, 1, 4, 14, 11); px(c, OUT, 3, 2, 10, 2); px(c, OUT, 2, 3, 12, 1);
    px(c, '#ff9fbf', 2, 5, 12, 9); px(c, '#ff9fbf', 3, 3, 10, 2);
    for (const x of [4, 6, 8, 10]) px(c, '#c2457a', x, 4, 1, 10);
    px(c, '#ffd6e4', 3, 4, 3, 1); px(c, '#ffd6e4', 2, 6, 1, 4);
    px(c, '#c2457a', 2, 13, 12, 1); px(c, OUT, 1, 9, 14, 1); px(c, '#ffe9a0', 7, 9, 2, 1);
  });
  make('giant_clam_open', 16, 16, (c) => {
    // 往上翹起的上殼
    px(c, OUT, 0, 0, 16, 6); px(c, OUT, 2, 6, 12, 1);
    px(c, '#ff9fbf', 1, 1, 14, 4); px(c, '#c2457a', 1, 4, 14, 1);
    for (const x of [3, 6, 9, 12]) px(c, '#c2457a', x, 1, 1, 3);
    px(c, '#ffd6e4', 2, 1, 3, 1);
    // 下殼，裡面是奶油色
    px(c, OUT, 0, 7, 16, 8); px(c, OUT, 2, 15, 12, 1);
    px(c, '#ff9fbf', 1, 8, 14, 6); px(c, '#fff0d8', 2, 8, 12, 4); px(c, '#c2457a', 2, 14, 12, 1);
    // 珍珠
    px(c, '#9aa8c0', 6, 8, 4, 4); px(c, '#ffffff', 6, 8, 3, 3); px(c, '#ffffff', 7, 7, 1, 1); px(c, '#e6ecff', 9, 10, 1, 1);
  });

  // 深水溝缺口：一塊深水溝，中間一個比較亮的缺口，兩側冒出氣泡
  make('bubble_gap', 16, 16, (c) => {
    // 畫滿整格（和旁邊的深水溝 t_sea_deep 接起來不留縫）
    px(c, '#0c2f6a', 0, 0, 16, 16); px(c, '#0a2556', 0, 10, 16, 6); px(c, '#1b4f9a', 0, 0, 16, 1);
    px(c, OUT, 4, 3, 8, 10); px(c, '#02091c', 5, 4, 6, 9); px(c, '#071a40', 5, 4, 6, 2);
    px(c, '#16408a', 3, 6, 1, 4); px(c, '#16408a', 12, 6, 1, 4);
    bubble(c, 1, 9, 3); bubble(c, 2, 4, 2); bubble(c, 1, 1, 1);
    bubble(c, 12, 8, 3); bubble(c, 13, 3, 2); bubble(c, 14, 0, 1);
  });
  // 泡泡橋：深水溝上排成一串的大泡泡，可以踩著走過去
  make('bubble_bridge', 16, 16, (c) => {
    // 畫滿整格（和旁邊的深水溝 t_sea_deep 接起來不留縫）
    px(c, '#0c2f6a', 0, 0, 16, 16); px(c, '#0a2556', 0, 11, 16, 5); px(c, '#071a40', 0, 13, 16, 3); px(c, '#1b4f9a', 0, 0, 16, 1);
    px(c, '#071a40', 0, 4, 16, 8);
    for (const [x, y] of [[0, 5], [5, 4], [10, 5]]) {
      px(c, OUT, x, y + 1, 5, 5); px(c, OUT, x + 1, y, 3, 7);
      px(c, '#6ad0ec', x + 1, y + 1, 3, 5); px(c, '#6ad0ec', x, y + 2, 5, 3);
      px(c, '#c4f3ff', x + 1, y + 1, 3, 3); px(c, '#ffffff', x + 1, y + 1, 2, 1); px(c, '#ffffff', x + 1, y + 2, 1, 1);
    }
    px(c, '#aef0fb', 5, 7, 1, 1); px(c, '#aef0fb', 10, 8, 1, 1); px(c, '#aef0fb', 15, 7, 1, 1);
  });

  // 海馬（碼頭）：彎彎的身體、小尾巴，旁邊一叢海草
  make('seahorse', 16, 16, (c) => {
    // 海草
    for (const [x, h] of [[1, 9], [3, 6], [13, 8]]) { px(c, '#2e8a5e', x, 15 - h, 1, h); px(c, '#58c47e', x + 1, 15 - h + 1, 1, h - 3); }
    // 海馬：頭、嘴、身體、肚子、尾巴
    px(c, OUT, 6, 1, 6, 5); px(c, OUT, 3, 3, 4, 2); px(c, OUT, 7, 5, 6, 7); px(c, OUT, 6, 11, 5, 3); px(c, OUT, 5, 13, 3, 2);
    px(c, '#ffb23a', 7, 2, 4, 3); px(c, '#ffb23a', 4, 3, 3, 1); px(c, '#ffb23a', 8, 5, 4, 6); px(c, '#ffb23a', 7, 11, 3, 2); px(c, '#ffb23a', 6, 13, 1, 1);
    px(c, '#ffe08a', 9, 6, 2, 4); px(c, '#d97a1a', 11, 6, 1, 5); px(c, '#d97a1a', 8, 5, 3, 1);
    px(c, OUT, 9, 2, 1, 1); px(c, '#ffffff', 8, 2, 1, 1);
    px(c, '#ff9fbf', 12, 5, 2, 3); px(c, '#ff9fbf', 7, 0, 3, 1); // 背鰭、冠
  });

  // 泡泡門（出入口）：一圈大泡泡組成的拱門，中間露出海沙小路
  make('bubble_gate', 16, 16, (c) => {
    // 門洞：深色的通道，下面是貝殼小路
    px(c, '#12506a', 4, 5, 8, 11); px(c, '#12506a', 5, 4, 6, 1); px(c, '#1c7f9a', 5, 6, 6, 10); px(c, '#1c7f9a', 6, 5, 4, 1);
    px(c, '#ffe3ea', 5, 12, 6, 4); px(c, '#ffd3de', 6, 13, 2, 1); px(c, '#ffffff', 9, 14, 2, 1);
    // 一圈大泡泡：左柱、拱頂、右柱
    const big = (x: number, y: number) => {
      px(c, OUT, x, y + 1, 5, 3); px(c, OUT, x + 1, y, 3, 5);
      px(c, '#6ad0ec', x + 1, y + 1, 3, 3); px(c, '#c4f3ff', x + 1, y + 1, 3, 2); px(c, '#ffffff', x + 1, y + 1, 1, 1);
    };
    big(0, 11); big(0, 7); big(0, 3); big(2, 0);
    big(11, 11); big(11, 7); big(11, 3); big(9, 0);
    big(5, 0); // 拱頂正中
    px(c, '#ffffff', 7, 2, 2, 1);
  });
}
