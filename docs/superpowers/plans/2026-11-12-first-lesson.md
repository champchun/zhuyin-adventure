# 第一次認識符號的小課程（選符號、聽符號、寫符號）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 孩子「第一次認識」一個符號時（學會綁定那個符號的招式的那一刻），一定要依序完成三關：① 選符號（看到符號，找出一樣的）② 聽符號（聽聲音，選出符號）③ 寫符號（用手指照筆順寫）。每個符號只上一次課，過關記在存檔裡。

**使用者已確認（2026-11-12）：**
- 時機：**學會招式的那一刻**（打完練習戰或頭目、領到新招式時；例如 ㄅㄆ、ㄇㄈ、ㄉㄊ、ㄋㄌ、ㄍㄎ、ㄏ）。
- 規則：**沒有懲罰、不能跳過、已經認識過的不再出現**。

**Architecture:** 判斷與出題是純函式（`src/core/lesson.ts`，可用 Vitest 測）；存檔新增 `introduced`（已認識的符號），舊存檔載入時把「已學會招式綁定的符號」視為已認識；畫面是兩個 DOM 彈窗（選／聽共用一個 `openLessonPick`，寫沿用 `openWriteSymbol` 並加「不可跳過」選項）；World 在領到新招式之後依序跑課程。

**Tech Stack:** TypeScript、Vite、Phaser 3.80、Vitest、Playwright（端對端）。

## Global Constraints

- 介面文字一律繁體中文；孩子是幼兒園到小一，句子要短。
- 三關的順序固定：選符號 → 聽符號 → 寫符號；**每關答對才進下一關，答錯沒有任何處罰**：只顯示「再找找看」／「再聽一次」並讓孩子再選；彈窗**沒有「先不要」或關閉按鈕**（不能跳過）。
- 不得把未驗證的 TTS 當標準注音單音：「聽符號」那一關只在 `audio.hasSymbolAudio(符號)` 為真時出現（只用 `audio.playSymbol(ch)`，沒有音檔就整關略過）。
- 「寫符號」那一關：沒有該符號的筆順資料（`STROKES[符號]` 不存在）時略過；家長設定的「寫字挑戰」（`G.settings.writeChallenge`）關閉時也略過（尊重家長設定，也讓機器人可以跳過）。
- 選項只來自「已經教過」的符號（`activeSymbols()`，`src/core/save.ts`）；選項 3 個（符號池不到 3 個時用 2 個）；答案的位置要打亂。
- 「選符號」與「聽符號」各 1 題（目標就是剛學的符號）；「寫符號」寫完整個符號一次。
- 每個符號只上一次課：上完（三關都過或被略過）就把符號加進 `G.save.introduced` 並 `saveGame()`；之後再領到同一個招式（重玩、已領過獎勵）不再出現。
- 舊存檔（沒有 `introduced` 欄位）載入時：把「已經學會的招式」（`G.save.abilities`）綁定的符號都放進 `introduced`，不要讓老玩家重新上課。
- 課程出現在領獎勵的對話之後（`applyReward` 的故事台詞與道具台詞之後、`results` 之前），**對話與彈窗要成對**（`say` 陣列不能是空的、課程不能留下 `ui.blocking` 沒歸零）。
- 很多檔案是 CRLF：用 Read + Edit 修改，不要用多行 shell 字串取代。
- 不要用 `vite-node`；測試用 `npx vitest run`（偶爾出現「1 個 Unhandled Error」且測試數變少是已知的暫時問題，重跑即可）。
- 端對端不在本機跑，只做 `node --check`。只在使用者明確要求時才 push `main`。每個 Task 結尾只做本機 commit。
- Commit 訊息結尾加（一字不差）：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## 前置條件

- 分支 `first-lesson`（從 `main` 開出，工作目錄乾淨）。**不要再開新分支。**

## File Structure

