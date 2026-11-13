# 金幣爺爺 實作計畫

> **For agentic workers:** 使用 superpowers:subagent-driven-development 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-13-coin-giver-design.md`（必讀）。

**Goal:** 孩子金幣 < 25 時，三座主島之一會出現「金幣爺爺」；問他一題注音，答對給 100 金幣；每次對話結束他就換到另一座到過的主島。

**Architecture:** 純邏輯（`src/core/giver.ts`）+ 存檔選用欄位 `giverAt` + World 的 `giver` 物件（可見條件、對話、換島）+ 一組小圖。出題沿用 `makeQuestion`，作答沿用現有的 `openLessonPick(mode, target, options)`（點對才結束、答錯沒處罰），所以不需要新的出題 UI。比照 `granny`（星星婆婆）與 `frogstone` 的做法。

## Global Constraints

- 繁體中文；commit 結尾 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不動：第 0 關（起始村 `village`、`lab`、`b`、`p`）的物件與地形、試煉洞窟 `dc1`／`dc2`；爺爺只放在 `dh`、`gh`、`xh`，不可壓住既有物件、碼頭與抵達格，不改既有物件座標。
- 任何 `say()`／modal 都要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 存檔：新欄位 `giverAt?: string` 選用，舊存檔缺少時當未設定；不改版本號（注意 `loadGame` 的預設值陷阱，比照 `starsSpent`）。
- 不得把未驗證的 TTS 當標準注音單音：沒有音檔時 `makeQuestion` 會自動降成看符號配對（`audioReady` 傳 `audio.audioReadyFor(...)`，不要傳 `experimentalSymbolTts`）。
- 不要在本機跑端對端（只 `node --check`）。vitest 偶爾「Unhandled Error」且測試數變少，重跑即可。
- 每個 Task 完成前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。
- 常數：`POOR_COINS = 25`、`GIVER_REWARD = 100`、`GIVER_HUBS = ['dh','gh','xh']`。

## Task 1：純邏輯與存檔

**Files:** `src/core/giver.ts`（新）、`src/core/save.ts`、`tests/giver.test.ts`（新）。

**Interfaces — Produces（Task 3 用）：**

```ts
export const POOR_COINS = 25;
export const GIVER_REWARD = 100;
export const GIVER_HUBS: readonly string[]; // ['dh','gh','xh']
export function isPoor(coins: number): boolean;                         // coins < POOR_COINS
export function giverMap(s: SaveData): string | undefined;              // 目前所在主島
export function giverVisible(s: SaveData, mapId: string): boolean;      // isPoor(s.coins) && giverMap(s) === mapId
export function nextGiverMap(s: SaveData, rng?: () => number): string | undefined; // 另一座到過的主島；沒有就回目前的
```

規則：
- 到過的主島＝`GIVER_HUBS` 中 `s.flags['visited:<id>']` 為真者（依 GIVER_HUBS 順序）。
- `giverMap`：`s.giverAt` 有值且在到過的主島裡就用它；否則用到過的主島第一個；一座都沒到過回 `undefined`。
- `nextGiverMap`：從到過的主島裡排除目前的，隨機挑一個（`rng` 預設 `Math.random`，用 `Math.floor(rng() * n)`）；排除後沒有就回目前的（可能是 `undefined`）。

`save.ts`：`SaveData` 新增 `giverAt?: string`（註解：金幣爺爺目前所在的主島）；`newSave` 不必給值；確認 `loadGame` 對舊存檔缺少此欄位不會出錯（不補預設值也可，因為它是選用且 `giverMap` 會處理）。

- [ ] **Step 1：先寫 `tests/giver.test.ts`（會失敗）**，涵蓋：
  - `isPoor(24)` 為真、`isPoor(25)` 為假、`isPoor(0)` 為真。
  - `giverMap`：沒到過任何主島 → `undefined`；只到過 `dh` → `'dh'`；`giverAt:'xh'` 但沒到過 xh → 退回第一個到過的；`giverAt:'gh'` 且到過 → `'gh'`。
  - `giverVisible`：窮且在所在島 → 真；有錢（25）→ 假；不在所在島 → 假。
  - `nextGiverMap`：到過 dh、gh、xh 且目前 dh → 結果在 `['gh','xh']` 且 `rng=()=>0` 得 `'gh'`、`rng=()=>0.99` 得 `'xh'`；只到過一座 → 回原地；永遠不回目前的島（多組 rng 迴圈檢查）。
  - 常數值：`POOR_COINS === 25`、`GIVER_REWARD === 100`；且 `POOR_COINS` 不小於商店最便宜道具價（從 `ITEMS` 取有 `price` 者的最小值），避免之後調價讓「窮」變得比買得起的東西還低。
  - 測試用的存檔物件用 `newSave()`（看 `tests/stars.test.ts` 的做法）再改 `flags`／`coins`／`giverAt`。
- [ ] **Step 2：** `npx vitest run tests/giver.test.ts` 確認失敗。
- [ ] **Step 3：** 實作 `giver.ts` 與 `save.ts` 欄位。
- [ ] **Step 4：** `npx tsc --noEmit`、`npx vitest run` 全過。
- [ ] **Step 5：** commit（中文訊息，例：「金幣爺爺 Task 1：純邏輯與存檔欄位」）。

## Task 2：美術

**Files:** `src/gfx/*`（比照 `src/gfx/starArt.ts` 的 `granny`／`granny2`）、對應的圖樣測試。

- 貼圖 `giver`、`giver2`：16×16 的小老爺爺（金色帽子、白鬍子、手拿一個鼓鼓的錢袋；兩格動畫差在錢袋或帽子上的小閃光）。風格與 `granny` 一致：程式畫的像素圖、簡單可辨認。
- 把兩張圖加進同一份尺寸登記表（`starArt.ts` 裡的 `granny: [16, 16]` 那種），讓現有的圖樣測試涵蓋；不新增光暈（爺爺不用發光）。
- 可用腳本輸出縮圖自己檢查，但不要提交縮圖。
- [ ] 完成：`npx tsc --noEmit`、`npx vitest run` 全過；commit。

## Task 3：World 整合、地圖、台詞、文件

**Files:** `src/data/maps.ts`、`src/data/levels.ts`（`STORY`）、`src/scenes/World.ts`、`tests/giver.test.ts`（加地圖測試）、`tests/layout.test.ts`（如凍結了這三島物件，同步更新並說明）、`README.md`、`AGENTS.md`。

**Interfaces — Consumes：** Task 1 的 `giverVisible`、`nextGiverMap`、`GIVER_REWARD`、`POOR_COINS`；Task 2 的貼圖 `giver`、`giver2`。

- **`maps.ts`**：`ObjKind` 加 `'giver'`。在 `dh`、`gh`、`xh` 各加 `{ id: 'giver', kind: 'giver', x, y, label: '金幣爺爺' }`。座標由實作者自己選：站在可走的空地、離碼頭與星星婆婆（`granny`）各至少 2 格、不在任何物件／碼頭抵達格上、四周至少一格可走（讓孩子走得到）。
- **`levels.ts` 的 `STORY`** 新增（比照 `frogHello` 的寫法，每條一個字串陣列）：
  - `giverHello`：第一次見面，例如 `['呵呵～小朋友，你的口袋空空的呀？', '爺爺到處旅行，專門幫口袋空空的小朋友。']`
  - `giverAsk`：每次，例如 `['答對這一題，爺爺就送你 100 枚金幣！']`
  - `giverNeed`：學過的符號太少，例如 `['等你再多認識一些符號，爺爺再來找你。']`
  - `giverDone`：答對，例如 `['答對了！真厲害！', '送你 100 枚金幣，好好用喔！']`
  - `giverBye`：結束時，例如 `['爺爺要去別的島看看了，下次見～']`
  - 台詞不得出現沒學過的拼音；金額字樣用 `GIVER_REWARD` 組字串時要與常數一致（或在測試裡檢查台詞含「100」）。
- **`World.ts`**：
  - `visible(o)`：在 `showIf`／`hideIf` 檢查之後加 `if (o.kind === 'giver') return giverVisible(G.save, m);`（`m` 為目前地圖 id）。
  - 互動分派加 `case 'giver': return this.useGiver(d);`。
  - 動畫：比照 `granny` 的 `animGranny`，用 `giver`／`giver2` 兩格輪流（不必光暈）。物件圖用 `this.add.image(px + 8, py + 16, 'giver').setOrigin(0.5, 1)` 的同款擺法。
  - `useGiver(d)`（流程）：
    1. 第一次（旗標 `giverMet`）播 `STORY.giverHello`，`setFlag('giverMet')`、`saveGame()`。
    2. `pool = activeSymbols()`；`pool.length < 2` → 說 `STORY.giverNeed` 後直接 return（不發錢、不換島）。
    3. 說 `STORY.giverAsk`；`choose('金幣爺爺的問題', '答對就送你 100 金幣！', ['好，我來答！', '先不要'])`。
    4. 選第 0 項：`makeQuestion({ focus: [], review: pool, allowed: pool, tier, audioReady: audio.audioReadyFor(pool), optionCount: effectiveOptionCount(G.settings.optionCount, G.save.stats), stats: G.save.stats })`，其中 `tier = G.settings.tier === 'auto' ? 3 : G.settings.tier`（`tier 3` 在有音檔時有一半機率出聽音題；沒音檔自動降成看符號）。接著 `await openLessonPick(q.type, q.target, q.options)`（點對才結束、沒有處罰）。完成後 `addCoins(GIVER_REWARD)`、`saveGame()`、`audio.sfx('levelup')`、說 `STORY.giverDone`。
    5. 選「先不要」（第 1 項）：略過出題與發錢。
    6. 兩種情況都說 `STORY.giverBye`，然後 `G.save.giverAt = nextGiverMap(G.save)`、`saveGame()`、`this.refreshObjects()`（爺爺在這張地圖消失）。
  - 確認 `ui.blocking` 成對：用到的 `say`／`choose`／`openLessonPick` 本身已成對，你的程式不要在它們之間 early-return 造成未關閉的 modal；檢查 `useGiver` 所有 return 路徑。
- **測試**（加進 `tests/giver.test.ts`，可參考 `tests/granny.test.ts`）：
  - `dh`、`gh`、`xh` 各有一個 id 為 `giver` 的物件；其格子不在阻擋字元上；沒有其他物件（含碼頭、抵達格 `hub.dock`）占同一格；四鄰至少一格可走。
  - 第 0 關地圖（`village`、`lab`、`b`、`p`）與 `dc1`／`dc2` 沒有 `giver` 物件。
  - 台詞檢查：`STORY.giverHello/giverAsk/giverNeed/giverDone/giverBye` 都是非空陣列、每條非空字串；`giverDone` 文字含 `String(GIVER_REWARD)`。
- **文件**：`AGENTS.md`（結構與慣例新增一條：金幣爺爺 `giver`，三座主島各有一個位置，窮才出現、答對給 100、對話後換島；存檔欄位 `giverAt`、旗標 `giverMet`；純邏輯在 `src/core/giver.ts`）；`README.md` 簡單補一句（比照星星婆婆的寫法，不重複 AGENTS 的內容）。
- [ ] 完成：`npx tsc --noEmit`、`npx vitest run` 全過；`node --check tests/e2e/play.mjs`（沒有改它也確認不壞）；commit。

## 手動確認（給使用者）

爺爺的外觀與出現位置、100 金幣是否合適、「先不要」也換島是否合適、第一次遇到爺爺時的台詞。
