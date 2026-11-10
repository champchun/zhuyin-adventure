// 邏輯畫面 320×240。
// 畫布解析度 = 邏輯 × 整數倍率（文字與相機縮放保持清晰），
// 顯示大小則用 CSS 依視窗「精確等比例」放大，避免整數倍率造成四周留下大片黑邊。
export const VIEW_W = 320;
export const VIEW_H = 240;
export const view = { zoom: 1, fit: 1 };

/** 視窗可容納的精確倍率（可為小數）。 */
export function computeFit(): number {
  return Math.max(0.5, Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H));
}

/** 畫布解析度倍率：不小於顯示倍率的整數（最多 6，避免記憶體過大）。 */
export function computeZoom(): number {
  const r = computeFit();
  return r >= 1 ? Math.min(6, Math.ceil(r)) : Math.max(0.5, Math.floor(r * 4) / 4);
}
