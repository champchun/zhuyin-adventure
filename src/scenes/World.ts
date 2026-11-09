import Phaser from 'phaser';
import { VIEW_H, VIEW_W, view } from '../core/view';
import { BLOCKED_TILES, MAPS, TILE_KEY } from '../data/maps';
import type { MapDef, MapObj } from '../data/maps';
import { BATTLES, LEVELS, STORY } from '../data/levels';
import type { BattleDef } from '../data/levels';
import { ENEMIES, SPECIES } from '../data/monsters';
import {
  G, activeSymbols, addExp, flag, giveMonster, hasAbility, saveGame, setFlag, spriteOf,
} from '../core/save';
import { audio } from '../core/audio';
import { openParty, openResults, openSettings, say, setHudInfo, toast, ui } from '../core/ui';
import { bui } from '../core/battleui';
import { QuestionRun, shuffle } from '../core/learning';
import type { BattleOutcome } from './Battle';
import { PROMPT_LINES } from '../data/voiceLines';

const T = 16;
const STEP_MS = 140;
type Dir = 'down' | 'up' | 'left' | 'right';
const DIRS: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

interface Obj { def: MapObj; spr: Phaser.GameObjects.Image; extra: Phaser.GameObjects.GameObject[] }

export class WorldScene extends Phaser.Scene {
  private map!: MapDef;
  private tilesRT?: Phaser.GameObjects.RenderTexture;
  private objs = new Map<string, Obj>();
  private player!: Phaser.GameObjects.Image;
  private pShadow!: Phaser.GameObjects.Image;
  private followers: { spr: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image }[] = [];
  private trail: { x: number; y: number }[] = [];
  private tx = 0;
  private ty = 0;
  private dir: Dir = 'down';
  private queue: { x: number; y: number }[] = [];
  private pending?: Obj;
  private moving = false;
  private busy = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private marker?: Phaser.GameObjects.Image;
  private labels: Phaser.GameObjects.Text[] = [];
  private stepCount = 0;
  private ready = false;

  constructor() { super('World'); }

