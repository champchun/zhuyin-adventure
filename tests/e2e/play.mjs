// 端對端實測：用真實點擊從頭玩到尾（起始村 → 小關A → 小關B → 返回村莊用能力 → 畢業戰 → 成果）。
// 用法：先 `npm run dev`，再 `node tests/e2e/play.mjs [網址] [截圖資料夾]`
import { chromium } from 'playwright-core';
import fs from 'node:fs';

// 分段執行：SECTION=lv0（村子～小關B～草原）、lv2（舌尖中音島）、lv3（蛙鳴灣～回音森林）、lv4（雪花鎮～企鵝冰原～雪地小路回起始村）、lv5（綠洲鎮～火山沙漠～熔岩洞窟～沙漠小路回起始村）、lv6（熱氣球～雲上小鎮～星空島～星塔～星空龍王～結尾，回起始村）、all（預設，從頭玩到尾）。
// 分段時前面的進度用「直接寫存檔」補上，不重打前面的戰鬥，所以只測被動到的那一段、跑得快很多。
const SECTION = process.env.SECTION ?? 'all';
const run = (...n) => SECTION === 'all' || n.includes(SECTION);
const URL = process.argv[2] ?? 'http://127.0.0.1:5173/';
const OUT = process.argv[3] ?? './e2e-shots';
fs.mkdirSync(OUT, { recursive: true });
// 瀏覽器：環境變數 E2E_BROWSER 指定 > 本機的 Edge／Chrome > Playwright 自己下載的 Chromium（GitHub Actions 上用這個）
const exe = process.env.E2E_BROWSER ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=1024', ...(process.env.CI ? ['--no-sandbox'] : [])] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: false });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('console: ' + m.text()); }); // 404＝尚未放入的注音音檔，屬預期
page.on('dialog', (d) => d.accept());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let shot = 0;
const snap = async (name) => page.screenshot({ path: `${OUT}/${String(++shot).padStart(2, '0')}-${name}.png` });
const ev = (fn, arg) => page.evaluate(fn, arg);
const flags = () => ev(() => ({ ...window.__game.G.save.flags }));
const save = () => ev(() => JSON.parse(JSON.stringify(window.__game.G.save)));

async function tapTile(x, y) {
  const pos = await ev(([x, y]) => {
    const w = window.__game.world();
    const cam = w.cameras.main;
    const c = document.querySelector('#stage canvas').getBoundingClientRect();
    const cv = document.querySelector('#stage canvas');
    const z = cam.zoom * (c.width / cv.width); // 畫布顯示大小可能與內部解析度不同（CSS 等比例貼合視窗）
    return { x: c.left + (x * 16 + 8 - cam.worldView.x) * z, y: c.top + (y * 16 + 8 - cam.worldView.y) * z };
  }, [x, y]);
  await page.mouse.click(pos.x, pos.y);
}

/** 處理畫面上的對話／戰鬥／彈窗，直到 cond() 成立 */
let seenTop = false, seenMove = false, usedPotions = 0;
let shieldUp = false;
let battleRefilled = false; // 這一場戰鬥是否已補過 HP／魔力（戰鬥結束時清掉）
async function pump(cond, label, maxMs = 900000) {
  const t0 = Date.now();
  let lastBattle = '';
  while (Date.now() - t0 < maxMs) {
    if (await cond()) return;
    const st = await ev(() => {
      const vis = (s) => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; };
      const dlg = vis('#dialog .box');
      const note = document.querySelector('#battleui [data-a=ok]');
      const move = document.querySelector('#battleui [data-a=move]');
      const opts = [...document.querySelectorAll('#battleui .opt:not(.gone)')];
      const big = document.querySelector('#battleui .qcard .big')?.textContent ?? '';
      const glow = document.querySelector('#battleui .opt.glow');
      const results = document.querySelector('#modal [data-a=go]');
      const top = [...document.querySelectorAll('#battleui .grid4 [data-a=pick]:not([disabled])')].map((b) => b.dataset.m); // 四宮格第一層
      const gs = window.__game.G.save, me = gs.party[gs.active];
      const heal = ['bigpotion', 'potion'].find((id) => (gs.items?.[id] ?? 0) > 0);
      const low = !!heal && top.length > 0 && me.hp <= 9; // 像玩家一樣：血量低就喝藥水
      const itemPick = document.querySelector('#battleui [data-a=it]');
      const pick = vis('#modal') ? document.querySelector('#modal [data-a=c][data-i="0"]') : null; // choose() 選擇視窗
      const lesson = document.querySelector('#modal[data-lesson-target]')?.dataset.lessonTarget ?? ''; // 第一次認識符號的小課程
      return { enemy: document.querySelector('#battleui .hpbar.enemy .n')?.textContent ?? '', bhidden: document.querySelector('#battleui')?.hidden ?? true, lesson, low, heal, itemPick: !!itemPick, top, dlg, pick: !!pick, note: !!note, move: !!move, opts: opts.map((o) => o.dataset.ch), big, glow: glow?.dataset.ch, results: !!results, msg: document.querySelector('#battleui .msg')?.textContent ?? '' };
    });
    // 頭目護盾：訊息只會閃一下（之後被「反擊了」蓋掉），所以記起來，直到看到「護盾被魔法打破了」或戰鬥結束
    if (/護盾擋住了|攻擊被彈開/.test(st.msg)) shieldUp = true;
    else if (/護盾被魔法打破/.test(st.msg) || st.results) shieldUp = false;
    if (st.bhidden) battleRefilled = false; // 戰鬥畫面收起來＝這場打完了 // 回音怪（被彈開）打贏時由 results 清掉
    if (st.lesson) { await sleep(300); await page.click(`#modal [data-a=lp][data-ch="${st.lesson}"]`).catch(() => {}); await sleep(200); continue; } // 第一次認識符號的小課程：點對的符號
    if (st.pick) { await sleep(300); await page.click('#modal [data-a=c][data-i="0"]').catch(() => {}); await sleep(150); continue; }
    if (st.dlg) { await sleep(300); await page.click('#dialog [data-a=next]').catch(() => {}); }
    else if (st.note) { await sleep(300); await page.click('#battleui [data-a=ok]').catch(() => {}); }
    else if (st.itemPick) { await page.click(`#battleui [data-a=it][data-id=${st.heal ?? 'potion'}]`).catch(() => {}); usedPotions++; }
    else if (st.low) { await page.click('#battleui .grid4 [data-a=item]').catch(() => {}); }
    else if (st.top.length) { if (!battleRefilled) { battleRefilled = true; await refillVitals(); } if (!seenTop) { seenTop = true; await snap('battle-menu'); } const wantMode = process.env.MODE ?? ((shieldUp || /蝙蝠|企鵝|冰晶|蠍|仙人掌|木乃伊|熔岩|星星|彗星|守衛|龍王/.test(st.enemy)) && st.top.includes('listen') ? 'listen' : st.top[0]); await page.click(`#battleui .grid4 [data-a=pick][data-m=${wantMode}]:not([disabled])`).catch(() => page.click(`#battleui .grid4 [data-a=pick][data-m=${st.top[0]}]`).catch(() => {})); }
    else if (st.move) { if (!seenMove) { seenMove = true; await snap('battle-moves'); } await page.click('#battleui [data-a=move] >> nth=' + (process.env.MV ?? '-1') + '').catch(() => {}); }
    else if (st.opts.length) {
      if (st.msg + st.big !== lastBattle) { lastBattle = st.msg + st.big; if (shot < 40 && st.opts.length) await snap('question-' + st.big); }
      const answer = st.big && st.big !== '🔊' ? st.big : st.glow;
      if (answer) await page.click(`#battleui .opt[data-ch="${answer}"]`).catch(() => {});
      else await page.click('#battleui [data-a=hint]').catch(() => {});
    } else if (st.results) { await snap('results'); await page.click('#modal [data-a=go]').catch(() => {}); }
    await sleep(150);
  }
  throw new Error('pump 逾時：' + label);
}
// 機器人的目的是走完流程，不是考驗戰鬥強度：夥伴等級太低會讓頭目戰輸掉或拖很久，造成測試偶爾失敗。
// 所以走每一步之前先把夥伴等級補到 BOOST_LEVEL（只往上補、不動 HP；旅館測試會自己把 HP 設成 1，不能被補掉），
// 戰鬥一開始（出現第一個選單）再把 HP／魔力補滿。設 E2E_BOOST=0 可關掉，回到真實的成長曲線。
const BOOST_LEVEL = Number(process.env.E2E_BOOST_LEVEL ?? 8);
const BOOST = process.env.E2E_BOOST !== '0';
const boostLevel = () => BOOST ? ev((lv) => { for (const m of window.__game.G.save.party) if (m.level < lv) m.level = lv; }, BOOST_LEVEL) : null;
const refillVitals = () => BOOST ? ev(() => { const g = window.__game, m = g.G.save.party[g.G.save.active] ?? g.G.save.party[0]; if (m) { m.hp = g.maxHp(m); m.mp = g.maxMp(m); } }) : null;
const idle = () => ev(() => { const w = window.__game.world(); return !w.moving && !w.busy && w.queue.length === 0 && !document.querySelector('#dialog .box') && document.querySelector('#battleui').hidden; });
const visibleTile = (x, y) => ev(([x, y]) => {
  const cam = window.__game.world().cameras.main, v = cam.worldView;
  return x * 16 >= v.x + 4 && x * 16 + 16 <= v.right - 4 && y * 16 >= v.y + 40 / cam.zoom && y * 16 + 16 <= v.bottom - 4;
}, [x, y]);
/** 點擊目標；若目標不在畫面內，先沿路徑點擊畫面內最遠的一格（和真人一樣得先走近） */
const doTap = async (x, y, label) => {
  await boostLevel();
  for (let i = 0; i < 10; i++) {
    if (await visibleTile(x, y)) {
      await tapTile(x, y); await sleep(250); await pump(idle, label); // 碼頭的「出發」選擇視窗由 pump 自動選第一個
      return;
    }
    const mid = await ev(([x, y]) => {
      const w = window.__game.world(), v = w.cameras.main.worldView, z = w.cameras.main.zoom;
      const path = w.findPath((cx, cy) => (cx === x && cy === y) || Math.abs(cx - x) + Math.abs(cy - y) === 1) ?? [];
      const vis = path.filter((p) => p.x * 16 >= v.x + 4 && p.x * 16 + 16 <= v.right - 4 && p.y * 16 >= v.y + 40 / z && p.y * 16 + 16 <= v.bottom - 4);
      return vis[vis.length - 1] ?? null;
    }, [x, y]);
    if (!mid) throw new Error('找不到可見的路徑點：' + label);
    await tapTile(mid.x, mid.y); await sleep(250); await pump(idle, label + '(中途)');
  }
  await snap('FAIL-' + label);
  throw new Error('走不到：' + label + ' ' + JSON.stringify(await ev(() => { const w = window.__game.world(); return { tx: w.tx, ty: w.ty, v: w.cameras.main.worldView.toString(), objs: [...w.objs.keys()].join() }; })));
};

