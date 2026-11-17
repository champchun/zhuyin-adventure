import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/levels';
import { MAZES } from '../src/data/mazes';
import { MAPS, isBlockedTile, objectDepth, TERRAIN_DEPTH } from '../src/data/maps';
import type { MapObj } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { GIVER_HUBS } from '../src/core/giver';
import { defeatSpot, markArrival } from '../src/core/travel';
import { SEA_TEXTURES } from '../src/gfx/seaArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const uh = MAPS.uh, u = MAPS.u, lobby = MAPS.lobby;
const walk = (m: (typeof MAPS)[string], x: number, y: number) => !isBlockedTile(m, m.tiles[y]?.[x] ?? '#');
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const visibleWith = (flags: Record<string, boolean>) => (m: string, o: MapObj) =>
  !(o.showIf && !flags[o.showIf]) && !(o.hideIf && flags[o.hideIf]) && !(o.kind === 'gimmick' && o.vanish && flags[`g:${m}:${o.id}`]);
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

describe('珊瑚港 uh（主島）', () => {
  it('是主島：用 sea skin；被打倒送回自己、去過會記下；起點、respawn、dock 可走；沒有 exit，碼頭都是交通工具', () => {
    expect(uh.skin).toBe('sea');
    expect(uh.hub).toBeDefined();
    expect(defeatSpot('uh')).toEqual({ map: 'uh', x: uh.respawn.x, y: uh.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, uh);
    expect(save.flags['visited:uh']).toBe(true);
    expect(save.homeMap).toBe('uh');
    for (const m of [uh, u]) {
      expect(m.objects.some((o) => o.kind === 'exit'), m.id).toBe(false);
      expect(m.objects.filter((o) => o.kind === 'dock').every((o) => o.vehicle === 'seahorse'), m.id).toBe(true);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(uh, uh.hub!.dock.x, uh.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣、台詞提到珊瑚港；商店有店員；門互相對得上', () => {
    const k = MAPS.uh_inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(k.price).toBe(25);
    expect(k.text![0]).toContain('珊瑚港');
    expect(k.doneText!.length).toBeGreaterThan(0);
    expect(MAPS.uh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = uh.objects.find((o) => o.id === 'door_inn')!, ds = uh.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.uh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'uh', x: di.x, y: di.y + 1 });
    expect(MAPS.uh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'uh', x: ds.x, y: ds.y + 1 });
  });
  it('大廳 gate7 與珊瑚港的泡泡門互為出入口；抵達格可走、不壓物件', () => {
    const g7 = lobby.objects.find((o) => o.id === 'gate7')!;
    expect(g7).toMatchObject({ kind: 'stairs', sprite: 'bubble_gate' });
    expect(g7.showIf).toBeUndefined();
    expect(g7.to).toEqual({ map: 'uh', x: uh.start.x, y: uh.start.y });
    const back = uh.objects.find((o) => o.id === 'bubble_gate_back')!;
    expect(back).toMatchObject({ kind: 'stairs', sprite: 'bubble_gate' });
    expect(back.to).toEqual({ map: 'lobby', x: g7.x, y: g7.y + 1 });
    expect(walk(lobby, back.to!.x, back.to!.y)).toBe(true);
    expect(lobby.objects.some((o) => o.x === back.to!.x && o.y === back.to!.y)).toBe(false);
    expect(dist(uh.start, back)).toBe(1);
    expect(lobby.objects.filter((o) => ['gate8', 'gate9', 'gate10'].includes(o.id)).every((o) => o.kind === 'barrier')).toBe(true);
    expect(SEA_TEXTURES as readonly string[]).toContain('bubble_gate');
  });
  it('海馬：通海藻森林，雙向、抵達格緊鄰對面的海馬；貼圖已註冊', () => {
    const sh = uh.objects.find((o) => o.id === 'seahorse')!, back = u.objects.find((o) => o.id === 'seahorse_back')!;
    expect(sh).toMatchObject({ kind: 'dock', vehicle: 'seahorse', sprite: 'seahorse' });
    expect(sh.dockTo).toEqual({ map: 'u', x: u.start.x, y: u.start.y });
    expect(dist(sh.dockTo!, back)).toBe(1);
    expect(back.dockTo!.map).toBe('uh');
    expect(dist(back.dockTo!, sh)).toBe(1);
    expect(SEA_TEXTURES as readonly string[]).toContain('seahorse');
    for (const o of [sh, back]) expect(walk(MAPS[o.dockTo!.map], o.dockTo!.x, o.dockTo!.y)).toBe(true);
  });
  it('島民至少三位、最後一句不設條件；ㄩ 學會（uPractice）之前，台詞與告示牌不出現 ㄩ', () => {
    const npcs = uh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const t of n.talk!) for (const l of t.lines) expect(/ㄩ/.test(l), `${n.id}：${l}`).toBe(false);
    }
    // 告示牌（text）與機關還沒啟動時的提示（lockText）都在學會 ㄩ 之前就看得到；hitText／doneText 要等招式學會、啟動之後才出現，不在此限
    for (const o of [...uh.objects, ...u.objects]) for (const l of [...(o.text ?? []), ...(o.lockText ?? [])]) expect(/ㄩ/.test(l), `${o.id}：${l}`).toBe(false);
  });
  it('金幣爺爺與星星婆婆：id 正確、站可走格、彼此與出入口至少 2 格、四周有空格；GIVER_HUBS 含 uh', () => {
    expect(GIVER_HUBS).toContain('uh');
    const gr = uh.objects.find((o) => o.kind === 'granny')!, gv = uh.objects.find((o) => o.kind === 'giver')!;
    expect([gr.id, gv.id]).toEqual(['granny', 'giver']);
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(uh, p.x, p.y)).toBe(true);
      for (const o of uh.objects.filter((o) => ['stairs', 'door', 'dock'].includes(o.kind))) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        if (t && t.map === 'uh') expect(dist(t, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(uh.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(uh, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('格局和前五個主島不同；從起點走得到所有一般物件旁', () => {
    for (const id of ['dh', 'gh', 'xh', 'zh', 'sh']) expect(MAPS[id].tiles.join('')).not.toBe(uh.tiles.join(''));
    expect(uh.tiles.join('')).toMatch(/O/);
    const seen = floodFrom(uh, {}, () => true);
    for (const o of uh.objects) expect(adj(seen, o), o.id).toBe(true);
  });
});

describe('海藻森林 u', () => {
  it('用 sea skin；燈籠水母 glow（ㄧ）與大貝殼 jet（ㄨ）啟動後換圖留在原地、寶箱 showIf 對應；泡泡橋 pop（ㄩ）是 passable', () => {
    expect(u.skin).toBe('sea');
    const l = u.objects.find((o) => o.id === 'lantern')!, c = u.objects.find((o) => o.id === 'clam')!, b = u.objects.find((o) => o.id === 'bubble_bridge')!;
    expect(l).toMatchObject({ kind: 'gimmick', ability: 'glow', fx: 'glow', sprite: 'lantern_jelly', sprite2: 'lantern_jelly_on' });
    expect(c).toMatchObject({ kind: 'gimmick', ability: 'jet', fx: 'jet', sprite: 'giant_clam', sprite2: 'giant_clam_open' });
    expect(b).toMatchObject({ kind: 'gimmick', ability: 'pop', fx: 'pop', sprite: 'bubble_gap', sprite2: 'bubble_bridge', passable: true });
    expect(l.vanish).toBeFalsy(); expect(c.vanish).toBeFalsy();
    expect(u.objects.find((o) => o.id === 'chest_lantern')!.showIf).toBe('g:u:lantern');
    expect(u.objects.find((o) => o.id === 'chest_clam')!.showIf).toBe('g:u:clam');
    expect(objectDepth(b, 176, true)).toBe(TERRAIN_DEPTH);
    expect(SEA_TEXTURES as readonly string[]).toEqual(expect.arrayContaining(['lantern_jelly', 'lantern_jelly_on', 'giant_clam', 'giant_clam_open', 'bubble_gap', 'bubble_bridge']));
  });
  it('戰鬥：dummy 是 upractice（學會就消失）、m1～m3 對 u1～u3（m3 在練習戰之後才出現）', () => {
    expect(u.objects.find((o) => o.id === 'dummy')).toMatchObject({ kind: 'monster', battle: 'upractice', hideIf: 'uPractice' });
    for (const i of [1, 2, 3]) expect(u.objects.find((o) => o.id === `m${i}`)).toMatchObject({ kind: 'monster', battle: `u${i}` });
    expect(u.objects.find((o) => o.id === 'm3')!.showIf).toBe('uPractice');
    expect(BATTLES.u1.reward.flag).toBe('m:u:m1');
  });
  it('物件都站在可走格、巡邏路線都是可走格；起點在海馬旁、進島前就走得到練習用布偶', () => {
    for (const o of u.objects) {
      expect(walk(u, o.x, o.y), o.id).toBe(true);
      for (const p of o.patrol ?? []) expect(walk(u, p.x, p.y), `${o.id} 巡邏`).toBe(true);
    }
    expect(dist(u.start, u.objects.find((o) => o.id === 'seahorse_back')!)).toBe(1);
    const seen = floodFrom(u, {}, () => false);
    expect(adj(seen, u.objects.find((o) => o.id === 'dummy')!)).toBe(true);
  });
  it('reachReport：沒有 pop 時深水溝對岸的兩個寶箱走不到（打倒大章魚前學不到 pop）；有 pop 才全部走得到', () => {
    const start = { map: 'u', x: u.start.x, y: u.start.y };
    const un = (ab: string[]) => reachReport([u], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['u/chest_b1', 'u/chest_b2']));
    expect(un(['glow', 'jet'])).toEqual(expect.arrayContaining(['u/chest_b1', 'u/chest_b2']));
    const all = un(['glow', 'jet', 'pop']);
    expect(all, all.join(' ')).toEqual([]);
    // 深水溝缺口是唯一的通道：兩邊都是深水溝
    expect(u.tiles[9][19]).toBe('~');
    expect(u.tiles[11][19]).toBe('~');
  });
  it('燈籠水母與大貝殼旁邊的寶箱不被圍住：從起點走得到寶箱旁（它們出現之後）', () => {
    const seen = floodFrom(u, { 'g:u:lantern': true, 'g:u:clam': true }, () => false);
    for (const id of ['chest_lantern', 'chest_clam']) expect(adj(seen, u.objects.find((o) => o.id === id)!), id).toBe(true);
  });
  it('進島設旗標用的 uEntered、被打倒送回珊瑚港：海馬只通珊瑚港', () => {
    expect(u.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['uh']);
    expect(defeatSpot('uh')).toEqual({ map: 'uh', x: uh.respawn.x, y: uh.respawn.y });
  });
});

describe('沉船（產生的迷宮）', () => {
  const uc1 = MAPS.uc1, uc2 = MAPS.uc2;
  // 練習戰（upractice）之後的能力；boss_u 才給 pop，所以沉船裡不能依賴它
  const afterPractice = ['blast', 'gust', 'hum', 'fog', 'web', 'gulp', 'roar', 'sun', 'zip', 'spike', 'whistle', 'glow', 'jet'];
  const beforePractice = afterPractice.filter((a) => a !== 'glow' && a !== 'jet');
  const start = { map: 'uc1', x: 2, y: 1 };
  it('兩層一起走：用練習戰之後的能力，沒有走不到的地板與物件（含頭目），鑰匙剛好用完；不含 pop', () => {
    const r = reachReport([uc1, uc2], start, afterPractice);
    expect(r.unreachableFloor, '有走不到的地板').toEqual([]);
    expect(r.unreachableObjects, '有走不到的物件').toEqual([]);
    expect(r.keysLeft).toBe(0);
    expect(afterPractice).not.toContain('pop');
  });
  it('沒有 jet：二樓珊瑚牆後（含頭目）走不到；沒有 blast：隱藏小密室走不到', () => {
    const noJet = reachReport([uc1, uc2], start, afterPractice.filter((a) => a !== 'jet'));
    const bossAt = uc2.objects.find((o) => o.id === 'boss')!, chestAt = uc2.objects.find((o) => o.id === 'chest_boss')!;
    expect(noJet.unreachableFloor).toContain(`uc2:${bossAt.x},${bossAt.y}`);
    expect(noJet.unreachableFloor).toContain(`uc2:${chestAt.x},${chestAt.y}`);
    expect(reachReport([uc1, uc2], start, afterPractice.filter((a) => a !== 'blast')).unreachableFloor.length).toBeGreaterThan(0);
  });
  it('守門（避免第五關那種死結）：jet 只來自練習戰；boss_u 的獎勵 pop 不是通往 boss_u 之路所需；cave 要練習戰之後才出現', () => {
    expect(BATTLES.upractice.reward.abilities).toContain('jet');
    const bossAt = uc2.objects.find((o) => o.id === 'boss')!;
    const bossCell = `uc2:${bossAt.x},${bossAt.y}`;
    expect(reachReport([uc1, uc2], start, beforePractice).unreachableFloor).toContain(bossCell);
    expect(reachReport([uc1, uc2], start, afterPractice).unreachableFloor).not.toContain(bossCell);
    const cave = u.objects.find((o) => o.id === 'cave')!;
    expect(cave).toMatchObject({ kind: 'stairs', x: 10, y: 3, label: '沉船', showIf: 'uPractice' });
    expect(cave.to).toEqual({ map: 'uc1', x: 2, y: 1 });
    for (const m of Object.values(MAPS)) for (const o of m.objects) if (o.to?.map === 'uc1' && m.id !== 'uc2') expect(o.showIf, `${m.id}/${o.id}`).toBe('uPractice');
  });
  it('出口落在 cave 下方一格（可走、沒有物件）；兩層共用 group uc；31×22；用 sea skin 與沉船地形', () => {
    const exit = uc1.objects.find((o) => o.id === 'up')!.to!;
    expect(exit).toEqual({ map: 'u', x: 10, y: 4 });
    expect(walk(u, exit.x, exit.y)).toBe(true);
    expect(u.objects.some((o) => o.x === exit.x && o.y === exit.y)).toBe(false);
    for (const m of [uc1, uc2]) {
      expect([m.w, m.h, m.group, m.skin]).toEqual([31, 22, 'uc', 'sea']);
      const t = m.tiles.join('');
      expect(t).toMatch(/f/); expect(t).toMatch(/W/); expect(t).not.toMatch(/[:S]/);
    }
    expect(uc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('uc2');
    expect(uc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('uc1');
  });
  it('二樓機關：大貝殼 jet（ㄨ）；頭目 boss_u；頭目寶箱 showIf boss_u；回家魔法陣回珊瑚港旅館門外', () => {
    const sw = uc2.objects.find((o) => o.id === 'switch1')!;
    expect(sw).toMatchObject({ kind: 'gimmick', ability: 'jet', fx: 'jet', sprite: 'giant_clam', sprite2: 'giant_clam_open' });
    expect(uc2.objects.find((o) => o.id === 'barrier1')!.hideIf).toBe('g:uc2:switch1');
    const boss = uc2.objects.find((o) => o.id === 'boss')!;
    expect(boss).toMatchObject({ battle: 'boss_u', hideIf: 'boss_u' });
    expect(uc2.objects.find((o) => o.id === 'chest_boss')!.showIf).toBe('boss_u');
    const c = uc2.objects.find((o) => o.id === 'circle')!;
    expect(c).toMatchObject({ kind: 'stairs', sprite: 'magic_circle', showIf: 'boss_u' });
    const inn = uh.objects.find((o) => o.id === 'door_inn')!;
    expect(c.to).toEqual({ map: 'uh', x: inn.x, y: inn.y + 1 });
    expect(walk(uh, c.to!.x, c.to!.y)).toBe(true);
  });
  it('怪物 id 不和獎勵旗標撞名，戰鬥存在且數量對得上，用海底怪', () => {
    const names: string[] = [];
    for (const m of [uc1, uc2]) for (const o of m.objects.filter((p) => p.kind === 'monster' && p.id !== 'boss')) {
      expect(o.id).toMatch(/^mon[0-9]+$/);
      expect(BATTLES[o.battle!], o.battle).toBeDefined();
      expect(BATTLES[o.battle!].reward.flag).toBe(`m:${m.id}:${o.id}`);
      expect(['clownfish', 'jellyfish', 'urchin']).toContain(BATTLES[o.battle!].enemy);
      names.push(o.battle!);
    }
    expect(names.sort()).toEqual(['uc1m', 'uc1m2', 'uc1m3', 'uc1m4', 'uc2m', 'uc2m2', 'uc2m3']);
  });
  it('既有四個洞窟的迷宮內容沒有被改動（種子與格子不變）', () => {
    expect(MAZES.gc1.w).toBe(31); expect(MAZES.sc2.h).toBe(22);
    for (const id of ['gc1', 'gc2', 'xc1', 'xc2', 'zc1', 'zc2', 'sc1', 'sc2'] as const) expect(MAPS[id], id).toBeDefined();
  });
});
