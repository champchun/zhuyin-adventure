# 第三關：舌根音（ㄍㄎㄏ）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出第三關：主島「蛙鳴灣」（`gh`）、怪物島「回音森林」（`g`）與兩層「回音洞窟」（`gc1`、`gc2`）、ㄍㄎㄏ 三個新招式與機關、新敵人（青蛙、啄木鳥、蝙蝠、蝙蝠王嗡嗡）、頭目護盾與回音怪（階段 5a 已完成的規則）。

**Architecture:** 完全沿用上一關（舌尖中音島）的做法：資料驅動（`symbols.ts`、`monsters.ts`、`levels.ts`、`maps.ts`）、機關是 `gimmick` 物件、洞窟用 `fromAscii`、往來全靠碼頭（一個碼頭只通一個地方，物件的 `dockTo`）。新增的只有招式特效、敵人與物件的像素圖、地圖與劇情資料；階段 5a 的 `src/core/shield.ts` 已經在這個分支上。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest、Playwright（端對端）。

來源規格：`docs/superpowers/specs/2026-11-12-velar-level-design.md`。上一關的做法請直接看現有程式當範例：`MAPS.d`／`MAPS.dc1`／`MAPS.dc2`／`MAPS.dh`（`src/data/maps.ts`）、`BATTLES.dpractice`／`d1`～`d3`／`boss_d`／`dc1m`／`dc2m`（`src/data/levels.ts`）、`MOVES.drum` 等與 `playFx`（`src/scenes/Battle.ts`）、`gimmickFx`（`src/scenes/World.ts`）、`make('drum_big'…)`（`src/gfx/sprites.ts`）、`drumking()`（`src/gfx/monsterArt.ts`）。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- 第 0 關與舌尖中音島的玩法與資料**不動**，只有下面明列的連結：鼓聲港多一個通往蛙鳴灣的碼頭（打倒鼓王後才出現）、鼓王後的劇情文字改說「搭船去蛙鳴灣」。
- **不使用傳送點**：新地圖不放 `exit` 物件；往來都用 `dock`（`dockTo`）與 `stairs`、`door`。
- 每個碼頭的抵達位置必須**可以走**，且抵達位置旁邊要有「回程碼頭」，碼頭旁邊要有水（`tests/hub.test.ts` 已經對 `MAPS` 裡所有碼頭做這個檢查，新碼頭自動受檢）。
- 新地圖不新增地形字元，沿用現有字元（`'.'` 草、`','` 花、`'#'` 樹、`'~'` 水、`'a'` 沙、`'='` 路、`'h'`/`'H'`/`'D'` 房子與門、`'+'` 橋；洞窟 `fromAscii` 的 `#` 牆、`.` 地板）；地圖 `theme` 用 `'island'`（主島）、`'meadow'`（森林）、`'valley'`（洞窟）。
- 護盾與回音怪只用在本關：`boss_g.shield = true`、蝙蝠 `echo = true`；舊的戰鬥一律不用（`tests/shield.test.ts` 有測試，**本任務要把那個測試改成「只有第三關的戰鬥可以有」**，見 Task 2）。教學戰不可以有護盾，也不可以對上回音怪。
- ㄍㄎㄏ 的筆順資料還沒有：`src/data/strokes.ts` 不動（沒有資料時寫字施法會自動略過）。
- 任何 `say()` / modal 都會增減 `ui.blocking`，新增流程務必成對（`say` 的陣列不能是空的）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node` 跑腳本；測試用 `npx vitest run`。
- 端對端很慢，**不要在本機跑**；由控制端把分支 push 後交給 GitHub Actions。
- 只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差，不要寫成其他模型名稱）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 在分支 `stage5a-magic-rules`（階段 5a 的規則已經 commit 在上面），工作目錄乾淨。**不要再開新分支**，第三關直接疊在這個分支上，之後一起合併。

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/gfx/sprites.ts` | 修改 | 新物件圖：搖搖樹（有果子／沒果子）、樹洞（關／開）、冰塊 |
| `src/gfx/monsterArt.ts` | 修改 | 新敵人圖：青蛙、啄木鳥、蝙蝠、蝙蝠王 |
| `src/data/monsters.ts` | 修改 | 三個新招式、四種敵人（蝙蝠是回音怪）、夥伴招式清單、`MoveDef.fx` 型別 |
| `src/data/symbols.ts` | 修改 | `LEARN_STEPS` 加 ㄍㄎ、ㄏ |
| `src/data/levels.ts` | 修改 | `LEVELS.g`、本關戰鬥、劇情文字 |
| `src/data/maps.ts` | 修改 | `gh`、`gh_inn`、`gh_shop`、`g`、`gc1`、`gc2`；鼓聲港的新碼頭；`MapObj.fx` 型別 |
| `src/scenes/Battle.ts` | 修改 | 三個新招式的特效 |
| `src/scenes/World.ts` | 修改 | 機關特效、進森林設旗標 |
| `tests/velar.test.ts` | 新增 | 本關資料的測試 |
| `tests/shield.test.ts` | 修改 | 護盾與回音只准用在本關 |
| `tests/e2e/play.mjs` | 修改 | 走一遍第三關 |

---

### Task 1: 像素圖（物件與敵人）

**Files:**
- Modify: `src/gfx/sprites.ts`
- Modify: `src/gfx/monsterArt.ts`

**Interfaces:**
- Produces（後面的 Task 用這些貼圖 key）：
  - 物件圖（`make(key, 16, 16, …)`，在「舌尖中音島的機關」那一段後面加）：`tree_shake`（結滿果子的樹）、`tree_shake_bare`（果子掉光的樹）、`tree_hole`（有樹洞的樹，洞是暗的）、`tree_hole_open`（樹洞打開，露出裡面一點亮光）、`ice_block`（淡藍色冰塊，帶白色反光）。
  - 敵人圖（`MONSTER_ART` 的 key，32×32 內）：`en_froggy`（綠色青蛙，大眼睛）、`en_pecker`（啄木鳥，紅頭、尖嘴）、`en_bat`（紫色蝙蝠，翅膀張開）、`en_batking`（蝙蝠王嗡嗡：體型較大、戴小王冠、橘紅眼睛，用較深的紫色）。

先讀現有的 `make('drum_big'…)`、`make('plant_dry'…)`、`drumking()`、`crabby()`、`MONSTER_ART` 與 `monsterRows` 學會畫法（`px(c, 顏色, x, y, w, h)`、`Pix` 的 `r`／`chunk`／`t`／`outline`），畫風與色盤比照現有圖；輪廓色用現有的 `'#2b2140'`／`OUT`。每張圖要一眼認得出是什麼，不用精細。