  create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.removeCapture('SPACE');
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p));
    this.scale.on('resize', () => this.applyView());
    this.events.on('wake', () => { this.applyView(); audio.playBgm(this.map.theme); });
    this.events.on('shutdown', () => { this.ready = false; });
  }

  /** 由 main 呼叫：載入存檔位置並開始（新遊戲會播放開場）。 */
  async begin(isNew: boolean) {
    this.queue = []; this.pending = undefined; this.moving = false; this.busy = false;
    this.loadMap(G.save.mapId, G.save.x, G.save.y);
    this.ready = true;
    if (isNew) {
      this.busy = true;
      await say(STORY.intro.map((t) => ({ who: '旁白', text: t })));
      this.busy = false;
    }
  }

  private applyView() {
    const c = this.cameras.main;
    c.setZoom(view.zoom);
    if (this.map) {
      c.setBounds(0, 0, this.map.w * T, this.map.h * T);
      if (this.player) c.centerOn(this.player.x, this.player.y);
    } else c.centerOn(VIEW_W / 2, VIEW_H / 2);
  }

  // ───────── 地圖 ─────────
  private loadMap(id: string, x: number, y: number) {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.objs.clear();
    this.followers = [];
    this.labels = [];
    this.trail = [];
    this.map = MAPS[id];
    this.tx = x; this.ty = y;
    G.save.mapId = id; G.save.x = x; G.save.y = y;
    const m = this.map;
    this.tilesRT = this.add.renderTexture(0, 0, m.w * T, m.h * T).setOrigin(0).setDepth(-100);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) this.tilesRT.draw(TILE_KEY[m.tiles[j][i]] ?? 't_grass', i * T, j * T);
    this.marker = this.add.image(0, 0, 'spark').setVisible(false).setDepth(5000);
    this.pShadow = this.add.image(0, 0, 'shadow').setDepth(1);
    this.player = this.add.image(x * T + 8, y * T + 16, 'player_down').setOrigin(0.5, 1);
    this.syncPlayerTexture();
    this.player.setPosition(x * T + 8, y * T + 16);
    this.buildFollowers();
    this.refreshObjects();
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.roundPixels = true;
    this.applyView();
    this.cameras.main.centerOn(this.player.x, this.player.y);
    setHudInfo(m.name);
    audio.playBgm(m.theme);
  }

  private buildFollowers() {
    this.followers.forEach((f) => { f.spr.destroy(); f.sh.destroy(); });
    this.followers = [];
    const party = G.save.party;
    const order = party.length ? [party[G.save.active] ?? party[0], ...party.filter((_, i) => i !== G.save.active)] : [];
    order.forEach((m) => {
      const sh = this.add.image(0, 0, 'shadow').setDepth(1).setScale(0.8);
      const spr = this.add.image(this.tx * T + 8, this.ty * T + 16, spriteOf(m)).setOrigin(0.5, 1);
      this.followers.push({ spr, sh });
    });
    this.placeFollowers(false);
  }
  private placeFollowers(animate: boolean) {
    this.followers.forEach((f, i) => {
      const t = this.trail[i] ?? { x: this.tx, y: this.ty };
      const px = t.x * T + 8, py = t.y * T + 16;
      if (animate) this.tweens.add({ targets: f.spr, x: px, y: py, duration: STEP_MS, ease: 'Linear' });
      else f.spr.setPosition(px, py);
    });
  }

  private visible(o: MapObj): boolean {
    const m = this.map.id;
    if (o.showIf && !flag(o.showIf)) return false;
    if (o.hideIf && flag(o.hideIf)) return false;
    if (o.kind === 'monster' && flag(`m:${m}:${o.id}`)) return false;
    if (o.kind === 'rock' && flag(`r:${m}:${o.id}`)) return false;
    if (o.kind === 'leaves' && flag(`l:${m}:${o.id}`)) return false;
    if (o.kind === 'fog' && flag(`f:${m}:${o.id}`)) return false;
    return true;
  }
  private gateOpen(lv: string): boolean {
    const L = LEVELS[lv];
    if (!L.open) return false;
    if (lv === 'b') return flag('practiceDone');
    if (lv === 'p') return flag('boss_b');
    return true;
  }

  private refreshObjects() {
    this.objs.forEach((o) => { o.spr.destroy(); o.extra.forEach((e) => e.destroy()); });
    this.objs.clear();
    this.labels = [];
    const m = this.map;
    for (const def of m.objects) {
      if (!this.visible(def)) continue;
      const px = def.x * T, py = def.y * T;
      const extra: Phaser.GameObjects.GameObject[] = [];
      let spr: Phaser.GameObjects.Image;
      const depth = py + T;
      const shadow = (s = 1) => { extra.push(this.add.image(px + 8, py + 14, 'shadow').setDepth(1).setScale(s)); };
      const bob = (target: Phaser.GameObjects.Image, amp = 1.5, dur = 600) => {
        if (G.settings.reduceMotion) return;
        this.tweens.add({ targets: target, y: target.y - amp, duration: dur + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      };
      switch (def.kind) {
        case 'npc': shadow(); spr = this.add.image(px + 8, py + 16, def.sprite ?? 'npc_guide').setOrigin(0.5, 1).setDepth(depth); bob(spr); break;
        case 'chest': spr = this.add.image(px, py, flag(`c:${m.id}:${def.id}`) ? 'chest_open' : 'chest').setOrigin(0).setDepth(depth); break;
        case 'rock': spr = this.add.image(px, py, 'rock').setOrigin(0).setDepth(depth); break;
        case 'leaves': spr = this.add.image(px, py, 'leaves').setOrigin(0).setDepth(depth); break;
        case 'bell': spr = this.add.image(px, py, 'bell').setOrigin(0).setDepth(depth); break;
        case 'fog': spr = this.add.image(px, py, 'fog_patch').setOrigin(0).setDepth(depth); bob(spr, 1, 900); break;
        case 'woodgate': spr = this.add.image(px, py, 'woodgate').setOrigin(0).setDepth(depth); break;
        case 'sign': spr = this.add.image(px, py, 'sign').setOrigin(0).setDepth(depth); break;
        case 'exit': spr = this.add.image(px, py, 'exit_tile').setOrigin(0).setDepth(depth); break;
        case 'egg':
          shadow(); spr = this.add.image(px + 8, py + 16, 'egg').setOrigin(0.5, 1).setDepth(depth);
          if (!G.settings.reduceMotion) this.tweens.add({ targets: spr, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1, hold: 900, repeatDelay: 900 });
          break;
        case 'windmill': {
          spr = this.add.image(px, py + T, 'windmill').setOrigin(0, 1).setDepth(depth);
          const bl = this.add.image(px + 8, py - 9, 'wm_blades').setDepth(depth + 1);
          extra.push(bl);
          if (flag('windmillOn') && !G.settings.reduceMotion) this.tweens.add({ targets: bl, angle: 360, duration: 2400, repeat: -1 });
          break;
        }
        case 'gate': {
          const open = this.gateOpen(def.level!);
          spr = this.add.image(px, py, open ? 'gate_on' : 'gate_off').setOrigin(0).setDepth(depth);
          const t = this.add.text(px + 8, py + 10, LEVELS[def.level!].symbol, {
            fontFamily: '"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif', fontStyle: 'bold', fontSize: LEVELS[def.level!].symbol.length > 1 ? '6px' : '9px',
            color: open ? '#2b2140' : '#e6e6f0', resolution: view.zoom,
          }).setOrigin(0.5).setDepth(depth + 1);
          extra.push(t); this.labels.push(t);
          break;
        }
        case 'monster': {
          const en = ENEMIES[BATTLES[def.battle!].enemy];
          const big = en.scale >= 5;
          shadow(big ? 1.8 : 1);
          spr = this.add.image(px + 8, py + 16, en.sprite).setOrigin(0.5, 1).setScale(big ? 2 : 1).setDepth(depth);
          bob(spr, 2, 500);
          break;
        }
        default: continue;
      }
      this.objs.set(def.id, { def, spr, extra });
    }
  }

  // ───────── 通行判定與尋路 ─────────
  private objAt(x: number, y: number): Obj | undefined {
    for (const o of this.objs.values()) if (o.def.x === x && o.def.y === y) return o;
    return undefined;
  }
  private walkable(x: number, y: number): boolean {
    const m = this.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
    if (BLOCKED_TILES.has(m.tiles[y][x])) return false;
    return !this.objAt(x, y);
  }
  private findPath(goal: (x: number, y: number) => boolean): { x: number; y: number }[] | null {
    const start = { x: this.tx, y: this.ty };
    const key = (x: number, y: number) => y * 100 + x;
    const prev = new Map<number, number>();
    const q = [start];
    prev.set(key(start.x, start.y), -1);
    while (q.length) {
      const c = q.shift()!;
      if (goal(c.x, c.y)) {
        const path: { x: number; y: number }[] = [];
        let k = key(c.x, c.y);
        while (prev.get(k) !== -1) { path.unshift({ x: k % 100, y: Math.floor(k / 100) }); k = prev.get(k)!; }
        return path;
      }
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!this.walkable(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), key(c.x, c.y));
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // ───────── 輸入 ─────────
  private onTap(p: Phaser.Input.Pointer) {
    if (!this.ready || this.busy || ui.blocking || !this.scene.isActive()) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const x = Math.floor(w.x / T), y = Math.floor(w.y / T);
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return;
    const o = this.objAt(x, y);
    let path: { x: number; y: number }[] | null;
    this.pending = undefined;
    if (o) {
      path = this.findPath((cx, cy) => Math.abs(cx - x) + Math.abs(cy - y) === 1);
      if (!path) { toast('走不過去喔～'); return; }
      this.pending = o;
      this.showMarker(x, y);
    } else {
      if (!this.walkable(x, y)) { audio.sfx('tap'); return; }
      path = this.findPath((cx, cy) => cx === x && cy === y);
      if (!path) { toast('走不過去喔～'); return; }
      this.showMarker(x, y);
    }
    this.queue = path;
    this.run();
  }
  private showMarker(x: number, y: number) {
    if (!this.marker) return;
    this.marker.setPosition(x * T + 8, y * T + 8).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.marker);
    this.tweens.add({ targets: this.marker, alpha: 0, duration: 600, onComplete: () => this.marker?.setVisible(false) });
  }

  update() {
    if (!this.ready) return;
    this.player.setDepth(this.player.y);
    this.pShadow.setPosition(this.player.x, this.tyPx() - 2);
    this.followers.forEach((f) => { f.spr.setDepth(f.spr.y - 0.5); f.sh.setPosition(f.spr.x, f.spr.y - 2); });
    if (this.moving || this.busy || ui.blocking || !this.scene.isActive()) return;
    let d: Dir | undefined;
    if (this.cursors.left.isDown || this.wasd.A.isDown) d = 'left';
    else if (this.cursors.right.isDown || this.wasd.D.isDown) d = 'right';
    else if (this.cursors.up.isDown || this.wasd.W.isDown) d = 'up';
    else if (this.cursors.down.isDown || this.wasd.S.isDown) d = 'down';
    if (!d) return;
    const [dx, dy] = DIRS[d];
    const nx = this.tx + dx, ny = this.ty + dy;
    this.pending = undefined;
    this.dir = d;
    this.syncPlayerTexture();
    if (this.walkable(nx, ny)) { this.queue = [{ x: nx, y: ny }]; this.run(); }
    else { const o = this.objAt(nx, ny); if (o) { this.pending = o; this.run(); } }
  }
  private tyPx() { return this.player.y; }

  private syncPlayerTexture() {
    if (this.dir === 'down') this.player.setTexture('player_down').setFlipX(false);
    else if (this.dir === 'up') this.player.setTexture('player_up').setFlipX(false);
    else this.player.setTexture('player_side').setFlipX(this.dir === 'left');
  }

  private async run() {
    if (this.moving) return;
    this.moving = true;
    while (this.queue.length && !this.busy) {
      const n = this.queue.shift()!;
      if (!this.walkable(n.x, n.y)) { this.queue = []; break; }
      const dx = n.x - this.tx, dy = n.y - this.ty;
      this.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      this.syncPlayerTexture();
      this.trail.unshift({ x: this.tx, y: this.ty });
      this.trail.length = Math.min(this.trail.length, 6);
      this.tx = n.x; this.ty = n.y;
      this.placeFollowers(true);
      if (!G.settings.reduceMotion) this.tweens.add({ targets: this.player, scaleY: { from: 1, to: 0.9 }, duration: STEP_MS / 2, yoyo: true });
      await new Promise<void>((res) => this.tweens.add({ targets: this.player, x: n.x * T + 8, y: n.y * T + 16, duration: STEP_MS, ease: 'Linear', onComplete: () => res() }));
      G.save.x = this.tx; G.save.y = this.ty;
      if (++this.stepCount % 25 === 0) saveGame();
    }
    this.moving = false;
    const o = this.pending;
    this.pending = undefined;
    if (o && !this.busy && Math.abs(o.def.x - this.tx) + Math.abs(o.def.y - this.ty) === 1) {
      const dx = o.def.x - this.tx, dy = o.def.y - this.ty;
      this.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      this.syncPlayerTexture();
      this.busy = true;
      try { await this.interact(o); } catch (e) { console.error(e); }
      this.busy = false;
      saveGame();
    }
  }

  // ───────── 互動 ─────────
  private async interact(o: Obj) {
    const d = o.def;
    const m = this.map.id;
    switch (d.kind) {
      case 'npc': return this.talkGuide();
      case 'sign': return say((d.text ?? []).map((t) => ({ who: '告示牌', text: t })));
      case 'chest': return this.openChest(o);
      case 'egg': return this.hatchEgg();
      case 'monster': return this.startBattle(o);
      case 'exit': await this.travel(d.to!.map, d.to!.x, d.to!.y); return;
      case 'gate': return this.useGate(d);
      case 'rock':
        if (!hasAbility('blast')) return say(STORY.rockLocked);
        await this.breakRock(o);
        setFlag(`r:${m}:${d.id}`); this.refreshObjects();
        return say(STORY.rockBreak);
      case 'leaves':
        if (!hasAbility('gust')) return say(STORY.leavesLocked);
        audio.sfx('wind');
        await this.windPuff(o.spr.x + 8, o.spr.y + 8, 0xe8883a);
        setFlag(`l:${m}:${d.id}`); this.refreshObjects();
        return say(STORY.leavesBlow);
      case 'windmill':
        if (flag('windmillOn')) return say([PROMPT_LINES.windmillOn]);
        if (!hasAbility('gust')) return say(STORY.windLocked);
        audio.sfx('wind');
        await this.windPuff(o.spr.x + 8, o.spr.y - 12, 0xffffff);
        setFlag('windmillOn'); this.refreshObjects();
        audio.sfx('chest');
        return say(STORY.windOn);
      case 'bell':
        if (flag('bellRung')) return say(STORY.bellDone);
        if (!hasAbility('hum')) return say(STORY.bellLocked);
        audio.sfx('chest');
        await this.ripple(o.spr.x + 8, o.spr.y + 8);
        setFlag('bellRung'); this.refreshObjects();
        return say(STORY.bellRing);
      case 'fog':
        if (!hasAbility('fog')) return say(STORY.fogLocked);
        audio.sfx('wind');
        await this.windPuff(o.spr.x + 8, o.spr.y + 8, 0xffffff);
        setFlag(`f:${m}:${d.id}`); this.refreshObjects();
        return say(STORY.fogBlow);
      case 'woodgate': return say(STORY.woodLocked);
    }
  }

  private async talkGuide() {
    const who = '嘟嘟博士';
    const say2 = (ls: string[]) => say(ls.map((text) => ({ who, text })));
    if (!flag('guideMet')) { await say2(STORY.guide1); setFlag('guideMet'); }
    else if (!flag(`c:village:chest_t`)) await say2(STORY.guideNeedChest);
    else if (!flag('tutorialDone')) { await say2(STORY.guide2); setFlag('tutorialDone'); this.refreshObjects(); }
    else if (flag('boss_p')) await say2(STORY.guideEnd);
    else await say2(STORY.guideAfter);
    saveGame();
  }

  private async openChest(o: Obj) {
    const key = `c:${this.map.id}:${o.def.id}`;
    if (flag(key)) { toast('這個寶箱已經打開囉～'); return; }
    setFlag(key);
    o.spr.setTexture('chest_open');
    audio.sfx('chest');
    const n = o.def.id === 'chest_hidden' || o.def.id.includes('wind') || o.def.id.includes('leaf') ? 2 : 1;
    G.save.stars += n;
    const star = this.add.image(o.spr.x + 8, o.spr.y, 'star').setDepth(9999);
    this.tweens.add({ targets: star, y: star.y - 20, duration: 700, onComplete: () => star.destroy() });
    await say([`打開寶箱！得到 ${n} 顆 ⭐ 星星碎片！（共 ${G.save.stars} 顆）`], { speak: true });
  }

  private async useGate(d: MapObj) {
    const L = LEVELS[d.level!];
    if (!L.open) {
      await say([{ who: `${L.symbol} 關：${L.name}`, text: PROMPT_LINES.gateClosed }, ...STORY.lockedGate.map((t) => ({ text: t }))]);
      return;
    }
    if (!this.gateOpen(L.id)) { await say(L.id === 'b' ? STORY.needPractice : STORY.needBoss); return; }
    const to = MAPS[L.mapId!];
    await this.travel(to.id, to.start.x, to.start.y);
  }

  private async travel(map: string, x: number, y: number) {
    const cam = this.cameras.main;
    cam.fadeOut(200, 0, 0, 0);
    await new Promise((r) => this.time.delayedCall(220, r));
    this.queue = [];
    this.loadMap(map, x, y);
    saveGame();
    cam.fadeIn(200, 0, 0, 0);
  }

  // ───── 特效 ─────
  private async breakRock(o: Obj) {
    audio.sfx('rock');
    const cx = o.spr.x + 8, cy = o.spr.y + 8;
    for (let i = 0; i < 10; i++) {
      const s = this.add.image(cx, cy, 'rubble').setDepth(9999);
      const a = (Math.PI * 2 * i) / 10;
      this.tweens.add({ targets: s, x: cx + Math.cos(a) * 18, y: cy + Math.sin(a) * 14 + 6, alpha: 0, duration: 500, onComplete: () => s.destroy() });
    }
    if (!G.settings.reduceMotion) this.cameras.main.shake(160, 0.003);
    await new Promise((r) => this.time.delayedCall(550, r));
  }
  private async ripple(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(x, y, 4, 0xffffff, 0).setStrokeStyle(2, 0xffd84a).setDepth(9999);
      this.tweens.add({ targets: c, radius: 22, alpha: 0, duration: 600, delay: i * 160, onComplete: () => c.destroy() });
    }
    await new Promise((r) => this.time.delayedCall(900, r));
  }
  private async windPuff(x: number, y: number, tint: number) {
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(x - 14, y + (i - 4) * 3, 'windline').setDepth(9999).setTint(tint === 0xffffff ? 0xffffff : 0xffeedd);
      this.tweens.add({ targets: s, x: x + 24, alpha: 0, duration: 500, delay: i * 40, onComplete: () => s.destroy() });
    }
    await new Promise((r) => this.time.delayedCall(700, r));
  }

  // ───── 神祕蛋 ─────
  private async hatchEgg() {
    const o = this.objs.get('egg')!;
    await say(STORY.eggFound.map((text) => ({ who: '旁白', text })));
    // 播放注音發音；沒有可靠音檔時，明確改成看符號並提示
    const played = audio.playSymbol('ㄅ');
    if (!played) await say(STORY.eggNoAudio.map((text) => ({ who: '旁白', text })));
    await say(STORY.eggPrompt.map((text) => ({ who: '旁白', text })));
    // 第 0 關：全程有視覺提示（符號卡一直顯示），兩個選項
    bui.show(false);
    const others = activeSymbols().filter((s) => s !== 'ㄅ');
    const q = { type: 'match' as const, target: 'ㄅ', options: shuffle(['ㄅ', others[Math.floor(Math.random() * others.length)] ?? 'ㄆ']), fallback: false };
    const run = new QuestionRun(q, G.save.stats);
    await bui.ask(run, { speakPrompt: false });
    bui.hide();
    audio.sfx('hatch');
    if (!G.settings.reduceMotion) this.tweens.add({ targets: o.spr, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 5 });
    await new Promise((r) => this.time.delayedCall(700, r));
    o.spr.setTexture('mon_bobo');
    this.burstSpark(o.spr.x, o.spr.y - 8);
    const mon = giveMonster('bobo');
    setFlag('eggHatched');
    this.refreshObjects();
    this.buildFollowers();
    void mon;
    await say(STORY.eggHatch.map((text) => ({ who: '旁白', text })));
    saveGame();
  }
  private burstSpark(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(x, y, 'spark').setDepth(9999);
      const a = (Math.PI * 2 * i) / 8;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, alpha: 0, duration: 500, onComplete: () => s.destroy() });
    }
  }

  // ───── 戰鬥 ─────
  private runBattle(id: string): Promise<BattleOutcome> {
    return new Promise((resolve) => {
      this.scene.sleep();
      this.scene.launch('Battle', {
        battleId: id, mapTheme: this.map.theme,
        done: (r: BattleOutcome) => { this.scene.stop('Battle'); this.scene.wake('World'); resolve(r); },
      });
    });
  }

  private async startBattle(o: Obj) {
    if (!G.save.party.length) { await say([PROMPT_LINES.noPartner]); return; }
    const def = BATTLES[o.def.battle!];
    const res = await this.runBattle(def.id);
    if (res === 'lose') {
      await say(STORY.defeat);
      const r = this.map.respawn;
      this.queue = []; this.pending = undefined;
      this.tx = r.x; this.ty = r.y; this.trail = [];
      this.player.setPosition(r.x * T + 8, r.y * T + 16);
      this.placeFollowers(false);
      G.save.x = r.x; G.save.y = r.y;
      this.cameras.main.centerOn(this.player.x, this.player.y);
      saveGame();
      return;
    }
    if (res === 'run') return;
    await this.applyReward(def, o);
  }

  private async applyReward(def: BattleDef, o: Obj) {
    const rw = def.reward;
    const claimed = flag(`claimed:${def.id}`);
    setFlag(rw.flag);
    if (!flag(`m:${this.map.id}:${o.def.id}`)) setFlag(`m:${this.map.id}:${o.def.id}`);
    setFlag(`claimed:${def.id}`);
    const me = G.save.party[G.save.active] ?? G.save.party[0];
    const lines: string[] = [];
    const ups = addExp(me, rw.exp);
    if (ups) { audio.sfx('levelup'); lines.push(`${SPECIES[me.species].name}升級了！現在是 Lv.${me.level}！`); }
    if (!claimed) {
      if (rw.grow) { const g = G.save.party.find((p) => p.species === rw.grow); if (g) { g.stage = 1; g.level += 1; } }
      for (const a of rw.abilities ?? []) if (!hasAbility(a)) G.save.abilities.push(a);
      if (rw.join && !G.save.party.some((p) => p.species === rw.join)) {
        if (!giveMonster(rw.join)) lines.push('隊伍滿了，新夥伴先在村子裡等你。');
      }
    }
    if (def.id === 'boss_b' && !G.save.cleared.includes('b')) G.save.cleared.push('b');
    if (def.id === 'boss_p' && !G.save.cleared.includes('p')) G.save.cleared.push('p');
    this.refreshObjects();
    this.buildFollowers();
    saveGame();
    const all = claimed ? lines : [...rw.story, ...lines];
    if (all.length) await say(all.map((text) => ({ text })));
    else toast(`贏了！獲得經驗 ${rw.exp}！`);
    if (rw.results) {
      const r = await openResults();
      if (r === 'replay') this.resetLevel('p');
    }
    saveGame();
  }

  /** 重玩：只重置該關的怪獸、寶箱與頭目，不收回夥伴與能力。 */
  private resetLevel(level: string) {
    for (const k of Object.keys(G.save.flags)) {
      if (k.startsWith(`m:${level}:`) || k.startsWith(`c:${level}:`) || k.startsWith(`l:${level}:`) || k === `boss_${level}`) delete G.save.flags[k];
    }
    G.save.flags[`claimed:boss_${level}`] = true; // 保持「已領過獎勵」
    this.refreshObjects();
    saveGame();
    toast('草原重新整理好了，再玩一次吧！');
  }

  // ───── 給 main 使用 ─────
  openParty() { openParty(() => this.buildFollowers()); }
  openSettings() { openSettings(() => { /* reset handled by main */ }); }
  pauseInput(b: boolean) { this.busy = b; }
}
