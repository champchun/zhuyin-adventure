# 第十關（齒輪鐘塔城 ㄢㄣㄤㄥㄦ，最終關）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans 逐個 Task 執行。設計見 `docs/superpowers/specs/2026-11-18-clocktower-level-design.md`（必讀）。本關幾乎完全照抄第九關：第九關的計畫 `docs/superpowers/plans/2026-11-18-castle-level.md` 與它的程式（`src/gfx/hauntArt.ts`、`tests/hauntmap.test.ts`、`tests/haunt-moves.test.ts`、`tests/haunt-battles.test.ts`、`tests/hauntart.test.ts`、`tests/hauntenemyart.test.ts` 等）是最好的範本，**照抄它們的結構與寫法，把「古堡」資料換成下面「已決定的資料」**。步驟用 `- [ ]` 追蹤。

**Goal:** 做出第二階段最終關「齒輪鐘塔城」：ㄢㄣㄤㄥㄦ 五個符號的招式與機關、齒輪鎮（主島）、發條島（怪物島）、鐘塔（產生的兩層迷宮）、時光守護者（護盾頭目，考全部 16 個韻母）、大廳 `gate10` 通道（打倒第九關頭目後開放）、熱氣纜車、最終關收尾（「注音大師」稱號與第二階段結局），以及端對端 `lv10` 與文件。

**Architecture:** 資料驅動，完全沿用第九關：`MOVES`、`ENEMIES`、`BATTLES`、`MAPS`（`SKINS.clock` 外觀表）、迷宮產生器（種子 107、109）。交通工具新增 `cablecar`。筆順 ㄢㄣㄤㄥㄦ 已由控制者依使用者提供的教育部步驟圖加入 `STROKES`（commit「筆順：新增 ㄢㄣㄤㄥㄦ」），本計畫不用再碰 `strokes.ts`，只需同步 `tests/strokes.test.ts` 的互動物件數。

**Tech Stack:** TypeScript、Vite、Phaser 3、Vitest。

## Global Constraints

- 繁體中文；commit 結尾加 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`；**不要 push**；直接在 main 提交。
- 不得改變第 0～9 關任何地圖的地形、物件、行為，唯一例外是大廳 `gate10`（barrier 拆成 barrier＋stairs）；`dc1`／`dc2` 完全不動；既有十四個迷宮（gc／xc／zc／sc／uc／ac／cc）在 `src/data/mazes.ts` 的內容一格都不能變（重新產生後 `git diff src/data/mazes.ts` 只能新增 `tc1`、`tc2` 與型別宣告）。`mazes.ts` 只能由 `node tools/gen-dungeon.mjs` 產生，不手改。
- **不得再往預設 skin 的 `TILE_KEY`／`BLOCKED_TILES` 加字元**；本關新地圖（`th`、`t`、`tc1`、`tc2`）都設 `skin: 'clock'`（室內 `th_inn`／`th_shop` 沿用預設室內地形、不設 skin）。查地形一律用 `tileKeyOf(map, ch)`／`isBlockedTile(map, ch)`。
- **不要留下「暫時略過」的測試**：任何既有測試因新資料失敗，就依它自己的規則補資料，不放寬規則、不加暫時 `continue`。
- 開工前先 `grep` 確認下列 id 在 repo 裡都還沒被用過：地圖 `th`／`t`／`tc1`／`tc2`／`th_inn`／`th_shop`、招式與能力 `chime`／`crank`／`bark`／`rumble`／`curl`、戰鬥 `tpractice`／`t1`～`t3`／`boss_t`、敵人 `gearbug`／`windup`／`alarmclock`／`timekeeper`／`clockdummy`、`LEVELS` 鍵 `t`、稱號 `title_zhuyin_master`、貼圖 key。若撞名，停下來回報。
- 不要在本機跑端對端（只能 `node --check tests/e2e/play.mjs`）。vitest 偶爾出現「Unhandled Error」且測試數變少，重跑即可（最多三次）。
- 任何 `say()`／modal 要保證 `ui.blocking` 成對；`say([])` 不可為空。
- 不得把未驗證的 TTS 當標準注音單音；沒有音檔時 tier 2／3 降級成看符號配對。
- 不要碰 Azure 金鑰；新語音句子不預先產生（`tools/gen-voice.ts` 由使用者自己執行）。
- 台詞規則：`tPractice` 之前（含 NPC 台詞、告示牌 `text`、機關提示 `lockText`、`talk`），不得出現 `ㄤ`、`ㄥ`、`ㄦ`；**除了最終關結局台詞 `ENDING2_LINES` 之外**，任何地圖台詞不得說「所有的注音」「全部的注音」都學會了。
- repo 沒有 `@types/node`：測試要用 `node:fs` 等時，沿用 `tests/mazegen.test.ts` 的 `// @ts-ignore`。
- 每個 Task 完成前：`npx tsc --noEmit` 乾淨、`npx vitest run` 全過。

## 已決定的資料（逐字照用）

- 招式（`MOVES`，`id`＝能力 id＝`fx`）：

| id | 符號 | 威力 | `name` | `magicName` | `desc` |
|---|---|---|---|---|---|
| `chime` | ㄢ | 14 | 噹噹響 | 鐘聲魔法 | 「ㄢ」嘴巴張開、舌尖輕輕頂住上牙，像說「安」，聲音圓圓亮亮的，像鐘「噹～」地響，能讓停擺的大齒輪轉起來。 |
| `crank` | ㄣ | 14 | 轉發條 | 發條魔法 | 「ㄣ」嘴巴微微張開、舌尖輕輕頂住上牙，像說「恩」，聲音沉沉的，像在轉緊發條，能讓沒發條的八音盒響起來，也能轉動鐘塔裡的大發條。 |
| `bark` | ㄤ | 15 | 昂昂叫 | 昂叫魔法 | 「ㄤ」嘴巴張得大大的，聲音往鼻子後面走，像說「昂」，拉得長長的，能讓壞掉的齒輪橋轉起來，架成一座橋。 |
| `rumble` | ㄥ | 15 | 轟轟響 | 轟鳴魔法 | 「ㄥ」嘴巴微微張開，聲音往鼻子後面走，像說「鞥」，低低的像遠遠的打雷，能把緊閉的鐘樓大門震開。 |
| `curl` | ㄦ | 16 | 捲舌 | 捲舌魔法 | 「ㄦ」舌頭輕輕往後捲，像說「兒」，聲音捲捲的，能轉開轉不動的大鑰匙孔。 |

- 敵人（`ENEMIES`；強度要過 `tests/difficulty.test.ts`：小怪血量下限須高於第九關小怪上限 58、攻擊下限不低於 10；頭目血量須高於 74、攻擊不低於 11）：

| id | 名稱 | 血量／攻擊 | echo | 貼圖 key | scale |
|---|---|---|---|---|---|
| `gearbug` | 齒輪怪 | 60／10 | 否 | `en_gearbug` | 2.25 |
| `windup` | 發條兵 | 62／10 | 是 | `en_windup` | 2.25 |
| `alarmclock` | 鬧鐘怪 | 64／11 | 是 | `en_alarmclock` | 2.25 |
| `timekeeper` | 時光守護者 | 82／12 | 否（頭目，戰鬥設 `shield`） | `en_timekeeper` | 2.75 |
| `clockdummy` | 發條人偶 | 8／1 | 否 | `en_dummy` | 2.25 |

- 地圖 id：`th`（齒輪鎮，主島）、`th_inn`、`th_shop`、`t`（發條島，怪物島）、`tc1`／`tc2`（鐘塔，`group: 'tc'`）；旗標：`tEntered`、`tPractice`、`boss_t`、`visited:th`、`ending2Seen`；戰鬥 id：`tpractice`、`t1`～`t3`、`tc1m`／`tc1m2`／`tc1m3`／`tc1m4`、`tc2m`／`tc2m2`／`tc2m3`、`boss_t`。
- 地形 skin `clock`（字元 → 貼圖 key；擋路集合 `'#RO~hHiIkKDW'`）：