- [ ] **Step 1: 看現有的圖樣測試**

Run: `grep -rn "monsterRows\|monsterSize\|MONSTER_ART" tests`
Expected：找到檢查「每一張都完整放得進 32×32、每隻 SPECIES 的貼圖都存在」的測試（在 `tests/game.test.ts` 或類似檔案）。用 Read 看它怎麼檢查，確認它會涵蓋你新增的 key；若它只檢查 `SPECIES`，**另外**在 `tests/velar.test.ts`（見 Task 2，可先建立檔案）加：新增的四個敵人 key 都在 `MONSTER_ART` 裡、`monsterSize(key)` 的寬高都 ≤ 32。

- [ ] **Step 2: 畫物件圖**

在 `src/gfx/sprites.ts` 加五張 16×16 的圖（上面的 key）。`make` 的第一個參數是貼圖 key，圖裡不要用透明以外的背景（背景是草地，圖要能放在草地上）。

- [ ] **Step 3: 畫敵人圖**

在 `src/gfx/monsterArt.ts` 為四個敵人各寫一個像 `drumking()` 的函式與色盤，並加進 `MONSTER_ART`。

- [ ] **Step 4: 測試與打包**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS（含圖樣的尺寸檢查）。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 5: Commit**

```bash
git add src/gfx tests
git commit -m "第三關的像素圖：搖搖樹、樹洞、冰塊，青蛙、啄木鳥、蝙蝠、蝙蝠王

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 招式、敵人、戰鬥、學習進度、關卡資料

**Files:**
- Modify: `src/data/monsters.ts`
- Modify: `src/data/symbols.ts`
- Modify: `src/data/levels.ts`
- Modify: `tests/shield.test.ts`
- Create: `tests/velar.test.ts`

**Interfaces:**
- Consumes: Task 1 的貼圖 key
- Produces：
  - `MOVES.croak`（ㄍ，`name: '呱呱震'`、`magicName: '呱呱魔法'`、`power: 5`、`fx: 'croak'`、`needAbility: 'croak'`、`symbol: 'ㄍ'`、desc：`'「ㄍ」從喉嚨深處「呱」地震一下，能搖落樹上的果子。'`）、`MOVES.knock`（ㄎ，`'啄木敲'`、`'啄木魔法'`、5、`'knock'`、`'knock'`、desc：`'「ㄎ」喉嚨輕輕一彈，像啄木鳥「喀喀」敲，能敲開樹洞。'`）、`MOVES.breath`（ㄏ，`'哈氣'`、`'哈氣魔法'`、6、`'breath'`、`'breath'`、desc：`'「ㄏ」張大嘴巴「哈～」呼出熱氣，能融化冰塊。'`）。`MoveDef.fx` 與 `MapObj.fx`（機關特效）的聯集型別要加上 `'croak' | 'knock' | 'breath'`。
  - 三隻夥伴（`SPECIES.bobo`／`momo`／`popo`）的 `moves` 清單都加上 `MOVES.croak, MOVES.knock, MOVES.breath`。
  - `ENEMIES`：`froggy`（青蛙，sprite `en_froggy`，hp 16、atk 3、scale 2.25）、`pecker`（啄木鳥，`en_pecker`，hp 18、atk 3、scale 2.25）、`bat`（蝙蝠，`en_bat`，hp 18、atk 3、scale 2.25、`echo: true`）、`batking`（蝙蝠王嗡嗡，`en_batking`，hp 22、atk 4、scale 2.75）。
  - `LEARN_STEPS`：`{ symbols: ['ㄍ', 'ㄎ'], flag: 'gEntered' }`、`{ symbols: ['ㄏ'], flag: 'gPractice' }`。
  - `LEVELS.g`：`{ id: 'g', symbol: 'ㄍㄎㄏ', name: '舌根音島（回音森林）', open: true, mapId: 'gh', partner: '夥伴' }`（取代原本關閉的那一行）。
  - 戰鬥（`BATTLES`）：`gpractice`、`g1`、`g2`、`g3`、`boss_g`、`gc1m`、`gc2m`（細節見下）。

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/velar.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { BATTLES, LEVELS } from '../src/data/levels';
import { ENEMIES, MOVES, SPECIES, moveFor } from '../src/data/monsters';
import { LEARN_STEPS } from '../src/data/symbols';
import { MONSTER_ART, monsterSize } from '../src/gfx/monsterArt';

describe('第三關（舌根音）的資料', () => {
  it('ㄍㄎ 進森林才開始教，ㄏ 要打完練習戰才出現', () => {
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄍ', 'ㄎ'], flag: 'gEntered' });
    expect(LEARN_STEPS).toContainEqual({ symbols: ['ㄏ'], flag: 'gPractice' });
  });
  it('關卡開放，入口是主島蛙鳴灣', () => {
    expect(LEVELS.g.open).toBe(true);
    expect(LEVELS.g.mapId).toBe('gh');
  });
  it('三個新招式各綁一個注音，三隻夥伴都學得會', () => {
    expect(MOVES.croak.symbol).toBe('ㄍ');
    expect(MOVES.knock.symbol).toBe('ㄎ');
    expect(MOVES.breath.symbol).toBe('ㄏ');
    for (const sp of Object.values(SPECIES)) {
      for (const [sym, ability] of [['ㄍ', 'croak'], ['ㄎ', 'knock'], ['ㄏ', 'breath']]) {
        expect(moveFor(sp.id, sym, (a) => a === ability).needAbility).toBe(ability);
      }
    }
  });
  it('敵人：蝙蝠是回音怪，其他不是；四種敵人的圖都在，而且放得進 32×32', () => {
    expect(ENEMIES.bat.echo).toBe(true);
    for (const id of ['froggy', 'pecker', 'batking']) expect(ENEMIES[id].echo).toBeFalsy();
    for (const id of ['froggy', 'pecker', 'bat', 'batking']) {
      const key = ENEMIES[id].sprite;
      expect(MONSTER_ART[key], `${key} 沒有圖`).toBeDefined();
      const s = monsterSize(key);
      expect(s.w).toBeLessThanOrEqual(32);
      expect(s.h).toBeLessThanOrEqual(32);
    }
  });
  it('練習戰教 ㄍㄎ（是教學戰、設旗標 gPractice、學會 croak 與 knock）', () => {
    const b = BATTLES.gpractice;
    expect(b.guided).toBe(true);
    expect(b.focus).toEqual(['ㄍ', 'ㄎ']);
    expect(b.reward!.flag).toBe('gPractice');
    expect(b.reward!.abilities).toEqual(['croak', 'knock']);
  });
  it('頭目蝙蝠王嗡嗡有護盾、是三個小回合、打贏學會 breath', () => {
    const b = BATTLES.boss_g;
    expect(b.enemy).toBe('batking');
    expect(b.shield).toBe(true);
    expect(b.phases).toBe(3);
    expect(b.reward!.flag).toBe('boss_g');
    expect(b.reward!.abilities).toEqual(['breath']);
  });
  it('本關的小怪考 ㄍㄎㄏ，並複習上一關的符號', () => {
    for (const id of ['g1', 'g2', 'g3', 'gc1m', 'gc2m']) {
      const b = BATTLES[id];
      expect(b, id).toBeDefined();
      expect(b.respawn, `${id} 野生怪要會重生`).toBe(true);
      expect(b.focus.every((s) => ['ㄍ', 'ㄎ', 'ㄏ'].includes(s)), `${id} 主題只能是 ㄍㄎㄏ`).toBe(true);
    }
    expect(BATTLES.g3.focus).toContain('ㄏ');
  });
});
```

