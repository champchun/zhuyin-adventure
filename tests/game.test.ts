import { describe, expect, it } from 'vitest';
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ALL_SYMBOLS, LEARN_STEPS, symbolDef } from '../src/data/symbols';
import { QuestionRun, makeQuestion } from '../src/core/learning';
import { G, activeSymbols, addCoins, addItem, buyItem, emptyStat, ensureVitals, giveMonster, healAll, itemCount, maxHp, maxMp, newSave, useItem } from '../src/core/save';
import { ENEMIES, ITEMS, SPECIES, moveFor } from '../src/data/monsters';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function reach(mapId: string, from: { x: number; y: number }, extraBlocked: Set<string>) {
  const m = MAPS[mapId];
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const q = [from];
  while (q.length) {
    const c = q.shift()!;
    for (const [dx, dy] of N4) {
      const x = c.x + dx, y = c.y + dy, k = `${x},${y}`;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h || seen.has(k)) continue;
      if (BLOCKED_TILES.has(m.tiles[y][x]) || extraBlocked.has(k)) continue;
      seen.add(k); q.push({ x, y });
    }
  }
  return seen;
}
const adjReach = (seen: Set<string>, o: { x: number; y: number }) => N4.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));

describe('maps', () => {
  for (const m of Object.values(MAPS)) {
    it(`${m.id}: 尺寸一致、物件在界內、起點可走、id 不重複`, () => {
      expect(m.tiles.length).toBe(m.h);
      m.tiles.forEach((r) => expect(r.length).toBe(m.w));
      expect(BLOCKED_TILES.has(m.tiles[m.start.y][m.start.x])).toBe(false);
      expect(BLOCKED_TILES.has(m.tiles[m.respawn.y][m.respawn.x])).toBe(false);
      for (const o of m.objects) {
        expect(o.x).toBeGreaterThanOrEqual(0); expect(o.x).toBeLessThan(m.w);
        expect(o.y).toBeGreaterThanOrEqual(0); expect(o.y).toBeLessThan(m.h);
        if (o.battle) expect(BATTLES[o.battle]).toBeDefined();
      }
      const ids = m.objects.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
    it(`${m.id}: 物件不放在被阻擋的地形上（出口／注音門／裂石除外）`, () => {
      for (const o of m.objects) {
        if (o.kind === 'door') continue; // 門開在牆上，從前面互動
        const t = m.tiles[o.y][o.x];
        expect(BLOCKED_TILES.has(t), `${m.id}/${o.id} 在 ${t}`).toBe(false);
      }
    });
    it(`${m.id}: 出口／門的目的地存在且落在可走的格子`, () => {
      for (const o of m.objects.filter((x) => x.to)) {
        const dst = MAPS[o.to!.map];
        expect(dst, `${m.id}/${o.id} → ${o.to!.map}`).toBeDefined();
        expect(BLOCKED_TILES.has(dst.tiles[o.to!.y][o.to!.x]), `${m.id}/${o.id} 落點被擋住`).toBe(false);
      }
    });
    it(`${m.id}: 村民對話最後一句不設條件（任何進度都有話可說）`, () => {
      for (const o of m.objects.filter((x) => x.talk)) {
        const last = o.talk![o.talk!.length - 1];
        expect(last.if === undefined && last.not === undefined, `${m.id}/${o.id}`).toBe(true);
      }
    });
    it(`${m.id}: 起點能走到所有一般物件旁`, () => {
      if (m.group) return; // 迷宮樓層有鎖門、機關、裂石，由 tests/dungeon.test.ts 用模擬來驗證
      const solid = new Set(m.objects.map((o) => `${o.x},${o.y}`));
      const seen = reach(m.id, m.start, solid);
      const sealed = new Set(['chest_rock', 'chest_hidden', 'chest_leaf', 'chest_wind', 'chest_fog', 'chest_ice', 'chest_slide', 'chest_bridge1', 'chest_bridge2']);
      for (const o of m.objects) {
        if (['rock', 'woodgate', 'leaves', 'fog'].includes(o.kind) || sealed.has(o.id)) continue;
        expect(adjReach(seen, o), `${m.id}/${o.id} 無法抵達`).toBe(true);
      }
    });
  }
  it('被封住的寶箱：打通裂石／落葉／木門後才可抵達', () => {
    const check = (mapId: string, open: string[], chest: string, expected: boolean) => {
      const m = MAPS[mapId];
      const solid = new Set(m.objects.filter((o) => !open.includes(o.id)).map((o) => `${o.x},${o.y}`));
      const seen = reach(mapId, m.start, solid);
      expect(adjReach(seen, m.objects.find((o) => o.id === chest)!), `${mapId}/${chest}`).toBe(expected);
    };
    check('b', [], 'chest_rock', false); check('b', ['rock_b'], 'chest_rock', true);
    check('p', [], 'chest_leaf', false); check('p', ['leaves_a'], 'chest_leaf', true);
    check('p', [], 'chest_wind', false); check('p', ['woodgate'], 'chest_wind', true);
    check('village', [], 'chest_hidden', false); check('village', ['rock_a'], 'chest_hidden', true);
    check('village', [], 'chest_fog', false); check('village', ['fog_a'], 'chest_fog', true);
  });
});

describe('開場流程', () => {
  it('新遊戲從房間開始；房間→村子→研究所互相連通', () => {
    expect(newSave().mapId).toBe('room');
    const reachable = (from: string) => new Set(MAPS[from].objects.filter((o) => o.to).map((o) => o.to!.map));
    expect(reachable('room').has('village')).toBe(true);
    expect(reachable('village').has('room')).toBe(true);
    expect(reachable('village').has('lab')).toBe(true);
    expect(reachable('lab').has('village')).toBe(true);
  });
  it('研究所有三隻初始夥伴：平均／防禦／攻擊', () => {
    const sts = MAPS.lab.objects.filter((o) => o.kind === 'starter').map((o) => SPECIES[o.species!]);
    expect(sts.map((s) => s.role).sort()).toEqual(['平均型', '攻擊型', '防禦型']);
    const hp = Object.fromEntries(sts.map((s) => [s.id, s.baseHp]));
    expect(hp.momo).toBeGreaterThan(hp.bobo); expect(hp.bobo).toBeGreaterThan(hp.popo);
    expect(SPECIES.popo.atk).toBeGreaterThan(SPECIES.bobo.atk);
    expect(SPECIES.momo.guard).toBeGreaterThan(SPECIES.bobo.guard);
  });
  it('離開房間前要先跟媽媽說話；離開研究所前要拿到博士的禮物', () => {
    expect(MAPS.room.objects.find((o) => o.id === 'door')!.needFlag).toBe('momTalked');
    expect(MAPS.lab.objects.find((o) => o.id === 'door')!.needFlag).toBe('giftGiven');
  });
});

describe('夥伴像素圖', () => {
  it('每一張都完整放得進 32×32（角、火焰不會被切掉），且每隻 SPECIES 的貼圖都存在', () => {
    for (const k of Object.keys(MONSTER_ART)) {
      const b = monsterSize(k);
      expect(b.w, `${k} 寬`).toBeLessThanOrEqual(32);
      expect(b.h, `${k} 高`).toBeLessThanOrEqual(32);
      const { rows } = monsterRows(k);
      expect(rows.length).toBe(32);
      rows.forEach((r) => expect(r.length).toBe(32));
    }
    for (const sp of Object.values(SPECIES)) for (const key of sp.sprites) expect(MONSTER_ART[key], `${sp.id}/${key}`).toBeDefined();
    for (const en of Object.values(ENEMIES)) expect(MONSTER_ART[en.sprite], `敵人 ${en.id}`).toBeDefined();
  });
});

describe('HP／魔力／道具', () => {
  const fresh = () => { G.save = newSave(); return giveMonster('bobo')!; };
  it('新夥伴 HP、魔力全滿；睡覺（healAll）後回復', () => {
    const m = fresh();
    expect(m.hp).toBe(maxHp(m)); expect(m.mp).toBe(maxMp(m));
    m.hp = 1; m.mp = 0;
    healAll();
    expect(m.hp).toBe(maxHp(m)); expect(m.mp).toBe(maxMp(m));
  });
  it('舊存檔沒有 hp／mp：補滿', () => {
    const m = fresh();
    delete m.hp; delete m.mp;
    ensureVitals(m);
    expect(m.hp).toBe(maxHp(m)); expect(m.mp).toBe(maxMp(m));
  });
  it('小藥水補 HP 不會超過上限；已經滿了不消耗；沒有庫存不能用', () => {
    const m = fresh();
    addItem('potion', 2);
    expect(useItem('potion', m)).toBe(false); // HP 已滿
    expect(itemCount('potion')).toBe(2);
    m.hp = 1;
    expect(useItem('potion', m)).toBe(true);
    expect(m.hp).toBe(Math.min(maxHp(m), 1 + ITEMS.potion.hp!));
    expect(itemCount('potion')).toBe(1);
    m.hp = 1; expect(useItem('potion', m)).toBe(true);
    m.hp = 1; expect(useItem('potion', m)).toBe(false);
  });
  it('魔力果補魔力', () => {
    const m = fresh();
    addItem('berry');
    m.mp = 0;
    expect(useItem('berry', m)).toBe(true);
    expect(m.mp).toBe(Math.min(maxMp(m), ITEMS.berry.mp!));
  });
});

describe('金幣與商店', () => {
  const fresh = () => { G.save = newSave(); };
  it('新遊戲 0 金幣；買東西要夠錢，成功才扣錢加道具', () => {
    fresh();
    expect(G.save.coins).toBe(0);
    expect(buyItem('potion')).toBe('poor');
    expect(itemCount('potion')).toBe(0);
    addCoins(20);
    expect(buyItem('potion')).toBe('ok');
    expect(G.save.coins).toBe(20 - ITEMS.potion.price!);
    expect(itemCount('potion')).toBe(1);
  });
  it('大藥水要打過頭目才上架；不賣的東西買不到；金幣不會變負數', () => {
    fresh();
    addCoins(999);
    expect(buyItem('bigpotion')).toBe('locked');
    G.save.flags.boss_b = true;
    expect(buyItem('bigpotion')).toBe('ok');
    expect(buyItem('不存在')).toBe('none');
    addCoins(-99999);
    expect(G.save.coins).toBe(0);
  });
  it('所有會賣的道具都有價格；通關獎勵與野生怪都會給金幣', () => {
    for (const it of Object.values(ITEMS)) if (it.price !== undefined) expect(it.price).toBeGreaterThan(0);
    for (const b of Object.values(BATTLES)) expect(b.reward.coins ?? 0, b.id).toBeGreaterThan(0);
  });
  it('商店在村子裡有入口，店員在店裡', () => {
    expect(MAPS.village.objects.some((o) => o.id === 'door_shop' && o.to?.map === 'shop')).toBe(true);
    expect(MAPS.shop.objects.some((o) => o.id === 'clerk')).toBe(true);
  });
});

describe('怪物重生', () => {
  const monsters = Object.values(MAPS).flatMap((m) => m.objects.filter((o) => o.kind === 'monster').map((o) => ({ map: m.id, o })));
  it('野生怪會重生；頭目與練習布偶不會', () => {
    expect(monsters.length).toBeGreaterThan(0);
    for (const { map, o } of monsters) {
      const b = BATTLES[o.battle!];
      const isWild = b.phases === 1 && !b.guided;
      expect(!!b.respawn, `${map}/${o.id}（${b.id}）`).toBe(isWild);
    }
  });
  it('野生怪的擊敗旗標跟地圖物件對得上（重生時清掉這個旗標就會再出現）', () => {
    for (const { map, o } of monsters) {
      const b = BATTLES[o.battle!];
      if (b.respawn) expect(b.reward.flag, `${map}/${o.id}`).toBe(`m:${map}:${o.id}`);
    }
  });
});

describe('levels', () => {
  it('已開放關卡有地圖，其餘保留為尚未開放', () => {
    for (const L of Object.values(LEVELS)) {
      // 第五關的地圖（zh）在地圖 Task 才建，建完就移除這個例外
      if (L.open) { if (L.id !== 'z') expect(MAPS[L.mapId!]).toBeDefined(); } else expect(L.mapId).toBeUndefined();
    }
    expect(Object.keys(LEVELS)).toEqual(['b', 'p', 'd', 'g', 'x', 'z']);
  });
});

describe('learning', () => {
  const stats = () => Object.fromEntries(ALL_SYMBOLS.map((s) => [s, emptyStat()]));
  const ctx = (over: any = {}) => ({ focus: ['ㄅ'], review: ['ㄇ', 'ㄉ'], allowed: ALL_SYMBOLS, tier: 1 as const, audioReady: false, optionCount: 2, stats: stats(), ...over });

  it('選項只來自開放的符號、含正解、不重複', () => {
    const allowed = ['ㄅ', 'ㄆ', 'ㄇ'];
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion(ctx({ allowed, optionCount: 3 }));
      expect(q.options.every((o) => allowed.includes(o))).toBe(true);
      expect(q.options).toContain(q.target);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });
  it('正解位置隨機分佈', () => {
    const pos = [0, 0];
    for (let i = 0; i < 400; i++) { const q = makeQuestion(ctx({ review: [], focus: ['ㄅ'], allowed: ['ㄅ', 'ㄆ'] })); pos[q.options.indexOf(q.target)]++; }
    expect(pos[0]).toBeGreaterThan(120); expect(pos[1]).toBeGreaterThan(120);
  });
  it('不連續出同一題（有多個目標時）', () => {
    let prev: string | undefined;
    for (let i = 0; i < 200; i++) { const q = makeQuestion(ctx({ prevTarget: prev })); if (prev) expect(q.target).not.toBe(prev); prev = q.target; }
  });
  it('沒有音檔時，聽音題退回看符號配對並標記 fallback', () => {
    const q = makeQuestion(ctx({ tier: 2, audioReady: false }));
    expect(q.type).toBe('match'); expect(q.fallback).toBe(true);
    expect(makeQuestion(ctx({ tier: 2, audioReady: true })).type).toBe('listen');
  });
  it('家長只開放 2 個符號時，仍只有 2 個選項', () => {
    expect(makeQuestion(ctx({ allowed: ['ㄅ', 'ㄆ'], optionCount: 3 })).options.length).toBe(2);
  });
  it('首次獨立答對才算 first；答錯或提示後完成只算 assisted', () => {
    const st = stats();
    const q = { type: 'match' as const, target: 'ㄅ', options: ['ㄅ', 'ㄆ', 'ㄇ'], fallback: false };
    let r = new QuestionRun(q, st); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1);
    r = new QuestionRun(q, st); r.pick('ㄆ'); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1); expect(st['ㄅ'].assisted).toBe(1); expect(st['ㄅ'].wrong).toBe(1);
    r = new QuestionRun(q, st); r.hint(); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1); expect(st['ㄅ'].assisted).toBe(2); expect(st['ㄅ'].hints).toBe(1);
    r = new QuestionRun(q, st, true); r.pick('ㄅ');
    expect(st['ㄅ'].first).toBe(1);
  });
  it('連續答錯：先減少選項，再顯示正確符號；完成後不能重複計分', () => {
    const st = stats();
    const q = { type: 'match' as const, target: 'ㄅ', options: ['ㄅ', 'ㄆ', 'ㄇ'], fallback: false };
    const r = new QuestionRun(q, st);
    expect(r.pick('ㄆ')).toBe('wrong'); expect(r.visible().length).toBe(3);
    r.pick('ㄇ');
    expect(r.visible().length).toBe(2); expect(r.done).toBe(false);
    r.pick(r.visible().find((o) => o !== 'ㄅ')!);
    expect(r.revealed).toBe(true);
    expect(r.pick('ㄅ')).toBe('correct');
    expect(r.pick('ㄅ')).toBe('ignored');
    expect(st['ㄅ'].assisted).toBe(1);
  });
  it('容易答錯的符號增加複習機會', () => {
    const st = stats();
    st['ㄉ'].wrong = 6;
    let d = 0, m = 0;
    for (let i = 0; i < 1500; i++) { const q = makeQuestion(ctx({ stats: st, focus: [], review: ['ㄇ', 'ㄉ'] })); if (q.target === 'ㄉ') d++; else m++; }
    expect(d).toBeGreaterThan(m);
  });
});

