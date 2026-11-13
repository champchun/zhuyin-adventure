# 第五關（翹舌音 ㄓㄔㄕㄖ、火山沙漠）實作計畫

> **For agentic workers:** 使用 superpowers:subagent-driven-development 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-13-retroflex-level-design.md`（必讀）。

**Goal:** 做出第五關：從起始村走「沙漠小路」到主島綠洲鎮 `zh`，怪物島火山沙漠 `z`，熔岩洞窟 `zc1`/`zc2`，教 ㄓㄔㄕㄖ（2+2 節奏）。

**Architecture:** 完全比照第四關（舌面音）的實作方式。**先看第四關怎麼做的**：`git log --oneline` 找 `palatal`／雪花鎮／冰晶洞窟相關 commit，並讀 `src/data/{monsters,levels,maps,symbols,strokes}.ts`、`src/gfx/snowArt.ts`、`tools/gen-dungeon.mjs`、`tests/palatal.test.ts`、`tests/hub.test.ts`、`tests/difficulty.test.ts`、`tests/giver.test.ts`、`tests/e2e/play.mjs` 中 lv4 段落，以及 `docs/superpowers/plans/2026-11-12-palatal-level.md`（舊計畫，對應關係相同）。對應：snow/slide/freeze → web/gulp/roar/sun；snowball/penguin/icebat/icequeen → scorpion/cactusman/mummy/lavabeast；xh/x/xc1/xc2 → zh/z/zc1/zc2；`boss_x` → `boss_z`；旗標 xEntered/xPractice → zEntered/zPractice。**差別**：入口從起始村的「沙漠小路」進綠洲鎮（不是從上一關主島搭船）；主島到怪物島用「沙漠大門」（`stairs`，不是碼頭）；學習節奏 2+2（四個符號）。

## Global Constraints

- 繁體中文（台詞、註解、commit）；commit 結尾必須是 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不動：試煉洞窟 `dc1`/`dc2`、回音／冰晶洞窟與前四關的既有行為。起始村（`village`）**只新增** `desert_road` 與告示牌兩個物件，不改既有地形與物件座標（使用者本次同意）。
- 不得手改 `src/data/mazes.ts`：改 `tools/gen-dungeon.mjs` 設定後執行 `node tools/gen-dungeon.mjs`。
- Windows CRLF 檔案：用 Edit/Read 或會正規化 `\r\n` 的腳本改，不要用含 `\n` 錨點又不處理 CRLF 的腳本。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 都要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 新地形字元要同時加進 `BLOCKED_TILES` 與 `TILE_KEY`；新圖樣要過現有的圖樣測試。
- 產生迷宮的怪物 id 用 `mon1`…；同洞窟兩層同一個 `group`。
- 能力 id 與招式 id 相同（`web`、`gulp`、`roar`、`sun`），`sun` 之後第六關會用，不要改名。
- 完成每個 Task 前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。

## 招式、符號、敵人規格（Task 1 用）

| 項目 | 值 |
|---|---|
| 招式 | `web` 蜘蛛絲 ㄓ power 7；`gulp` 大口吃 ㄔ power 7；`roar` 獅子吼 ㄕ power 8；`sun` 烈日 ㄖ power 8（fx、desc、magicName 自訂，風格比照既有；desc 要提到翹舌或舌頭翹起來的發音差別） |
| `LEARN_STEPS` | 在 ㄒㄑ／ㄐ 之後加 `{symbols:['ㄓ','ㄔ'], flag:'zEntered'}`、`{symbols:['ㄕ','ㄖ'], flag:'zPractice'}` |
| 敵人 | `scorpion` 30 HP／ATK 5（一般）、`cactusman` 32／5（echo）、`mummy` 34／6（echo）、`lavabeast` 42／7（頭目，護盾）。需通過 `tests/difficulty.test.ts` 的「每關遞增」規則（小怪血量下限 > 第四關小怪上限 26；頭目血量 > 32、攻擊 ≥ 6） |
| 戰鬥 | `zpractice`（稻草布偶，教學 guided，學 web、gulp；比照 `xpractice`）、`z1`～`z3` 野怪（`m:z:m1`…）、`boss_z`（lavabeast、`shield:true`、獎勵 abilities:['roar','sun']、旗標 `boss_z`） |
| 關卡 | `LEVELS.z = { id:'z', symbol:'ㄓㄔㄕㄖ', name:'翹舌音島（火山沙漠）', open:true, mapId:'zh', partner:'夥伴' }` |
| 筆順 | `STROKES` 加 ㄓ（教育部標準：①左邊直下再轉右（像 ㄴ）②右邊的直線（上→下）③中間貫穿的直線 ④最下面的橫；記憶檔 `stroke-order-sources.md` 有記錄）、ㄔ、ㄕ、ㄖ（參考 PDF《瑜婷寶貝日記》估座標；commit 訊息註明「估算，待使用者檢查」） |

## Task 1：資料（招式、敵人、關卡、學習進度、筆順）

**Files:** `src/data/monsters.ts`、`src/data/levels.ts`、`src/data/symbols.ts`、`src/data/strokes.ts`、`tests/retroflex.test.ts`（新）、`tests/difficulty.test.ts`、`tests/strokes.test.ts`（如需）。

- [ ] 比照 `tests/palatal.test.ts` 先寫失敗的測試：四個招式存在且符號正確、`needAbility` 與招式 id 一致、四種敵人存在且 `cactusman`/`mummy` 為 echo、`boss_z` 有護盾與 `roar`+`sun` 獎勵、`LEARN_STEPS` 的新兩筆、`LEVELS.z`、ㄓㄔㄕㄖ 筆順存在；`tests/difficulty.test.ts` 加第五關一列（`{ name: '第 4 關（火山沙漠）', smalls: ['scorpion','cactusman','mummy'], boss: 'lavabeast' }`，名稱依現有編號習慣）。
- [ ] 實作資料，讓測試通過；`npx tsc --noEmit`、`npx vitest run` 全過。
- [ ] commit（中文訊息，註明筆順估算）。

## Task 2：圖樣與地形字元

**Files:** `src/gfx/desertArt.ts`（新，比照 `snowArt.ts`）、`src/gfx/` 註冊處、`src/data/maps.ts` 的 `TILE_KEY`／`BLOCKED_TILES`、圖樣測試。

- 需要：沙地、岩地（可走）、綠洲小池（不可走）、仙人掌（地形裝飾，不可走）、棕櫚樹、沙色屋頂與牆（民宅、旅館、商店各一組；研究所不需要）、熔岩（不可走）、駱駝裝飾；物件圖：沙坑（ㄓ 機關，織網後變蜘蛛網橋）、擋路仙人掌（ㄔ 機關，可吃掉消失）、砂岩（ㄕ 機關，可震碎）、流沙（ㄖ 機關，可曬乾）；怪物圖 `en_scorpion`、`en_cactusman`、`en_mummy`、`en_lavabeast`；沙漠小路拱門 `desert_road`（比照 `snow_trail`）。
- 風格：像素圖程式畫，簡單可辨認，比照現有圖樣的寫法與調色；整體偏紅褐橘，和前四關差異大。
- 新字元沿用既有命名習慣，同時加入 `BLOCKED_TILES` 與 `TILE_KEY`（避開已用過的字元，Task 完成時在 AGENTS.md 的地形字元一行補上）。
- [ ] 加圖樣；跑圖樣測試與全部測試；commit。

## Task 3：主島綠洲鎮、怪物島火山沙漠、起始村小路

**Files:** `src/data/maps.ts`、`src/data/levels.ts`（台詞）、`src/core/giver.ts`（`GIVER_HUBS` 加 `'zh'`）、`tests/retroflex.test.ts`（地圖測試）、`tests/giver.test.ts`、`tests/layout.test.ts`（如需）。

- 地圖：`zh`（hub，含旅館 `zh_inn` 25 金幣、商店 `zh_shop`、島民、星星婆婆 `granny`、金幣爺爺 `giver`）、`z`（怪物島：稻草布偶、野怪 `m1`～`m3`、四個機關各一個寶箱：ㄓ 沙坑蜘蛛網、ㄔ 仙人掌、ㄕ 砂岩、ㄖ 流沙，寶箱、告示牌、洞窟入口、回綠洲鎮的出口）。格局要和前四島不同。
- 往來：
  - 起始村 `village` 新增 `desert_road`（`stairs`，貼圖 `desert_road`，`showIf: 'boss_x'`，通 `zh` 的 `road_home` 前一格）與 `desert_sign`（`sign`，`showIf: 'boss_x'`）。位置：起始村某個可走、不在既有物件與抵達格上的空地（避開 `trail_xh`(20,10) 與 `trail_sign_v`(19,10)），選好後在測試中鎖住。
  - 綠洲鎮 `road_home`（`stairs`，貼圖 `desert_road`，通回起始村 `desert_road` 前一格，雙向對得上）、與告示牌。
  - 綠洲鎮 `desert_gate`（`stairs`，通怪物島 `z` 起點）；`z` 有回程 `stairs`。
  - `zh` 的 `hub` 設定（`dock` 欄位視 `MapDef.hub` 型別需要填；若型別要求 `dock` 座標，填綠洲鎮的路口格子）。
- 被打倒會送回綠洲鎮（`visited:zh`）。
- 台詞：島民依進度給暗示（不出現沒學過的拼音）；起始村告示牌說明小路通往綠洲鎮；`STORY` 台詞放進 `levels.ts`。
- 測試：比照 `tests/palatal.test.ts` 與 `tests/hub.test.ts`（物件不在阻擋格、目的地對得上、小路雙向、起點可走到所有物件旁、起始村新增物件不壓既有物件與抵達格、婆婆與爺爺在 `zh` 站位正確）；`GIVER_HUBS` 含 `zh` 的測試更新。
- [ ] 完成並全部測試通過；commit。

## Task 4：熔岩洞窟（產生器）

**Files:** `tools/gen-dungeon.mjs`（+ `.d.mts`）、`src/data/mazes.ts`（產生）、`src/data/maps.ts`（`zc1`／`zc2`）、測試。

- `zc1`／`zc2` 兩層，固定種子 53、59，31×22；樓梯、機關（二樓開關用 `roar`，fx 自訂，外觀改成熔岩閘門）、頭目 `boss_z`、頭目寶箱與前兩個洞窟一致。入口從 `z` 進。地板用岩地、牆用懸崖。
- `mazeObjects` 的 `ice`／`boss` 判斷要擴充成支援第三種主題（沙漠），不要破壞 gc／xc 的行為。
- [ ] 加設定、重跑產生器；`reachReport` 對兩層為綠（把 `zc1`/`zc2` 加進 `tests/dungeon.test.ts`、`tests/mazegen.test.ts`）；同步測試通過；commit。

## Task 5：端對端第五段與文件

**Files:** `tests/e2e/play.mjs`、`.github/workflows/e2e.yml`、`README.md`、`AGENTS.md`。

- `play.mjs`：新增 `lv5` 段（`SECTION=lv5`；`all` 也包含）：用寫進存檔的方式補上前四關進度（比照 lv4 的 inject，加 `boss_x`、`xEntered`、`xPractice`、能力 snow/slide/freeze、introduced ㄒㄑㄐ、`visited:xh`、`cleared` 加 x），從起始村走 `desert_road` 到綠洲鎮，走旅館、怪物島、機關、洞窟兩層、頭目護盾、沙漠小路回起始村。座標用 `objPos`／`tapObj` 動態讀取，不要寫死迷宮座標。斷言 `introduced` 含 ㄓㄔ（練習戰後）與 ㄕㄖ（頭目後）。`node --check` 通過即可。
- `e2e.yml`：矩陣加 `lv5`（push 平行段、每日排程 `all`、workflow_dispatch 的 `section` 選項）；逾時照現有值。
- 文件：README、AGENTS.md 的世界結構、目前內容、旗標（`zEntered`、`zPractice`、`boss_z`）、指令（迷宮種子 53、59）、地形字元新增更新；不新增與前面重複的說明。
- [ ] 完成並 commit。

## 手動確認（給使用者）

新美術（沙地、岩地、仙人掌、沙漠蠍、仙人掌怪、木乃伊、熔岩獸、沙漠小路拱門等）沒人看過；ㄔㄕㄖ 筆順是估算；熔岩洞窟可玩性；起始村沙漠小路的位置；四個機關的順序與提示是否夠清楚。
