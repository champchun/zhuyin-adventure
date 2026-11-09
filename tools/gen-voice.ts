// 以 Azure AI Speech 預先產生劇情語音 mp3。
//   npm run gen:voice -- --dry        只列出句子與預估字元數，不呼叫 Azure
//   npm run gen:voice                 產生缺少的句子（已存在且設定相同的會跳過）
//   npm run gen:voice -- --zhuyin-only 只產生 7 個注音符號的呼讀音（public/audio/zhuyin/），不動劇情語音
//   npm run gen:voice -- --zhuyin     劇情語音之外，另外產生 7 個注音符號
//   npm run gen:voice -- --only 你好  只產生含有這段文字的句子（試聽用）
// 環境變數：AZURE_SPEECH_KEY、AZURE_SPEECH_REGION（必填）；AZURE_SPEECH_VOICE（預設 zh-TW-HsiaoChenNeural）、
// AZURE_SPEECH_RATE（預設 -10%）。金鑰只放環境變數，不要寫進檔案或 commit。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { allVoiceLines } from '../src/data/voiceLines';
import { HUDU, ZHUYIN_TEST } from '../src/data/symbols';
const EXAMPLE = Object.fromEntries(ZHUYIN_TEST.flatMap((g) => g.list));
import { ZHUYIN_AUDIO } from '../src/data/audioMap';

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const zhuyinTry = args.includes('--zhuyin-try');
const zhuyinOnly = args.includes('--zhuyin-only') || zhuyinTry; // 兩者都不碰劇情語音
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const VOICE = process.env.AZURE_SPEECH_VOICE ?? 'zh-TW-HsiaoChenNeural';
const RATE = process.env.AZURE_SPEECH_RATE ?? '-10%';
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
const OUT = path.resolve('public/audio/voice');
const ZH_OUT = path.resolve('public');
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ssml = (inner: string) =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="${VOICE}"><prosody rate="${RATE}">${inner}</prosody></voice></speak>`;
const fileOf = (text: string) => crypto.createHash('sha1').update(`${VOICE}|${RATE}|${text}`).digest('hex').slice(0, 12) + '.mp3';

async function synth(inner: string): Promise<Buffer> {
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY!,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': FORMAT,
      'User-Agent': 'zhuyin-adventure-voice-gen',
    },
    body: ssml(inner),
  });
  if (!res.ok) throw new Error(`Azure ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300) || '（無內容，通常代表 SSML 內容不被接受）'}`);
  return Buffer.from(await res.arrayBuffer());
}

// ───── 注音呼讀音 ─────
// 有 ipa 的符號（ㄅㄆㄇㄈ，ㄜ 呼讀）一律用 SSML 音標指定；沒有就用呼讀用字。AZURE_USE_IPA=0 可強制只用字。
// 注音產生模式（AZURE_ZHUYIN_MODE）：raw＝直接把符號丟給 Azure（預設，即試聽的 E 版）；char＝念呼讀用字；ipa＝音標（目前實測被 Azure 拒絕）
const ZMODE = (process.env.AZURE_ZHUYIN_MODE ?? 'raw') as 'raw' | 'char' | 'ipa';
const wantIpa = ZMODE === 'ipa';
const zhuyinInner = (sym: string) => {
  const h = HUDU[sym];
  if (ZMODE === 'ipa' && h?.ipa) return phoneme('ipa', h.ipa, h.char);
  if (ZMODE === 'char') return esc(h?.char ?? EXAMPLE[sym] ?? sym);
  return esc(sym);
};
const zhuyinDesc = (sym: string) => (ZMODE === 'ipa' && HUDU[sym]?.ipa ? 'IPA ' + HUDU[sym].ipa : ZMODE === 'char' ? '字「' + HUDU[sym]?.char + '」' : '直接念符號「' + sym + '」');
const phoneme = (alphabet: string, ph: string, text: string) => `<phoneme alphabet="${alphabet}" ph="${esc(ph)}">${esc(text)}</phoneme>`;


const lines = zhuyinOnly ? [] : allVoiceLines().filter((l) => !only || l.includes(only));
const chars = lines.reduce((a, l) => a + l.length, 0);
if (!zhuyinOnly) console.log(`句子 ${lines.length} 句，共 ${chars} 字元；語音 ${VOICE}，語速 ${RATE}`);
if (has('--dry')) {
  lines.forEach((l) => console.log(' -', l));
  if (zhuyinTry) console.log('試聽模式：為 ㄅㄆㄇㄈ 各產生數種寫法（A/B/F/H 為 IPA 變體、C/D 為 SAPI、E 直接念符號、G 基準念字）；檔名含語音名稱，可換 AZURE_SPEECH_VOICE 重跑比較，輸出到 tmp/zhuyin-try/');
  else if (zhuyinOnly || has('--zhuyin')) for (const sym of Object.keys(ZHUYIN_AUDIO)) {
    console.log(` - 注音 ${sym} → ${zhuyinDesc(sym)} → ${ZHUYIN_AUDIO[sym]}`);
  }
  process.exit(0);
}
if (!KEY || !REGION) { console.error('缺少環境變數 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION'); process.exit(1); }

const manifestPath = path.join(OUT, 'manifest.json');
const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { lines: {} };
const manifest: { voice: string; rate: string; lines: Record<string, string> } = { voice: VOICE, rate: RATE, lines: only ? { ...prev.lines } : {} };

if (!zhuyinOnly) {
fs.mkdirSync(OUT, { recursive: true });
let made = 0, skipped = 0;
for (const text of lines) {
  const f = fileOf(text);
  manifest.lines[text] = f;
  const p = path.join(OUT, f);
  if (fs.existsSync(p)) { skipped++; continue; }
  fs.writeFileSync(p, await synth(esc(text)));
  made++;
  console.log('  產生', f, text);
}
// 清掉不再使用的舊檔（只在完整產生時）
if (!only) {
  const used = new Set(Object.values(manifest.lines));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) fs.unlinkSync(path.join(OUT, f));
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`完成：新產生 ${made}，沿用 ${skipped}。manifest：${manifestPath}`);

}

if (zhuyinTry) {
  // 試聽：為 ㄅㄆㄇㄈ 各產生幾種寫法，輸出到 tmp/zhuyin-try/，聽哪一種像「ㄅㄜ」再告訴我
  const dir = path.resolve('tmp/zhuyin-try');
  fs.mkdirSync(dir, { recursive: true });
  const bopomofo: Record<string, [string, string]> = { 'ㄅ': ['ㄅ', 'b'], 'ㄆ': ['ㄆ', 'p'], 'ㄇ': ['ㄇ', 'm'], 'ㄈ': ['ㄈ', 'f'] };
  for (const sym of Object.keys(bopomofo)) {
    const h = HUDU[sym];
    const ipa = h.ipa!;
    const noTone = ipa.replace(/[˥˧˩˨˦]/g, '');
    const cands: Record<string, string> = {
      'A-ipa-一聲': phoneme('ipa', ipa, h.char),
      'B-ipa-無聲調': phoneme('ipa', noTone, h.char),
      'C-sapi-注音': phoneme('sapi', `${bopomofo[sym][0]} ㄜ 1`, h.char),
      'D-sapi-拼音': phoneme('sapi', `${bopomofo[sym][1]} e 1`, h.char),
      'F-ipa-無送氣記號': phoneme('ipa', ipa.replace('ʰ', 'h'), h.char),
      'H-ipa-ə': phoneme('ipa', ipa.replace('ɤ', 'ə'), h.char),
      'E-直接念符號': esc(sym),
      'G-基準（念字）': esc(h.char),
    };
    const seen = new Set<string>();
    for (const [name, inner] of Object.entries(cands)) {
      if (seen.has(inner)) continue; // 內容相同的寫法不重複產生
      seen.add(inner);
      const f = path.join(dir, `${sym}_${name}__${VOICE}.mp3`);
      try { fs.writeFileSync(f, await synth(inner)); console.log('  OK  ', f); }
      catch (e) { console.log(`  失敗 ${sym} ${name}：${(e as Error).message.slice(0, 120)}`); }
    }
  }
  console.log('\n試聽資料夾：' + dir + '\n挑出聽起來最像「ㄅㄜ／ㄆㄜ／ㄇㄜ／ㄈㄜ」的寫法（A/B/C/D）告訴我。');
  process.exit(0);
}

if (zhuyinOnly || has('--zhuyin')) {
  for (const [sym, rel] of Object.entries(ZHUYIN_AUDIO)) {
    void wantIpa;
    const inner = zhuyinInner(sym);
    const dest = path.join(ZH_OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      fs.writeFileSync(dest, await synth(inner));
      console.log(`  注音 ${sym} → ${rel}（${zhuyinDesc(sym)}）`);
    } catch (e) { console.log(`  失敗 ${sym}：${(e as Error).message.slice(0, 160)}`); }
  }
  console.log('注音呼讀音已產生。請務必親耳試聽確認，這是語音合成，不是真人標準音。');
}
