# 第二階段第二關（第八關）：遊樂園（ㄚ ㄛ ㄜ ㄝ）

日期：2026-11-17　狀態：使用者已確認方向（遊樂園主題、四個招式對應嘴型、頭目小丑魔術師、2+2 學習節奏），其餘細節為我的建議，待使用者審閱本文件
上位文件：`docs/superpowers/specs/2026-11-17-stage2-overview-design.md`；前一關：`2026-11-17-underwater-level-design.md`（第七關，本關大部分做法照抄，只寫差異）。

## 背景與目標

- 第七關教了 ㄧㄨㄩ。本關教 **ㄚ ㄛ ㄜ ㄝ**，只教「認識」：看符號、聽音、描筆順，不教拼音。
- 結構沿用第七關：主島、怪物島、一個兩層迷宮、一個護盾頭目、回家魔法陣。
- 入口是世界地圖大廳的第二扇門（`gate8`）。**打倒第七關的大章魚（旗標 `boss_u`）後才開放**，沒打倒時維持擋路，並說明原因。

## 已確認的決策

| 項目 | 決定 |
|---|---|
| 主題 | 遊樂園（繽紛、帳篷、彩旗、旋轉木馬） |
| 路線 | 大廳 `gate8` → 歡樂廣場（主島）→ 小火車 → 歡樂島（怪物島）→ 鏡子迷宮 → 小丑魔術師 |
| 學習節奏 | 2 + 2，比照第四關（ㄓㄔㄕㄖ）：進歡樂島先教 ㄚㄛ，打完練習戰學會 ㄚㄛ 的招式並開始教 ㄜㄝ，打倒頭目學會 ㄜㄝ 的招式 |
| 小王 | 不加 |
| 頭目 | 小丑魔術師（護盾） |
| 筆順 | ㄚ（3 畫）、ㄛ（2 畫）、ㄜ（2 畫）、ㄝ（3 畫）已依教育部步驟圖加入 `src/data/strokes.ts`（commit：筆順：新增 ㄚㄛㄜㄝ） |

## 學習流程與招式

| 符號 | 怎麼學到 | 招式（id／名稱／魔法名） | 機關 |
|---|---|---|---|
| ㄚ | 進歡樂島後先打彩球人偶的練習戰（教學戰）。`LEARN_STEPS`：`['ㄚ','ㄛ']`，旗標 `aEntered`（已存在） | `shout` 大聲喊（呼喊魔法）：「ㄚ」嘴巴張得大大的 | 睡著的旋轉木馬，喊醒後轉起來，旁邊冒出寶箱；鏡子迷宮二樓的**大鑼開關**也用它 |
| ㄛ | 同上 | `inflate` 吹氣球（氣球魔法）：「ㄛ」嘴巴圓圓的、不大 | 洩氣的大氣球，吹大後旁邊冒出寶箱 |
| ㄜ | 練習戰完成後開始教（`LEARN_STEPS`：`['ㄜ','ㄝ']`，旗標 `aPractice`，已存在）；打倒頭目後學會招式 | `honk` 鵝鵝叫（鵝叫魔法）：「ㄜ」嘴巴微開、放鬆，像鵝叫 | 摩天輪，叫醒後車廂排成一座橋，通過水溝到對岸 |
| ㄝ | 同上 | `cheer` 歡呼（歡呼魔法）：「ㄝ」嘴角微微拉開，像喊「耶！」 | 煙火筒，點燃後隱藏的寶箱出現 |

- 威力：ㄚ 11、ㄛ 11、ㄜ 12、ㄝ 12（比第七關的 10、10、11 再高一級）。
- 招式資料比照現有招式：`MoveDef`、`needAbility`、`gimmick` 的 `ability`；能力 id 與招式 id 相同；`fx` 同 id（`shout`、`inflate`、`honk`、`cheer`）。每個招式都要有說明文字（怎麼擺嘴型）。魔法名不得和既有招式重複（既有：獅子吼、泡泡魔法、吐泡魔法 等）。
- **能力取得**：練習戰獎勵 `abilities: ['shout','inflate']`、旗標 `aPractice`；頭目 `boss_a` 獎勵 `abilities: ['honk','cheer']`、旗標 `boss_a`。
- **死結守門**（第五關的教訓）：鏡子迷宮二樓開關用 `shout`（練習戰就學到）；`honk`／`cheer` 的機關只放在頭目之後（摩天輪橋與煙火筒在歡樂島，頭目之後才解得開）；通往 `boss_a` 之路所需能力全部在 `boss_a` 之前取得，以測試守住；`cave` 要練習戰之後才出現（`showIf: 'aPractice'`）。