/** 讀出目前這張地圖上某個物件的座標；找不到就丟出錯誤（hideIf／showIf 隱藏或已消失的物件不在列表裡） */
const objPos = async (id) => {
  const p = await ev((id) => { const o = window.__game.world().objs.get(id); return o ? { x: o.def.x, y: o.def.y } : null; }, id);
  if (!p) throw new Error('找不到物件：' + id);
  return p;
};
const hasObj = (id) => ev((id) => window.__game.world().objs.has(id), id);
/** 走到某個物件並點它；路被小怪擋住（走不到）時，先把還在的小怪打掉再重試 */
const canReach = (x, y) => ev(([x, y]) => !!window.__game.world().findPath((cx, cy) => Math.abs(cx - x) + Math.abs(cy - y) === 1), [x, y]);
const clearBlockers = async (label) => {
  for (const m of ['mon1', 'mon2', 'mon3', 'mon4']) {
    if (!(await hasObj(m))) continue;
    try { const q = await objPos(m); await doTap(q.x, q.y, label + '→擋路的' + m); } catch { /* 這隻也走不到就換下一隻 */ }
  }
};
const tapObj = async (id, label) => {
  for (let round = 0; round < 2; round++) {
    try {
      const p = await objPos(id);
      // 目標旁邊走不到（常見：巡邏怪站在門口）時，點下去只會跳「走不過去喔」而不會丟錯，所以要先檢查
      if (round === 0 && !(await canReach(p.x, p.y))) { await clearBlockers(label); continue; }
      await doTap(p.x, p.y, label); return;
    }
    catch (e) {
      if (round === 1) throw e;
      await clearBlockers(label);
    }
  }
};

// ───── 開始 ─────
await page.goto(URL);
await page.waitForSelector('#screen .menu');
await snap('title');
await page.click('#screen [data-a=new]');
if (process.env.E2E_ONEHIT !== '0') await ev(() => { window.__game.cheats.oneHit = true; }); // 一擊必殺：機器人只要走完流程，不用把每隻怪慢慢打完（E2E_ONEHIT=0 關掉）
await ev(() => { const s = window.__game.G.settings; s.monstersMove = false; s.writeChallenge = false; s.reduceMotion = true; }); // 機器人用座標點擊走路：怪物不動、也不用寫字，流程才穩定；精簡動畫（減少粒子與等待）讓它跑得更快
await page.waitForFunction(() => !document.querySelector('#screen .menu'));
await pump(idle, 'intro');
await snap('room-start');
if ((await save()).mapId !== 'room') throw new Error('新遊戲沒有從房間開始');
log('✓ 新的冒險、在房間醒來');

// ───── 房間：媽媽、出門被擋、床 ─────
await doTap(5, 7, '門（還不能出）');
if ((await save()).mapId !== 'room') throw new Error('沒跟媽媽說話就出門了');
await doTap(7, 4, '媽媽');
if (!(await flags()).momTalked) throw new Error('媽媽的旗標沒設');
await doTap(8, 2, '書桌紙條');
await doTap(5, 7, '出門');
if ((await save()).mapId !== 'village') throw new Error('沒有走到村子');
await snap('village-start');
log('✓ 媽媽、書桌、出門到村子');

// ───── 村民指路、研究所選怪 ─────
await doTap(7, 6, '小皮');
await doTap(18, 8, '村長爺爺');
await doTap(14, 3, '研究所門');
if ((await save()).mapId !== 'lab') throw new Error('沒有進入研究所');
await snap('lab');
await doTap(5, 3, '還沒見博士就點桌上的夥伴');
if ((await save()).party.length) throw new Error('還沒跟博士說話就選到夥伴');
await doTap(9, 5, '博士');
const STARTER = process.env.STARTER ?? 'momo';
await doTap({ bobo: 3, momo: 5, popo: 7 }[STARTER], 3, '選 ' + STARTER);
let s = await save();
let f = await flags();
let inn;
if (s.party.length !== 1 || s.party[0].species !== STARTER || !f.starterChosen || !f.giftGiven) throw new Error('選夥伴流程不對 ' + JSON.stringify({ party: s.party, f }));
if (!s.items.potion || !s.items.berry) throw new Error('博士沒有給道具 ' + JSON.stringify(s.items));
await snap('starter-picked');
log('✓ 研究所選了', STARTER, '，拿到道具', JSON.stringify(s.items));
await doTap(5, 8, '離開研究所');
if ((await save()).mapId !== 'village') throw new Error('沒有回到村子');

