import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/levels';
import { BLOCKED_TILES, MAPS, abilityOf, objectDepth, TERRAIN_DEPTH } from '../src/data/maps';
import type { MapObj } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { defeatSpot, markArrival } from '../src/core/travel';
import { GIVER_HUBS } from '../src/core/giver';
import { SKY_TEXTURES } from '../src/gfx/skyArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const walk = (m: (typeof MAPS)[string], x: number, y: number) => !BLOCKED_TILES.has(m.tiles[y]?.[x] ?? '#');
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const sh = MAPS.sh, s = MAPS.s, v = MAPS.village;

/** 模擬 World 的 visible：旗標決定物件看不看得到（只處理 showIf／hideIf／vanish 的機關） */
const visibleWith = (flags: Record<string, boolean>) => (m: string, o: MapObj) =>
  !(o.showIf && !flags[o.showIf]) && !(o.hideIf && flags[o.hideIf]) && !(o.kind === 'gimmick' && o.vanish && flags[`g:${m}:${o.id}`]);

/** 從起點用 4 方向走：地形、可見且不可穿過的物件都擋路。passable 機關啟動（flags g:）後可走；monsterSolid 控制怪物擋不擋 */
function floodFrom(map: (typeof MAPS)[string], flags: Record<string, boolean>, monsterSolid: (o: MapObj) => boolean) {
  const vis = visibleWith(flags);
  const solid = new Set(map.objects.filter((o) => vis(map.id, o)
    && !(o.kind === 'gimmick' && o.passable && flags[`g:${map.id}:${o.id}`])
    && !(o.kind === 'monster' && !monsterSolid(o))).map((o) => `${o.x},${o.y}`));
  const seen = new Set<string>([`${map.start.x},${map.start.y}`]);
  const q = [map.start];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of N4) {
      const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
      if (seen.has(k) || !walk(map, x, y) || solid.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  return seen;
}
const adj = (seen: Set<string>, o: { x: number; y: number }) => N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));

describe('交通工具 vehicle：沿用碼頭', () => {
  it('熱氣球與雲朵小船都是 dock，有 vehicle 與專屬貼圖；船碼頭沒有 vehicle', () => {
    const vs = Object.values(MAPS).flatMap((m) => m.objects.filter((o) => o.vehicle).map((o) => `${m.id}/${o.id}:${o.vehicle}`)).sort();
    expect(vs).toEqual(['s/boat_back:cloudboat', 'sh/balloon_back:balloon', 'sh/boat_s:cloudboat', 'village/balloon:balloon']);
    for (const m of Object.values(MAPS)) for (const o of m.objects.filter((p) => p.vehicle)) {
      expect(o.kind, `${m.id}/${o.id}`).toBe('dock');
      expect(SKY_TEXTURES as readonly string[]).toContain(o.sprite);
    }
    expect(MAPS.dh.objects.filter((o) => o.kind === 'dock').every((o) => !o.vehicle)).toBe(true);
  });
  it('每個交通工具只通一個地方：抵達格可走、不壓物件、旁邊有回程交通工具（種類相同）', () => {
    for (const m of Object.values(MAPS)) for (const o of m.objects.filter((p) => p.vehicle)) {
      const to = o.dockTo!, dest = MAPS[to.map];
      expect(walk(dest, to.x, to.y), `${m.id}/${o.id} 抵達格`).toBe(true);
      expect(dest.objects.some((p) => p.x === to.x && p.y === to.y), `${m.id}/${o.id} 抵達格壓物件`).toBe(false);
      const back = dest.objects.find((p) => p.vehicle === o.vehicle && p.dockTo!.map === m.id && dist(p, to) === 1);
      expect(back, `${m.id}/${o.id} 沒有回程`).toBeDefined();
      expect(walk(m, back!.dockTo!.x, back!.dockTo!.y)).toBe(true);
      expect(dist(back!.dockTo!, o), `${m.id}/${o.id} 回來的位置要緊鄰出發的交通工具`).toBe(1);
    }
  });
});