| 字元 | 貼圖 key | 意義 | 擋路 |
|---|---|---|---|
| `.` | `t_clock_floor` | 銅板地 | 否 |
| `,` | `t_clock_moss` | 青銅苔地 | 否 |
| `=` | `t_clock_path` | 銅管小徑 | 否 |
| `f` | `t_tower_floor` | 鐘塔地磚 | 否 |
| `#` | `t_clock_gear` | 大齒輪叢 | 是 |
| `R` | `t_clock_fence` | 黃銅欄杆 | 是 |
| `~` | `t_clock_oil` | 油溝（水溝） | 是 |
| `O` | `t_clock_steam` | 蒸氣池 | 是 |
| `h` / `H` | `t_roof_gear` / `t_wall_gear` | 齒輪屋民宅屋頂／牆 | 是 |
| `i` / `I` | `t_roof_inn_clock` / `t_wall_inn_clock` | 旅館屋頂／牆 | 是 |
| `k` / `K` | `t_roof_shop_clock` / `t_wall_shop_clock` | 商店屋頂／牆 | 是 |
| `D` | `t_door` | 門（既有貼圖） | 是 |
| `W` | `t_tower_wall` | 鐘塔石牆 | 是 |

- 物件貼圖 key：`gear_stuck`、`gear_turning`（大齒輪 停／轉）、`musicbox_still`、`musicbox_play`（八音盒 靜／響）、`gearbridge_gap`、`gearbridge`（水溝缺口／齒輪橋，**畫滿整格**）、`belldoor`、`belldoor_open`（鐘樓大門 關／開）、`keyhole`、`keyhole_open`（鑰匙孔 鎖住／轉開）、`winder_off`、`winder_on`（大發條 停／轉，鐘塔二樓開關用）、`cablecar`（熱氣纜車，纜車站用）、`clock_gate`（鐘塔大門，大廳與主島通道）。
- 最終關：稱號 `title_zhuyin_master`（注意：`title_master` 已是星星婆婆商店的「注音小達人」，不得動它；`RewardDef`：`{ id: 'title_zhuyin_master', type: 'title', cost: 0, name: '注音大師', icon: '👑', free: true }`）、旗標 `ending2Seen`。

---

## Task 1：五隻鐘塔敵人的像素圖

**Files:** `src/gfx/monsterArt.ts`、`tests/clockenemyart.test.ts`（新）。

**Interfaces:** Produces（`MONSTER_ART` 新 key）：`en_gearbug`、`en_windup`、`en_alarmclock`、`en_timekeeper`。**只加圖，不加 `ENEMIES` 資料**（Task 2 才加）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/clockenemyart.test.ts`：照抄 `tests/hauntenemyart.test.ts`，`KEYS` 換成 `['en_gearbug', 'en_windup', 'en_alarmclock', 'en_timekeeper']`，頭目用 `en_timekeeper`。執行 `npx vitest run tests/clockenemyart.test.ts`，預期失敗。
- [ ] **Step 2：實作** 在 `src/gfx/monsterArt.ts` 依第九關四張圖的寫法新增四張像素圖並登記進 `MONSTER_ART`：
  - `en_gearbug`（齒輪怪）：一顆銅色圓齒輪當身體（外圈有小齒）、中間是臉（兩顆圓眼、小笑嘴）、下面四隻細細的小腳；友善。
  - `en_windup`（發條兵）：鐵皮小兵，銅色身體、背後一支大發條鑰匙、圓圓的紅臉頰、肩上扛小旗；站得直直的。
  - `en_alarmclock`（鬧鐘怪）：圓圓的紅色鬧鐘身體、兩顆小鈴鐺在頭頂、白色鐘面當臉（指針是眼睛）、兩隻小腳；表情叫人起床但不兇。
  - `en_timekeeper`（時光守護者，頭目）：高大的銅色鐘錶機器人，胸口一面大鐘（指針指著十二點）、肩上兩個大齒輪、頭上有小鐘罩、藍色發光的眼睛、兩隻鐵手；表情溫和嚴肅；尺寸接近 32×32 且**明顯比小怪大**（面積要比任何小怪至少大 30%，並用測試守住）。
  做完後把四張圖各輸出一張放大 PNG 到 scratchpad（不提交），**實際看過**確認一眼認得出是什麼（Node 沒有轉圖工具時，用 PowerShell `System.Drawing` 把 `monsterRows` 的字串畫成位圖）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/clockenemyart.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第十關：四隻鐘塔敵人的像素圖」。

---

## Task 2：五個招式、特效、敵人與戰鬥資料

**Files:** `src/data/monsters.ts`、`src/data/maps.ts`（`MapObj.fx` 型別）、`src/data/levels.ts`（戰鬥，**不加 `LEVELS.t`**）、`src/scenes/Battle.ts`（`playFx`）、`src/scenes/World.ts`（`gimmickFx`）、`tests/difficulty.test.ts`、`tests/shield.test.ts`（白名單）、`tests/clock-moves.test.ts`（新）、`tests/clock-battles.test.ts`（新）。

**Interfaces:** Produces：`MOVES.chime`／`crank`／`bark`／`rumble`／`curl`；`MoveDef.fx` 與 `MapObj.fx` 各加 `'chime' | 'crank' | 'bark' | 'rumble' | 'curl'`；三隻初始夥伴（`bobo`、`momo`、`popo`）的 `moves` 都含五招；`ENEMIES` 五個新敵人；`BATTLES` 的 `tpractice`、`t1`～`t3`、`tc1m`…`tc2m3`、`boss_t`。（`LEVELS.t` 在 Task 4。）

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/clock-moves.test.ts`：照抄 `tests/haunt-moves.test.ts`，`DATA` 換成：

    ```ts
    const DATA: [string, string, number, string, string][] = [
      ['chime', 'ㄢ', 14, '噹噹響', '鐘聲魔法'],
      ['crank', 'ㄣ', 14, '轉發條', '發條魔法'],
      ['bark', 'ㄤ', 15, '昂昂叫', '昂叫魔法'],
      ['rumble', 'ㄥ', 15, '轟轟響', '轟鳴魔法'],
      ['curl', 'ㄦ', 16, '捲舌', '捲舌魔法'],
    ];
    ```
    其餘斷言照舊（「威力隨關卡遞增」改成比第九關的 `chill`／`tickle`／`howl`／`hoot` 高：最高值要超過 `Math.max(MOVES.chill.power, MOVES.tickle.power, MOVES.howl.power, MOVES.hoot.power)`；說明至少 20 字；名稱與魔法名在全部招式中不重複）。
  - `tests/clock-battles.test.ts`：照抄 `tests/haunt-battles.test.ts`，換成本關資料：敵人數值逐字照上表且四張圖都在 `MONSTER_ART`；`tpractice`（`enemy: 'clockdummy'`、`phases: 2`、`tier: 1`、`guided: true`、`focus` 為 `['ㄢ','ㄣ']`、獎勵旗標 `tPractice`、`abilities` 為 `['chime','crank']`、無 `penalty`／`respawn`）；`t1`～`t3`（旗標 `m:t:m<n>`、會重生；`t1`／`t2` 的 `focus` 不含 ㄤㄥㄦ，`t3` 的 `focus` 含 `ㄤ`、`ㄥ`、`ㄦ`）；`boss_t`（`enemy: 'timekeeper'`、`shield`、`phases: 3`、`penalty`、`tier: 3`；`focus` 恰為 `['ㄢ','ㄣ','ㄤ','ㄥ','ㄦ']`，`review` 恰為 `['ㄧ','ㄨ','ㄩ','ㄚ','ㄛ','ㄜ','ㄝ','ㄞ','ㄟ','ㄠ','ㄡ']`，兩者合起來剛好是 `VOWELS` 的全部 16 個；獎勵 `{ flag: 'boss_t', abilities: ['bark','rumble','curl'] }`，且 `bark`／`rumble`／`curl` 不在任何其他戰鬥獎勵裡）；迷宮小怪（`tc1m`、`tc1m2`、`tc1m3`、`tc1m4`、`tc2m`、`tc2m2`、`tc2m3`：敵人是 `gearbug`／`windup`／`alarmclock`、旗標符合 `/^m:tc[12]:mon[1-4]$/`、會重生；`tc1m.reward.flag` 為 `'m:tc1:mon1'`、`tc2m3.reward.flag` 為 `'m:tc2:mon3'`）；每場戰鬥的 `focus`／`review` 符號都在 `LEARN_STEPS` 裡；`tpractice`、`t1`、`t2` 的 `intro` 不含 ㄤㄥㄦ。**不測 `LEVELS.t`**（Task 4）。
  - `tests/difficulty.test.ts`：`LEVELS` 陣列最後加 `{ name: '第 10 關（時鐘塔）', smalls: ['gearbug', 'windup', 'alarmclock'], boss: 'timekeeper' }`。
  - `tests/shield.test.ts`：依它自己的規則，把本關新增、會用到 `shield`／`echo` 的戰鬥（`boss_t`、`t2`、`t3`、`tc1m*`、`tc2m*`，實際以敵人是否 `echo` 為準；`t1` 與 `tpractice` 不能列入）加進白名單，比照第九關的做法。
  執行 `npx vitest run tests/clock-moves.test.ts tests/clock-battles.test.ts tests/difficulty.test.ts tests/shield.test.ts`，預期失敗。