| 檔案 | 動作 | 責任 |
|---|---|---|
| `src/core/lesson.ts` | 新增 | `lessonSymbols`、`lessonSteps`、`makeLessonRound`（純函式） |
| `tests/lesson.test.ts` | 新增 | 上述函式與存檔遷移的測試 |
| `src/core/save.ts` | 修改 | `SaveData.introduced`、`newSave`、載入時遷移 |
| `src/core/ui.ts` | 修改 | `openLessonPick`（選／聽共用）；`openWriteSymbol` 加「不可跳過」選項 |
| `src/scenes/World.ts` | 修改 | 領到新招式後依序跑課程 |
| `tests/e2e/play.mjs` | 修改 | 機器人處理課程彈窗；斷言課程有出現並記錄 |

---

### Task 1: 判斷、出題與存檔（純邏輯）

**Files:**
- Create: `src/core/lesson.ts`
- Create: `tests/lesson.test.ts`
- Modify: `src/core/save.ts`

**Interfaces:**
- Produces（Task 2 用）：
  ```ts
  // src/core/lesson.ts
  export type LessonStep = 'match' | 'listen' | 'write';
  /** 這次領到的招式（ability id 清單）要上課的符號：每個招式綁定的符號，依順序、去重，排除已認識的 */
  export function lessonSymbols(newAbilities: string[], introduced: string[], symbolOf: (ability: string) => string | undefined): string[];
  /** 這個符號要上哪幾關（依序）：永遠有 match；有音檔才有 listen；有筆順且家長開了寫字挑戰才有 write */
  export function lessonSteps(o: { hasAudio: boolean; hasStrokes: boolean; writeOn: boolean }): LessonStep[];
  export interface LessonRound { target: string; options: string[] }
  /** 一題：選項含目標、不重複、已打亂；pool＝已教過的符號（含目標或不含都可以，函式自己保證目標在選項裡）；最多 3 個選項 */
  export function makeLessonRound(target: string, pool: string[], rng?: () => number): LessonRound;
  /** 舊存檔升級：已經學會的招式所綁定的符號都算已認識 */
  export function introducedFromAbilities(abilities: string[], symbolOf: (ability: string) => string | undefined): string[];
  ```
  存檔：`SaveData.introduced?: string[]`（沒有時視為未遷移）。

- [ ] **Step 1: 寫會失敗的測試**

建立 `tests/lesson.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { introducedFromAbilities, lessonSteps, lessonSymbols, makeLessonRound } from '../src/core/lesson';
import { castSymbol } from '../src/data/monsters';

describe('lessonSymbols：這次領到的招式要上哪些符號的課', () => {
  it('每個招式對應綁定的符號，依順序', () => {
    expect(lessonSymbols(['blast', 'gust'], [], castSymbol)).toEqual(['ㄅ', 'ㄆ']);
    expect(lessonSymbols(['croak', 'knock'], [], castSymbol)).toEqual(['ㄍ', 'ㄎ']);
  });
  it('已經認識過的不再出現', () => {
    expect(lessonSymbols(['blast', 'gust'], ['ㄅ'], castSymbol)).toEqual(['ㄆ']);
    expect(lessonSymbols(['breath'], ['ㄏ'], castSymbol)).toEqual([]);
  });
  it('重複的招式只算一次；沒有綁定符號的招式（未知）略過', () => {
    expect(lessonSymbols(['blast', 'blast', 'nope'], [], castSymbol)).toEqual(['ㄅ']);
  });
});

describe('lessonSteps：要上哪幾關', () => {
  it('一律先選符號；有音檔才聽；有筆順且家長開了寫字才寫；順序固定', () => {
    expect(lessonSteps({ hasAudio: true, hasStrokes: true, writeOn: true })).toEqual(['match', 'listen', 'write']);
    expect(lessonSteps({ hasAudio: false, hasStrokes: true, writeOn: true })).toEqual(['match', 'write']);
    expect(lessonSteps({ hasAudio: true, hasStrokes: false, writeOn: true })).toEqual(['match', 'listen']);
    expect(lessonSteps({ hasAudio: true, hasStrokes: true, writeOn: false })).toEqual(['match', 'listen']);
    expect(lessonSteps({ hasAudio: false, hasStrokes: false, writeOn: false })).toEqual(['match']);
  });
});

describe('makeLessonRound：一題', () => {
  const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
  it('選項含目標、不重複、最多 3 個；選項都來自 pool 加上目標', () => {
    for (let i = 0; i < 50; i++) {
      const r = makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ']);
      expect(r.target).toBe('ㄍ');
      expect(r.options).toHaveLength(3);
      expect(new Set(r.options).size).toBe(3);
      expect(r.options).toContain('ㄍ');
      for (const o of r.options) expect(['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ']).toContain(o);
    }
  });
  it('pool 沒包含目標時，目標還是會在選項裡', () => {
    for (let i = 0; i < 30; i++) expect(makeLessonRound('ㄏ', ['ㄅ', 'ㄆ', 'ㄇ']).options).toContain('ㄏ');
  });
  it('pool 很小（不到 3 個）時用 2 個選項；只有目標自己時也不會當掉', () => {
    expect(makeLessonRound('ㄅ', ['ㄅ', 'ㄆ']).options.sort()).toEqual(['ㄅ', 'ㄆ']);
    expect(makeLessonRound('ㄅ', ['ㄅ']).options).toEqual(['ㄅ']);
  });
  it('答案的位置會變；可以注入亂數重現', () => {
    const idx = new Set<number>();
    for (let i = 0; i < 80; i++) idx.add(makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ']).options.indexOf('ㄍ'));
    expect(idx.size).toBeGreaterThan(1);
    expect(makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ'], seq(0.1, 0.5, 0.9))).toEqual(makeLessonRound('ㄍ', ['ㄅ', 'ㄆ', 'ㄇ', 'ㄍ'], seq(0.1, 0.5, 0.9)));
  });
});

describe('introducedFromAbilities：舊存檔升級', () => {
  it('學會的招式綁定的符號都算已認識', () => {
    expect(introducedFromAbilities(['blast', 'gust', 'hum'], castSymbol)).toEqual(['ㄅ', 'ㄆ', 'ㄇ']);
    expect(introducedFromAbilities([], castSymbol)).toEqual([]);
  });
});
```

