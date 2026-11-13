import type { SaveData } from './save';

/** 金幣少於這個數就算「窮」，金幣爺爺才會出現 */
export const POOR_COINS = 25;
/** 答對後爺爺給的金幣 */
export const GIVER_REWARD = 100;
/** 爺爺會出現的主島 */
export const GIVER_HUBS: readonly string[] = ['dh', 'gh', 'xh', 'zh'];

export function isPoor(coins: number): boolean {
  return coins < POOR_COINS;
}

const visitedHubs = (s: SaveData): string[] => GIVER_HUBS.filter((id) => !!s.flags[`visited:${id}`]);

/** 爺爺目前所在的主島；一座都沒到過回 undefined */
export function giverMap(s: SaveData): string | undefined {
  const v = visitedHubs(s);
  if (s.giverAt && v.includes(s.giverAt)) return s.giverAt;
  return v[0];
}

export function giverVisible(s: SaveData, mapId: string): boolean {
  return isPoor(s.coins) && giverMap(s) === mapId;
}

/** 換到另一座到過的主島；沒有別座就留在原地 */
export function nextGiverMap(s: SaveData, rng: () => number = Math.random): string | undefined {
  const cur = giverMap(s);
  const others = visitedHubs(s).filter((id) => id !== cur);
  if (others.length === 0) return cur;
  return others[Math.floor(rng() * others.length)];
}
