// 戰鬥的 DOM 介面：招式選單、注音題目、大型觸控按鈕。
import { audio } from './audio';
import { G, hasAbility, powerBonus } from './save';
import type { MonsterInst } from './save';
import { SPECIES } from '../data/monsters';
import type { MoveDef } from '../data/monsters';
import { QuestionRun } from './learning';
import { symbolDef } from '../data/symbols';
import { PROMPT_LINES } from '../data/voiceLines';

const $ = (id: string) => document.getElementById(id)!;
export type Mode = 'look' | 'listen';
export type Action = { type: 'move'; move: MoveDef; mode: Mode } | { type: 'switch' } | { type: 'run' };

let root: HTMLElement;
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, G.settings.reduceMotion ? ms * 0.6 : ms));

export const bui = {
  show(bars = true) {
    root = $('battleui');
    root.hidden = false;
    root.innerHTML = `<div class="hpbar enemy"><span class="n"></span><div class="hp"><i></i></div></div>
      <div class="hpbar me"><span class="n"></span><div class="hp"><i></i></div></div>
      <div id="bpanel"><div class="box" data-lock="0"><div class="msg"></div><div class="body"></div></div></div>`;
    if (!bars) root.querySelectorAll('.hpbar').forEach((e) => e.remove());
  },
  hide() { $('battleui').hidden = true; $('battleui').innerHTML = ''; },
  setHp(side: 'enemy' | 'me', name: string, hp: number, max: number, level?: number) {
    const bar = root.querySelector('.hpbar.' + side)!;
    bar.querySelector('.n')!.textContent = `${name}${level ? ' Lv.' + level : ''}　HP ${Math.max(0, hp)}/${max}`;
    const i = bar.querySelector<HTMLElement>('.hp i')!;
    i.style.width = Math.max(0, (hp / max) * 100) + '%';
    i.classList.toggle('low', hp / max < 0.4);
  },
  lock(on: boolean) { root.querySelector<HTMLElement>('.box')!.dataset.lock = on ? '1' : '0'; },
  msg(text: string, speak = false) {
    root.querySelector('.msg')!.textContent = text;
    root.querySelector('.body')!.innerHTML = '';
    if (speak) audio.speak(text);
  },
  /** 顯示一句話，讓孩子點「繼續」（用於開場與劇情） */
  note(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.msg(text, true);
      const body = root.querySelector('.body')!;
      body.innerHTML = `<div style="display:flex;justify-content:space-between;margin-top:8px"><button class="btn small" data-a="re">🔊 重聽</button><button class="btn primary" data-a="ok">繼續 ▶</button></div>`;
      const t0 = performance.now();
      (body as HTMLElement).onclick = (e) => {
        const a = (e.target as HTMLElement).closest('[data-a]')?.getAttribute('data-a');
        if (a === 're') { audio.speak(text); return; }
        if (a === 'ok' && performance.now() - t0 > 250) { audio.sfx('tap'); (body as HTMLElement).onclick = null; resolve(); }
      };
    });
  },
  /** modes.avail＝可選「聽」招式；cur 是目前選的招式種類（看／聽），結果會隨 Action 回傳 */
  menu(me: MonsterInst, canSwitch: boolean, modes: { avail: boolean; cur: Mode }): Promise<Action> {
    return new Promise((resolve) => {
      let mode: Mode = modes.avail ? modes.cur : 'look';
      this.msg(`${SPECIES[me.species].name}要怎麼做？`);
      const moves = SPECIES[me.species].moves.filter((m) => !m.needAbility || hasAbility(m.needAbility));
      const body = root.querySelector<HTMLElement>('.body')!;
      const render = () => { body.innerHTML = `${modes.avail ? `<div class="modes"><button class="btn small ${mode === 'look' ? 'primary' : ''}" data-a="mode" data-m="look">👀 看的招式</button><button class="btn small ${mode === 'listen' ? 'primary' : ''}" data-a="mode" data-m="listen">👂 聽的招式（更強）</button></div>` : ''}<div class="moves">${moves.map((m, i) => `<button class="btn primary" data-a="move" data-i="${i}">${m.name}<small>${m.desc}</small></button>`).join('')}
        ${canSwitch ? '<button class="btn" data-a="switch">🔄 換夥伴</button>' : ''}
        <button class="btn" data-a="run">🏃 離開</button></div>`; };
      render();
      body.onclick = (e) => {
        const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
        if (!el) return;
        audio.sfx('tap');
        const a = el.dataset.a;
        if (a === 'mode') { mode = el.dataset.m as Mode; render(); return; }
        body.onclick = null;
        if (a === 'move') resolve({ type: 'move', move: moves[+el.dataset.i!], mode });
        else resolve({ type: a as 'switch' | 'run' });
      };
    });
  },
  /** 作答。答對回傳 'correct'；按「返回」回傳 'back'。答錯不扣血、不結束。 */
  ask(run: QuestionRun, ctx: { speakPrompt: boolean }): Promise<'correct' | 'back'> {
    return new Promise((resolve) => {
      const q = run.q;
      const body = root.querySelector<HTMLElement>('.body')!;
      const prompt = q.type === 'listen' ? PROMPT_LINES.listen : PROMPT_LINES.match;
      const hasSnd = audio.hasSymbolAudio(q.target) || G.settings.experimentalSymbolTts;
      this.msg(prompt);
      const t0 = performance.now();
      body.innerHTML = `<div class="qhead"><span></span><span style="display:flex;gap:8px">
          <button class="btn small" data-a="re">🔊 重聽</button><button class="btn small" data-a="hint">💡 提示</button><button class="btn small" data-a="back">↩ 返回</button></span></div>
        <div class="qcard"><div class="big" data-a="re">${q.type === 'match' ? q.target : '🔊'}</div></div>
        <div class="opts">${q.options.map((o) => `<button class="opt" data-a="opt" data-ch="${o}" aria-label="${o}">${o}</button>`).join('')}</div>
        <div class="hintline"></div>`;
      const hint = body.querySelector<HTMLElement>('.hintline')!;
      if (q.fallback) hint.textContent = '（注音音檔還沒安裝，這題先用看符號配對）';
      const refresh = () => {
        body.querySelectorAll<HTMLElement>('.opt').forEach((b) => {
          b.classList.toggle('gone', run.hidden.has(b.dataset.ch!));
          b.classList.toggle('glow', run.revealed && b.dataset.ch === q.target);
        });
      };
      const sound = () => {
        if (hasSnd && audio.playSymbol(q.target)) return;
        audio.speak(prompt);
      };
      refresh();
      if (hasSnd) setTimeout(() => audio.playSymbol(q.target), 200);
      else if (ctx.speakPrompt) setTimeout(() => audio.speak(prompt), 200);
      body.onclick = (e) => {
        const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
        if (!el || run.done) return;
        const a = el.dataset.a;
        if (a === 're') { audio.sfx('tap'); sound(); return; }
        if (a === 'back') { audio.sfx('tap'); body.onclick = null; resolve('back'); return; }
        if (a === 'hint') {
          audio.sfx('hint');
          const h = run.hint();
          if (h.kind === 'text') { hint.textContent = `提示：${symbolDef(q.target).tip}`; audio.speak(`提示，${symbolDef(q.target).tip}`); }
          else if (h.kind === 'eliminate') hint.textContent = '把一個不對的拿掉了！';
          else hint.textContent = '亮亮的那個就是答案！';
          refresh();
          return;
        }
        if (a === 'opt') {
          const r = run.pick(el.dataset.ch!);
          if (r === 'correct') {
            run.ms = performance.now() - t0;
            this.lock(true);
            el.classList.add('good');
            audio.sfx('correct');
            body.onclick = null;
            setTimeout(() => resolve('correct'), G.settings.reduceMotion ? 350 : 550);
          } else if (r === 'wrong') {
            audio.sfx('wrong');
            el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
            hint.textContent = run.revealed ? '看，亮亮的是答案，點它吧！' : '沒關係，再聽一次，再試試看～';
            refresh();
          }
        }
      };
    });
  },
  /** 選擇要換上場的夥伴 */
  chooseMon(party: MonsterInst[], current: number): Promise<number> {
    return new Promise((resolve) => {
      this.msg('換哪位夥伴上場？');
      const body = root.querySelector<HTMLElement>('.body')!;
      body.innerHTML = `<div class="moves">${party.map((m, i) => `<button class="btn ${i === current ? 'primary' : ''}" data-i="${i}">${SPECIES[m.species].name} Lv.${m.level}</button>`).join('')}</div>`;
      body.onclick = (e) => {
        const el = (e.target as HTMLElement).closest('[data-i]') as HTMLElement | null;
        if (!el) return;
        audio.sfx('tap'); body.onclick = null; resolve(+el.dataset.i!);
      };
    });
  },
};
export { powerBonus };
