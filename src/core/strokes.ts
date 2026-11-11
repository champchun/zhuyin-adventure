// 寫字判定（純函式，不依賴 Phaser 或 DOM，可直接用 Vitest 測）。
// 做法：把目標筆畫取成一串關鍵點；孩子畫的軌跡補點之後，依序走訪，
// 每次軌跡離「下一個關鍵點」夠近就算經過；全部依序經過才算這一畫完成。
import type { StrokePoint } from '../data/strokes';

export interface Pt { x: number; y: number }

/** 目標筆畫每隔多少單位取一個關鍵點 */
export const SAMPLE_STEP = 8;
/** 孩子的軌跡補點到每隔多少單位一個 */
export const DENSE_STEP = 2;
/** 軌跡離關鍵點多近（單位）才算經過 */
export const TOLERANCE = 14;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** 沿折線每 step 單位取一個點，一定包含起點與終點。 */
export function sampleStroke(points: StrokePoint[], step = SAMPLE_STEP): Pt[] {
  const out: Pt[] = [{ x: points[0][0], y: points[0][1] }];
  let carry = 0; // 距離上一個取樣點已經走了多長
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = step - carry;
    while (d <= len) {
      const t = d / len;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t });
      d += step;
    }
    carry = len - (d - step);
  }
  const last = points[points.length - 1];
  if (dist(out[out.length - 1], { x: last[0], y: last[1] }) > 0.001) out.push({ x: last[0], y: last[1] });
  return out;
}

/** 在相鄰兩點之間補點，讓手指移動太快時不會跳過關鍵點。 */
export function densify(trail: Pt[], step = DENSE_STEP): Pt[] {
  if (trail.length < 2) return trail.slice();
  const out: Pt[] = [trail[0]];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** 軌跡依序經過了多少比例的關鍵點（0～1）。1 代表這一畫寫完了。 */
export function strokeProgress(trail: Pt[], target: Pt[], tol = TOLERANCE): number {
  if (!target.length) return 0;
  let i = 0;
  for (const p of densify(trail)) {
    while (i < target.length && dist(p, target[i]) <= tol) i++;
    if (i >= target.length) break;
  }
  return i / target.length;
}

export const strokeDone = (trail: Pt[], target: Pt[], tol = TOLERANCE): boolean => strokeProgress(trail, target, tol) >= 1;