describe('已教過的符號', () => {
  it('練習戰完成前只出 ㄅㄆ，之後才加入 ㄇㄈ', () => {
    G.save.flags = {};
    expect(activeSymbols()).toEqual(['ㄅ', 'ㄆ']);
    G.save.flags.practiceDone = true;
    expect(activeSymbols()).toEqual(['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ']);
    G.save.flags = {};
  });
});

describe('招式綁符號', () => {
  it('答對哪個符號就使出綁定的招式；還沒學會就用小拳擊', () => {
    const none = () => false;
    const all = () => true;
    for (const id of Object.keys(SPECIES)) {
      expect(moveFor(id, 'ㄅ', none).id).toBe('tap');
      expect(moveFor(id, 'ㄅ', all).id).toBe('blast');
      expect(moveFor(id, 'ㄆ', all).id).toBe('gust');
      expect(moveFor(id, 'ㄇ', all).id).toBe('hum');
      expect(moveFor(id, 'ㄈ', all).id).toBe('fog');
      expect(moveFor(id, 'ㄇ', (a) => a === 'blast').id).toBe('tap');
    }
  });
  it('每一招都有魔法版的名字', () => {
    expect(moveFor('bobo', 'ㄅ', () => true).magicName).toBe('爆破魔法');
    expect(moveFor('bobo', 'ㄗ', () => true).magicName).toBe('小魔法彈');
  });
});

