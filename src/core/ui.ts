// DOM 介面：標題、對話、HUD、夥伴、家長設定、成果。
import { audio } from './audio';
import { G, PARTY_MAX, addItem, buyItem, ensureVitals, expNeeded, flag, hasAbility, hasSave, peekSave, itemCount, maxHp, maxMp, saveGame, saveSettings, spriteOf, startNewGame } from './save';
import { ITEMS, SPECIES } from '../data/monsters';
import { ALL_SYMBOLS, HUDU, ZHUYIN_TEST } from '../data/symbols';
import { statOf } from './learning';
import { STROKES } from '../data/strokes';
import { sampleStroke, strokeDone } from './strokes';
import type { Pt } from './strokes';
import { PROMPT_LINES } from '../data/voiceLines';
import { REWARDS, rewardById } from '../data/rewards';
import type { AccessoryId } from '../data/rewards';
import { availableStars, canRedeem, equip, isOwned, redeem, setTitle, titleName } from './stars';

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
  const src = hooks.texture(key);
  c.width = c.height = (src as HTMLCanvasElement | undefined)?.width ?? 16; // 夥伴是 32×32，其餘 16×16
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
      // 對話沒有選項，只有「繼續／好」：點畫面任何地方（除了重聽）都可以下一頁
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

/** 道具店：用金幣買藥水。大按鈕、顯示價格與持有數量；錢不夠、還沒上架都有溫和的提示。 */
export function openShop(): Promise<void> {
  return new Promise((resolve) => {
    let note = '';
    const render = () => {
      const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].price !== undefined);
      const html = `<h2>道具店</h2>
        <div class="note" style="font-size:20px;font-weight:800">你有 🪙 ${G.save.coins ?? 0} 枚金幣</div>
        <div class="foot" style="flex-direction:column;gap:10px;align-items:stretch">${ids.map((id) => {
          const it = ITEMS[id];
          const locked = !!it.need && !flag(it.need);
          const poor = !locked && (G.save.coins ?? 0) < it.price!;
          return `<button class="btn ${locked || poor ? '' : 'primary'}" data-a="buy" data-id="${id}" ${locked ? 'disabled style="opacity:.45"' : ''}>
            ${it.icon} ${it.name}　🪙 ${it.price}　（有 ${itemCount(id)} 個）
            <small>${locked ? '還沒進貨，等你變強再來看看！' : poor ? `${it.desc}（金幣還不夠）` : it.desc}</small></button>`;
        }).join('')}</div>
        <div class="note" style="min-height:1.6em">${note}</div>
        <div class="foot"><button class="btn" data-a="close">離開商店</button></div>`;
      const m = openModal(html);
      delegate(m, (a, el) => {
        if (a === 'close') { closeModal(); resolve(); return; }
        if (a !== 'buy') return;
        const id = el.dataset.id!;
        const r = buyItem(id);
        const it = ITEMS[id];
        if (r === 'ok') { audio.sfx('chest'); saveGame(); note = `買了 ${it.icon} ${it.name}！`; audio.speak(`買了${it.name}`); }
        else if (r === 'poor') { audio.sfx('wrong'); note = '金幣不夠喔，多打幾隻怪獸再來吧！'; audio.speak(note); }
        closeModal();
        render();
      });
    };
    render();
  });
}

/**
 * 星星婆婆的換獎勵視窗：花可用星星換稱號、飾品、小禮物；已擁有的飾品可以換戴或脫下，已擁有的稱號可以換顯示。
 * 按鈕的 data-a：redeem（data-id＝獎勵 id）、equip（data-acc）、unequip、title（data-id）、close。
 * onChange：換了飾品時通知世界重畫跟隨的夥伴。
 */