if (run('lv0')) {
  // ───── 第 0 關 ─────
  await doTap(8, 10, '村裡寶箱（小藥水）');
  if ((await save()).items.potion < 4) throw new Error('寶箱沒給小藥水');
  await doTap(16, 11, '練習戰');
  f = await flags();
  if (!f.practiceDone) throw new Error('練習戰沒有完成');
  await snap('practice-done');
  if (!(await save()).abilities.includes('blast') || !(await save()).abilities.includes('gust')) throw new Error('練習戰後沒有爆破拳／噴風');
  log('✓ 小關A（ㄅㄆ）練習戰完成，學會爆破拳與噴風');
  const intro1 = (await save()).introduced; if (!intro1 || !intro1.includes('ㄅ') || !intro1.includes('ㄆ')) throw new Error('練習戰之後 ㄅㄆ 應該已經上過課 ' + JSON.stringify(intro1));
  // ───── 寫字施法：開啟寫字挑戰，用滑鼠依筆順描出 ㄅ，石頭才會碎 ─────
  await ev(() => { window.__game.G.settings.writeChallenge = true; });
  await doTap(23, 5, '走到裂石前'); // 石頭在牆缺口 (23,4)，可走的前一格是 (23,5)；此時還沒開寫字畫布，doTap 安全
  await tapTile(23, 4); // 點石頭本身。不能用 doTap：寫字畫布開著時不會自己結束，doTap 會一直等
  await page.waitForSelector('#writecv');
  await snap('write-overlay');
  const box = await page.locator('#writecv').boundingBox();
  const BO = [[31, 14], [19, 40], [78, 31], [76, 50], [66, 72], [55, 86], [49, 87]]; // 與 src/data/strokes.ts 的 ㄅ 相同
  const at = ([x, y]) => [box.x + (x / 100) * box.width, box.y + (y / 100) * box.height];
  // 先故意寫錯（隨便劃一條短線）：畫布不該關閉，也不該打碎石頭
  await page.mouse.move(...at([20, 80])); await page.mouse.down(); await page.mouse.move(...at([30, 85])); await page.mouse.up();
  await sleep(400); // 給延遲關閉留時間，確認畫布真的還開著
  if (!(await page.locator('#writecv').count())) throw new Error('寫錯了畫布不該關閉');
  if ((await flags())['r:village:rock_a']) throw new Error('寫錯了石頭不該碎');
  // 再照筆順描一次
  await page.mouse.move(...at(BO[0])); await page.mouse.down();
  for (let i = 1; i < BO.length; i++) for (let k = 1; k <= 6; k++) {
    const [ax, ay] = BO[i - 1], [bx, by] = BO[i];
    await page.mouse.move(...at([ax + ((bx - ax) * k) / 6, ay + ((by - ay) * k) / 6]));
  }
  await page.mouse.up();
  await pump(() => ev(() => !!window.__game.G.save.flags['r:village:rock_a']), '寫完 ㄅ 後石頭碎掉');
  await pump(idle, '石頭碎掉之後的對話'); // 旗標一設好 pump 就會回來，但「碎石四散」的對話還開著，要先按掉才能繼續點地面
  await snap('write-done');
  log('✓ 寫字施法：寫錯不會碎，照筆順描出 ㄅ 後石頭碎了');
  await ev(() => { window.__game.G.settings.writeChallenge = false; }); // 後面的流程維持機器人點擊
  await doTap(23, 3, '隱藏寶箱');
  f = await flags();
  if (!f['r:village:rock_a'] || !f['c:village:chest_hidden']) throw new Error('村裡裂石／隱藏寶箱失敗');
  log('✓ 村莊裂石與隱藏寶箱（爆破拳）');

  // ───── 小關B：村外小徑（ㄇㄈ）─────
  await doTap(4, 17, 'ㄇㄈ門');
  if ((await save()).mapId !== 'b') throw new Error('沒有進入村外小徑');
  await snap('valley');
  for (const [x, y, n] of [[9, 15, '寶箱1'], [11, 16, '小怪1'], [15, 12, '小怪2'], [18, 10, '寶箱2'], [16, 6, '小怪3']]) await doTap(x, y, n);
  await doTap(22, 4, '頭目');
  s = await save();
  if (!s.abilities.includes('hum') || !s.abilities.includes('fog') || !s.flags.boss_b) throw new Error('頭目後沒有哼哼波／吹霧');
  if (s.party[0].stage !== 1) throw new Error('夥伴沒有成長');
  await snap('boss-b-done');
  log('✓ 小關B頭目完成，哼哼波與吹霧解鎖，夥伴成長 → Lv.' + s.party[0].level);
  // HP 是跨戰鬥保留的：打完之後不一定是滿的；回家睡一覺要回滿
  const vit = await ev(() => { const m = window.__game.G.save.party[0]; return { hp: m.hp, mp: m.mp }; });
  log('  頭目戰後 HP/MP:', JSON.stringify(vit));
  await doTap(10, 11, '裂石（爆破拳）'); await doTap(3, 9, '裂石後寶箱');
  f = await flags();
  if (!f['r:b:rock_b'] || !f['c:b:chest_rock']) throw new Error('小徑裂石／寶箱失敗');
  log('✓ 用爆破拳打碎小徑裂石並取得寶箱');
  await doTap(4, 18, '回村');
  if ((await save()).mapId !== 'village') throw new Error('沒有回村');
  // ───── 寫字施法（兩筆畫）：鈴鐺要先用滑鼠依筆順寫出 ㄇ ─────
  await ev(() => { window.__game.G.settings.writeChallenge = true; });
  await doTap(21, 6, '走到鈴鐺旁'); // 先走近，鈴鐺才在畫面內（(21,6) 是可以走的空格）
  await tapTile(21, 7);
  await page.waitForSelector('#writecv');
  await snap('write-bell');
  const bellStrokes = await ev(() => window.__game.STROKES['ㄇ'].map((s) => s.points));
  if (bellStrokes.length !== 2) throw new Error('ㄇ 應該是兩畫');
  const wbox = await page.locator('#writecv').boundingBox();
  const wat = ([x, y]) => [wbox.x + (x / 100) * wbox.width, wbox.y + (y / 100) * wbox.height];
  for (const pts of bellStrokes) { // 每一畫：按下、依序經過各點（每段補 6 步）、放開
    await page.mouse.move(...wat(pts[0])); await page.mouse.down();
    for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 6; k++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      await page.mouse.move(...wat([ax + ((bx - ax) * k) / 6, ay + ((by - ay) * k) / 6]));
    }
    await page.mouse.up();
  }
  await pump(() => ev(() => !!window.__game.G.save.flags.bellRung), '寫完 ㄇ 後鈴鐺響了');
  await pump(idle, '鈴鐺響了之後的對話'); // 旗標一設好 pump 就會回來，但對話還開著，要先按掉才能繼續點地面
  await snap('write-bell-done');
  log('✓ 寫字施法（兩筆畫）：照筆順寫出 ㄇ，鈴鐺響了');
  await ev(() => { window.__game.G.settings.writeChallenge = false; }); // 後面的流程維持機器人點擊
  await doTap(22, 8, '鈴鐺寶箱');
  await doTap(10, 4, '迷霧（吹霧）'); await doTap(10, 2, '霧後寶箱');
  f = await flags();
  if (!f.bellRung || !f['c:village:chest_bell'] || !f['f:village:fog_a'] || !f['c:village:chest_fog']) throw new Error('鈴鐺／迷霧互動失敗 ' + JSON.stringify(f));
  await snap('village-new-chests');
  log('✓ 哼哼波搖響鈴鐺、吹霧進入迷霧小屋，各取得寶箱');

  // ───── ㄆ關 ─────
  await doTap(7, 17, '風車草原門');
  if ((await save()).mapId !== 'p') throw new Error('沒有進入 ㄆ 關');
  await snap('meadow');
  for (const [x, y, n] of [[7, 14, '葉蟲1'], [6, 11, '寶箱'], [11, 13, '葉蟲2']]) await doTap(x, y, n);
  // 橋在 (14..15,15)，路徑尋找會自動經過
  for (const [x, y, n] of [[18, 11, '葉蟲3'], [20, 9, '寶箱']]) await doTap(x, y, n);
  await doTap(22, 4, '霧影');
  s = await save();
  if (!s.flags.boss_p) throw new Error('霧影沒有打贏');
  await snap('after-boss-p');
  log('  戰鬥中喝了藥水', usedPotions, '次');
  log('✓ 畢業戰完成，隊伍：', s.party.map((m) => m.species + ' Lv' + m.level).join());
  await doTap(11, 9, '風車'); await doTap(5, 7, '落葉'); await doTap(5, 4, '落葉後寶箱'); await doTap(22, 14, '木門(已開)').catch(() => {});
  await doTap(23, 17, '木門後寶箱');
  f = await flags();
  if (!f.windmillOn || !f['l:p:leaves_a'] || !f['c:p:chest_leaf'] || !f['c:p:chest_wind']) throw new Error('噴風互動失敗 ' + JSON.stringify(f));
  await snap('meadow-gust');
  log('✓ 噴風：風車、落葉、木門皆可用');

  // ───── 回村、逛道具店：打怪賺到的金幣買藥水 ─────
  await doTap(4, 18, '回村');
  const coins0 = (await save()).coins;
  if (!(coins0 > 0)) throw new Error('打完怪沒有金幣 ' + coins0);
  await doTap(19, 14, '商店門');
  if ((await save()).mapId !== 'shop') throw new Error('沒有進入商店');
  await snap('shop-inside');
  await tapTile(6, 3); await sleep(250); // 先是店員的對話，按掉之後才會開商店視窗（開著時 busy 不會結束，所以不能用 doTap）
  await pump(() => ev(() => !!document.querySelector('#modal [data-a=buy]')), '店員對話');
  await snap('shop-menu');
  const potions0 = (await save()).items.potion ?? 0;
  await page.click('#modal [data-a=buy][data-id=potion]');
  await page.waitForSelector('#modal [data-a=buy]');
  const afterBuy = await save();
  if ((afterBuy.items.potion ?? 0) !== potions0 + 1 || afterBuy.coins !== coins0 - 15) throw new Error('購買結果不對 ' + JSON.stringify({ items: afterBuy.items, coins: afterBuy.coins, coins0 }));
  await page.click('#modal [data-a=close]');
  await pump(idle, '離開商店');
  log('✓ 打怪賺到', coins0, '枚金幣，在商店買了 1 瓶小藥水，剩', afterBuy.coins);
  await doTap(4, 7, '離開商店');
  if ((await save()).mapId !== 'village') throw new Error('沒有走出商店');

  // ───── 怪物重生：離開地圖再回來，野生怪回來、頭目不會 ─────
  const beforeRe = await flags();
  if (!beforeRe['m:b:m1'] || !beforeRe['m:b:boss']) throw new Error('測試前提不對：小徑的怪應該都打完了');
  await doTap(4, 17, '再進小徑');
  if ((await save()).mapId !== 'b') throw new Error('沒有再進小徑');
  const afterRe = await flags();
  if (afterRe['m:b:m1'] || afterRe['m:b:m2'] || afterRe['m:b:m3']) throw new Error('野生怪沒有重生 ' + JSON.stringify(afterRe));
  if (!afterRe['m:b:boss'] || !afterRe.boss_b) throw new Error('頭目不該重生');
  const monstersShown = await ev(() => [...window.__game.world().objs.values()].filter((o) => o.def.kind === 'monster').map((o) => o.def.id));
  if (!['m1', 'm2', 'm3'].every((id) => monstersShown.includes(id)) || monstersShown.includes('boss')) throw new Error('畫面上的怪物不對 ' + monstersShown);
  await snap('valley-respawned');
  log('✓ 離開再回來：小怪重生了（', monstersShown.join(), '），頭目沒有');
  await doTap(4, 18, '回村');

}
// ───── 分段執行：不跑前面的關卡時，直接把進度寫進存檔 ─────
if (!run('lv0')) {
  await ev((sec) => {
    const G = window.__game.G, S = G.save, m = S.party[0];
    const add = (...k) => k.forEach((x) => { S.flags[x] = true; });
    const ab = (...k) => k.forEach((x) => { if (!S.abilities.includes(x)) S.abilities.push(x); });
    const intro = (...k) => k.forEach((x) => { if (!S.introduced.includes(x)) S.introduced.push(x); });
    add('practiceDone', 'boss_b', 'boss_p', 'momTalked');
    ab('blast', 'gust', 'hum', 'fog');
    intro('ㄅ', 'ㄆ', 'ㄇ', 'ㄈ');
    S.cleared.push('b', 'p');
    S.coins = 150; S.items.potion = 4; S.items.berry = 2;
    m.stage = 1; m.level = 4; m.hp = 99; m.mp = 99;
    if (sec === 'lv3' || sec === 'lv4' || sec === 'lv5' || sec === 'lv6') {
      add('dEntered', 'dPractice', 'boss_d', 'visited:dh', 'visited:d');
      ab('drum', 'splash', 'nasal', 'stream');
      intro('ㄉ', 'ㄊ', 'ㄋ', 'ㄌ');
      S.cleared.push('d');
      m.level = 6; m.hp = 99; m.mp = 99;
    }
    if (sec === 'lv4' || sec === 'lv5' || sec === 'lv6') {
      add('gEntered', 'gPractice', 'boss_g', 'visited:gh', 'visited:g');
      ab('croak', 'knock', 'breath');
      intro('ㄍ', 'ㄎ', 'ㄏ');
      S.cleared.push('g');
      m.level = 8; m.hp = 99; m.mp = 99;
    }
    if (sec === 'lv5' || sec === 'lv6') { // 第五關從起始村的沙漠小路出發（要打倒冰晶女王才出現），所以前四關都補齊
      add('xEntered', 'xPractice', 'boss_x', 'visited:xh', 'visited:x');
      ab('snow', 'slide', 'freeze');
      intro('ㄒ', 'ㄑ', 'ㄐ');
      S.cleared.push('x');
      m.level = 8; m.hp = 99; m.mp = 99;
    }
    if (sec === 'lv6') { // 第六關從起始村的熱氣球出發（要打倒熔岩獸才出現），所以再補上第五關
      add('zEntered', 'zPractice', 'boss_z', 'visited:zh', 'visited:z');
      ab('web', 'gulp', 'roar', 'sun');
      intro('ㄓ', 'ㄔ', 'ㄕ', 'ㄖ');
      S.cleared.push('z');
      m.level = 8; m.hp = 99; m.mp = 99;
    }
    window.__game.world().loadMap(sec === 'lv4' ? 'gh' : sec === 'lv3' ? 'dh' : 'village', sec === 'lv3' || sec === 'lv4' ? 14 : 20, sec === 'lv3' || sec === 'lv4' ? 17 : 11);
  }, SECTION);
  await pump(idle, '直接寫進度後');
  log('✓ 分段：' + SECTION + '，已補上前面關卡的進度');
}

