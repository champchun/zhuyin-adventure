# 第二階段第三關（第九關）：友善鬼屋古堡（ㄞ ㄟ ㄠ ㄡ）

日期：2026-11-18　狀態：使用者已確認方向（友善鬼屋古堡風格、掃帚、月光墓園島、頭目幽靈伯爵），其餘細節為我的建議，待使用者審閱本文件
上位文件：`docs/superpowers/specs/2026-11-17-stage2-overview-design.md`；前一關：`2026-11-17-amusement-level-design.md`（第八關，本關大部分做法照抄，只寫差異）。

## 背景與目標

- 第八關教了 ㄚㄛㄜㄝ。本關教 **ㄞ ㄟ ㄠ ㄡ**，只教「認識」：看符號、聽音、描筆順，不教拼音。
- 結構沿用第八關：主島、怪物島、一個兩層迷宮、一個護盾頭目、回家魔法陣。
- 入口是世界地圖大廳的第三扇門（`gate9`）。**打倒第八關的小丑魔術師（旗標 `boss_a`）後才開放**，沒打倒時維持擋路並說明原因。
- 風格是「友善鬼屋」：萬聖節氣氛，但全部可愛、不嚇人（南瓜、蝙蝠、害羞的幽靈）。

## 已確認的決策

| 項目 | 決定 |
|---|---|
| 主題 | 友善鬼屋古堡（橘紫色調、南瓜、蝙蝠、蜘蛛網） |
| 路線 | 大廳 `gate9` → 南瓜鎮 `ch`（主島）→ 掃帚 → 月光墓園島 `c`（怪物島）→ 古堡 `cc1`／`cc2` → 幽靈伯爵 |
| 學習節奏 | 2 + 2：進墓園島先教 ㄞㄟ，打完練習戰學會 ㄞㄟ 的招式並開始教 ㄠㄡ，打倒頭目學會 ㄠㄡ 的招式 |
| 小王 | 不加 |
| 頭目 | 幽靈伯爵（護盾） |
| 筆順 | ㄞㄟㄠㄡ 尚無教育部步驟圖，**先不加進 `STROKES`**（沒有筆順的符號寫字施法直接通過）；使用者之後提供圖再補，不憑印象估（已被取代：ㄞㄟㄠㄡ 筆順已依使用者提供的教育部步驟圖加入 STROKES，tests/strokes.test.ts 的 EXPECTED 與互動物件數同步更新） |

## 學習流程與招式

| 符號 | 怎麼學到 | 招式（id／名稱／魔法名） | 機關 |
|---|---|---|---|
| ㄞ | 進墓園島後先打稻草人偶的練習戰（教學戰）。`LEARN_STEPS`：`['ㄞ','ㄟ']`，旗標 `cEntered`（已存在） | `chill` 發抖（發抖魔法）：「ㄞ」嘴巴張開再往兩邊收，像說「愛」 | 蜘蛛網，嚇跑蜘蛛後旁邊冒出寶箱 |
| ㄟ | 同上 | `tickle` 咯咯笑（搔癢魔法）：「ㄟ」嘴角往兩邊拉開 | 暗暗的南瓜燈，笑一笑點亮，旁邊冒出寶箱；古堡二樓的開關用它 |
| ㄠ | 練習戰完成後開始教（`LEARN_STEPS`：`['ㄠ','ㄡ']`，旗標 `cPractice`，已存在）；打倒頭目後學會招式 | `howl` 嗷嗚（嗷嗚魔法）：「ㄠ」嘴巴圓圓往前，像「嗷」 | 壞掉的吊橋，吹起來搭成橋，通過水溝到對岸 |
| ㄡ | 同上 | `hoot` 呦呦叫（貓頭鷹魔法）：「ㄡ」嘴巴嘟起，像貓頭鷹「呦」 | 鬼門，叫開後隱藏的寶箱出現 |

