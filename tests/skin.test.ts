import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { MAZES } from '../src/data/mazes';
import { BLOCKED_TILES, DEFAULT_SKIN, MAPS, SKINS, TILE_KEY, isBlockedTile, skinOf, tileKeyOf } from '../src/data/maps';

const LEGACY_IDS: string[] = ['b', 'd', 'dc1', 'dc2', 'dh', 'dh_inn', 'dh_shop', 'g', 'gc1', 'gc2', 'gh', 'gh_inn', 'gh_shop', 'lab', 'p', 'room', 's', 'sc1',
  'sc2', 'sh', 'sh_inn', 'sh_shop', 'shop', 'village', 'x', 'xc1', 'xc2', 'xh', 'xh_inn', 'xh_shop', 'xh_star', 'z', 'zc1', 'zc2', 'zh', 'zh_inn', 'zh_shop'];
const GOLDEN = '7fa7bef59c3fbf2757cbde0efa379b6d7cbd3e1a';

/** 與 Step 1 暫時檔相同的格式，但走新的查詢函式 */
const fingerprint = (ids: string[]) => {
  const h = createHash('sha1');
  for (const id of ids) {
    const m = MAPS[id];
    h.update(id + ':' + m.tiles.map((r) => [...r].map((c) => `${tileKeyOf(m, c)}${isBlockedTile(m, c) ? '!' : ''}`).join(',')).join('|') + ';');
  }
  return h.digest('hex');
};

describe('地形外觀表 skin', () => {
  afterEach(() => { delete SKINS.__test; });

  it('前六關的每張地圖，每個格子的貼圖與擋路設定都和改版前完全一樣（指紋）', () => {
    expect(LEGACY_IDS).toHaveLength(37);
    expect(LEGACY_IDS.every((id) => MAPS[id])).toBe(true);
    expect(fingerprint(LEGACY_IDS)).toBe(GOLDEN);
  });
  it('預設 skin 就是 TILE_KEY 與 BLOCKED_TILES', () => {
    expect(SKINS[DEFAULT_SKIN].key).toBe(TILE_KEY);
    expect(SKINS[DEFAULT_SKIN].blocked).toBe(BLOCKED_TILES);
    expect(skinOf({})).toBe(SKINS[DEFAULT_SKIN]);
  });
  it('每張地圖指定的 skin 都有註冊', () => {
    for (const m of Object.values(MAPS)) expect(SKINS[m.skin ?? DEFAULT_SKIN], m.id).toBeDefined();
  });
  it('自訂 skin：同一個字元可以對應不同貼圖與擋路設定；沒有的字元用草地、不擋路', () => {
    SKINS.__test = { key: { A: 't_x' }, blocked: new Set(['A']) };
    const m = { skin: '__test' };
    expect(tileKeyOf(m, 'A')).toBe('t_x');
    expect(isBlockedTile(m, 'A')).toBe(true);
    expect(tileKeyOf(m, 'Z')).toBe('t_grass');
    expect(isBlockedTile(m, 'Z')).toBe(false);
    // 同一個字元在預設 skin 是別的東西（A＝雲地，可走）
    expect(tileKeyOf({}, 'A')).toBe('t_cloud');
    expect(isBlockedTile({}, 'A')).toBe(false);
  });
  it('沒註冊的 skin 退回預設 skin（不會當機）', () => {
    expect(tileKeyOf({ skin: 'nope' }, 'n')).toBe('t_snow');
  });
  it('每個 skin 的貼圖名稱都是非空字串、擋路字元都是單一字元', () => {
    for (const [id, sk] of Object.entries(SKINS)) {
      for (const [c, k] of Object.entries(sk.key)) {
        expect(c.length, `${id} 的鍵「${c}」`).toBe(1);
        expect(typeof k === 'string' && k.length > 0, `${id}/${c} 的貼圖名稱`).toBe(true);
      }
      for (const c of sk.blocked) expect([...c].length, `${id} 的擋路字元「${c}」`).toBe(1);
    }
  });
  it('產生的迷宮：原始列的擋路判斷（mazeObjects 用 BLOCKED_TILES）和地圖 skin 的判斷逐格一致', () => {
    const ids = ['gc1', 'gc2', 'xc1', 'xc2', 'zc1', 'zc2', 'sc1', 'sc2', 'uc1', 'uc2', 'ac1', 'ac2', 'cc1', 'cc2', 'tc1', 'tc2'];
    for (const id of ids) {
      const m = MAPS[id], raw = MAZES[id as keyof typeof MAZES].rows;
      expect(raw.length, id).toBe(m.h);
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        expect(isBlockedTile(m, m.tiles[y][x]), `${id} (${x},${y}) 原始「${raw[y][x]}」→「${m.tiles[y][x]}」`).toBe(BLOCKED_TILES.has(raw[y][x]));
      }
    }
  });
});
