# 第七關（海底 ㄧㄨㄩ）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-17-underwater-level-design.md`（必讀）。步驟用 `- [ ]` 追蹤。

**Goal:** 做出第二階段第一關「海底」：ㄧㄨㄩ 三個符號的招式與機關、珊瑚港（主島）、海藻森林（怪物島）、沉船（產生的兩層迷宮）、大章魚（護盾頭目）、大廳 `gate7` 通道，以及端對端 `lv7` 與文件。

**Architecture:** 資料驅動，沿用第六關（天空島）的做法：招式（`MOVES`）、敵人（`ENEMIES`）、戰鬥（`BATTLES`）、地圖（`MAPS`，用 `SKINS.sea` 外觀表）、迷宮產生器（`tools/gen-dungeon.mjs`，種子 79、83）。交通工具新增 `seahorse`（沿用 `dock` + `dockTo`）。

**Tech Stack:** TypeScript、Vite、Phaser 3、Vitest。

## Global Constraints

- 繁體中文；commit 結尾加 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不得改變第 0～6 關任何地圖的地形、物件、行為；`dc1`／`dc2` 完全不動；既有洞窟（gc／xc／zc／sc）在 `src/data/mazes.ts` 的內容一格都不能變（重新產生後 `git diff src/data/mazes.ts` 只能新增 `uc1`、`uc2`，並調整型別宣告）。
- **不得再往預設 skin 的 `TILE_KEY`／`BLOCKED_TILES` 加字元**；本關新地圖都設 `skin: 'sea'`。查地形一律用 `tileKeyOf(map, ch)`／`isBlockedTile(map, ch)`，不直接用 `BLOCKED_TILES`／`TILE_KEY`。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2／3 降級成看符號配對（既有行為）。
- 不要碰 Azure 金鑰；新語音句子不預先產生（`tools/gen-voice.ts` 由使用者自己執行）。
- NPC 與告示牌台詞：沒學到 ㄩ 之前（`uPractice` 之前），台詞不得出現 `ㄩ`；任何地圖台詞不得說「所有的注音」「全部的注音」都學會了。
- repo 沒有 `@types/node`：測試要用 `node:fs` 等時，沿用 `tests/mazegen.test.ts` 的 `// @ts-ignore`，或擴充 `tests/helpers/node-crypto.d.ts` 的做法，保持 `tsc` 乾淨。
- 每個 Task 完成前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。

## 已決定的資料（逐字照用）

- 招式（`MOVES`，威力 ㄧ 10、ㄨ 10、ㄩ 11；`id`＝能力 id＝`fx`）：

| id | 符號 | `name` | `magicName` | `desc` |
|---|---|---|---|---|
| `glow` | ㄧ | 亮光閃 | 亮光魔法 | 「ㄧ」嘴角往兩邊拉開，像笑咪咪的樣子，細細地發出聲音，嘴巴前面亮起一道小光，能點亮暗掉的燈籠水母。 |
| `jet` | ㄨ | 噗噗水柱 | 水柱魔法 | 「ㄨ」嘴巴嘟成一個小圓圈，用力往前吹，像噴出一道水柱「噗」，能把緊閉的大貝殼沖開。 |
| `pop` | ㄩ | 吐泡泡 | 吐泡魔法 | 「ㄩ」嘴巴噘得圓圓的，舌頭和「ㄧ」一樣在前面，像小魚吐泡泡，吹出一串泡泡，能在深水溝上架起泡泡橋。 |

（`pop` 的 `magicName` 刻意不叫「泡泡魔法」，因為 ㄋ 的 `nasal` 已經用了這個名字。）

- 敵人（`ENEMIES`）：`clownfish` 小丑魚 42／7、`jellyfish` 水母 44／7（`echo`）、`urchin` 海膽 46／8（`echo`）、`octopus` 大章魚 58／9、`kelpdummy` 海草人偶 8／1（`sprite: 'en_dummy'`，`scale: 2.25`）；`clownfish`／`jellyfish`／`urchin` 的 `scale` 2.25，`octopus` 的 `scale` 2.75；貼圖 key：`en_clownfish`、`en_jellyfish`、`en_urchin`、`en_octopus`。
- 地圖 id：`uh`（珊瑚港，主島）、`uh_inn`、`uh_shop`、`u`（海藻森林）、`uc1`／`uc2`（沉船，`group: 'uc'`）；旗標：`uEntered`、`uPractice`、`boss_u`、`visited:uh`；戰鬥 id：`upractice`、`u1`～`u3`、`uc1m`／`uc1m2`／`uc1m3`／`uc1m4`、`uc2m`／`uc2m2`／`uc2m3`、`boss_u`。
- 地形 skin `sea`（字元 → 貼圖 key，括號為是否擋路）：

| 字元 | 貼圖 key | 意義 | 擋路 |
|---|---|---|---|
| `.` | `t_sea_sand` | 海沙 | 否 |
| `,` | `t_sea_kelp` | 淺藻地（裝飾） | 否 |
| `=` | `t_sea_path` | 貝殼小路 | 否 |
| `f` | `t_wreck_deck` | 沉船甲板 | 否 |
| `#` | `t_sea_coral` | 珊瑚叢 | 是 |
| `R` | `t_sea_rock` | 礁岩 | 是 |
| `~` | `t_sea_deep` | 深水溝 | 是 |
| `O` | `t_sea_pool` | 泡泡池 | 是 |
| `h` / `H` | `t_roof_shell` / `t_wall_shell` | 貝殼屋民宅屋頂／牆 | 是 |
| `i` / `I` | `t_roof_inn_shell` / `t_wall_inn_shell` | 旅館屋頂／牆 | 是 |
| `k` / `K` | `t_roof_shop_shell` / `t_wall_shop_shell` | 商店屋頂／牆 | 是 |
| `D` | `t_door` | 門（既有貼圖） | 是 |
| `W` | `t_wreck_wall` | 沉船木牆 | 是 |

  另外室內地圖（旅館、商店）沿用預設 skin 的房間地形：`uh_inn`／`uh_shop` 不設 `skin`（用 `shop.rows()`，同其他主島的室內）。
- 物件貼圖 key：`lantern_jelly`、`lantern_jelly_on`（燈籠水母 滅／亮）、`giant_clam`、`giant_clam_open`（大貝殼 關／開）、`bubble_gap`、`bubble_bridge`（深水溝缺口 ／ 泡泡橋）、`seahorse`（海馬，碼頭用）、`bubble_gate`（泡泡門，大廳與主島通道）。

---

## Task 1：四隻海底敵人的像素圖

**Files:** `src/gfx/monsterArt.ts`、`tests/seaenemyart.test.ts`（新）。

