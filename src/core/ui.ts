// DOM 介面：標題、對話、HUD、夥伴、家長設定、成果。
import { audio } from './audio';
import { G, PARTY_MAX, expNeeded, flag, hasAbility, hasSave, maxHp, saveGame, saveSettings, spriteOf, startNewGame } from './save';
import { SPECIES } from '../data/monsters';
import { ALL_SYMBOLS, SYMBOLS } from '../data/symbols';
import { ZHUYIN_AUDIO } from '../data/audioMap';
import { statOf } from './learning';

const $ = (id: string) => document.getElementById(id)!;
export const hooks: { texture: (key: string) => CanvasImageSource | undefined; applyMotion: () => void } = {
  texture: () => undefined,
  applyMotion: () => {},
};

export const ui = {
  /** 目前是否有對話／彈窗擋住地圖輸入 */
  blocking: 0,
};

let toastTimer: number | undefined;
export function toast(text: string, ms = 2200) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { t.hidden = true; }, ms);
}

export function applyBodyClasses() {
  document.getElementById('app')!.classList.toggle('reduce', G.settings.reduceMotion);
  hooks.applyMotion();
}

export function thumb(key: string, size = 80): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const src = hooks.texture(key);
  if (src) { const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 0, 0); }
  c.style.width = c.style.height = size + 'px';
  return c;
}

// ───── 對話 ─────
export interface Line { who?: string; text: string }
/** 逐句顯示並朗讀。點「繼續」或對話框前進；回傳後對話框關閉。 */
export function say(lines: (string | Line)[], opts: { speak?: boolean } = {}): Promise<void> {
  const ls: Line[] = lines.map((l) => (typeof l === 'string' ? { text: l } : l));
  if (!ls.length) return Promise.resolve();
  const el = $('dialog');
  ui.blocking++;
  return new Promise<void>((resolve) => {
    let i = 0;
    let shownAt = 0;
    const render = () => {
      const l = ls[i];
      const last = i === ls.length - 1;
      el.innerHTML = `<div class="box"><div class="who">${l.who ?? ''}</div><div class="txt"></div>
        <div class="acts"><button class="btn small" data-a="replay" aria-label="重聽">🔊 重聽</button><span class="spacer"></span>
        <button class="btn primary" data-a="next">${last ? '好！' : '繼續 ▶'}</button></div></div>`;
      el.querySelector('.txt')!.textContent = l.text;
      el.hidden = false;
      shownAt = performance.now();
      if (opts.speak !== false) audio.speak(l.text);
    };
    const onClick = (e: Event) => {
      const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
      if (a === 'replay') { audio.sfx('tap'); audio.speak(ls[i].text); return; }
      if (a !== 'next' && !(e.target as HTMLElement).closest('.txt')) return;
      if (performance.now() - shownAt < 250) return; // 防止連點跳過
      audio.sfx('tap');
      if (i < ls.length - 1) { i++; render(); } else {
        el.removeEventListener('click', onClick);
        el.hidden = true;
        el.innerHTML = '';
        audio.stopSpeech();
        ui.blocking--;
        resolve();
      }
    };
    el.addEventListener('click', onClick);
    render();
  });
}

// ───── 彈窗 ─────
export function openModal(html: string): HTMLElement {
  const m = $('modal');
  m.innerHTML = `<div class="card">${html}</div>`;
  m.hidden = false;
  ui.blocking++;
  return m;
}
export function closeModal() {
  const m = $('modal');
  if (m.hidden) return;
  m.hidden = true;
  m.innerHTML = '';
  ui.blocking--;
}
const delegate = (root: HTMLElement, fn: (a: string, el: HTMLElement, ev: Event) => void) => {
  root.onclick = (e) => {
    const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (el) fn(el.dataset.a!, el, e);
  };
};

