// 以 Azure AI Speech 預先產生劇情語音 mp3。
//   npm run gen:voice -- --dry        只列出句子與預估字元數，不呼叫 Azure
//   npm run gen:voice                 產生缺少的句子（已存在且設定相同的會跳過）
//   npm run gen:voice -- --zhuyin     另外產生 7 個注音符號的呼讀音（public/audio/zhuyin/）
//   npm run gen:voice -- --only 你好  只產生含有這段文字的句子（試聽用）
// 環境變數：AZURE_SPEECH_KEY、AZURE_SPEECH_REGION（必填）；AZURE_SPEECH_VOICE（預設 zh-TW-HsiaoChenNeural）、
// AZURE_SPEECH_RATE（預設 -10%）。金鑰只放環境變數，不要寫進檔案或 commit。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { allVoiceLines } from '../src/data/voiceLines';
import { HUDU } from '../src/data/symbols';
import { ZHUYIN_AUDIO } from '../src/data/audioMap';

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
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
  if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

const lines = allVoiceLines().filter((l) => !only || l.includes(only));
const chars = lines.reduce((a, l) => a + l.length, 0);
console.log(`句子 ${lines.length} 句，共 ${chars} 字元；語音 ${VOICE}，語速 ${RATE}`);
if (has('--dry')) { lines.forEach((l) => console.log(' -', l)); process.exit(0); }
if (!KEY || !REGION) { console.error('缺少環境變數 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION'); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const manifestPath = path.join(OUT, 'manifest.json');
const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { lines: {} };
const manifest: { voice: string; rate: string; lines: Record<string, string> } = { voice: VOICE, rate: RATE, lines: only ? { ...prev.lines } : {} };

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

if (has('--zhuyin')) {
  const useIpa = process.env.AZURE_USE_IPA === '1';
  for (const [sym, rel] of Object.entries(ZHUYIN_AUDIO)) {
    const h = HUDU[sym];
    if (!h) continue;
    const inner = useIpa && h.ipa ? `<phoneme alphabet="ipa" ph="${h.ipa}">${esc(h.char)}</phoneme>` : esc(h.char);
    const dest = path.join(ZH_OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, await synth(inner));
    console.log(`  注音 ${sym} → ${rel}（${useIpa && h.ipa ? 'IPA ' + h.ipa : '字「' + h.char + '」'}${h.approx ? '，近似音' : ''}）`);
  }
  console.log('注音呼讀音已產生。請務必親耳試聽確認，這是語音合成，不是真人標準音。');
}