- [ ] **Step 2: 執行，確認失敗**

Run: `npx vitest run tests/lesson.test.ts`
Expected: FAIL（`../src/core/lesson` 不存在）。

- [ ] **Step 3: 實作純邏輯**

建立 `src/core/lesson.ts`：

```ts
// 第一次認識符號的小課程（純函式）：選符號 → 聽符號 → 寫符號。
export type LessonStep = 'match' | 'listen' | 'write';

/** 這次領到的招式要上課的符號：依順序、去重、排除已認識的。 */
export function lessonSymbols(newAbilities: string[], introduced: string[], symbolOf: (ability: string) => string | undefined): string[] {
  const out: string[] = [];
  for (const a of newAbilities) {
    const s = symbolOf(a);
    if (s && !introduced.includes(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

/** 這個符號要上哪幾關（依序）。 */
export function lessonSteps(o: { hasAudio: boolean; hasStrokes: boolean; writeOn: boolean }): LessonStep[] {
  const steps: LessonStep[] = ['match'];
  if (o.hasAudio) steps.push('listen');
  if (o.hasStrokes && o.writeOn) steps.push('write');
  return steps;
}

export interface LessonRound { target: string; options: string[] }

function shuffle<T>(a: T[], rng: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** 一題：選項含目標、不重複、已打亂，最多 3 個。 */
export function makeLessonRound(target: string, pool: string[], rng: () => number = Math.random): LessonRound {
  const others = shuffle([...new Set(pool)].filter((s) => s !== target), rng).slice(0, 2);
  return { target, options: shuffle([target, ...others], rng) };
}

/** 舊存檔升級：已經學會的招式所綁定的符號都算已認識。 */
export function introducedFromAbilities(abilities: string[], symbolOf: (ability: string) => string | undefined): string[] {
  return lessonSymbols(abilities, [], symbolOf);
}
```

- [ ] **Step 4: 存檔欄位與遷移**

在 `src/core/save.ts`：
1. 檔案開頭 import 區加：`import { introducedFromAbilities } from './lesson';`、`import { castSymbol } from '../data/monsters';`（`ITEMS`、`SPECIES` 已經從 `../data/monsters` import，把 `castSymbol` 併進同一行）。
2. `SaveData` 介面的 `homeMap?: string;` 後面加：
   ```ts
     /** 已經上過「第一次認識」小課程的符號。舊存檔沒有這個欄位時，載入會依已學會的招式補上 */
     introduced?: string[];
   ```