**Interfaces:** Produces（`MONSTER_ART` 新 key）：`en_clownfish`、`en_jellyfish`、`en_urchin`、`en_octopus`。**這個 Task 只加圖，不加 `ENEMIES` 資料**（Task 3 才加；`tests/game.test.ts` 要求每個敵人都有圖，所以圖先到位）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/seaenemyart.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { MONSTER_ART, monsterRows, monsterSize } from '../src/gfx/monsterArt';

const KEYS = ['en_clownfish', 'en_jellyfish', 'en_urchin', 'en_octopus'];

describe('第七關敵人像素圖', () => {
  it('四隻都有登記、放得進 32×32、夠大', () => {
    for (const k of KEYS) {
      expect(MONSTER_ART[k], k).toBeDefined();
      const b = monsterSize(k);
      expect(b.w, k).toBeLessThanOrEqual(32); expect(b.h, k).toBeLessThanOrEqual(32);
      expect(monsterRows(k).rows.join('').replace(/\./g, '').length, `${k} 太小`).toBeGreaterThan(100);
    }
  });
  it('頭目大章魚比小怪大', () => {
    const area = (k: string) => monsterRows(k).rows.join('').replace(/\./g, '').length;
    for (const k of KEYS.slice(0, 3)) expect(area('en_octopus'), `octopus vs ${k}`).toBeGreaterThan(area(k));
  });
  it('四張圖互不相同（不是複製貼上）', () => {
    const sigs = KEYS.map((k) => monsterRows(k).rows.join('|'));
    expect(new Set(sigs).size).toBe(4);
  });
});
```

執行 `npx vitest run tests/seaenemyart.test.ts`，預期失敗。

- [ ] **Step 2：實作** 在 `src/gfx/monsterArt.ts` 依照既有敵人（例如 `cloudy`、`sprite`、`comet`、`starguard`、`skydragon` 那組函式與調色盤的寫法）新增四張 32×32 內的像素圖與各自調色盤，並登記進 `MONSTER_ART`：
  - `en_clownfish`（小丑魚）：橘色身體、三道白色橫條紋（黑邊）、小眼睛、尾鰭；友善的表情。
  - `en_jellyfish`（水母）：半透明感的淺紫藍傘狀頭、下面幾條彎彎的觸手、兩個圓眼睛；比小丑魚柔軟。
  - `en_urchin`（海膽）：深紫色圓球、四周一圈尖刺、中間有大眼睛與小嘴。
  - `en_octopus`（大章魚）：頭目，紅紫色大頭、八隻手臂向下散開（至少畫出六隻）、金色眼睛、頭上有一小撮光點；尺寸要明顯比小怪大（接近 32×32）。
  做完後把四張圖各輸出一張放大 PNG 到 scratchpad（不提交），**實際看過**確認一眼認得出是什麼；若是 Node 環境沒有現成的轉圖工具，改用把 `monsterRows` 的字串畫到 `System.Drawing` 位圖（PowerShell）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/seaenemyart.test.ts` 與整包 `npx vitest run` 全過。
- [ ] **Step 4：commit**：「第七關：四隻海底敵人的像素圖」。

---

## Task 2：三個招式（亮光、水柱、吐泡）與特效

**Files:** `src/data/monsters.ts`、`src/data/maps.ts`（`MapObj.fx` 型別）、`src/scenes/Battle.ts`（`playFx`）、`src/scenes/World.ts`（`gimmickFx`）、`tests/sea-moves.test.ts`（新）。

**Interfaces:** Produces：`MOVES.glow`、`MOVES.jet`、`MOVES.pop`；`MoveDef.fx` 與 `MapObj.fx` 型別各加 `'glow' | 'jet' | 'pop'`；三隻初始夥伴（`bobo`、`momo`、`popo`）的 `moves` 都含這三招。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/sea-moves.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { MOVES, SPECIES, castSymbol, moveFor } from '../src/data/monsters';

const DATA: [string, string, number, string, string][] = [
  ['glow', 'ㄧ', 10, '亮光閃', '亮光魔法'],
  ['jet', 'ㄨ', 10, '噗噗水柱', '水柱魔法'],
  ['pop', 'ㄩ', 11, '吐泡泡', '吐泡魔法'],
];

describe('海底三招', () => {
  it('綁定符號、威力、名稱、能力 id 與特效都照表', () => {
    for (const [id, sym, power, name, magic] of DATA) {
      expect(MOVES[id], id).toMatchObject({ id, symbol: sym, power, name, magicName: magic, needAbility: id, fx: id });
      expect(MOVES[id].desc.length, id).toBeGreaterThan(20);
      expect(castSymbol(id), id).toBe(sym);
    }
  });
  it('招式名稱（含魔法名）不和既有招式重複', () => {
    const all = Object.values(MOVES).flatMap((m) => [m.name, m.magicName]);
    expect(new Set(all).size).toBe(all.length);
  });
  it('三隻初始夥伴都學得會；沒有能力時用通用小拳擊，有了才使出綁定招式', () => {
    for (const sp of ['bobo', 'momo', 'popo']) {
      for (const [id] of DATA) expect(SPECIES[sp].moves, `${sp} ${id}`).toContain(MOVES[id]);
      for (const [id, sym] of DATA) {
        expect(moveFor(sp, sym, () => false).id, `${sp} ${sym} 沒能力`).toBe('tap');
        expect(moveFor(sp, sym, (a) => a === id).id, `${sp} ${sym} 有能力`).toBe(id);
      }
    }
  });
  it('威力隨關卡遞增：ㄧㄨㄩ 比 ㄗㄘㄙ 高', () => {
    const last = Math.max(MOVES.zip.power, MOVES.spike.power, MOVES.whistle.power);
    for (const [id] of DATA) expect(MOVES[id].power).toBeGreaterThan(last);
  });
});
```

執行 `npx vitest run tests/sea-moves.test.ts`，預期失敗。

- [ ] **Step 2：實作**
  - `src/data/monsters.ts`：`MoveDef.fx` 聯集加 `'glow' | 'jet' | 'pop'`；`MOVES` 在 `whistle` 之後加三招（欄位照上表，`desc` 逐字）；三隻夥伴的 `moves` 陣列在 `MOVES.whistle` 後面各加 `MOVES.glow, MOVES.jet, MOVES.pop`。
  - `src/data/maps.ts`：`MapObj.fx` 聯集加同三個值。
  - `src/scenes/Battle.ts` `playFx`：新增三個 `case`（比照既有 `case 'stream'`／`'bubble'`／`'hum'` 的寫法，遵守 `G.settings.reduceMotion`、粒子用既有貼圖 `spark`／`drop`／`puff`／`windline`）：
    - `glow`：`audio.sfx('hint')`；三圈由小變大的淡黃白圈（描邊 `0xfff2a8`）在 `to` 處擴散、之後 `burst(to.x,to.y,'spark',8,30,420)`。
    - `jet`：`audio.sfx('splash')`；八條藍色 `windline`（`setTint(0x4aa8f0)`）從 `from` 直射到 `to`，`await sleep(520)` 後 `burst(...,'drop',10,34,420)`。
    - `pop`：`audio.sfx('bubble')`；六顆半透明粉白泡泡（`setTint` 或 `circle` 填 `0xffd6f0`）從 `from` 飄向 `to`，`await sleep(750)` 後 `burst(...,'puff',8,28,380)`。
  - `src/scenes/World.ts` `gimmickFx`：新增三個分支（比照既有 `'drum'`／`'splash'`／`'bubble'`）：`glow`＝`audio.sfx('hint')` + 三圈淡黃白圈；`jet`＝`audio.sfx('splash')` + 噴向上的藍色水滴（比照 `splash`）；`pop`＝`audio.sfx('bubble')` + 六顆泡泡上飄（比照 `bubble`，色調 `0xffd6f0`）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/sea-moves.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第七關：亮光、水柱、吐泡三個招式與特效」。

---

## Task 3：敵人、戰鬥與關卡資料

**Files:** `src/data/monsters.ts`、`src/data/levels.ts`、`tests/difficulty.test.ts`、`tests/sea-battles.test.ts`（新）。

**Interfaces:** Consumes：Task 1 的敵人貼圖 key、Task 2 的招式。Produces：`ENEMIES` 五個新敵人；`BATTLES` 的 `upractice`、`u1`～`u3`、`uc1m`…`uc2m3`、`boss_u`；`LEVELS.u`。

- [ ] **Step 1：寫測試（先看它失敗）**

在 `tests/difficulty.test.ts` 的 `LEVELS` 陣列最後加一列：

```ts
  { name: '第 6 關（海底）', smalls: ['clownfish', 'jellyfish', 'urchin'], boss: 'octopus' },