// ───── 夥伴 ─────
export function openParty(onChange?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const render = () => {
      const html = `<h2>我的夥伴 <small style="font-size:16px">(${G.save.party.length}/${PARTY_MAX})</small></h2>
      <div class="note">點一下夥伴，就會換成出戰的夥伴。</div>
      ${G.save.party.map((m, i) => {
        const sp = SPECIES[m.species];
        const names = sp.moves.map((mv) => mv.name + (mv.needAbility && !hasAbility(mv.needAbility) ? '（未學會）' : '')).join('、');
        return `<div class="mon ${i === G.save.active ? 'active' : ''}" data-a="pick" data-i="${i}" role="button">
          <span class="th" data-key="${spriteOf(m)}"></span>
          <div class="info"><b>${sp.name}</b> ${i === G.save.active ? '⭐出戰中' : ''}　Lv.${m.level}
          <div class="bar"><i style="width:100%"></i></div>HP ${maxHp(m)}
          <div class="bar exp"><i style="width:${(m.exp / expNeeded(m)) * 100}%"></i></div>經驗 ${m.exp}/${expNeeded(m)}
          <br>招式：${names}<br><span class="note">${sp.desc}</span></div></div>`;
      }).join('') || '<p>還沒有夥伴。去找神祕的蛋吧！</p>'}
      <div class="foot"><button class="btn primary" data-a="close">關閉</button></div>`;
      const m = openModal(html);
      m.querySelectorAll<HTMLElement>('.th').forEach((s) => s.replaceWith(thumb(s.dataset.key!)));
      delegate(m, (a, el) => {
        if (a === 'pick') { G.save.active = +el.dataset.i!; saveGame(); audio.sfx('tap'); closeModal(); render(); onChange?.(); }
        if (a === 'close') { closeModal(); resolve(); }
      });
    };
    render();
  });
}