- [ ] **Step 2：實作**
  - `src/data/monsters.ts`：`MoveDef.fx` 聯集加五個值；`MOVES` 在 `hoot` 之後加五招（欄位照上表，`desc` 逐字）；三隻夥伴的 `moves` 在 `MOVES.hoot` 後面各加 `MOVES.chime, MOVES.crank, MOVES.bark, MOVES.rumble, MOVES.curl`；`ENEMIES` 在 `scarecrowdummy` 之後加五個敵人（欄位照上表；`clockdummy` 比照 `scarecrowdummy`，貼圖 `en_dummy`）。
  - `src/data/maps.ts`：`MapObj.fx` 聯集加同五個值。
  - `src/scenes/Battle.ts` `playFx`：新增五個 `case`（比照第九關 `chill`／`tickle`／`howl`／`hoot` 的寫法，遵守 `G.settings.reduceMotion`，只用既有貼圖 `spark`／`drop`／`puff`／`windline` 與既有 sfx，建立的物件都要在 tween 的 `onComplete` 銷毀；**不要用深色圓去「挖」形狀，戰鬥背景是亮色**）：
    - `chime`：`audio.sfx('hint')`；從 `to` 周圍擴散三圈由小變大的金銅色圈（描邊 `0xd8a24a`），圈圈由內而外依序出現，`await sleep(500)` 後 `burst(...,'spark',8,30,420)`。
    - `crank`：`audio.sfx('drum')`；一枚小齒輪（用六顆小圓排成一圈、填 `0xb87333`）在 `from` 旋轉著飛向 `to`，`await sleep(520)` 後 `burst(...,'puff',8,28,400)`。
    - `bark`：`audio.sfx('drum')`；三圈由小變大的橘色圈（描邊 `0xff9a4a`）在 `from` 擴散，接著五條橘色 `windline`（`setTint(0xff9a4a)`）射向 `to`，`await sleep(520)` 後 `burst(...,'spark',9,32,430)`。
    - `rumble`：`audio.sfx('drum')`；`to` 處由小變大的兩圈灰藍色圈（描邊 `0x6a86a8`），`!reduceMotion` 時對象輕微震動，`await sleep(560)` 後 `burst(...,'puff',10,34,450)`。
    - `curl`：`audio.sfx('bubble')`；一條螺旋（由七顆逐漸變大的銅黃圓沿螺旋排開，填 `0xe8b34a`）從 `from` 捲向 `to`，`await sleep(620)` 後 `burst(...,'spark',10,36,450)`。
  - `src/scenes/World.ts` `gimmickFx`：新增五個分支（比照第九關四個）：`chime`＝`audio.sfx('hint')` + 金銅色圈擴散；`crank`＝`audio.sfx('drum')` + 小齒輪粒子旋轉；`bark`＝`audio.sfx('drum')` + 橘色圈 + 震動（`!calm`）；`rumble`＝`audio.sfx('drum')` + 灰藍圈 + 震動（`!calm`）；`curl`＝`audio.sfx('bubble')` + 螺旋粒子。
  - `src/data/levels.ts`：`BATTLES` 在 `cc2m3` 之後、`// 畢業區：風車草原` 之前加入（台詞逐字）：

```ts
  // 第二階段第四關（第十關，最終關）：齒輪鐘塔城（ㄢㄣㄤㄥㄦ）。進入發條島先練習 ㄢㄣ，ㄤㄥㄦ 要等練習戰完成後才開始出現，ㄤㄥㄦ 的招式要打倒時光守護者才學到
  tpractice: {
    id: 'tpractice', enemy: 'clockdummy', phases: 2, tier: 1, focus: ['ㄢ', 'ㄣ'], review: [], guided: true,
    intro: ['發條人偶「嘎吱嘎吱」地站在原地，用來練習！', '這一次要認的是「ㄢ」和「ㄣ」。兩個都要把舌尖輕輕頂住上牙！'],
    reward: {
      flag: 'tPractice', exp: 10, coins: 22, abilities: ['chime', 'crank'], items: { potion: 1 },
      story: ['練習完成！', '「ㄢ」像說「安」，夥伴學會了噹噹響！', '「ㄣ」像說「恩」，夥伴學會了轉發條！', '發條島上還有小怪和鐘塔在等你，往前走走看吧！'],
    },
  },
  t1: wild('t1', 'gearbug', 1, ['ㄢ', 'ㄣ'], ['ㄚ', 'ㄛ'], 'm:t:m1'),
  t2: { ...wild('t2', 'windup', 2, ['ㄢ', 'ㄣ'], ['ㄞ', 'ㄟ'], 'm:t:m2'), intro: ['發條兵「嘎啦嘎啦」地走過來，擋住了路！', '他會考「ㄢ」和「ㄣ」。'] },
  t3: { ...wild('t3', 'alarmclock', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄠ', 'ㄡ', 'ㄜ', 'ㄝ'], 'm:t:m3'), intro: ['鬧鐘怪「鈴鈴鈴」地響了起來！', '他會考新的注音：「ㄤ」「ㄥ」和「ㄦ」。'] },
  boss_t: {
    id: 'boss_t', enemy: 'timekeeper', penalty: true, shield: true, phases: 3, tier: 3,
    focus: ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], review: ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'],
    intro: ['當～當～當～鐘塔的大鐘響了，時光守護者從齒輪之間站了起來！', '他的鐘罩擋住了攻擊，要用「🪄 魔法攻擊」才打得破護盾！一共三個小回合，這是最後的考驗！'],
    reward: {
      flag: 'boss_t', exp: 52, coins: 240, abilities: ['bark', 'rumble', 'curl'], items: { potion: 2, berry: 2 },
      story: ['時光守護者的大鐘慢慢停了下來，他笑著點點頭。', '「ㄤ」嘴巴張大，像說「昂」，夥伴學會了昂昂叫！', '「ㄥ」像說「鞥」，夥伴學會了轟轟響！', '「ㄦ」舌頭捲起來，像說「兒」，夥伴學會了捲舌！', '發條島上的齒輪橋、鐘樓大門和鑰匙孔在等你，用新招式試試看吧！'],
    },
  },
  // 鐘塔（齒輪城的小迷宮）：怪物旗標獨立，不與島上的 t1～t3 共用
  tc1m: wild('tc1m', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon1'),
  tc1m2: wild('tc1m2', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon2'),
  tc1m3: wild('tc1m3', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon3'),
  tc1m4: wild('tc1m4', 'gearbug', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄚ', 'ㄛ', 'ㄜ', 'ㄝ'], 'm:tc1:mon4'),
  tc2m: wild('tc2m', 'windup', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], 'm:tc2:mon1'),
  tc2m2: wild('tc2m2', 'alarmclock', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], 'm:tc2:mon2'),
  tc2m3: wild('tc2m3', 'windup', 3, ['ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'], ['ㄞ', 'ㄟ', 'ㄠ', 'ㄡ'], 'm:tc2:mon3'),
```

- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；四個測試檔與整包 `npx vitest run` 全過（若既有的逐一檢查招式／戰鬥／敵人的測試因新資料失敗，依該測試自己的規則補資料，不放寬規則，commit 說明）。
- [ ] **Step 4：commit**：「第十關：噹噹響、轉發條、昂昂叫、轟轟響、捲舌五招與特效，敵人與戰鬥資料（時光守護者護盾戰）」。

---

## Task 3：鐘塔地形與物件圖樣、`clock` skin

**Files:** `src/gfx/clockArt.ts`（新）、`src/gfx/sprites.ts`、`src/data/maps.ts`（`SKINS.clock`）、`tests/clockart.test.ts`（新）。

**Interfaces:** Produces：`CLOCK_TEXTURES`、`drawClockTextures(make, px)`；`SKINS.clock`（`{ key, blocked }`，內容照「已決定的資料」skin 表，`blocked` 為 `new Set('#RO~hHiIkKDW')`）。照抄 `src/gfx/hauntArt.ts` 的寫法（地形圖塊畫滿 16×16；物件背景透明，**`gearbridge_gap`／`gearbridge` 例外：畫滿整格**，且水溝（油溝）的底色要和 `t_clock_oil` 接得起來）。

