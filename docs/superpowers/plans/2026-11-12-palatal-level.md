# 第四關（舌面音 ㄐㄑㄒ、雪山小鎮）實作計畫

> **For agentic workers:** 使用 superpowers:subagent-driven-development 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-12-palatal-level-design.md`（必讀）。

**Goal:** 做出第四關：主島雪花鎮 `xh`、怪物島企鵝冰原 `x`、冰晶洞窟 `xc1`/`xc2`，教 ㄒㄑㄐ，並在打完頭目後多一條「小路」從雪花鎮回到起始村。

**Architecture:** 完全比照第三關（舌根音）的實作方式。**先看第三關怎麼做的**：`git log --oneline` 找 `velar`／蛙鳴灣／回音森林相關 commit，並讀 `src/data/{monsters,levels,maps,symbols,strokes}.ts`、`tools/gen-dungeon.mjs`、`tests/velar.test.ts`、`tests/hub.test.ts`、`tests/difficulty.test.ts`、`tests/e2e/play.mjs` 中 lv3 段落。新東西對應第三關的東西：croak/knock/breath → snow/slide/freeze；froggy/pecker/bat/batking → snowball/penguin(echo)/icebat(echo)/icequeen(shield 頭目)；gh/g/gc1/gc2 → xh/x/xc1/xc2；`boss_g` → `boss_x`；旗標 gEntered/gPractice → xEntered/xPractice。

## Global Constraints

- 繁體中文（台詞、註解、commit）；commit 結尾必須是 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；不要 push。
- 不動：第 0 關內容、試煉洞窟 `dc1`/`dc2`（小朋友已玩過）、回音洞窟與前三關的既有行為（只做必要的連接：蛙鳴灣多一個通往雪花鎮的碼頭、關卡提示文字）。
- 不得手改 `src/data/mazes.ts`：改 `tools/gen-dungeon.mjs` 設定後執行 `node tools/gen-dungeon.mjs`。
- Windows CRLF 檔案：用 Edit/Read 或會正規化 `\r\n` 的腳本改，不要用含 `\n` 錨點又不處理 CRLF 的腳本。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可。
- 任何 `say()`／modal 都要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 一個碼頭只通一個地方；碼頭抵達位置要可走、靠水、旁邊有回程碼頭（`tests/hub.test.ts` 會檢查全部 MAPS）。
- 新地形字元要同時加進 `BLOCKED_TILES` 與 `TILE_KEY`；新圖樣要過現有的圖樣測試。
- 產生迷宮的怪物 id 用 `mon1`…；同洞窟兩層同一個 `group`。
- 完成每個 Task 前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過（遇到暫時性錯誤重跑）。

## 招式、符號、敵人規格（Task 1 用）

| 項目 | 值 |
|---|---|
| 招式 | `snow` 雪花飄 ㄒ power 6；`slide` 企鵝滑 ㄑ power 6；`freeze` 結冰術 ㄐ power 7（fx、desc、magicName 自訂，風格比照既有） |
| `LEARN_STEPS` | 在 ㄍㄎ／ㄏ 之後加 `{symbols:['ㄒ','ㄑ'], flag:'xEntered'}`、`{symbols:['ㄐ'], flag:'xPractice'}` |
| 敵人 | `snowball` 24 HP／ATK 4（一般）、`penguin` 26／4（echo）、`icebat` 26／5（echo）、`icequeen` 32／6（頭目，護盾）。數值必須讓 `tests/difficulty.test.ts` 的「每關遞增」規則通過（必要時微調，但要比第三關同階級更強） |
| 戰鬥 | `xpractice`（稻草布偶，教學 guided，學 snow、slide，旗標 `xPractice` 不同：練習戰完成旗標用 `xPractice`；注意 `xEntered` 是進島旗標）、`x1`～`x3` 野怪（`m:x:m1`…）、`boss_x`（icequeen、`shield:true`、獎勵 abilities:['freeze']、旗標 `boss_x`） |
| 關卡 | `LEVELS.x = { id:'x', symbol:'ㄐㄑㄒ', name:'舌面音島（企鵝冰原）', open:true, mapId:'xh', partner:'夥伴' }` |
| 筆順 | `STROKES` 加 ㄐ、ㄑ、ㄒ（參考 PDF（見記憶檔 stroke-order-sources 的說明與先前 ㄍㄎㄏ 的做法）；座標估算，commit 訊息註明「估算，待使用者檢查」） |

## Task 1：資料（招式、敵人、關卡、學習進度、筆順）

**Files:** `src/data/monsters.ts`、`src/data/levels.ts`、`src/data/symbols.ts`、`src/data/strokes.ts`、`tests/palatal.test.ts`（新）、必要時 `tests/difficulty.test.ts`、`tests/strokes.test.ts`。

- [ ] 比照 `tests/velar.test.ts` 先寫失敗的測試：三個招式存在且符號正確、`needAbility` 與招式 id 一致、四種敵人存在且 `penguin`/`icebat` 為 echo、`boss_x` 有護盾與 `freeze` 獎勵、`LEARN_STEPS` 的新兩筆、`LEVELS.x`、ㄐㄑㄒ 筆順存在。
- [ ] 實作資料，讓測試通過；`npx tsc --noEmit`、`npx vitest run` 全過。
- [ ] commit（中文訊息）。

## Task 2：圖樣與地形字元

**Files:** `src/gfx/*`（依現有結構）、`src/data/maps.ts` 的 `TILE_KEY`／`BLOCKED_TILES`、圖樣測試。

- 需要：雪地、冰面（可走）、結冰的小池（不可走，一種水格）、雪堆（物件：有雪／已吹開兩種）、薄冰面石頭物件（沿用 `rock` 的流程，換雪色外觀可選）、冰橋（河面凍成的橋；`gimmick` 啟動後顯示）、企鵝／雪球怪／冰晶蝙蝠／冰晶王的怪物圖、雪色屋頂與牆（四種房子換雪色：民宅、旅館、商店、研究所不需要）、枯樹與雪人裝飾。
- 風格：像素圖程式畫，簡單可辨認，比照現有圖樣的寫法與調色。
- [ ] 加圖樣；新字元同時加入 `BLOCKED_TILES` 與 `TILE_KEY`；跑圖樣測試與全部測試；commit。

## Task 3：主島雪花鎮、怪物島企鵝冰原與碼頭、小路

**Files:** `src/data/maps.ts`、`src/data/levels.ts`（台詞）、`tests/palatal.test.ts`（地圖測試）、`tests/layout.test.ts`（如需）。

- 地圖：`xh`（hub，含旅館 `xh_inn` 25 金幣、商店 `xh_shop`、島民、兩個碼頭）、`x`（怪物島：稻草布偶、野怪、三個機關：雪堆(ㄒ，`snow`)、薄冰面石頭(ㄑ，`slide`)、河上冰橋(ㄐ，`freeze`；對岸寶箱，橋後面另一個寶箱)、寶箱、告示牌、洞窟入口、碼頭）。格局要和前三島不同。
- 碼頭：`gh` 加 `dock_xh`（`showIf: boss_g`，通雪花鎮）；`xh` 兩個碼頭（回蛙鳴灣 `gh`、去怪物島 `x`）；`x` 一個回雪花鎮。遵守一個碼頭一個目的地、抵達位置可走並有回程碼頭。
- **小路**：打倒 `boss_x` 之後，雪花鎮出現一條小路（`door` 或 `stairs` 類出口物件，`showIf: 'boss_x'`，標籤「雪地小路」），通往起始村（`village`）某個可走位置；要在起始村的 `village` 地圖上選一個靠近東邊／碼頭、可走、不動到第 0 關既有物件與地形的出口點作為抵達處（不新增物件、只是抵達座標），台詞說明這是回家的捷徑。這條小路是單向（回雪花鎮要搭船），在台詞提到；測試檢查：目的地地圖存在、抵達格可走、不壓在物件上。
- 台詞：島民依進度給暗示（不出現沒學過的拼音）；蛙鳴灣原本「還沒有下一關」的提示改成指向碼頭；雪花鎮 `homeMap` 規則生效（`visited:xh`）。
- [ ] 比照 `tests/hub.test.ts`、`tests/velar.test.ts` 寫地圖完整性測試（物件不在阻擋格、目的地對得上、碼頭、起點可走到所有物件旁、小路）；實作；全部測試過；commit。

## Task 4：冰晶洞窟（產生器）

**Files:** `tools/gen-dungeon.mjs`（+ `.d.mts`）、`src/data/mazes.ts`（產生）、`src/data/maps.ts`（`xc1`／`xc2` 從 `MAZES` 取格子）、測試。

- `xc1`／`xc2` 兩層，固定種子（避免和既有種子 11、23 以及舊洞窟衝突，例如 37、41），31×22。樓梯、機關（二樓開關用 `slide`，`fx` 自訂，樹洞改成冰面開關外觀）、頭目 `boss_x`、頭目寶箱與回音洞窟一致。入口從 `x` 進。
- [ ] 加設定、重跑產生器；`reachReport` 對兩層為綠（比照 `tests/dungeon.test.ts`、`tests/mazegen.test.ts` 的檢查，把 `xc1`/`xc2` 加進去）；同步測試通過；commit。

## Task 5：端對端第四段與文件

**Files:** `tests/e2e/play.mjs`、`.github/workflows/e2e.yml`、`README.md`、`AGENTS.md`。

- `play.mjs`：新增 `lv4` 段（`SECTION=lv4`；`all` 也包含）：用寫進存檔的方式補上前三關進度（比照 lv3 的 inject，加 `boss_g`、`gEntered`、`gPractice`、能力 croak/knock/breath、introduced ㄍㄎㄏ、`visited:gh`、`cleared` 加 g），從 `gh` 搭船到雪花鎮，走旅館、怪物島、三個機關、洞窟兩層、頭目護盾、小路回起始村。座標用 `objPos`／`tapObj` 動態讀取，不要寫死迷宮座標。斷言 `introduced` 含 ㄒㄑ（練習戰後）與 ㄐ（頭目後）。`node --check` 通過即可。
- `e2e.yml`：三段平行改成四段（加 `lv4`）。
- 文件：README、AGENTS.md 的世界結構、目前內容、旗標、指令（迷宮種子）更新；不新增與前面重複的說明。
- [ ] 完成並 commit。

## 手動確認（給使用者）

新美術（雪地、冰面、企鵝、雪球怪、冰晶王等）沒人看過；ㄐㄑㄒ 筆順是估算；冰晶洞窟可玩性；小路出口位置。