// ───── 家長設定 ─────
function parentGate(): Promise<boolean> {
  return new Promise((resolve) => {
    const a = 3 + Math.floor(Math.random() * 6), b = 3 + Math.floor(Math.random() * 6);
    const ans = a + b;
    const opts = [...new Set([ans, ans + 2, ans - 1, ans + 3])].sort(() => Math.random() - 0.5).slice(0, 3);
    if (!opts.includes(ans)) opts[0] = ans;
    const m = openModal(`<h2>家長設定</h2><p class="note">請家長回答：${a} + ${b} = ？</p>
      <div class="chips">${opts.sort(() => Math.random() - 0.5).map((o) => `<button class="chip on" data-a="n" data-n="${o}">${o}</button>`).join('')}</div>
      <div class="foot"><button class="btn" data-a="x">返回遊戲</button></div>`);
    delegate(m, (act, el) => {
      if (act === 'x') { closeModal(); resolve(false); }
      if (act === 'n') {
        if (+el.dataset.n! === ans) { closeModal(); resolve(true); } else toast('再想想看～');
      }
    });
  });
}
export async function openSettings(onReset?: () => void): Promise<void> {
  if (!(await parentGate())) return;
  const s = G.settings;
  const render = () => {
    const sum = audio.zhuyinSummary();
    const seg = (key: string, vals: (string | number)[], cur: unknown, labels: string[]) =>
      `<span class="seg">${vals.map((v, i) => `<button class="${cur === v ? 'on' : ''}" data-a="seg" data-k="${key}" data-v="${v}">${labels[i]}</button>`).join('')}</span>`;
    const sw = (k: string, on: boolean) => `<button class="switch ${on ? 'on' : ''}" data-a="sw" data-k="${k}">${on ? '開' : '關'}</button>`;
    const rows = ALL_SYMBOLS.map((ch) => {
      const st = statOf(G.save.stats, ch);
      return `<tr><td>${ch}</td><td>${st.first}</td><td>${st.assisted}</td><td>${st.wrong}</td><td>${st.hints}</td></tr>`;
    }).join('');
    const html = `<h2>家長設定</h2>
    <h3>語音與聲音</h3>
    <div class="row">劇情語音 ${sw('voiceOn', s.voiceOn)}</div>
    <div class="row">語速 <input type="range" min="0.6" max="1.2" step="0.05" value="${s.rate}" data-a="rate"> <span>${s.rate.toFixed(2)}</span></div>
    <div class="note">${audio.statusText()}</div>
    <div class="row"><button class="btn small" data-a="testvoice">🔊 試聽語音</button></div>
    <div class="row">背景音樂 ${sw('bgmOn', s.bgmOn)}</div>
    <div class="row">遊戲音效 ${sw('sfxOn', s.sfxOn)}</div>
    <div class="row">減少動態效果（減少晃動與閃光） ${sw('reduceMotion', s.reduceMotion)}</div>
    <h3>注音單音檔</h3>
    <div class="note">已就緒 ${sum.ready} / ${sum.total}。${sum.ready < sum.total ? '尚未安裝完整音檔，「聽音選符號」會暫時改成「看符號配對」。把可授權使用的音檔放進 public/audio/zhuyin/（檔名見 README）即可啟用。' : '音檔齊全，可使用聽音選符號。'}</div>
    <div class="row">實驗：用語音合成念單一符號（發音未經驗證，不建議） ${sw('experimentalSymbolTts', s.experimentalSymbolTts)}</div>
    <h3>開放的注音（至少 2 個）</h3>
    <div class="chips">${ALL_SYMBOLS.map((ch) => `<button class="chip ${s.allowed.includes(ch) ? 'on' : ''}" data-a="sym" data-ch="${ch}">${ch}</button>`).join('')}</div>
    <div class="note">題目與選項只會使用開放的注音。</div>
    <h3>提示層級</h3>
    <div class="row">${seg('tier', ['auto', 1, 2, 3], s.tier, ['依關卡', '1 看符號', '2 聽音', '3 混合'])}</div>
    <div class="note">1＝看符號找一樣的（搭配聲音）；2＝聽聲音選符號（可要提示）；3＝混合複習。「依關卡」會隨冒險進度逐漸提高。</div>
    <div class="row">選項數量 ${seg('optionCount', ['auto', 2, 3], s.optionCount, ['自動', '2 個', '3 個'])}</div>
    <h3>學習紀錄</h3>
    <table class="stats"><tr><th>符號</th><th>獨立答對</th><th>協助後完成</th><th>答錯</th><th>提示</th></tr>${rows}</table>
    <div class="note">「獨立答對」＝第一次就答對且沒用提示。使用提示或答錯後才完成，只算「協助後完成」。</div>
    <h3>存檔</h3>
    <div class="row"><button class="btn small" data-a="reset">清除冒險存檔，重新開始</button></div>
    <div class="foot"><button class="btn primary" data-a="close">完成</button></div>`;
    const m = openModal(html);
    delegate(m, (a, el) => {
      if (a === 'close') { closeModal(); saveSettings(); audio.applySettings(); applyBodyClasses(); return; }
      audio.sfx('tap');
      if (a === 'sw') { const k = el.dataset.k as 'voiceOn'; (s as any)[k] = !(s as any)[k]; if (k === 'voiceOn' && !s.voiceOn) audio.stopSpeech(); }
      if (a === 'seg') { const v = el.dataset.v!; (s as any)[el.dataset.k!] = v === 'auto' ? 'auto' : +v; }
      if (a === 'sym') {
        const ch = el.dataset.ch!;
        if (s.allowed.includes(ch)) { if (s.allowed.length <= 2) { toast('至少要開放 2 個注音'); return; } s.allowed = s.allowed.filter((x) => x !== ch); }
        else s.allowed = ALL_SYMBOLS.filter((x) => x === ch || s.allowed.includes(x));
      }
      if (a === 'testvoice') { audio.speak('你好，我是注音夥伴。'); return; }
      if (a === 'reset') {
        if (confirm('確定要清除冒險存檔嗎？學習設定會保留。')) { closeModal(); startNewGame(); onReset?.(); }
        return;
      }
      const top = $('modal').querySelector('.card')!.scrollTop;
      saveSettings(); audio.applySettings(); applyBodyClasses();
      closeModal(); render();
      $('modal').querySelector('.card')!.scrollTop = top;
    });
    m.querySelector<HTMLInputElement>('input[data-a=rate]')!.oninput = (e) => {
      s.rate = +(e.target as HTMLInputElement).value;
      (e.target as HTMLElement).nextElementSibling!.textContent = s.rate.toFixed(2);
    };
  };
  render();
}

