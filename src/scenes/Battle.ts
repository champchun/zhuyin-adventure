import Phaser from 'phaser';
import { VIEW_H, VIEW_W, view } from '../core/view';
import { G, maxHp, powerBonus, spriteOf } from '../core/save';
import type { MonsterInst } from '../core/save';
import { ENEMIES, SPECIES } from '../data/monsters';
import type { MoveDef } from '../data/monsters';
import { BATTLES } from '../data/levels';
import type { BattleDef } from '../data/levels';
import { audio } from '../core/audio';
import { bui, sleep } from '../core/battleui';
import type { Mode } from '../core/battleui';
import { QuestionRun, effectiveOptionCount, makeQuestion } from '../core/learning';
import { PROMPT_LINES } from '../data/voiceLines';

export type BattleOutcome = 'win' | 'lose' | 'run';
export interface BattleInit { battleId: string; mapTheme: string; done: (r: BattleOutcome) => void }

const PLAYER_POS = { x: 80, y: 118 };
const ENEMY_POS = { x: 236, y: 84 };

export class BattleScene extends Phaser.Scene {
  private pl!: Phaser.GameObjects.Image;
  private en!: Phaser.GameObjects.Image;
  private plShadow!: Phaser.GameObjects.Image;
  private enShadow!: Phaser.GameObjects.Image;
  private init0!: BattleInit;
  private idle: Phaser.Tweens.Tween[] = [];
  private bg?: Phaser.GameObjects.Graphics;

  constructor() { super('Battle'); }
  init(d: BattleInit) { this.init0 = d; }

  create() {
    this.applyView();
    const onResize = () => this.applyView();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.drawBackground(this.init0.mapTheme);
    const def = BATTLES[this.init0.battleId];
    const enemy = ENEMIES[def.enemy];
    this.enShadow = this.add.image(ENEMY_POS.x, ENEMY_POS.y + 26, 'shadow').setScale(enemy.scale / 2 + 1);
    this.plShadow = this.add.image(PLAYER_POS.x, PLAYER_POS.y + 28, 'shadow').setScale(3.5);
    this.en = this.add.image(ENEMY_POS.x, ENEMY_POS.y, enemy.sprite).setScale(enemy.scale);
    this.pl = this.add.image(PLAYER_POS.x, PLAYER_POS.y, 'mon_bobo').setScale(4).setFlipX(true);
    this.startIdle();
    audio.playBgm('battle');
    this.fight(def).then((r) => {
      bui.hide();
      this.init0.done(r);
    });
  }

  private applyView() {
    const c = this.cameras.main;
    c.setZoom(view.zoom);
    c.centerOn(VIEW_W / 2, VIEW_H / 2);
  }

  private drawBackground(theme: string) {
    const g = (this.bg = this.add.graphics());
    const sky = theme === 'valley' ? ['#b9a6e8', '#cdbcf2', '#e0d4f7'] : theme === 'meadow' ? ['#7fd0ff', '#a6e0ff', '#c8f0ff'] : ['#7fd0ff', '#a6e0ff', '#c8f0ff'];
    const ground = theme === 'valley' ? ['#c9a070', '#b78e5c'] : ['#7ed957', '#5fbf45'];
    const hex = (s: string) => Phaser.Display.Color.HexStringToColor(s).color;
    sky.forEach((s, i) => { g.fillStyle(hex(s)); g.fillRect(0, i * 40, VIEW_W, 40); });
    g.fillStyle(hex(theme === 'valley' ? '#8a8aa3' : '#5fbf45'));
    g.fillTriangle(0, 120, 70, 60, 150, 120); g.fillTriangle(110, 120, 190, 50, 280, 120); g.fillTriangle(220, 120, 290, 70, 330, 120);
    g.fillStyle(hex(ground[0])); g.fillRect(0, 120, VIEW_W, 130);
    g.fillStyle(hex(ground[1]));
    for (let i = 0; i < 18; i++) g.fillRect((i * 53) % VIEW_W, 128 + ((i * 29) % 100), 6, 2);
    g.fillStyle(0x000000, 0.12); g.fillEllipse(ENEMY_POS.x, ENEMY_POS.y + 26, 90, 14);
    g.fillEllipse(PLAYER_POS.x, PLAYER_POS.y + 28, 80, 14);
  }

