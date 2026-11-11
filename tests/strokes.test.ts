import { describe, expect, it } from 'vitest';
import { STROKES } from '../src/data/strokes';
import type { StrokePoint } from '../src/data/strokes';
import { DENSE_STEP, SAMPLE_STEP, TOLERANCE, densify, sampleStroke, strokeDone, strokeProgress } from '../src/core/strokes';
import { ALL_SYMBOLS } from '../src/data/symbols';
import { MAPS, abilityOf } from '../src/data/maps';
import { MOVES, castSymbol } from '../src/data/monsters';
import { defaultSettings } from '../src/core/save';

const BO: StrokePoint[] = STROKES['ㄅ'][0].points;
const target = sampleStroke(BO);
/** 模擬孩子畫的線：沿著這條折線每 3 單位一個點，可整體偏移 */
const trace = (pts: StrokePoint[], dx = 0, dy = 0) => sampleStroke(pts, 3).map((p) => ({ x: p.x + dx, y: p.y + dy }));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('筆順資料', () => {
  it('ㄅ 是一筆，路徑照圖：起點在左上、終點在中下', () => {
    expect(STROKES['ㄅ']).toHaveLength(1);
    expect(BO[0]).toEqual([31, 14]);
    expect(BO[BO.length - 1]).toEqual([49, 87]);
  });
  it('每個有筆順的符號都是已知的注音，每一畫至少 2 個點，座標在 0～100 內', () => {
    for (const [ch, strokes] of Object.entries(STROKES)) {
      expect(ALL_SYMBOLS.includes(ch), ch).toBe(true);
      for (const s of strokes) {
        expect(s.points.length).toBeGreaterThanOrEqual(2);
        for (const [x, y] of s.points) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(100); }
      }
    }
  });
});

describe('sampleStroke：沿折線取關鍵點', () => {
  it('包含起點與終點', () => {
    expect(target[0]).toEqual({ x: 31, y: 14 });
    expect(target[target.length - 1]).toEqual({ x: 49, y: 87 });
  });
  it('相鄰兩點的距離不超過 SAMPLE_STEP', () => {
    for (let i = 1; i < target.length; i++) expect(dist(target[i - 1], target[i])).toBeLessThanOrEqual(SAMPLE_STEP + 0.01);
  });
  it('一條 20 單位的直線、每 8 單位取點：0、8、16、20', () => {
    expect(sampleStroke([[0, 0], [20, 0]]).map((p) => p.x)).toEqual([0, 8, 16, 20]);
  });
});

