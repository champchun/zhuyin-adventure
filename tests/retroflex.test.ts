import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { STROKES } from '../src/data/strokes';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
import { defeatSpot, markArrival } from '../src/core/travel';
import { GIVER_HUBS } from '../src/core/giver';
import { DESERT_TEXTURES } from '../src/gfx/desertArt';

describe('第五關（翹舌音）的資料', () => {
  it('ㄓㄔ 進島才開始教，ㄕㄖ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄓ', 'ㄔ'], flag: 'zEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄕ', 'ㄖ'], flag: 'zPractice' });
  });
  it('關卡開放，入口是主島綠洲鎮 zh', () => {
    expect(LEVELS.z).toEqual({ id: 'z', symbol: 'ㄓㄔㄕㄖ', name: '翹舌音島（火山沙漠）', open: true, mapId: 'zh', partner: '夥伴' });
  });
  it('四個新招式各綁一個注音，三隻夥伴都學得會', () => {
    const spec: [string, string, number][] = [['web', 'ㄓ', 7], ['gulp', 'ㄔ', 7], ['roar', 'ㄕ', 8], ['sun', 'ㄖ', 8]];
    for (const [id, sym, power] of spec) {
      expect(MOVES[id].symbol).toBe(sym);
      expect(MOVES[id].power).toBe(power);
      expect(MOVES[id].needAbility).toBe(id);
      expect(castSymbol(id)).toBe(sym);
      expect(MOVES[id].desc).toMatch(/翹/);
      for (const sp of Object.values(SPECIES)) expect(moveFor(sp.id, sym, (a) => a === id).needAbility).toBe(id);
    }
  });
  it('敵人：仙人掌怪與木乃伊是回音怪，蠍子與熔岩獸不是', () => {
    expect(ENEMIES.cactusman.echo).toBe(true);
    expect(ENEMIES.mummy.echo).toBe(true);
    expect(ENEMIES.scorpion.echo).toBeFalsy();
    expect(ENEMIES.lavabeast.echo).toBeFalsy();
    expect([ENEMIES.scorpion.hp, ENEMIES.scorpion.atk]).toEqual([30, 5]);
    expect([ENEMIES.cactusman.hp, ENEMIES.cactusman.atk]).toEqual([32, 5]);
    expect([ENEMIES.mummy.hp, ENEMIES.mummy.atk]).toEqual([34, 6]);
    expect([ENEMIES.lavabeast.hp, ENEMIES.lavabeast.atk]).toEqual([42, 7]);
  });
  it('練習戰教 ㄓㄔ（教學戰、旗標 zPractice、學會 web 與 gulp）', () => {
    const b = BATTLES.zpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄓ', 'ㄔ']);
    expect(b.reward.flag).toBe('zPractice');
    expect(b.reward.abilities).toEqual(['web', 'gulp']);
  });
  it('頭目熔岩獸有護盾、三個小回合、打贏學會 roar 與 sun', () => {
    const b = BATTLES.boss_z;
    expect(b.enemy).toBe('lavabeast');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward.flag).toBe('boss_z');
    expect(b.reward.abilities).toEqual(['roar', 'sun']);
  });
  it('島上野怪旗標是 m:z:m1～m3，會重生；z3 才考 ㄕㄖ', () => {
    ['z1', 'z2', 'z3'].forEach((id, i) => {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn).toBe(true);
      expect(b.reward.flag).toBe(`m:z:m${i + 1}`);
    });
    for (const id of ['z1', 'z2']) expect(BATTLES[id].focus.every((s) => ['ㄓ', 'ㄔ'].includes(s)), id).toBe(true);
    expect(BATTLES.z3.focus).toEqual(expect.arrayContaining(['ㄕ', 'ㄖ']));
  });
  it('台詞不出現還沒學過的拼音（練習戰只能出現 ㄓㄔ，之前也不能有 ㄕㄖ）', () => {
    const lines = (id: string) => [...BATTLES[id].intro, ...BATTLES[id].reward.story];
    for (const id of ['zpractice', 'z1', 'z2']) for (const l of [...BATTLES[id].intro]) expect(/[ㄕㄖ]/.test(l), `${id}：${l}`).toBe(false);
    expect(lines('boss_z').length).toBeGreaterThan(0);
  });
  it('ㄓㄔㄕㄖ 的筆順存在（4、3、3、4 畫）', () => {
    expect(STROKES['ㄓ']).toHaveLength(4);
    expect(STROKES['ㄔ']).toHaveLength(3);
    expect(STROKES['ㄕ']).toHaveLength(3);
    expect(STROKES['ㄖ']).toHaveLength(4);
  });
});

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const walk = (m: (typeof MAPS)[string], x: number, y: number) => !BLOCKED_TILES.has(m.tiles[y]?.[x] ?? '#');
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

