# 第二階段地基 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-17-stage2-overview-design.md`（必讀）。步驟用 `- [ ]` 追蹤。

**Goal:** 做好第二階段四個關卡共用的地基：地形外觀表（skin）、16 個韻母的符號與教學進度、設定升級、世界地圖大廳（含起始村入口與結局伏筆）。本計畫只做地基，四個關卡各自另寫計畫。

**Architecture:** 資料與純函式為主。skin 是「地形字元 → 貼圖／是否擋路」的查詢表，前六關指定預設 skin，行為以指紋測試鎖住。符號分成 `CONSONANTS`（21）與 `VOWELS`（16），`ALL_SYMBOLS` 變成 37 個，所以最終頭目 `boss_s` 的出題範圍要明確固定為聲母。大廳 `lobby` 是一張新地圖，起始村在 `endingSeen` 後多一個入口。

**Tech Stack:** TypeScript、Vite、Phaser 3、Vitest。

## Global Constraints

- 繁體中文；commit 結尾加 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不得改變前六關任何地圖的地形、物件、行為；`dc1`／`dc2` 完全不動；`src/data/mazes.ts` 內容不能變（不重新產生）。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2／3 要降級成看符號配對。
- 不要碰 Azure 金鑰；新增的語音句子不在本計畫內預先產生（`tools/gen-voice.ts` 由使用者自己執行）。
- **韻母筆順不在本計畫**：標準筆順要照使用者提供的教育部步驟圖量座標，圖還沒到，不憑印象估。沒有筆順資料的符號，`openWriteSymbol` 直接視為通過（寫字施法會略過），所以地基單獨上線不會卡住；各關的計畫在拿到圖之後補進 `src/data/strokes.ts`。
- 每個 Task 完成前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。
- 現有匯出 `BLOCKED_TILES`、`TILE_KEY` 繼續保留（就是預設 skin），既有測試要能照舊通過。

## 已決定的名稱（逐字照用）

- 第二階段符號教學旗標（`LEARN_STEPS`）：

| 關 | 主題 | 進入島嶼旗標 → 先教 | 練習戰旗標 → 再教 |
|---|---|---|---|
| 第七關 | 海底 | `uEntered` → ㄧ ㄨ | `uPractice` → ㄩ |
| 第八關 | 遊樂園 | `aEntered` → ㄚ ㄛ | `aPractice` → ㄜ ㄝ |
| 第九關 | 古堡 | `cEntered` → ㄞ ㄟ | `cPractice` → ㄠ ㄡ |
| 第十關 | 時鐘塔 | `tEntered` → ㄢ ㄣ | `tPractice` → ㄤ ㄥ ㄦ |

- 大廳地圖 id：`lobby`（名稱「世界地圖」）。起始村入口物件 id：`world_map`，旗標 `endingSeen` 之後才出現。
- 韻母例字（`word`）：ㄧ 衣、ㄨ 屋、ㄩ 魚、ㄚ 啊、ㄛ 喔、ㄜ 鵝、ㄝ 耶、ㄞ 愛、ㄟ 欸、ㄠ 凹、ㄡ 歐、ㄢ 安、ㄣ 恩、ㄤ 昂、ㄥ 鞥、ㄦ 兒（取自 `ZHUYIN_TEST`）；`tip` 一律是 `「<字>」這個字的聲音`（韻母本身就是一個音，不能用「第一個音」）。**提示語是草稿，請使用者潤飾**（欸、鞥比較少見，TTS 念起來可能不穩）。

---

## Task 1：地形外觀表（skin）

**Files:** `src/data/maps.ts`、`src/scenes/World.ts`、`src/core/dungeon.ts`、`tests/helpers/flood.ts`、`tests/skin.test.ts`（新）。

**Interfaces:**
- Produces（`src/data/maps.ts` 匯出）：`interface Skin { key: Record<string, string>; blocked: ReadonlySet<string> }`、`const DEFAULT_SKIN = 'default'`、`const SKINS: Record<string, Skin>`、`skinOf(m: { skin?: string }): Skin`、`tileKeyOf(m: { skin?: string }, ch: string): string`、`isBlockedTile(m: { skin?: string }, ch: string): boolean`、`MapDef.skin?: string`。
- 後面每個關卡的計畫都用 `SKINS.<id> = {...}` 註冊自己的外觀表，並在地圖設 `skin: '<id>'`。

- [ ] **Step 1：確認指紋基準（還沒改任何程式）**