export function openStarShop(onChange?: () => void): Promise<void> {
  return new Promise((resolve) => {
    let note = '';
    const s = G.save;
    const render = () => {
      const accs = REWARDS.filter((r) => r.type === 'accessory' && (s.accessories ?? []).includes(r.accessory!));
      const titles = REWARDS.filter((r) => r.type === 'title' && (s.titles ?? []).includes(r.id));
      const html = `<h2>⭐ 星星婆婆</h2>
        <div class="note" style="font-size:20px;font-weight:800">可用星星 ${availableStars(s)} 顆（累計 ${s.stars} 顆）</div>
        <div class="foot" style="flex-direction:column;gap:8px;align-items:stretch">${REWARDS.map((r) => {
          const have = isOwned(s, r);
          const poor = !have && !canRedeem(s, r).ok;
          return `<button class="btn ${have || poor ? '' : 'primary'}" data-a="redeem" data-id="${r.id}" ${have || poor ? 'style="opacity:.45"' : ''}>
            ${r.icon} ${r.name}　⭐ ${r.cost}${have ? '　✔ 已擁有' : ''}</button>`;
        }).join('')}</div>
        ${accs.length || titles.length ? `<div class="foot" style="flex-direction:column;gap:8px;align-items:stretch">
          ${accs.map((r) => `<button class="btn" data-a="equip" data-acc="${r.accessory}">${r.icon} ${s.equipped === r.accessory ? '戴著' : '戴上'}${r.name}</button>`).join('')}
          ${s.equipped ? '<button class="btn" data-a="unequip">脫下飾品</button>' : ''}
          ${titles.map((r) => `<button class="btn" data-a="title" data-id="${r.id}">${r.icon} 稱號：${r.name}${s.title === r.id ? '（目前）' : ''}</button>`).join('')}</div>` : ''}
        <div class="note" style="min-height:1.6em">${note}</div>
        <div class="foot"><button class="btn" data-a="close">下次再來</button></div>`;
      const m = openModal(html);
      delegate(m, (a, el) => {
        if (a === 'close') { closeModal(); resolve(); return; }
        if (a === 'redeem') {
          const r = rewardById(el.dataset.id!)!;
          const res = redeem(s, r);
          if (res.ok) {
            if (res.gift) addItem(res.gift.item, res.gift.count);
            audio.sfx('chest'); saveGame(); onChange?.();
            note = `換到了 ${r.icon} ${r.name}！${r.type === 'accessory' ? '已經幫夥伴戴上囉。' : ''}`;
          } else if (res.reason === 'owned') { audio.sfx('tap'); note = '這個你已經有囉～'; }
          else { audio.sfx('wrong'); note = '再多撿幾顆星星就能換囉～'; }
        } else if (a === 'equip') { equip(s, el.dataset.acc as AccessoryId); saveGame(); audio.sfx('tap'); onChange?.(); note = ''; }
        else if (a === 'unequip') { equip(s, undefined); saveGame(); audio.sfx('tap'); onChange?.(); note = ''; }
        else if (a === 'title') { setTitle(s, el.dataset.id!); saveGame(); audio.sfx('tap'); note = `現在的稱號是「${titleName(s)}」！`; }
        else return;
        audio.speak(note);
        closeModal();
        render();
      });
    };
    render();
  });
}