- [ ] **Step 1：寫測試（先看它失敗）** `tests/clockart.test.ts`：照抄 `tests/hauntart.test.ts`，`HAUNT_TEXTURES`／`drawHauntTextures` 換成 `CLOCK_TEXTURES`／`drawClockTextures`，`FULL_TILE_OBJECTS = ['gearbridge_gap', 'gearbridge']`，成對圖樣為 `[['gear_stuck','gear_turning'],['musicbox_still','musicbox_play'],['gearbridge_gap','gearbridge'],['belldoor','belldoor_open'],['keyhole','keyhole_open'],['winder_off','winder_on']]`，`SKINS.clock` 的 `KEY` 與 `blocked` 逐字照 skin 表，「skin 貼圖都已畫出（除了 `t_door`）」照舊。
- [ ] **Step 2：實作**
  - `src/gfx/clockArt.ts`：匯出 `CLOCK_TEXTURES`（15 個地形：`t_clock_floor`、`t_clock_moss`、`t_clock_path`、`t_tower_floor`、`t_clock_gear`、`t_clock_fence`、`t_clock_oil`、`t_clock_steam`、`t_roof_gear`、`t_wall_gear`、`t_roof_inn_clock`、`t_wall_inn_clock`、`t_roof_shop_clock`、`t_wall_shop_clock`、`t_tower_wall`；14 個物件：`gear_stuck`、`gear_turning`、`musicbox_still`、`musicbox_play`、`gearbridge_gap`、`gearbridge`、`belldoor`、`belldoor_open`、`keyhole`、`keyhole_open`、`winder_off`、`winder_on`、`cablecar`、`clock_gate`）與 `drawClockTextures(make, px)`。設計：整體是溫暖的銅色與暗金色加一點藍綠點綴，**友善可愛、不冰冷**；銅板地淡銅色帶螺絲點；青銅苔地帶綠鏽的銅色；銅管小徑是橫向排列的黃銅管；鐘塔地磚是深棕與銅色棋盤；大齒輪叢是幾個咬在一起的小齒輪；黃銅欄杆有小齒輪裝飾；油溝是深色帶亮點的流動油（不可走）；蒸氣池是藍灰色池水加幾縷白色蒸氣；齒輪屋民宅屋頂是銅色鱗片、旅館屋頂藍色、商店屋頂綠色，牆較素；鐘塔石牆是暗棕色磚加小齒輪浮雕。物件：大齒輪（停＝灰銅色卡住、轉＝亮金色帶轉動線條）、八音盒（靜＝合著的木盒子、轉＝盒蓋開、音符飄出）、齒輪橋缺口（油溝一格、岸邊兩個銅柱）與齒輪橋（一排咬合的齒輪排成橋，可踩）、鐘樓大門（關＝厚重木門帶銅鉸鏈、開＝門開一縫透出暖光）、鑰匙孔（鎖住＝銅色大鎖孔、轉開＝鎖孔旁出現亮光與一把鑰匙）、大發條（停＝大發條鑰匙插在機器上、轉＝鑰匙轉動帶轉動線條）、熱氣纜車（一台吊在鋼索上的小纜車，紅色車廂、藍色氣球，碼頭用）、鐘塔大門（尖頂拱門、中間一面大鐘、兩側齒輪，一眼看得出是出入口）。
  - `src/gfx/sprites.ts`：加 `import { drawClockTextures } from './clockArt';`，在 `drawHauntTextures(...)` 那行之後照同樣的寫法呼叫 `drawClockTextures`，並加註解 `// 第十關（鐘塔）`。
  - `src/data/maps.ts`：在 `SKINS.haunt` 之後加 `SKINS.clock = { key: {...}, blocked: new Set('#RO~hHiIkKDW') }`（逐字照 skin 表）。
  - 做完後輸出每個圖樣的放大 PNG（含一張把 15 個地形拼成 5×3 的總覽、一張 14 個物件的總覽）到 scratchpad，**實際看過**確認好看、可辨認，路徑放進報告。另外把 `gearbridge_gap` 與兩側 `t_clock_oil` 並排畫一張，確認接縫沒有明顯色差。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/clockart.test.ts tests/skin.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第十關：鐘塔地形與物件圖樣、clock skin」。

---

## Task 4：齒輪鎮、發條島、大廳通道、纜車

**Files:** `src/data/maps.ts`、`src/data/levels.ts`（`LEVELS.t`）、`src/core/giver.ts`、`src/scenes/World.ts`、`tests/clockmap.test.ts`（新）、`tests/skymap.test.ts`（交通工具清單）、`tests/lobby.test.ts`（`gate10`）、`tests/giver.test.ts`、`tests/granny.test.ts`、`tests/game.test.ts`（關卡鍵與封閉寶箱清單）、`tests/inn-lines.test.ts`、`tests/shop-lines.test.ts`（各加齒輪鎮）、`tests/strokes.test.ts`（會施法互動的物件數量，目前 58，本任務新增島上 `gear`、`musicbox`、`gearbridge`、`belldoor`、`keyhole` 5 個，調成 63 並補註解）、其他逐張地圖檢查的既有測試（依各自規則調整，不放寬）。

**Interfaces:** Produces：`MAPS.th`、`MAPS.th_inn`、`MAPS.th_shop`、`MAPS.t`；`LEVELS.t`；`MapObj.vehicle` 型別加 `'cablecar'`；大廳 `gate10` 拆成 `barrier`（`hideIf: 'boss_c'`）＋ `gate10_open`（`stairs`，`showIf: 'boss_c'`，同一格）；`GIVER_HUBS` 加 `'th'`；進入 `t` 設 `tEntered`。（`cave` 在 Task 5 才加。）

地圖建議格局（`28×20`，`skin: 'clock'`；實作可微調位置，但**每個物件都要通過下面的測試**，微調要在 commit 說明）：

```ts
// ───────── 齒輪鎮：第二階段最終關的主島（齒輪鐘塔城）─────────
// 從大廳的鐘塔大門進來，落在南邊中間；東北邊的熱氣纜車站（cablecar）通往發條島。商店在北邊偏左、旅館在北邊偏右，中間是蒸氣池。
const thGrid = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('k', 4, 2, 4, 1).rect('K', 4, 3, 4, 1).set(6, 3, 'D');      // 商店：門在 (6,3)
  g.rect('i', 19, 2, 4, 1).rect('I', 19, 3, 4, 1).set(21, 3, 'D');   // 旅館：門在 (21,3)
  g.rect('h', 3, 8, 4, 1).rect('H', 3, 9, 4, 1).rect('h', 21, 14, 4, 1).rect('H', 21, 15, 4, 1); // 兩間民宅（只是裝飾）
  g.rect('O', 12, 8, 4, 3).many('R', [[11, 7], [16, 7], [11, 11], [16, 11]]); // 蒸氣池與四段黃銅欄杆
  g.rect('=', 6, 4, 1, 9).rect('=', 21, 4, 1, 8).rect('=', 6, 12, 16, 1).rect('=', 14, 13, 1, 5); // 銅管小徑（避開蒸氣池）
  g.many(',', [[9, 6], [17, 5], [3, 12], [24, 9], [10, 15], [18, 16], [25, 17], [8, 17]]); // 青銅苔
  return g;
})();
```