- 威力：ㄞ 12、ㄟ 12、ㄠ 13、ㄡ 13（比第八關再高一級）。
- 招式資料比照現有招式：`MoveDef`、`needAbility`、`gimmick` 的 `ability`；能力 id 與招式 id 相同；`fx` 同 id（`chill`、`tickle`、`howl`、`hoot`）。每個招式都要有說明文字（怎麼擺嘴型）。魔法名不得和既有招式重複。
- **能力取得**：練習戰獎勵 `abilities: ['chill','tickle']`、旗標 `cPractice`；頭目 `boss_c` 獎勵 `abilities: ['howl','hoot']`、旗標 `boss_c`。
- **死結守門**：古堡二樓開關用 `tickle`（南瓜燈，練習戰就學到）；`howl`／`hoot` 的機關只放在頭目之後；通往 `boss_c` 之路所需能力全部在頭目之前取得，以測試守住；`cave` 要練習戰之後才出現（`showIf: 'cPractice'`）。
- 蜘蛛網（ㄞ）與南瓜燈（ㄟ）各有一個寶箱，放在機關旁邊的空地、啟動後才出現（`showIf`），不得被圍成口袋。

## 場景與地圖

地圖字元走 skin：新增 `SKINS.haunt`，本關新地圖（`ch`、`c`、`cc1`、`cc2`）設 `skin: 'haunt'`（室內旅館與商店 `ch_inn`／`ch_shop` 沿用預設室內地形、不設 skin）；不得再往預設 skin 加字元。`haunt` 的擋路字元表與 `park` 相同（`'#RO~hHiIkKDW'`）。

### 大廳

- `gate9`：現在是擋路的 `barrier`。拆成兩個同格物件：`gate9`（`barrier`，`hideIf: 'boss_a'`，`lockText` 說明「要先打倒第八關的小丑魔術師，這扇門才會開」）與 `gate9_open`（`stairs`，貼圖 `haunt_gate`，`showIf: 'boss_a'`，通往南瓜鎮抵達格，標籤「古堡」）。`gate10` 不動。

### 主島「南瓜鎮」（`ch`，室內 `ch_inn`、`ch_shop`）

- 一座南瓜造型房子的小鎮：南瓜燈、蜘蛛網圍欄、鬼屋風民宅。`hub`、旅館（25 金幣）、商店、島民、星星婆婆、金幣爺爺（`GIVER_HUBS` 加 `'ch'`）。
- 古堡大門 `stairs`（貼圖 `haunt_gate`）回大廳；掃帚停靠處（`dock`，`vehicle: 'broom'`，貼圖 `broom`）通往月光墓園島，雙向。沒有海面碼頭。
- 旅館老闆與店員台詞要有南瓜鎮特色，各有自己的招呼與道別，招呼第一句提到「南瓜鎮」，招呼有提到藥水或魔力果（商店）。
- 被打倒送回南瓜鎮（旗標 `visited:ch`）。

### 怪物島「月光墓園島」（`c`）

- 進島：稻草人偶（練習戰，教 ㄞㄟ）、三種小怪、機關（蜘蛛網 ㄞ、南瓜燈 ㄟ 各一個寶箱；吊橋 ㄠ 與鬼門 ㄡ 要頭目之後）、一條水溝（缺口一格，吊橋）、告示牌、掃帚停靠處（回南瓜鎮）、通往古堡的入口 `cave`（`showIf: 'cPractice'`）。
- 吊橋（`gimmick`，`passable`，貼圖 `drawbridge_gap`／`drawbridge`）架在水溝缺口上，對岸有兩個寶箱；鬼門（`gimmick`，貼圖 `ghost_door`／`ghost_door_open`，不 `vanish`／`passable`）旁邊有一個 `showIf: 'g:c:ghostdoor'` 的寶箱。圖樣要畫滿整格。

### 古堡（`cc1`、`cc2`，產生器）

