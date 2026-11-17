import { abilityOf, isBlockedTile } from '../../src/data/maps';
import type { MapDef, MapObj } from '../../src/data/maps';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** 用對的招式後會消失的物件種類（同 core/dungeon） */
const REMOVABLE = new Set(['rock', 'leaves', 'fog']);
/** 踩上去會離開這張地圖的物件：算「走得到」，但不從它那格繼續往外走 */
const PORTAL = new Set(['stairs', 'exit', 'door', 'dock']);

/** 模擬 World 的可見規則：showIf 要有旗標、hideIf 有旗標就隱藏 */
export const visibleWith = (flags: Record<string, boolean>) => (o: MapObj) => !(o.showIf && !flags[o.showIf]) && !(o.hideIf && flags[o.hideIf]);

/**
 * 單張地圖的走路模擬（給洞窟或手寫地圖的「打倒頭目後」測試用）：
 * flags 決定哪些物件看得到（showIf／hideIf）；monsters 不擋路；寶箱、機關等擋路；
 * 裂石／落葉／迷霧／會消失或可穿過的機關，在「走得到旁邊」且 abilities 有對應招式時移除，再繼續擴張。
 * 回傳 reached（走得到的格子 `x,y`）與 touched（走得到旁邊或站得上去的可見物件 id）。
 * 用法：const r = walkMap(MAPS.b, { boss_b: true }, ['blast', 'gust']); r.reached.has('21,4'); r.touched.has('chest_boss');
 */
export function walkMap(map: MapDef, flags: Record<string, boolean>, abilities: string[], from = map.start) {
  const vis = visibleWith(flags);
  const objs = map.objects.filter((o) => vis(o) && o.kind !== 'monster');
  const removed = new Set<string>();
  const solidAt = new Map<string, MapObj>();
  const rebuild = () => { solidAt.clear(); for (const o of objs) if (!removed.has(o.id)) solidAt.set(`${o.x},${o.y}`, o); };
  const ok = (x: number, y: number) => y >= 0 && x >= 0 && y < map.h && x < map.w && !isBlockedTile(map, map.tiles[y][x]);
  const reached = new Set<string>();
  const touched = new Set<string>();
  for (;;) {
    rebuild();
    reached.clear(); touched.clear();
    const q = [{ x: from.x, y: from.y }];
    reached.add(`${from.x},${from.y}`);
    while (q.length) {
      const c = q.shift()!;
      for (const [dx, dy] of N4) {
        const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
        if (!ok(x, y)) continue;
        const o = solidAt.get(k);
        if (o) touched.add(o.id);
        if (reached.has(k)) continue;
        if (o && !PORTAL.has(o.kind)) continue; // 其他物件擋路
        reached.add(k);
        if (!o) q.push({ x, y });
      }
    }
    let acted = false;
    for (const o of objs) {
      const a = abilityOf(o);
      const gone = REMOVABLE.has(o.kind) || (o.kind === 'gimmick' && (o.vanish || o.passable));
      if (gone && !removed.has(o.id) && touched.has(o.id) && a && abilities.includes(a)) { removed.add(o.id); acted = true; }
    }
    if (!acted) break;
  }
  return { reached, touched };
}
