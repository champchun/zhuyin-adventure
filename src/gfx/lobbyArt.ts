// 世界地圖（第二階段入口）的物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，測試也可以傳入假畫布。
import type { Make, Px } from './snowArt';

export const LOBBY_TEXTURES = ['world_map'] as const;

const OUT = '#2b2140';

export function drawLobbyTextures(make: Make, px: Px) {
  // 世界地圖告示板（背景透明，疊在草地或小路上）：木柱撐著一塊羊皮紙，紙上畫著海、綠色小島和一個紅色的目的地標記
  make('world_map', 16, 16, (c) => {
    px(c, '#9a6a3a', 7, 11, 2, 5); px(c, '#6e4a2a', 8, 11, 1, 5);
    px(c, OUT, 1, 1, 14, 11);
    px(c, '#f6e3b0', 2, 2, 12, 9);
    px(c, '#6fb8f0', 3, 3, 10, 7);
    px(c, '#5fbf45', 4, 4, 5, 4); px(c, '#7ed957', 5, 4, 3, 2);
    px(c, '#e8514a', 10, 5, 2, 2); px(c, '#ffd84a', 3, 3, 1, 1);
  });
}