3. `newSave()`（找 `function newSave` 或 `const newSave`）回傳的物件加上 `introduced: []`（照該物件裡其他欄位的寫法）。
4. `loadGame()` 裡，`G.save.party.forEach(ensureVitals);` 之前加：
   ```ts
       // 舊存檔沒有 introduced：已經學會的招式綁定的符號都算已認識，老玩家不用重新上課
       if (!G.save.introduced) G.save.introduced = introducedFromAbilities(G.save.abilities, castSymbol);
   ```

- [ ] **Step 5: 執行測試、型別檢查**

Run: `npx vitest run`
Expected: 全部 PASS。若 `tests/game.test.ts` 或其他檢查存檔欄位的測試因為多了 `introduced` 而失敗，**修測試的期望值（加上這個欄位）**並在報告說明。

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "第一次認識符號的小課程：判斷與出題的純函式、存檔 introduced 欄位與舊存檔升級

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 畫面與流程（彈窗、World 串接、端對端）

**Files:**
- Modify: `src/core/ui.ts`
- Modify: `src/scenes/World.ts`
- Modify: `tests/e2e/play.mjs`

**Interfaces:**
- Consumes: Task 1 的 `lessonSymbols`、`lessonSteps`、`makeLessonRound`、`G.save.introduced`
- Produces：
  ```ts
  // src/core/ui.ts
  /** 選符號／聽符號：彈窗上沒有關閉鈕，一直到點對才結束（答錯只說再試一次，沒有處罰）。 */
  export function openLessonPick(mode: 'match' | 'listen', target: string, options: string[]): Promise<void>;
  /** openWriteSymbol 新增第二個參數：{ required: true } 時沒有「先不要」，一直寫到全部寫對才回傳（回傳一定是 true） */
  export function openWriteSymbol(symbol: string, opts?: { required?: boolean }): Promise<boolean>;
  ```
- 這個 Task 動場景與畫面，只能靠型別檢查、既有測試、打包與端對端驗證。

- [ ] **Step 1: `openWriteSymbol` 加「不可跳過」**

先 Read `src/core/ui.ts` 的 `openWriteSymbol`（約 180～280 行）。改動：
- 簽名改成 `openWriteSymbol(symbol: string, opts: { required?: boolean } = {}): Promise<boolean>`。
- 彈窗 HTML 裡 `<div class="foot" …><button class="btn small" data-a="no">先不要</button></div>` 這一段，`opts.required` 為真時**不輸出按鈕**（輸出空字串）；`data-a="no"` 的事件處理在沒有按鈕時不會觸發，不用改。
- 其他行為（沒有筆順資料時回傳 `true`、寫完所有筆畫回傳 `true`）不變。

- [ ] **Step 2: `openLessonPick` 彈窗**

在 `src/core/ui.ts` 的 `choose` 附近，仿照 `choose`／`openWorldMap` 的寫法（`openModal`、`delegate`、`closeModal`、`audio`、`ui.blocking` 的成對由 `openModal`／`closeModal` 處理，先 Read 確認）新增：