describe('第五關的地圖：綠洲鎮 zh 與火山沙漠 z', () => {
  const zh = MAPS.zh, z = MAPS.z, v = MAPS.village;
  it('綠洲鎮是主島：被打倒送回自己的 respawn；去過會記下來；沒有 exit 與碼頭', () => {
    expect(zh.hub).toBeDefined();
    expect(zh.hub!.defeat).toBeUndefined();
    expect(defeatSpot('zh')).toEqual({ map: 'zh', x: zh.respawn.x, y: zh.respawn.y });
    const save = { flags: {} as Record<string, boolean>, homeMap: undefined as string | undefined };
    markArrival(save, zh);
    expect(save.flags['visited:zh']).toBe(true);
    expect(save.homeMap).toBe('zh');
    for (const m of [zh, z]) {
      expect(m.objects.some((o) => o.kind === 'exit' || o.kind === 'dock'), m.id).toBe(false);
      expect(walk(m, m.start.x, m.start.y), `${m.id} 起點`).toBe(true);
      expect(walk(m, m.respawn.x, m.respawn.y), `${m.id} respawn`).toBe(true);
    }
    expect(walk(zh, zh.hub!.dock.x, zh.hub!.dock.y)).toBe(true);
  });
  it('旅館收 25 金幣；商店有店員；門互相對得上', () => {
    expect(MAPS.zh_inn.objects.find((o) => o.kind === 'innkeeper')!.price).toBe(25);
    expect(MAPS.zh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = zh.objects.find((o) => o.id === 'door_inn')!, ds = zh.objects.find((o) => o.id === 'door_shop')!;
    expect(di.to!.map).toBe('zh_inn');
    expect(ds.to!.map).toBe('zh_shop');
    expect(MAPS.zh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'zh', x: di.x, y: di.y + 1 });
    expect(MAPS.zh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'zh', x: ds.x, y: ds.y + 1 });
  });
  it('島民至少三位、最後一句不設條件；綠洲鎮的台詞不出現沒學過的 ㄓㄔㄕㄖ', () => {
    const npcs = zh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, n.id).toBe(true);
      for (const t of n.talk!) for (const l of t.lines) expect(/[ㄓㄔㄕㄖ]/.test(l), `${n.id}：${l}`).toBe(false);
    }
  });
  it('沙漠小路是雙向的：兩邊出口在可走格、不被別的物件蓋住、有專屬貼圖；抵達格可走、不壓物件，且緊鄰對面的出口', () => {
    const rv = v.objects.find((o) => o.id === 'desert_road')!, rz = zh.objects.find((o) => o.id === 'road_home')!;
    for (const [o, from, dest] of [[rv, v, zh], [rz, zh, v]] as const) {
      expect(o.kind).toBe('stairs');
      expect(o.label).toBe('沙漠小路');
      expect(o.sprite).toBe('desert_road');
      expect(DESERT_TEXTURES as readonly string[]).toContain(o.sprite);
      expect(o.to!.map).toBe(dest.id);
      expect(walk(from, o.x, o.y), `${from.id} 出口地形`).toBe(true);
      expect(from.objects.filter((p) => p.x === o.x && p.y === o.y).map((p) => p.id)).toEqual([o.id]);
      expect(walk(dest, o.to!.x, o.to!.y)).toBe(true);
      expect(dest.objects.some((p) => p.x === o.to!.x && p.y === o.to!.y)).toBe(false);
    }
    expect(rv.showIf).toBe('boss_x');
    expect(rz.showIf).toBeUndefined();
    for (const [a, b] of [[rv, rz], [rz, rv]] as const) expect(dist(a.to!, b)).toBe(1);
    const sv = v.objects.find((o) => o.id === 'desert_sign')!, sz = zh.objects.find((o) => o.id === 'road_sign')!;
    expect(sv.kind).toBe('sign');
    expect(sv.showIf).toBe('boss_x');
    expect(sz.kind).toBe('sign');
    for (const [m, sg] of [[v, sv], [zh, sz]] as const) {
      expect(walk(m, sg.x, sg.y)).toBe(true);
      expect(sg.text!.join('')).not.toMatch(/單向|只能/);
    }
    expect(sv.text!.join('')).toMatch(/綠洲鎮/);
  });
  it('起始村只新增 desert_road 與 desert_sign：既有物件座標不動、新物件不重疊、抵達格走得到', () => {
    const before = ['dock: 21,11', 'door_home: 5,3', 'door_lab: 14,3', 'door_shop: 19,14', 'kid: 7,6', 'elder: 18,8', 'girl: 21,9',
      'chest_t: 8,10', 'dummy: 16,11', 'sign1: 10,15', 'rock_a: 23,4', 'chest_hidden: 23,3', 'bell: 21,7', 'chest_bell: 22,8',
      'fog_a: 10,4', 'chest_fog: 10,2', 'trail_xh: 20,10', 'trail_sign_v: 19,10', 'gate_b: 4,17', 'gate_p: 7,17'];
    const now = v.objects.map((o) => `${o.id}: ${o.x},${o.y}`);
    for (const l of before) expect(now, l).toContain(l);
    expect(v.objects.map((o) => o.id).filter((id) => !before.some((l) => l.startsWith(id + ':'))).sort()).toEqual(['desert_road', 'desert_sign']);
    const keys = v.objects.map((o) => `${o.x},${o.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    // 其他地圖通到起始村的抵達格也不能壓在新物件上
    for (const m of Object.values(MAPS)) for (const o of m.objects) {
      const t = o.dockTo ?? o.to;
      if (t && t.map === 'village') for (const id of ['desert_road', 'desert_sign']) {
        const p = v.objects.find((q) => q.id === id)!;
        expect(t.x === p.x && t.y === p.y, `${m.id}/${o.id} 抵達在 ${id} 上`).toBe(false);
      }
    }
    // 從起始村起點（打倒 boss_x 後全部可見）走得到抵達格、告示牌旁、小路旁
    const solid = new Set(v.objects.map((o) => `${o.x},${o.y}`));
    const seen = new Set<string>([`${v.start.x},${v.start.y}`]);
    const q = [v.start];
    while (q.length) {
      const c = q.shift()!;
      for (const [dx, dy] of N4) {
        const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
        if (seen.has(k) || !walk(v, x, y) || solid.has(k)) continue;
        seen.add(k); q.push({ x, y });
      }
    }
    const rz = zh.objects.find((o) => o.id === 'road_home')!;
    expect(seen.has(`${rz.to!.x},${rz.to!.y}`)).toBe(true);
    for (const id of ['desert_road', 'desert_sign']) {
      const o = v.objects.find((p) => p.id === id)!;
      expect(N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`)), id).toBe(true);
    }
  });
  it('沙漠大門：綠洲鎮 → 火山沙漠起點，怪物島有回程 stairs；兩邊抵達格緊鄰對面的出口', () => {
    const g = zh.objects.find((o) => o.id === 'desert_gate')!, back = z.objects.find((o) => o.kind === 'stairs' && o.to!.map === 'zh')!;
    expect(g.kind).toBe('stairs');
    expect(g.to).toEqual({ map: 'z', x: z.start.x, y: z.start.y });
    expect(back).toBeDefined();
    expect(dist(g.to!, back)).toBe(1);
    expect(dist(back.to!, g)).toBe(1);
    expect(walk(zh, back.to!.x, back.to!.y)).toBe(true);
    expect(zh.objects.some((o) => o.id !== 'desert_gate' && o.x === back.to!.x && o.y === back.to!.y)).toBe(false);
  });
  it('金幣爺爺與星星婆婆在綠洲鎮：id 正確、站可走格、彼此與出入口、抵達格至少 2 格、四周有空格', () => {
    const grannies = zh.objects.filter((o) => o.kind === 'granny'), givers = zh.objects.filter((o) => o.kind === 'giver');
    expect(grannies.map((o) => o.id)).toEqual(['granny']);
    expect(givers.map((o) => o.id)).toEqual(['giver']);
    expect(GIVER_HUBS).toContain('zh');
    const [gr, gv] = [grannies[0], givers[0]];
    expect(dist(gr, gv)).toBeGreaterThanOrEqual(2);
    for (const p of [gr, gv]) {
      expect(walk(zh, p.x, p.y)).toBe(true);
      for (const o of zh.objects.filter((o) => o.kind === 'stairs' || o.kind === 'door')) expect(dist(p, o), `${p.id} 離 ${o.id}`).toBeGreaterThanOrEqual(2);
      for (const mm of Object.values(MAPS)) for (const o of mm.objects) {
        const t = o.dockTo ?? o.to;
        if (t && t.map === 'zh') expect(dist(t, p), `${mm.id}/${o.id}`).toBeGreaterThanOrEqual(2);
      }
      const others = new Set(zh.objects.filter((o) => o !== p).map((o) => `${o.x},${o.y}`));
      expect(N4.filter(([dx, dy]) => walk(zh, p.x + dx, p.y + dy) && !others.has(`${p.x + dx},${p.y + dy}`)).length).toBeGreaterThanOrEqual(2);
    }
  });
  it('火山沙漠：四個機關能力對得上、野怪與練習戰的條件', () => {
    for (const [id, ab] of [['pit', 'web'], ['cactus', 'gulp'], ['stone', 'roar'], ['quicksand', 'sun']]) {
      const o = z.objects.find((p) => p.id === id)!;
      expect(o.kind, id).toBe('gimmick');
      expect(o.ability).toBe(ab);
      expect(o.fx).toBe(ab);
    }
    const pit = z.objects.find((o) => o.id === 'pit')!;
    expect(pit.sprite2).toBe('web_bridge');
    expect(pit.passable).toBe(true);
    expect(z.objects.find((o) => o.id === 'cactus')!.vanish).toBe(true);
    expect(z.objects.find((o) => o.id === 'stone')!.vanish).toBe(true);
    expect(z.objects.find((o) => o.id === 'quicksand')!.sprite2).toBe('quicksand_dry');
    for (const m of z.objects.filter((o) => o.kind === 'monster')) expect(Boolean(BATTLES[m.battle!]), m.id).toBe(true);
    expect(z.objects.find((o) => o.id === 'dummy')!.hideIf).toBe('zPractice');
    expect(z.objects.find((o) => o.id === 'm3')!.showIf).toBe('zPractice');
  });
  it('reachReport：沒有對應能力就拿不到寶箱，學會就全部走得到', () => {
    const start = { map: 'z', x: z.start.x, y: z.start.y };
    const un = (ab: string[]) => reachReport([z], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['z/chest_web1', 'z/chest_web2', 'z/chest_cactus', 'z/chest_stone']));
    expect(un(['gulp', 'roar', 'sun'])).toEqual(expect.arrayContaining(['z/chest_web1', 'z/chest_web2']));
    expect(un(['web', 'roar', 'sun'])).toContain('z/chest_cactus');
    expect(un(['web', 'gulp', 'sun'])).toContain('z/chest_stone');
    const all = reachReport([z], start, ['web', 'gulp', 'roar', 'sun']);
    expect(all.unreachableObjects, all.unreachableObjects.join(' ')).toEqual([]);
    expect(all.unreachableFloor).toEqual([]);
    // 曬乾流沙之後才出現的寶箱在機關旁邊
    const qs = z.objects.find((o) => o.id === 'quicksand')!, cs = z.objects.find((o) => o.id === 'chest_sun')!;
    expect(cs.showIf).toBe('g:z:quicksand');
    expect(dist(qs, cs)).toBe(1);
  });
  it('沙坑那一格是沙地（可走），上下被熔岩夾住，是唯一的通道', () => {
    const p = z.objects.find((o) => o.id === 'pit')!;
    expect(z.tiles[p.y][p.x]).toBe('s');
    expect(z.tiles[p.y - 1][p.x]).toBe('V');
    expect(z.tiles[p.y + 1][p.x]).toBe('V');
  });
  it('洞窟入口 cave 留給 Task 4：這裡先確認 z 沒有引用不存在的地圖', () => {
    // Task 4 完成後移除這一條，改驗 cave（showIf zPractice、通 zc1）
    for (const o of z.objects) if (o.to) expect(MAPS[o.to.map], o.id).toBeDefined();
  });
  it('格局和前三個主島不同，並有綠洲池', () => {
    for (const id of ['dh', 'gh', 'xh']) expect(MAPS[id].tiles.join('')).not.toBe(zh.tiles.join(''));
    expect(zh.tiles.join('')).toMatch(/w/);
  });
});
