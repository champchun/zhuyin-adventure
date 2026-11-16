// 回家魔法陣（頭目打倒後出現）的地板光環貼圖：24×16 的藍白同心橢圓環，背景透明。
// 光柱與飄升的光點由 World 用 Phaser 圖形疊上去，不在這裡。不依賴 Phaser：預覽或測試可傳入假畫布。
import type { Make, Px } from './snowArt';

export const MAGIC_CIRCLE_TEXTURES = ['magic_circle', 'magic_circle2'] as const;

export function drawMagicCircleTextures(make: Make, px: Px) {
  const W = 24, H = 16, cx = 11.5, cy = 7.5;
  /** 橢圓座標：回傳 1 代表在 (rx, ry) 的橢圓上，<1 在裡面 */
  const e = (x: number, y: number, rx: number, ry: number) => Math.hypot((x - cx) / rx, (y - cy) / ry);
  const draw = (bright: boolean) => (c: Parameters<Px>[0]) => {
    const edge = bright ? '#7fd0ff' : '#4aa8f0', mid = bright ? '#e8f8ff' : '#b8e8ff', soft = bright ? '#4aa8f0' : '#2f6fc0';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dOut = e(x, y, 11.6, 7.6), dMid = e(x, y, 8.6, 5.3), dIn = e(x, y, 5.2, 3.2);
      if (dOut > 1.04) continue;
      if (dOut > 0.9) px(c, edge, x, y);                        // 外環
      else if (dMid > 0.9 && dMid < 1.08) px(c, mid, x, y);     // 中環（最亮）
      else if (dIn > 0.85 && dIn < 1.12) px(c, edge, x, y);     // 內環
      else if (dOut < 0.9 && dIn < 0.85) px(c, bright ? '#bfeaff' : '#7fd0ff', x, y); // 中心發光
      else if (dOut <= 0.9) px(c, soft, x, y);                  // 環間的底色
    }
    // 外環與中環之間的一圈小符文點（十二顆，亮暗兩格交替）
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12 + (bright ? Math.PI / 12 : 0);
      px(c, '#ffffff', Math.round(cx + Math.cos(a) * 10.1), Math.round(cy + Math.sin(a) * 6.4));
    }
    px(c, '#ffffff', 11, 7, 2, 2); // 正中央的亮點
  };
  make('magic_circle', 24, 16, draw(false));
  make('magic_circle2', 24, 16, draw(true));
}