下面測試裡的 `LEGACY_IDS`（改版前的 37 張地圖）與 `GOLDEN` 已經用改版前的程式算好（以 `TILE_KEY[c] ?? 't_grass'` 加上 `BLOCKED_TILES.has(c)` 為每個格子算出貼圖與擋路，再對 37 張地圖整體取 sha1）。動手前先在乾淨的 main 上確認 `Object.keys(MAPS).sort()` 加上本計畫之前的 commit 仍是這 37 張；若地圖清單不同（有人在這之前加過地圖），用下面暫時檔重算，再**刪掉暫時檔**：

```ts
import { createHash } from 'node:crypto';
import { it } from 'vitest';
import { BLOCKED_TILES, MAPS, TILE_KEY } from '../src/data/maps';

it('print', () => {
  const ids = Object.keys(MAPS).sort();
  const h = createHash('sha1');
  for (const id of ids) {
    h.update(id + ':' + MAPS[id].tiles.map((r) => [...r].map((c) => `${TILE_KEY[c] ?? 't_grass'}${BLOCKED_TILES.has(c) ? '!' : ''}`).join(',')).join('|') + ';');
  }
  console.log('GOLDEN', JSON.stringify(ids), h.digest('hex'));
});
```

- [ ] **Step 2：寫測試（先看它失敗）** `tests/skin.test.ts`：

```ts
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
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
});
```

執行 `npx vitest run tests/skin.test.ts`，預期失敗（`DEFAULT_SKIN` 等還不存在）。

- [ ] **Step 3：實作** `src/data/maps.ts`

在 `MapDef` 加欄位（`group?: string;` 之後）：

```ts
  /** 地形外觀表 id（SKINS 的 key）：決定地形字元用哪個貼圖、能不能走。沒設就是 default（前六關的 TILE_KEY／BLOCKED_TILES） */
  skin?: string;
```

在檔案最後（`TILE_KEY` 之後）加：

```ts
// ───────── 地形外觀表（skin）─────────
// 英文字母已被前六關用完，第二階段各主題用自己的 skin：同一個字元在不同 skin 可以是不同的東西。
export interface Skin { key: Record<string, string>; blocked: ReadonlySet<string> }
export const DEFAULT_SKIN = 'default';
export const SKINS: Record<string, Skin> = { [DEFAULT_SKIN]: { key: TILE_KEY, blocked: BLOCKED_TILES } };
export const skinOf = (m: { skin?: string }): Skin => SKINS[m.skin ?? DEFAULT_SKIN] ?? SKINS[DEFAULT_SKIN];
export const tileKeyOf = (m: { skin?: string }, ch: string): string => skinOf(m).key[ch] ?? 't_grass';
export const isBlockedTile = (m: { skin?: string }, ch: string): boolean => skinOf(m).blocked.has(ch);
```

`mazeObjects` 用的 `BLOCKED_TILES.has(f.rows[...])` **不用改**（迷宮原始格子只有牆與地板，和主題無關），維持原樣。

`src/scenes/World.ts`：
- 第 3 行 import 改為 `import { MAPS, abilityOf, isBlockedTile, objectDepth, tileKeyOf } from '../data/maps';`（拿掉 `BLOCKED_TILES`、`TILE_KEY`）。
- 第 85 行：`const blocked = !saved || isBlockedTile(saved, saved.tiles[G.save.y]?.[G.save.x] ?? 'S');`
- 第 127 行：`this.tilesRT.draw(tileKeyOf(m, m.tiles[j][i]), i * T, j * T)`（整行 for 迴圈其餘不變）。
- 第 319 行：`if (isBlockedTile(m, m.tiles[y][x])) return false;`
- 第 327 行：`if (isBlockedTile(m, m.tiles[y][x])) return true;`

`src/core/dungeon.ts`：第 3 行 import 改為 `import { abilityOf, isBlockedTile } from '../data/maps';`；第 46 行 `walkable` 改為 `... && !isBlockedTile(f, f.tiles[y][x]);`

`tests/helpers/flood.ts`：第 1 行 import 改為 `import { abilityOf, isBlockedTile } from '../../src/data/maps';`；第 26 行 `ok` 改為 `... && !isBlockedTile(map, map.tiles[y][x]);`

