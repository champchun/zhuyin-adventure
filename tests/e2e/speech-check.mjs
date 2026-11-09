// 驗證：含注音符號的句子會拆段，符號播注音音檔、文字用語音合成；缺音檔的符號略過；停止會中斷。
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(process.argv[2] ?? 'http://127.0.0.1:5173/');
await p.waitForSelector('#screen .menu');
await p.click('#screen [data-a=new]');
await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  const a = window.__game.audio, out = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  out.symbolsReady = a.zhuyinSummary();
  a.speak('找找看，哪一個和蛋上的「ㄅ」一樣？'); await wait(16000);
  out.sentence = [...a.trace];
  a.speak('風翼鳥加入了你的隊伍！'); await wait(3000);
  out.name = [...a.trace];
  const saved = a.buffers['ㄅ']; delete a.buffers['ㄅ'];
  a.speak('先去 ㄅ 的山谷'); await wait(3000);
  out.missing = [...a.trace]; a.buffers['ㄅ'] = saved;
  a.speak('橘寶閃閃發光，長大了！'); await wait(100); a.stopSpeech(); await wait(3000);
  out.stoppedEarly = [...a.trace];
  return out;
});
console.log(JSON.stringify(r, null, 1), errs);
await b.close();
