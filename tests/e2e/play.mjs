// 端對端實測：用真實點擊從頭玩到尾（起始村 → ㄅ關 → 返回村莊用能力 → ㄆ關 → 成果）。
// 用法：先 `npm run dev`，再 `node tests/e2e/play.mjs [網址] [截圖資料夾]`
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const URL = process.argv[2] ?? 'http://127.0.0.1:5173/';
const OUT = process.argv[3] ?? './e2e-shots';
fs.mkdirSync(OUT, { recursive: true });
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
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
    const z = cam.zoom;
    return { x: c.left + (x * 16 + 8 - cam.worldView.x) * z, y: c.top + (y * 16 + 8 - cam.worldView.y) * z };
  }, [x, y]);
  await page.mouse.click(pos.x, pos.y);
}

/** 處理畫面上的對話／戰鬥／彈窗，直到 cond() 成立 */
async function pump(cond, label, maxMs = 300000) {
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
      return { dlg, note: !!note, move: !!move, opts: opts.map((o) => o.dataset.ch), big, glow: glow?.dataset.ch, results: !!results, msg: document.querySelector('#battleui .msg')?.textContent ?? '' };
    });
    if (st.dlg) { await sleep(300); await page.click('#dialog [data-a=next]').catch(() => {}); }
    else if (st.note) { await sleep(300); await page.click('#battleui [data-a=ok]').catch(() => {}); }
    else if (st.move) { await page.click('#battleui [data-a=move] >> nth=-1').catch(() => {}); }
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
  const T0 = Date.now(); process.env.DBG && log('  ...', label);
  for (let i = 0; i < 10; i++) {
    if (await visibleTile(x, y)) {
      await tapTile(x, y); await sleep(250); await pump(idle, label);
      if (process.env.DBG) log('  tap', label, JSON.stringify(await ev(() => { const w = window.__game.world(); return { tx: w.tx, ty: w.ty, busy: w.busy, moving: w.moving, blocking: window.__game.ui.blocking, ready: w.ready, active: w.scene.isActive(), zoom: w.cameras.main.zoom }; })));
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
await page.waitForFunction(() => !document.querySelector('#screen .menu'));
await pump(idle, 'intro');
await snap('village-start');
log('✓ 新的冒險、開場');

// ───── 第 0 關 ─────
await doTap(12, 8, '小精靈'); await doTap(8, 10, '教學寶箱'); await doTap(12, 8, '小精靈2');
let f = await flags();
if (!f.guideMet || !f['c:village:chest_t'] || !f.tutorialDone) throw new Error('教學流程旗標不對 ' + JSON.stringify(f));
await snap('egg-appeared');
await doTap(15, 9, '神祕蛋');
let s = await save();
if (!s.party.length || !s.flags.eggHatched) throw new Error('蛋沒有孵化');
await snap('hatched');
log('✓ 蛋孵化，ㄅ寶加入隊伍:', s.party.map((m) => m.species).join());
await doTap(16, 11, '練習戰');
f = await flags();
if (!f.practiceDone) throw new Error('練習戰沒有完成');
await snap('practice-done');
log('✓ 練習戰完成並存檔');

// ───── ㄅ關 ─────
await doTap(4, 17, 'ㄅ門');
if ((await save()).mapId !== 'b') throw new Error('沒有進入 ㄅ 關');
await snap('valley');
for (const [x, y, n] of [[9, 15, '寶箱1'], [11, 16, '小怪1'], [15, 12, '小怪2'], [18, 10, '寶箱2'], [16, 6, '小怪3']]) await doTap(x, y, n);
await doTap(22, 4, '頭目');
s = await save();
if (!s.abilities.includes('blast') || !s.flags.boss_b) throw new Error('頭目後沒有爆破拳');
if (s.party[0].stage !== 1) throw new Error('ㄅ寶沒有成長');
await snap('boss-b-done');
log('✓ ㄅ關頭目完成，爆破拳解鎖，ㄅ寶成長 → Lv.' + s.party[0].level);
await doTap(10, 11, '裂石（爆破拳）'); await doTap(3, 9, '裂石後寶箱');
f = await flags();
if (!f['r:b:rock_b'] || !f['c:b:chest_rock']) throw new Error('山谷裂石／寶箱失敗');
log('✓ 用爆破拳打碎山谷裂石並取得寶箱');
await doTap(4, 18, '回村');
if ((await save()).mapId !== 'village') throw new Error('沒有回村');
await doTap(23, 4, '村裡裂石'); await doTap(23, 3, '隱藏寶箱');
f = await flags();
if (!f['r:village:rock_a'] || !f['c:village:chest_hidden']) throw new Error('村裡裂石／隱藏寶箱失敗');
await snap('village-hidden-chest');
log('✓ 村莊裂石與隱藏寶箱');

// ───── ㄆ關 ─────
await doTap(7, 17, 'ㄆ門');
if ((await save()).mapId !== 'p') throw new Error('沒有進入 ㄆ 關');
await snap('meadow');
for (const [x, y, n] of [[7, 14, '葉蟲1'], [6, 11, '寶箱'], [11, 13, '葉蟲2']]) await doTap(x, y, n);
// 橋在 (14..15,15)，路徑尋找會自動經過
for (const [x, y, n] of [[18, 11, '葉蟲3'], [20, 9, '寶箱']]) await doTap(x, y, n);
await doTap(22, 4, '風車怪王');
s = await save();
if (!s.party.some((m) => m.species === 'pipi') || !s.abilities.includes('gust')) throw new Error('ㄆ翼鳥或噴風沒有取得');
await snap('after-boss-p');
log('✓ ㄆ關完成，ㄆ翼鳥加入，噴風解鎖，隊伍：', s.party.map((m) => m.species + ' Lv' + m.level).join());
await doTap(11, 9, '風車'); await doTap(5, 7, '落葉'); await doTap(5, 4, '落葉後寶箱'); await doTap(22, 14, '木門(已開)').catch(() => {});
await doTap(23, 17, '木門後寶箱');
f = await flags();
if (!f.windmillOn || !f['l:p:leaves_a'] || !f['c:p:chest_leaf'] || !f['c:p:chest_wind']) throw new Error('噴風互動失敗 ' + JSON.stringify(f));
await snap('meadow-gust');
log('✓ 噴風：風車、落葉、木門皆可用');

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
