// AudioManager：分開管理 ① 劇情 TTS ② 注音單音檔 ③ 背景音樂 ④ 音效。
import { ZHUYIN_AUDIO } from '../data/audioMap';
import { G } from './save';
import { isSpeakable, splitZhuyin } from './speech';
import type { Segment } from './speech';

export type VoiceStatus = 'checking' | 'ok' | 'approx' | 'none' | 'unsupported';
export type Sfx = 'tap' | 'correct' | 'wrong' | 'hit' | 'blast' | 'wind' | 'peck' | 'chest' | 'levelup' | 'hatch' | 'rock' | 'win' | 'hint';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// 原創的簡單音樂：每個主題一段旋律（MIDI 音高，0 為休止）與低音
const THEMES: Record<string, { mel: number[]; bass: number[]; step: number; wave: OscillatorType }> = {
  village: { mel: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 72, 0, 0, 0, 74, 0, 77, 0, 81, 0, 79, 0, 76, 0, 72, 0, 74, 0, 0, 0], bass: [48, 55, 53, 55], step: 0.26, wave: 'triangle' },
  valley: { mel: [69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 71, 0, 69, 0, 0, 0, 65, 0, 69, 0, 72, 0, 69, 0, 71, 0, 67, 0, 69, 0, 0, 0], bass: [45, 41, 43, 45], step: 0.3, wave: 'triangle' },
  meadow: { mel: [79, 0, 83, 0, 86, 0, 83, 0, 81, 0, 79, 0, 76, 0, 0, 0, 74, 0, 79, 0, 83, 0, 81, 0, 79, 0, 74, 0, 79, 0, 0, 0], bass: [43, 50, 48, 50], step: 0.24, wave: 'triangle' },
  battle: { mel: [67, 70, 74, 70, 67, 70, 74, 79, 77, 74, 70, 74, 77, 74, 70, 67], bass: [43, 43, 46, 48], step: 0.18, wave: 'square' },
};