並把 `tests/shield.test.ts` 裡這一段：

```ts
  it('鼓王咚咚以前的戰鬥（含鼓王）先不使用護盾與回音怪，從第三關才開始', () => {
    for (const b of Object.values(BATTLES)) {
      expect(b.shield, `${b.id} 不該有護盾`).toBeFalsy();
      expect(ENEMIES[b.enemy].echo, `${b.id} 的敵人不該是回音怪`).toBeFalsy();
    }
  });
```
改成
```ts
  it('只有第三關的戰鬥使用護盾與回音怪（鼓王咚咚以前的都不用）', () => {
    const velar = new Set(['boss_g', 'g1', 'g2', 'g3', 'gc1m', 'gc2m']);
    for (const b of Object.values(BATTLES)) {
      if (velar.has(b.id)) continue;
      expect(b.shield, `${b.id} 不該有護盾`).toBeFalsy();
      expect(ENEMIES[b.enemy].echo, `${b.id} 的敵人不該是回音怪`).toBeFalsy();
    }
  });
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/velar.test.ts`
Expected: FAIL（資料不存在）。

- [ ] **Step 3: 招式、敵人、學習進度**

照上面 Interfaces 修改 `src/data/monsters.ts`（`MoveDef.fx` 聯集、`MOVES`、三隻夥伴的 `moves`、`ENEMIES`）與 `src/data/symbols.ts`（`LEARN_STEPS`）。`MapObj.fx` 的型別在 `src/data/maps.ts` 的 `MapObj` 介面（`fx?: 'drum' | 'splash' | 'bubble' | 'stream';`）：改成也包含 `'croak' | 'knock' | 'breath'`（這是 Task 3 的檔案，這裡只改這一個型別，讓 Task 3 可以直接使用）。

- [ ] **Step 4: 關卡與戰鬥資料**

在 `src/data/levels.ts`：

1. 把 `LEVELS.g` 那一行改成上面的內容。
2. 在 `boss_d` 與「試煉洞窟」戰鬥之後，新增（照 `dpractice`／`d1`～`d3`／`boss_d`／`dc1m`／`dc2m` 的寫法，用同一個 `wild(id, enemyId, tier, focus, review, flagKey)` 輔助函式與同樣的欄位）：

   - `gpractice`：`enemy: 'dummy'`、`phases: 2`、`tier: 1`、`focus: ['ㄍ', 'ㄎ']`、`review: []`、`guided: true`；`intro: ['森林裡也有稻草布偶，先來練習！', '這一次要認的是「ㄍ」和「ㄎ」。聲音是從喉嚨深處發出來的！']`；`reward: { flag: 'gPractice', exp: 5, coins: 8, abilities: ['croak', 'knock'], items: { potion: 1 }, story: ['練習完成！', '「ㄍ」像青蛙「呱」地叫，夥伴學會了呱呱震！', '「ㄎ」像啄木鳥「喀喀」地敲，夥伴學會了啄木敲！', '森林裡還有「ㄏ」在等著你，往前走走看吧！'] }`（`reward` 的其他欄位照 `dpractice` 的寫法，不要少）。
   - `g1`：`wild('g1', 'froggy', 1, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ'], 'm:g:m1')`。
   - `g2`：`wild('g2', 'pecker', 2, ['ㄍ', 'ㄎ'], ['ㄋ', 'ㄌ'], 'm:g:m2')`，並加 `intro: ['啄木鳥擋住了路！', '牠會考「ㄍ」和「ㄎ」。']`（比照 `d2` 的展開寫法）。
   - `g3`：`wild('g3', 'froggy', 3, ['ㄏ', 'ㄍ'], ['ㄎ', 'ㄉ', 'ㄊ'], 'm:g:m3')`，並加 `intro: ['青蛙跳出來了！', '牠會考新的注音：「ㄏ」。']`。
   - `boss_g`：照 `boss_d` 的寫法：`enemy: 'batking'`、`penalty: true`、`shield: true`、`phases: 3`、`tier: 3`、`focus: ['ㄏ', 'ㄍ', 'ㄎ']`、`review: ['ㄋ', 'ㄌ', 'ㄉ', 'ㄊ']`；`intro: ['嗡嗡嗡～蝙蝠王嗡嗡把山谷的回音都吸走了！', '一共三個小回合，累了隨時都可以離開。']`；`reward: { flag: 'boss_g', exp: 20, coins: 80, abilities: ['breath'], items: { potion: 2, berry: 2 }, story: ['蝙蝠王嗡嗡飛走了，山谷的回音又回來了！', '「ㄏ」是張大嘴巴「哈～」，夥伴學會了哈氣！', '森林裡有結冰的地方，回頭用新招式試試看吧！'] }`（`reward` 其他欄位照 `boss_d`）。
   - `gc1m`：`wild('gc1m', 'froggy', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc1:m1')`。
   - `gc2m`：`wild('gc2m', 'bat', 3, ['ㄍ', 'ㄎ'], ['ㄉ', 'ㄊ', 'ㄋ', 'ㄌ'], 'm:gc2:m2')`。
   
   （`wild()` 產生的戰鬥已經帶 `respawn: true`；若沒有就補上。蝙蝠 `echo` 讓 `gc2m` 在聽得到音檔時普通攻擊只有 1 點，這是設計。）
