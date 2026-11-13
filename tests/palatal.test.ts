import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { STROKES } from '../src/data/strokes';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { defeatSpot, markArrival } from '../src/core/travel';
import { reachReport } from '../src/core/dungeon';
import { SNOW_TEXTURES } from '../src/gfx/snowArt';

describe('第四關（舌面音）的資料', () => {
  it('ㄒㄑ 進島才開始教，ㄐ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄒ', 'ㄑ'], flag: 'xEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄐ'], flag: 'xPractice' });
  });
  it('關卡開放，入口是主島雪花鎮', () => {
    expect(LEVELS.x.open).toBe(true);
    expect(LEVELS.x.mapId).toBe('xh');
    expect(LEVELS.x.symbol).toBe('ㄐㄑㄒ');
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會', () => {
    expect(MOVES.snow.symbol).toBe('ㄒ');
    expect(MOVES.slide.symbol).toBe('ㄑ');
    expect(MOVES.freeze.symbol).toBe('ㄐ');
    expect([MOVES.snow.power, MOVES.slide.power, MOVES.freeze.power]).toEqual([6, 6, 7]);
    for (const id of ['snow', 'slide', 'freeze']) {
      expect(MOVES[id].needAbility).toBe(id);
      expect(castSymbol(id)).toBe(MOVES[id].symbol);
    }
    for (const sp of Object.values(SPECIES)) {
      for (const [sym, ability] of [['ㄒ', 'snow'], ['ㄑ', 'slide'], ['ㄐ', 'freeze']]) {
        expect(moveFor(sp.id, sym, (a) => a === ability).needAbility).toBe(ability);
      }
    }
  });
  it('敵人：企鵝與冰晶蝙蝠是回音怪，雪球怪與冰晶女王不是', () => {
    expect(ENEMIES.penguin.echo).toBe(true);
    expect(ENEMIES.icebat.echo).toBe(true);
    expect(ENEMIES.snowball.echo).toBeFalsy();
    expect(ENEMIES.icequeen.echo).toBeFalsy();
    expect([ENEMIES.snowball.hp, ENEMIES.snowball.atk]).toEqual([24, 4]);
    expect([ENEMIES.penguin.hp, ENEMIES.penguin.atk]).toEqual([26, 4]);
    expect([ENEMIES.icebat.hp, ENEMIES.icebat.atk]).toEqual([26, 5]);
    expect([ENEMIES.icequeen.hp, ENEMIES.icequeen.atk]).toEqual([32, 6]);
  });
  it('練習戰教 ㄒㄑ（教學戰、旗標 xPractice、學會 snow 與 slide）', () => {
    const b = BATTLES.xpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄒ', 'ㄑ']);
    expect(b.reward!.flag).toBe('xPractice');
    expect(b.reward!.abilities).toEqual(['snow', 'slide']);
  });
  it('頭目冰晶女王有護盾、三個小回合、打贏學會 freeze', () => {
    const b = BATTLES.boss_x;
    expect(b.enemy).toBe('icequeen');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward!.flag).toBe('boss_x');
    expect(b.reward!.abilities).toEqual(['freeze']);
  });
  it('島上野怪考 ㄐㄑㄒ，旗標是 m:x:m1～m3，會重生', () => {
    ['x1', 'x2', 'x3'].forEach((id, i) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn, `${id} 野生怪要會重生`).toBe(true);
      expect(b.focus.every((s) => ['ㄐ', 'ㄑ', 'ㄒ'].includes(s)), `${id} 主題只能是 ㄐㄑㄒ`).toBe(true);
      expect(b.reward!.flag).toBe(`m:x:m${i + 1}`);
    });
    expect(BATTLES.x3.focus).toContain('ㄐ');
  });
  it('ㄐㄑㄒ 的筆順存在（兩畫、一畫、兩畫）', () => {
    expect(STROKES['ㄐ']).toHaveLength(2);
    expect(STROKES['ㄑ']).toHaveLength(1);
    expect(STROKES['ㄒ']).toHaveLength(2);
  });
});