```

新檔 `tests/sea-battles.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES } from '../src/data/monsters';
import { MONSTER_ART } from '../src/gfx/monsterArt';
import { LEARN_STEPS } from '../src/data/symbols';

describe('第七關敵人', () => {
  it('數值與回音怪設定照規格；每個敵人都有像素圖', () => {
    expect(ENEMIES.clownfish).toMatchObject({ hp: 42, atk: 7, sprite: 'en_clownfish', scale: 2.25 });
    expect(ENEMIES.jellyfish).toMatchObject({ hp: 44, atk: 7, sprite: 'en_jellyfish', echo: true });
    expect(ENEMIES.urchin).toMatchObject({ hp: 46, atk: 8, sprite: 'en_urchin', echo: true });
    expect(ENEMIES.octopus).toMatchObject({ hp: 58, atk: 9, sprite: 'en_octopus', scale: 2.75 });
    expect(ENEMIES.kelpdummy).toMatchObject({ hp: 8, atk: 1, sprite: 'en_dummy' });
    expect(ENEMIES.clownfish.echo).toBeFalsy();
    for (const id of ['clownfish', 'jellyfish', 'urchin', 'octopus', 'kelpdummy']) expect(MONSTER_ART[ENEMIES[id].sprite], id).toBeDefined();
  });
});

describe('第七關戰鬥', () => {
  const learnable = new Set(LEARN_STEPS.flatMap((s) => s.symbols));
  it('練習戰：教學戰、focus ㄧㄨ、獎勵 glow＋jet 並設 uPractice；題目只用學得到的符號', () => {
    const b = BATTLES.upractice;
    expect(b).toMatchObject({ enemy: 'kelpdummy', phases: 2, tier: 1, guided: true });
    expect(b.focus).toEqual(['ㄧ', 'ㄨ']);
    expect(b.reward.flag).toBe('uPractice');
    expect(b.reward.abilities).toEqual(['glow', 'jet']);
    expect(b.penalty).toBeFalsy();
    expect(b.respawn).toBeFalsy();
  });
  it('野生怪 u1～u3：旗標 m:u:m<n>、會重生；u1／u2 不考 ㄩ（還沒學），u3 才有 ㄩ', () => {
    for (const i of [1, 2, 3]) {
      const b = BATTLES[`u${i}`];
      expect(ENEMIES[b.enemy], `u${i}`).toBeDefined();
      expect(b.reward.flag).toBe(`m:u:m${i}`);
      expect(b.respawn).toBe(true);
    }
    expect([...BATTLES.u1.focus, ...BATTLES.u2.focus]).not.toContain('ㄩ');
    expect(BATTLES.u3.focus).toContain('ㄩ');
  });
  it('頭目：護盾、三個小回合、focus 含 ㄩ、獎勵 pop 與旗標 boss_u；pop 不在任何更早的戰鬥獎勵裡', () => {
    const b = BATTLES.boss_u;
    expect(b).toMatchObject({ enemy: 'octopus', shield: true, phases: 3, penalty: true, tier: 3 });
    expect(b.focus).toEqual(expect.arrayContaining(['ㄩ', 'ㄧ', 'ㄨ']));
    expect(b.reward).toMatchObject({ flag: 'boss_u', abilities: ['pop'] });
    for (const [id, bt] of Object.entries(BATTLES)) if (id !== 'boss_u') expect(bt.reward.abilities ?? [], id).not.toContain('pop');
    expect(MOVES.pop.needAbility).toBe('pop');
  });
  it('沉船小怪：旗標 m:<洞窟>:mon<n>，用海底小怪', () => {
    const names = ['uc1m', 'uc1m2', 'uc1m3', 'uc1m4', 'uc2m', 'uc2m2', 'uc2m3'];
    for (const n of names) {
      const b = BATTLES[n];
      expect(['clownfish', 'jellyfish', 'urchin']).toContain(b.enemy);
      expect(b.reward.flag, n).toMatch(/^m:uc[12]:mon[1-4]$/);
      expect(b.respawn).toBe(true);
    }
    expect(BATTLES.uc1m.reward.flag).toBe('m:uc1:mon1');
    expect(BATTLES.uc2m3.reward.flag).toBe('m:uc2:mon3');
  });
  it('每場戰鬥的符號都在教學進度內；練習戰與小怪的台詞不提還沒學的 ㄩ', () => {
    for (const id of ['upractice', 'u1', 'u2', 'u3', 'boss_u']) for (const s of [...BATTLES[id].focus, ...BATTLES[id].review]) expect(learnable.has(s), `${id} ${s}`).toBe(true);
    for (const id of ['upractice', 'u1', 'u2']) for (const l of BATTLES[id].intro) expect(/ㄩ/.test(l), `${id}：${l}`).toBe(false);
  });
  it('LEVELS.u：符號 ㄧㄨㄩ、通往珊瑚港', () => {
    expect(LEVELS.u).toMatchObject({ id: 'u', symbol: 'ㄧㄨㄩ', name: '海底', open: true, mapId: 'uh', partner: '夥伴' });
  });
});
```

執行 `npx vitest run tests/sea-battles.test.ts tests/difficulty.test.ts`，預期失敗。

- [ ] **Step 2：實作**
  - `src/data/monsters.ts` 的 `ENEMIES` 在 `skydragon` 之後加五個敵人（欄位照「已決定的資料」）。
  - `src/data/levels.ts`：`LEVELS` 加 `u: { id: 'u', symbol: 'ㄧㄨㄩ', name: '海底', open: true, mapId: 'uh', partner: '夥伴' }`；`BATTLES` 在 `sc2m3` 之後、`// 畢業區：風車草原` 之前加入下列戰鬥（台詞逐字）：