## 場景與地圖

地圖字元走 skin：新增 `SKINS.park`（遊樂園外觀表），本關新地圖（`ah`、`ah_inn`、`ah_shop`、`a`、`ac1`、`ac2`）設 `skin: 'park'`（室內旅館與商店沿用預設室內地形、不設 skin）；**不得再往預設 skin 的 `TILE_KEY`／`BLOCKED_TILES` 加字元**，查地形用 `isBlockedTile`／`tileKeyOf`。

### 大廳

- `gate8`：現在是擋路的 `barrier`。改成兩個物件：`gate8`（`barrier`，`hideIf: 'boss_u'`，`lockText` 說明「要先打倒第七關的大章魚，這扇門才會開」）與 `gate8_open`（`stairs`，貼圖 `park_gate`，`showIf: 'boss_u'`，通往歡樂廣場的抵達格，標籤「遊樂園」），兩者同一格（比照起始村的氣球：`balloon_empty`／`balloon`）。`gate9`、`gate10` 不動。

### 主島「歡樂廣場」（`ah`，室內 `ah_inn`、`ah_shop`）

- 遊樂園的中央廣場：彩旗、噴水池、帳篷屋。`hub`（`dock` 抵達格、被打倒時送回）、旅館（25 金幣，帳篷旅館）、商店（糖果屋）、島民、星星婆婆、金幣爺爺（`GIVER_HUBS` 加 `'ah'`）。
- 遊樂園大門：`stairs`（貼圖 `park_gate`）回大廳 `gate8` 下方的小路；小火車站（`dock`，`vehicle: 'train'`，貼圖 `train`）通往歡樂島；小火車是雙向的。
- 旅館老闆台詞要有遊樂園的特色（每間旅館自己的招呼與道別），草稿：招呼「歡迎光臨歡樂廣場帳篷旅館！」「這裡的床是旋轉木馬形狀的，睡著了還會輕輕搖晃喔。」「住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。」；道別「睡得好嗎？夥伴們都精神飽滿了！」「叮叮噹噹～歡迎再來玩！」
- 被打倒會送回歡樂廣場（`homeMap`，旗標 `visited:ah`）。

### 怪物島「歡樂島」（`a`）

- 進島：彩球人偶（練習戰，教 ㄚㄛ）、三種小怪、機關（旋轉木馬 ㄚ、洩氣的氣球 ㄛ 各一個寶箱，寶箱放在機關旁邊的空地、啟動後才出現；摩天輪 ㄜ 與煙火筒 ㄝ 要頭目之後）、一條水溝（缺口一格，摩天輪橋）、告示牌、小火車站（回廣場）、通往鏡子迷宮的入口 `cave`（`showIf: 'aPractice'`）。
- 摩天輪（`gimmick`，`passable`，貼圖 `ferris_gap`／`ferris_bridge`）架在水溝缺口上，對岸有兩個寶箱；煙火筒（`gimmick`，貼圖 `fireworks_cannon`／`fireworks_lit`，不 `vanish`／`passable`）旁邊有一個 `showIf: 'g:a:fireworks'` 的寶箱。機關與旋轉木馬、氣球一樣啟動後留在原地換圖，寶箱不得被圍成口袋。

### 鏡子迷宮（`ac1`、`ac2`，產生器）

- 兩層，固定種子 **89、97**（避開 11、23、37、41、53、59、67、71、79、83），31×22；`tools/gen-dungeon.mjs` 新增 `ac1`／`ac2`，輸出 `src/data/mazes.ts`；既有十個迷宮（gc／xc／zc／sc／uc）在 `mazes.ts` 的內容一格都不能變（重新產生後 `git diff` 只能新增 `ac1`、`ac2` 與型別宣告）。
- 結構與前面洞窟一致：樓梯、鑰匙、鎖門、隱藏房間（裂石）、二樓機關、擋路牆、巡邏／追擊怪、頭目與頭目寶箱、頭目打倒後的回家魔法陣。
- `mazeObjects` 主題判斷擴充（`mapId.startsWith('a')` → `'park'`）：牆、機關台詞、機關貼圖；二樓開關是**大鑼**（`gimmick`，貼圖 `gong`／`gong_hit`，`ability: 'shout'`，`fx: 'shout'`，打開後 `barrier1` 消失）；不得破壞既有五種主題。迷宮地形由 `parkRows` 把產生器的原始格子轉成 `park` skin 的字元（牆擋路、地板可走，地基的守門測試會檢查）。
- 兩層共用 `group: 'ac'`；產生的怪物 id 用 `mon1`…；回家魔法陣 `CIRCLE_HOME.ac` → 歡樂廣場旅館門外一格，`showIf: 'boss_a'`。