- [ ] **Step 4：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/skin.test.ts` 全過；再 `npx vitest run` 全過（既有的沙漠、雪地、天空地形測試都照舊通過）。
- [ ] **Step 5：commit** `git add -A && git commit`：「地形外觀表 skin：地圖可指定 skin，前六關以指紋測試鎖住不變」。

---

## Task 2：16 個韻母的符號資料、教學進度、設定升級

**Files:** `src/data/symbols.ts`、`src/core/save.ts`、`src/data/levels.ts`、`tests/vowels.test.ts`（新）、`tests/settings-upgrade.test.ts`、`tests/ending.test.ts`、`tests/sky.test.ts`。

**Interfaces:**
- Produces（`src/data/symbols.ts` 匯出）：`CONSONANTS: string[]`（21 個聲母）、`VOWELS: string[]`（16 個韻母）；`SYMBOLS` 與 `ALL_SYMBOLS` 變成 37 個；`LEARN_STEPS` 多八步（見上表）。
- 設計重點：`ALL_SYMBOLS` 現在是 37 個，所以 `boss_s`（第一階段畢業考）的 `focus`／`review` 必須明確改用 `CONSONANTS`，維持原本的 21 個聲母。

- [ ] **Step 1：寫測試（先看它失敗）**

新檔 `tests/vowels.test.ts`：

```ts
import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { G, activeSymbols, defaultSettings, newSave } from '../src/core/save';
import { ZHUYIN_AUDIO } from '../src/data/audioMap';
import { ALL_SYMBOLS, CONSONANTS, LEARN_STEPS, VOWELS, ZHUYIN_TEST, symbolDef } from '../src/data/symbols';

const STAGE1_FLAGS = ['practiceDone', 'dEntered', 'dPractice', 'gEntered', 'gPractice', 'xEntered', 'xPractice', 'zEntered', 'zPractice', 'sEntered', 'sPractice'];
const STAGE2: { symbols: string[]; flag: string }[] = [
  { symbols: ['ㄧ', 'ㄨ'], flag: 'uEntered' }, { symbols: ['ㄩ'], flag: 'uPractice' },
  { symbols: ['ㄚ', 'ㄛ'], flag: 'aEntered' }, { symbols: ['ㄜ', 'ㄝ'], flag: 'aPractice' },
  { symbols: ['ㄞ', 'ㄟ'], flag: 'cEntered' }, { symbols: ['ㄠ', 'ㄡ'], flag: 'cPractice' },
  { symbols: ['ㄢ', 'ㄣ'], flag: 'tEntered' }, { symbols: ['ㄤ', 'ㄥ', 'ㄦ'], flag: 'tPractice' },
];

describe('第二階段符號資料', () => {
  it('21 個聲母、16 個韻母、共 37 個，沒有重複', () => {
    expect(CONSONANTS).toHaveLength(21);
    expect(VOWELS).toHaveLength(16);
    expect(ALL_SYMBOLS).toHaveLength(37);
    expect(new Set(ALL_SYMBOLS).size).toBe(37);
    expect([...CONSONANTS, ...VOWELS]).toEqual(ALL_SYMBOLS);
  });
  it('韻母和發音測試表的「韻母」一組完全一樣', () => {
    const group = ZHUYIN_TEST.find((g) => g.group === '韻母')!;
    expect([...VOWELS].sort()).toEqual(group.list.map(([c]) => c).sort());
    for (const [c, w] of group.list) expect(symbolDef(c).word, c).toBe(w);
  });
  it('每個韻母都有例字與提示語（提示語不重複，且是「這個字的聲音」格式）', () => {
    const tips = new Set<string>();
    for (const v of VOWELS) {
      const d = symbolDef(v);
      expect(d.word.length, v).toBe(1);
      expect(d.tip, v).toBe(`「${d.word}」這個字的聲音`);
      tips.add(d.tip);
    }
    expect(tips.size).toBe(16);
  });
  it('37 個符號的音檔都登記了，檔案也都在 public/audio/zhuyin/', () => {
    for (const s of ALL_SYMBOLS) {
      expect(ZHUYIN_AUDIO[s], s).toBeDefined();
      expect(existsSync(`public/${ZHUYIN_AUDIO[s]}`), s).toBe(true);
    }
  });
});

