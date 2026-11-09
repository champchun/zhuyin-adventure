// 邏輯畫面 320×240；以「整數倍率」放大（倍率同時用於畫布解析度與相機縮放，文字也保持清晰）。
export const VIEW_W = 320;
export const VIEW_H = 240;
export const view = { zoom: 1 };

export function computeZoom(): number {
  const r = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  return r >= 1 ? Math.floor(r) : Math.max(0.5, Math.floor(r * 4) / 4);
}