```ts
  // 第二階段第一關（第七關）：海底（ㄧㄨㄩ）。進入海藻森林先練習 ㄧㄨ，ㄩ 要等練習戰完成後才開始出現，ㄩ 的招式要打倒大章魚才學到
  upractice: {
    id: 'upractice', enemy: 'kelpdummy', phases: 2, tier: 1, focus: ['ㄧ', 'ㄨ'], review: [], guided: true,
    intro: ['海草人偶搖搖晃晃的，用來練習！', '這一次要認的是「ㄧ」和「ㄨ」。ㄧ 嘴角拉開像笑咪咪，ㄨ 嘴巴嘟成小圓圈！'],
    reward: {
      flag: 'uPractice', exp: 9, coins: 16, abilities: ['glow', 'jet'], items: { potion: 1 },
      story: ['練習完成！', '「ㄧ」嘴角拉開笑咪咪，夥伴學會了亮光！', '「ㄨ」嘴巴嘟成小圓圈，夥伴學會了水柱！', '海藻森林裡還有小怪和沉船在等你，往前走走看吧！'],
    },
  },
  u1: wild('u1', 'clownfish', 1, ['ㄧ', 'ㄨ'], ['ㄗ', 'ㄘ'], 'm:u:m1'),
  u2: { ...wild('u2', 'jellyfish', 2, ['ㄧ', 'ㄨ'], ['ㄙ', 'ㄓ'], 'm:u:m2'), intro: ['水母飄過來了！', '牠會考「ㄧ」和「ㄨ」。'] },
  u3: { ...wild('u3', 'urchin', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:u:m3'), intro: ['海膽滾過來了！', '牠會考新的注音：「ㄩ」。'] },
  boss_u: {
    id: 'boss_u', enemy: 'octopus', penalty: true, shield: true, phases: 3, tier: 3, focus: ['ㄩ', 'ㄧ', 'ㄨ'], review: ['ㄗ', 'ㄘ', 'ㄙ', 'ㄓ', 'ㄔ'],
    intro: ['咕嚕嚕～大章魚擋在沉船的最深處！', '牠的八隻手臂都在護著牠，要用「🪄 魔法攻擊」才打得破護盾！一共三個小回合。'],
    reward: {
      flag: 'boss_u', exp: 40, coins: 170, abilities: ['pop'], items: { potion: 2, berry: 2 },
      story: ['大章魚鬆開了手臂，不好意思地搔搔頭。', '「ㄩ」嘴巴噘得圓圓的，像小魚吐泡泡，夥伴學會了吐泡！', '深水溝上的泡泡橋，用新招式試試看吧！'],
    },
  },
  // 沉船（海底的小迷宮）：怪物旗標獨立，不與島上的 u1～u3 共用
  uc1m: wild('uc1m', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon1'),
  uc1m2: wild('uc1m2', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon2'),
  uc1m3: wild('uc1m3', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon3'),
  uc1m4: wild('uc1m4', 'clownfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc1:mon4'),
  uc2m: wild('uc2m', 'jellyfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc2:mon1'),
  uc2m2: wild('uc2m2', 'urchin', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc2:mon2'),
  uc2m3: wild('uc2m3', 'jellyfish', 3, ['ㄧ', 'ㄨ', 'ㄩ'], ['ㄗ', 'ㄘ', 'ㄙ'], 'm:uc2:mon3'),
```

- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；兩個測試檔與整包 `npx vitest run` 全過（若既有的逐一檢查戰鬥或敵人的測試因新資料失敗，依該測試的規則補資料，不放寬規則，commit 說明）。
- [ ] **Step 4：commit**：「第七關：敵人、戰鬥與關卡資料（大章魚護盾戰）」。

---

## Task 4：海底地形與物件圖樣、`sea` skin

**Files:** `src/gfx/seaArt.ts`（新）、`src/gfx/sprites.ts`、`src/data/maps.ts`（`SKINS.sea`）、`tests/seaart.test.ts`（新）。

**Interfaces:** Produces：`SEA_TEXTURES`（常數）、`drawSeaTextures(make, px)`；`SKINS.sea`（`{ key, blocked }`，內容照「已決定的資料」的 skin 表）。比照 `src/gfx/skyArt.ts`／`desertArt.ts` 的寫法（`import type { Ctx2, Make, Px } from './snowArt'`；地形圖塊畫滿 16×16，物件背景透明）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/seaart.test.ts`（比照 `tests/desertart.test.ts` 的假畫布 `render()`）：

```ts
import { describe, expect, it } from 'vitest';
import { SKINS } from '../src/data/maps';
import { SEA_TEXTURES, drawSeaTextures } from '../src/gfx/seaArt';
import type { Ctx2 } from '../src/gfx/snowArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawSeaTextures((key, w, h, fn) => {
    const buf: string[] = Array(w * h).fill('');
    const c: Ctx2 = {
      fillStyle: '#000000',
      fillRect(x, y, ww, hh) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (i >= 0 && j >= 0 && i < w && j < h) buf[j * w + i] = String(c.fillStyle); },
    };
    fn(c);
    out[key] = { w, h, px: buf };
  }, (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); });
  return out;
}