3. 把 `STORY.guideEndD` 改成：`['鼓聲回來了，真是了不起！', '「ㄉㄊㄋㄌ」你都學會了。鼓聲港南邊的碼頭出現了，搭船就能去下一關：舌根音島！']`（舊文字是「那裡還在準備中」）。
4. 在 `STORY` 加 `guideEndG`：`['回音回來了，真是了不起！', '「ㄍㄎㄏ」你都學會了。更多的注音，等我研究好再告訴你！']`。並讓 `World.ts` 的博士收尾判斷（目前 `else if (flag('boss_d')) await say2(STORY.guideEndD);` 這一行的附近）在 `flag('boss_g')` 時優先說 `guideEndG`：用 Read 看那一段的 if／else 鏈，在 `boss_d` 的那一行**前面**加一條 `boss_g` 的分支（同一個寫法）。

- [ ] **Step 5: 執行測試、型別檢查**

Run: `npx vitest run`
Expected: 全部 PASS。若既有測試（例如「每個招式綁定的符號都有…」、「每一關的戰鬥都有…」）對新資料失敗，訊息會指出缺什麼：**補資料，不要改既有測試**（`tests/shield.test.ts` 那一段是計畫明列要改的）。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "第三關資料：ㄍㄎㄏ 的招式、敵人、戰鬥、學習進度與劇情

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 地圖（蛙鳴灣、回音森林、回音洞窟）

**Files:**
- Modify: `src/data/maps.ts`
- Modify: `tests/velar.test.ts`

**Interfaces:**
- Consumes: Task 1 的物件貼圖、Task 2 的戰鬥 id 與 `MapObj.fx` 型別
- Produces：`MAPS.gh`、`MAPS.gh_inn`、`MAPS.gh_shop`、`MAPS.g`、`MAPS.gc1`、`MAPS.gc2`；`dh` 新增物件 `dock_gh`。

先讀現有 `dhGrid`／`MAPS.dh`／`MAPS.dh_inn`／`MAPS.dh_shop`、`island`／`MAPS.d`、`DC1`／`DC2`／`MAPS.dc1`／`MAPS.dc2`，新地圖照同一個寫法；新地圖放在 `dh_shop` 之後、`export const TILE_KEY` 之前。

**碼頭連結（必須一字不差，`tests/hub.test.ts` 的碼頭檢查會驗）：**

| 地圖 | 碼頭物件 | 位置 | `dockTo` |
|---|---|---|---|
| `dh` | `dock_gh`（新增，`showIf: 'boss_d'`） | (14,18) | `{ map: 'gh', x: 14, y: 17 }` |
| `gh` | `dock_dh` | (14,18) | `{ map: 'dh', x: 14, y: 17 }` |
| `gh` | `dock_isle` | (3,10) | `{ map: 'g', x: 4, y: 17 }` |
| `g` | `dock` | (4,18) | `{ map: 'gh', x: 4, y: 10 }` |

鼓聲港的 `dock_gh`：(14,18) 現在是沙地、下面 (14,19) 是邊界的水（`border('~')`），所以旁邊有水。`dh` 的 `hub.dock`（搭船抵達鼓聲港時的落腳點，目前是東邊碼頭旁的 (22,10)）不變；從蛙鳴灣搭船過來是落在 `dockTo` 寫的 (14,17)。

**蛙鳴灣 `gh`（28×20，`theme: 'island'`，`hub: { dock: { x: 14, y: 17 } }`，`start: { x: 14, y: 17 }`、`respawn: { x: 7, y: 4 }`）：**

- 地形照 `dhGrid`：沙地加邊界水；**西邊**一個海灣 `rect('~', 0, 8, 3, 5)`（通往回音森林）；南邊的水是邊界；花、樹、旅館房子（門 (6,3)）、商店房子（門 (21,3)）、橫路 y=4、直路 x=14 都照 `dh`。**不要**東邊海灣。
- 物件：`dock_dh`、`dock_isle`（上表）、`door_inn` (6,3) → `{ map: 'gh_inn', x: 4, y: 6 }`、`door_shop` (21,3) → `{ map: 'gh_shop', x: 4, y: 6 }`；三位島民（照 `dh` 的 `drummer`／`fisher`／`sailor`，`kind: 'npc'`，`talk` 依進度，最後一句不設條件）：
  - 小青蛙迷 `'frog_fan'`（`sprite: 'npc_kid'`，(10,8)）：`{ not: 'gPractice', lines: ['歡迎來到蛙鳴灣！', '這座島的注音，都是從喉嚨深處發出來的：ㄍ ㄎ ㄏ。', '西邊的碼頭可以搭船去回音森林，島上有稻草布偶，先去練習看看吧！'] }`、`{ not: 'boss_g', lines: ['森林裡有會「呱呱」叫的樹，聽說用「ㄍ」的聲音就能搖落果子。', '洞窟裡的蝙蝠王很會躲，聽說只有「聽聲音」的魔法才打得到牠！'] }`、`{ lines: ['回音回來了！謝謝你！', '蝙蝠王嗡嗡飛走以後，山谷又熱鬧起來了。'] }`。
  - 老船長 `'captain'`（`sprite: 'npc_elder'`，(18,12)）：`{ lines: ['打倒怪獸會得到金幣，可以到商店買藥水。', '旅館住一晚 25 金幣。沒錢的話，搭船回起始村的家睡覺，是免費的喔！', '南邊的碼頭回鼓聲港，西邊的碼頭去回音森林。'] }`。
  - 小漁夫 `'angler'`（`sprite: 'npc_girl'`，(8,15)）：`{ lines: ['魔力用完的時候，蝙蝠王的護盾就打不破了。', '帶著魔力果，或回旅館睡一覺吧！'] }`。
- `gh_inn`：照 `dh_inn`（`tiles: shop.rows()`、`theme: 'village'`），老闆 `keeper`（`kind: 'innkeeper'`，`price: 25`，`label: '旅館老闆'`，(6,3)），門 `door` (4,7) → `{ map: 'gh', x: 6, y: 4 }`。
- `gh_shop`：照 `dh_shop`，店員 `clerk`（`kind: 'npc'`，`label: '店員小福'`，(6,3)），門 `door` (4,7) → `{ map: 'gh', x: 21, y: 4 }`。
- 蛙鳴灣上不放戰鬥。

**回音森林 `g`（28×20，`theme: 'meadow'`，`start: { x: 4, y: 17 }`、`respawn: { x: 4, y: 17 }`）：**