`MAPS.th`：`name: '齒輪鎮'`、`theme: 'island'`、`start: { x: 14, y: 17 }`、`respawn: { x: 14, y: 16 }`、`hub: { dock: { x: 14, y: 17 } }`。物件：
- `door_shop` (6,3) → `th_shop` (4,6)；`door_inn` (21,3) → `th_inn` (4,6)。
- `clock_gate_back`（`stairs`，貼圖 `clock_gate`，標籤「回世界地圖」）(13,17) → 大廳 `{ map: 'lobby', x: 15, y: 3 }`（`gate10` 在 (15,2)，所以是正下方一格 (15,3)）；`gate_sign`（`sign`）(15,17)：「鐘塔大門：回世界地圖。」「想去別的世界，就從這裡回去。」
- `cablecar`（`dock`，`vehicle: 'cablecar'`，貼圖 `cablecar`）(25,5)，`dockTo: { map: 't', x: 3, y: 3 }`；`cablecar_sign`（`sign`）(24,6)：「熱氣纜車站：通往發條島。」「纜車是雙向的，發條島那邊也有一台可以開回來。」
- `granny`（`kind: 'granny'`，`label: '星星婆婆'`）(9,13)；`giver`（`kind: 'giver'`，`label: '金幣爺爺'`）(17,5)。
- 島民（`npc`，最後一句不設條件，台詞逐字，**不含 ㄤㄥㄦ**）：
  - `gearkid`（`sprite: 'npc_kid'`，`label: '小齒輪'`）(10,14)：`{ not: 'tEntered', lines: ['歡迎來到齒輪鎮！我是小齒輪，鎮上每個人都靠發條過日子。', '這裡是最後的冒險地點，連鐘塔上的大鐘，都在等你。', '東北邊有台纜車，坐上去就是發條島。島上有發條人偶，先去練習看看吧！'] }`、`{ not: 'tPractice', lines: ['發條人偶可以讓夥伴練習新招式。', '練習完，島上的大齒輪和八音盒，就有辦法對付了。'] }`、`{ not: 'boss_t', lines: ['發條島上有一座鐘塔，聽說最深處住著時光守護者。', '記得先在旅館睡一覺，再去找他。'] }`、`{ lines: ['時光守護者認輸了！太棒了！', '鐘塔裡的寶藏，你全都看過了嗎？'] }`。
  - `clockmaker`（`sprite: 'npc_elder'`，`label: '修鐘的爺爺'`）(22,11)：`{ not: 'tPractice', lines: ['島上有一個卡住的大齒輪，還有一個沒上發條的八音盒。', '它們旁邊好像藏著寶箱。'] }`、`{ not: 'boss_t', lines: ['發條島中間有一條油溝，溝上缺了一塊，只差一座齒輪橋。', '還有一扇緊閉的鐘樓大門，和一個轉不動的大鑰匙孔。', '等你打倒時光守護者、學會新招式，再回來看看。'] }`、`{ lines: ['齒輪橋轉起來了嗎？', '鐘樓大門開了嗎？鑰匙孔轉開了嗎？裡面一定有好東西！'] }`。
  - `gearsister`（`sprite: 'npc_girl'`，`label: '螺絲妹妹'`）(18,14)：`{ not: 'boss_t', lines: ['旅館住一晚 25 金幣，累了就來睡一覺。', '夥伴的體力和魔力，睡醒就都回來了。'] }`、`{ lines: ['打倒時光守護者的人，就是你！', '齒輪鎮永遠歡迎你。'] }`。
- `MAPS.th_inn`（`shop.rows()`，不設 skin）：`keeper`（`innkeeper`，`price: 25`，`label: '旅館老闆'`，`sprite: 'npc_clerk'`），`text: ['歡迎光臨齒輪鎮發條旅館！', '這裡的床底下藏著小發條，睡著了還會輕輕地滴答滴答響，很好睡喔。', '住一晚，夥伴的體力和魔力就會全部回來，我還會幫你存檔。']`、`doneText: ['睡得好嗎？夥伴們的發條都上緊了，精神飽滿！', '滴答滴答～歡迎再來住！']`；`door` (4,7) → `{ map: 'th', x: 21, y: 4 }`。
- `MAPS.th_shop`（`shop.rows()`）：`clerk`（`npc`，`label: '店員小福'`）(6,3)，`text: ['歡迎光臨齒輪鎮發條雜貨店！', '這裡有藥水和魔力果，旋轉的貨架一次就能挑好。']`、`doneText: ['謝謝光顧！', '齒輪鎮隨時歡迎你。']`；`door` (4,7) → `{ map: 'th', x: 6, y: 4 }`。（第一句要含「齒輪鎮」、招呼要有「藥水」或「魔力果」、與其他商店的招呼與道別都不同；既有商店店員的寫法在 `maps.ts`，格式與 `tests/shop-lines.test.ts` 的規則照抄。）

發條島 `t`（`28×20`，`skin: 'clock'`，`theme: 'meadow'`）：

```ts
const clockIsle = (() => {
  const g = new Grid(28, 20, '.').border('#');
  g.rect('~', 1, 10, 26, 1).set(14, 10, '.');                                     // 橫向油溝與缺口那一格（齒輪橋）
  g.many('R', [[22, 14], [11, 14], [17, 17]]);                                     // 南側零星黃銅欄杆（裝飾，不貼著任何物件）
  g.many('#', [[24, 12], [16, 3], [5, 2], [2, 6], [6, 18]]).many(',', [[13, 14], [9, 6], [6, 15], [3, 12]]);
  return g;
})();
```

`MAPS.t`：`name: '發條島（ㄢㄣㄤㄥㄦ）'`、`start: { x: 3, y: 3 }`、`respawn: { x: 3, y: 3 }`。物件（**抵達點在北側，練習戰前能走到的物件與 `cave` 都在北側**）：
- `cablecar_back`（`dock`，`vehicle: 'cablecar'`，貼圖 `cablecar`）(2,3)，`dockTo: { map: 'th', x: 24, y: 5 }`。
- `sign1`（`sign`）(4,5)：「發條島。」「這座島的注音，嘴巴都要擺出特別的形狀：ㄢ 和 ㄣ 的舌尖要輕輕頂住上牙，還有三個要等你自己發現。」「島上有大齒輪、八音盒、油溝和鐘樓大門，學會新招式，也許就能通過它們！」
- `dummy`（`monster`，`battle: 'tpractice'`，`hideIf: 'tPractice'`）(7,5)；`chest_1`（`chest`，`item: 'potion'`）(10,4)。
- `m1`（`monster`，`battle: 't1'`，`ai: 'patrol'`，`patrol: [{x:13,y:5},{x:14,y:5}]`）(12,5)；`m2`（`t2`，patrol (20,8),(21,8)）(19,8)；`m3`（`t3`，`showIf: 'tPractice'`，patrol (13,8),(14,8)）(12,8)。（patrol 是「起點之後」的路線，不含起點，見第九關 Task 4 的教訓。）
- `gear`（`gimmick`，`sprite: 'gear_stuck'`，`sprite2: 'gear_turning'`，`ability: 'chime'`，`fx: 'chime'`）(8,8)；`lockText: ['一個卡住的大齒輪，怎麼推都不動，把旁邊的東西擋住了。', '要是有一聲清脆的鐘響，也許能把它震得轉起來……']`；`hitText: ['夥伴嘴巴張開，舌尖頂住上牙「ㄢ」，像鐘「噹～」地響了一聲！', '大齒輪「喀啦喀啦」地轉了起來，旁邊冒出了一個寶箱！']`；`doneText: ['大齒輪轉得好順，發出規律的聲音。']`；`chest_gear`（`chest`，`item: 'berry'`，`showIf: 'g:t:gear'`）(9,8)。
- `musicbox`（`gimmick`，`sprite: 'musicbox_still'`，`sprite2: 'musicbox_play'`，`ability: 'crank'`，`fx: 'crank'`）(16,7)；`lockText: ['一個八音盒，發條鬆鬆的，一點聲音都沒有。', '要是有人幫它轉緊發條，也許就會唱歌……']`；`hitText: ['夥伴舌尖頂住上牙「ㄣ」，像在轉發條一樣用力！', '八音盒唱起歌來，旁邊冒出了一個寶箱！']`；`doneText: ['八音盒輕輕唱著好聽的歌。']`；`chest_musicbox`（`chest`，`item: 'potion'`，`showIf: 'g:t:musicbox'`）(17,7)。
- `belldoor`（`gimmick`，`sprite: 'belldoor'`，`sprite2: 'belldoor_open'`，`ability: 'rumble'`，`fx: 'rumble'`）(24,8)；`lockText: ['一扇緊閉的鐘樓大門，又厚又重，怎麼推都推不開。', '要是有一聲低低的轟隆聲，也許能把它震開……']`；`hitText: ['夥伴嘴巴微開「ㄥ」，發出低低的轟隆聲！', '鐘樓大門被震開了一條縫，露出了一個寶箱！']`；`doneText: ['鐘樓大門開著，裡面透出暖暖的光。']`；`chest_bell`（`chest`，`item: 'bigpotion'`，`showIf: 'g:t:belldoor'`）(23,8)。
- `keyhole`（`gimmick`，`sprite: 'keyhole'`，`sprite2: 'keyhole_open'`，`ability: 'curl'`，`fx: 'curl'`）(4,8)；`lockText: ['一個轉不動的大鑰匙孔，孔裡的小齒輪卡得緊緊的。', '要是有一個捲捲的聲音，也許能把它轉開……']`；`hitText: ['夥伴舌頭往後捲「ㄦ」，發出捲捲的聲音！', '鑰匙孔「喀」地轉開了，旁邊冒出了一個寶箱！']`；`doneText: ['鑰匙孔轉開了，裡面的小齒輪轉得好開心。']`；`chest_keyhole`（`chest`，`item: 'bigpotion'`，`showIf: 'g:t:keyhole'`）(4,7)。
- `sign2`（`sign`）(19,5)：「前面是鐘塔的方向。」「鐘塔裡又暗又大，很容易迷路，要先練習完再進去喔。」
- `gearbridge`（`gimmick`，`sprite: 'gearbridge_gap'`，`sprite2: 'gearbridge'`，`ability: 'bark'`，`fx: 'bark'`，`passable: true`）(14,10)；`lockText: ['油溝上缺了一塊，過不去。', '要是有一座齒輪橋，把齒輪排成橋就好了……']`；`hitText: ['夥伴嘴巴張大「ㄤ」，拉長了聲音叫了一聲！', '齒輪一個接一個轉了起來，排成了一座橋，可以走到對岸了！']`；`chest_g1`（`item: 'bigpotion'`）(10,15)；`chest_g2`（`item: 'berry'`）(22,16)。
- **大齒輪、八音盒、鐘樓大門、鑰匙孔不是 `vanish`／`passable`**：啟動後換成 `sprite2` 並留在原地（仍擋路），寶箱放在旁邊的空地、啟動後才出現；寶箱不可被圍成口袋，玩家要走得到它旁邊（用測試驗證）。有 `showIf` 的物件不會被 `reachReport` 計入，所以這四個寶箱的出現條件用結構測試驗證。
- 上面的座標沒有逐格對照過地形，實作時若有物件落在擋路格或與地形裝飾重疊，微調**裝飾**的位置（不動物件），並在 commit 說明。
- **`cave` 在 Task 5 才加**（預定放在北側 (22,3)，其下方 (22,4) 要可走且無物件）。