// ───── 成果 ─────
export function openResults(): Promise<'continue' | 'replay'> {
  return new Promise((resolve) => {
    const firsts = Object.values(G.save.stats).reduce((a, s) => a + s.first, 0);
    const m = openModal(`<div class="big-results"><h2>🎉 冒險成果 🎉</h2>
      <div class="em">夥伴：${G.save.party.map((p) => SPECIES[p.species].name + ' Lv.' + p.level).join('、')}<br>
      新能力：${G.save.abilities.map((a) => (a === 'blast' ? '爆破拳' : a === 'gust' ? '噴風' : a)).join('、') || '無'}<br>
      ⭐ 星星：${G.save.stars}　獨立答對：${firsts} 次<br>
      已完成：ㄅ 岩石山谷、ㄆ 風車草原</div>
      <p class="note">村莊裡還有被風封住的新道路，等著你再回來探險！<br>其餘 ㄇㄈㄉㄊㄋ 的關卡還在迷霧中（尚未開放）。</p>
      <div class="foot" style="justify-content:center"><button class="btn green" data-a="go">繼續探索</button>
      <button class="btn small" data-a="replay">重玩草原</button></div></div>`);
    delegate(m, (a) => { closeModal(); resolve(a === 'replay' ? 'replay' : 'continue'); });
  });
}

// ───── 標題畫面 ─────
export function showTitle(): Promise<'new' | 'continue'> {
  return new Promise((resolve) => {
    const sc = $('screen');
    const render = () => {
      const sum = audio.zhuyinSummary();
      sc.className = 'on';
      sc.innerHTML = `<div class="sub">迷霧島冒險</div><div class="logo">注音夥伴</div>
        <div class="deco-row" style="display:flex;gap:12px;justify-content:center"><span data-k="mon_bobo"></span><span data-k="mon_pipi"></span><span data-k="egg"></span></div>
        <div class="menu">
          ${hasSave() ? '<button class="btn primary" data-a="continue">繼續冒險</button>' : ''}
          <button class="btn ${hasSave() ? '' : 'primary'}" data-a="new">新的冒險</button>
          <button class="btn small" data-a="settings">⚙ 家長設定</button>
        </div>
        <div class="stat">${audio.statusText()}<br>${sum.ready < sum.total ? '注音音檔：尚未安裝（目前使用「看符號配對」）' : '注音音檔：已就緒'}</div>`;
      sc.querySelectorAll<HTMLElement>('[data-k]').forEach((s) => s.replaceWith(thumb(s.dataset.k!, 112)));
    };
    render();
    audio.onStatusChange(() => { if (sc.classList.contains('on') && $('modal').hidden) render(); });
    sc.onclick = async (e) => {
      const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
      if (!a) return;
      // 使用者手勢：解鎖音訊與語音（iOS Safari 必須）
      await audio.unlock();
      if (a === 'settings') { await openSettings(() => render()); render(); return; }
      if (a === 'new' && hasSave() && !confirm('要開始新的冒險嗎？舊的存檔會被覆蓋。')) return;
      sc.className = '';
      sc.innerHTML = '';
      resolve(a as 'new' | 'continue');
    };
  });
}

export function showHud(show: boolean) { $('hud').hidden = !show; }
export function setupHud(handlers: { party: () => void; settings: () => void; title: () => void }) {
  const h = $('hud');
  h.innerHTML = `<div class="tl" id="hudname"></div>
    <div class="tr"><button class="btn round" data-a="replay" aria-label="重聽語音">🔊</button>
    <button class="btn round" data-a="party" aria-label="夥伴">🐾</button>
    <button class="btn round" data-a="settings" aria-label="家長設定">⚙</button>
    <button class="btn round" data-a="title" aria-label="回到標題">🏠</button></div>`;
  h.onclick = (e) => {
    const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
    if (!a || ui.blocking) return;
    audio.sfx('tap');
    if (a === 'replay') audio.replay();
    if (a === 'party') handlers.party();
    if (a === 'settings') handlers.settings();
    if (a === 'title') handlers.title();
  };
}
export function setHudInfo(text: string) { $('hudname').textContent = text; }
export { flag };
void SYMBOLS; void ZHUYIN_AUDIO;
