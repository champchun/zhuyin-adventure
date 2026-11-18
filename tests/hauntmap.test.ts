import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { MAPS, isBlockedTile, objectDepth, TERRAIN_DEPTH } from '../src/data/maps';
import type { MapObj } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { MAZES } from '../src/data/mazes';
import { GIVER_HUBS } from '../src/core/giver';
import { defeatSpot, markArrival } from '../src/core/travel';
import { HAUNT_TEXTURES } from '../src/gfx/hauntArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ch = MAPS.ch, c = MAPS.c, lobby = MAPS.lobby;
const walk = (m: (typeof MAPS)[string], x: number, y: number) => !isBlockedTile(m, m.tiles[y]?.[x] ?? '#');
const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
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
    const cur = q.shift()!;
    for (const [dx, dy] of N4) {
      const x = cur.x + dx, y = cur.y + dy, k = `${x},${y}`;
      if (seen.has(k) || !walk(map, x, y) || solid.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  return seen;
}
const adj = (seen: Set<string>, o: { x: number; y: number }) => N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));

describe('南瓜鎮 ch（主島）', () => {
  it('是主島：用 haunt skin；被打倒送回自己、去過會記下；起點、respawn、dock 可走；沒有 exit，碼頭都是掃帚', () => {
    expect(ch.skin).toBe('haunt');
    expect(ch.hub).toBeDefined();
    expect(defeatSpot('ch')).toEqual({ map: 'ch', x: ch.respawn.x, y: ch.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, ch);
    expect(save.flags['visited:ch']).toBe(true);
    expect(save.homeMap).toBe('ch');
    for (const m of [ch, c]) {
      expect(m.objects.some((o) => o.kind === 'exit'), m.id).toBe(false);
      expect(m.objects.filter((o) => o.kind === 'dock').every((o) => o.vehicle === 'broom'), m.id).toBe(true);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(ch, ch.hub!.dock.x, ch.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣、台詞提到南瓜鎮；商店有店員；門互相對得上', () => {
    const k = MAPS.ch_inn.objects.find((o) => o.kind === 'innkeeper')!;
    expect(k.price).toBe(25);
    expect(k.text![0]).toContain('南瓜鎮');
    expect(k.doneText!.length).toBeGreaterThan(0);
    expect(MAPS.ch_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = ch.objects.find((o) => o.id === 'door_inn')!, ds = ch.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.ch_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'ch', x: di.x, y: di.y + 1 });
    expect(MAPS.ch_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'ch', x: ds.x, y: ds.y + 1 });
  });
  it('大廳 gate9 的條件：沒有 boss_a 是 barrier、有 boss_a 換成 gate9_open（stairs，同一格）；抵達格與回程對得上', () => {
    const g9 = lobby.objects.find((o) => o.id === 'gate9')!, open = lobby.objects.find((o) => o.id === 'gate9_open')!;
    expect(g9).toMatchObject({ kind: 'barrier', hideIf: 'boss_a' });
    expect(g9.lockText!.length).toBeGreaterThan(0);
    expect(open).toMatchObject({ kind: 'stairs', sprite: 'haunt_gate', showIf: 'boss_a' });
    expect([open.x, open.y]).toEqual([g9.x, g9.y]);
    const none = visibleWith({}), won = visibleWith({ boss_a: true });
    expect(none('lobby', g9)).toBe(true); expect(none('lobby', open)).toBe(false);
    expect(won('lobby', g9)).toBe(false); expect(won('lobby', open)).toBe(true);
    expect(open.to).toEqual({ map: 'ch', x: ch.start.x, y: ch.start.y });
    const back = ch.objects.find((o) => o.id === 'haunt_gate_back')!;
    expect(back).toMatchObject({ kind: 'stairs', sprite: 'haunt_gate' });
    expect(back.to).toEqual({ map: 'lobby', x: g9.x, y: g9.y + 1 });
    expect(walk(lobby, back.to!.x, back.to!.y)).toBe(true);
    expect(lobby.objects.some((o) => o.x === back.to!.x && o.y === back.to!.y)).toBe(false);
    expect(dist(ch.start, back)).toBe(1);
    expect(lobby.objects.find((o) => o.id === 'gate10')!.kind).toBe('barrier');
    expect(HAUNT_TEXTURES as readonly string[]).toContain('haunt_gate');
  });
  it('掃帚：通月光墓園島，雙向、抵達格緊鄰對面的掃帚；貼圖已註冊', () => {
    const br = ch.objects.find((o) => o.id === 'broom')!, back = c.objects.find((o) => o.id === 'broom_back')!;
    expect(br).toMatchObject({ kind: 'dock', vehicle: 'broom', sprite: 'broom' });
    expect(br.dockTo).toEqual({ map: 'c', x: c.start.x, y: c.start.y });
    expect(dist(br.dockTo!, back)).toBe(1);
    expect(back).toMatchObject({ kind: 'dock', vehicle: 'broom', sprite: 'broom' });
    expect(back.dockTo!.map).toBe('ch');
    expect(dist(back.dockTo!, br)).toBe(1);
    expect(HAUNT_TEXTURES as readonly string[]).toContain('broom');
    for (const o of [br, back]) expect(walk(MAPS[o.dockTo!.map], o.dockTo!.x, o.dockTo!.y)).toBe(true);
  });
  it('島民至少三位、最後一句不設條件；ㄠㄡ 學會（cPractice）之前，台詞、告示牌與機關提示不出現 ㄠ ㄡ，也不說「所有的注音」都學會了', () => {
    const npcs = ch.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const t of n.talk!) for (const l of t.lines) expect(/[ㄠㄡ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
    // 告示牌（text）與機關還沒啟動時的提示（lockText）在學會之前就看得到；hitText／doneText 不在此限
    for (const o of [...ch.objects, ...c.objects]) for (const l of [...(o.text ?? []), ...(o.lockText ?? [])]) {
      expect(/[ㄠㄡ]/.test(l), `${o.id}：${l}`).toBe(false);
      expect(/所有的注音|全部的注音/.test(l), `${o.id}：${l}`).toBe(false);
    }
  });
  it('金幣爺爺與星星婆婆：id 正確、站可走格、彼此與出入口至少 2 格、四周有空格；GIVER_HUBS 含 ch', () => {
    expect(GIVER_HUBS).toContain('ch');
    const gr = ch.objects.find((o) => o.kind === 'granny')!, gv = ch.objects.find((o) => o.kind === 'giver')!;
    expect([gr.id, gv.id]).toEqual(['granny', 'giver']);
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(ch, p.x, p.y)).toBe(true);
      for (const o of ch.objects.filter((o) => ['stairs', 'door', 'dock'].includes(o.kind))) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        if (t && t.map === 'ch') expect(dist(t, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(ch.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(ch, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('格局和其他主島不同、含魔法池；從起點走得到所有一般物件旁', () => {
    for (const id of ['dh', 'gh', 'xh', 'zh', 'sh', 'uh', 'ah']) expect(MAPS[id].tiles.join('')).not.toBe(ch.tiles.join(''));
    expect(ch.tiles.join('')).toMatch(/O/);
    const seen = floodFrom(ch, {}, () => true);
    for (const o of ch.objects) expect(adj(seen, o), o.id).toBe(true);
  });
  it('LEVELS.c：開放、主島是 ch', () => {
    expect(LEVELS.c).toMatchObject({ id: 'c', symbol: 'ㄞㄟㄠㄡ', name: '古堡', open: true, mapId: 'ch', partner: '夥伴' });
  });
});

describe('月光墓園島 c', () => {
  it('用 haunt skin；蜘蛛網 chill、南瓜燈 tickle、鬼門 hoot 啟動後換圖留在原地、寶箱 showIf 對應；吊橋 howl 是 passable', () => {
    expect(c.skin).toBe('haunt');
    const w = c.objects.find((o) => o.id === 'web')!, p = c.objects.find((o) => o.id === 'pumpkin')!, d = c.objects.find((o) => o.id === 'ghostdoor')!, br = c.objects.find((o) => o.id === 'drawbridge')!;
    expect(w).toMatchObject({ kind: 'gimmick', ability: 'chill', fx: 'chill', sprite: 'spiderweb_thick', sprite2: 'spiderweb_clear' });
    expect(p).toMatchObject({ kind: 'gimmick', ability: 'tickle', fx: 'tickle', sprite: 'pumpkin_dark', sprite2: 'pumpkin_lit' });
    expect(d).toMatchObject({ kind: 'gimmick', ability: 'hoot', fx: 'hoot', sprite: 'ghost_door', sprite2: 'ghost_door_open' });
    expect(br).toMatchObject({ kind: 'gimmick', ability: 'howl', fx: 'howl', sprite: 'drawbridge_gap', sprite2: 'drawbridge', passable: true });
    for (const g of [w, p, d]) { expect(g.vanish).toBeFalsy(); expect(g.passable).toBeFalsy(); }
    expect(c.objects.find((o) => o.id === 'chest_web')!.showIf).toBe('g:c:web');
    expect(c.objects.find((o) => o.id === 'chest_pumpkin')!.showIf).toBe('g:c:pumpkin');
    expect(c.objects.find((o) => o.id === 'chest_door')!.showIf).toBe('g:c:ghostdoor');
    expect(objectDepth(br, 176, true)).toBe(TERRAIN_DEPTH);
    expect(HAUNT_TEXTURES as readonly string[]).toEqual(expect.arrayContaining(['spiderweb_thick', 'spiderweb_clear', 'pumpkin_dark', 'pumpkin_lit', 'ghost_door', 'ghost_door_open', 'drawbridge_gap', 'drawbridge']));
  });
  it('戰鬥：dummy 是 cpractice（學會就消失）、m1～m3 對 c1～c3（m3 在練習戰之後才出現）', () => {
    expect(c.objects.find((o) => o.id === 'dummy')).toMatchObject({ kind: 'monster', battle: 'cpractice', hideIf: 'cPractice' });
    for (const i of [1, 2, 3]) expect(c.objects.find((o) => o.id === `m${i}`)).toMatchObject({ kind: 'monster', battle: `c${i}` });
    expect(c.objects.find((o) => o.id === 'm3')!.showIf).toBe('cPractice');
    expect(BATTLES.c1.reward.flag).toBe('m:c:m1');
  });
  it('物件都站在可走格、巡邏路線都是可走格；起點在掃帚旁、進島前就走得到練習用人偶', () => {
    for (const o of c.objects) {
      expect(walk(c, o.x, o.y), o.id).toBe(true);
      for (const p of o.patrol ?? []) expect(walk(c, p.x, p.y), `${o.id} 巡邏`).toBe(true);
    }
    expect(dist(c.start, c.objects.find((o) => o.id === 'broom_back')!)).toBe(1);
    const seen = floodFrom(c, {}, () => false);
    expect(adj(seen, c.objects.find((o) => o.id === 'dummy')!)).toBe(true);
  });
  it('reachReport：沒有 howl 時護城河對岸的兩個寶箱走不到；有 howl 才全部走得到', () => {
    const start = { map: 'c', x: c.start.x, y: c.start.y };
    const un = (ab: string[]) => reachReport([c], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['c/chest_d1', 'c/chest_d2']));
    expect(un(['chill', 'tickle'])).toEqual(expect.arrayContaining(['c/chest_d1', 'c/chest_d2']));
    const all = un(['chill', 'tickle', 'howl', 'hoot']);
    expect(all, all.join(' ')).toEqual([]);
    // 護城河缺口是唯一的通道：兩邊都是護城河
    expect(c.tiles[9][19]).toBe('~');
    expect(c.tiles[11][19]).toBe('~');
  });
  it('蜘蛛網、南瓜燈、鬼門旁邊的寶箱不被圍住：從起點走得到寶箱旁（它們出現之後）', () => {
    const seen = floodFrom(c, { 'g:c:web': true, 'g:c:pumpkin': true, 'g:c:ghostdoor': true }, () => false);
    for (const id of ['chest_web', 'chest_pumpkin', 'chest_door']) expect(adj(seen, c.objects.find((o) => o.id === id)!), id).toBe(true);
  });
  it('被打倒送回南瓜鎮：掃帚只通南瓜鎮', () => {
    expect(c.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['ch']);
    expect(defeatSpot('ch')).toEqual({ map: 'ch', x: ch.respawn.x, y: ch.respawn.y });
  });
});

describe('古堡（產生的迷宮）', () => {
  const cc1 = MAPS.cc1, cc2 = MAPS.cc2;
  // 練習戰（cpractice）之後的能力；howl、hoot 要到 boss_c 之後才有，所以古堡裡不能依賴它們
  const afterPractice = ['blast', 'gust', 'hum', 'fog', 'web', 'gulp', 'roar', 'sun', 'zip', 'spike', 'whistle', 'glow', 'jet', 'pop', 'shout', 'inflate', 'honk', 'cheer', 'drum', 'splash', 'nasal', 'stream', 'croak', 'knock', 'breath', 'snow', 'slide', 'freeze', 'chill', 'tickle'];
  const beforePractice = afterPractice.filter((x) => x !== 'chill' && x !== 'tickle');
  const start = { map: 'cc1', x: 2, y: 1 };
  it('兩層一起走：用練習戰之後的能力，沒有走不到的地板與物件（含頭目），鑰匙剛好用完；不含 howl、hoot', () => {
    const r = reachReport([cc1, cc2], start, afterPractice);
    expect(r.unreachableFloor, '有走不到的地板').toEqual([]);
    expect(r.unreachableObjects, '有走不到的物件').toEqual([]);
    expect(r.keysLeft).toBe(0);
    expect(afterPractice).not.toContain('howl');
    expect(afterPractice).not.toContain('hoot');
  });
  it('沒有 tickle：二樓石牆後（含頭目與頭目寶箱）走不到；沒有 blast：隱藏小密室走不到', () => {
    const noTickle = reachReport([cc1, cc2], start, afterPractice.filter((x) => x !== 'tickle'));
    const bossAt = cc2.objects.find((o) => o.id === 'boss')!, chestAt = cc2.objects.find((o) => o.id === 'chest_boss')!;
    expect(noTickle.unreachableFloor).toContain(`cc2:${bossAt.x},${bossAt.y}`);
    expect(noTickle.unreachableFloor).toContain(`cc2:${chestAt.x},${chestAt.y}`);
    expect(reachReport([cc1, cc2], start, afterPractice.filter((x) => x !== 'blast')).unreachableFloor.length).toBeGreaterThan(0);
  });
  it('守門（避免死結）：tickle 只來自練習戰；boss_c 的獎勵 howl、hoot 不是通往 boss_c 之路所需；cave 要練習戰之後才出現', () => {
    expect(BATTLES.cpractice.reward.abilities).toContain('tickle');
    const bossAt = cc2.objects.find((o) => o.id === 'boss')!;
    const bossCell = `cc2:${bossAt.x},${bossAt.y}`;
    expect(reachReport([cc1, cc2], start, beforePractice).unreachableFloor).toContain(bossCell);
    expect(reachReport([cc1, cc2], start, afterPractice).unreachableFloor).not.toContain(bossCell);
    const cave = c.objects.find((o) => o.id === 'cave')!;
    expect(cave).toMatchObject({ kind: 'stairs', x: 10, y: 3, label: '古堡', showIf: 'cPractice' });
    expect(cave.to).toEqual({ map: 'cc1', x: 2, y: 1 });
    for (const m of Object.values(MAPS)) for (const o of m.objects) if (o.to?.map === 'cc1' && m.id !== 'cc2') expect(o.showIf, `${m.id}/${o.id}`).toBe('cPractice');
  });
  it('出口落在 cave 下方一格（可走、沒有物件）；兩層共用 group cc；31×22；用 haunt skin 與古堡地形', () => {
    const exit = cc1.objects.find((o) => o.id === 'up')!.to!;
    expect(exit).toEqual({ map: 'c', x: 10, y: 4 });
    expect(walk(c, exit.x, exit.y)).toBe(true);
    expect(c.objects.some((o) => o.x === exit.x && o.y === exit.y)).toBe(false);
    expect(walk(c, 10, 3)).toBe(true);
    expect(MAZES.cc1.w).toBe(31);
    for (const m of [cc1, cc2]) {
      expect([m.w, m.h, m.group, m.skin]).toEqual([31, 22, 'cc', 'haunt']);
      const t = m.tiles.join('');
      expect(t).toMatch(/f/); expect(t).toMatch(/W/); expect(t).not.toMatch(/[:S]/);
    }
    expect(cc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('cc2');
    expect(cc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('cc1');
  });
  it('二樓機關：南瓜燈 tickle（ㄟ）；頭目 boss_c；頭目寶箱 showIf boss_c；回家魔法陣回南瓜鎮旅館門外', () => {
    const sw = cc2.objects.find((o) => o.id === 'switch1')!;
    expect(sw).toMatchObject({ kind: 'gimmick', ability: 'tickle', fx: 'tickle', sprite: 'pumpkin_dark', sprite2: 'pumpkin_lit' });
    expect(cc2.objects.find((o) => o.id === 'barrier1')!.hideIf).toBe('g:cc2:switch1');
    const boss = cc2.objects.find((o) => o.id === 'boss')!;
    expect(boss).toMatchObject({ battle: 'boss_c', hideIf: 'boss_c' });
    expect(cc2.objects.find((o) => o.id === 'chest_boss')!.showIf).toBe('boss_c');
    const circle = cc2.objects.find((o) => o.id === 'circle')!;
    expect(circle).toMatchObject({ kind: 'stairs', sprite: 'magic_circle', showIf: 'boss_c' });
    const inn = ch.objects.find((o) => o.id === 'door_inn')!;
    expect(circle.to).toEqual({ map: 'ch', x: inn.x, y: inn.y + 1 });
    expect(walk(ch, circle.to!.x, circle.to!.y)).toBe(true);
  });
  it('怪物 id 不和獎勵旗標撞名，戰鬥存在且數量對得上，用古堡怪', () => {
    const names: string[] = [];
    for (const m of [cc1, cc2]) for (const o of m.objects.filter((p) => p.kind === 'monster' && p.id !== 'boss')) {
      expect(o.id).toMatch(/^mon[0-9]+$/);
      expect(BATTLES[o.battle!], o.battle).toBeDefined();
      expect(BATTLES[o.battle!].reward.flag).toBe(`m:${m.id}:${o.id}`);
      expect(['batty', 'pumpkinmon', 'skeleton']).toContain(BATTLES[o.battle!].enemy);
      names.push(o.battle!);
    }
    expect(names.sort()).toEqual(['cc1m', 'cc1m2', 'cc1m3', 'cc1m4', 'cc2m', 'cc2m2', 'cc2m3']);
  });
});