**大廳**：`MAPS.lobby.objects` 的 `gate10`（現為 `barrier`，座標 (15,2) 不變）改成：保留 `gate10`（`kind: 'barrier'`，`hideIf: 'boss_c'`，`lockText: ['第十關「時鐘塔」的門。', '要先打倒第九關的幽靈伯爵，這扇門才會打開！']`），並在**同一格**新增 `{ id: 'gate10_open', kind: 'stairs', x: 15, y: 2, sprite: 'clock_gate', to: { map: 'th', x: 14, y: 17 }, label: '時鐘塔', showIf: 'boss_c' }`；順手把 maps.ts 上方關於 `gate9`、`gate10` 的註解改成實況（`gate7`～`gate10` 都已是通道）。

**World.ts**：`loadMap` 內比照 `cEntered`：`if (m.id === 't' && !flag('tEntered')) setFlag('tEntered');`；`useDock` 的 `how` 加 `cablecar`：`{ ask: \`搭熱氣纜車去${name}？\`, go: '出發 🚠', note: '搭纜車不用錢。' }`。`MapObj.vehicle` 型別加 `'cablecar'`。**`src/core/giver.ts`**：`GIVER_HUBS` 加 `'th'`。**`LEVELS.t`**：`{ id: 't', symbol: 'ㄢㄣㄤㄥㄦ', name: '時鐘塔', open: true, mapId: 'th', partner: '夥伴' }`。

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/clockmap.test.ts`：**照抄 `tests/hauntmap.test.ts`**（含 `walk`／`floodFrom`／`adj`／`visibleWith` helper，一律用 `isBlockedTile`），換成本關資料：`th`／`t`（取代 `ch`／`c`）、`cablecar`／`cablecar_back`（取代 `broom`／`broom_back`，`vehicle: 'cablecar'`，貼圖在 `CLOCK_TEXTURES`）、`clock_gate`、大廳 `gate10`／`gate10_open`（`hideIf`／`showIf` 為 `boss_c`）、機關 `gear`（`chime`）／`musicbox`（`crank`）／`belldoor`（`rumble`）／`keyhole`（`curl`）／`gearbridge`（`bark`，`passable`，`sprite: 'gearbridge_gap'`，`sprite2: 'gearbridge'`）、寶箱 `chest_gear`／`chest_musicbox`／`chest_bell`／`chest_keyhole` 的 `showIf` 為 `g:t:<機關 id>`、`dummy` 是 `tpractice`（`hideIf: 'tPractice'`）、`m1`～`m3` 對 `t1`～`t3`（`m3` 的 `showIf` 為 `tPractice`）。特別要有這幾個測試：
    1. **大廳 `gate10` 的條件**：沒有 `boss_c` 時 `gate10`（barrier）可見、`gate10_open` 不可見；有 `boss_c` 時相反；兩者同一格；`gate10_open` 的 `to` 是 `th` 的 `start`，`th.clock_gate_back` 回大廳 `(gate10.x, gate10.y + 1)` 且該格可走、無物件。
    2. **四個非消失機關的寶箱沒被圍住**：`floodFrom(t, { 'g:t:gear': true, 'g:t:musicbox': true, 'g:t:belldoor': true, 'g:t:keyhole': true }, () => false)` 之後，四個寶箱旁邊都走得到。
    3. **`reachReport`**：`un(['chime','crank'])` 與 `un([])` 都含 `t/chest_g1`、`t/chest_g2`（對岸走不到）；`un(['chime','crank','bark','rumble','curl'])` 為空陣列。齒輪橋缺口左右的格子（`t.tiles[10][13]`、`t.tiles[10][15]`）是 `~`（注意：油溝是橫向，缺口在 (14,10)，水平方向相鄰的是油溝，上下兩格是地板）。
    4. **台詞規則**：`th` 的島民台詞（`talk` 的每一句）與 `th`、`t` 所有物件的 `text`、`lockText` 都不含 `ㄤ`、`ㄥ`、`ㄦ`（`hitText`／`doneText` 不在此限）。
    5. 旅館老闆台詞提到「齒輪鎮」、`doneText` 非空；金幣爺爺與星星婆婆的間距與四周空格規則照第九關；`GIVER_HUBS` 含 `th`；`th` 格局與 `dh`、`gh`、`xh`、`zh`、`sh`、`uh`、`ah`、`ch` 都不同，且含 `O`。
  - 調整既有測試（不放寬規則）：
    - `tests/skymap.test.ts` 的「交通工具」清單加入 `t/cablecar_back:cablecar`、`th/cablecar:cablecar`（清單是 `sort()` 之後比對，注意字母順序），貼圖檢查把 `CLOCK_TEXTURES` 一併併入。
    - `tests/lobby.test.ts`：四扇門的測試改成 `gate7` 是 `stairs`、`gate8` 與 `gate9` 各是 barrier＋對應的 `_open` stairs、`gate10` 是 `barrier`（`hideIf: 'boss_c'`，有 `lockText`）且旁邊有 `gate10_open`（`stairs`）；「物件不重疊」的測試要允許 `gate10`／`gate10_open` 同一格。
    - `tests/giver.test.ts`、`tests/granny.test.ts`：依各自的清單規則加入 `th`（`nextGiverMap` 的期望值依九座主島重算）；地形檢查用 `isBlockedTile`。
    - `tests/inn-lines.test.ts`、`tests/shop-lines.test.ts`：各加齒輪鎮（`['th_shop', '齒輪鎮']` 等，「各不相同」的數量改成十間），規則不放寬。
    - `tests/game.test.ts`：「關卡」測試的鍵清單加 `'t'`；封閉寶箱清單加 `chest_g1`、`chest_g2`。
    - `tests/strokes.test.ts`：「會施法互動的物件數量」58 → 63，並在註解補上發條島的 5 個機關。
    - 其他逐張地圖檢查的既有測試（`hub.test.ts`、`layout.test.ts`、`houses.test.ts` 等）若因新地圖／新機關失敗，依該測試自己的規則修正，**不放寬規則**，並在 commit 說明。
  執行 `npx vitest run tests/clockmap.test.ts`，預期失敗。
- [ ] **Step 2：實作** 照上面的格局與物件資料寫入 `src/data/maps.ts`（`thGrid`、`clockIsle` 放在第九關墓園島之後、迷宮那一節之前；`tiles` 用 `.rows()`，設 `skin: 'clock'`）；修改大廳 `gate10`；`MapObj.vehicle` 型別；`World.ts` 的 `tEntered` 與纜車乘坐文字；`giver.ts`；`levels.ts` 的 `LEVELS.t`。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/clockmap.test.ts` 與整包全過。把 `th`、`t` 兩張地圖輸出成文字（字元 + 物件標記）貼進報告，確認排版合理、沒有物件被擋在地形裡。
- [ ] **Step 4：commit**：「第十關：齒輪鎮、發條島、大廳 gate10 通道與熱氣纜車」。

---

## Task 5：鐘塔迷宮、回家魔法陣

**Files:** `tools/gen-dungeon.mjs`（及 `tools/gen-dungeon.d.mts`）、`src/data/mazes.ts`（**只能由產生器重新產生**）、`src/data/maps.ts`、`tests/clockmap.test.ts`（續加）、`tests/mazegen.test.ts`、`tests/returncircle-cave.test.ts`、`tests/skin.test.ts`（迷宮守門）、`tests/strokes.test.ts`（會施法互動的物件數量：本任務新增 2 個裂石與 1 個大發條開關，63 → 66，並補註解）。