## 戰鬥

- 新敵人（強度要過 `tests/difficulty.test.ts`：每關小怪血量下限必須高於上一關小怪血量上限 46、攻擊下限不低於上一關上限 8；頭目血量高於上一關頭目 58、攻擊不低於 9）：

| 敵人 | id | 血量／攻擊 | 備註 |
|---|---|---|---|
| 氣球怪 | `balloony` | 48／8 | 一般 |
| 玩具兵 | `toysoldier` | 50／8 | 回音怪 |
| 彈簧盒小丑 | `jackbox` | 52／9 | 回音怪 |
| 小丑魔術師 | `clownking` | 66／10 | 頭目，`shield: true` |
| 彩球人偶 | `ballpuppet` | 8／1 | 練習用，沿用稻草布偶的貼圖（只換名字），不算進難度表 |

- `tests/difficulty.test.ts` 的 `LEVELS` 加一列 `{ name: '第 7 關（遊樂園）', smalls: ['balloony','toysoldier','jackbox'], boss: 'clownking' }`。
- 戰鬥 id：`apractice`（教學戰，`guided`，`focus: ['ㄚ','ㄛ']`，獎勵 `shout`＋`inflate` 並設 `aPractice`）、`a1`～`a3`（野生，旗標 `m:a:m1`…，`a1`／`a2` 不考 ㄜㄝ（還沒學），`a3` 才有）、`ac1m`／`ac1m2`／`ac1m3`／`ac1m4`／`ac2m`／`ac2m2`／`ac2m3`（沉船同款的迷宮小怪，旗標 `m:ac1:mon1`…）、`boss_a`（頭目：`focus: ['ㄜ','ㄝ','ㄚ','ㄛ']`，`review: ['ㄧ','ㄨ','ㄩ','ㄗ','ㄘ','ㄙ']`，`shield: true`，3 個小回合，`penalty: true`，獎勵 `abilities: ['honk','cheer']`、旗標 `boss_a`、`items: { potion: 2, berry: 2 }`）。
- 戰鬥規則（回音怪、頭目護盾）沿用既有實作，不改邏輯。第一次認識符號的小課程：學會 ㄚㄛ（練習戰後）、學會 ㄜㄝ（打倒頭目後）各上一次課，沿用既有流程。

## 交通工具

- 新增 `vehicle: 'train'`：`MapObj.vehicle` 型別加 `'train'`；`World.useDock` 的乘坐文字（「搭小火車去……？」「出發 🚂」「搭小火車不用錢。」）；貼圖 `train`；小火車站與歡樂島的回程站互為抵達、雙向。

## 設定與教學資料

- **不需要設定升級**（地基已升到 37 個符號）；`LEARN_STEPS` 的 `aEntered`、`aPractice` 已存在，只要在遊戲中設旗標：進入 `a` 地圖時 `aEntered`（比照 `uEntered`）、練習戰獎勵設 `aPractice`。
- `LEVELS.a`（符號 `ㄚㄛㄜㄝ`、名稱「遊樂園」、`open: true`、`mapId: 'ah'`）。
- 新旗標：`aEntered`、`aPractice`、`boss_a`、`visited:ah`。存檔格式不變。

## 資料與程式