describe('densify：補點避免手指太快跳過關鍵點', () => {
  it('相鄰兩點不超過 DENSE_STEP，首尾不變', () => {
    const d = densify([{ x: 0, y: 0 }, { x: 30, y: 0 }]);
    expect(d[0]).toEqual({ x: 0, y: 0 });
    expect(d[d.length - 1]).toEqual({ x: 30, y: 0 });
    for (let i = 1; i < d.length; i++) expect(dist(d[i - 1], d[i])).toBeLessThanOrEqual(DENSE_STEP + 0.01);
  });
  it('少於 2 個點原樣回傳', () => {
    expect(densify([])).toEqual([]);
    expect(densify([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });
});

describe('strokeProgress / strokeDone：判定 ㄅ', () => {
  it('完全照著描：完成', () => {
    expect(strokeProgress(trace(BO), target)).toBe(1);
    expect(strokeDone(trace(BO), target)).toBe(true);
  });
  it('整體歪一點（偏 6、-5，約 7.8 單位，在容許範圍內）：仍然完成', () => {
    expect(strokeDone(trace(BO, 6, -5), target)).toBe(true);
  });
  it(`整體偏很多（偏 20、20，超過容許 ${TOLERANCE}）：不算完成`, () => {
    expect(strokeDone(trace(BO, 20, 20), target)).toBe(false);
  });
  it('方向反了（從終點寫回起點）：不算完成', () => {
    expect(strokeDone(trace([...BO].reverse() as StrokePoint[]), target)).toBe(false);
  });
  it('切轉角（從起點直接劃到右上角，跳過左下的轉角）：不算完成', () => {
    const cut: StrokePoint[] = [BO[0], BO[2], BO[3], BO[4], BO[5], BO[6]];
    expect(strokeDone(trace(cut), target)).toBe(false);
  });
  it('只寫一半：進度在 0 和 1 之間', () => {
    const half = strokeProgress(trace(BO.slice(0, 3)), target);
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(1);
  });
  it('沒有軌跡：進度 0', () => {
    expect(strokeProgress([], target)).toBe(0);
  });
  it('手指移動很快、只有稀疏的幾個點（補點之後）仍可完成', () => {
    const sparse = BO.map(([x, y]) => ({ x, y }));
    expect(strokeDone(sparse, target)).toBe(true);
  });
});

describe('招式互動物件要寫的注音（由招式自動決定）', () => {
  it('castSymbol：每一招綁定的注音', () => {
    expect(castSymbol('blast')).toBe('ㄅ');
    expect(castSymbol('gust')).toBe('ㄆ');
    expect(castSymbol('hum')).toBe('ㄇ');
    expect(castSymbol('fog')).toBe('ㄈ');
    expect(castSymbol('drum')).toBe('ㄉ');
    expect(castSymbol('splash')).toBe('ㄊ');
    expect(castSymbol('nasal')).toBe('ㄋ');
    expect(castSymbol('stream')).toBe('ㄌ');
    expect(castSymbol('nope')).toBeUndefined();
  });
  it('每個需要能力的招式，綁定的注音都有筆順資料', () => {
    for (const m of Object.values(MOVES)) {
      if (!m.needAbility) continue;
      const s = castSymbol(m.needAbility);
      expect(s, m.id).toBeDefined();
      expect(STROKES[s!], `${m.id} → ${s}`).toBeDefined();
    }
  });
  it('每個招式互動物件都對得上一個有筆順資料的注音', () => {
    const kinds = ['rock', 'leaves', 'windmill', 'bell', 'fog', 'gimmick'];
    let count = 0;
    for (const m of Object.values(MAPS)) {
      for (const o of m.objects.filter((x) => kinds.includes(x.kind))) {
        const ab = abilityOf(o);
        expect(ab, `${m.id}/${o.id}`).toBeDefined();
        const s = castSymbol(ab!);
        expect(s, `${m.id}/${o.id}`).toBeDefined();
        expect(STROKES[s!], `${m.id}/${o.id} → ${s}`).toBeDefined();
        count++;
      }
    }
    expect(count).toBe(10); // 裂石 2、落葉、風車、鈴鐺、迷霧，加上島上 4 個機關物件
  });
  it('木門、告示牌、NPC 等不是招式互動物件：沒有對應招式', () => {
    for (const k of ['woodgate', 'sign', 'npc', 'chest', 'monster', 'dock'] as const) {
      expect(abilityOf({ id: 'x', kind: k, x: 0, y: 0 }), k).toBeUndefined();
    }
  });
  it('「寫字挑戰」設定預設開', () => {
    expect(defaultSettings().writeChallenge).toBe(true);
  });
});

describe('全部筆順資料的品質', () => {
  const EXPECTED: Record<string, number> = { 'ㄅ': 1, 'ㄆ': 2, 'ㄇ': 2, 'ㄈ': 2, 'ㄉ': 2, 'ㄊ': 3, 'ㄋ': 1, 'ㄌ': 2 };
  it('有筆順的符號和筆畫數，照筆順圖', () => {
    expect(Object.keys(STROKES).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const [ch, n] of Object.entries(EXPECTED)) expect(STROKES[ch], ch).toHaveLength(n);
  });
  for (const [ch, strokes] of Object.entries(STROKES)) {
    it(`${ch}：每一畫照著描會過；方向反、或拿別畫來描，都不會過`, () => {
      const targets = strokes.map((s) => sampleStroke(s.points));
      strokes.forEach((s, i) => {
        expect(strokeDone(trace(s.points), targets[i]), `${ch} 第 ${i + 1} 畫`).toBe(true);
        expect(strokeDone(trace([...s.points].reverse() as StrokePoint[]), targets[i]), `${ch} 第 ${i + 1} 畫反向`).toBe(false);
        strokes.forEach((o, j) => {
          if (j !== i) expect(strokeDone(trace(o.points), targets[i]), `${ch} 用第 ${j + 1} 畫去描第 ${i + 1} 畫`).toBe(false);
        });
      });
    });
  }
});
