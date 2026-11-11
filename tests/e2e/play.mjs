// 端對端實測：用真實點擊從頭玩到尾（起始村 → 小關A → 小關B → 返回村莊用能力 → 畢業戰 → 成果）。
// 用法：先 `npm run dev`，再 `node tests/e2e/play.mjs [網址] [截圖資料夾]`
import { chromium } from 'playwright-core';
import fs from 'node:fs';

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
      return { low, heal, itemPick: !!itemPick, top, dlg, pick: !!pick, note: !!note, move: !!move, opts: opts.map((o) => o.dataset.ch), big, glow: glow?.dataset.ch, results: !!results, msg: document.querySelector('#battleui .msg')?.textContent ?? '' };
    });
    if (st.pick) { await sleep(300); await page.click('#modal [data-a=c][data-i="0"]').catch(() => {}); await sleep(150); continue; }
    if (st.dlg) { await sleep(300); await page.click('#dialog [data-a=next]').catch(() => {}); }
    else if (st.note) { await sleep(300); await page.click('#battleui [data-a=ok]').catch(() => {}); }
    else if (st.itemPick) { await page.click(`#battleui [data-a=it][data-id=${st.heal ?? 'potion'}]`).catch(() => {}); usedPotions++; }
    else if (st.low) { await page.click('#battleui .grid4 [data-a=item]').catch(() => {}); }
    else if (st.top.length) { if (!seenTop) { seenTop = true; await snap('battle-menu'); } await page.click(`#battleui .grid4 [data-a=pick][data-m=${process.env.MODE ?? st.top[0]}]:not([disabled])`).catch(() => page.click(`#battleui .grid4 [data-a=pick][data-m=${st.top[0]}]`).catch(() => {})); }
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
const idle = () => ev(() => { const w = window.__game.world(); return !w.moving && !w.busy && w.queue.length === 0 && !document.querySelector('#dialog .box') && document.querySelector('#battleui').hidden; });
const visibleTile = (x, y) => ev(([x, y]) => {
  const cam = window.__game.world().cameras.main, v = cam.worldView;
  return x * 16 >= v.x + 4 && x * 16 + 16 <= v.right - 4 && y * 16 >= v.y + 40 / cam.zoom && y * 16 + 16 <= v.bottom - 4;
}, [x, y]);
/** 點擊目標；若目標不在畫面內，先沿路徑點擊畫面內最遠的一格（和真人一樣得先走近） */
const doTap = async (x, y, label) => {
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

// ───── 開始 ─────
await page.goto(URL);
await page.waitForSelector('#screen .menu');
await snap('title');
await page.click('#screen [data-a=new]');
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
if (s.party.length !== 1 || s.party[0].species !== STARTER || !f.starterChosen || !f.giftGiven) throw new Error('選夥伴流程不對 ' + JSON.stringify({ party: s.party, f }));
if (!s.items.potion || !s.items.berry) throw new Error('博士沒有給道具 ' + JSON.stringify(s.items));
await snap('starter-picked');
log('✓ 研究所選了', STARTER, '，拿到道具', JSON.stringify(s.items));
await doTap(5, 8, '離開研究所');
if ((await save()).mapId !== 'village') throw new Error('沒有回到村子');

// ───── 第 0 關 ─────
await doTap(8, 10, '村裡寶箱（小藥水）');
if ((await save()).items.potion < 4) throw new Error('寶箱沒給小藥水');
await doTap(16, 11, '練習戰');
f = await flags();
if (!f.practiceDone) throw new Error('練習戰沒有完成');
await snap('practice-done');
if (!(await save()).abilities.includes('blast') || !(await save()).abilities.includes('gust')) throw new Error('練習戰後沒有爆破拳／噴風');
log('✓ 小關A（ㄅㄆ）練習戰完成，學會爆破拳與噴風');
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
let inn = await save();
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
await doTap(23, 10, '主島東邊的碼頭（回起始村）');
if ((await save()).mapId !== 'village') throw new Error('沒有從主島回到起始村');

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