- `maps.ts`：新增 `ah`、`ah_inn`、`ah_shop`、`a`、`ac1`、`ac2`；大廳 `gate8` 拆成 barrier＋stairs；`SKINS.park`；`CIRCLE_HOME` 加 `ac`；`MazeId` 加 `ac1`／`ac2`；`MapObj.vehicle` 加 `'train'`；`MapObj.fx` 與 `MoveDef.fx` 加 `'shout' | 'inflate' | 'honk' | 'cheer'`。
- `monsters.ts`：四個招式（`MOVES`，三隻初始夥伴的 `moves` 都加）、五種敵人。
- `levels.ts`：`LEVELS.a`、新戰鬥與獎勵、故事台詞（草稿由我寫，使用者潤飾）。
- `src/core/giver.ts`：`GIVER_HUBS` 加 `'ah'`；`tests/giver.test.ts`、`tests/granny.test.ts` 同步。
- `src/gfx`：新檔 `parkArt.ts`（比照 `seaArt.ts`，不依賴 Phaser）：遊樂園地形約 15 種（磚地、草地、小徑、花圃、彩旗柵欄、噴水池、水溝、帳篷屋民宅／旅館／商店屋頂與牆、鏡牆、迷宮地磚）、物件圖樣（旋轉木馬睡／轉、洩氣氣球／大氣球、摩天輪缺口／橋、煙火筒／點燃、大鑼／敲響、小火車、遊樂園大門）、四隻敵人像素圖（氣球怪、玩具兵、彈簧盒小丑、小丑魔術師），並在 `monsterArt.ts` 註冊。**深水溝缺口與橋的圖樣要畫滿整格**（第七關的教訓）。
- `tools/gen-dungeon.mjs`（及 `gen-dungeon.d.mts`）：新增 `ac1`／`ac2`（種子 89、97）。
- `World.ts`：新特效（`gimmickFx`）、小火車乘坐、進入 `a` 時設 `aEntered`；`Battle.ts`：`playFx` 四個新特效。
- 音檔：`audioMap` 已有 ㄚㄛㄜㄝ（a、o、e、eh）且檔案都在。

## 測試

- **單元**：新地圖資料完整性（尺寸、起點可走、物件不重疊、抵達格可走、物件站在可走格、寶箱不被圍住）；小火車雙向、抵達格緊鄰對面的車站；大廳 `gate8` 在沒有 `boss_u` 時是 `barrier` 且 `gate8_open` 不可見、有 `boss_u` 時相反（用 `visibleWith`）；`reachReport` 對 `ac1`／`ac2` 為綠，用練習戰之後的能力（含 `shout`、`inflate`，不含 `honk`、`cheer`）頭目可達，沒有 `shout` 時二樓開關後的路不可達；守門測試：通往 `boss_a` 之路所需能力全部在頭目之前取得；摩天輪橋對岸寶箱沒有 `honk` 走不到；新招式、敵人、`LEVELS` 與 `difficulty.test.ts`；`mazegen.test.ts` 對 `ac1`／`ac2` 同步，既有迷宮內容不變；`park` skin 每個字元有貼圖、擋路符合預期，每張 `park` 地圖的字元都在 skin 裡；迷宮原始格子擋路與 `isBlockedTile` 一致（地基的守門測試涵蓋 `ac1`／`ac2`）；`GIVER_HUBS` 含 `ah`；旅館老闆台詞提到自己的地名；ㄜㄝ 學會（`aPractice`）之前，台詞、告示牌與機關提示（`text`、`lockText`、`talk`）不出現 ㄜㄝ；所有地圖台詞不得說「所有的注音」都學會了。
- **端對端**：新增 `lv8` 段（`SECTION=lv8`）：寫入第一階段全部進度、`endingSeen` 與第七關進度（`boss_u`、`glow`／`jet`／`pop`），從起始村走到世界地圖、大廳、`gate8`（開著）、歡樂廣場、小火車、歡樂島（練習戰、旋轉木馬 ㄚ、氣球 ㄛ）、鏡子迷宮（含鎖門、裂石、二樓大鑼 `shout`）、小丑魔術師護盾戰；斷言旗標 `aEntered`、`aPractice`、`boss_a`，能力 `shout`／`inflate`／`honk`／`cheer`，回家魔法陣落在歡樂廣場旅館門外；`e2e.yml` 矩陣加 `lv8`；**不併入 `all`**。不在本機跑，只做 `node --check`。
- **手動確認**：新美術、迷宮、ㄚㄛㄜㄝ 筆順與招式動畫的感覺，交給使用者實際玩過後回饋。

## 風險

- 美術量大（地形約 15 種、物件約 10 種、敵人 4 種），先以簡單可辨認為主。
- 四個招式、四個機關，比第七關多，機關位置要避免擋住寶箱或擠在一起，要用測試守住。
- 招式意象（嘴型）是我設計的，使用者在遊戲中看過後可再調。
- 第七關端對端 `lv7` 還沒在 CI 上驗證，如果它失敗，`lv8` 的類似寫法要一併修。

## 拆成階段

- **階段 8a**：招式、敵人、關卡與戰鬥資料、`difficulty.test.ts`、`LEVELS.a`、敵人像素圖。
- **階段 8b**：`park` skin 與圖樣、地圖（`ah`、`a`、室內）、迷宮產生與 `mazeObjects` 遊樂園主題、大廳 `gate8`、小火車、特效、劇情台詞、婆婆與爺爺位置。
- **階段 8c**：端對端 `lv8`、文件（README、AGENTS）。