describe('海底圖樣', () => {
  const tex = render();
  it('每個圖樣都有畫出來，16×16，不是空的', () => {
    for (const k of SEA_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('地形圖塊（t_ 開頭）畫滿 16×16，沒有透明縫', () => {
    for (const k of SEA_TEXTURES.filter((t) => t.startsWith('t_'))) expect(tex[k].px.every((p) => p), `${k} 有透明格`).toBe(true);
  });
  it('物件圖樣背景透明（疊在海沙上）', () => {
    for (const k of SEA_TEXTURES.filter((t) => !t.startsWith('t_'))) expect(tex[k].px.some((p) => !p), k).toBe(true);
  });
  it('明暗成對的物件畫得不一樣', () => {
    for (const [a, b] of [['lantern_jelly', 'lantern_jelly_on'], ['giant_clam', 'giant_clam_open'], ['bubble_gap', 'bubble_bridge']]) expect(tex[a].px.join('|'), `${a} vs ${b}`).not.toBe(tex[b].px.join('|'));
  });
});

describe('SKINS.sea', () => {
  const sea = SKINS.sea;
  it('字元對應與擋路設定照規格', () => {
    expect(sea).toBeDefined();
    const KEY: Record<string, string> = { '.': 't_sea_sand', ',': 't_sea_kelp', '=': 't_sea_path', f: 't_wreck_deck', '#': 't_sea_coral', R: 't_sea_rock', '~': 't_sea_deep', O: 't_sea_pool', h: 't_roof_shell', H: 't_wall_shell', i: 't_roof_inn_shell', I: 't_wall_inn_shell', k: 't_roof_shop_shell', K: 't_wall_shop_shell', D: 't_door', W: 't_wreck_wall' };
    expect(sea.key).toEqual(KEY);
    expect([...sea.blocked].sort()).toEqual('#RO~hHiIkKDW'.split('').sort());
  });
  it('每個 skin 貼圖都已畫出來（除了既有的 t_door）', () => {
    for (const k of Object.values(sea.key)) if (k !== 't_door') expect(SEA_TEXTURES as readonly string[], k).toContain(k);
  });
});
```

- [ ] **Step 2：實作**
  - `src/gfx/seaArt.ts`：匯出 `SEA_TEXTURES`（15 個地形：`t_sea_sand`、`t_sea_kelp`、`t_sea_path`、`t_wreck_deck`、`t_sea_coral`、`t_sea_rock`、`t_sea_deep`、`t_sea_pool`、`t_roof_shell`、`t_wall_shell`、`t_roof_inn_shell`、`t_wall_inn_shell`、`t_roof_shop_shell`、`t_wall_shop_shell`、`t_wreck_wall`；8 個物件：`lantern_jelly`、`lantern_jelly_on`、`giant_clam`、`giant_clam_open`、`bubble_gap`、`bubble_bridge`、`seahorse`、`bubble_gate`）與 `drawSeaTextures(make, px)`。設計：整體偏青藍綠、和前六關差異大；海沙米黃帶小波紋；淺藻地深綠帶小葉；貝殼小路是粉白色貝殼鋪成；珊瑚叢粉紅與橘；礁岩灰藍；深水溝深藍（看得出是深的）；泡泡池淺藍帶白色泡泡；貝殼屋屋頂是扇貝形（民宅粉、旅館黃、商店藍，牆較素）；沉船木牆深褐帶鐵釘、甲板淺褐木紋。物件：燈籠水母（滅＝灰暗；亮＝黃白發光）、大貝殼（關＝殼閉合；開＝殼張開、裡面有一顆珍珠）、深水溝缺口 `bubble_gap`（深水溝圖塊上有一格缺口、兩側有氣泡冒出）與泡泡橋 `bubble_bridge`（缺口被一串大泡泡橋蓋住，可以踩）、海馬（碼頭用，騎乘的海馬在水草邊）、泡泡門（一圈大泡泡組成的拱門，一眼看得出是出入口，比照 `desert_road` 的辨識度）。
  - `src/gfx/sprites.ts`：加 `import { drawSeaTextures } from './seaArt';`，在 `drawSkyTextures(...)` 那行（約 428）之後，照同樣的寫法呼叫 `drawSeaTextures`。
  - `src/data/maps.ts`：在檔案最後 `SKINS` 之後加 `SKINS.sea = { key: {...}, blocked: new Set([...]) }`（內容逐字照 skin 表；`blocked`＝`'#RO~hHiIkKDW'` 逐字元）。
  - 做完後輸出每個圖樣的放大 PNG（含一張把 15 個地形拼成 5×3 的總覽）到 scratchpad，**實際看過**確認好看、可辨認。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/seaart.test.ts tests/skin.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第七關：海底地形與物件圖樣、sea skin」。

---

## Task 5：珊瑚港、海藻森林、大廳通道、海馬

**Files:** `src/data/maps.ts`、`src/core/giver.ts`、`src/scenes/World.ts`、`tests/seamap.test.ts`（新）、`tests/skymap.test.ts`（交通工具清單）、`tests/lobby.test.ts`（`gate7`）、`tests/giver.test.ts`、`tests/granny.test.ts`、其他逐張地圖檢查的既有測試（依各自規則調整，不放寬）。

**Interfaces:** Produces：`MAPS.uh`、`MAPS.uh_inn`、`MAPS.uh_shop`、`MAPS.u`；`MapObj.vehicle` 型別加 `'seahorse'`；大廳 `gate7` 由 `barrier` 改為 `stairs`；`GIVER_HUBS` 加 `'uh'`；進入 `u` 設 `uEntered`。

地圖建議格局（`28×20`，`skin: 'sea'`；實作可微調位置，但**每個物件都要通過下面的測試**，微調要在 commit 說明）：

```ts
// ───────── 珊瑚港：第二階段第一關的主島（海底）─────────
// 沒有海面碼頭：從大廳的泡泡門下來，落在西南角；東邊的海馬（seahorse）通往海藻森林。商店在北邊偏左、旅館在北邊偏右，中間是泡泡池。
const uhGrid = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('k', 6, 2, 4, 1).rect('K', 6, 3, 4, 1).set(7, 3, 'D');     // 商店：門在 (7,3)
  g.rect('i', 18, 2, 4, 1).rect('I', 18, 3, 4, 1).set(19, 3, 'D');  // 旅館：門在 (19,3)
  g.rect('h', 3, 8, 4, 1).rect('H', 3, 9, 4, 1).rect('h', 21, 15, 4, 1).rect('H', 21, 16, 4, 1); // 兩間民宅（只是裝飾）
  g.rect('O', 12, 8, 4, 4).many('R', [[11, 7], [16, 7], [11, 12], [16, 12]]); // 泡泡池與四塊礁岩
  g.rect('=', 7, 4, 1, 6).rect('=', 19, 4, 1, 6).rect('=', 7, 10, 13, 1); // 貝殼小路
  g.many(',', [[9, 14], [10, 15], [20, 6], [22, 5], [5, 12], [24, 12], [14, 16]]); // 淺藻
  return g;
})();
```

`MAPS.uh`：`name: '珊瑚港'`、`theme: 'island'`、`start: { x: 4, y: 16 }`、`respawn: { x: 4, y: 15 }`、`hub: { dock: { x: 4, y: 16 } }`。物件：
- `door_inn` (19,3) → `uh_inn` (4,6)；`door_shop` (7,3) → `uh_shop` (4,6)。
- `bubble_gate_back`（`stairs`，貼圖 `bubble_gate`，標籤「回世界地圖」）(3,16) → 大廳 `{ map: 'lobby', x: 4, y: 3 }`；`gate_sign`（`sign`）(4,17)：「泡泡門：回世界地圖。」「想去別的世界，就從這裡回去。」
- `seahorse`（`dock`，`vehicle: 'seahorse'`，貼圖 `seahorse`）(25,10)，`dockTo: { map: 'u', x: 3, y: 17 }`；`seahorse_sign`（`sign`）(24,11)：「海馬：通往海藻森林。」「海馬是雙向的，海藻森林那邊也有一隻可以騎回來。」
- `granny`（`kind: 'granny'`，`label: '星星婆婆'`）(11,14)；`giver`（`kind: 'giver'`，`label: '金幣爺爺'`）(17,5)。
- 島民（`npc`，最後一句不設條件）：
  - `crabkid`（`sprite: 'npc_kid'`，`label: '小螃蟹'`）(8,12)：`{ not: 'uEntered', lines: ['歡迎來到珊瑚港！', '這裡在海底，吸氣吐氣都會冒出泡泡。', '東邊有一隻海馬，騎上去就是海藻森林。森林裡有海草人偶，先去練習看看吧！'] }`、`{ not: 'uPractice', lines: ['海草人偶可以讓夥伴練習新招式。', '練習完，路上的燈籠水母和大貝殼，就有辦法對付了。'] }`、`{ not: 'boss_u', lines: ['森林裡有一艘沉船，聽說最深處住著一隻大章魚。', '記得先在旅館睡一覺，再去找牠。'] }`、`{ lines: ['大章魚讓你過去了！太棒了！', '沉船裡的寶藏，你全都看過了嗎？'] }`。
  - `shellgrandpa`（`sprite: 'npc_elder'`，`label: '貝殼爺爺'`）(22,8)：`{ not: 'uPractice', lines: ['海藻森林裡有一盞熄掉的燈籠水母，還有一隻閉得緊緊的大貝殼。', '它們後面好像藏著寶箱。'] }`、`{ not: 'boss_u', lines: ['島中間有一條很深的水溝，水溝上缺了一塊，好像在等一串泡泡來補。', '等你打倒大章魚、學會新招式，再回來看看。'] }`、`{ lines: ['深水溝上的泡泡橋，搭起來了嗎？', '對岸的寶箱，一定很棒！'] }`。
  - `fishgirl`（`sprite: 'npc_girl'`，`label: '小魚妹妹'`）(16,15)：`{ not: 'boss_u', lines: ['旅館住一晚 25 金幣，累了就來睡一覺。', '夥伴的體力和魔力，睡醒就都回來了。'] }`、`{ lines: ['打倒大章魚的人，就是你！', '珊瑚港永遠歡迎你。'] }`。
- `MAPS.uh_inn`（`shop.rows()`，不設 skin，室內）：`keeper`（`innkeeper`，`price: 25`），`text: ['歡迎光臨珊瑚港旅館！', '海底的夜晚，有小魚在窗外游來游去，像在唱搖籃曲。', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。']`、`doneText: ['睡得好嗎？夥伴們都精神飽滿了！', '咕嚕咕嚕～歡迎再來！']`；`door` (4,7) → `{ map: 'uh', x: 19, y: 4 }`。
- `MAPS.uh_shop`（`shop.rows()`）：`clerk`（`npc`，`label: '店員小福'`）(6,3)；`door` (4,7) → `{ map: 'uh', x: 7, y: 4 }`。

海藻森林 `u`（`28×20`，`skin: 'sea'`，`theme: 'meadow'`），格局比照 `s`（星空島）換成海底：

```ts
const kelpIsle = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('~', 19, 1, 1, 18).set(19, 10, '.');                                    // 深水溝與缺口那一格（泡泡橋）
  g.many('R', [[5, 11], [7, 11], [6, 10], [11, 17], [13, 17], [12, 18]]);        // 圍住兩個寶箱：燈籠水母與大貝殼後面
  g.many('#', [[3, 3], [15, 3], [22, 2], [25, 14], [22, 16]]).many(',', [[14, 12], [8, 13], [21, 7], [24, 10]]);
  return g;
})();
```

`MAPS.u`：`name: '海藻森林（ㄧㄨㄩ）'`、`start: { x: 3, y: 17 }`、`respawn: { x: 3, y: 17 }`。物件：
- `seahorse_back`（`dock`，`vehicle: 'seahorse'`，貼圖 `seahorse`）(2,17)，`dockTo: { map: 'uh', x: 24, y: 10 }`。
- `sign1`（`sign`）(3,15)：「海藻森林。」「這座島的注音，嘴巴都要擺出特別的形狀：ㄧ 嘴角拉開，ㄨ 嘴巴嘟圓，還有一個要等你自己發現。」「島上有燈籠水母、大貝殼和一條深水溝，學會新招式，也許就能通過它們！」
- `dummy`（`monster`，`battle: 'upractice'`，`hideIf: 'uPractice'`）(5,17)；`chest_1`（`chest`，`item: 'potion'`）(8,17)。
- `m1`（`monster`，`battle: 'u1'`，`ai: 'patrol'`，`patrol: [{x:10,y:14},{x:11,y:14}]`）(9,14)；`m2`（`u2`，patrol (15,9),(16,9)）(14,9)；`m3`（`u3`，`showIf: 'uPractice'`，patrol (6,8),(7,8)）(5,8)。
- `lantern`（`gimmick`，`sprite: 'lantern_jelly'`，`sprite2: 'lantern_jelly_on'`，`ability: 'glow'`，`fx: 'glow'`）(6,12)；`lockText: ['一盞熄滅的燈籠水母，軟軟地垂在那裡，後面的寶箱黑漆漆的。', '嘴角往兩邊拉開，「ㄧ」地亮出一道小光，也許能把它點亮……']`；`hitText: ['夥伴嘴角一拉「ㄧ」，亮光閃了一下，燈籠水母亮起來了！', '燈光照出了後面的一個寶箱！']`；`doneText: ['燈籠水母亮亮的，好漂亮。']`；`chest_lantern`（`chest`，`item: 'berry'`）(6,11)。
- `clam`（`gimmick`，`sprite: 'giant_clam'`，`sprite2: 'giant_clam_open'`，`ability: 'jet'`，`fx: 'jet'`）(12,16)；`lockText: ['一隻閉得緊緊的大貝殼，擋住了後面的寶箱。', '嘴巴嘟成小圓圈，「ㄨ」地用力吹出一道水柱，也許能把它沖開……']`；`hitText: ['夥伴嘴巴一嘟「ㄨ」，水柱把大貝殼沖開了！', '貝殼後面露出了一個寶箱！']`；`doneText: ['大貝殼張得大大的，裡面空空的。']`；`chest_clam`（`chest`，`item: 'potion'`）(12,17)。**注意：燈籠與大貝殼是 `vanish` 機關嗎？** 否——它們啟動後換成 `sprite2` 並留在原地（不設 `vanish`／`passable`），寶箱用 `showIf: 'g:u:lantern'`／`'g:u:clam'` 才出現（比照 `drum`／`chest_drum` 的做法，`chest_lantern`／`chest_clam` 加上 `showIf`）；寶箱格要和機關相鄰且在礁岩圍起來的口袋裡。
- `sign2`（`sign`）(8,8)：「前面是沉船的方向。」「沉船裡很黑，要先練習完再進去喔。」
- `cave`（`stairs`，`label: '沉船'`，`showIf: 'uPractice'`）(10,3)，`to: { map: 'uc1', x: 2, y: 1 }`（Task 6 才有 `uc1`；**本 Task 先不加 `cave`**，Task 6 一併加入並補測試）。
- `bubble_bridge`（`gimmick`，`sprite: 'bubble_gap'`，`sprite2: 'bubble_bridge'`，`ability: 'pop'`，`fx: 'pop'`，`passable: true`）(19,10)；`lockText: ['深水溝上缺了一塊，過不去。', '要是有一串泡泡，搭成橋就好了……']`；`hitText: ['夥伴嘴巴一噘「ㄩ」，吹出一串大泡泡！', '泡泡搭成了一座橋，可以走到對岸了！']`；`chest_b1`（`item: 'bigpotion'`）(22,10)；`chest_b2`（`item: 'berry'`）(24,5)。

**大廳**：`MAPS.lobby.objects` 的 `gate7`（`barrier`）改成 `{ id: 'gate7', kind: 'stairs', x: 4, y: 2, sprite: 'bubble_gate', to: { map: 'uh', x: 4, y: 16 }, label: '海底' }`；`gate8`～`gate10` 不動。`uh` 的 `bubble_gate_back` 回大廳 (4,3)（`gate7` 正下方的小路）。

**World.ts**：`loadMap` 內 `uEntered` 比照 `sEntered`：`if (m.id === 'u' && !flag('uEntered')) setFlag('uEntered');`；`useDock` 的 `how` 加 `seahorse`：`{ ask: \`騎海馬去${name}？\`, go: '出發 🌊', note: '騎海馬不用錢。' }`。`MapObj.vehicle` 型別加 `'seahorse'`。**`src/core/giver.ts`**：`GIVER_HUBS` 加 `'uh'`。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/seamap.test.ts`（比照 `tests/skymap.test.ts` 的 `floodFrom`／`walk`／`dist`／`adj` helper，但 `walk` 一律用 `isBlockedTile(m, ...)`）：

```ts
import { describe, expect, it } from 'vitest';
import { BATTLES } from '../src/data/levels';
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
    for (const o of [...uh.objects, ...u.objects]) for (const l of o.text ?? []) if (o.id !== 'sign1') expect(/ㄩ/.test(l), `${o.id}：${l}`).toBe(false);
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
  it('reachReport：沒有招式時兩個寶箱與對岸走不到；有 glow／jet 兩個口袋寶箱走得到；有 pop 才走得到對岸', () => {
    const start = { map: 'u', x: u.start.x, y: u.start.y };
    const un = (ab: string[]) => reachReport([u], start, ab).unreachableObjects;
    expect(un([])).toEqual(expect.arrayContaining(['u/chest_lantern', 'u/chest_clam', 'u/chest_b1', 'u/chest_b2']));
    expect(un(['jet', 'pop'])).toContain('u/chest_lantern');
    expect(un(['glow', 'pop'])).toContain('u/chest_clam');
    const mid = un(['glow', 'jet']);
    expect(mid).toEqual(expect.arrayContaining(['u/chest_b1', 'u/chest_b2']));
    expect(mid).not.toContain('u/chest_lantern');
    expect(mid).not.toContain('u/chest_clam');
    expect(un(['glow', 'jet', 'pop']), un(['glow', 'jet', 'pop']).join(' ')).toEqual([]);
    expect(u.tiles[9][19]).toBe('~');
    expect(u.tiles[11][19]).toBe('~');
  });
  it('進島設旗標用的 uEntered、被打倒送回珊瑚港：海馬只通珊瑚港', () => {
    expect(u.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['uh']);
    expect(defeatSpot('uh')).toEqual({ map: 'uh', x: uh.respawn.x, y: uh.respawn.y });
  });
});
```

另外調整既有測試（不放寬規則）：
  - `tests/skymap.test.ts` 第 42 行「交通工具」的清單改為 `['s/boat_back:cloudboat','sh/balloon_back:balloon','sh/boat_s:cloudboat','u/seahorse_back:seahorse','uh/seahorse:seahorse','village/balloon:balloon']`，並在該測試的貼圖檢查改成 `[...SKY_TEXTURES, ...SEA_TEXTURES]`（`seahorse` 在 `SEA_TEXTURES`）。
  - `tests/lobby.test.ts` 的「四扇門」那個 `it`：`gate7` 改成 `stairs`（`to: { map: 'uh', ... }`），`gate8`～`gate10` 仍是帶 `lockText` 的 `barrier`；「物件不重疊、走得到」那個 `it` 維持（`walkMap` 對 `stairs` 算 `touched`）。
  - `tests/giver.test.ts`、`tests/granny.test.ts`：依它們的清單規則加入 `uh`。
  - 其他逐張地圖檢查的既有測試（`hub.test.ts`、`layout.test.ts`、`houses.test.ts`、`game.test.ts` 等）若因多了地圖而失敗，依該測試自己的規則修正，不放寬規則，並在 commit 說明；`sea` skin 的地圖要用 `isBlockedTile`／`tileKeyOf`。

執行 `npx vitest run tests/seamap.test.ts`，預期失敗。

- [ ] **Step 2：實作** 照上面的格局與物件資料寫入 `src/data/maps.ts`（`uhGrid`、`kelpIsle` 放在 `// ───────── ㄗㄘㄙ：星空島` 之後、迷宮那一節之前；`uh`／`u` 的 `tiles` 用 `.rows()`，並設 `skin: 'sea'`），修改大廳 `gate7`；`MapObj.vehicle` 型別；`World.ts` 的 `uEntered` 與 `seahorse` 乘坐文字；`giver.ts`。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/seamap.test.ts` 與整包全過。把 `uh`、`u` 兩張地圖輸出成文字（字元 + 物件標記）貼進報告，確認排版合理、沒有物件被擋在地形裡。
- [ ] **Step 4：commit**：「第七關：珊瑚港、海藻森林、大廳 gate7 通道與海馬」。