- 地形：`new Grid(28, 20, '.').border('~')`，再用 `many('#', [...])` 與 `many(',', [...])` 撒樹與花（比照 `island` 的做法）；用樹牆做出：一個只能從冰塊進去的小凹槽（放冰塊寶箱）、其餘區域彼此連通。
- 物件（座標是建議值；為了讓地圖通過驗證可以微調，但**物件之間的相對關係要保持**）：
  - `dock` (4,18) `dockTo: { map: 'gh', x: 4, y: 10 }`（回主島的西邊碼頭）。
  - `sign1` (6,16) 告示牌：`['回音森林。', '這座島的注音，都是舌根靠近喉嚨發出來的：ㄍ ㄎ ㄏ。', '島上有會搖的樹、樹洞和結冰的石頭，學會新招式，也許就能打開它們！']`。
  - `dummy` (7,14) `kind: 'monster'`、`battle: 'gpractice'`、`hideIf: 'gPractice'`。
  - `chest_1` (9,17) `item: 'potion'`。
  - `m1` (10,12) `battle: 'g1'`、`ai: 'patrol'`、`patrol: [(11,12),(12,12)]`；`m2` (16,8) `battle: 'g2'`、`ai: 'patrol'`、`patrol: [(17,8),(18,8)]`；`m3` (20,15) `battle: 'g3'`、`ai: 'patrol'`、`patrol: [(21,15),(22,15)]`（座標要在可走的草地上，巡邏路線每一格與前一格相鄰、不穿過其他物件）。
  - 搖搖樹 `tree` (6,9)：`kind: 'gimmick'`、`sprite: 'tree_shake'`、`sprite2: 'tree_shake_bare'`、`ability: 'croak'`、`fx: 'croak'`、`lockText: ['一棵結滿果子的樹，好像搖一搖就會掉下來。', '用「ㄍ」的聲音震一震，也許會有回音……']`、`hitText: ['夥伴喉嚨一震「ㄍ」，樹被搖得嘩啦啦響！', '果子掉下來了，樹下面出現了一個寶箱！']`、`doneText: ['樹上的果子都掉光了。']`；加 `chest_tree` (6,8) `showIf: 'g:g:tree'`、`item: 'berry'`。
  - 樹洞 `hole` (12,5)：`kind: 'gimmick'`、`sprite: 'tree_hole'`、`sprite2: 'tree_hole_open'`、`ability: 'knock'`、`fx: 'knock'`、`lockText: ['一棵有樹洞的老樹，洞口緊緊關著。', '用啄木鳥「ㄎ」的敲擊，也許能打開它……']`、`hitText: ['夥伴「ㄎ」地輕輕一敲，樹洞「喀」地打開了！', '樹洞裡藏著一個寶箱！']`、`doneText: ['樹洞開著，裡面空空的。']`；加 `chest_hole` (12,4) `showIf: 'g:g:hole'`、`item: 'potion'`。
  - 冰塊 `ice` (22,9)：`kind: 'gimmick'`、`sprite: 'ice_block'`、`ability: 'breath'`、`fx: 'breath'`、`vanish: true`、`lockText: ['一大塊冰，擋住了小路。', '用「ㄏ」呼出的熱氣，也許能把它融化……']`、`hitText: ['夥伴張大嘴巴「ㄏ～」，冰塊慢慢融化了！']`；寶箱 `chest_ice` 在冰塊後面的凹槽（只能從冰塊的位置走進去，例如冰在 (22,9)、寶箱在 (22,8)）`showIf` 不需要（冰融化後就走得到），`item: 'bigpotion'`。
  - 洞窟入口 `cave` (24,4) `kind: 'stairs'`、`to: { map: 'gc1', x: 2, y: 1 }`、`label: '洞窟'`、`showIf: 'gPractice'`；以及 `chest_boss` 不放在森林（頭目寶箱在洞窟 2 樓）。
- 冰塊的前提：用 `reachReport`（`src/core/dungeon.ts`）驗證時，沒有 `breath` 招式 `chest_ice` 到不了，有 `breath` 就到得了（見下面的測試）。

**回音洞窟（兩層，`group: 'gc'`，`theme: 'valley'`，每層 21×9，用 `fromAscii`，照 `DC1`／`DC2`）：**

`gc1`（`start: { x: 2, y: 1 }`、`respawn` 同）：

```
'#####################',
'#<....##.....##.....#',
'#...................#',
'#.....##.....##.....#',
'###R######.######D###',
'#.....##.....##.....#',
'#.....##.....##.....#',
'#..C..##..K..##..>..#',
'#####################',
```
圖例：`'<'`＝`{ id: 'up', kind: 'stairs', to: { map: 'g', x: 24, y: 5 }, label: '出口' }`、`'>'`＝`{ id: 'down', kind: 'stairs', to: { map: 'gc2', x: 2, y: 1 }, label: '往下' }`、`R`＝`{ id: 'rock_f', kind: 'rock' }`、`C`＝`{ id: 'chest_f', kind: 'chest', item: 'berry' }`、`K`＝`{ id: 'chest_key', kind: 'chest', item: 'key' }`、`D`＝`{ id: 'door', kind: 'lockdoor', lockText: ['門被鎖住了。', '要先找到小鑰匙。'] }`；另加怪物 `{ id: 'm1', kind: 'monster', x: 9, y: 1, battle: 'gc1m', ai: 'patrol', patrol: [{ x: 10, y: 1 }, { x: 11, y: 1 }] }`。

`gc2`（`start: { x: 2, y: 1 }`、`respawn` 同）：

```
'#####################',
'#<....##.....##.....#',
'#...................#',
'#.....##...H.##..W..#',
'##########B##########',
'########.....########',
'########..X..########',
'########..C..########',
'#####################',
```
圖例：`'<'`＝`{ id: 'up', kind: 'stairs', to: { map: 'gc1', x: 17, y: 6 }, label: '回 1 樓' }`、`H`＝`{ id: 'm2', kind: 'monster', battle: 'gc2m', ai: 'chase' }`、`W`＝樹洞機關 `{ id: 'switch1', kind: 'gimmick', sprite: 'tree_hole', sprite2: 'tree_hole_open', ability: 'knock', fx: 'knock', lockText: ['一個樹洞，洞口緊緊關著。', '用啄木鳥「ㄎ」的敲擊，也許會有回音……'], hitText: ['夥伴「ㄎ」地輕輕一敲，樹洞「喀」地打開了！', '遠處傳來「轟隆」一聲，好像有一道牆打開了！'], doneText: ['樹洞開著，裡面空空的。'] }`、`B`＝`{ id: 'barrier1', kind: 'barrier', hideIf: 'g:gc2:switch1', lockText: ['一道石牆擋住了路。', '好像有什麼機關可以打開它……'] }`、`X`＝頭目 `{ id: 'boss', kind: 'monster', battle: 'boss_g', hideIf: 'boss_g' }`、`C`＝`{ id: 'chest_boss', kind: 'chest', item: 'bigpotion', showIf: 'boss_g' }`。