class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private bgmGain?: GainNode;
  private sfxGain?: GainNode;
  private voices: SpeechSynthesisVoice[] = [];
  private voice?: SpeechSynthesisVoice;
  status: VoiceStatus = 'checking';
  zhuyinReady: Record<string, boolean> = {};
  private buffers: Record<string, AudioBuffer> = {};
  private theme = '';
  private timer?: number;
  private nextTime = 0;
  private stepIdx = 0;
  private speaking = false;
  private onStatus: Array<() => void> = [];
  lastSpoken = '';
  /** 預先產生的語音檔：文字 → 檔名（public/audio/voice/manifest.json） */
  voiceFiles: Record<string, string> = {};
  private voiceGain?: GainNode;
  private voiceSrc?: AudioBufferSourceNode;
  private voiceBufs = new Map<string, AudioBuffer>();
  private speakToken = 0;
  /** 最近一次拆段朗讀的執行記錄（除錯與測試用） */
  trace: string[] = [];

  constructor() {
    if ('speechSynthesis' in window) {
      this.pickVoice();
      // iOS / Chrome 會延後載入語音清單
      speechSynthesis.addEventListener?.('voiceschanged', () => this.pickVoice());
    } else {
      this.status = 'unsupported';
    }
  }
  onStatusChange(fn: () => void) { this.onStatus.push(fn); }
  private pickVoice() {
    if (!('speechSynthesis' in window)) return;
    this.voices = speechSynthesis.getVoices();
    if (!this.voices.length) return;
    const norm = (l: string) => l.replace('_', '-').toLowerCase();
    const tw = this.voices.find((v) => norm(v.lang) === 'zh-tw');
    const zh = this.voices.find((v) => norm(v.lang).startsWith('zh'));
    this.voice = tw ?? zh;
    this.status = tw ? 'ok' : zh ? 'approx' : 'none';
    this.onStatus.forEach((f) => f());
  }
  /** 這台裝置的網頁實際拿得到的中文語音（用於家長設定的語音清單） */
  zhVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('zh'));
  }
  allVoiceCount(): number { return 'speechSynthesis' in window ? speechSynthesis.getVoices().length : 0; }
  private chosen(): SpeechSynthesisVoice | undefined {
    const uri = G.settings.voiceURI;
    return uri ? speechSynthesis.getVoices().find((v) => v.voiceURI === uri) : undefined;
  }
  statusText(): string {
    switch (this.status) {
      case 'ok': return `語音：已找到 zh-TW（${this.voice?.name ?? ''}）`;
      case 'approx': return `語音：沒有 zh-TW，改用 ${this.voice?.lang}（腔調可能不同）`;
      case 'none': return '語音：此裝置沒有中文語音，只顯示文字。';
      case 'unsupported': return '語音：此瀏覽器不支援語音合成，只顯示文字。';
      default: return '語音：偵測中…';
    }
  }

  /** 必須在使用者點擊（手勢）中呼叫：解鎖 AudioContext 與 speechSynthesis（iOS Safari 要求）。 */
  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.voiceGain = this.ctx.createGain();
        this.voiceGain.connect(this.master);
        this.bgmGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.applySettings();
      }
    }
    const resumed = this.ctx?.resume();
    // 以音量 0 的空白語句「暖機」：必須在手勢中同步呼叫，之後非手勢觸發的語音才能播出（iOS Safari）
    if ('speechSynthesis' in window) {
      this.pickVoice();
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        speechSynthesis.speak(u);
      } catch { /* ignore */ }
    }
    try { await resumed; } catch { /* ignore */ }
    this.probeZhuyin();
  }

  // ───── ① 劇情 TTS ─────
  /** 載入預錄語音清單；沒有清單（沒產生過）就全部使用瀏覽器語音合成。 */
  async loadVoiceManifest() {
    try {
      const res = await fetch('audio/voice/manifest.json');
      if (!res.ok || !/json/i.test(res.headers.get('content-type') ?? '')) return;
      const m = await res.json();
      this.voiceFiles = m.lines ?? {};
      this.onStatus.forEach((f) => f());
    } catch { /* 沒有清單：正常 */ }
  }
  prerecordedCount() { return Object.keys(this.voiceFiles).length; }
  private async playFile(file: string, token: number) {
    try {
      let buf = this.voiceBufs.get(file);
      if (!buf) {
        const res = await fetch('audio/voice/' + file);
        if (!res.ok) throw new Error('missing');
        buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
        this.voiceBufs.set(file, buf);
      }
      if (token !== this.speakToken) return; // 已經換成新的一句
      this.speaking = true; this.duck(true);
      await this.playBuffer(buf);
      if (token === this.speakToken) { this.speaking = false; this.duck(false); }
    } catch {
      if (token === this.speakToken) this.speakPlain(this.lastSpoken, token); // 檔案壞了就退回語音合成
    }
  }
  speak(text: string) {
    this.lastSpoken = text;
    const token = ++this.speakToken;
    this.stopFile();
    if (!G.settings.voiceOn) return;
    const file = this.voiceFiles[text];
    if (file && this.ctx && this.voiceGain) { void this.playFile(file, token); return; }
    this.speakPlain(text, token);
  }
  /** 沒有整句預錄檔時：含注音符號就拆段（文字用語音合成、符號播注音音檔），否則整句語音合成 */
  private speakPlain(text: string, token: number) {
    const segs = splitZhuyin(text);
    if (segs.some((x) => x.t === 'sym')) void this.runSegments(segs, token);
    else this.speakTts(text);
  }
  /** 依序播放：文字段用語音合成，符號段播 audio/zhuyin 的音檔。沒有音檔的符號直接略過（不讓語音引擎亂念）。 */
  private async runSegments(segs: Segment[], token: number) {
    this.trace = [];
    this.speaking = true; this.duck(true);
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* ignore */ }
    try {
      for (const sg of segs) {
        if (token !== this.speakToken) return;
        if (sg.t === 'sym') {
          const buf = this.buffers[sg.v];
          if (buf && this.ctx && this.voiceGain) { this.trace.push('sym:' + sg.v); await this.playBuffer(buf); }
          else if (G.settings.experimentalSymbolTts) { this.trace.push('tts:' + sg.v); await this.ttsAsync(sg.v); }
          else this.trace.push('skip:' + sg.v);
        } else if (isSpeakable(sg.v)) { this.trace.push('tts:' + sg.v); await this.ttsAsync(sg.v); }
      }
    } finally {
      if (token === this.speakToken) { this.speaking = false; this.duck(false); }
    }
  }
  private playBuffer(buf: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ctx || !this.voiceGain) return resolve();
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.voiceGain);
      this.voiceSrc = src;
      src.onended = () => { if (this.voiceSrc === src) this.voiceSrc = undefined; resolve(); };
      src.start();
    });
  }
  private ttsAsync(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || this.status === 'none') return resolve();
      try {
        const u = this.makeUtterance(text);
        let done = false;
        const fin = () => { if (!done) { done = true; resolve(); } };
        u.onend = fin; u.onerror = fin;
        setTimeout(fin, 4000 + (text.length * 500) / G.settings.rate); // 保險：語音引擎沒回報結束也不卡住
        speechSynthesis.speak(u);
      } catch { resolve(); }
    });
  }
  private makeUtterance(text: string) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    const v = this.chosen() ?? this.voice;
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = G.settings.rate;
    u.pitch = 1.1;
    return u;
  }
  /** 直接交給語音合成，不拆段、不播注音音檔（僅供家長設定的「符號本身」發音測試） */
  speakRaw(text: string) {
    this.lastSpoken = text;
    this.speakToken++;
    this.stopFile();
    if (G.settings.voiceOn) this.speakTts(text);
  }
  private stopFile() {
    try { this.voiceSrc?.stop(); } catch { /* ignore */ }
    this.voiceSrc = undefined;
  }
  private speakTts(text: string) {
    if (!('speechSynthesis' in window) || this.status === 'none') return;
    try {
      speechSynthesis.cancel(); // 避免舊語音堆積
      const u = this.makeUtterance(text);
      u.onstart = () => { this.speaking = true; this.duck(true); };
      const end = () => { this.speaking = false; this.duck(false); };
      u.onend = end;
      u.onerror = end;
      speechSynthesis.speak(u);
    } catch { /* 語音失敗不應卡住遊戲 */ }
  }
  stopSpeech() {
    this.speakToken++;
    this.stopFile();
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* ignore */ }
    this.speaking = false;
    this.duck(false);
  }
  replay() { if (this.lastSpoken) this.speak(this.lastSpoken); }
  private duck(on: boolean) {
    if (!this.bgmGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(t);
    this.bgmGain.gain.linearRampToValueAtTime(G.settings.bgmOn ? (on ? 0.25 : 1) : 0, t + 0.15);
  }

  // ───── ② 注音單音檔 ─────
  async probeZhuyin() {
    await Promise.all(Object.entries(ZHUYIN_AUDIO).map(async ([ch, url]) => {
      try {
        const res = await fetch(url);
        const type = res.headers.get('content-type') ?? '';
        // 開發伺服器對缺檔會回傳 index.html（200），必須檢查 content-type
        if (!res.ok || !/audio|ogg|mpeg|mp4|octet/i.test(type) || /html/i.test(type)) { this.zhuyinReady[ch] = false; return; }
        const data = await res.arrayBuffer();
        if (data.byteLength < 200) { this.zhuyinReady[ch] = false; return; }
        if (this.ctx) this.buffers[ch] = await this.ctx.decodeAudioData(data.slice(0));
        this.zhuyinReady[ch] = !!this.buffers[ch];
      } catch { this.zhuyinReady[ch] = false; }
    }));
    this.onStatus.forEach((f) => f());
  }
  hasSymbolAudio(ch: string) { return !!this.zhuyinReady[ch]; }
  /** 這批符號的音檔是否全部就緒；決定能不能出「聽音選符號」 */
  audioReadyFor(chs: string[]) { return chs.length > 0 && chs.every((c) => this.hasSymbolAudio(c)); }
  zhuyinSummary() {
    const ok = Object.keys(ZHUYIN_AUDIO).filter((c) => this.zhuyinReady[c]);
    return { ready: ok.length, total: Object.keys(ZHUYIN_AUDIO).length };
  }
  /** 播放注音單音。沒有音檔就回傳 false（不用 TTS 冒充標準發音，除非家長開啟實驗選項）。 */
  playSymbol(ch: string): boolean {
    const buf = this.buffers[ch];
    if (buf && this.ctx && this.sfxGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.sfxGain);
      src.start();
      return true;
    }
    if (G.settings.experimentalSymbolTts) { this.speak(ch); return true; }
    return false;
  }

  // ───── ③ 背景音樂 ─────
  applySettings() {
    if (!this.bgmGain || !this.sfxGain) return;
    this.bgmGain.gain.value = G.settings.bgmOn ? (this.speaking ? 0.25 : 1) : 0;
    this.sfxGain.gain.value = G.settings.sfxOn ? 1 : 0;
    if (this.voiceGain) this.voiceGain.gain.value = G.settings.voiceOn ? 1 : 0;
    this.master!.gain.value = 0.5;
  }
  playBgm(theme: string) {
    if (this.theme === theme) return;
    this.theme = theme;
    this.stepIdx = 0;
    if (!this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (this.timer == null) {
      this.timer = window.setInterval(() => this.schedule(), 100);
    }
  }
  private schedule() {
    const ctx = this.ctx, th = THEMES[this.theme];
    if (!ctx || !th || ctx.state !== 'running' || !G.settings.bgmOn) {
      if (ctx && this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.1;
      return;
    }
    while (this.nextTime < ctx.currentTime + 0.4) {
      const n = th.mel[this.stepIdx % th.mel.length];
      if (n) this.tone(midi(n), th.step * 0.9, th.wave, 0.09, this.nextTime, this.bgmGain!);
      if (this.stepIdx % 8 === 0) this.tone(midi(th.bass[(this.stepIdx / 8) % th.bass.length | 0]), th.step * 6, 'sine', 0.12, this.nextTime, this.bgmGain!);
      this.nextTime += th.step;
      this.stepIdx++;
    }
  }

  // ───── ④ 音效 ─────
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when: number, dest: AudioNode, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest);
    o.start(when); o.stop(when + dur + 0.05);
  }
  private noise(dur: number, vol: number, when: number, lowpass = 1800) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    s.buffer = b;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.sfxGain!);
    s.start(when);
  }
  sfx(name: Sfx) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !G.settings.sfxOn || ctx.state !== 'running') return;
    const t = ctx.currentTime, d = this.sfxGain;
    switch (name) {
      case 'tap': this.tone(660, 0.07, 'square', 0.12, t, d); break;
      case 'hint': this.tone(520, 0.1, 'sine', 0.2, t, d); this.tone(780, 0.14, 'sine', 0.2, t + 0.09, d); break;
      case 'correct': [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'square', 0.14, t + i * 0.08, d)); break;
      case 'wrong': this.tone(300, 0.2, 'triangle', 0.22, t, d, 220); break; // 柔和的「嗚」，不刺耳
      case 'hit': this.noise(0.15, 0.5, t); this.tone(180, 0.15, 'square', 0.2, t, d, 80); break;
      case 'blast': this.noise(0.4, 0.8, t, 900); this.tone(120, 0.4, 'sawtooth', 0.25, t, d, 40); break;
      case 'wind': this.noise(0.6, 0.35, t, 3500); this.tone(400, 0.5, 'sine', 0.1, t, d, 900); break;
      case 'peck': this.tone(900, 0.06, 'square', 0.15, t, d); this.tone(900, 0.06, 'square', 0.15, t + 0.1, d); break;
      case 'chest': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.2, t + i * 0.09, d)); break;
      case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.2, 'square', 0.13, t + i * 0.1, d)); break;
      case 'hatch': this.noise(0.1, 0.4, t); this.noise(0.1, 0.4, t + 0.2); [392, 587, 784].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.2, t + 0.4 + i * 0.1, d)); break;
      case 'rock': this.noise(0.5, 0.9, t, 1200); break;
      case 'win': [523, 523, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.13, t + i * 0.11, d)); break;
    }
  }
}

export const audio = new AudioManager();