  private startIdle() {
    this.idle.forEach((t) => t.stop());
    this.idle = [];
    if (G.settings.reduceMotion) return;
    [this.pl, this.en].forEach((s, i) => {
      const y = s.y;
      this.idle.push(this.tweens.add({ targets: s, y: y - 2, duration: 520 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' }));
    });
  }

  private tw(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((res) => this.tweens.add({ ...cfg, onComplete: () => res() }));
  }
  private num(x: number, y: number, text: string, color = '#ffffff') {
    const t = this.add.text(x, y, text, { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: '16px', color, stroke: '#2b2140', strokeThickness: 4, resolution: view.zoom }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }
  private hurt(spr: Phaser.GameObjects.Image) {
    spr.setTintFill(0xffffff);
    this.time.delayedCall(90, () => spr.clearTint());
    if (G.settings.reduceMotion) return Promise.resolve();
    const x = spr.x;
    return this.tw({ targets: spr, x: { from: x - 3, to: x + 3 }, duration: 45, yoyo: true, repeat: 3 }).then(() => { spr.x = x; });
  }

  // ───── 特效（像素粒子）─────
  private burst(x: number, y: number, key: string, n: number, spread: number, dur = 450) {
    if (G.settings.reduceMotion) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, key).setDepth(40);
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * spread, y: y + Math.sin(a) * spread, alpha: 0, angle: 180, duration: dur, onComplete: () => s.destroy() });
    }
  }
  private async playFx(move: MoveDef, from: { x: number; y: number }, to: { x: number; y: number }) {
    switch (move.fx) {
      case 'punch':
        audio.sfx('hit');
        this.burst(to.x, to.y, 'spark', 7, 26);
        break;
      case 'peck':
        audio.sfx('peck');
        this.burst(to.x, to.y, 'spark', 5, 18, 350);
        break;
      case 'blast': {
        audio.sfx('blast');
        const ring = this.add.circle(to.x, to.y, 6, 0xffd84a, 0.0).setStrokeStyle(4, 0xff8a2a).setDepth(40);
        this.tweens.add({ targets: ring, radius: 44, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
        this.burst(to.x, to.y, 'rubble', 10, 46, 500);
        this.burst(to.x, to.y, 'spark', 6, 34, 450);
        if (!G.settings.reduceMotion) this.cameras.main.shake(180, 0.004);
        break;
      }
      case 'hum': {
        audio.sfx('hint');
        for (let i = 0; i < 3; i++) {
          const ring = this.add.circle(from.x + 20, from.y, 6, 0xffffff, 0).setStrokeStyle(3, 0xff9db8).setDepth(40);
          this.tweens.add({ targets: ring, x: to.x, radius: 26, alpha: 0, duration: 420, delay: i * 130, onComplete: () => ring.destroy() });
        }
        await sleep(620);
        this.burst(to.x, to.y, 'spark', 6, 28, 400);
        break;
      }
      case 'fog':
      case 'wind': {
        audio.sfx('wind');
        for (let i = 0; i < 6; i++) {
          const l = this.add.image(from.x, from.y - 14 + i * 6, 'windline').setDepth(40).setAlpha(0.9);
          this.tweens.add({ targets: l, x: to.x, duration: 380, delay: i * 50, onComplete: () => { l.destroy(); } });
        }
        await sleep(520);
        this.burst(to.x, to.y, 'puff', 6, 24, 400);
        break;
      }
    }
  }

  private async playerAttack(move: MoveDef) {
    const from = { x: this.pl.x, y: this.pl.y };
    if (move.fx === 'punch' || move.fx === 'peck' || move.fx === 'blast') {
      await this.tw({ targets: this.pl, x: from.x + 70, duration: G.settings.reduceMotion ? 100 : 160, ease: 'Quad.in' });
      this.playFx(move, from, { x: this.en.x, y: this.en.y });
      await this.hurt(this.en);
      await this.tw({ targets: this.pl, x: from.x, duration: 160 });
    } else {
      await this.tw({ targets: this.pl, y: from.y - 6, duration: 120, yoyo: true });
      await this.playFx(move, from, { x: this.en.x, y: this.en.y });
      await this.hurt(this.en);
    }
  }
  private async enemyAttack() {
    const x = this.en.x;
    await this.tw({ targets: this.en, x: x - 60, duration: G.settings.reduceMotion ? 100 : 170, ease: 'Quad.in' });
    audio.sfx('hit');
    this.burst(this.pl.x, this.pl.y, 'spark', 4, 20, 300);
    await this.hurt(this.pl);
    await this.tw({ targets: this.en, x, duration: 170 });
  }

  // ───── 戰鬥流程 ─────
  private async fight(def: BattleDef): Promise<BattleOutcome> {
    const enemy = ENEMIES[def.enemy];
    const hpOf = new Map<string, number>();
    const party = G.save.party;
    party.forEach((m) => hpOf.set(m.uid, maxHp(m)));
    let me: MonsterInst = party[G.save.active] ?? party[0];
    const setMe = (m: MonsterInst) => {
      me = m;
      this.pl.setTexture(spriteOf(m));
      bui.setHp('me', SPECIES[m.species].name, hpOf.get(m.uid)!, maxHp(m), m.level);
    };
    bui.show();
    setMe(me);
    const dbg = (window as any).__debugHp as number | undefined;
    if (dbg) hpOf.set(me.uid, dbg);
    bui.setHp('me', SPECIES[me.species].name, hpOf.get(me.uid)!, maxHp(me), me.level);
    bui.setHp('enemy', enemy.name, enemy.hp, enemy.hp);
    for (const line of def.intro) await bui.note(line);

    const targets = [...new Set([...def.focus, ...def.review])].filter((s) => G.settings.allowed.includes(s));
    let prevTarget: string | undefined;
    let mode: Mode = 'look';
    let asked = 0;
    for (let phase = 1; phase <= def.phases; phase++) {
      let ehp = enemy.hp;
      bui.setHp('enemy', enemy.name, ehp, enemy.hp);
      if (def.phases > 1) {
        if (phase > 1) {
          hpOf.set(me.uid, Math.min(maxHp(me), hpOf.get(me.uid)! + 6)); // 頭目回合之間給孩子喘口氣
          setMe(me);
        }
        await bui.note(`第 ${phase} 個小回合！（共 ${def.phases} 個）`);
      }
      while (ehp > 0) {
        const tierSetting = G.settings.tier;
        const choosable = tierSetting === 'auto' && !def.guided && (audio.audioReadyFor(targets) || (G.settings.experimentalSymbolTts && targets.length > 0));
        const act = await bui.menu(me, party.length > 1, { avail: choosable, cur: mode });
        if (act.type === 'run') { bui.msg(PROMPT_LINES.runAway, true); await sleep(900); return 'run'; }
        if (act.type === 'switch') {
          const i = await bui.chooseMon(party, party.indexOf(me));
          if (party[i] !== me) { G.save.active = i; setMe(party[i]); this.startIdle(); }
          continue;
        }
        // 選招式 → 播放題目 → 選符號
        if (act.type === 'move') mode = act.mode;
        const tier = def.guided ? 1 : tierSetting !== 'auto' ? tierSetting : choosable ? (mode === 'listen' ? 2 : 1) : 1;
        const q = makeQuestion({
          focus: def.focus, review: def.review, allowed: G.settings.allowed, tier,
          audioReady: audio.audioReadyFor(targets) || (G.settings.experimentalSymbolTts && targets.length > 0),
          optionCount: effectiveOptionCount(G.settings.optionCount, G.save.stats),
          prevTarget, stats: G.save.stats,
        });
        const run = new QuestionRun(q, G.save.stats, !!def.guided);
        const r = await bui.ask(run, { speakPrompt: asked++ === 0 });
        if (r === 'back') continue;
        prevTarget = q.target;
        // 出招（動畫期間介面已鎖定）
        bui.lock(true);
        const clean = run.wrong === 0 && run.hints === 0 && !run.guidedAssist;
        const listenBonus = q.type === 'listen' ? 1 : 0; // 聽的招式比較難，威力加成
        const sec = run.ms / 1000;
        const speed = G.settings.speedBonus && clean ? (sec <= 4 ? 2 : sec <= 8 ? 1 : 0) : 0;
        const dmg = act.move.power + powerBonus(me) + listenBonus + speed;
        bui.msg(`${SPECIES[me.species].name}使出了${act.move.name}！${speed >= 2 ? '⚡好快！威力大增！' : speed === 1 ? '⚡不錯！威力增加！' : ''}`);
        await this.playerAttack(act.move);
        ehp = Math.max(0, ehp - dmg);
        this.num(this.en.x, this.en.y - 30, `-${dmg}`, '#ffd84a');
        bui.setHp('enemy', enemy.name, ehp, enemy.hp);
        await sleep(450);
        if (ehp > 0) {
          bui.msg(`${enemy.name}反擊了！`);
          await this.enemyAttack();
          const php = Math.max(0, hpOf.get(me.uid)! - enemy.atk);
          hpOf.set(me.uid, php);
          this.num(this.pl.x, this.pl.y - 30, `-${enemy.atk}`, '#ff9db8');
          bui.setHp('me', SPECIES[me.species].name, php, maxHp(me), me.level);
          await sleep(450);
          if (php <= 0) {
            bui.msg(`${SPECIES[me.species].name}累倒了…`, true);
            await this.tw({ targets: this.pl, alpha: 0.3, y: this.pl.y + 8, duration: 500 });
            await sleep(900);
            return 'lose';
          }
        }
        bui.lock(false);
      }
      // 這個小回合結束
      if (!G.settings.reduceMotion) this.tweens.add({ targets: this.en, alpha: 0.2, duration: 300, yoyo: true, repeat: 1 });
      await sleep(200);
    }
    // 勝利
    audio.sfx('win');
    this.idle.forEach((t) => t.stop());
    await this.tw({ targets: this.en, alpha: 0, y: this.en.y + 10, duration: 600 });
    bui.msg(PROMPT_LINES.win, true);
    await this.tw({ targets: this.pl, y: this.pl.y - 8, duration: 160, yoyo: true, repeat: 1 });
    await sleep(700);
    return 'win';
  }
}