- [ ] **Step 1: 寫會失敗的測試**

在 `tests/velar.test.ts` 最上面的 import 區補：

```ts
import { BLOCKED_TILES, MAPS } from '../src/data/maps';
import { reachReport } from '../src/core/dungeon';
```

檔尾加（`reachReport` 的參數形狀請先看 `tests/dungeon.test.ts` 裡 `describe('示範洞窟…')`／`reachReport([...], at(...), [...])` 的用法，**照那裡對 `dc1`／`dc2` 的呼叫方式**對 `gc1`／`gc2` 做同樣的檢查，下面是需要的斷言內容）：

```ts
describe('第三關的地圖', () => {
  const gh = MAPS.gh, g = MAPS.g, gc1 = MAPS.gc1, gc2 = MAPS.gc2;
  it('蛙鳴灣是主島：被打倒送回自己的 respawn；沒有 exit 物件；兩個碼頭各通一個地方', () => {
    expect(gh.hub).toBeDefined();
    expect(gh.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(g.objects.some((o) => o.kind === 'exit')).toBe(false);
    expect(gh.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map).sort()).toEqual(['dh', 'g']);
    expect(g.objects.filter((o) => o.kind === 'dock').map((o) => o.dockTo!.map)).toEqual(['gh']);
  });
  it('鼓聲港的南邊碼頭要打倒鼓王才出現，通往蛙鳴灣', () => {
    const d = MAPS.dh.objects.find((o) => o.id === 'dock_gh')!;
    expect(d.showIf).toBe('boss_d');
    expect(d.dockTo!.map).toBe('gh');
  });
  it('旅館收 25 金幣；商店有店員 clerk；門互相對得上', () => {
    expect(MAPS.gh_inn.objects.find((o) => o.kind === 'innkeeper')!.price).toBe(25);
    expect(MAPS.gh_shop.objects.find((o) => o.id === 'clerk')!.kind).toBe('npc');
    const di = gh.objects.find((o) => o.id === 'door_inn')!, ds = gh.objects.find((o) => o.id === 'door_shop')!;
    expect(MAPS.gh_inn.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'gh', x: di.x, y: di.y + 1 });
    expect(MAPS.gh_shop.objects.find((o) => o.id === 'door')!.to).toEqual({ map: 'gh', x: ds.x, y: ds.y + 1 });
  });
  it('至少三位島民，每位的對話最後一句不設條件', () => {
    const npcs = gh.objects.filter((o) => o.kind === 'npc' && o.talk);
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const n of npcs) {
      const last = n.talk![n.talk!.length - 1];
      expect(last.if === undefined && last.not === undefined, `${n.id} 最後一句不能有條件`).toBe(true);
    }
  });
  it('森林：三個機關各有寶箱、洞窟入口練習完才出現、三隻小怪的戰鬥存在', () => {
    for (const id of ['tree', 'hole', 'ice']) expect(g.objects.find((o) => o.id === id)!.kind).toBe('gimmick');
    expect(g.objects.find((o) => o.id === 'cave')!.showIf).toBe('gPractice');
    expect(g.objects.find((o) => o.id === 'cave')!.to).toEqual({ map: 'gc1', x: 2, y: 1 });
    for (const m of g.objects.filter((o) => o.kind === 'monster' && o.id !== 'dummy')) expect(BATTLES_HAS(m.battle!)).toBe(true);
  });
  it('洞窟：兩層同一個 group、樓梯互相對得上、出口回森林', () => {
    expect(gc1.group).toBe('gc');
    expect(gc2.group).toBe('gc');
    expect(gc1.objects.find((o) => o.id === 'down')!.to!.map).toBe('gc2');
    expect(gc2.objects.find((o) => o.id === 'up')!.to!.map).toBe('gc1');
    expect(gc1.objects.find((o) => o.id === 'up')!.to!.map).toBe('g');
  });
  it('每張新地圖：起點、所有物件旁邊的格子都走得到；物件不放在被阻擋的地形上（門與樓梯除外由既有測試檢查）', () => {
    for (const m of [gh, g, gc1, gc2]) expect(BLOCKED_TILES.has(m.tiles[m.start.y][m.start.x]), `${m.id} 起點不能走`).toBe(false);
  });
});
```
（上面的 `BATTLES_HAS(id)` 請換成 `Boolean(BATTLES[id])`，並在 import 區補 `BATTLES`——`BATTLES` 已經在檔案開頭從 `../src/data/levels` import 了，直接用。）另外，**對洞窟**加上 `reachReport` 的檢查，形狀照 `tests/dungeon.test.ts` 對 `dc1`／`dc2` 的那一組（起點、已學招式 `['blast','gust','croak','knock']`、期望沒有 `unreachable*`、鑰匙夠用等）：`gc1`、`gc2` 都必須是綠的。

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/velar.test.ts`
Expected: FAIL（`MAPS.gh` 不存在）。

- [ ] **Step 3: 寫地圖資料**

照上面的規格在 `src/data/maps.ts` 寫 `gh`、`gh_inn`、`gh_shop`、`g`、`gc1`、`gc2`，並在 `MAPS.dh.objects` 加 `dock_gh`（`{ id: 'dock_gh', kind: 'dock', x: 14, y: 18, showIf: 'boss_d', dockTo: { map: 'gh', x: 14, y: 17 } }`，放在 `dock_isle` 那一行的後面，註解 `// 南邊：去蛙鳴灣（打倒鼓王後）`）。另外：`MAPS.dh` 的 `drummer` 的最後一組對話（鼓王打倒後那一句，現在是「鼓聲回來了！謝謝你！」、「南邊還有一座更遠的怪物島，現在迷霧還很濃……」）第二行改成 `'南邊的碼頭現在可以搭船了，去下一座島看看吧！'`（資料檢查「最後一句不設條件」要保持）。

- [ ] **Step 4: 執行測試**

Run: `npx vitest run`
Expected: 全部 PASS（含 `tests/hub.test.ts` 對所有碼頭的檢查、`tests/dungeon.test.ts`、`tests/game.test.ts` 的地圖檢查）。若失敗訊息指出新地圖的座標有問題（物件在樹上、走不到、碼頭旁沒有水…），**只調整新地圖的座標**。不要改既有測試。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 5: Commit**