---

## Task 6：沉船（迷宮）、回家魔法陣

**Files:** `tools/gen-dungeon.mjs`（及 `tools/gen-dungeon.d.mts`，若型別宣告需要）、`src/data/mazes.ts`（**只能由產生器重新產生**）、`src/data/maps.ts`、`tests/seamap.test.ts`（續加）、`tests/mazegen.test.ts`、`tests/returncircle-cave.test.ts`（依其規則擴充）、`tests/skin.test.ts`（迷宮守門）。

**Interfaces:** Produces：`MAZES.uc1`／`MAZES.uc2`；`MAPS.uc1`／`MAPS.uc2`；`mazeObjects` 的 `sea` 主題；`CIRCLE_HOME.uc`；`u` 的 `cave`。

- [ ] **Step 1：寫測試（先看它失敗）** 在 `tests/seamap.test.ts` 加（`import { MAZES } from '../src/data/mazes'`、`CIRCLE`相關沿用既有測試的取法）：

```ts
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
```

並在 `tests/skin.test.ts` 的「迷宮守門」測試（地基加的那個，遍歷 `gc1…sc2` 的清單）把 `uc1`、`uc2` 加進去；`tests/mazegen.test.ts`／`tests/returncircle-cave.test.ts` 依各自的清單規則加入 `uc1`／`uc2`（種子 79／83、頭目旁魔法陣不封口等既有檢查都要涵蓋它們）。

