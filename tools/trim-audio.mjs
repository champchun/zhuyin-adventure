// 剪掉注音音檔頭尾的靜音（需要系統有 ffmpeg / ffprobe）。
//   node tools/trim-audio.mjs            剪裁 public/audio/zhuyin/*.mp3（原檔先備份到 tmp/zhuyin-orig/，已有備份就不覆蓋）
//   node tools/trim-audio.mjs --dry      只量測，不寫檔
//   node tools/trim-audio.mjs --db -45   調整靜音門檻（預設 -48 dB，數字越小越保守、剪得越少）
// 再次執行會從備份重新剪，所以可以換參數重試，不會越剪越短。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const db = args.includes('--db') ? +args[args.indexOf('--db') + 1] : -48;
const PAD = 0.06; // 頭尾各保留 60 ms，避免削到子音起音與尾音
const DIR = path.resolve('public/audio/zhuyin');
const BAK = path.resolve('tmp/zhuyin-orig');

const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
fs.mkdirSync(BAK, { recursive: true });
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.mp3'));
for (const f of files) if (!fs.existsSync(path.join(BAK, f))) fs.copyFileSync(path.join(DIR, f), path.join(BAK, f));

const sr = `silenceremove=start_periods=1:start_silence=${PAD}:start_threshold=${db}dB:detection=peak`;
const filter = `${sr},areverse,${sr},areverse,afade=t=in:d=0.005`;
let before = 0, after = 0;
const rows = [];
for (const f of files) {
  const src = path.join(BAK, f);
  const out = dry ? path.join(BAK, '..', '_probe.mp3') : path.join(DIR, f);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', filter, '-ar', '24000', '-ac', '1', '-b:a', '48k', out]);
  const a = dur(src), b = dur(out);
  before += a; after += b;
  rows.push(`${f.padEnd(8)} ${a.toFixed(2)}s → ${b.toFixed(2)}s`);
}
if (dry) fs.rmSync(path.join(BAK, '..', '_probe.mp3'), { force: true });
console.log(rows.join('\n'));
console.log(`\n門檻 ${db} dB，頭尾各留 ${PAD * 1000} ms；共 ${files.length} 檔，總長 ${before.toFixed(1)}s → ${after.toFixed(1)}s${dry ? '（試算，未寫入）' : ''}`);
const tooShort = rows.filter((r) => +r.split('→')[1].trim().replace('s', '') < 0.25);
if (tooShort.length) console.log('⚠ 剪完低於 0.25 秒（可能剪過頭，請試聽或調低門檻）：\n' + tooShort.join('\n'));