describe('第四關的地圖', () => {
  const xh = MAPS.xh, x = MAPS.x;
  it('雪花鎮是主島：沒有 exit；被打倒送回自己的 respawn；去過會記下來', () => {
    expect(xh.hub).toBeDefined();
    expect(xh.hub!.defeat).toBeUndefined();
    expect(xh.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(x.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(defeatSpot('xh')).toEqual({ map: 'xh', x: xh.respawn.x, y: xh.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, xh);
    expect(save.flags['visited:xh']).toBe(true);
    expect(save.homeMap).toBe('xh');
  });
  it('碼頭：蛙鳴灣多一個通雪花鎮的（打倒蝙蝠王後），雪花鎮兩個、企鵝冰原一個，各通一個地方', () => {
    const d = MAPS.gh.objects.find((o) => o.id === 'dock_xh')!;
    expect(d.showIf).toBe('boss_g');
    expect(d.dockTo!.map).toBe('xh');
    expect(xh.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map).sort()).toEqual(['gh', 'x']);
    expect(x.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['xh']);
  });
  it('旅館收 25 金幣；商店有店員 clerk；門互相對得上', () => {
    expect(MAPS.xh_inn.objects.find((o) => o.kind === 'innkeeper')!.price).toBe(25);
    expect(MAPS.xh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = xh.objects.find((o) => o.id === 'door_inn')!, ds = xh.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.xh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'xh', x: di.x, y: di.y + 1 });
    expect(MAPS.xh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'xh', x: ds.x, y: ds.y + 1 });
  });
  it('島民至少三位、最後一句不設條件；雪花鎮的台詞不出現沒學過的 ㄐㄑㄒ', () => {
    const npcs = xh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const v of n.talk!) for (const l of v.lines) expect(/[ㄐㄑㄒ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
  });
  it('雪地小路是雙向的：兩邊目的地可走、不壓物件、互為回程；出口本身在可走格上、沒被別的物件蓋住、有專屬貼圖', () => {
    const v = MAPS.village;
    const t = xh.objects.find((o) => o.id === 'trail')!, tv = v.objects.find((o) => o.id === 'trail_xh')!;
    for (const [o, from, dest] of [[t, xh, v], [tv, v, xh]] as const) {
      expect(o.kind).toBe('stairs');
      expect(o.showIf).toBe('boss_x');
      expect(o.label).toBe('雪地小路');
      expect(o.sprite).toBe('snow_trail');
      expect(SNOW_TEXTURES as readonly string[]).toContain(o.sprite);
      expect(o.to!.map).toBe(dest.id);
      // 出口自己所在的格子：可走、不被牆或別的物件佔住（打倒 boss_x 設旗標後 showIf 條件成立，一定畫得出來）
      expect(BLOCKED_TILES.has(from.tiles[o.y][o.x]), `${from.id} 出口地形`).toBe(false);
      expect(from.objects.filter((p) => p.x === o.x && p.y === o.y).map((p) => p.id)).toEqual([o.id]);
      // 抵達格：可走、不在任何物件上、也不是出口本身
      expect(BLOCKED_TILES.has(dest.tiles[o.to!.y][o.to!.x])).toBe(false);
      expect(dest.objects.some((p) => p.x === o.to!.x && p.y === o.to!.y)).toBe(false);
    }
    // 互為回程：抵達格和對面的出口緊鄰（不壓在出口上），不會一抵達就被送回去
    for (const [a, b] of [[t, tv], [tv, t]] as const) expect(Math.abs(a.to!.x - b.x) + Math.abs(a.to!.y - b.y)).toBe(1);
    // 兩邊各一塊告示牌，也是 boss_x 才出現，站在可走格上、不擋住出口
    for (const [m, id] of [[xh, 'trail_sign'], [v, 'trail_sign_v']] as const) {
      const sg = m.objects.find((o) => o.id === id)!;
      expect(sg.kind).toBe('sign');
      expect(sg.showIf).toBe('boss_x');
      expect(BLOCKED_TILES.has(m.tiles[sg.y][sg.x])).toBe(false);
      expect(sg.text!.join('')).not.toMatch(/單向|只能/);
    }
    // 起始村的物件之間不重疊
    const keys = v.objects.filter((o) => o.id !== 'balloon').map((o) => `${o.x},${o.y}`); // balloon 與沒氣的氣球同一格（showIf 互斥，見 skymap.test.ts）
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('企鵝冰原：三個機關、洞窟入口練習完才出現、通往 xc1、小怪戰鬥存在', () => {
    for (const [id, ab] of [['pile', 'snow'], ['rock', 'slide'], ['bridge', 'freeze']]) {
      const o = x.objects.find((p) => p.id === id)!;
      expect(o.kind).toBe('gimmick');
      expect(o.ability).toBe(ab);
      expect(o.fx).toBe(ab);
    }
    const cave = x.objects.find((o) => o.id === 'cave')!;
    expect(cave.showIf).toBe('xPractice');
    expect(cave.to).toEqual({ map: 'xc1', x: 2, y: 1 });
    for (const m of x.objects.filter((o) => o.kind === 'monster')) expect(Boolean(BATTLES[m.battle!]), m.id).toBe(true);
  });
  it('冰橋：河面那一格是冰橋地形（可走）、被「河水」機關擋住；沒有 freeze 過不了河，學會就過得去', () => {
    const b = x.objects.find((o) => o.id === 'bridge')!;
    expect(x.tiles[b.y][b.x]).toBe('z');
    expect(b.vanish).toBe(true);
    expect(x.tiles[b.y - 1][b.x]).toBe('~');
    const start = { map: 'x', x: x.start.x, y: x.start.y };
    const no = reachReport([x], start, ['snow', 'slide']);
    expect(no.unreachableObjects).toContain('x/chest_bridge1');
    expect(no.unreachableObjects).toContain('x/chest_bridge2');
    const yes = reachReport([x], start, ['snow', 'slide', 'freeze']);
    expect(yes.unreachableObjects, yes.unreachableObjects.join(' ')).toEqual([]);
  });
  it('薄冰面石頭：沒有 slide 拿不到後面的寶箱', () => {
    const start = { map: 'x', x: x.start.x, y: x.start.y };
    expect(reachReport([x], start, ['snow', 'freeze']).unreachableObjects).toContain('x/chest_slide');
    expect(reachReport([x], start, ['snow', 'slide', 'freeze']).unreachableObjects).not.toContain('x/chest_slide');
  });
  it('新地圖起點可走', () => {
    for (const m of [xh, x]) expect(BLOCKED_TILES.has(m.tiles[m.start.y][m.start.x]), m.id).toBe(false);
  });
  it('主島和怪物島的格局和前三島明顯不同（地形不一樣）', () => {
    for (const id of ['dh', 'gh', 'd', 'g']) {
      expect(MAPS[id].tiles.join('')).not.toBe(xh.tiles.join(''));
    }
    expect(xh.tiles.join('').includes('q')).toBe(true);
  });
});

describe('冰晶洞窟（產生的迷宮）：用 reachReport 驗證一定解得開', () => {
  const abilities = ['blast', 'gust', 'snow', 'slide', 'freeze'];
  const start = { map: 'xc1', x: 2, y: 1 };
  const xc1 = MAPS.xc1, xc2 = MAPS.xc2, x = MAPS.x;
  it('兩層一起走：沒有走不到的地板與物件，鑰匙剛好用完', () => {
    const r = reachReport([xc1, xc2], start, abilities);
    expect(r.unreachableFloor, '有走不到的地板').toEqual([]);
    expect(r.unreachableObjects, '有走不到的物件').toEqual([]);
    expect(r.keysLeft).toBe(0);
  });
  it('沒有 slide 招式時，冰牆後面走不到；沒有 blast 時，隱藏小密室走不到', () => {
    expect(reachReport([xc1, xc2], start, ['blast', 'snow', 'freeze']).unreachableFloor.length).toBeGreaterThan(0);
    expect(reachReport([xc1, xc2], start, ['slide']).unreachableFloor.length).toBeGreaterThan(0);
  });
  it('尺寸、物件、同一個 group、樓梯與出口位置', () => {
    for (const m of [xc1, xc2]) { expect(m.w).toBe(31); expect(m.h).toBe(22); expect(m.group).toBe('xc'); }
    const has = (m: typeof xc1, id: string) => m.objects.some((o) => o.id === id);
    expect(has(xc1, 'door')).toBe(true);
    expect(has(xc1, 'chest_key')).toBe(true);
    for (const id of ['barrier1', 'switch1', 'boss', 'chest_boss']) expect(has(xc2, id), id).toBe(true);
    const sw = xc2.objects.find((o) => o.id === 'switch1')!;
    expect(sw.ability).toBe('slide');
    expect(sw.fx).toBe('slide');
    const boss = xc2.objects.find((o) => o.id === 'boss')!;
    expect(boss.battle).toBe('boss_x');
    expect(boss.hideIf).toBe('boss_x');
    expect(xc2.objects.find((o) => o.id === 'chest_boss')!.showIf).toBe('boss_x');
    expect(xc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('xc2');
    expect(xc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('xc1');
    const exit = xc1.objects.find((o) => o.id === 'up')!.to!;
    expect(exit.map).toBe('x');
    expect(BLOCKED_TILES.has(x.tiles[exit.y][exit.x])).toBe(false);
    expect(x.objects.some((o) => o.x === exit.x && o.y === exit.y)).toBe(false);
  });
  it('怪物 id 不和獎勵旗標撞名，戰鬥存在', () => {
    for (const m of [xc1, xc2]) for (const o of m.objects.filter((p) => p.kind === 'monster' && p.id !== 'boss')) {
      expect(o.id).toMatch(/^mon\d+$/);
      expect(BATTLES[o.battle!], o.battle).toBeDefined();
    }
  });
});