describe('第二階段教學進度', () => {
  beforeEach(() => { G.save = newSave(); G.settings = defaultSettings(); });
  const setFlags = (fs: string[]) => { for (const f of fs) G.save.flags[f] = true; };

  it('LEARN_STEPS 後面八步照順序、符號與旗標逐字照表', () => {
    expect(LEARN_STEPS.slice(-8)).toEqual(STAGE2);
  });
  it('每一步的旗標都不重複；韻母每個只教一次', () => {
    const flags = LEARN_STEPS.map((s) => s.flag).filter(Boolean);
    expect(new Set(flags).size).toBe(flags.length);
    const stage2 = LEARN_STEPS.slice(-8).flatMap((s) => s.symbols);
    expect([...stage2].sort()).toEqual([...VOWELS].sort());
  });
  it('只通第一階段：21 個聲母都有，一個韻母都還沒有', () => {
    setFlags(STAGE1_FLAGS);
    const a = activeSymbols();
    expect([...a].sort()).toEqual([...CONSONANTS].sort());
  });
  it('逐步進入第二階段：旗標一個一個開，符號一批一批出現', () => {
    setFlags(STAGE1_FLAGS);
    let expected = [...CONSONANTS];
    for (const st of STAGE2) {
      G.save.flags[st.flag] = true;
      expected = [...expected, ...st.symbols];
      expect([...activeSymbols()].sort(), st.flag).toEqual([...expected].sort());
    }
    expect(activeSymbols()).toHaveLength(37);
  });
});
```

在 `tests/settings-upgrade.test.ts` 加（`OLD18` 之後新增 `OLD21`，並加進 describe）：

```ts
const OLD21 = [...OLD18, 'ㄗ', 'ㄘ', 'ㄙ'];
```
```ts
  it('存了第六關結束時的 21 個聲母 → 升級成含全部韻母', () => {
    expect(has(load(OLD21), 'ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄦ')).toBe(true);
    expect(load(OLD21)).toHaveLength(37);
  });
  it('已經含韻母 → 不變；客製（少了 ㄅ）的 20 個 → 不變', () => {
    const a = [...OLD21, 'ㄚ'];
    expect([...load(a)].sort()).toEqual([...a].sort());
    const b = OLD21.filter((s) => s !== 'ㄅ');
    expect(load(b)).toEqual(b);
  });
```

在 `tests/ending.test.ts`：第 7 行改為 `import { CONSONANTS } from '../src/data/symbols';`；`'boss_s focus/review 為全部 21 個聲母'` 那個 `it` 改為：

```ts
  it('boss_s focus/review 為全部 21 個聲母（不含韻母）', () => {
    expect(CONSONANTS).toHaveLength(21);
    expect(BATTLES.boss_s.focus).toEqual(CONSONANTS);
    expect(BATTLES.boss_s.review).toEqual(CONSONANTS);
  });
```

在 `tests/sky.test.ts`：第 4 行 import 加入 `CONSONANTS`（保留 `ALL_SYMBOLS` 只要檔案裡還有用到；沒用到就拿掉），第 60～62 行改為：

```ts
    expect(CONSONANTS).toHaveLength(21);
    expect(b.focus).toEqual(CONSONANTS);
    expect(b.review).toEqual(CONSONANTS);
```

執行 `npx vitest run tests/vowels.test.ts tests/settings-upgrade.test.ts tests/ending.test.ts tests/sky.test.ts`，預期失敗。

- [ ] **Step 2：實作** `src/data/symbols.ts`

把現有的 `export const SYMBOLS: SymbolDef[] = [ ...21 行... ];` 改名為 `const CONSONANT_DEFS: SymbolDef[] = [ ...原樣... ];`，並在它後面加：

```ts
/** 韻母（第二階段）：韻母本身就是一個音，所以提示用「這個字的聲音」，不是「第一個音」。提示語是草稿，待使用者潤飾 */
const VOWEL_DEFS: SymbolDef[] = [
  ['ㄧ', '衣'], ['ㄨ', '屋'], ['ㄩ', '魚'], ['ㄚ', '啊'], ['ㄛ', '喔'], ['ㄜ', '鵝'], ['ㄝ', '耶'], ['ㄞ', '愛'],
  ['ㄟ', '欸'], ['ㄠ', '凹'], ['ㄡ', '歐'], ['ㄢ', '安'], ['ㄣ', '恩'], ['ㄤ', '昂'], ['ㄥ', '鞥'], ['ㄦ', '兒'],
].map(([ch, word]) => ({ ch, word, tip: `「${word}」這個字的聲音` }));
export const SYMBOLS: SymbolDef[] = [...CONSONANT_DEFS, ...VOWEL_DEFS];
export const CONSONANTS: string[] = CONSONANT_DEFS.map((s) => s.ch);
export const VOWELS: string[] = VOWEL_DEFS.map((s) => s.ch);
```

`LEARN_STEPS` 陣列最後（`{ symbols: ['ㄙ'], flag: 'sPractice' },` 之後）加：

```ts
  // 第二階段（韻母）：七 海底、八 遊樂園、九 古堡、十 時鐘塔
  { symbols: ['ㄧ', 'ㄨ'], flag: 'uEntered' },
  { symbols: ['ㄩ'], flag: 'uPractice' },
  { symbols: ['ㄚ', 'ㄛ'], flag: 'aEntered' },
  { symbols: ['ㄜ', 'ㄝ'], flag: 'aPractice' },
  { symbols: ['ㄞ', 'ㄟ'], flag: 'cEntered' },
  { symbols: ['ㄠ', 'ㄡ'], flag: 'cPractice' },
  { symbols: ['ㄢ', 'ㄣ'], flag: 'tEntered' },
  { symbols: ['ㄤ', 'ㄥ', 'ㄦ'], flag: 'tPractice' },