**Interfaces:** Produces：`MAZES.tc1`／`MAZES.tc2`；`MAPS.tc1`／`MAPS.tc2`；`mazeObjects` 的 `clock` 主題；`CIRCLE_HOME.tc`；`t` 的 `cave`。

- [ ] **Step 1：寫測試（先看它失敗）** 在 `tests/clockmap.test.ts` 加「鐘塔」一節，**照抄 `tests/hauntmap.test.ts` 的「古堡」一節**，換成本關資料：`tc1`／`tc2`、起點 `{ map: 'tc1', x: 2, y: 1 }`、練習戰之後的能力 `afterPractice = [...第九關之後的全部能力（以 hauntmap 測試實際列的為準）, 'chime', 'crank']`（**不含 `bark`、`rumble`、`curl`**）、`beforePractice` 為去掉 `chime`／`crank`；斷言：用 `afterPractice` 兩層一起走沒有走不到的地板與物件（含頭目）且 `keysLeft` 為 0；沒有 `crank` 時二樓石牆後（含頭目與頭目寶箱）走不到；沒有 `blast` 時隱藏小密室走不到；守門：`BATTLES.tpractice.reward.abilities` 含 `crank`、`beforePractice` 走不到頭目格而 `afterPractice` 走得到、`t.cave` 為 `{ kind: 'stairs', x: 22, y: 3, label: '鐘塔', showIf: 'tPractice' }` 且 `to` 為 `{ map: 'tc1', x: 2, y: 1 }`、所有通到 `tc1` 的物件（除了 `tc2` 的）都 `showIf: 'tPractice'`；`tc1` 的 `up` 出口為 `{ map: 't', x: 22, y: 4 }`（可走、無物件）；兩層 31×22、`group: 'tc'`、`skin: 'clock'`、含 `f` 與 `W`、不含 `:` 與 `S`；二樓開關 `switch1` 是 `{ kind: 'gimmick', ability: 'crank', fx: 'crank', sprite: 'winder_off', sprite2: 'winder_on' }`、`barrier1` 的 `hideIf` 為 `g:tc2:switch1`；`boss` 為 `{ battle: 'boss_t', hideIf: 'boss_t' }`、`chest_boss` 的 `showIf` 為 `boss_t`；回家魔法陣 `circle`（`showIf: 'boss_t'`、`sprite: 'magic_circle'`）的 `to` 為 `{ map: 'th', x: <th.door_inn.x>, y: <th.door_inn.y + 1> }` 且可走；怪物 id 符合 `^mon[0-9]+$`、戰鬥存在、旗標為 `m:<洞窟>:<id>`、敵人在 `['gearbug','windup','alarmclock']`，戰鬥名單排序後為 `['tc1m','tc1m2','tc1m3','tc1m4','tc2m','tc2m2','tc2m3']`。
  並把 `tc1`、`tc2` 加進 `tests/skin.test.ts` 的「迷宮守門」清單，並依各自的清單規則加進 `tests/mazegen.test.ts`（種子 107／109、同步檢查）與 `tests/returncircle-cave.test.ts`（頭目旁魔法陣不封口、目的地 `th` 旅館門外一格）。執行相關測試，預期失敗。
