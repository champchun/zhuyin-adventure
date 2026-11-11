// 注音筆順資料。座標是 0～100 的方形畫布（左上角 0,0），每一畫是依序要經過的點。
// ㄅ 一筆寫完：從左上起點往左下斜寫，轉角後水平往右，到右上角再轉彎往下彎、最後勾向左下。
// 數值是照筆順圖量的近似值，畫布上的虛線與箭頭若不順，改這裡的座標即可。
export type StrokePoint = [number, number];
export interface StrokeDef { points: StrokePoint[] }

export const STROKES: Record<string, StrokeDef[]> = {
  'ㄅ': [{ points: [[31, 14], [19, 40], [78, 31], [76, 50], [66, 72], [55, 86], [49, 87]] }],
};