```ts
/** 第一次認識符號的小課程：選符號（看到符號，找一樣的）／聽符號（聽聲音，選符號）。沒有關閉鈕，點對才結束；答錯沒有處罰。 */
export function openLessonPick(mode: 'match' | 'listen', target: string, options: string[]): Promise<void> {
  return new Promise((resolve) => {
    const title = mode === 'match' ? '🔍 找一找' : '👂 聽一聽';
    const hint = mode === 'match' ? '找出一樣的符號！' : '聽聲音，選出聽到的符號！';
    const card = mode === 'match'
      ? `<div class="lesson-card" style="font-size:72px;font-weight:700;text-align:center;line-height:1.1;margin:6px 0">${target}</div>`
      : `<div style="text-align:center;margin:6px 0"><button class="btn" data-a="replay">🔊 再聽一次</button></div>`;
    const m = openModal(`<h2>${title}</h2><p id="lmsg" style="min-height:1.5em">${hint}</p>${card}
      <div class="foot" style="justify-content:center;gap:10px;flex-wrap:wrap">${options.map((o) => `<button class="btn" data-a="lp" data-ch="${o}" style="font-size:36px;min-width:84px">${o}</button>`).join('')}</div>`);
    m.dataset.lessonTarget = target; // 給端對端機器人讀（孩子看不到）
    const say = (t: string) => { const e = m.querySelector('#lmsg'); if (e) e.textContent = t; };
    const play = () => { if (!audio.playSymbol(target)) say('這個聲音現在聽不到，用看的也可以喔！'); };
    if (mode === 'listen') play(); else audio.speak(hint);
    delegate(m, (a, el) => {
      if (a === 'replay') { play(); return; }
      if (a !== 'lp') return;
      if (el.dataset.ch === target) { audio.sfx('levelup'); closeModal(); resolve(); return; }
      audio.sfx('tap');
      say(mode === 'match' ? '再找找看～' : '再聽一次～');
      if (mode === 'listen') play();
    });
  });
}
```
（`openModal` 回傳的元素型別、`delegate` 的回呼參數型別照檔案裡既有用法調整；`audio.playSymbol` 沒有音檔回傳 `false` 時不要用 TTS 冒充，只改文字。若 `m` 不是 `HTMLElement`，用 `m.setAttribute('data-lesson-target', target)`。）

- [ ] **Step 3: World 串接**

在 `src/scenes/World.ts`：
1. import 區補：`import { lessonSteps, lessonSymbols, makeLessonRound } from '../core/lesson';`；`openLessonPick` 併進 `from '../core/ui'` 那一行；`castSymbol` 併進 `from '../data/monsters'`（先 grep 看哪些已經有）；`STROKES` 若還沒 import 就從 `'../data/strokes'` import。
2. 在 `applyReward` 裡，把 `await say(...)`／`toast(...)` 那一段（`const all = ...` 到 `else toast(...)`）**之後**、`if (rw.results) {` **之前**，加：
   ```ts
       if (!claimed) await this.runLessons(rw.abilities ?? []);
   ```
3. 在 `applyReward` 前面加方法：

```ts
  /** 第一次認識符號的小課程：每個新符號依序「選符號 → 聽符號 → 寫符號」，不能跳過、沒有處罰；上完記進 introduced。 */
  private async runLessons(newAbilities: string[]) {
    const intro = (G.save.introduced ??= []);
    for (const sym of lessonSymbols(newAbilities, intro, castSymbol)) {
      const steps = lessonSteps({ hasAudio: audio.hasSymbolAudio(sym), hasStrokes: !!STROKES[sym]?.length, writeOn: G.settings.writeChallenge });
      await say([`「${sym}」是新朋友！`, '我們來認識它：先找一找，再聽一聽，最後寫一寫。'].map((text) => ({ text })), { speak: true });
      for (const step of steps) {
        if (step === 'write') { await openWriteSymbol(sym, { required: true }); continue; }
        const round = makeLessonRound(sym, activeSymbols());
        await openLessonPick(step, round.target, round.options);
      }
      intro.push(sym);
      saveGame();
    }
  }
```
（`activeSymbols`、`openWriteSymbol`、`audio`、`say`、`saveGame` 在 `World.ts` 多半已經 import；缺的補上。）

- [ ] **Step 4: 端對端機器人**

在 `tests/e2e/play.mjs` 的 `pump` 函式：
1. 在 `ev(() => {...})` 回傳的狀態物件裡加兩個欄位：`lesson: document.querySelector('#modal [data-lesson-target]')?.dataset.lessonTarget ?? ''`。
2. 在處理 `st.pick`（`choose()` 選擇視窗）那一行**之前**加：
   ```js
       if (st.lesson) { await sleep(300); await page.click(`#modal [data-a=lp][data-ch="${st.lesson}"]`).catch(() => {}); await sleep(200); continue; } // 第一次認識符號的小課程：點對的符號
   ```
   （先確認 `openModal` 把 `data-lesson-target` 放在 `#modal` 裡面的元素上；若放在 `#modal` 本身，選擇器改成 `#modal[data-lesson-target]` 與 `document.querySelector('#modal')?.dataset.lessonTarget`。）