- [ ] **Step 2：實作**
  1. `tools/gen-dungeon.mjs`：在設定表加
     ```js
       tc1: { seed: 107, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } },
       tc2: { seed: 109, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } },
     ```
     並把輸出的型別宣告的 id 聯集加上 `'tc1' | 'tc2'`；`tools/gen-dungeon.d.mts` 的 `FLOORS` key 聯集同步。執行 `node tools/gen-dungeon.mjs` 重新產生 `src/data/mazes.ts`，用 `git diff src/data/mazes.ts` **確認只新增 `tc1`／`tc2` 與型別宣告**，既有十四個迷宮一格都沒變；若有變動，停下來回報，不要 commit。
  2. `src/data/maps.ts`：`MazeId` 加 `'tc1' | 'tc2'`；`CIRCLE_HOME` 加 `tc: { map: 'th', x: 21, y: 4 }`；`mazeObjects` 的 `theme` 判斷加 `mapId.startsWith('t') ? 'clock'`（放在最前面，型別加 `'clock'`；既有迷宮 id 都不是 `t` 開頭），`boss` 對照表加 `clock: 'boss_t'`，`barrier` 的 `lockText` 加 `theme === 'clock' ? ['一面厚厚的鐘塔石牆擋住了路。', '好像有什麼機關可以打開它……']`，`switch` 加 `clock` 分支：
     ```ts
     theme === 'clock' ? {
       // 開關用 crank（ㄣ，練習戰的獎勵）；鐘塔入口 cave 要練習戰之後才出現，所以進得了鐘塔的人一定已經會 crank
       id: 'switch1', kind: 'gimmick', ...at, sprite: 'winder_off', sprite2: 'winder_on', ability: 'crank', fx: 'crank',
       lockText: ['一支好大的發條鑰匙，插在機器上，一動也不動。', '舌尖頂住上牙，用力轉一轉，也許能把它轉動……'],
       hitText: ['夥伴舌尖頂住上牙「ㄣ」，用力轉動了大發條！', '遠處傳來「轟隆」一聲，好像有一面石牆打開了！'],
       doneText: ['大發條穩穩地轉著，發出規律的聲音。'],
     } : ...
     ```
     新增 `const clockRows = (rows: string[]) => rows.map((r) => r.replace(/:/g, 'f').replace(/S/g, 'W'));` 與 `MAPS.tc1`／`MAPS.tc2`（比照 `cc1`／`cc2`：`name: '鐘塔 1F'`／`'鐘塔 2F'`、`tiles: clockRows(MAZES.tc1.rows)`、`theme: 'valley'`、`group: 'tc'`、`skin: 'clock'`、`start`／`respawn` `{ x: 2, y: 1 }`、`objects: mazeObjects('tc1', { map: 't', x: 22, y: 4 }, { map: 'tc2', x: 2, y: 1 })`；`tc2` 的 `up` 用 `MAZES.tc1.downArrive!`，`down` 為 `undefined`）。
  3. `t` 加入 `cave`：`{ id: 'cave', kind: 'stairs', x: 22, y: 3, to: { map: 'tc1', x: 2, y: 1 }, label: '鐘塔', showIf: 'tPractice' }`（確認 (22,3) 與其下方 (22,4) 可走且沒有物件；若有衝突，微調並同步測試與 `up` 出口）。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/clockmap.test.ts tests/mazegen.test.ts tests/returncircle-cave.test.ts tests/skin.test.ts tests/strokes.test.ts` 與整包全過。把 `tc1`、`tc2` 輸出成文字貼進報告。
- [ ] **Step 4：commit**：「第十關：鐘塔（tc1／tc2）、發條主題機關與回家魔法陣」。

---

## Task 6：最終關收尾（注音大師稱號與第二階段結局）

**Files:** `src/core/ending2.ts`（新）、`src/data/rewards.ts`、`src/data/levels.ts`（`ENDING2_LINES`）、`src/scenes/World.ts`、`tests/ending2.test.ts`（新）、`tests/rewards.test.ts`／`tests/granny.test.ts` 等涉及稱號清單的既有測試（依各自規則調整，不放寬）。

**Interfaces:** Produces：`ENDING2_TITLE_ID = 'title_zhuyin_master'`、`needsEnding2(s)`、`grantEnding2(s)`（簽名比照 `src/core/ending.ts`：`needsEnding2` 在 `flags.boss_t` 為真且 `flags.ending2Seen` 不為真時回傳 true；`grantEnding2` 回傳 `{ granted: boolean }`，發放時把 `title_zhuyin_master` 加進 `titles`（沒有才加）、`title` 設為 `title_zhuyin_master`、`flags.ending2Seen = true`）；`RewardDef` `title_zhuyin_master`；`ENDING2_LINES: { who: string; text: string }[]`。

- [ ] **Step 1：寫測試（先看它失敗）**
  - `tests/ending2.test.ts`：照抄 `tests/ending.test.ts`（若存在；沒有就依 `src/core/ending.ts` 自行寫）的結構：沒打倒 `boss_t` 時 `needsEnding2` 為 false、`grantEnding2` 不發（`granted: false`、`titles`／`title` 不變）；打倒後 `needsEnding2` 為 true，`grantEnding2` 回傳 `granted: true`、`titles` 含 `title_zhuyin_master`、`title === 'title_zhuyin_master'`、`flags.ending2Seen === true`；再呼叫一次 `granted: false` 且 `titles` 沒有重複；已經有別的稱號（含 `title_hero`）時，發放後目前稱號被覆蓋為 `title_zhuyin_master` 但 `title_hero` 仍在 `titles`；`titles` 為 `undefined` 的舊存檔不會丟例外；`boss_s` 與 `endingSeen` 的第一階段結局完全不受影響（`grantEnding` 的既有測試不得改）。
  - 稱號資料：`REWARDS` 含 `title_zhuyin_master`（`type: 'title'`、`cost: 0`、`free: true`、`name: '注音大師'`、`icon: '👑'`），且**不在星星婆婆的兌換清單**（比照 `title_hero` 的既有測試規則）。
  - `ENDING2_LINES`：至少 6 句、每句有 `who` 與非空 `text`；其中一句提到「注音大師」；最後一句是 `who: '旁白'`；**不得提到「世界地圖」或「新的冒險」之類暗示還有下一階段的話**（這是最終結局）。
  執行 `npx vitest run tests/ending2.test.ts`，預期失敗。
- [ ] **Step 2：實作**
  - `src/core/ending2.ts`：比照 `ending.ts`（純函式、不依賴 Phaser、`EndingSave` 型別相同）。
  - `src/data/rewards.ts`：在 `title_hero` 旁加 `{ id: 'title_zhuyin_master', type: 'title', cost: 0, name: '注音大師', icon: '👑', free: true }`。
  - `src/data/levels.ts`：在 `ENDING_LINES` 之後加（台詞草稿，使用者之後潤飾）：

```ts
/** 第二階段結尾劇情（打倒時光守護者後只播一次） */
export const ENDING2_LINES: { who: string; text: string }[] = [
  { who: '時光守護者', text: '當～當～當～你通過最後的考驗了！三十七個注音，你全部都認識了。' },
  { who: '夥伴', text: '我們做到了！從海底到遊樂園、古堡，再到鐘塔，我好驕傲！' },
  { who: '星星婆婆', text: '孩子，你寫的每一個字，都像星星一樣閃閃發光呢！' },
  { who: '金幣爺爺', text: '哈哈，今天的金幣還是不用數了，我請大家吃糖！' },
  { who: '小齒輪', text: '鐘塔的大鐘為你響了三十七下，整個齒輪鎮都聽到了！' },
  { who: '旁白', text: '你得到了稱號「注音大師」！' },
  { who: '旁白', text: '恭喜你學會全部的注音，真的好厲害！' },
];
```

  - `src/scenes/World.ts`：(a) 在 `import { grantEnding, needsEnding } from '../core/ending'` 旁加 `import { grantEnding2, needsEnding2 } from '../core/ending2'`，`ENDING2_LINES` 加進 levels 的 import；(b) 載入存檔的補發處（比照第 95–96 行 `needsEnding(G.save)`）：`needsEnding2(G.save)` 為 true 時同樣補發（呼叫 `playEnding2()`）；(c) 頭目戰結算處（比照 `if (def.id === 'boss_s') await this.playEnding();`）加 `if (def.id === 'boss_t') await this.playEnding2();`；(d) 新增 `private async playEnding2()`，內容比照 `playEnding`：`if (!grantEnding2(G.save).granted) return; saveGame(); await say(ENDING2_LINES);`。
  - 既有因稱號清單／獎勵清單而失敗的測試，依各自規則補資料，不放寬。
- [ ] **Step 3：驗證** `npx tsc --noEmit` 乾淨；`npx vitest run tests/ending2.test.ts` 與整包全過。
- [ ] **Step 4：commit**：「第十關：最終關收尾（注音大師稱號與第二階段結局）」。

---

## Task 7：端對端 `lv10` 與文件

**Files:** `tests/e2e/play.mjs`、`.github/workflows/e2e.yml`、`AGENTS.md`、`README.md`。

- [ ] **Step 1：端對端 `lv10` 段** 在 `tests/e2e/play.mjs` 比照 **`lv9`** 新增 `SECTION=lv10`（**不併入 `all`**）：更新檔頭註解；「分段」補進度的區塊：`lv10` 要補齊 `lv9` 的全部進度再加第九關結果（`cEntered`、`cPractice`、`boss_c`、`visited:ch`、`visited:c`、能力 `chill`／`tickle`／`howl`／`hoot`）；然後新增 `lv10` 段：從起始村走到 `world_map`、大廳、`gate10_open`（沒有 `boss_c` 時是擋路的 barrier，所以進度一定要補 `boss_c`）、齒輪鎮、搭熱氣纜車（`cablecar`，選「出發」，比照 `lv9` 的掃帚）、發條島（發條人偶練習戰、大齒輪 `chime`、八音盒 `crank`、拿兩個寶箱）、`cave`（`tPractice` 之後才出現）、鐘塔（鎖門、裂石 `rock_h`、二樓大發條 `switch1`，用 `lv9` 同一組走迷宮的 helper）、時光守護者護盾戰（`boss`）；斷言旗標 `tEntered`、`tPractice`、`boss_t`、`ending2Seen`，能力 `chime`／`crank`／`bark`／`rumble`／`curl`，稱號 `title_zhuyin_master` 為目前稱號（`G.save.title`），拿頭目寶箱，踩 `circle` 後落在 `th` 旅館門外 `(21,4)`，並走完齒輪橋（`gearbridge`，`bark`）、鐘樓大門（`belldoor`，`rumble`）與鑰匙孔（`keyhole`，`curl`）。結局台詞（`say`）有多句，pump 要能逐句點過。pump 的聽音題選項判斷要涵蓋齒輪怪／發條兵／鬧鐘怪／時光守護者的名稱。`e2e.yml` 的矩陣與手動執行說明加 `lv10`。只做 `node --check tests/e2e/play.mjs`，**不要執行**。
- [ ] **Step 2：文件** `AGENTS.md`：「指令」的端對端分段加 `lv10`（並更新「`all` 不含 `lv7`～`lv9`」的說明）；迷宮種子清單加 `tc1`／`tc2` 種子 107、109；「第二階段」那一條補第十關的實際資料（地圖 id、旗標、五招與嘴型、敵人、鐘塔種子 107／109、`SKINS.clock` 與地形字元、`cablecar` 交通工具、大廳 `gate10` 的 barrier＋stairs 切換（`boss_c`）、`GIVER_HUBS` 加 `th`、沒有小王、二樓大發條用 `crank`、齒輪橋（`bark`）、鐘樓大門（`rumble`）與鑰匙孔（`curl`）只在頭目之後解得開、`cave` 在練習戰之後出現、最終頭目 `boss_t` 考全部 16 個韻母、打倒後的 `title_zhuyin_master`「注音大師」與 `ending2Seen`、純邏輯 `src/core/ending2.ts`、`title_zhuyin_master` 是免費稱號不在婆婆的兌換清單）；並把「第二階段（韻母，地基、第七關與第八關已完成…）」之類過時的進度敘述改成「第二階段全部完成」；修正因本關而變成錯的描述（主島數量、交通工具清單、大廳門的狀態、魔法陣數量與目的地、金幣爺爺／星星婆婆的主島清單、`vehicle` 清單、筆順清單現有 ㄢㄣㄤㄥㄦ 等）。`README.md`：第二階段進度改為全部完成（沿用 README 的編號說法），補第十關的簡介與「注音大師」稱號。
- [ ] **Step 3：驗證** `npx tsc --noEmit`、`npx vitest run` 全過；`node --check tests/e2e/play.mjs` 通過。
- [ ] **Step 4：commit**：「第十關：端對端 lv10 與文件」。

---

## 手動確認（給使用者）

1. 新美術：地形、大齒輪、八音盒、齒輪橋、鐘樓大門、鑰匙孔、大發條、纜車、鐘塔大門、四隻敵人（齒輪怪、發條兵、鬧鐘怪、時光守護者）。
2. 五個招式的動畫與嘴型說明（ㄢㄣ 舌尖頂上牙、ㄤㄥ 聲音往鼻腔、ㄦ 舌頭捲起來）。
3. 大廳第四扇門：沒打倒幽靈伯爵時擋路、打倒後變成通往齒輪鎮的通道。
4. 旅館與商店台詞、各島民台詞的語氣；鐘塔好不好走；時光守護者護盾戰的難度（全部 16 個韻母都會出現）。
5. **結局台詞與「注音大師」稱號**：草稿請使用者潤飾。
6. ㄢㄣㄤㄥㄦ 的筆順座標（近似值），用主控台的筆順測試指令看一遍。
7. 新增語音句子仍用瀏覽器語音念，要預錄請自己執行 `tools/gen-voice.ts`。
