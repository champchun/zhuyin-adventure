// 迷宮用的文字圖：一行一行寫地圖，比用程式蓋格子更容易看出路徑。
// 這裡只負責把文字圖變成「格子字元」與「物件」；樓層的名字、起點等由 maps.ts 組起來。
import type { MapObj } from './maps';

/** 圖例：文字圖裡的某個字元代表哪一種物件（座標由字元的位置決定，所以不用寫 x、y；id 一定要寫） */
export type Legend = Record<string, Omit<MapObj, 'x' | 'y'>>;

export interface AsciiFloor {
  w: number;
  h: number;
  /** 格子字元，可以直接放進 MapDef.tiles（S＝懸崖牆、:＝泥土地板） */
  tiles: string[];
  objects: MapObj[];
}

/**
 * rows：文字圖。`#` 牆、`.` 地板、圖例裡的字元＝地板上放一個物件。其他字元會丟出錯誤。
 * 起點、玩家可以進來的位置不用特別標記：由地圖的 start 與樓梯的 to 決定。
 */
export function fromAscii(rows: string[], legend: Legend = {}): AsciiFloor {
  const w = rows[0].length;
  const tiles: string[] = [];
  const objects: MapObj[] = [];
  const seen = new Set<string>();
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`第 ${y} 行長度是 ${row.length}，應該跟第 0 行一樣是 ${w}`);
    let line = '';
    [...row].forEach((c, x) => {
      if (c === '#') line += 'S';
      else if (c === '.') line += ':';
      else if (legend[c]) {
        const def = legend[c];
        if (seen.has(def.id)) throw new Error(`物件 id 重複：${def.id}（字元「${c}」出現不只一次？）`);
        seen.add(def.id);
        objects.push({ ...def, x, y });
        line += ':';
      } else throw new Error(`第 ${y} 行第 ${x} 欄的字元「${c}」沒有定義`);
    });
    tiles.push(line);
  });
  return { w, h: rows.length, tiles, objects };
}