/** 大按鈕選擇視窗：回傳被選中的選項索引 */
export function choose(title: string, body: string, options: string[]): Promise<number> {
  return new Promise((resolve) => {
    const m = openModal(`<h2>${title}</h2><p>${body}</p>
      <div class="foot" style="flex-direction:column;gap:10px">${options.map((o, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-a="c" data-i="${i}">${o}</button>`).join('')}</div>`);
    audio.speak(`${title}。${body}`);
    delegate(m, (a, el) => {
      if (a !== 'c') return;
      audio.sfx('tap');
      closeModal();
      resolve(+el.dataset.i!);
    });
  });
}

/** 第一次認識符號的小課程：選符號（看到符號，找一樣的）／聽符號（聽聲音，選符號）。沒有關閉鈕，點對才結束；答錯沒有處罰。 */
export function openLessonPick(mode: 'match' | 'listen', target: string, options: string[]): Promise<void> {
  return new Promise((resolve) => {
    const title = mode === 'match' ? '🔍 找一找' : '👂 聽一聽';
    const hint = mode === 'match' ? '找出一樣的符號！' : '聽聲音，選出聽到的符號！';
    const card = mode === 'match'
      ? `<div class="lesson-card" style="font-size:72px;font-weight:700;text-align:center;line-height:1.1;margin:6px 0">${target}</div>`
      : `<div style="text-align:center;margin:6px 0"><button class="btn" data-a="replay">🔊 再聽一次</button></div>`;
    const m = openModal(`<h2>${title}</h2><p id="lmsg" style="min-height:1.5em">${hint}</p>${card}
      <div class="foot" style="justify-content:center;gap:10px;flex-wrap:wrap">${options.map((o) => `<button class="btn" data-a="lp" data-ch="${o}" style="font-size:36px;min-width:84px">${o}</button>`).join('')}</div>`);
    m.dataset.lessonTarget = target; // 給端對端機器人讀（孩子看不到）
    const say = (t: string) => { const e = m.querySelector('#lmsg'); if (e) e.textContent = t; };
    const play = () => { if (!audio.playSymbol(target)) say('這個聲音現在聽不到，用看的也可以喔！'); };
    if (mode === 'listen') play(); else audio.speak(hint);
    delegate(m, (a, el) => {
      if (a === 'replay') { play(); return; }
      if (a !== 'lp') return;
      if (el.dataset.ch === target) { audio.sfx('levelup'); delete m.dataset.lessonTarget; closeModal(); resolve(); return; }
      audio.sfx('tap');
      say(mode === 'match' ? '再找找看～' : '再聽一次～');
      if (mode === 'listen') play();
    });
  });
}

/** 世界地圖：列出去過的主島，選一個就搭船過去。回傳地圖 id；按「先不要」回傳 null。 */
export function openWorldMap(dests: { id: string; name: string }[]): Promise<string | null> {
  return new Promise((resolve) => {
    const m = openModal(`<h2>🗺️ 要去哪裡？</h2><p>搭船不用錢，隨時可以回家喔。</p>
      <div class="foot" style="flex-direction:column;gap:10px">${dests.map((d, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-a="go" data-id="${d.id}">⛵ ${d.name}</button>`).join('')}
      <button class="btn small" data-a="no">先不要</button></div>`);
    audio.speak('要去哪裡？搭船不用錢，隨時可以回家喔。');
    delegate(m, (a, el) => {
      if (a !== 'go' && a !== 'no') return;
      audio.sfx('tap');
      closeModal();
      resolve(a === 'go' ? el.dataset.id! : null);
    });
  });
}

/**
 * 寫字：照著虛線描出注音（每一畫要依序經過關鍵點才算過）。
 * 全部寫完回傳 true；按「先不要」回傳 false。沒有這個符號的筆順資料時不擋，直接回傳 true。
 */
export function openWriteSymbol(symbol: string, opts: { required?: boolean } = {}): Promise<boolean> {
  const strokes = STROKES[symbol];
  if (!strokes?.length) return Promise.resolve(true);
  return new Promise((resolve) => {
    const SIZE = Math.max(220, Math.min(360, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.6)));
    const m = openModal(`<h2>✍️ 寫出「${symbol}」</h2><p id="wmsg" style="min-height:1.5em">照著箭頭，從圓點開始描一描。</p>
      <div style="display:flex;justify-content:center"><canvas id="writecv" width="${SIZE}" height="${SIZE}" style="width:${SIZE}px;height:${SIZE}px;touch-action:none;background:#fffaf0;border:4px solid var(--ink);border-radius:14px"></canvas></div>
      ${opts.required ? '' : '<div class="foot" style="justify-content:center"><button class="btn small" data-a="no">先不要</button></div>'}`);
    audio.speak('照著箭頭，從圓點開始描一描');
    const cv = m.querySelector<HTMLCanvasElement>('#writecv')!;
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    cv.width = Math.round(SIZE * dpr); cv.height = Math.round(SIZE * dpr);
    const ctx = cv.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const msg = (t: string) => { m.querySelector('#wmsg')!.textContent = t; };
    const px = (v: number) => (v / 100) * SIZE;
    const targets = strokes.map((s) => sampleStroke(s.points));
    let cur = 0; // 目前要寫第幾畫
    let trail: Pt[] = [];
    let drawing = false;
    let activeId: number | null = null;
    let closed = false;
    const close = (ok: boolean) => { if (closed) return; closed = true; closeModal(); resolve(ok); };

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = 'rgba(43,33,64,.10)'; ctx.font = `bold ${SIZE * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(symbol, SIZE / 2, SIZE / 2 + SIZE * 0.04);
      ctx.lineWidth = SIZE * 0.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokes.forEach((s, i) => {
        const done = i < cur;
        ctx.setLineDash(done ? [] : [SIZE * 0.02, SIZE * 0.035]);
        ctx.strokeStyle = done ? '#2fa84f' : i === cur ? '#8a7aa8' : '#cfc6dd';
        ctx.beginPath();
        s.points.forEach(([x, y], k) => (k ? ctx.lineTo(px(x), px(y)) : ctx.moveTo(px(x), px(y))));
        ctx.stroke();
      });
      ctx.setLineDash([]);
      // 每一畫：起點圓點（含順序數字）與終點箭頭
      strokes.forEach((s, i) => {
        const [sx, sy] = s.points[0];
        ctx.fillStyle = i < cur ? '#2fa84f' : '#ff8a3a';
        ctx.beginPath(); ctx.arc(px(sx), px(sy), SIZE * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${SIZE * 0.06}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), px(sx), px(sy) + 1);
        const [ex, ey] = s.points[s.points.length - 1];
        const [bx, by] = s.points[s.points.length - 2];
        const ang = Math.atan2(ey - by, ex - bx);
        const L = SIZE * 0.06;
        ctx.fillStyle = i < cur ? '#2fa84f' : '#8a7aa8';
        ctx.beginPath();
        ctx.moveTo(px(ex) + Math.cos(ang) * L, px(ey) + Math.sin(ang) * L);
        ctx.lineTo(px(ex) + Math.cos(ang + 2.5) * L, px(ey) + Math.sin(ang + 2.5) * L);
        ctx.lineTo(px(ex) + Math.cos(ang - 2.5) * L, px(ey) + Math.sin(ang - 2.5) * L);
        ctx.closePath(); ctx.fill();
      });
      // 孩子畫的線
      if (trail.length > 1) {
        ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = SIZE * 0.045;
        ctx.beginPath();
        trail.forEach((p, k) => (k ? ctx.lineTo(px(p.x), px(p.y)) : ctx.moveTo(px(p.x), px(p.y))));
        ctx.stroke();
      }
    };

    const toUnit = (e: PointerEvent): Pt => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    };
    cv.onpointerdown = (e) => {
      if (closed || cur >= strokes.length || drawing) return;
      e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = true; activeId = e.pointerId; trail = [toUnit(e)]; draw();
    };
    cv.onpointermove = (e) => { if (!drawing || e.pointerId !== activeId) return; trail.push(toUnit(e)); draw(); };
    const finish = () => {
      if (closed || cur >= strokes.length) return;
      if (!drawing) return;
      drawing = false; activeId = null;
      let len = 0;
      for (let i = 1; i < trail.length; i++) len += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
      if (trail.length < 2 || len < 5) { trail = []; draw(); return; } // 只是點一下：當作沒事
      if (strokeDone(trail, targets[cur])) {
        cur++; trail = [];
        if (cur >= strokes.length) {
          draw(); audio.sfx('correct'); msg('寫好了！');
          const noBtn = m.querySelector<HTMLButtonElement>('[data-a=no]'); if (noBtn) noBtn.disabled = true; // 已經寫完：不能再取消
          setTimeout(() => close(true), G.settings.reduceMotion ? 350 : 700);
          return;
        }
        audio.sfx('hint'); msg('好棒！換下一畫。');
      } else {
        trail = []; audio.sfx('wrong'); msg('再試一次，從圓點開始喔！');
      }
      draw();
    };
    cv.onpointerup = (e) => { if (e.pointerId === activeId) finish(); };
    cv.onpointercancel = (e) => { if (e.pointerId === activeId) finish(); };
    delegate(m, (a) => { if (a === 'no') { audio.sfx('tap'); audio.stopSpeech(); close(false); } });
    draw();
  });
}

// ───── 夥伴 ─────
export function openParty(onChange?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const render = () => {
      const html = `<h2>我的夥伴 <small style="font-size:16px">(${G.save.party.length}/${PARTY_MAX})</small></h2>
      <div class="note">${titleName(G.save) ? `🏅 稱號：${titleName(G.save)}　` : ''}點一下夥伴，就會換成出戰的夥伴。　🪙 金幣 ${G.save.coins ?? 0}　${Object.keys(ITEMS).filter((id) => itemCount(id) > 0).map((id) => `${ITEMS[id].icon}×${itemCount(id)}`).join(' ')}</div>
      ${G.save.party.map((m, i) => {
        const sp = SPECIES[m.species];
        const names = sp.moves.map((mv) => mv.name + (mv.needAbility && !hasAbility(mv.needAbility) ? '（未學會）' : '')).join('、');
        return `<div class="mon ${i === G.save.active ? 'active' : ''}" data-a="pick" data-i="${i}" role="button">
          <span class="th" data-key="${spriteOf(m)}"></span>
          <div class="info"><b>${sp.name}</b>（${sp.role}） ${i === G.save.active ? '⭐出戰中' : ''}　Lv.${m.level}
          <div class="bar"><i style="width:${(ensureVitals(m), (m.hp! / maxHp(m)) * 100)}%"></i></div>HP ${m.hp}/${maxHp(m)}
          <div class="bar mp"><i style="width:${(m.mp! / maxMp(m)) * 100}%"></i></div>魔力 ${m.mp}/${maxMp(m)}
          <div class="bar exp"><i style="width:${(m.exp / expNeeded(m)) * 100}%"></i></div>經驗 ${m.exp}/${expNeeded(m)}
          <br>招式：${names}<br><span class="note">${sp.desc}</span></div></div>`;
      }).join('') || '<p>還沒有夥伴。去研究所找嘟嘟博士吧！</p>'}
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
let testMode: 'sym' | 'word' | 'hudu' | 'file' = 'sym';
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
    <div class="note">${audio.statusText()}<br>預錄語音檔：${audio.prerecordedCount() ? `已載入 ${audio.prerecordedCount()} 句（有預錄的句子會優先播放）` : '沒有（全部使用語音合成）'}</div>
    <div class="row"><button class="btn small" data-a="testvoice">🔊 試聽語音</button></div>
    <div class="row">背景音樂 ${sw('bgmOn', s.bgmOn)}</div>
    <div class="row">遊戲音效 ${sw('sfxOn', s.sfxOn)}</div>
    <div class="row">減少動態效果（減少晃動與閃光） ${sw('reduceMotion', s.reduceMotion)}</div>
    <h3>語音清單（這台裝置可用的中文語音）</h3>
    ${(() => {
      const vs = audio.zhVoices();
      if (!vs.length) return `<div class="note">沒有找到中文語音（裝置共 ${audio.allVoiceCount()} 個語音）。若剛開啟頁面，請稍等幾秒再重開這個畫面。</div>`;
      return `<div class="note">共 ${vs.length} 個。點一個選用並試聽；「自動」會優先用 zh-TW。</div>
      <div class="row"><button class="btn small ${s.voiceURI ? '' : 'primary'}" data-a="voice" data-uri="">自動</button></div>
      ${vs.map((v) => `<div class="row"><button class="btn small ${s.voiceURI === v.voiceURI ? 'primary' : ''}" data-a="voice" data-uri="${v.voiceURI}">${v.name}</button><span class="note">${v.lang}${v.localService ? '' : '・線上'}${v.default ? '・預設' : ''}</span></div>`).join('')}`;
    })()}
    <h3>注音單音檔</h3>
    <div class="note">已就緒 ${sum.ready} / ${sum.total}（遊戲目前用到 ㄅㄆㄇㄈㄉㄊㄋㄌ 這 8 個）。${!audio.audioReadyFor(ALL_SYMBOLS) ? '尚未安裝完整音檔，「聽音選符號」會暫時改成「看符號配對」。把可授權使用的音檔放進 public/audio/zhuyin/（檔名見 README）即可啟用。' : '音檔齊全，可使用聽音選符號。'}</div>
    <div class="row">實驗：用語音合成念單一符號（發音未經驗證，不建議） ${sw('experimentalSymbolTts', s.experimentalSymbolTts)}</div>
    <h3>注音發音測試</h3>
    <div class="note">按符號聽聽看。語音引擎念單一符號常常不準，請用耳朵判斷，不要當作標準發音。</div>
    <div class="row"><span class="seg">${([['sym', '① 符號本身'], ['word', '② 例字'], ['hudu', '③ 呼讀音'], ['file', '④ 音檔']] as const).map(([m, t]) => `<button class="${testMode === m ? 'on' : ''}" data-a="ztmode" data-m="${m}">${t}</button>`).join('')}</span></div>
    <div class="note">① 叫語音念符號；② 念例字（如「爸」，會連韻母一起念）；③ 念呼讀用字（如 ㄅ→波；ㄅㄆㄇㄈ 為近似音，標準國語沒有 ㄅㄜ 這個字）；④ 播放 public/audio/zhuyin/ 的音檔（37 個注音都已定義，缺檔會提示）。</div>
    ${ZHUYIN_TEST.map((g) => `<div class="note"><b>${g.group}</b></div><div class="chips">${g.list.map(([c, w]) => `<button class="chip on" style="background:#fff;font-size:26px" data-a="zt" data-c="${c}" data-w="${w}" aria-label="${c}">${c}<small style="display:block;font-size:12px;font-weight:600">${w}</small></button>`).join('')}</div>`).join('')}
    <div class="note" id="ztlog">（按上面的符號開始）</div>
    <h3>對話朗讀比較</h3>
    <div class="note">比較同一句話的兩種念法。可以改成別的句子（含注音符號的句子最能聽出差別）。</div>
    <div class="row"><input id="cmptext" type="text" value="波波會ㄅ的招式" style="flex:1;min-width:180px;font-size:22px;padding:8px;border:3px solid var(--ink);border-radius:10px;font-family:var(--font)"></div>
    <div class="row">
      <button class="btn small" data-a="cmp-tts">🔊 全部用語音合成</button>
      <button class="btn small primary" data-a="cmp-seg">🔊 實驗：符號改播音檔</button>
    </div>
    <div class="note">全部用語音合成：整句交給裝置語音，注音符號可能念錯。實驗方式：文字用裝置語音，句中的注音符號改播注音音檔。</div>
    <h3>開放的注音（至少 2 個）</h3>
    <div class="chips">${ALL_SYMBOLS.map((ch) => `<button class="chip ${s.allowed.includes(ch) ? 'on' : ''}" data-a="sym" data-ch="${ch}">${ch}</button>`).join('')}</div>
    <div class="note">題目與選項只會使用開放的注音。</div>
    <h3>提示層級</h3>
    <div class="row">${seg('tier', ['auto', 1, 2, 3], s.tier, ['依關卡', '1 看符號', '2 聽音', '3 混合'])}</div>
    <div class="note">1＝看符號找一樣的（搭配聲音）；2＝聽聲音選符號（可要提示）；3＝混合複習。「依關卡」會隨冒險進度逐漸提高。</div>
    <div class="row">答得越快、攻擊越強（不顯示倒數，只有加成） ${sw('speedBonus', s.speedBonus)}</div>
    <div class="row">怪物會在地圖上走動（比較小的孩子可以關掉） ${sw('monstersMove', s.monstersMove)}</div>
    <div class="row">用手指寫出注音才能使用招式機關（比較小的孩子可以關掉） ${sw('writeChallenge', s.writeChallenge)}</div>
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
      if (a === 'zt') {
        const c = el.dataset.c!, w = el.dataset.w!;
        const logEl = document.getElementById('ztlog')!;
        if (testMode === 'sym') { audio.speakRaw(c); logEl.textContent = `① 叫語音念「${c}」（可能念錯，請用耳朵判斷）`; }
        else if (testMode === 'word') { audio.speak(w); logEl.textContent = `② 念例字「${w}」（開頭音是 ${c}）`; }
        else if (testMode === 'hudu') {
          const h = HUDU[c];
          if (h) { audio.speak(h.char); logEl.textContent = `③ 呼讀用字「${h.char}」${h.approx ? '（近似音，不是 ㄜ 呼讀）' : ''}`; }
          else logEl.textContent = `③ 「${c}」（韻母）沒有呼讀對照`;
        }
        else if (audio.hasSymbolAudio(c) && audio.playSymbol(c)) logEl.textContent = `④ 播放「${c}」的音檔`;
        else logEl.textContent = `④ 沒有「${c}」的音檔（請放進 public/audio/zhuyin/ 並對照 audioMap.ts）`;
        return;
      }
      if (a === 'cmp-tts' || a === 'cmp-seg') {
        const t = (document.getElementById('cmptext') as HTMLInputElement).value.trim();
        if (t) { if (a === 'cmp-tts') audio.speakRaw(t); else audio.speakSegmented(t); }
        return;
      }
      if (a === 'ztmode') { testMode = el.dataset.m as typeof testMode; }
      if (a === 'voice') { s.voiceURI = el.dataset.uri ?? ''; saveSettings(); audio.speak(PROMPT_LINES.testHello); }
      if (a === 'testvoice') { audio.speak(PROMPT_LINES.testHello); return; }
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
      新能力：${G.save.abilities.map((a) => (({ blast: '爆破拳', gust: '噴風', hum: '哼哼波', fog: '吹霧' } as Record<string, string>)[a] ?? a)).join('、') || '無'}<br>
      ⭐ 星星：${G.save.stars}　獨立答對：${firsts} 次<br>
      已完成：第0關 唇音（ㄅㄆㄇㄈ）</div>
      <p class="note">村莊裡還有鈴鐺和迷霧小屋，等著你再回來探險！<br>池塘邊的碼頭出現了，搭船就能去舌尖中音島（ㄉㄊㄋㄌ）！</p>
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
      const saved = hasSave() ? peekSave() : undefined;
      const saveTitle = saved ? titleName(saved) : undefined;
      sc.className = 'on';
      sc.innerHTML = `<div class="sub">迷霧島冒險</div><div class="logo">注音夥伴</div>
        <div class="deco-row" style="display:flex;gap:12px;justify-content:center"><span data-k="mon_momo2"></span><span data-k="mon_bobo2"></span><span data-k="mon_popo2"></span></div>
        <div class="menu">
          ${hasSave() ? '<button class="btn primary" data-a="continue">繼續冒險</button>' : ''}
          <button class="btn ${hasSave() ? '' : 'primary'}" data-a="new">新的冒險</button>
          <button class="btn small" data-a="settings">⚙ 家長設定</button>
        </div>
        <div class="stat">${saveTitle ? `🏅 稱號：${saveTitle}<br>` : ''}${audio.statusText()}<br>${audio.audioReadyFor(ALL_SYMBOLS) ? '注音音檔：已就緒（共 ' + sum.ready + ' 個）' : '注音音檔：尚未安裝完整（目前使用「看符號配對」）'}</div>`;
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
