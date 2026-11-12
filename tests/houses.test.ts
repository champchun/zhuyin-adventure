import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS, TILE_KEY } from '../src/data/maps';

const STYLES: Record<string, { roof: string; wall: string }> = {
  home: { roof: 'h', wall: 'H' },
  inn: { roof: 'i', wall: 'I' },
  shop: { roof: 'k', wall: 'K' },
  lab: { roof: 'l', wall: 'Y' },
};

/** 在地圖上找一棟房子：這一列是屋頂字元、下一列同欄是牆字元、門在牆那一列 */
function houseAt(mapId: string, doorX: number, doorY: number) {
  const m = MAPS[mapId];
  const door = m.tiles[doorY][doorX];
  const wall = m.tiles[doorY][doorX - 1];
  const roof = m.tiles[doorY - 1][doorX];
  return { door, wall, roof };
}

describe('房子外觀：新的地形字元', () => {
  it('每種屋頂、牆都不能走，而且都有貼圖', () => {
    for (const s of Object.values(STYLES)) {
      for (const c of [s.roof, s.wall]) {
        expect(BLOCKED_TILES.has(c), `${c} 要不能走`).toBe(true);
        expect(TILE_KEY[c], `${c} 要有貼圖`).toBeDefined();
      }
    }
    const keys = Object.values(STYLES).flatMap((s) => [TILE_KEY[s.roof], TILE_KEY[s.wall]]);
    expect(new Set(keys).size).toBe(keys.length); // 八張貼圖各不相同
  });
  it('起始村：家是民宅、研究所是研究所、商店是商店', () => {
    expect(houseAt('village', 5, 3)).toEqual({ door: 'D', wall: STYLES.home.wall, roof: STYLES.home.roof });
    expect(houseAt('village', 14, 3)).toEqual({ door: 'D', wall: STYLES.lab.wall, roof: STYLES.lab.roof });
    expect(houseAt('village', 19, 14)).toEqual({ door: 'D', wall: STYLES.shop.wall, roof: STYLES.shop.roof });
  });
  it('鼓聲港與蛙鳴灣：旅館是旅館、商店是商店', () => {
    for (const id of ['dh', 'gh']) {
      expect(houseAt(id, 6, 3), `${id} 旅館`).toEqual({ door: 'D', wall: STYLES.inn.wall, roof: STYLES.inn.roof });
      expect(houseAt(id, 21, 3), `${id} 商店`).toEqual({ door: 'D', wall: STYLES.shop.wall, roof: STYLES.shop.roof });
    }
  });
  it('所有地圖上出現的地形字元都有貼圖', () => {
    for (const m of Object.values(MAPS)) for (const c of new Set(m.tiles.join(''))) expect(TILE_KEY[c], `${m.id} 的「${c}」沒有貼圖`).toBeDefined();
  });
});