3. 機器人預設把家長的「寫字挑戰」關掉（`s.writeChallenge = false`），所以寫符號那一關會被略過；不用另外處理。
4. 在第一次學會 ㄅㄆ 的地方（搜尋 `abilities.includes('blast')` 或 `練習戰`），**之後**加一個斷言：`const intro1 = (await save()).introduced; if (!intro1 || !intro1.includes('ㄅ') || !intro1.includes('ㄆ')) throw new Error('練習戰之後 ㄅㄆ 應該已經上過課 ' + JSON.stringify(intro1));`；在打完鼓王（搜尋 `boss_d`）的檢查之後，同樣斷言 `introduced` 含 `ㄋ`、`ㄌ`；在打完蝙蝠王（搜尋 `boss_g`）之後斷言含 `ㄏ`。（`save()` 輔助函式回傳 `G.save` 的拷貝；若它沒有 `introduced`，改用 `ev(() => window.__game.G.save.introduced)`。）

- [ ] **Step 5: 測試、型別檢查、打包**

Run: `npx tsc --noEmit`
Expected: 沒有輸出。

Run: `npx vitest run`
Expected: 全部 PASS。

Run: `npm run build`
Expected: `✓ built in ...`。

Run: `node --check tests/e2e/play.mjs`
Expected: 沒有輸出。

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "第一次認識符號：學會招式時依序選符號、聽符號、寫符號（不能跳過、沒有處罰）

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 手動確認清單（由使用者在瀏覽器做）

這個 Task 不改程式。

- [ ] **Step 1: 新遊戲的 ㄅㄆ**

開新遊戲，打完村裡的稻草布偶、領到爆破拳與噴風。Expected：先出現「「ㄅ」是新朋友！」，然後依序：🔍 找一找（大大的 ㄅ，選一樣的）→ 👂 聽一聽（聽聲音選符號）→ ✍️ 寫出「ㄅ」；三關都過才換 ㄆ。沒有任何「先不要」或關閉鈕；答錯只說「再找找看～」／「再聽一次～」。

- [ ] **Step 2: 家長設定**

到家長設定把「寫字挑戰」關掉，再學一個新符號。Expected：只有選符號與聽符號兩關，沒有寫字。

- [ ] **Step 3: 老玩家不重上課**

用舊存檔（已經學過的招式）載入。Expected：不會重新上課；只有之後新領到的招式才會上課。

- [ ] **Step 4: 重玩不重上課**

用跳關 code 把同一個頭目再打一次。Expected：不再上課（已領過獎勵、符號已認識）。

---

## Self-Review

- **三關（選符號、聽符號、寫符號）依序必過、不能跳過、沒有處罰**：Task 1（`lessonSteps`）、Task 2（`openLessonPick` 無關閉鈕、`openWriteSymbol` 的 `required`、答錯只提示）。
- **時機是學會招式的那一刻**：Task 2 Step 3（`applyReward` 領到招式、故事與道具對話之後）。
- **已認識過的不再出現；舊存檔不重上課**：Task 1（`introduced`、`introducedFromAbilities`、載入遷移）。
- **不使用未驗證的 TTS；沒有音檔／筆順／家長關寫字時略過那一關**：Task 1（`lessonSteps`）、Task 2（`hasSymbolAudio`、`STROKES`、`writeChallenge`）。
- **端對端**：Task 2 Step 4。
- **未涵蓋**：把這個小課程套用到沒有綁招式的符號（之後的韻母等，要加時再擴充 `lessonSymbols` 的來源）。

型別一致性：`LessonStep`、`lessonSymbols`、`lessonSteps`、`makeLessonRound`、`introducedFromAbilities` 在 Task 1 定義，Task 2 使用；`SaveData.introduced` 在 Task 1 定義，Task 2 讀寫；`openLessonPick`、`openWriteSymbol` 的新簽名在 Task 2 定義、同一個 Task 使用。