```bash
git add src/data/maps.ts tests/velar.test.ts
git commit -m "第三關地圖：蛙鳴灣（旅館、商店、兩個碼頭）、回音森林、兩層回音洞窟

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 招式特效、機關特效、進森林設旗標

**Files:**
- Modify: `src/scenes/Battle.ts`
- Modify: `src/scenes/World.ts`

**Interfaces:**
- Consumes: Task 2 的 `MoveDef.fx`（`'croak' | 'knock' | 'breath'`）、`MapObj.fx` 聯集
- 這個 Task 動場景，無法單元測試；驗證靠型別檢查、既有測試、打包與 Task 5 的端對端。

- [ ] **Step 1: 戰鬥特效（`Battle.ts` 的 `playFx`）**

在 `playFx` 的 `switch (move.fx)` 裡，照 `'drum'`／`'splash'` 的寫法新增三個 case（用現有的 `audio.sfx(...)` 名稱，不要新增音效：`'croak'` 用 `'drum'`、`'knock'` 用 `'hint'`、`'breath'` 用 `'wind'`；用現有的 `this.add.circle`／`this.burst`／`this.tweens`）：

```ts
      case 'croak': {
        audio.sfx('drum');
        for (let i = 0; i < 3; i++) {
          const ring = this.add.circle(to.x, to.y, 6, 0xffffff, 0).setStrokeStyle(4, 0x5ccf5c).setDepth(40);
          this.tweens.add({ targets: ring, radius: 40, alpha: 0, duration: 420, delay: i * 120, onComplete: () => ring.destroy() });
        }
        this.burst(to.x, to.y, 'spark', 6, 34, 450);
        break;
      }
      case 'knock': {
        audio.sfx('hint');
        for (let i = 0; i < 3; i++) {
          const b = this.add.circle(from.x + 20, from.y, 4, 0xb9824f, 0.9).setDepth(40);
          this.tweens.add({ targets: b, x: to.x, y: to.y + (i - 1) * 8, duration: 300, delay: i * 120, onComplete: () => b.destroy() });
        }
        await sleep(520);
        this.burst(to.x, to.y, 'spark', 6, 28, 400);
        break;
      }
      case 'breath': {
        audio.sfx('wind');
        for (let i = 0; i < 6; i++) {
          const l = this.add.image(from.x, from.y - 14 + i * 6, 'windline').setDepth(40).setTint(0xffb36b).setAlpha(0.9);
          this.tweens.add({ targets: l, x: to.x, duration: 380, delay: i * 50, onComplete: () => l.destroy() });
        }
        await sleep(520);
        this.burst(to.x, to.y, 'puff', 6, 24, 400);
        break;
      }
```
先用 Read 確認 `to`、`from`、`sleep`、`this.burst` 在 `playFx` 裡確實是這些名字，與現有 case 的用法一致；不同就照現有 case 調整。

- [ ] **Step 2: 機關特效（`World.ts` 的 `gimmickFx`）**

在 `gimmickFx(fx: 'drum' | 'splash' | 'bubble' | 'stream', x, y)` 的簽名加上 `'croak' | 'knock' | 'breath'`，並在函式裡照現有 `'drum'`／`'splash'` 分支的寫法新增三個分支：`'croak'`（綠色擴散的圈圈＋`audio.sfx('drum')`，可以順便讓樹輕輕搖：`this.cameras.main.shake(150, 0.003)`，`reduceMotion` 時不搖）、`'knock'`（短促的兩次小圈圈＋`audio.sfx('hint')`）、`'breath'`（暖色的霧氣往上飄＋`audio.sfx('wind')`）。先用 Read 看現有分支怎麼用 `this.add`／`this.tweens`／`extra` 清理，照樣寫，不要新增資源。呼叫 `gimmickFx` 的地方（`useGimmick`）如果有用 `d.fx` 的型別斷言，也要放寬到新的聯集。

- [ ] **Step 3: 進森林設旗標**

在 `World.ts` 第 117 行附近：

```ts
    if (m.id === 'd' && !flag('dEntered')) setFlag('dEntered'); // 進到舌尖中音島：開始教 ㄉㄊ
```
在它**後面**加：

```ts
    if (m.id === 'g' && !flag('gEntered')) setFlag('gEntered'); // 進到回音森林：開始教 ㄍㄎ
```

- [ ] **Step 4: 測試、型別檢查、打包**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npm run build`
Expected: `✓ built in ...`。

- [ ] **Step 5: Commit**

```bash
git add src/scenes
git commit -m "ㄍㄎㄏ 的招式與機關特效；進回音森林開始教 ㄍㄎ

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 端對端：走一遍第三關

**Files:**
- Modify: `tests/e2e/play.mjs`

端對端**不在本機跑**，只做 `node --check`。機器人預設把怪物移動與寫字挑戰關掉；金幣、旗標可以用 `window.__game.G.save` 直接設定。

- [ ] **Step 1: 看懂上一關的端對端**

用 Read 看 `tests/e2e/play.mjs` 從「舌尖中音島」那一段（搜尋 `// ───── 舌尖中音島`）到「回家睡覺」之前：怎麼用 `doTap` 走到目標格、怎麼等戰鬥（`pump`）、怎麼檢查旗標與能力、怎麼走洞窟兩層與鑰匙、怎麼用 `ev` 直接改存檔。新的一段要用**同一套寫法**。

- [ ] **Step 2: 寫新的一段**

在上一關那一段的最後（目前是 `await doTap(23, 10, '主島東邊的碼頭（回起始村）');` 與 `if ((await save()).mapId !== 'village')…` 這兩行）**之前**，也就是人還在鼓聲港（`dh`）、鼓王已經打倒（`boss_d` 旗標已設）的時候，插入第三關（座標用 Task 3 的 `MAPS.gh`／`MAPS.g`／`MAPS.gc1`／`MAPS.gc2` 資料，實際讀 `src/data/maps.ts` 取得）：