```

（`ALL_SYMBOLS`、`symbolDef` 那兩行不用改，現在自然是 37 個。）

`src/data/levels.ts`：第 2 行 import 改為 `import { CONSONANTS } from './symbols';`；第 217 行 `focus: [...ALL_SYMBOLS], review: [...ALL_SYMBOLS],` 改為 `focus: [...CONSONANTS], review: [...CONSONANTS],`（若檔案其他地方還有用到 `ALL_SYMBOLS` 就保留 import，先用 Grep 確認）。

`src/core/save.ts`：在 `OLD_ALL5` 那兩行之後、`if (G.settings.allowed.length < 2)` 之前加：

```ts
  // 第二階段之前的「全開」是 21 個聲母：同樣要升級，韻母才會出題（只在完整舊預設時升級；家長取消勾選過的客製清單不動）
  const OLD_ALL6 = [...OLD_ALL5, 'ㄗ', 'ㄘ', 'ㄙ'];
  if (OLD_ALL6.every((s) => G.settings.allowed.includes(s)) && !VOWELS.some((s) => G.settings.allowed.includes(s))) G.settings.allowed = defaultSettings().allowed;
```

並把第 1 行 import 改為 `import { ALL_SYMBOLS, LEARN_STEPS, VOWELS } from '../data/symbols';`。

- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；上面四個測試檔全過；`npx vitest run` 全過（`ALL_SYMBOLS` 變 37 後，其他測試若有寫死 21 的地方，只改成 `CONSONANTS` 並在 commit 說明）。
- [ ] **Step 4：commit**：「第二階段符號：16 個韻母、教學進度八步、設定升級；boss_s 固定考 21 個聲母」。

---

## Task 3：世界地圖大廳、起始村入口、結局伏筆

**Files:** `src/gfx/lobbyArt.ts`（新）、`src/gfx/sprites.ts`、`src/data/maps.ts`、`src/data/levels.ts`、`tests/lobbyart.test.ts`（新）、`tests/lobby.test.ts`（新）。

**Interfaces:**
- Consumes：Task 1 的 `isBlockedTile`（`tests/helpers/flood.ts` 的 `walkMap`、`visibleWith`）。
- Produces：地圖 `MAPS.lobby`；起始村物件 `world_map`（`stairs`，貼圖 `world_map`）；`LOBBY_TEXTURES`、`drawLobbyTextures`；`ENDING_LINES` 加伏筆。後面每個關卡的計畫會把大廳的 `gate7`～`gate10`（`barrier`）其中一個換成通往該關主島的 `stairs`。

- [ ] **Step 1：寫測試（先看它失敗）**

`tests/lobbyart.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { LOBBY_TEXTURES, drawLobbyTextures } from '../src/gfx/lobbyArt';
import type { Ctx2 } from '../src/gfx/snowArt';