- 兩層，固定種子 **101、103**（避開既有 11、23、37、41、53、59、67、71、79、83、89、97），31×22；`tools/gen-dungeon.mjs` 新增 `cc1`／`cc2`，輸出 `src/data/mazes.ts`；既有十二個迷宮內容一格都不能變（重新產生後 `git diff` 只能新增 `cc1`、`cc2` 與型別宣告）。
- 結構與前面一致：樓梯、鑰匙、鎖門、隱藏房間（裂石）、二樓機關、擋路牆、巡邏／追擊怪、頭目與頭目寶箱、回家魔法陣。
- `mazeObjects` 主題判斷擴充（`mapId.startsWith('c')` → `'haunt'`；注意 `cc1`／`cc2` 以 `cc` 開頭，不能與其他主題前綴衝突）：牆、機關台詞、機關貼圖；二樓開關是**南瓜燈**（`gimmick`，貼圖 `pumpkin_dark`／`pumpkin_lit`，`ability: 'tickle'`，`fx: 'tickle'`，打開後 `barrier1` 消失）。迷宮地形由 `hauntRows` 把原始格子轉成 `haunt` skin 的字元（牆擋路、地板可走）。
- 兩層共用 `group: 'cc'`；怪物 id 用 `mon1`…；回家魔法陣 `CIRCLE_HOME.cc` → 南瓜鎮旅館門外一格，`showIf: 'boss_c'`。

## 戰鬥

強度要過 `tests/difficulty.test.ts`（小怪血量下限須高於上一關小怪血量上限 52、攻擊下限不低於上一關上限 9；頭目血量高於上一關頭目 66、攻擊不低於 10）：

| 敵人 | id | 血量／攻擊 | 備註 |
|---|---|---|---|
| 蝙蝠怪 | `batty` | 54／9 | 一般 |
| 南瓜怪 | `pumpkinmon` | 56／9 | 回音怪 |
| 骷髏兵 | `skeleton` | 58／10 | 回音怪 |
| 幽靈伯爵 | `ghostcount` | 74／11 | 頭目，`shield: true` |
| 稻草人偶 | `scarecrowdummy` | 8／1 | 練習用，沿用稻草布偶貼圖（只換名字），不算進難度表 |

- `tests/difficulty.test.ts` 的 `LEVELS` 加 `{ name: '第 9 關（古堡）', smalls: ['batty','pumpkinmon','skeleton'], boss: 'ghostcount' }`。
- 戰鬥 id：`cpractice`（教學戰，`guided`，`focus: ['ㄞ','ㄟ']`，獎勵 `chill`＋`tickle` 並設 `cPractice`）、`c1`～`c3`（野生，`c1`／`c2` 不考 ㄠㄡ，`c3` 才有）、`cc1m`…（迷宮小怪，旗標 `m:cc1:mon1`…）、`boss_c`（頭目：`focus: ['ㄠ','ㄡ','ㄞ','ㄟ']`，`review: ['ㄚ','ㄛ','ㄜ','ㄝ','ㄧ','ㄨ','ㄩ']`，`shield: true`，3 個小回合，`penalty: true`，獎勵 `abilities: ['howl','hoot']`、旗標 `boss_c`、`items: { potion: 2, berry: 2 }`）。
- 戰鬥規則沿用既有實作，不改邏輯。

## 交通工具

新增 `vehicle: 'broom'`：`MapObj.vehicle` 型別加 `'broom'`；`World.useDock` 乘坐文字（「騎掃帚去……？」「起飛 🧹」「騎掃帚不用錢。」）；貼圖 `broom`；兩邊停靠處互為抵達、雙向。

## 設定與教學資料

- 不需要設定升級；`LEARN_STEPS` 的 `cEntered`、`cPractice` 已存在，遊戲中進入 `c` 地圖時設 `cEntered`（比照 `aEntered`），練習戰獎勵設 `cPractice`。
- `LEVELS.c`（符號 `ㄞㄟㄠㄡ`、名稱「古堡」、`open: true`、`mapId: 'ch'`）。
- 新旗標：`cEntered`、`cPractice`、`boss_c`、`visited:ch`。存檔格式不變。

## 資料與程式