1. 點鼓聲港南邊的碼頭 `dock_gh` (14,18)，檢查 `mapId === 'gh'`、`flags['visited:gh']` 為真，`snap('hub-g')`。
2. 旅館：照上一關的旅館流程（金幣不夠不能住不扣錢；夠了住一晚回滿並扣 25）；用 `gh_inn`。
3. 點西邊碼頭 `dock_isle` (3,10)，檢查 `mapId === 'g'`、`flags.gEntered` 為真。
4. 走到稻草布偶（`dummy`），打完練習戰（用 `pump`），檢查 `flags.gPractice` 與 `abilities` 含 `croak`、`knock`。
5. 三個機關：點搖搖樹 `tree` → 檢查 `flags['g:g:tree']`，點出現的 `chest_tree` → 檢查 `flags['c:g:chest_tree']`；樹洞同理（`hole`／`chest_hole`）。**冰塊先不處理**（還沒學 `breath`）。
6. 點洞窟入口 `cave`，檢查 `mapId === 'gc1'`；走完一樓：打裂石、拿鑰匙、開鎖門、下樓梯（照 `dc1` 的寫法，座標用 `gc1` 的 ASCII 圖：`R` 裂石、`K` 鑰匙寶箱、`D` 鎖門、`>` 往下）；二樓：樹洞開關開石牆（`switch1`／`barrier1`）、打頭目 `boss`。頭目有護盾：`pump` 已經會在被護盾擋住後改用魔法攻擊（階段 5a 的 `shieldUp`）；檢查 `flags.boss_g` 與 `abilities` 含 `breath`。若機器人的魔力不夠破盾，可以在進頭目戰前用 `ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; })` 補滿魔力（機器人的目的是走完流程，不是考驗魔力管理）。
7. 走出洞窟回森林，點冰塊 `ice` → 檢查 `flags['g:g:ice']`，點 `chest_ice` → 檢查 `flags['c:g:chest_ice']`。
8. 點森林的碼頭 `dock` (4,18) 回蛙鳴灣（`mapId === 'gh'`），再點蛙鳴灣南邊碼頭 `dock_dh` 回鼓聲港（`mapId === 'dh'`）。**接著接上原本的下一行**：點鼓聲港東邊碼頭回起始村。
9. 每一個檢查都要像上一關那樣用 `throw new Error('…中文說明…' + JSON.stringify(...))`，並在重要節點 `log('✓ …')`、`snap('…')`。

- [ ] **Step 3: 語法檢查**

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

先用 Read／Grep 確認你插入的錨點（原本那兩行）剛好出現一次；你用到的輔助函式（`doTap`、`save`、`flags`、`ev`、`snap`、`log`、`pump`）都存在且簽名相容；變數名稱（例如 `f`、`s`、`inn`）不要和檔案裡既有的 `let`／`const` 重複宣告。

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/play.mjs
git commit -m "端對端：走一遍第三關（蛙鳴灣、回音森林、三個機關、回音洞窟、蝙蝠王的護盾）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 搭船到蛙鳴灣**

Run: `npm run dev`；打倒鼓王後回鼓聲港。Expected：南邊多一個碼頭，點它搭船到蛙鳴灣；蛙鳴灣有旅館、商店、三位島民，西邊有碼頭、南邊有回鼓聲港的碼頭。

- [ ] **Step 2: 森林與三個機關**

搭西邊碼頭到回音森林。Expected：一進森林有教 ㄍㄎ 的稻草布偶；練完後學會呱呱震與啄木敲；搖搖樹用 ㄍ 搖落果子並出現寶箱、樹洞用 ㄎ 打開並出現寶箱、冰塊先擋著路。

- [ ] **Step 3: 回音洞窟與蝙蝠王**

練習完後出現洞窟入口。Expected：一樓有鑰匙與鎖門、裂石；二樓蝙蝠會追人；打開樹洞機關後石牆打開，裡面是蝙蝠王嗡嗡。開戰會提示有護盾：普通攻擊被彈開，用魔法攻擊（聽聲音）答對才打破；打贏學會哈氣。

- [ ] **Step 4: 魔力用完會輸**

魔力用光後再打蝙蝠王。Expected：護盾照樣擋住普通攻擊，要吃魔力果或換夥伴；撐不住會輸並回到蛙鳴灣。

- [ ] **Step 5: 冰塊與回家**

回森林用哈氣融化冰塊，拿到寶箱。搭船回蛙鳴灣、再回鼓聲港、起始村。

- [ ] **Step 6: 舊內容沒壞**

起始村、鼓聲港與舌尖中音島的玩法都跟以前一樣（鼓王沒有護盾）。

---

## Self-Review（對照規格）

- **主島蛙鳴灣（島民、旅館、商店、兩個碼頭、暗示）**：Task 3。
- **怪物島回音森林（稻草布偶、小怪、三個機關、寶箱、洞窟入口）**：Task 3；機關特效 Task 4。
- **兩層回音洞窟（樓梯、鑰匙與鎖門、機關與石牆、隱藏房間、頭目）**：Task 3；驗證 `reachReport`（Task 3 測試）。
- **頭目護盾與回音怪（蝙蝠、蝙蝠王）**：Task 2（資料）＋階段 5a 的規則；`tests/shield.test.ts` 的限制由 Task 2 改成只准第三關使用。
- **ㄍㄎㄏ 的招式與學習順序**：Task 2（`LEARN_STEPS`、`MOVES`、練習戰與頭目的 reward）、Task 4（進森林設 `gEntered`）。
- **新敵人與圖樣**：Task 1（圖）、Task 2（敵人資料）。
- **鼓聲港的新碼頭（鼓王後出現）與劇情文字**：Task 3、Task 2（`STORY.guideEndD`）。
- **往來全靠碼頭、沒有傳送點**：Task 3（碼頭表）、測試檢查沒有 `exit`。
- **端對端**：Task 5。
- **未涵蓋（規格列為不在範圍）**：怪物島 B、ㄍㄎㄏ 的寫字筆順、第四關以後、新商品（商店沿用現有貨品，規格原提「上架」，這一階段不新增貨品）。

型別一致性：貼圖 key（`tree_shake`、`tree_shake_bare`、`tree_hole`、`tree_hole_open`、`ice_block`、`en_froggy`、`en_pecker`、`en_bat`、`en_batking`）在 Task 1 定義，Task 2（`ENEMIES`）、Task 3（物件）使用；能力名稱 `croak`／`knock`／`breath` 與戰鬥 id（`gpractice`、`g1`～`g3`、`boss_g`、`gc1m`、`gc2m`）在 Task 2 定義，Task 3、Task 5 使用；旗標 `gEntered`、`gPractice`、`boss_g`、`g:g:tree`／`g:g:hole`／`g:g:ice`、`g:gc2:switch1` 在 Task 2、3、4 一致；地圖與碼頭 id（`gh`、`g`、`gc1`、`gc2`、`dock_gh`、`dock_dh`、`dock_isle`、`dock`）在 Task 3 的碼頭表定義，Task 5 使用。