function render() {
  const out: Record<string, { w: number; h: number; px: string[] }> = {};
  drawLobbyTextures((key, w, h, fn) => {
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

describe('大廳圖樣', () => {
  const tex = render();
  it('每個圖樣都有畫出來，16×16，不是空的', () => {
    for (const k of LOBBY_TEXTURES) {
      expect(tex[k], k).toBeDefined();
      expect([tex[k].w, tex[k].h], k).toEqual([16, 16]);
      expect(tex[k].px.some((p) => p), `${k} 是空的`).toBe(true);
    }
  });
  it('世界地圖告示板：背景透明（疊在草地上）、有紅色標記與綠色小島', () => {
    const t = tex.world_map;
    expect(t.px.some((p) => !p)).toBe(true);
    for (const col of ['#e8514a', '#5fbf45', '#6fb8f0', '#f6e3b0']) expect(t.px, col).toContain(col);
  });
});
```

`tests/lobby.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { ENDING_LINES } from '../src/data/levels';
import { MAPS, isBlockedTile } from '../src/data/maps';
import { LOBBY_TEXTURES } from '../src/gfx/lobbyArt';
import { visibleWith, walkMap } from './helpers/flood';

const walkable = (id: string, x: number, y: number) => !isBlockedTile(MAPS[id], MAPS[id].tiles[y][x]);
const freeOf = (id: string, x: number, y: number) => !MAPS[id].objects.some((o) => o.x === x && o.y === y);

describe('世界地圖大廳', () => {
  const lobby = MAPS.lobby;
  it('地圖存在、尺寸與格子一致、起點可走、用預設 skin', () => {
    expect(lobby).toBeDefined();
    expect(lobby.name).toBe('世界地圖');
    expect(lobby.tiles).toHaveLength(lobby.h);
    for (const r of lobby.tiles) expect(r).toHaveLength(lobby.w);
    expect(walkable('lobby', lobby.start.x, lobby.start.y)).toBe(true);
    expect(freeOf('lobby', lobby.start.x, lobby.start.y)).toBe(true);
    expect(lobby.skin ?? 'default').toBe('default');
  });
  it('回起始村的樓梯：目的地是起始村的可走空格（入口物件正下方的小路）', () => {
    const back = lobby.objects.find((o) => o.id === 'back_village')!;
    expect(back.kind).toBe('stairs');
    expect(back.to).toEqual({ map: 'village', x: 16, y: 16 });
    expect(walkable('village', 16, 16)).toBe(true);
    expect(freeOf('village', 16, 16)).toBe(true);
  });
  it('四扇門 gate7～gate10 是擋路的 barrier，各有鎖住的說明（之後每一關的計畫會把它換成通道）', () => {
    for (const id of ['gate7', 'gate8', 'gate9', 'gate10']) {
      const g = lobby.objects.find((o) => o.id === id)!;
      expect(g, id).toBeDefined();
      expect(g.kind).toBe('barrier');
      expect(g.lockText!.length, id).toBeGreaterThan(0);
    }
  });
  it('物件不重疊；起點、四扇門、告示牌、回起始村的樓梯從起點都走得到', () => {
    const keys = lobby.objects.map((o) => `${o.x},${o.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    const r = walkMap(lobby, {}, []);
    for (const id of ['back_village', 'sign_lobby', 'gate7', 'gate8', 'gate9', 'gate10']) expect(r.touched.has(id), id).toBe(true);
  });
});

describe('起始村的世界地圖入口', () => {
  const o = MAPS.village.objects.find((x) => x.id === 'world_map')!;
  it('stairs 通往大廳起點，要 endingSeen 才出現', () => {
    expect(o.kind).toBe('stairs');
    expect(o.showIf).toBe('endingSeen');
    expect(o.to).toEqual({ map: 'lobby', x: MAPS.lobby.start.x, y: MAPS.lobby.start.y });
    expect(visibleWith({})(o)).toBe(false);
    expect(visibleWith({ endingSeen: true })(o)).toBe(true);
  });
  it('貼圖已註冊、所在格可走、沒有壓到其他物件，旁邊有告示牌', () => {
    expect(LOBBY_TEXTURES as readonly string[]).toContain(o.sprite);
    expect(walkable('village', o.x, o.y)).toBe(true);
    expect(MAPS.village.objects.filter((x) => x.x === o.x && x.y === o.y)).toHaveLength(1);
    const sign = MAPS.village.objects.find((x) => x.id === 'world_map_sign')!;
    expect(sign.kind).toBe('sign');
    expect(sign.showIf).toBe('endingSeen');
    expect(MAPS.village.objects.filter((x) => x.x === sign.x && x.y === sign.y)).toHaveLength(1);
  });
  it('打倒星空龍王之後，從起始村出發走得到入口（走路模擬）', () => {
    const r = walkMap(MAPS.village, { endingSeen: true }, ['blast', 'gust', 'hum', 'fog'], MAPS.village.start);
    expect(r.touched.has('world_map')).toBe(true);
  });
});

describe('結局伏筆', () => {
  it('提到世界地圖；沒有再說「所有的注音」「全部的注音」都學會了（現在只學完聲母）', () => {
    const all = ENDING_LINES.map((l) => l.text).join('\n');
    expect(all).toContain('世界地圖');
    expect(all).not.toMatch(/所有的注音|全部的注音/);
    expect(ENDING_LINES.some((l) => l.text.includes('注音大英雄'))).toBe(true);
  });
});
```

執行 `npx vitest run tests/lobbyart.test.ts tests/lobby.test.ts`，預期失敗。

- [ ] **Step 2：圖樣** 新檔 `src/gfx/lobbyArt.ts`：

```ts
// 世界地圖（第二階段入口）的物件圖樣。不依賴 Phaser：sprites.ts 傳入 make／px，測試也可以傳入假畫布。
import type { Make, Px } from './snowArt';

export const LOBBY_TEXTURES = ['world_map'] as const;

const OUT = '#2b2140';

export function drawLobbyTextures(make: Make, px: Px) {
  // 世界地圖告示板（背景透明，疊在草地或小路上）：木柱撐著一塊羊皮紙，紙上畫著海、綠色小島和一個紅色的目的地標記
  make('world_map', 16, 16, (c) => {
    px(c, '#9a6a3a', 7, 11, 2, 5); px(c, '#6e4a2a', 8, 11, 1, 5);
    px(c, OUT, 1, 1, 14, 11);
    px(c, '#f6e3b0', 2, 2, 12, 9);
    px(c, '#6fb8f0', 3, 3, 10, 7);
    px(c, '#5fbf45', 4, 4, 5, 4); px(c, '#7ed957', 5, 4, 3, 2);
    px(c, '#e8514a', 10, 5, 2, 2); px(c, '#ffd84a', 3, 3, 1, 1);
  });
}
```

`src/gfx/sprites.ts`：在檔案開頭的 import 區加 `import { drawLobbyTextures } from './lobbyArt';`；在 `drawDesertTextures(...)` 那一行（約第 422 行）之後，照同樣的寫法加：

```ts
  drawLobbyTextures(make as unknown as Parameters<typeof drawLobbyTextures>[0], px as unknown as Parameters<typeof drawLobbyTextures>[1]);
```

- [ ] **Step 3：大廳地圖與起始村入口** `src/data/maps.ts`

在 `// ───────── 起始村 ─────────` 之前（`Grid` 類別之後）新增大廳地形：

```ts
// ───────── 世界地圖大廳（第二階段入口）─────────
const lobby = (() => {
  const g = new Grid(20, 14, '.').border('#');
  g.rect('=', 9, 3, 2, 10); // 中間的路：x 9..10、y 3..12
  g.rect('=', 3, 3, 14, 1); // 四扇門前面橫的路：y 3
  g.many(',', [[2, 8], [17, 8], [5, 10], [14, 10], [6, 6], [13, 6]]);
  return g;
})();
```

在 `MAPS` 的 `village: {...}` 物件之後（`};` 結尾之前）加入大廳（和 `village` 同層級的 key）：

```ts
  lobby: {
    id: 'lobby', name: '世界地圖', w: 20, h: 14, tiles: lobby.rows(), theme: 'meadow',
    start: { x: 9, y: 11 }, respawn: { x: 9, y: 11 },
    objects: [
      { id: 'back_village', kind: 'stairs', x: 9, y: 12, to: { map: 'village', x: 16, y: 16 }, label: '回起始村' },
      // 第二階段四扇門：目前都還在準備中。每一關的計畫會把對應的 barrier 換成通往該關主島的 stairs（並用 hideIf／showIf 切換）
      { id: 'gate7', kind: 'barrier', x: 4, y: 2, lockText: ['第七關「海底」的門。', '門後面還在準備中，敬請期待！'] },
      { id: 'gate8', kind: 'barrier', x: 7, y: 2, lockText: ['第八關「遊樂園」的門。', '門後面還在準備中，敬請期待！'] },
      { id: 'gate9', kind: 'barrier', x: 12, y: 2, lockText: ['第九關「古堡」的門。', '門後面還在準備中，敬請期待！'] },
      { id: 'gate10', kind: 'barrier', x: 15, y: 2, lockText: ['第十關「時鐘塔」的門。', '門後面還在準備中，敬請期待！'] },
      { id: 'sign_lobby', kind: 'sign', x: 8, y: 6, text: ['世界地圖：第二階段的入口。', '每一扇門通往一個新的世界，要一關一關通過喔。', '想回起始村，就走下面的樓梯。'] },
    ],
  },
```

在起始村 `objects` 裡、`...villageGates,` 之前加：

```ts
      // 打倒星空龍王後（endingSeen）出現：村子南邊的世界地圖，通往第二階段的大廳。選在路下方的空地：不壓既有物件；回程落在正上方的小路 (16,16)
      { id: 'world_map', kind: 'stairs', x: 16, y: 17, sprite: 'world_map', to: { map: 'lobby', x: 9, y: 11 }, label: '世界地圖', showIf: 'endingSeen' },
      { id: 'world_map_sign', kind: 'sign', x: 15, y: 17, showIf: 'endingSeen', text: ['世界地圖：通往第二階段。', '你已經學會全部的聲母了！', '地圖上還有更多新的世界，等著你去冒險。'] },
```

- [ ] **Step 4：結局伏筆** `src/data/levels.ts` 的 `ENDING_LINES`：

第一句改為 `{ who: '星空龍王', text: '哈哈哈，你通過畢業考了！所有的聲母，你都學會了。' },`；最後一句 `'恭喜你學會全部的注音，真的好厲害！'` 改為 `'恭喜你學會全部的聲母，真的好厲害！'`，並在它後面加兩句：

```ts
    { who: '星空龍王', text: '不過，世界還很大呢……起始村裡出現了一張世界地圖，上面有更多你沒去過的地方。' },
    { who: '旁白', text: '新的冒險，正在等著你！' },
```

（只改 `ENDING_LINES`；稱號「注音大英雄」那一句不動。）

- [ ] **Step 5：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/lobbyart.test.ts tests/lobby.test.ts` 全過；`npx vitest run` 全過（遇到逐張地圖檢查的既有測試如 `hub.test.ts`、`layout.test.ts` 因為多了 `lobby` 而失敗，就依該測試的規則修，不要放寬規則，並在 commit 說明原因）；`node --check tests/e2e/play.mjs`。
- [ ] **Step 6：commit**：「世界地圖大廳：lobby 地圖、起始村入口（endingSeen 後出現）、結局伏筆」。

---

## Task 4：文件

**Files:** `AGENTS.md`、`README.md`。

- [ ] **Step 1：`AGENTS.md`**
  - 「地形字元」那一條最後的「新字元要同時加進 `BLOCKED_TILES` 與 `TILE_KEY`」改為：「前六關的字元在 `BLOCKED_TILES` 與 `TILE_KEY`（預設 skin）；**英文字母已用完，第二階段起新地形一律走 skin**：`MapDef.skin` 指定 `SKINS` 的一張表（字元 → 貼圖 `key`、擋路 `blocked`），查詢一律用 `tileKeyOf(map, ch)`／`isBlockedTile(map, ch)`，不要直接用 `BLOCKED_TILES`／`TILE_KEY`（`mazeObjects` 處理迷宮原始格子除外）。」
  - 新增一條「第二階段（韻母）」：關卡順序（七 海底 ㄧㄨㄩ、八 遊樂園 ㄚㄛㄜㄝ、九 古堡 ㄞㄟㄠㄡ、十 時鐘塔 ㄢㄣㄤㄥㄦ）、教學旗標表（`uEntered`／`uPractice`、`aEntered`／`aPractice`、`cEntered`／`cPractice`、`tEntered`／`tPractice`）、`CONSONANTS`（21）／`VOWELS`（16）／`ALL_SYMBOLS`（37）、`boss_s` 固定考聲母、大廳 `lobby`（`world_map` 在 `endingSeen` 後出現；`gate7`～`gate10` 各關計畫換成通道）、只教認識韻母不教拼音。
  - 「指令」或結構段落提到 `ALL_SYMBOLS` 是 21 個的地方（若有）改成 37 個。
- [ ] **Step 2：`README.md`** 加一小段說明第二階段進度（地基完成，四個關卡陸續加入），語氣與現有段落一致。
- [ ] **Step 3：驗證** `npx tsc --noEmit`、`npx vitest run` 全過。
- [ ] **Step 4：commit**：「文件：skin、第二階段符號與大廳」。

---

## 手動確認（給使用者）

1. 大廳外觀與走路順不順（`await window.__game.world().loadMap('lobby', 9, 11)` 可以直接進去看；`loadMap` 是私有方法，主控台仍可呼叫）。
2. 起始村入口告示板的樣子：把存檔的 `endingSeen` 設成 true（`window.__game.G.save.flags.endingSeen = true`，再重新進村）。
3. 結局台詞的語氣與用字（草稿）。
4. 韻母提示語（尤其 欸、鞥）要不要換字；語音需要預先產生時，請自己執行 `tools/gen-voice.ts`（金鑰不由我處理）。
5. 這一包只有地基：大廳的四扇門目前都擋著，第二階段實際關卡要等後面四個計畫。決定要不要等第七關做好再一起 push。