describe('起始村的熱氣球', () => {
  it('只新增 balloon_empty、balloon、balloon_sign：既有物件座標不動', () => {
    const before = ['dock: 21,11', 'door_home: 5,3', 'door_lab: 14,3', 'door_shop: 19,14', 'kid: 7,6', 'elder: 18,8', 'girl: 21,9',
      'chest_t: 8,10', 'dummy: 16,11', 'sign1: 10,15', 'rock_a: 23,4', 'chest_hidden: 23,3', 'bell: 21,7', 'chest_bell: 22,8',
      'fog_a: 10,4', 'chest_fog: 10,2', 'trail_xh: 20,10', 'trail_sign_v: 19,10', 'desert_road: 26,6', 'desert_sign: 25,8', 'gate_b: 4,17', 'gate_p: 7,17'];
    const now = v.objects.map((o) => `${o.id}: ${o.x},${o.y}`);
    for (const l of before) expect(now, l).toContain(l);
    expect(v.objects.map((o) => o.id).filter((id) => !before.some((l) => l.startsWith(id + ':'))).sort()).toEqual(['balloon', 'balloon_empty', 'balloon_sign']);
    expect(v.objects).toHaveLength(before.length + 3);
  });
  it('沒氣的氣球與氣球同一格但 showIf 互斥；除此之外沒有物件重疊；告示牌與抵達格可走、不重疊', () => {
    const e = v.objects.find((o) => o.id === 'balloon_empty')!, b = v.objects.find((o) => o.id === 'balloon')!, sg = v.objects.find((o) => o.id === 'balloon_sign')!;
    expect([e.x, e.y]).toEqual([b.x, b.y]);
    expect(e.showIf).toBe('boss_z');
    expect(b.showIf).toBe('g:village:balloon_empty');
    expect(e.vanish).toBe(true);
    expect(sg.showIf).toBe('boss_z');
    const keys = v.objects.filter((o) => o.id !== 'balloon').map((o) => `${o.x},${o.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const o of [e, b, sg]) expect(walk(v, o.x, o.y), o.id).toBe(true);
    // 其他地圖通到起始村的抵達格不壓在新物件上
    for (const m of Object.values(MAPS)) for (const o of m.objects) {
      const t = o.dockTo ?? o.to;
      if (t && t.map === 'village') for (const p of [e, b, sg]) expect(t.x === p.x && t.y === p.y, `${m.id}/${o.id} 抵達在 ${p.id} 上`).toBe(false);
    }
  });
  it('氣球通雲上小鎮停機坪；ㄖ（sun）要打倒熔岩獸才學到，沒有 boss_z 旗標看不到沒氣的氣球', () => {
    const e = v.objects.find((o) => o.id === 'balloon_empty')!, b = v.objects.find((o) => o.id === 'balloon')!;
    expect(e).toMatchObject({ kind: 'gimmick', ability: 'sun', fx: 'sun', sprite: 'balloon_empty' });
    expect(abilityOf(e)).toBe('sun');
    expect(BATTLES.boss_z.reward.abilities).toContain('sun');
    expect(b.dockTo).toEqual({ map: 'sh', x: sh.hub!.dock.x, y: sh.hub!.dock.y });
    expect(b.sprite).toBe('balloon');
    const noZ = visibleWith({}), withZ = visibleWith({ boss_z: true }), lit = visibleWith({ boss_z: true, 'g:village:balloon_empty': true });
    expect([e, b].map((o) => noZ('village', o))).toEqual([false, false]);
    expect([e, b].map((o) => withZ('village', o))).toEqual([true, false]); // 氣球還沒烤熱：只看得到沒氣的，不能搭
    expect([e, b].map((o) => lit('village', o))).toEqual([false, true]); // 烤熱後換成可搭乘的氣球
  });
  it('從起始村起點走得到氣球旁（打倒 boss_z 後）與告示牌旁', () => {
    const seen = floodFrom(v, { boss_z: true }, () => true);
    for (const id of ['balloon_empty', 'balloon_sign']) expect(adj(seen, v.objects.find((o) => o.id === id)!), id).toBe(true);
    const back = sh.objects.find((o) => o.id === 'balloon_back')!;
    expect(seen.has(`${back.dockTo!.x},${back.dockTo!.y}`)).toBe(true);
    const seen2 = floodFrom(v, { boss_z: true, 'g:village:balloon_empty': true }, () => true);
    expect(adj(seen2, v.objects.find((o) => o.id === 'balloon')!)).toBe(true);
  });
});

describe('雲上小鎮 sh（主島）', () => {
  it('是主島：被打倒送回自己的 respawn、去過會記下來；沒有 exit，也沒有一般船碼頭', () => {
    expect(sh.hub).toBeDefined();
    expect(sh.hub!.defeat).toBeUndefined();
    expect(defeatSpot('sh')).toEqual({ map: 'sh', x: sh.respawn.x, y: sh.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, sh);
    expect(save.flags['visited:sh']).toBe(true);
    expect(save.homeMap).toBe('sh');
    for (const m of [sh, s]) {
      expect(m.objects.some((o) => o.kind === 'exit'), m.id).toBe(false);
      expect(m.objects.filter((o) => o.kind === 'dock').every((o) => o.vehicle), m.id).toBe(true);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(sh, sh.hub!.dock.x, sh.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣；商店有店員；門互相對得上', () => {
    expect(MAPS.sh_inn.objects.find((o) => o.kind === 'innkeeper')!.price).toBe(25);
    expect(MAPS.sh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = sh.objects.find((o) => o.id === 'door_inn')!, ds = sh.objects.find((o) => o.id === 'door_shop')!;
    expect(di.to!.map).toBe('sh_inn');
    expect(ds.to!.map).toBe('sh_shop');
    expect(MAPS.sh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'sh', x: di.x, y: di.y + 1 });
    expect(MAPS.sh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'sh', x: ds.x, y: ds.y + 1 });
  });
  it('島民至少三位、最後一句不設條件；雲上小鎮的台詞不出現 ㄗㄘㄙ（小王前不能出現沒學過的拼音）', () => {
    const npcs = sh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const t of n.talk!) for (const l of t.lines) expect(/[ㄗㄘㄙ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
    for (const o of [...sh.objects, ...s.objects]) for (const l of o.text ?? []) if (o.id !== 'sign1') expect(/[ㄙ]/.test(l), `${o.id}：${l}`).toBe(false);
  });
  it('停機坪與雲朵小船：目的地對得上、雙向', () => {
    const bb = sh.objects.find((o) => o.id === 'balloon_back')!, bs = sh.objects.find((o) => o.id === 'boat_s')!;
    const balloon = v.objects.find((o) => o.id === 'balloon')!, back = s.objects.find((o) => o.id === 'boat_back')!;
    expect(bb.dockTo).toEqual({ map: 'village', x: 25, y: 16 });
    expect(dist(bb.dockTo!, balloon)).toBe(1);
    expect(dist(balloon.dockTo!, bb)).toBe(1);
    expect(bs.dockTo).toEqual({ map: 's', x: s.start.x, y: s.start.y });
    expect(dist(bs.dockTo!, back)).toBe(1);
    expect(dist(back.dockTo!, bs)).toBe(1);
    expect(back.dockTo!.map).toBe('sh');
  });
  it('金幣爺爺與星星婆婆：id 正確、站可走格、彼此與出入口、抵達格至少 2 格、四周有空格', () => {
    const grannies = sh.objects.filter((o) => o.kind === 'granny'), givers = sh.objects.filter((o) => o.kind === 'giver');
    expect(grannies.map((o) => o.id)).toEqual(['granny']);
    expect(givers.map((o) => o.id)).toEqual(['giver']);
    expect(GIVER_HUBS).toContain('sh');
    const [gr, gv] = [grannies[0], givers[0]];
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(sh, p.x, p.y)).toBe(true);
      for (const o of sh.objects.filter((o) => o.kind === 'stairs' || o.kind === 'door' || o.kind === 'dock')) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        if (t && t.map === 'sh') expect(dist(t, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(sh.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(sh, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('格局和前四個主島不同；用雲地 A 為主、有星光水池', () => {
    for (const id of ['dh', 'gh', 'xh', 'zh']) expect(MAPS[id].tiles.join('')).not.toBe(sh.tiles.join(''));
    const t = sh.tiles.join('');
    expect((t.match(/A/g) ?? []).length).toBeGreaterThan(t.length / 2);
    expect(t).toMatch(/N/);
  });
  it('從起點走得到所有一般物件旁', () => {
    const seen = floodFrom(sh, {}, () => true);
    for (const o of sh.objects) expect(adj(seen, o), o.id).toBe(true);
  });
});

describe('星空島 s', () => {
  it('機關能力與特效對得上、拉鍊／雲團消失、彩虹橋是 passable 並換成橋圖', () => {
    for (const [id, ab] of [['zip_curtain', 'zip'], ['cloud_block', 'spike'], ['rainbow', 'whistle']]) {
      const o = s.objects.find((p) => p.id === id)!;
      expect(o.kind, id).toBe('gimmick');
      expect(o.ability).toBe(ab);
      expect(o.fx).toBe(ab);
    }
    expect(s.objects.find((o) => o.id === 'zip_curtain')!.vanish).toBe(true);
    expect(s.objects.find((o) => o.id === 'cloud_block')!.vanish).toBe(true);
    const r = s.objects.find((o) => o.id === 'rainbow')!;
    expect([r.sprite, r.sprite2, r.passable]).toEqual(['rainbow_gap', 'rainbow_bridge', true]);
    expect(objectDepth(r, 176, true)).toBe(TERRAIN_DEPTH);
    expect(objectDepth(r, 176, false)).toBe(176);
    expect(SKY_TEXTURES as readonly string[]).toEqual(expect.arrayContaining(['zip_curtain', 'cloud_block', 'rainbow_gap', 'rainbow_bridge']));
  });
  it('戰鬥與練習戰：dummy 是 spractice（學會就消失）、m1～m3 對 s1～s3、小王是 boss_s1', () => {
    const dummy = s.objects.find((o) => o.id === 'dummy')!;
    expect(dummy).toMatchObject({ kind: 'monster', battle: 'spractice', hideIf: 'spracticeDone' });
    for (const i of [1, 2, 3]) expect(s.objects.find((o) => o.id === `m${i}`)).toMatchObject({ kind: 'monster', battle: `s${i}` });
    expect(BATTLES.s1.reward.flag).toBe('m:s:m1');
    expect(BATTLES.s3.reward.flag).toBe('m:s:m3');
    expect(s.objects.find((o) => o.id === 'guard')).toMatchObject({ kind: 'monster', battle: 'boss_s1', hideIf: 'boss_s1' });
    expect(BATTLES.boss_s1.reward.flag).toBe('boss_s1');
    // 小怪與練習戰的台詞不提 ㄙ（還沒學）
    for (const id of ['spractice', 's1', 's2', 's3']) for (const l of BATTLES[id].intro) expect(/ㄙ/.test(l), `${id}：${l}`).toBe(false);
  });
  it('沒有別的物件壓在地形阻擋格上，小王站在可走格；怪物巡邏路線都是可走格', () => {
    for (const o of s.objects) {
      expect(walk(s, o.x, o.y), o.id).toBe(true);
      for (const p of o.patrol ?? []) expect(walk(s, p.x, p.y), `${o.id} 巡邏`).toBe(true);
    }
  });
  it('起點在回雲上小鎮的雲朵小船旁、進島前就走得到練習用布偶', () => {
    const back = s.objects.find((o) => o.id === 'boat_back')!;
    expect(dist(s.start, back)).toBe(1);
    const seen = floodFrom(s, {}, () => false); // 怪物可以打倒：不擋路
    expect(adj(seen, s.objects.find((o) => o.id === 'dummy')!)).toBe(true);
  });
  it('小王：沒有任何機關招式（zip／spike／whistle 都沒有）就走得到；打倒後（hideIf）才走得到預留的星塔入口 (10,3)', () => {
    const guard = s.objects.find((o) => o.id === 'guard')!;
    const noGuardPass = floodFrom(s, {}, (o) => o.id === 'guard');
    expect(adj(noGuardPass, guard)).toBe(true);
    // 小王擋著：北邊（星塔入口 cave）走不到
    expect(noGuardPass.has('10,3')).toBe(false);
    expect(noGuardPass.has('10,7')).toBe(true);
    // 打倒小王後：走得到
    const after = floodFrom(s, { boss_s1: true }, () => false);
    expect(after.has('10,4')).toBe(true); // 星塔入口 (10,3) 本身是樓梯物件，走到它下方一格就能進去
    expect(walk(s, 10, 3)).toBe(true);
    expect(s.objects.filter((o) => o.x === 10 && o.y === 3).map((o) => o.id)).toEqual(['cave']);
    expect(s.objects.some((o) => o.x === 10 && o.y === 4)).toBe(false);
    expect(walk(s, 10, 4)).toBe(true);
  });
  it('reachReport：以小王之前的能力（沒有 whistle）：拉鍊與雲團的寶箱走得到、彩虹橋對岸走不到；有 whistle 才全部走得到', () => {
    const start = { map: 's', x: s.start.x, y: s.start.y };
    const beforeBoss = ['blast', 'gust', 'hum', 'fog', 'web', 'gulp', 'roar', 'sun', 'zip', 'spike'];
    const un = (ab: string[]) => reachReport([s], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['s/chest_zip', 's/chest_spike', 's/chest_r1', 's/chest_r2']));
    expect(un(['spike', 'whistle'])).toContain('s/chest_zip');
    expect(un(['zip', 'whistle'])).toContain('s/chest_spike');
    const mid = reachReport([s], start, beforeBoss);
    expect(mid.unreachableObjects).toEqual(expect.arrayContaining(['s/chest_r1', 's/chest_r2']));
    expect(mid.unreachableObjects).not.toContain('s/chest_zip');
    expect(mid.unreachableObjects).not.toContain('s/chest_spike');
    expect(mid.unreachableObjects).not.toContain('s/guard');
    const all = reachReport([s], start, [...beforeBoss, 'whistle']);
    expect(all.unreachableObjects, all.unreachableObjects.join(' ')).toEqual([]);
    // 彩虹橋缺口是河上唯一的通道：兩邊都是星光水池
    expect(s.tiles[9][19]).toBe('N');
    expect(s.tiles[11][19]).toBe('N');
  });
  it('進島的 sEntered、回程：雲朵小船只通雲上小鎮，被打倒送回雲上小鎮', () => {
    expect(s.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['sh']);
    const save = { flags: { 'visited:sh': true } as Record<string, boolean>, homeMap: 'sh' as string | undefined };
    expect(defeatSpot(save.homeMap)).toEqual({ map: 'sh', x: sh.respawn.x, y: sh.respawn.y });
  });
});

describe('星塔（產生的迷宮）：用 reachReport 驗證一定解得開，且沒有死結', () => {
  // 打倒小王 boss_s1 之後的能力（含 whistle）；boss_s 沒有能力獎勵，所以不混進任何頭目獎勵
  const afterGuard = ['blast', 'gust', 'hum', 'fog', 'web', 'gulp', 'roar', 'sun', 'zip', 'spike', 'whistle'];
  const beforeGuard = afterGuard.filter((a) => a !== 'whistle');
  const start = { map: 'sc1', x: 2, y: 1 };
  const sc1 = MAPS.sc1, sc2 = MAPS.sc2, s = MAPS.s;
  it('兩層一起走：用小王之後的能力，沒有走不到的地板與物件（含最終頭目），鑰匙剛好用完', () => {
    const r = reachReport([sc1, sc2], start, afterGuard);
    expect(r.unreachableFloor, '有走不到的地板').toEqual([]);
    expect(r.unreachableObjects, '有走不到的物件').toEqual([]);
    expect(r.unreachableObjects).not.toContain('sc2/boss');
    expect(r.keysLeft).toBe(0);
  });
  it('沒有 whistle：二樓石牆後（含頭目）走不到；沒有 blast：隱藏小密室走不到', () => {
    const noWhistle = reachReport([sc1, sc2], start, beforeGuard);
    expect(noWhistle.unreachableFloor.length).toBeGreaterThan(0);
    // reachReport 不把怪物與 showIf 物件算進 unreachableObjects，所以用頭目與頭目寶箱所在的格子判斷
    const bossAt = sc2.objects.find((o) => o.id === 'boss')!, chestAt = sc2.objects.find((o) => o.id === 'chest_boss')!;
    expect(noWhistle.unreachableFloor).toContain(`sc2:${bossAt.x},${bossAt.y}`);
    expect(noWhistle.unreachableFloor).toContain(`sc2:${chestAt.x},${chestAt.y}`);
    expect(reachReport([sc1, sc2], start, afterGuard.filter((a) => a !== 'blast')).unreachableFloor.length).toBeGreaterThan(0);
  });
  it('守門（避免第五關那種死結）：whistle 只來自 boss_s1；boss_s 沒有能力獎勵；cave 要打倒小王才出現', () => {
    expect(BATTLES.boss_s.reward.abilities ?? []).toEqual([]);
    expect(BATTLES.boss_s1.reward.abilities).toContain('whistle');
    // 通往 boss_s 之路需要 whistle，而它在 boss_s1（含）之前就取得
    const bossAt = sc2.objects.find((o) => o.id === 'boss')!;
    const bossCell = `sc2:${bossAt.x},${bossAt.y}`;
    expect(reachReport([sc1, sc2], start, beforeGuard).unreachableFloor).toContain(bossCell);
    expect(reachReport([sc1, sc2], start, afterGuard).unreachableFloor).not.toContain(bossCell);
    // 沒有 boss_s1 就沒有 cave → 進不了星塔（不靠 boss_s 的任何東西）
    const cave = s.objects.find((o) => o.id === 'cave')!;
    expect(cave.showIf).toBe('boss_s1');
    expect(BATTLES.boss_s1.reward.flag).toBe('boss_s1');
    for (const m of Object.values(MAPS)) {
      for (const o of m.objects) if (o.to?.map === 'sc1' && m.id !== 'sc2') expect(o.showIf, `${m.id}/${o.id}`).toBe('boss_s1');
    }
  });
  it('星空島 cave：通 sc1 起點，星塔出口落在它下方一格（可走、沒有物件）', () => {
    const cave = s.objects.find((o) => o.id === 'cave')!;
    expect(cave).toMatchObject({ kind: 'stairs', x: 10, y: 3, label: '星塔', showIf: 'boss_s1' });
    expect(cave.to).toEqual({ map: 'sc1', x: 2, y: 1 });
    const exit = sc1.objects.find((o) => o.id === 'up')!.to!;
    expect(exit).toEqual({ map: 's', x: 10, y: 4 });
    expect(walk(s, exit.x, exit.y)).toBe(true);
    expect(s.objects.some((o) => o.x === exit.x && o.y === exit.y)).toBe(false);
  });
  it('尺寸、地形（雲地 A、雲牆 Z）、同一個 group、物件與頭目設定', () => {
    for (const m of [sc1, sc2]) {
      expect(m.w).toBe(31); expect(m.h).toBe(22); expect(m.group).toBe('sc');
      const t = m.tiles.join('');
      expect(t).toMatch(/A/); expect(t).toMatch(/Z/); expect(t).not.toMatch(/[:S]/);
    }
    const has = (m: typeof sc1, id: string) => m.objects.some((o) => o.id === id);
    expect(has(sc1, 'door')).toBe(true);
    expect(has(sc1, 'chest_key')).toBe(true);
    for (const id of ['barrier1', 'switch1', 'boss', 'chest_boss']) expect(has(sc2, id), id).toBe(true);
    const sw = sc2.objects.find((o) => o.id === 'switch1')!;
    expect(sw).toMatchObject({ ability: 'whistle', fx: 'whistle' });
    const boss = sc2.objects.find((o) => o.id === 'boss')!;
    expect(boss.battle).toBe('boss_s');
    expect(boss.hideIf).toBe('boss_s');
    expect(sc2.objects.find((o) => o.id === 'chest_boss')!.showIf).toBe('boss_s');
    expect(sc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('sc2');
    expect(sc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('sc1');
  });
  it('怪物 id 不和獎勵旗標撞名，戰鬥存在且數量對得上，用天空怪', () => {
    const names: string[] = [];
    for (const m of [sc1, sc2]) for (const o of m.objects.filter((p) => p.kind === 'monster' && p.id !== 'boss')) {
      expect(o.id).toMatch(/^mon[0-9]+$/);
      expect(BATTLES[o.battle!], o.battle).toBeDefined();
      expect(BATTLES[o.battle!].reward.flag).toBe(`m:${m.id}:${o.id}`);
      expect(['cloudy', 'sprite', 'comet']).toContain(BATTLES[o.battle!].enemy);
      names.push(o.battle!);
    }
    expect(names.sort()).toEqual(['sc1m', 'sc1m2', 'sc1m3', 'sc1m4', 'sc2m', 'sc2m2', 'sc2m3']);
  });
});