describe('答錯懲罰', () => {
  it('練習戰答錯不罰；小關B 之後的戰鬥答錯會攻擊失敗', () => {
    expect(BATTLES.practice.penalty).toBeFalsy();
    for (const id of ['b1', 'b2', 'b3', 'boss_b', 'p1', 'p2', 'p3', 'boss_p']) expect(BATTLES[id].penalty, id).toBe(true);
  });
});

describe('舌尖中音島（ㄉㄊㄋㄌ）', () => {
  it('符號依教學進度逐步出現：進島教 ㄉㄊ，練習完才教 ㄋㄌ', () => {
    G.save.flags = {};
    expect(activeSymbols()).toEqual(['ㄅ', 'ㄆ']);
    G.save.flags.practiceDone = true;
    expect(activeSymbols()).toEqual(['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ']);
    G.save.flags.dEntered = true;
    expect(activeSymbols()).toEqual(['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ']);
    G.save.flags.dPractice = true;
    expect(activeSymbols()).toEqual(['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ']);
    G.save.flags = {};
  });
  it('每一招需要的能力，都能從某場戰鬥的獎勵拿到；每個綁定的符號都存在', () => {
    const granted = new Set(Object.values(BATTLES).flatMap((b) => b.reward.abilities ?? []));
    for (const m of Object.values(SPECIES.bobo.moves)) {
      if (m.needAbility) expect(granted.has(m.needAbility), m.id).toBe(true);
      if (m.symbol) expect(ALL_SYMBOLS.includes(m.symbol), m.id).toBe(true);
    }
  });
  it('島上的戰鬥都有敵人、符號都在教學進度內，頭目與練習戰不會重生', () => {
    const learnable = new Set(LEARN_STEPS.flatMap((s) => s.symbols));
    for (const id of ['dpractice', 'd1', 'd2', 'd3', 'boss_d']) {
      const b = BATTLES[id];
      expect(ENEMIES[b.enemy], id).toBeDefined();
      for (const s of [...b.focus, ...b.review]) expect(learnable.has(s), `${id} ${s}`).toBe(true);
    }
    expect(BATTLES.boss_d.respawn).toBeFalsy();
    expect(BATTLES.dpractice.respawn).toBeFalsy();
    expect(BATTLES.dpractice.penalty).toBeFalsy();
    expect(BATTLES.boss_d.penalty).toBe(true);
  });
  it('四個機關各用一個新招式，且都有對應的圖', () => {
    const gs = MAPS.d.objects.filter((o) => o.kind === 'gimmick');
    expect(gs.map((o) => o.ability).sort()).toEqual(['drum', 'nasal', 'splash', 'stream']);
    for (const g of gs) { expect(g.hitText?.length, g.id).toBeGreaterThan(0); expect(g.lockText?.length, g.id).toBeGreaterThan(0); }
  });
  it('教學進度裡的符號都是有定義、有例字的聲母', () => {
    for (const s of LEARN_STEPS.flatMap((x) => x.symbols)) expect(symbolDef(s), s).toBeDefined();
  });
});