執行 `npx vitest run tests/seamap.test.ts`，預期失敗。

- [ ] **Step 2：實作**
  1. `tools/gen-dungeon.mjs`：在設定表（約第 239～249 行）加
     ```js
       uc1: { seed: 79, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } },
       uc2: { seed: 83, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } },
     ```
     並把輸出的型別宣告（約第 255 行）的 id 聯集加上 `'uc1' | 'uc2'`。執行 `node tools/gen-dungeon.mjs` 重新產生 `src/data/mazes.ts`，用 `git diff src/data/mazes.ts` **確認只新增 `uc1`／`uc2` 與型別宣告**，既有八個迷宮一格都沒變。
  2. `src/data/maps.ts`：`MazeId` 加 `'uc1' | 'uc2'`；`CIRCLE_HOME` 加 `uc: { map: 'uh', x: 19, y: 4 }`；`mazeObjects` 的 `theme` 判斷擴充成 `mapId.startsWith('u') ? 'sea' : ...`（型別加 `'sea'`），`boss` 對照表加 `sea: 'boss_u'`，`barrier` 的 `lockText` 加 `theme === 'sea' ? ['一道厚厚的珊瑚牆擋住了路。', '好像有什麼機關可以打開它……']`，`switch` 加 `sea` 分支：
     ```ts
     theme === 'sea' ? {
       // 開關用 jet（ㄨ，練習戰的獎勵）；沉船入口 cave 要練習戰之後才出現，所以進得了沉船的人一定已經會 jet
       id: 'switch1', kind: 'gimmick', ...at, sprite: 'giant_clam', sprite2: 'giant_clam_open', ability: 'jet', fx: 'jet',
       lockText: ['一隻閉得緊緊的大貝殼，殼裡好像藏著機關。', '嘴巴嘟成小圓圈，「ㄨ」地用力吹出一道水柱，也許能把它沖開……'],
       hitText: ['夥伴嘴巴一嘟「ㄨ」，水柱把大貝殼沖開了！', '遠處傳來「轟隆」一聲，好像有一道珊瑚牆打開了！'],
       doneText: ['大貝殼已經打開了。'],
     } : ...
     ```
     新增 `const seaRows = (rows: string[]) => rows.map((r) => r.replace(/:/g, 'f').replace(/S/g, 'W'));` 與 `MAPS.uc1`／`MAPS.uc2`（比照 `sc1`／`sc2`：`name: '沉船 1F'`／`'沉船 2F'`、`tiles: seaRows(MAZES.uc1.rows)`、`theme: 'valley'`、`group: 'uc'`、`skin: 'sea'`、`start`／`respawn` `{ x: 2, y: 1 }`、`objects: mazeObjects('uc1', { map: 'u', x: 10, y: 4 }, { map: 'uc2', x: 2, y: 1 })`；`uc2` 的 `up` 用 `MAZES.uc1.downArrive!`，`down` 為 `undefined`）。
  3. `u` 加入 `cave`：`{ id: 'cave', kind: 'stairs', x: 10, y: 3, to: { map: 'uc1', x: 2, y: 1 }, label: '沉船', showIf: 'uPractice' }`。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/seamap.test.ts tests/mazegen.test.ts tests/returncircle-cave.test.ts tests/skin.test.ts` 與整包全過。把 `uc1`、`uc2` 輸出成文字貼進報告，確認牆、機關、頭目看起來合理。
- [ ] **Step 4：commit**：「第七關：沉船迷宮（uc1／uc2）、海底主題機關與回家魔法陣」。

---

## Task 7：端對端 `lv7` 與文件

**Files:** `tests/e2e/play.mjs`、`.github/workflows/e2e.yml`、`AGENTS.md`、`README.md`。

- [ ] **Step 1：端對端 `lv7` 段** 在 `tests/e2e/play.mjs` 比照 `lv6` 新增 `SECTION=lv7`：用存檔寫入第一階段全部進度（`endingSeen`、全部招式、旗標、夥伴等級補到 8，沿用既有 helper 與 `lv6` 起手式），從起始村走到 `world_map`、大廳、`gate7`、珊瑚港、騎海馬、海藻森林（海草人偶練習戰、燈籠水母 ㄧ、大貝殼 ㄨ）、沉船（含鎖門、裂石、二樓大貝殼開關）、大章魚護盾戰；斷言旗標 `uEntered`、`uPractice`、`boss_u`，能力 `glow`／`jet`／`pop`，並走到頭目寶箱。**不併入 `all`**。`e2e.yml` 的矩陣加 `lv7`。只做 `node --check tests/e2e/play.mjs`，**不要執行**。
- [ ] **Step 2：文件** `AGENTS.md`：「指令」的端對端分段加 `lv7`；「第二階段」那一條補第七關的實際資料（地圖 id、旗標、招式與嘴型、敵人、沉船種子 79／83、`SKINS.sea` 與地形字元、`seahorse` 交通工具、大廳 `gate7` 已通、`GIVER_HUBS` 加 `uh`、沒有小王、`pop` 的機關在頭目之後）。`README.md`：第二階段進度改為「地基完成、第七關海底完成」。
- [ ] **Step 3：驗證** `npx tsc --noEmit`、`npx vitest run` 全過；`node --check tests/e2e/play.mjs` 通過。
- [ ] **Step 4：commit**：「第七關：端對端 lv7 與文件」。

---

## 手動確認（給使用者）

1. 新美術：地形、燈籠水母、大貝殼、泡泡橋、海馬、泡泡門、四隻敵人。
2. 三個招式的動畫與嘴型說明（ㄩ 的魔法叫「吐泡魔法」）。
3. 大廳第一扇門通到珊瑚港、旅館台詞、各島民台詞的語氣。
4. 沉船迷宮好不好走、大章魚護盾戰的難度。
5. 新增語音句子（旅館、島民、告示牌、戰鬥故事）仍用瀏覽器語音念，要預錄請自己執行 `tools/gen-voice.ts`。
