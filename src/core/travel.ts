// 主島與搭船的純邏輯（不依賴 Phaser，可直接用 Vitest 測）。
import { MAPS } from '../data/maps';
import type { MapDef } from '../data/maps';

export interface Spot { map: string; x: number; y: number }

/** 去過的主島（依地圖資料的順序）。進入主島時 markArrival 會設旗標 visited:<mapId>。 */
export function visitedHubs(flags: Record<string, boolean>, maps: Record<string, MapDef> = MAPS): MapDef[] {
  return Object.values(maps).filter((m) => m.hub && flags[`visited:${m.id}`]);
}

/** 搭船到這座主島時，落腳在碼頭旁。m 必須是主島（有 hub）。 */
export function dockSpot(m: MapDef): Spot {
  return { map: m.id, x: m.hub!.dock.x, y: m.hub!.dock.y };
}

/**
 * 被打倒後送去哪：最近到過的主島（沒有紀錄、或紀錄的不是主島，就用起始村）。
 * 主島可以用 hub.defeat 自訂（起始村送回自己的房間），否則送到該島的 respawn 位置。
 */
export function defeatSpot(homeMap: string | undefined, maps: Record<string, MapDef> = MAPS): Spot {
  const hub = homeMap ? maps[homeMap] : undefined;
  const m = hub?.hub ? hub : maps.village;
  return m.hub?.defeat ?? { map: m.id, x: m.respawn.x, y: m.respawn.y };
}

/** 進入地圖時呼叫：如果是主島，記下「去過」並把它當成最近的主島。 */
export function markArrival(save: { flags: Record<string, boolean>; homeMap?: string }, m: MapDef): void {
  if (!m.hub) return;
  save.flags[`visited:${m.id}`] = true;
  save.homeMap = m.id;
}

/** 換地圖時，要不要讓已經打倒的野生怪重生：同一個洞窟（group 相同）的樓層之間不重生，從外面進來才重生。 */
export function shouldRespawn(from: MapDef | undefined, to: MapDef): boolean {
  return !(from?.group && from.group === to.group);
}

/** 從外面進洞窟時要重生野生怪的地圖：目的地先，然後是同一個 group 的其他樓層。 */
export function respawnMapIds(to: MapDef, maps: Record<string, MapDef> = MAPS): string[] {
  const ids = [to.id];
  if (to.group) for (const m of Object.values(maps)) if (m.group === to.group && !ids.includes(m.id)) ids.push(m.id);
  return ids;
}