if (run('lv2')) {
  // ───── 舌尖中音島（ㄉㄊㄋㄌ）─────
  await doTap(21, 11, '起始村的碼頭（打倒草原頭目後出現）');
  if ((await save()).mapId !== 'dh') throw new Error('沒有搭船到主島鼓聲港');
  f = await flags();
  if (!f['visited:dh']) throw new Error('到主島後應該記下去過 ' + JSON.stringify(f));
  await snap('hub');
  // 旅館：金幣不夠不能住（不扣錢）；夠了才住（回滿 HP、扣 25 金幣）
  await ev(() => { const g = window.__game.G.save; g.coins = 10; g.party[0].hp = 1; });
  await doTap(6, 3, '旅館的門');
  if ((await save()).mapId !== 'dh_inn') throw new Error('沒有進入旅館');
  await doTap(6, 3, '旅館老闆（金幣不夠）');
  inn = await save();
  if (inn.coins !== 10 || inn.party[0].hp !== 1) throw new Error('金幣不夠時不該扣錢或回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  await ev(() => { window.__game.G.save.coins = 100; });
  await doTap(6, 3, '旅館老闆（住一晚）'); // choose() 彈窗由 pump 自動選第一個選項「住一晚」
  inn = await save();
  if (inn.coins !== 75 || !(inn.party[0].hp > 1)) throw new Error('住一晚後應該扣 25 金幣並回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  log('✓ 主島旅館：金幣不夠不能住，夠了住一晚回滿並扣 25 金幣');
  await doTap(4, 7, '離開旅館');
  if ((await save()).mapId !== 'dh') throw new Error('沒有走出旅館');
  await doTap(3, 10, '主島西邊的碼頭（去怪物島）');
  if ((await save()).mapId !== 'd') throw new Error('沒有進入舌尖中音島（怪物島）');
  f = await flags();
  if (!f.dEntered) throw new Error('進島後應該開始教 ㄉㄊ');
  await snap('island');
  await doTap(6, 14, '島上練習布偶');
  s = await save();
  if (!s.flags.dPractice || !s.abilities.includes('drum') || !s.abilities.includes('splash')) throw new Error('練習戰後沒有學到擊鼓拳／水花彈 ' + JSON.stringify(s.abilities));
  log('✓ 島上練習戰完成，學會擊鼓拳與水花彈');
  await doTap(8, 17, '島上寶箱');
  await doTap(3, 11, '大鼓（擊鼓拳）'); await doTap(3, 10, '鼓後寶箱');
  await doTap(9, 15, '乾花（水花彈）'); await doTap(10, 15, '花旁寶箱');
  f = await flags();
  if (!f['g:d:drum'] || !f['c:d:chest_drum'] || !f['g:d:plant'] || !f['c:d:chest_plant']) throw new Error('大鼓／乾花機關失敗 ' + JSON.stringify(f));
  await snap('island-gimmicks');
  log('✓ 擊鼓拳敲響大鼓、水花彈澆開乾花，各取得寶箱');
  for (const [x, y, n] of [[9, 9, '水滴怪'], [11, 4, '橫行蟹'], [12, 2, '寶箱']]) await doTap(x, y, n);
  await doTap(19, 10, '橋後的水滴怪');
  await doTap(22, 4, '鼓王咚咚');
  s = await save();
  if (!s.flags.boss_d || !s.abilities.includes('nasal') || !s.abilities.includes('stream')) throw new Error('鼓王沒有打贏，或沒有學到嗯嗯泡／流水衝 ' + JSON.stringify(s.abilities));
  await snap('after-boss-d');
  log('✓ 鼓王咚咚打贏了，學會嗯嗯泡與流水衝');
  const intro2 = (await save()).introduced; if (!intro2 || !intro2.includes('ㄋ') || !intro2.includes('ㄌ')) throw new Error('鼓王之後 ㄋㄌ 應該已經上過課 ' + JSON.stringify(intro2));
  await doTap(18, 15, '小水壩（流水衝）'); await doTap(18, 16, '水壩後寶箱');
  await doTap(6, 5, '泡泡球（嗯嗯泡）'); await doTap(6, 4, '泡泡後寶箱');
  f = await flags();
  if (!f['g:d:dam'] || !f['c:d:chest_dam'] || !f['g:d:bubble'] || !f['c:d:chest_bubble']) throw new Error('水壩／泡泡機關失敗 ' + JSON.stringify(f));
  log('✓ 流水衝沖開水壩、嗯嗯泡飄走泡泡球，各取得寶箱');

  // ───── 試煉洞窟（階段 3 的迷宮元件）─────
  await doTap(3, 3, '洞窟入口');
  if ((await save()).mapId !== 'dc1') throw new Error('沒有進入洞窟 1 樓');
  await snap('cave-1f');
  await doTap(3, 4, '裂石（爆破拳）'); await doTap(3, 7, '隱藏房間的寶箱');
  f = await flags();
  if (!f['r:dc1:rock_f'] || !f['c:dc1:chest_f']) throw new Error('洞窟的裂石／隱藏寶箱失敗 ' + JSON.stringify(f));
  await doTap(10, 7, '鑰匙寶箱');
  if (((await save()).items.key ?? 0) !== 1) throw new Error('沒有拿到小鑰匙');
  await doTap(17, 4, '鎖住的門');
  f = await flags();
  if (!f['k:dc1:door'] || ((await save()).items.key ?? 0) !== 0) throw new Error('鎖門沒有打開、或鑰匙沒有用掉 ' + JSON.stringify(f));
  log('✓ 洞窟 1 樓：打碎裂石、拿到小鑰匙、用鑰匙開了鎖門');
  await doTap(17, 7, '往 2 樓的樓梯');
  if ((await save()).mapId !== 'dc2') throw new Error('沒有走到洞窟 2 樓');
  await snap('cave-2f');
  await doTap(17, 3, '機關開關（擊鼓拳）');
  f = await flags();
  if (!f['g:dc2:switch1']) throw new Error('2 樓的機關沒有啟動');
  await doTap(10, 7, '石牆後的寶箱');
  f = await flags();
  if (!f['c:dc2:chest_berry']) throw new Error('石牆打開後拿不到魔力果寶箱');
  log('✓ 洞窟 2 樓：啟動機關、石牆消失、取得寶箱');
  await doTap(1, 1, '回 1 樓的樓梯');
  if ((await save()).mapId !== 'dc1') throw new Error('沒有回到洞窟 1 樓');
  await doTap(1, 1, '回島的樓梯');
  if ((await save()).mapId !== 'd') throw new Error('沒有走回舌尖中音島');
  log('✓ 洞窟：樓層之間來回、走回島上');
  await doTap(4, 18, '怪物島的碼頭（回主島）');
  if ((await save()).mapId !== 'dh') throw new Error('沒有從怪物島回到主島');
}
if (run('lv3')) {
  // ───── 蛙鳴灣與回音森林（ㄍㄎㄏ）─────
  await doTap(14, 18, '鼓聲港南邊的碼頭（去蛙鳴灣，打倒鼓王後出現）');
  if ((await save()).mapId !== 'gh') throw new Error('沒有搭船到蛙鳴灣');
  f = await flags();
  if (!f['visited:gh']) throw new Error('到蛙鳴灣後應該記下去過 ' + JSON.stringify(f));
  await snap('hub-g');
  // 旅館：金幣不夠不能住（不扣錢）；夠了才住（回滿 HP、扣 25 金幣）
  await ev(() => { const g = window.__game.G.save; g.coins = 10; g.party[0].hp = 1; });
  await doTap(6, 3, '蛙鳴灣旅館的門');
  if ((await save()).mapId !== 'gh_inn') throw new Error('沒有進入蛙鳴灣旅館');
  await doTap(6, 3, '旅館老闆（金幣不夠）');
  inn = await save();
  if (inn.coins !== 10 || inn.party[0].hp !== 1) throw new Error('蛙鳴灣：金幣不夠時不該扣錢或回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  await ev(() => { window.__game.G.save.coins = 100; });
  await doTap(6, 3, '旅館老闆（住一晚）');
  inn = await save();
  if (inn.coins !== 75 || !(inn.party[0].hp > 1)) throw new Error('蛙鳴灣：住一晚後應該扣 25 金幣並回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  log('✓ 蛙鳴灣旅館：金幣不夠不能住，夠了住一晚回滿並扣 25 金幣');
  await doTap(4, 7, '離開蛙鳴灣旅館');
  if ((await save()).mapId !== 'gh') throw new Error('沒有走出蛙鳴灣旅館');
  await doTap(3, 10, '蛙鳴灣西邊的碼頭（去回音森林）');
  if ((await save()).mapId !== 'g') throw new Error('沒有進入回音森林');
  f = await flags();
  if (!f.gEntered) throw new Error('進森林後應該開始教 ㄍㄎ ' + JSON.stringify(f));
  await snap('forest');
  await doTap(7, 14, '森林練習布偶');
  s = await save();
  if (!s.flags.gPractice || !s.abilities.includes('croak') || !s.abilities.includes('knock')) throw new Error('練習戰後沒有學到呱呱叫／啄木敲 ' + JSON.stringify(s.abilities));
  log('✓ 森林練習戰完成，學會 croak（ㄍ）與 knock（ㄎ）');
  await doTap(9, 17, '森林寶箱');
  await doTap(10, 12, '森林小怪 1');
  await doTap(6, 9, '搖搖樹（ㄍ）'); await doTap(6, 8, '樹下寶箱');
  await doTap(12, 5, '樹洞（ㄎ）'); await doTap(12, 4, '樹洞寶箱');
  f = await flags();
  if (!f['g:g:tree'] || !f['c:g:chest_tree'] || !f['g:g:hole'] || !f['c:g:chest_hole']) throw new Error('搖搖樹／樹洞機關失敗 ' + JSON.stringify(f));
  await snap('forest-gimmicks');
  log('✓ ㄍ搖落果子、ㄎ敲開樹洞，各取得寶箱（冰塊要等學會 ㄏ）');
  await doTap(16, 8, '森林小怪 2');
  await doTap(20, 15, '森林小怪 3');

  // ───── 回音洞窟（蝙蝠王有護盾，要用魔法才打得到）─────
  await doTap(24, 4, '洞窟入口');
  if ((await save()).mapId !== 'gc1') throw new Error('沒有進入回音洞窟 1 樓');
  await snap('gcave-1f');
  // 順序：鑰匙 → 鎖門 → 裂石。產生的迷宮裡裂石（隱藏房間）可能在鎖門後面，所以不能先打裂石
  await tapObj('chest_key', '鑰匙寶箱');
  if (((await save()).items.key ?? 0) !== 1) throw new Error('回音洞窟沒有拿到小鑰匙');
  await tapObj('door', '鎖住的門');
  f = await flags();
  if (!f['k:gc1:door'] || ((await save()).items.key ?? 0) !== 0) throw new Error('回音洞窟的鎖門沒有打開、或鑰匙沒有用掉 ' + JSON.stringify(f));
  await tapObj('rock_h', '裂石'); await tapObj('chest_h', '隱藏房間的寶箱');
  f = await flags();
  if (!f['r:gc1:rock_h'] || !f['c:gc1:chest_h']) throw new Error('回音洞窟的裂石／隱藏寶箱失敗 ' + JSON.stringify(f));
  log('✓ 回音洞窟 1 樓：打碎裂石、拿到小鑰匙、用鑰匙開了鎖門');
  await tapObj('down', '往 2 樓的樓梯');
  if ((await save()).mapId !== 'gc2') throw new Error('沒有走到回音洞窟 2 樓');
  await snap('gcave-2f');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力：蝙蝠是回音怪，要用魔法攻擊才有傷害
  await tapObj('switch1', '樹洞開關（ㄎ）');
  f = await flags();
  if (!f['g:gc2:switch1']) throw new Error('回音洞窟 2 樓的樹洞機關沒有啟動 ' + JSON.stringify(f));
  log('✓ 回音洞窟 2 樓：敲開樹洞、石牆消失');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 機器人的目的是走完流程，不是考驗魔力管理：補魔力讓它破得了蝙蝠王的護盾
  await tapObj('boss', '蝙蝠王');
  s = await save();
  if (!s.flags.boss_g || !s.abilities.includes('breath')) throw new Error('蝙蝠王沒有打贏，或沒有學到 breath（ㄏ） ' + JSON.stringify({ flags: s.flags.boss_g, abilities: s.abilities }));
  await snap('after-boss-g');
  log('✓ 蝙蝠王打贏了（護盾被魔法打破），學會 breath（ㄏ）');
  const intro3 = (await save()).introduced; if (!intro3 || !intro3.includes('ㄏ')) throw new Error('蝙蝠王之後 ㄏ 應該已經上過課 ' + JSON.stringify(intro3));
  await tapObj('chest_boss', '頭目寶箱');
  if (!(await flags())['c:gc2:chest_boss']) throw new Error('蝙蝠王的寶箱沒拿到');
  await tapObj('up', '回 1 樓的樓梯');
  if ((await save()).mapId !== 'gc1') throw new Error('沒有回到回音洞窟 1 樓');
  await tapObj('up', '回森林的出口');
  if ((await save()).mapId !== 'g') throw new Error('沒有走回回音森林');
  await doTap(22, 9, '冰塊（ㄏ）'); await doTap(22, 8, '冰塊後寶箱');
  f = await flags();
  if (!f['g:g:ice'] || !f['c:g:chest_ice']) throw new Error('冰塊機關失敗 ' + JSON.stringify(f));
  await snap('forest-ice');
  log('✓ ㄏ的熱氣融化冰塊，取得寶箱');
  await doTap(4, 18, '森林的碼頭（回蛙鳴灣）');
  if ((await save()).mapId !== 'gh') throw new Error('沒有從森林回到蛙鳴灣');
  if (!run('lv4')) { // 從頭玩到尾（all）時直接接著第四關，不用先繞回鼓聲港
    await doTap(14, 18, '蛙鳴灣南邊的碼頭（回鼓聲港）');
    if ((await save()).mapId !== 'dh') throw new Error('沒有從蛙鳴灣回到鼓聲港');
  }
  log('✓ 第三關走完：蛙鳴灣、回音森林、洞窟');

}
if (run('lv4')) {
  // ───── 雪花鎮與企鵝冰原（ㄒㄑㄐ）─────
  await tapObj('dock_xh', '蛙鳴灣東邊的碼頭（去雪花鎮，打倒蝙蝠王後出現）');
  if ((await save()).mapId !== 'xh') throw new Error('沒有搭船到雪花鎮');
  f = await flags();
  if (!f['visited:xh']) throw new Error('到雪花鎮後應該記下去過 ' + JSON.stringify(f));
  await snap('hub-x');
  // 旅館：金幣不夠不能住（不扣錢）；夠了才住（回滿 HP、扣 25 金幣）
  await ev(() => { const g = window.__game.G.save; g.coins = 10; g.party[0].hp = 1; });
  await tapObj('door_inn', '雪花鎮旅館的門');
  if ((await save()).mapId !== 'xh_inn') throw new Error('沒有進入雪花鎮旅館');
  await tapObj('keeper', '旅館老闆（金幣不夠）');
  inn = await save();
  if (inn.coins !== 10 || inn.party[0].hp !== 1) throw new Error('雪花鎮：金幣不夠時不該扣錢或回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  await ev(() => { window.__game.G.save.coins = 100; });
  await tapObj('keeper', '旅館老闆（住一晚）');
  inn = await save();
  if (inn.coins !== 75 || !(inn.party[0].hp > 1)) throw new Error('雪花鎮：住一晚後應該扣 25 金幣並回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  log('✓ 雪花鎮旅館：金幣不夠不能住，夠了住一晚回滿並扣 25 金幣');
  await tapObj('door', '離開雪花鎮旅館');
  if ((await save()).mapId !== 'xh') throw new Error('沒有走出雪花鎮旅館');
  await tapObj('dock_isle', '東南邊的碼頭（去企鵝冰原）');
  if ((await save()).mapId !== 'x') throw new Error('沒有進入企鵝冰原');
  f = await flags();
  if (!f.xEntered) throw new Error('進冰原後應該開始教 ㄒㄑ ' + JSON.stringify(f));
  await snap('icefield');
  await tapObj('dummy', '冰原練習布偶');
  s = await save();
  if (!s.flags.xPractice || !s.abilities.includes('snow') || !s.abilities.includes('slide')) throw new Error('練習戰後沒有學到雪花飄／企鵝滑 ' + JSON.stringify(s.abilities));
  const intro4 = s.introduced; if (!intro4 || !intro4.includes('ㄒ') || !intro4.includes('ㄑ')) throw new Error('練習戰之後 ㄒㄑ 應該已經上過課 ' + JSON.stringify(intro4));
  log('✓ 冰原練習戰完成，學會 snow（ㄒ）與 slide（ㄑ）');
  await tapObj('chest_1', '冰原寶箱');
  await tapObj('pile', '雪堆（ㄒ）'); await tapObj('chest_snow', '雪堆下的寶箱');
  await tapObj('rock', '冰面石頭（ㄑ）'); await tapObj('chest_slide', '石頭後的寶箱');
  f = await flags();
  if (!f['g:x:pile'] || !f['c:x:chest_snow'] || !f['g:x:rock'] || !f['c:x:chest_slide']) throw new Error('雪堆／冰石機關失敗 ' + JSON.stringify(f));
  await snap('icefield-gimmicks');
  log('✓ ㄒ吹開雪堆、ㄑ滑走冰石，各取得寶箱（河上的冰橋要等學會 ㄐ）');
  for (const m of ['m1', 'm2', 'm3']) if (await hasObj(m)) await tapObj(m, '冰原小怪 ' + m); // 有的小怪可能已經被前面的步驟順手打掉

  // ───── 冰晶洞窟（冰晶王有護盾，要用魔法才打得到）─────
  await tapObj('cave', '洞窟入口');
  if ((await save()).mapId !== 'xc1') throw new Error('沒有進入冰晶洞窟 1 樓');
  await snap('xcave-1f');
  // 順序：鑰匙 → 鎖門 → 裂石（產生的迷宮裡裂石可能在鎖門後面）
  await tapObj('chest_key', '鑰匙寶箱');
  if (((await save()).items.key ?? 0) !== 1) throw new Error('冰晶洞窟沒有拿到小鑰匙');
  await tapObj('door', '鎖住的門');
  f = await flags();
  if (!f['k:xc1:door'] || ((await save()).items.key ?? 0) !== 0) throw new Error('冰晶洞窟的鎖門沒有打開、或鑰匙沒有用掉 ' + JSON.stringify(f));
  await tapObj('rock_h', '裂石'); await tapObj('chest_h', '隱藏房間的寶箱');
  f = await flags();
  if (!f['r:xc1:rock_h'] || !f['c:xc1:chest_h']) throw new Error('冰晶洞窟的裂石／隱藏寶箱失敗 ' + JSON.stringify(f));
  log('✓ 冰晶洞窟 1 樓：打碎裂石、拿到小鑰匙、用鑰匙開了鎖門');
  await tapObj('down', '往 2 樓的樓梯');
  if ((await save()).mapId !== 'xc2') throw new Error('沒有走到冰晶洞窟 2 樓');
  await snap('xcave-2f');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力：企鵝、冰晶蝙蝠是回音怪，要用魔法攻擊才有傷害
  await tapObj('switch1', '冰石開關（ㄑ）');
  f = await flags();
  if (!f['g:xc2:switch1']) throw new Error('冰晶洞窟 2 樓的冰石機關沒有啟動 ' + JSON.stringify(f));
  log('✓ 冰晶洞窟 2 樓：滑走冰石、冰牆消失');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力讓它破得了冰晶王的護盾
  await tapObj('boss', '冰晶王');
  s = await save();
  if (!s.flags.boss_x || !s.abilities.includes('freeze')) throw new Error('冰晶王沒有打贏，或沒有學到 freeze（ㄐ） ' + JSON.stringify({ flags: s.flags.boss_x, abilities: s.abilities }));
  await snap('after-boss-x');
  log('✓ 冰晶王打贏了（護盾被魔法打破），學會 freeze（ㄐ）');
  const intro5 = (await save()).introduced; if (!intro5 || !intro5.includes('ㄐ')) throw new Error('冰晶王之後 ㄐ 應該已經上過課 ' + JSON.stringify(intro5));
  await tapObj('chest_boss', '頭目寶箱');
  if (!(await flags())['c:xc2:chest_boss']) throw new Error('冰晶王的寶箱沒拿到');
  await tapObj('up', '回 1 樓的樓梯');
  if ((await save()).mapId !== 'xc1') throw new Error('沒有回到冰晶洞窟 1 樓');
  await tapObj('up', '回冰原的出口');
  if ((await save()).mapId !== 'x') throw new Error('沒有走回企鵝冰原');
  await tapObj('bridge', '河面（ㄐ）');
  await tapObj('chest_bridge1', '對岸寶箱 1'); await tapObj('chest_bridge2', '對岸寶箱 2');
  f = await flags();
  if (!f['g:x:bridge'] || !f['c:x:chest_bridge1'] || !f['c:x:chest_bridge2']) throw new Error('冰橋機關失敗 ' + JSON.stringify(f));
  await snap('icefield-bridge');
  log('✓ ㄐ把河水凍成冰橋，取得對岸的寶箱');
  await tapObj('dock', '冰原的碼頭（回雪花鎮）');
  if ((await save()).mapId !== 'xh') throw new Error('沒有從冰原回到雪花鎮');
  // 星星婆婆：用星星換獎勵、星光門進星光小屋（星星設成 30、已花 0；之後的流程不再看星星數）
  await ev(() => { const s = window.__game.G.save; s.stars = 30; s.starsSpent = 0; });
  const gp = await objPos('granny');
  for (let i = 0; i < 10 && !(await visibleTile(gp.x, gp.y)); i++) { // 彈窗會開著，不能用 doTap；先走近到看得見
    const mid = await ev(([x, y]) => {
      const w = window.__game.world(), v = w.cameras.main.worldView, z = w.cameras.main.zoom;
      const path = w.findPath((cx, cy) => (cx === x && cy === y) || Math.abs(cx - x) + Math.abs(cy - y) === 1) ?? [];
      const vis = path.filter((p) => p.x * 16 >= v.x + 4 && p.x * 16 + 16 <= v.right - 4 && p.y * 16 >= v.y + 40 / z && p.y * 16 + 16 <= v.bottom - 4);
      return vis[vis.length - 1] ?? null;
    }, [gp.x, gp.y]);
    if (!mid) throw new Error('找不到走向星星婆婆的路徑點');
    await tapTile(mid.x, mid.y); await sleep(250); await pump(idle, '走向星星婆婆');
  }
  await tapTile(gp.x, gp.y); await sleep(250); // 第一次先播登場台詞（pump 會按「下一句」），之後開兌換彈窗
  await pump(() => ev(() => !!document.querySelector('#modal [data-a=redeem]')), '星星婆婆兌換視窗');
  await snap('star-granny-modal');
  await page.click('#modal [data-a=redeem][data-id=acc_bow]');
  await sleep(300);
  const gs = await save();
  if (gs.equipped !== 'bow' || gs.starsSpent !== 10) throw new Error('兌換蝴蝶結失敗 ' + JSON.stringify({ equipped: gs.equipped, starsSpent: gs.starsSpent }));
  await page.click('#modal [data-a=close]');
  await pump(idle, '關閉星星婆婆視窗');
  await tapObj('star_door', '星光門');
  if ((await save()).mapId !== 'xh_star') throw new Error('沒有進入星光小屋');
  await tapObj('chest_star', '星光小屋寶箱');
  if (!(await flags())['c:xh_star:chest_star']) throw new Error('星光小屋寶箱沒有打開');
  await tapObj('door', '離開星光小屋');
  if ((await save()).mapId !== 'xh') throw new Error('沒有從星光小屋回到雪花鎮');
  log('✓ 星星婆婆：用星星換蝴蝶結、星光門進星光小屋開寶箱');
  await tapObj('trail', '雪地小路（打倒冰晶王後出現）');
  if ((await save()).mapId !== 'village') throw new Error('沒有從雪地小路走回起始村');
  await tapObj('trail_xh', '起始村的雪地小路（走回雪花鎮）');
  if ((await save()).mapId !== 'xh') throw new Error('沒有從起始村的雪地小路走回雪花鎮');
  await tapObj('trail', '雪花鎮的雪地小路（再回起始村）');
  if ((await save()).mapId !== 'village') throw new Error('沒有從雪花鎮再走回起始村');
  log('✓ 第四關走完：雪花鎮、企鵝冰原、冰晶洞窟、雪地小路雙向來回');
}
if (run('lv5')) {
  // ───── 綠洲鎮與火山沙漠（ㄓㄔㄕㄖ）─────
  await tapObj('desert_road', '起始村的沙漠小路（打倒冰晶女王後出現）');
  if ((await save()).mapId !== 'zh') throw new Error('沒有從沙漠小路走到綠洲鎮');
  f = await flags();
  await snap('hub-z');
  // 旅館：金幣不夠不能住（不扣錢）；夠了才住（回滿 HP、扣 25 金幣）
  await ev(() => { const g = window.__game.G.save; g.coins = 10; g.party[0].hp = 1; });
  await tapObj('door_inn', '綠洲鎮旅館的門');
  if ((await save()).mapId !== 'zh_inn') throw new Error('沒有進入綠洲鎮旅館');
  await tapObj('keeper', '旅館老闆（金幣不夠）');
  inn = await save();
  if (inn.coins !== 10 || inn.party[0].hp !== 1) throw new Error('綠洲鎮：金幣不夠時不該扣錢或回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  await ev(() => { window.__game.G.save.coins = 100; });
  await tapObj('keeper', '旅館老闆（住一晚）');
  inn = await save();
  if (inn.coins !== 75 || !(inn.party[0].hp > 1)) throw new Error('綠洲鎮：住一晚後應該扣 25 金幣並回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  log('✓ 綠洲鎮旅館：金幣不夠不能住，夠了住一晚回滿並扣 25 金幣');
  await tapObj('door', '離開綠洲鎮旅館');
  if ((await save()).mapId !== 'zh') throw new Error('沒有走出綠洲鎮旅館');
  await tapObj('desert_gate', '沙漠大門（去火山沙漠）');
  if ((await save()).mapId !== 'z') throw new Error('沒有進入火山沙漠');
  f = await flags();
  if (!f.zEntered) throw new Error('進沙漠後應該開始教 ㄓㄔ ' + JSON.stringify(f));
  await snap('desert');
  await tapObj('dummy', '沙漠練習稻草人');
  s = await save();
  if (!s.flags.zPractice || !s.abilities.includes('web') || !s.abilities.includes('gulp')) throw new Error('練習戰後沒有學到蜘蛛絲／大口吃 ' + JSON.stringify(s.abilities));
  const intro6 = s.introduced; if (!intro6 || !intro6.includes('ㄓ') || !intro6.includes('ㄔ')) throw new Error('練習戰之後 ㄓㄔ 應該已經上過課 ' + JSON.stringify(intro6));
  log('✓ 沙漠練習戰完成，學會 web（ㄓ）與 gulp（ㄔ）');
  await tapObj('chest_1', '沙漠寶箱');
  await tapObj('cactus', '仙人掌（ㄔ）'); await tapObj('chest_cactus', '仙人掌後的寶箱');
  f = await flags();
  if (!f['g:z:cactus'] || !f['c:z:chest_cactus']) throw new Error('仙人掌機關失敗 ' + JSON.stringify(f));
  // 熔岩河上的沙坑：施放蜘蛛絲織成網橋（橋格啟動後可以走過去），再取對岸的寶箱
  await tapObj('pit', '沙坑（ㄓ）');
  f = await flags();
  if (!f['g:z:pit']) throw new Error('蜘蛛網橋沒有織成 ' + JSON.stringify(f));
  await tapObj('chest_web1', '對岸寶箱 1'); await tapObj('chest_web2', '對岸寶箱 2');
  f = await flags();
  if (!f['c:z:chest_web1'] || !f['c:z:chest_web2']) throw new Error('網橋對岸的寶箱沒拿到 ' + JSON.stringify(f));
  await snap('desert-bridge');
  log('✓ ㄓ織出蜘蛛網橋，走過熔岩河取得對岸的寶箱；ㄔ吃掉仙人掌取得寶箱（流沙與砂岩要等學會 ㄖㄕ）');
  for (const m of ['m1', 'm2', 'm3']) if (await hasObj(m)) await tapObj(m, '沙漠小怪 ' + m); // 有的小怪可能已經被前面的步驟順手打掉

  // ───── 熔岩洞窟（熔岩獸有護盾，要用魔法才打得到）─────
  await tapObj('cave', '洞窟入口');
  if ((await save()).mapId !== 'zc1') throw new Error('沒有進入熔岩洞窟 1 樓');
  await snap('zcave-1f');
  // 順序：鑰匙 → 鎖門 → 裂石（產生的迷宮裡裂石可能在鎖門後面）
  await tapObj('chest_key', '鑰匙寶箱');
  if (((await save()).items.key ?? 0) !== 1) throw new Error('熔岩洞窟沒有拿到小鑰匙');
  await tapObj('door', '鎖住的門');
  f = await flags();
  if (!f['k:zc1:door'] || ((await save()).items.key ?? 0) !== 0) throw new Error('熔岩洞窟的鎖門沒有打開、或鑰匙沒有用掉 ' + JSON.stringify(f));
  await tapObj('rock_h', '裂石'); await tapObj('chest_h', '隱藏房間的寶箱');
  f = await flags();
  if (!f['r:zc1:rock_h'] || !f['c:zc1:chest_h']) throw new Error('熔岩洞窟的裂石／隱藏寶箱失敗 ' + JSON.stringify(f));
  log('✓ 熔岩洞窟 1 樓：打碎裂石、拿到小鑰匙、用鑰匙開了鎖門');
  await tapObj('down', '往 2 樓的樓梯');
  if ((await save()).mapId !== 'zc2') throw new Error('沒有走到熔岩洞窟 2 樓');
  await snap('zcave-2f');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力：仙人掌怪、木乃伊是回音怪，要用魔法攻擊才有傷害
  await tapObj('switch1', '岩壁拉桿（ㄓ蜘蛛絲，頭目前就解得開）');
  f = await flags();
  if (!f['g:zc2:switch1']) throw new Error('熔岩洞窟 2 樓的拉桿機關沒有啟動 ' + JSON.stringify(f));
  log('✓ 熔岩洞窟 2 樓：蜘蛛絲勾動拉桿、熔岩閘門消失');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力讓它破得了熔岩獸的護盾
  await tapObj('boss', '熔岩獸');
  s = await save();
  if (!s.flags.boss_z || !s.abilities.includes('roar') || !s.abilities.includes('sun')) throw new Error('熔岩獸沒有打贏，或沒有學到 roar／sun（ㄕㄖ） ' + JSON.stringify({ flags: s.flags.boss_z, abilities: s.abilities }));
  await snap('after-boss-z');
  log('✓ 熔岩獸打贏了（護盾被魔法打破），學會 roar（ㄕ）與 sun（ㄖ）');
  const intro7 = s.introduced; if (!intro7 || !intro7.includes('ㄕ') || !intro7.includes('ㄖ')) throw new Error('熔岩獸之後 ㄕㄖ 應該已經上過課 ' + JSON.stringify(intro7));
  await tapObj('chest_boss', '頭目寶箱');
  if (!(await flags())['c:zc2:chest_boss']) throw new Error('熔岩獸的寶箱沒拿到');
  await tapObj('up', '回 1 樓的樓梯');
  if ((await save()).mapId !== 'zc1') throw new Error('沒有回到熔岩洞窟 1 樓');
  await tapObj('up', '回沙漠的出口');
  if ((await save()).mapId !== 'z') throw new Error('沒有走回火山沙漠');
  await tapObj('stone', '砂岩（ㄕ）'); await tapObj('chest_stone', '砂岩後的寶箱');
  await tapObj('quicksand', '流沙（ㄖ）'); await tapObj('chest_sun', '流沙下的寶箱');
  f = await flags();
  if (!f['g:z:stone'] || !f['c:z:chest_stone'] || !f['g:z:quicksand'] || !f['c:z:chest_sun']) throw new Error('砂岩／流沙機關失敗 ' + JSON.stringify(f));
  await snap('desert-gimmicks');
  log('✓ ㄕ震碎砂岩、ㄖ曬乾流沙，各取得寶箱');
  await tapObj('gate_back', '沙漠大門（回綠洲鎮）');
  if ((await save()).mapId !== 'zh') throw new Error('沒有從沙漠回到綠洲鎮');
  await tapObj('road_home', '綠洲鎮的沙漠小路（回起始村）');
  if ((await save()).mapId !== 'village') throw new Error('沒有從沙漠小路走回起始村');
  log('✓ 第五關走完：綠洲鎮、火山沙漠、熔岩洞窟、沙漠小路回起始村');
}
if (run('lv6')) {
  // ───── 熱氣球、雲上小鎮與星空島（ㄗㄘㄙ）、星塔、星空龍王（畢業考）、結尾 ─────
  // 起始村的熱氣球（打倒熔岩獸後出現）一開始沒有氣：要用 ㄖ（sun）烤熱，走既有的機關施放流程
  await tapObj('balloon_empty', '起始村沒有氣的熱氣球（ㄖ）');
  f = await flags();
  if (!f['g:village:balloon_empty']) throw new Error('熱氣球沒有被烤熱 ' + JSON.stringify(f));
  if (await hasObj('balloon_empty') || !(await hasObj('balloon'))) throw new Error('烤熱後應該換成可以搭乘的熱氣球');
  log('✓ ㄖ烤熱了熱氣球');
  await tapObj('balloon', '起始村的熱氣球（去雲上小鎮；出發選擇由 pump 自動選第一個）');
  if ((await save()).mapId !== 'sh') throw new Error('沒有搭熱氣球到雲上小鎮');
  f = await flags();
  if (!f['visited:sh']) throw new Error('到雲上小鎮後應該記下去過 ' + JSON.stringify(f));
  await snap('hub-s');
  // 旅館：金幣不夠不能住（不扣錢）；夠了才住（回滿 HP、扣 25 金幣）
  await ev(() => { const g = window.__game.G.save; g.coins = 10; g.party[0].hp = 1; });
  await tapObj('door_inn', '雲上小鎮旅館的門');
  if ((await save()).mapId !== 'sh_inn') throw new Error('沒有進入雲上小鎮旅館');
  await tapObj('keeper', '旅館老闆（金幣不夠）');
  inn = await save();
  if (inn.coins !== 10 || inn.party[0].hp !== 1) throw new Error('雲上小鎮：金幣不夠時不該扣錢或回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  await ev(() => { window.__game.G.save.coins = 100; });
  await tapObj('keeper', '旅館老闆（住一晚）');
  inn = await save();
  if (inn.coins !== 75 || !(inn.party[0].hp > 1)) throw new Error('雲上小鎮：住一晚後應該扣 25 金幣並回血 ' + JSON.stringify({ coins: inn.coins, hp: inn.party[0].hp }));
  log('✓ 雲上小鎮旅館：金幣不夠不能住，夠了住一晚回滿並扣 25 金幣');
  await tapObj('door', '離開雲上小鎮旅館');
  if ((await save()).mapId !== 'sh') throw new Error('沒有走出雲上小鎮旅館');
  await tapObj('boat_s', '雲朵小船（去星空島）');
  if ((await save()).mapId !== 's') throw new Error('沒有搭雲朵小船到星空島');
  f = await flags();
  if (!f.sEntered) throw new Error('進星空島後應該開始教 ㄗㄘ ' + JSON.stringify(f));
  await snap('skyisle');
  await tapObj('dummy', '星空島練習稻草布偶');
  s = await save();
  if (!s.flags.spracticeDone || !s.abilities.includes('zip') || !s.abilities.includes('spike')) throw new Error('練習戰後沒有學到拉鍊／刺球 ' + JSON.stringify(s.abilities));
  const intro8 = s.introduced; if (!intro8 || !intro8.includes('ㄗ') || !intro8.includes('ㄘ')) throw new Error('練習戰之後 ㄗㄘ 應該已經上過課 ' + JSON.stringify(intro8));
  log('✓ 星空島練習戰完成，學會 zip（ㄗ）與 spike（ㄘ）');
  await tapObj('chest_1', '星空島寶箱');
  await tapObj('zip_curtain', '拉鍊雲幕（ㄗ）'); await tapObj('chest_zip', '雲幕後的寶箱');
  await tapObj('cloud_block', '刺刺的雲團（ㄘ）'); await tapObj('chest_spike', '雲團後的寶箱');
  f = await flags();
  if (!f['g:s:zip_curtain'] || !f['c:s:chest_zip'] || !f['g:s:cloud_block'] || !f['c:s:chest_spike']) throw new Error('雲幕／雲團機關失敗 ' + JSON.stringify(f));
  await snap('skyisle-gimmicks');
  log('✓ ㄗ拉開雲幕、ㄘ戳破雲團，各取得寶箱（星光河的彩虹橋要等學會 ㄙ）');
  for (const m of ['m1', 'm2', 'm3']) if (await hasObj(m)) await tapObj(m, '星空島小怪 ' + m); // 有的小怪可能已經被前面的步驟順手打掉

  // ───── 小王：星門守衛（有護盾，要用魔法才打得到）─────
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力讓它破得了護盾
  await tapObj('guard', '星門守衛小王');
  s = await save();
  if (!s.flags.boss_s1 || !s.abilities.includes('whistle')) throw new Error('小王沒有打贏，或沒有學到 whistle（ㄙ） ' + JSON.stringify({ flags: s.flags.boss_s1, abilities: s.abilities }));
  const intro9 = s.introduced; if (!intro9 || !intro9.includes('ㄙ')) throw new Error('小王之後 ㄙ 應該已經上過課 ' + JSON.stringify(intro9));
  await snap('after-boss-s1');
  log('✓ 小王打贏了（護盾被魔法打破），學會 whistle（ㄙ）');
  await tapObj('rainbow', '星光河的缺口（ㄙ）');
  if (!(await flags())['g:s:rainbow']) throw new Error('彩虹橋沒有架起來');
  await tapObj('chest_r1', '對岸寶箱 1'); await tapObj('chest_r2', '對岸寶箱 2');
  f = await flags();
  if (!f['c:s:chest_r1'] || !f['c:s:chest_r2']) throw new Error('彩虹橋對岸的寶箱沒拿到 ' + JSON.stringify(f));
  await snap('skyisle-rainbow');
  log('✓ ㄙ吹出彩虹橋，走過星光河取得對岸的寶箱');

  // ───── 星塔（星空龍王有護盾，畢業考）─────
  await tapObj('cave', '星塔入口（打倒小王後出現）');
  if ((await save()).mapId !== 'sc1') throw new Error('沒有進入星塔 1 樓');
  await snap('stower-1f');
  // 順序：鑰匙 → 鎖門 → 裂石（產生的迷宮裡裂石可能在鎖門後面）
  await tapObj('chest_key', '鑰匙寶箱');
  if (((await save()).items.key ?? 0) !== 1) throw new Error('星塔沒有拿到小鑰匙');
  await tapObj('door', '鎖住的門');
  f = await flags();
  if (!f['k:sc1:door'] || ((await save()).items.key ?? 0) !== 0) throw new Error('星塔的鎖門沒有打開、或鑰匙沒有用掉 ' + JSON.stringify(f));
  await tapObj('rock_h', '裂石'); await tapObj('chest_h', '隱藏房間的寶箱');
  f = await flags();
  if (!f['r:sc1:rock_h'] || !f['c:sc1:chest_h']) throw new Error('星塔的裂石／隱藏寶箱失敗 ' + JSON.stringify(f));
  log('✓ 星塔 1 樓：打碎裂石、拿到小鑰匙、用鑰匙開了鎖門');
  await tapObj('down', '往 2 樓的樓梯');
  if ((await save()).mapId !== 'sc2') throw new Error('沒有走到星塔 2 樓');
  await snap('stower-2f');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力：星星小精靈、彗星怪是回音怪，要用魔法攻擊才有傷害
  await tapObj('switch1', '雲團開關（ㄙ口哨風）');
  f = await flags();
  if (!f['g:sc2:switch1']) throw new Error('星塔 2 樓的雲團開關沒有啟動 ' + JSON.stringify(f));
  log('✓ 星塔 2 樓：口哨風吹走雲團、雲牆消失');
  await ev(() => { const m = window.__game.G.save.party[0]; m.mp = 5; }); // 補魔力讓它破得了星空龍王的護盾（一擊必殺開著也一樣：被護盾擋下的那一擊是 0 傷害）
  await tapObj('boss', '星空龍王（畢業考）');
  s = await save();
  if (!s.flags.boss_s) throw new Error('星空龍王沒有打贏 ' + JSON.stringify(s.flags));
  await pump(idle, '結尾劇情'); // 打贏後的結尾對話（ENDING_LINES）由 pump 一句一句點掉
  s = await save();
  if (!s.titles.includes('title_hero') || s.title !== 'title_hero' || !s.flags.endingSeen) throw new Error('結尾後應該得到稱號「注音大英雄」 ' + JSON.stringify({ titles: s.titles, title: s.title, endingSeen: s.flags.endingSeen }));
  await snap('ending');
  log('✓ 星空龍王打贏了（護盾被魔法打破），結尾劇情播完，得到稱號「注音大英雄」');
  await tapObj('chest_boss', '頭目寶箱');
  if (!(await flags())['c:sc2:chest_boss']) throw new Error('星空龍王的寶箱沒拿到');
  await tapObj('up', '回 1 樓的樓梯');
  if ((await save()).mapId !== 'sc1') throw new Error('沒有回到星塔 1 樓');
  await tapObj('up', '回星空島的出口');
  if ((await save()).mapId !== 's') throw new Error('沒有走回星空島');
  await tapObj('boat_back', '星空島的雲朵小船（回雲上小鎮）');
  if ((await save()).mapId !== 'sh') throw new Error('沒有從星空島回到雲上小鎮');
  await tapObj('balloon_back', '雲上小鎮的停機坪（熱氣球回起始村）');
  if ((await save()).mapId !== 'village') throw new Error('沒有搭熱氣球回起始村');
  log('✓ 第六關走完：熱氣球、雲上小鎮、星空島、星塔、星空龍王、結尾，搭熱氣球回起始村');
}
if (SECTION === 'lv2' || SECTION === 'lv3') {
  await doTap(23, 10, '主島東邊的碼頭（回起始村）');
  if ((await save()).mapId !== 'village') throw new Error('沒有從主島回到起始村');

}

// ───── 回家睡覺：HP／魔力回滿 ─────
await ev(() => { const m = window.__game.G.save.party[0]; m.hp = 1; m.mp = 0; });
await doTap(5, 3, '回家');
if ((await save()).mapId !== 'room') throw new Error('沒有回到房間');
await doTap(1, 2, '床');
const rested = await ev(() => { const G = window.__game.G; const m = G.save.party[0]; return { hp: m.hp, mp: m.mp }; });
if (rested.hp <= 1 || rested.mp <= 0) throw new Error('睡覺後沒有回復 ' + JSON.stringify(rested));
log('✓ 睡一覺後 HP/MP 回復', JSON.stringify(rested));

// ───── 存檔 / 繼續 ─────
const final = await save();
await page.reload();
await page.waitForSelector('#screen .menu');
await snap('title-continue');
await page.click('#screen [data-a=continue]');
await page.waitForFunction(() => !document.querySelector('#screen .menu'));
await sleep(800);
const loaded = await save();
if (loaded.mapId !== final.mapId || loaded.party.length !== final.party.length || loaded.stars !== final.stars) throw new Error('繼續冒險讀檔不一致');
log('✓ 重新整理後「繼續冒險」還原存檔：地圖', loaded.mapId, '星星', loaded.stars);

log('統計', JSON.stringify(Object.fromEntries(Object.entries(final.stats).map(([k, v]) => [k, [v.first, v.assisted, v.wrong, v.hints]]))));
log(errors.length ? '⚠ 瀏覽器錯誤:\n' + errors.join('\n') : '✓ 沒有瀏覽器錯誤');
await browser.close();
process.exit(errors.length ? 1 : 0);