- `maps.ts`：新增 `ch`、`ch_inn`、`ch_shop`、`c`、`cc1`、`cc2`；大廳 `gate9` 拆成 barrier＋stairs；`SKINS.haunt`；`CIRCLE_HOME` 加 `cc`；`MazeId` 加 `cc1`／`cc2`；`MapObj.vehicle` 加 `'broom'`；`MapObj.fx` 與 `MoveDef.fx` 加 `'chill' | 'tickle' | 'howl' | 'hoot'`。
- `monsters.ts`：四個招式（三隻初始夥伴的 `moves` 都加）、五種敵人。`levels.ts`：`LEVELS.c`、新戰鬥與獎勵、劇情台詞（草稿由我寫，使用者潤飾）。
- `src/core/giver.ts`：`GIVER_HUBS` 加 `'ch'`；`tests/giver.test.ts`、`tests/granny.test.ts` 同步。
- `src/gfx`：新檔 `hauntArt.ts`（比照 `parkArt.ts`，不依賴 Phaser）：地形、物件圖樣（蜘蛛網／被嚇跑、南瓜燈暗／亮、吊橋缺口／橋、鬼門關／開、掃帚、古堡大門）、四隻敵人像素圖，並在 `monsterArt.ts` 註冊。缺口與橋的圖樣要畫滿整格。
- `tools/gen-dungeon.mjs`（及 `.d.mts`）：新增 `cc1`／`cc2`（種子 101、103）。
- `World.ts`：新特效（`gimmickFx`）、掃帚乘坐、進入 `c` 時設 `cEntered`；`Battle.ts`：`playFx` 四個新特效。
- 音檔：`audioMap` 已有 ㄞㄟㄠㄡ 且檔案齊全。

## 測試

- **單元**：比照第八關：新地圖資料完整性（尺寸、起點可走、物件不重疊、抵達格可走、寶箱不被圍住）；掃帚雙向；大廳 `gate9` 有無 `boss_a` 時的 `barrier`／`gate9_open` 可見性；`reachReport` 對 `cc1`／`cc2` 為綠，用練習戰之後的能力（含 `chill`、`tickle`，不含 `howl`、`hoot`）頭目可達，沒有 `tickle` 時二樓開關後的路不可達；吊橋對岸寶箱沒有 `howl` 走不到；新招式、敵人、`LEVELS` 與 `difficulty.test.ts`；`mazegen.test.ts` 同步且既有迷宮內容不變；`haunt` skin 每個字元有貼圖、擋路符合預期；迷宮原始格子擋路與 `isBlockedTile` 一致；`GIVER_HUBS` 含 `ch`；旅館與商店台詞各有南瓜鎮特色且納入 `allVoiceLines`；ㄠㄡ 學會（`cPractice`）之前，台詞、告示牌與機關提示不出現 ㄠㄡ；`strokes.test.ts` 不變（本關沒有新筆順）（已被取代：ㄞㄟㄠㄡ 筆順已依使用者提供的教育部步驟圖加入 STROKES，tests/strokes.test.ts 的 EXPECTED 與互動物件數同步更新）。
- **端對端**：新增 `lv9` 段（`SECTION=lv9`），比照 `lv8`；`e2e.yml` 矩陣加 `lv9`；不併入 `all`。不在本機跑，只做 `node --check`。
- **手動確認**：新美術、迷宮、招式動畫的感覺，交給使用者實際玩過後回饋。

## 風險

- 美術量大，先以簡單可辨認為主。
- 四個招式、四個機關，位置要避免擋住寶箱或擠在一起，用測試守住。
- 招式意象（嘴型）是我設計的，使用者看過後可再調。
- 第八關端對端 `lv8` 尚未在 CI 驗證，若失敗，`lv9` 的類似寫法要一併修。
- ㄞㄟㄠㄡ 筆順待使用者提供圖；在那之前寫字施法會直接通過。

## 拆成階段

- **階段 9a**：招式、敵人、關卡與戰鬥資料、`difficulty.test.ts`、`LEVELS.c`、敵人像素圖。
- **階段 9b**：`haunt` skin 與圖樣、地圖、迷宮產生與主題、大廳 `gate9`、掃帚、特效、劇情台詞、婆婆與爺爺位置。
- **階段 9c**：端對端 `lv9`、文件（README、AGENTS）。
