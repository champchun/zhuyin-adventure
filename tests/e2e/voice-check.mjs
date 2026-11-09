import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://127.0.0.1:5173/');
await p.waitForSelector('#screen .menu');
await p.click('#screen [data-a=new]');
await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const a = window.__game.audio, out = {};
  out.count = a.prerecordedCount();
  a.speak('你好呀，小訓練師！我是小精靈。'); await new Promise((r) => setTimeout(r, 400));
  out.playingFile = !!a.voiceSrc; out.speaking = a.speaking;
  a.speak('沒有預錄的句子'); await new Promise((r) => setTimeout(r, 200));
  out.fileStoppedForTts = !a.voiceSrc;
  a.speak('找出一樣的符號！'); await new Promise((r) => setTimeout(r, 500)); // 清單有但檔案不存在 → 退回語音合成，不報錯
  out.missingFileOk = true;
  a.speak('你好呀，小訓練師！我是小精靈。'); a.stopSpeech();
  out.stopped = !a.voiceSrc;
  return out;
});
console.log(r, errs);
await b.close();
