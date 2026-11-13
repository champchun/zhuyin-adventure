import Phaser from 'phaser';
import { VIEW_H, VIEW_W, view } from '../core/view';
import { BLOCKED_TILES, MAPS, TILE_KEY, abilityOf, objectDepth } from '../data/maps';
import type { MapDef, MapObj } from '../data/maps';
import { BATTLES, LEVELS, STORY } from '../data/levels';
import type { BattleDef } from '../data/levels';
import { ENEMIES, ITEMS, SPECIES, castSymbol } from '../data/monsters';
import { STROKES } from '../data/strokes';
import {
  G, activeSymbols, addCoins, addExp, addItem, flag, giveMonster, hasAbility, healAll, itemCount, saveGame, setFlag, spriteOf,
} from '../core/save';
import { audio } from '../core/audio';
import { lessonSteps, lessonSymbols, makeLessonRound } from '../core/lesson';
import { choose, openLessonPick, openParty, openResults, openSettings, openShop, openStarShop, openWriteSymbol, say, setHudInfo, toast, ui } from '../core/ui';
import { defeatSpot, markArrival, respawnMapIds, shouldRespawn } from '../core/travel';
import { stayOutcome } from '../core/inn';
import { starDoorOpen } from '../core/stars';
import { STAR_DOOR_NEED } from '../data/rewards';
import { accOffset, accTexture } from '../gfx/accessory';
import { FROG_REWARD, FROG_ROUNDS, makeFrogRound } from '../core/frogquiz';
import { GIVER_REWARD, giverVisible, nextGiverMap } from '../core/giver';
import { makeMon, stepMonsters, stunMon } from '../core/monsters';
import type { MonState } from '../core/monsters';
import { bui } from '../core/battleui';
import { QuestionRun, effectiveOptionCount, makeQuestion, shuffle } from '../core/learning';
import type { BattleOutcome } from './Battle';
import { PROMPT_LINES } from '../data/voiceLines';

const T = 16;
const STEP_MS = 140;
type Dir = 'down' | 'up' | 'left' | 'right';
const DIRS: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

interface Obj { def: MapObj; spr: Phaser.GameObjects.Image; extra: Phaser.GameObjects.GameObject[]; /** 目前所在格（會動的怪物會改變；其他物件等於 def.x / def.y） */ x: number; y: number }

export class WorldScene extends Phaser.Scene {
  private map!: MapDef;
  private tilesRT?: Phaser.GameObjects.RenderTexture;
  private objs = new Map<string, Obj>();
  /** 這張地圖上會動的怪物的狀態（refreshObjects 會重建圖片，所以位置要存在這裡；換地圖時清空） */
  private mons = new Map<string, MonState>();
  private player!: Phaser.GameObjects.Image;
  private pShadow!: Phaser.GameObjects.Image;
  private followers: { spr: Phaser.GameObjects.Image; sh: Phaser.GameObjects.Image; acc?: Phaser.GameObjects.Image; off?: { x: number; y: number } }[] = [];
  /** 這張地圖上的星星婆婆（有的話每一幀更新光暈、小星星與杖尖動畫） */
  private granny?: Obj;
  /** 這張地圖上的金幣爺爺（有的話每一幀換兩格動畫） */
  private giver?: Obj;
  private trail: { x: number; y: number }[] = [];
  private tx = 0;
  private ty = 0;
  private dir: Dir = 'down';
  private queue: { x: number; y: number }[] = [];
  private pending?: Obj;
  private moving = false;
  private busy = false;
  /** 這次進入蛙鳴灣，青蛙聽音石的獎勵已經領過了（只存在記憶體，離開地圖就重置） */
  private frogPaid = false;
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
    const saved = MAPS[G.save.mapId];
    const blocked = !saved || BLOCKED_TILES.has(saved.tiles[G.save.y]?.[G.save.x] ?? 'S');
    const spot = blocked && saved ? saved.start : { x: G.save.x, y: G.save.y };
    this.loadMap(G.save.mapId, spot.x, spot.y);
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
      // 房間、研究所比畫面小時，讓地圖置中（bounds 比視窗小時 Phaser 會貼左上）
      const mw = this.map.w * T, mh = this.map.h * T;
      c.setBounds(Math.min(0, (mw - VIEW_W) / 2), Math.min(0, (mh - VIEW_H) / 2), Math.max(mw, VIEW_W), Math.max(mh, VIEW_H));
      if (this.player) c.centerOn(this.player.x, this.player.y);
    } else c.centerOn(VIEW_W / 2, VIEW_H / 2);
  }

  // ───────── 地圖 ─────────
  private loadMap(id: string, x: number, y: number) {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.objs.clear();
    this.mons.clear();
    this.followers = [];
    this.labels = [];
    this.trail = [];
    this.map = MAPS[id];
    this.frogPaid = false;
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
    if (m.id === 'd' && !flag('dEntered')) setFlag('dEntered'); // 進到舌尖中音島：開始教 ㄉㄊ
    if (m.id === 'g' && !flag('gEntered')) setFlag('gEntered'); // 進到回音森林：開始教 ㄍㄎ
    if (m.id === 'x' && !flag('xEntered')) setFlag('xEntered'); // 進到企鵝冰原：開始教 ㄒㄑ
    if (m.id === 'z' && !flag('zEntered')) setFlag('zEntered'); // 進到火山沙漠：開始教 ㄓㄔ
    markArrival(G.save, m); // 進到主島：記下「去過」，並當成最近的主島（被打倒時送回這裡）
  }

  private buildFollowers() {
    this.followers.forEach((f) => { f.spr.destroy(); f.sh.destroy(); f.acc?.destroy(); });
    this.followers = [];
    const party = G.save.party;
    const order = party.length ? [party[G.save.active] ?? party[0], ...party.filter((_, i) => i !== G.save.active)] : [];
    order.forEach((m, i) => {
      const sh = this.add.image(0, 0, 'shadow').setDepth(1).setScale(0.8);
      const spr = this.add.image(this.tx * T + 8, this.ty * T + 16, spriteOf(m)).setOrigin(0.5, 1).setScale(0.5); // 32×32 縮成一格大小
      const eq = G.save.equipped;
      // 飾品只戴在跟在最前面（出戰）的夥伴頭上；位置跟著夥伴圖，每一幀在 update 裡更新
      const acc = i === 0 && eq ? this.add.image(0, 0, accTexture(eq)).setOrigin(0.5, 1).setScale(0.5) : undefined;
      this.followers.push({ spr, sh, acc, off: acc ? accOffset(m.species, m.stage) : undefined });
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
    if (o.kind === 'giver') return giverVisible(G.save, m);
    if (o.kind === 'monster' && flag(`m:${m}:${o.id}`)) return false;
    if (o.kind === 'rock' && flag(`r:${m}:${o.id}`)) return false;
    if (o.kind === 'leaves' && flag(`l:${m}:${o.id}`)) return false;
    if (o.kind === 'fog' && flag(`f:${m}:${o.id}`)) return false;
    if (o.kind === 'gimmick' && o.vanish && flag(`g:${m}:${o.id}`)) return false;
    if (o.kind === 'lockdoor' && flag(`k:${m}:${o.id}`)) return false; // 用鑰匙打開過的門就不見了
    return true;
  }
  private gateOpen(lv: string): boolean {
    const L = LEVELS[lv];
    if (!L.open) return false;
    if (lv === 'b') return flag('practiceDone');
    if (lv === 'p') return flag('boss_b');
    if (lv === 'd') return flag('boss_p');
    return true;
  }

  /** 取得（或建立）會動的怪物的狀態 */
  private monOf(def: MapObj): MonState {
    let m = this.mons.get(def.id);
    if (!m) { m = makeMon(def); this.mons.set(def.id, m); }
    return m;
  }

  private refreshObjects() {
    this.objs.forEach((o) => { o.spr.destroy(); o.extra.forEach((e) => e.destroy()); });
    this.objs.clear();
    this.granny = undefined;
    this.giver = undefined;
    this.labels = [];
    const m = this.map;
    for (const def of m.objects) {
      if (!this.visible(def)) continue;
      const mon = def.kind === 'monster' && def.ai ? this.monOf(def) : undefined;
      const ox = mon ? mon.x : def.x, oy = mon ? mon.y : def.y; // 會動的怪物：用目前所在格
      const px = ox * T, py = oy * T;
      const extra: Phaser.GameObjects.GameObject[] = [];
      let spr: Phaser.GameObjects.Image;
      const depth = objectDepth(def, py + T, flag(`g:${m.id}:${def.id}`));
      const shadow = (s = 1) => { extra.push(this.add.image(px + 8, py + 14, 'shadow').setDepth(1).setScale(s)); };
      const bob = (target: Phaser.GameObjects.Image, amp = 1.5, dur = 600) => {
        if (G.settings.reduceMotion) return;
        this.tweens.add({ targets: target, y: target.y - amp, duration: dur + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      };
      switch (def.kind) {
        case 'npc':
        case 'innkeeper': shadow(); spr = this.add.image(px + 8, py + 16, def.sprite ?? 'npc_guide').setOrigin(0.5, 1).setDepth(depth); bob(spr); break;
        case 'chest': spr = this.add.image(px, py, flag(`c:${m.id}:${def.id}`) ? 'chest_open' : 'chest').setOrigin(0).setDepth(depth); break;
        case 'rock': spr = this.add.image(px, py, 'rock').setOrigin(0).setDepth(depth); break;
        case 'leaves': spr = this.add.image(px, py, 'leaves').setOrigin(0).setDepth(depth); break;
        case 'bell': spr = this.add.image(px, py, 'bell').setOrigin(0).setDepth(depth); break;
        case 'fog': spr = this.add.image(px, py, 'fog_patch').setOrigin(0).setDepth(depth); bob(spr, 1, 900); break;
        case 'frogstone': spr = this.add.image(px, py, 'frog_statue').setOrigin(0).setDepth(depth); break;
        case 'granny': {
          // 星星婆婆：身後有柔和的光暈、身邊三顆繞圈的小星星（位置與閃爍在 animGranny 每幀更新）
          shadow();
          const glow = this.add.image(px + 8, py + 6, 'glow').setDepth(depth - 0.5).setAlpha(0.5);
          spr = this.add.image(px + 8, py + 16, 'granny').setOrigin(0.5, 1).setDepth(depth);
          extra.push(glow);
          for (let i = 0; i < 3; i++) extra.push(this.add.image(px + 8, py + 6, 'spark').setDepth(depth + 1).setScale(0.8));
          break;
        }
        case 'giver': shadow(); spr = this.add.image(px + 8, py + 16, 'giver').setOrigin(0.5, 1).setDepth(depth); break;
        case 'stardoor': spr = this.add.image(px, py, starDoorOpen(G.save) ? 'star_door_open' : 'star_door').setOrigin(0).setDepth(depth); break;
        case 'statue': spr = this.add.image(px, py, 'star_statue').setOrigin(0).setDepth(depth); break;
        case 'dock': spr = this.add.image(px, py, 'dock').setOrigin(0).setDepth(depth); break;
        case 'stairs': spr = this.add.image(px, py, def.sprite ?? 'stairs').setOrigin(0).setDepth(depth); break;
        case 'lockdoor': spr = this.add.image(px, py, 'lockdoor').setOrigin(0).setDepth(depth); break;
        case 'barrier': spr = this.add.image(px, py, 'barrier').setOrigin(0).setDepth(depth); break;
        case 'woodgate': spr = this.add.image(px, py, 'woodgate').setOrigin(0).setDepth(depth); break;
        case 'gimmick': spr = this.add.image(px, py, flag(`g:${m.id}:${def.id}`) && def.sprite2 ? def.sprite2 : def.sprite!).setOrigin(0).setDepth(depth); break;
        case 'sign': spr = this.add.image(px, py, def.sprite ?? 'sign').setOrigin(0).setDepth(depth); break;
        case 'exit': spr = this.add.image(px, py, 'exit_tile').setOrigin(0).setDepth(depth); break;
        case 'door': spr = this.add.image(px, py, 't_door').setOrigin(0).setDepth(depth); break;
        case 'bed': spr = this.add.image(px, py, 'bed').setOrigin(0).setDepth(depth); break;
        case 'starter':
          shadow(); spr = this.add.image(px + 8, py + 16, SPECIES[def.species!].sprites[0]).setOrigin(0.5, 1).setScale(0.75).setDepth(depth); bob(spr, 2, 450);
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
          const big = en.scale >= 2.5; // 敵人圖是 32×32，縮成 0.5～0.75 倍放在地圖上
          shadow(big ? 1.8 : 1);
          spr = this.add.image(px + 8, py + 16, en.sprite).setOrigin(0.5, 1).setScale(big ? 0.75 : 0.5).setDepth(depth);
          if (!def.ai) bob(spr, 2, 500); // 會動的怪物用移動動畫，不能同時上下晃（兩個動畫會搶 y）
          break;
        }
        default: continue;
      }
      const obj: Obj = { def, spr, extra, x: ox, y: oy };
      this.objs.set(def.id, obj);
      if (def.kind === 'granny') this.granny = obj;
      if (def.kind === 'giver') this.giver = obj;
    }
  }

  // ───────── 通行判定與尋路 ─────────
  private objAt(x: number, y: number): Obj | undefined {
    for (const o of this.objs.values()) {
      if (o.x !== x || o.y !== y) continue;
      if (o.def.kind === 'gimmick' && o.def.passable && flag(`g:${this.map.id}:${o.def.id}`)) continue; // 蜘蛛網橋織好後可以走過去
      return o;
    }
    return undefined;
  }
  private walkable(x: number, y: number): boolean {
    const m = this.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
    if (BLOCKED_TILES.has(m.tiles[y][x])) return false;
    return !this.objAt(x, y);
  }

  /** 怪物走路時的阻擋：地圖外、阻擋地形、以及「不是會動的怪物」的任何物件所在格 */
  private blockedForMonsters(x: number, y: number): boolean {
    const m = this.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    if (BLOCKED_TILES.has(m.tiles[y][x])) return true;
    for (const o of this.objs.values()) if (!this.mons.has(o.def.id) && o.x === x && o.y === y) return true;
    return false;
  }

  /**
   * 主角剛走了一步：輪到怪物（同步回合制）。回傳怪物移動動畫（done）與這回合碰到主角的怪物（contact）。
   * 設定關掉「怪物會走動」或這張地圖沒有會動的怪物時，什麼都不做。
   */
  private monsterTurn(): { done: Promise<void>; contact?: Obj } {
    const live = [...this.objs.values()].filter((o) => this.mons.has(o.def.id));
    if (!G.settings.monstersMove || !live.length) return { done: Promise.resolve() };
    const res = stepMonsters(live.map((o) => this.mons.get(o.def.id)!), { x: this.tx, y: this.ty }, (x, y) => this.blockedForMonsters(x, y));
    const tweens: Promise<void>[] = [];
    for (const mv of res.moves) {
      const o = this.objs.get(mv.id)!;
      o.x = mv.to.x; o.y = mv.to.y;
      o.spr.setDepth(mv.to.y * T + T);
      const shadow = o.extra[0] as Phaser.GameObjects.Image | undefined;
      tweens.push(new Promise<void>((r) => this.tweens.add({ targets: o.spr, x: mv.to.x * T + 8, y: mv.to.y * T + 16, duration: STEP_MS, ease: 'Linear', onComplete: () => r() })));
      if (shadow) this.tweens.add({ targets: shadow, x: mv.to.x * T + 8, y: mv.to.y * T + 14, duration: STEP_MS, ease: 'Linear' });
    }
    return { done: Promise.all(tweens).then(() => undefined), contact: res.contact ? this.objs.get(res.contact) : undefined };
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
    this.followers.forEach((f) => {
      f.spr.setDepth(f.spr.y - 0.5); f.sh.setPosition(f.spr.x, f.spr.y - 2);
      if (f.acc && f.off) f.acc.setPosition(f.spr.x + (f.off.x - 16) * 0.5, f.spr.y + (f.off.y - 32) * 0.5).setDepth(f.spr.depth + 0.2);
    });
    if (this.granny) this.animGranny(this.granny);
    if (this.giver) {
      const frame = !G.settings.reduceMotion && Math.floor(this.time.now / 500) % 2 ? 'giver2' : 'giver';
      if (this.giver.spr.texture.key !== frame) this.giver.spr.setTexture(frame);
    }
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

  /**
   * 星星婆婆的動畫：杖尖兩格閃爍、光暈呼吸、小星星繞圈；主角走近（約 5 格內）光暈更亮。
   * 設定「減少動態」時只留靜止的光暈與固定位置的小星星。
   */
  private animGranny(o: Obj) {
    const calm = G.settings.reduceMotion;
    const t = calm ? 0 : this.time.now;
    const near = Math.hypot(o.x - this.tx, o.y - this.ty) <= 5;
    const [glow, ...stars] = o.extra as Phaser.GameObjects.Image[];
    const frame = Math.floor(t / 500) % 2 ? 'granny2' : 'granny';
    if (o.spr.texture.key !== frame) o.spr.setTexture(frame);
    glow.setAlpha((near ? 0.9 : 0.5) + (calm ? 0 : 0.15 * Math.sin(t / 400))).setScale(1 + (calm ? 0 : 0.06 * Math.sin(t / 400)));
    const cx = o.x * T + 8, cy = o.y * T + 6;
    stars.forEach((s, i) => {
      const a = t / 900 + (i * Math.PI * 2) / 3;
      s.setPosition(cx + Math.cos(a) * 11, cy + Math.sin(a) * 6 - 2).setDepth(o.spr.depth + (Math.sin(a) > 0 ? 1 : -1)).setAlpha(near ? 1 : 0.7);
    });
  }

  private syncPlayerTexture() {
    if (this.dir === 'down') this.player.setTexture('player_down').setFlipX(false);
    else if (this.dir === 'up') this.player.setTexture('player_up').setFlipX(false);
    else this.player.setTexture('player_side').setFlipX(this.dir === 'left');
  }

  private async run() {
    if (this.moving) return;
    this.moving = true;
    let contact: Obj | undefined;
    try { // 迴圈中任何例外都要放開 moving，免得地圖輸入鎖死（內文刻意不縮排，保持 diff 小）
    while (this.queue.length && !this.busy && !ui.blocking) { // 彈窗開著時暫停走路與怪物回合
      const n = this.queue.shift()!;
      if (!this.walkable(n.x, n.y)) { this.queue = []; break; }
      const dx = n.x - this.tx, dy = n.y - this.ty;
      this.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      this.syncPlayerTexture();
      this.trail.unshift({ x: this.tx, y: this.ty });
      this.trail.length = Math.min(this.trail.length, 6);
      this.tx = n.x; this.ty = n.y;
      const turn = this.monsterTurn(); // 主角走一格，怪物也走一格（同步）；動畫和主角的移動同時進行
      this.placeFollowers(true);
      if (!G.settings.reduceMotion) this.tweens.add({ targets: this.player, scaleY: { from: 1, to: 0.9 }, duration: STEP_MS / 2, yoyo: true });
      await Promise.all([
        new Promise<void>((res) => this.tweens.add({ targets: this.player, x: n.x * T + 8, y: n.y * T + 16, duration: STEP_MS, ease: 'Linear', onComplete: () => res() })),
        turn.done,
      ]);
      G.save.x = this.tx; G.save.y = this.ty;
      if (++this.stepCount % 25 === 0) saveGame();
      if (turn.contact) { contact = turn.contact; this.queue = []; break; } // 碰到怪物：停下來，準備開戰
    }
    } finally { this.moving = false; }
    if (ui.blocking) this.queue = []; // 因彈窗而停下：丟掉剩下的路徑，不要之後默默繼續走
    if (contact && !this.busy) {
      this.pending = undefined;
      this.busy = true;
      try { await this.startBattle(contact); } catch (e) { console.error(e); }
      this.busy = false;
      saveGame();
      return;
    }
    const o = this.pending;
    this.pending = undefined;
    if (o && !this.busy && Math.abs(o.x - this.tx) + Math.abs(o.y - this.ty) === 1) {
      const dx = o.x - this.tx, dy = o.y - this.ty;
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
      case 'npc': return d.id === 'doctor' ? this.talkGuide() : d.id === 'clerk' ? this.talkClerk(d) : this.talkNpc(d);
      case 'innkeeper': return this.useInn(d);
      case 'frogstone': return this.useFrogStone(d);
      case 'granny': return this.useGranny(d);
      case 'giver': return this.useGiver(d);
      case 'stardoor': return this.useStarDoor(d);
      case 'statue': return say((d.text ?? []).map((text) => ({ who: d.label ?? '星星雕像', text })));
      case 'sign': return say((d.text ?? []).map((t) => ({ who: d.sprite === 'desk' ? '書桌' : '告示牌', text: t })));
      case 'chest': return this.openChest(o);
      case 'bed': return this.sleepInBed();
      case 'starter': return this.pickStarter(o);
      case 'monster': return this.startBattle(o);
      case 'exit': await this.travel(d.to!.map, d.to!.x, d.to!.y); return;
      case 'door':
        if (d.needFlag && !flag(d.needFlag)) return say((d.lockText ?? []).map((text) => ({ text })));
        await this.travel(d.to!.map, d.to!.x, d.to!.y); return;
      case 'gate': return this.useGate(d);
      case 'rock':
        if (!hasAbility('blast')) return say(STORY.rockLocked);
        if (!(await this.castWrite(d))) return; // 要先用手指照筆順寫出注音才會出招；「先不要」就什麼都不發生（石頭還在）
        await this.breakRock(o);
        setFlag(`r:${m}:${d.id}`); this.refreshObjects();
        return say(STORY.rockBreak);
      case 'leaves':
        if (!hasAbility('gust')) return say(STORY.leavesLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('wind');
        await this.windPuff(o.spr.x + 8, o.spr.y + 8, 0xe8883a);
        setFlag(`l:${m}:${d.id}`); this.refreshObjects();
        return say(STORY.leavesBlow);
      case 'windmill':
        if (flag('windmillOn')) return say([PROMPT_LINES.windmillOn]);
        if (!hasAbility('gust')) return say(STORY.windLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('wind');
        await this.windPuff(o.spr.x + 8, o.spr.y - 12, 0xffffff);
        setFlag('windmillOn'); this.refreshObjects();
        audio.sfx('chest');
        return say(STORY.windOn);
      case 'bell':
        if (flag('bellRung')) return say(STORY.bellDone);
        if (!hasAbility('hum')) return say(STORY.bellLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('chest');
        await this.ripple(o.spr.x + 8, o.spr.y + 8);
        setFlag('bellRung'); this.refreshObjects();
        return say(STORY.bellRing);
      case 'fog':
        if (!hasAbility('fog')) return say(STORY.fogLocked);
        if (!(await this.castWrite(d))) return;
        audio.sfx('wind');
        await this.windPuff(o.spr.x + 8, o.spr.y + 8, 0xffffff);
        setFlag(`f:${m}:${d.id}`); this.refreshObjects();
        return say(STORY.fogBlow);
      case 'woodgate': return say(STORY.woodLocked);
      case 'gimmick': return this.useGimmick(o);
      case 'dock': return this.useDock(d);
      case 'stairs': await this.travel(d.to!.map, d.to!.x, d.to!.y); return;
      case 'lockdoor': return this.useLockdoor(o);
      case 'barrier': return say((d.lockText ?? ['路被擋住了。']).map((text) => ({ text })));
    }
  }

  /** 鎖住的門：有小鑰匙就用掉一把打開，沒有就提示去找鑰匙 */
  private async useLockdoor(o: Obj) {
    const d = o.def;
    if (itemCount('key') < 1) return say((d.lockText ?? ['門鎖住了。', '要先找到小鑰匙。']).map((text) => ({ text })));
    addItem('key', -1);
    setFlag(`k:${this.map.id}:${d.id}`);
    this.refreshObjects();
    audio.sfx('chest');
    return say([{ text: '用小鑰匙打開了門！' }]);
  }

  /** 碼頭：每個碼頭只通往一個地方（dockTo），問一聲就免費搭船過去 */
  private async useDock(d: MapObj) {
    const to = d.dockTo!;
    const name = MAPS[to.map].name;
    const i = await choose(`搭船去${name}？`, '搭船不用錢。', ['出發 ⛵', '先不要']);
    if (i !== 0) return;
    await this.travel(to.map, to.x, to.y);
  }

  /**
   * 用招式之前先寫字：設定開、而且這個招式綁定的注音有筆順資料時，要先用手指寫出來。
   * 回傳 false（按了「先不要」）就什麼都不發生。要寫哪個字由招式決定：物件需要的招式 → 綁定的注音。
   */
  private async castWrite(d: MapObj): Promise<boolean> {
    if (!G.settings.writeChallenge) return true;
    const ability = abilityOf(d);
    const symbol = ability ? castSymbol(ability) : undefined;
    if (!symbol || !STROKES[symbol]) return true;
    return openWriteSymbol(symbol);
  }

  /** 用招式啟動的機關（大鼓、乾花、泡泡球、小水壩…）：沒學會招式只會提示，學會了就會有特效，並可能冒出寶箱 */
  private async useGimmick(o: Obj) {
    const d = o.def, key = `g:${this.map.id}:${d.id}`;
    if (flag(key)) return say((d.doneText ?? ['已經完成囉！']).map((text) => ({ text })));
    if (!hasAbility(d.ability!)) return say((d.lockText ?? []).map((text) => ({ text })));
    if (!(await this.castWrite(d))) return;
    await this.gimmickFx(d.fx!, o.spr.x + 8, o.spr.y + 8);
    setFlag(key); this.refreshObjects();
    audio.sfx('chest');
    return say((d.hitText ?? []).map((text) => ({ text })));
  }
  private async talkGuide() {
    const who = '嘟嘟博士';
    const say2 = (ls: string[]) => say(ls.map((text) => ({ who, text })));
    if (!flag('guideMet')) { await say2(STORY.guide1); setFlag('guideMet'); }
    else if (!flag('starterChosen')) await say2(STORY.guideChoose);
    else if (!flag('giftGiven')) await this.starterTest();
    else if (flag('boss_z')) await say2(STORY.guideEndZ);
    else if (flag('boss_x')) await say2(STORY.guideEndX);
    else if (flag('boss_g')) await say2(STORY.guideEndG);
    else if (flag('boss_d')) await say2(STORY.guideEndD);
    else if (flag('boss_p')) await say2(STORY.guideEnd);
    else await say2(STORY.guideAfter);
    saveGame();
  }

  /** 村民：依進度說不同的話 */
  private async talkNpc(d: MapObj) {
    const v = (d.talk ?? []).find((t) => (!t.if || flag(t.if)) && (!t.not || !flag(t.not)));
    if (!v) return;
    await say(v.lines.map((text) => ({ who: d.label, text })));
    if (v.set) { setFlag(v.set); saveGame(); }
  }

  /** 青蛙聽音石：聽一個注音的聲音，點對的石頭；答對 3 次有獎勵（每次進入蛙鳴灣只能領一次）。答錯沒有懲罰。 */
  private async useFrogStone(d: MapObj) {
    const who = d.label ?? '青蛙聽音石';
    const talk = (lines: string[]) => say(lines.map((text) => ({ who, text })));
    if (this.frogPaid) { await talk(STORY.frogAgain); return; }
    const pool = activeSymbols();
    if (pool.length < 3) { await talk(STORY.frogNeed); return; }
    if (!audio.audioReadyFor(pool)) { await talk(STORY.frogNoAudio); return; } // 沒有音檔不用 TTS 冒充，青蛙睡著了
    await talk(STORY.frogHello);
    let prev: string | undefined;
    for (let n = 0; n < FROG_ROUNDS; n++) {
      const round = makeFrogRound(pool, prev);
      if (!round) return;
      prev = round.target;
      for (;;) {
        audio.playSymbol(round.target);
        const labels = [...round.options, '🔊 再聽一次', '先不要'];
        const i = await choose(`第 ${n + 1} 題（共 ${FROG_ROUNDS} 題）`, '聽一聽，點對的石頭！', labels);
        if (i === round.options.length + 1) return; // 先不要
        if (i === round.options.length) continue; // 再聽一次
        if (round.options[i] === round.target) { toast(STORY.frogRight[0]); break; }
        toast(STORY.frogWrong[0]);
      }
    }
    this.frogPaid = true;
    addCoins(FROG_REWARD.coins);
    addItem(FROG_REWARD.item, FROG_REWARD.count);
    saveGame();
    audio.sfx('levelup');
    await talk(STORY.frogDone);
  }

  /** 星星婆婆：第一次見面有登場台詞；之後直接開換獎勵視窗（換了飾品就重畫跟隨的夥伴） */
  private async useGranny(d: MapObj) {
    const who = d.label ?? '星星婆婆';
    if (!flag('grannyMet')) {
      await say(['喔呵呵～小探險家，你身上有星星的味道！', '寶箱裡的星星碎片，可以拿來跟我換好東西喔。'].map((text) => ({ who, text })));
      setFlag('grannyMet');
      saveGame();
    }
    await openStarShop(() => this.buildFollowers());
    saveGame();
  }

  /**
   * 金幣爺爺：窮才出現。答對一題（點對才結束、沒有處罰）就送 GIVER_REWARD 金幣；「先不要」也一樣說再見、換到別座主島。
   * 學過的符號太少（< 2）時不發錢也不換島。
   */
  private async useGiver(d: MapObj) {
    const who = d.label ?? '金幣爺爺';
    const talk = (lines: string[]) => say(lines.map((text) => ({ who, text })));
    if (!flag('giverMet')) {
      await talk(STORY.giverHello);
      setFlag('giverMet');
      saveGame();
    }
    const pool = activeSymbols();
    if (pool.length < 2) { await talk(STORY.giverNeed); return; }
    await talk(STORY.giverAsk);
    const i = await choose('金幣爺爺的問題', `答對就送你 ${GIVER_REWARD} 金幣！`, ['好，我來答！', '先不要']);
    if (i === 0) {
      const tier = G.settings.tier === 'auto' ? 3 : G.settings.tier;
      const q = makeQuestion({
        focus: [], review: pool, allowed: pool, tier, audioReady: audio.audioReadyFor(pool),
        optionCount: effectiveOptionCount(G.settings.optionCount, G.save.stats), stats: G.save.stats,
      });
      await openLessonPick(q.type, q.target, q.options); // listen 模式會自己播放聲音；沒音檔時 makeQuestion 已降成 match
      addCoins(GIVER_REWARD);
      saveGame();
      audio.sfx('levelup');
      await talk(STORY.giverDone);
    }
    await talk(STORY.giverBye);
    G.save.giverAt = nextGiverMap(G.save);
    saveGame();
    this.refreshObjects();
  }

  /** 星光門：看累計星星（不看可用星星）；不夠就說明還要幾顆，夠了就進星光小屋 */
  private async useStarDoor(d: MapObj) {
    if (!starDoorOpen(G.save)) {
      await say([{ who: d.label ?? '星光門', text: `星光門還在睡覺，要 ${STAR_DOOR_NEED} 顆星星才會醒來（現在 ${G.save.stars} 顆）` }]);
      return;
    }
    audio.sfx('chest');
    await this.travel(d.to!.map, d.to!.x, d.to!.y);
  }

  /** 旅館：付錢住一晚，夥伴 HP／魔力回滿並存檔。金幣不夠就不能住（搭船回起始村睡覺是免費的），也不扣錢。 */
  private async useInn(d: MapObj) {
    const who = d.label ?? '旅館老闆';
    const price = d.price ?? 25;
    await say(STORY.innHello.map((text) => ({ who, text })));
    const stay = stayOutcome(G.save.coins, price);
    if (!stay.ok) {
      await say([`住一晚要 ${price} 金幣，你的金幣還不夠喔。`, '沒關係！搭船回起始村，回家睡覺是免費的。'].map((text) => ({ who, text })));
      return;
    }
    const i = await choose(`住一晚要 ${price} 金幣？`, `夥伴的 HP 和魔力都會回滿，還會幫你存檔。你有 ${G.save.coins} 枚金幣。`, ['住一晚 💤', '先不要']);
    if (i !== 0) return;
    G.save.coins = stay.coinsAfter;
    await this.rest(); // 淡出、全部回滿、存檔
    await say(STORY.innBye.map((text) => ({ who, text })));
  }

  /** 店員：打招呼後開商店 */
  private async talkClerk(d: MapObj) {
    const who = d.label;
    await say(STORY.shopHello.map((text) => ({ who, text })));
    await openShop();
    await say(STORY.shopBye.map((text) => ({ who, text })));
  }

  /** 在房間睡覺：夥伴的 HP／魔力全部回滿 */
  private async sleepInBed() {
    const i = await choose('要睡一覺嗎？', '睡醒後，夥伴的 HP 和魔力都會全部恢復。', ['睡覺 💤', '先不要']);
    if (i !== 0) return;
    await this.rest();
    await say(STORY.sleep.map((text) => ({ text })));
  }
  private async rest() {
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    await new Promise((r) => this.time.delayedCall(650, r));
    healAll();
    saveGame();
    audio.sfx('levelup');
    cam.fadeIn(500, 0, 0, 0);
    await new Promise((r) => this.time.delayedCall(500, r));
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
    const lines = [`打開寶箱！得到 ${n} 顆 ⭐ 星星碎片！（共 ${G.save.stars} 顆）`];
    for (const [id, n] of Object.entries(o.def.items ?? {})) { addItem(id, n); lines.push(`還有 ${ITEMS[id].icon} ${ITEMS[id].name} ×${n}！`); }
    if (o.def.item) {
      addItem(o.def.item);
      const it = ITEMS[o.def.item];
      lines.push(it.key ? `還有 ${it.icon} ${it.name}！可以用來開鎖住的門。` : `還有 ${it.icon} ${it.name}！戰鬥時可以用。`);
    }
    await say(lines, { speak: true });
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
    if (shouldRespawn(this.map, MAPS[map])) for (const id of respawnMapIds(MAPS[map])) this.respawnWild(id); // 洞窟的樓層之間走動不重生
    this.loadMap(map, x, y);
    saveGame();
    cam.fadeIn(200, 0, 0, 0);
  }

  /** 進入地圖時，把已經打倒的野生怪獸重新放回來（頭目、練習布偶不會） */
  private respawnWild(mapId: string) {
    for (const o of MAPS[mapId].objects) {
      if (o.kind !== 'monster' || !BATTLES[o.battle!]?.respawn) continue;
      delete G.save.flags[`m:${mapId}:${o.id}`];
    }
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
  /** 島上機關的特效：鼓（震動波）、水花、泡泡、水流 */
  private async gimmickFx(fx: NonNullable<MapObj['fx']>, x: number, y: number) {
    const calm = G.settings.reduceMotion;
    if (fx === 'drum') {
      audio.sfx('drum');
      for (let i = 0; i < 3; i++) {
        const c = this.add.circle(x, y, 4, 0xffffff, 0).setStrokeStyle(2, 0xe8514a).setDepth(9999);
        this.tweens.add({ targets: c, radius: 24, alpha: 0, duration: 600, delay: i * 140, onComplete: () => c.destroy() });
      }
      if (!calm) this.cameras.main.shake(140, 0.003);
    } else if (fx === 'splash') {
      audio.sfx('splash');
      for (let i = 0; i < 10; i++) {
        const s = this.add.image(x, y - 4, 'drop').setDepth(9999);
        const a = -Math.PI / 2 + (i - 4.5) * 0.28;
        this.tweens.add({ targets: s, x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18 + 10, alpha: 0, duration: 650, ease: 'Quad.out', onComplete: () => s.destroy() });
      }
    } else if (fx === 'bubble') {
      audio.sfx('bubble');
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(x - 8 + i * 3, y + 4, 'puff').setDepth(9999).setTint(0xbfe6ff);
        this.tweens.add({ targets: s, y: y - 26 - i * 3, alpha: 0, duration: 800, delay: i * 70, onComplete: () => s.destroy() });
      }
    } else if (fx === 'croak') {
      audio.sfx('drum');
      for (let i = 0; i < 3; i++) {
        const c = this.add.circle(x, y, 4, 0xffffff, 0).setStrokeStyle(2, 0x5ccf5c).setDepth(9999);
        this.tweens.add({ targets: c, radius: 24, alpha: 0, duration: 600, delay: i * 140, onComplete: () => c.destroy() });
      }
      if (!calm) this.cameras.main.shake(150, 0.003);
    } else if (fx === 'knock') {
      audio.sfx('hint');
      for (let i = 0; i < 2; i++) {
        const c = this.add.circle(x, y, 3, 0xffffff, 0).setStrokeStyle(2, 0xb9824f).setDepth(9999);
        this.tweens.add({ targets: c, radius: 14, alpha: 0, duration: 350, delay: i * 200, onComplete: () => c.destroy() });
      }
    } else if (fx === 'breath') {
      audio.sfx('wind');
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(x - 8 + i * 3, y + 4, 'puff').setDepth(9999).setTint(0xffb36b);
        this.tweens.add({ targets: s, y: y - 26 - i * 3, alpha: 0, duration: 800, delay: i * 70, onComplete: () => s.destroy() });
      }
    } else if (fx === 'snow') {
      audio.sfx('wind');
      for (let i = 0; i < 8; i++) {
        const s = this.add.image(x - 10 + i * 3, y - 22, 'puff').setDepth(9999).setTint(0xffffff).setScale(0.7);
        this.tweens.add({ targets: s, y: y + 8, x: s.x + (i % 2 ? 4 : -4), alpha: 0, duration: 800, delay: i * 60, onComplete: () => s.destroy() });
      }
    } else if (fx === 'slide') {
      audio.sfx('wind');
      for (let i = 0; i < 8; i++) {
        const s = this.add.image(x - 16, y + (i - 4) * 3, 'windline').setDepth(9999).setTint(0xcfeaff);
        this.tweens.add({ targets: s, x: x + 28, alpha: 0, duration: 450, delay: i * 35, onComplete: () => s.destroy() });
      }
    } else if (fx === 'freeze') {
      audio.sfx('hint');
      for (let i = 0; i < 3; i++) {
        const c = this.add.circle(x, y, 4, 0xffffff, 0).setStrokeStyle(2, 0x9fd8ff).setDepth(9999);
        this.tweens.add({ targets: c, radius: 22, alpha: 0, duration: 650, delay: i * 140, onComplete: () => c.destroy() });
      }
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(x - 8 + i * 3, y + 4, 'puff').setDepth(9999).setTint(0xbfe9ff);
        this.tweens.add({ targets: s, y: y - 22 - i * 3, alpha: 0, duration: 800, delay: i * 70, onComplete: () => s.destroy() });
      }
    } else if (fx === 'web') {
      audio.sfx('hint');
      for (let i = 0; i < 8; i++) {
        const s = this.add.image(x - 14, y + (i - 4) * 3, 'windline').setDepth(9999).setTint(0xffffff);
        this.tweens.add({ targets: s, x: x + 14, alpha: 0, duration: 600, delay: i * 40, onComplete: () => s.destroy() });
      }
    } else if (fx === 'gulp') {
      audio.sfx('wind');
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(x - 22 + (i % 2) * 44, y - 10 + i * 4, 'puff').setDepth(9999).setTint(0x7ad27a);
        this.tweens.add({ targets: s, x, y, alpha: 0, duration: 500, delay: i * 60, onComplete: () => s.destroy() });
      }
    } else if (fx === 'roar') {
      audio.sfx('drum');
      for (let i = 0; i < 3; i++) {
        const c = this.add.circle(x, y, 4, 0xffffff, 0).setStrokeStyle(2, 0xe8a23a).setDepth(9999);
        this.tweens.add({ targets: c, radius: 26, alpha: 0, duration: 600, delay: i * 140, onComplete: () => c.destroy() });
      }
      if (!calm) this.cameras.main.shake(180, 0.004);
    } else if (fx === 'sun') {
      audio.sfx('wind');
      const c = this.add.circle(x, y - 14, 5, 0xffd84a).setDepth(9999);
      this.tweens.add({ targets: c, radius: calm ? 7 : 9, alpha: 0, duration: 800, onComplete: () => c.destroy() });
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(x - 8 + i * 3, y + 4, 'puff').setDepth(9999).setTint(0xffb36b);
        this.tweens.add({ targets: s, y: y - 24 - i * 3, alpha: 0, duration: 800, delay: i * 70, onComplete: () => s.destroy() });
      }
    } else {
      audio.sfx('splash');
      for (let i = 0; i < 8; i++) {
        const s = this.add.image(x - 16, y + (i - 4) * 3, 'windline').setDepth(9999).setTint(0x4aa8f0);
        this.tweens.add({ targets: s, x: x + 24, alpha: 0, duration: 550, delay: i * 40, onComplete: () => s.destroy() });
      }
    }
    await new Promise((r) => this.time.delayedCall(850, r));
  }
  private async windPuff(x: number, y: number, tint: number) {
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(x - 14, y + (i - 4) * 3, 'windline').setDepth(9999).setTint(tint === 0xffffff ? 0xffffff : 0xffeedd);
      this.tweens.add({ targets: s, x: x + 24, alpha: 0, duration: 500, delay: i * 40, onComplete: () => s.destroy() });
    }
    await new Promise((r) => this.time.delayedCall(700, r));
  }

  // ───── 博士桌上的三隻初始夥伴 ─────
  private async pickStarter(o: Obj) {
    if (flag('starterChosen')) return;
    if (!flag('guideMet')) { await say([{ who: '嘟嘟博士', text: '先過來跟我打個招呼吧！' }]); return; }
    const sp = SPECIES[o.def.species!];
    await say([{ who: `${sp.name}（${sp.role}）`, text: sp.desc }]);
    const strong = (n: number, hi: string) => (n > 0 ? hi : '普通');
    const i = await choose(`要選「${sp.name}」嗎？`, `${sp.role}。HP ${sp.baseHp}，魔力 ${sp.baseMp}，攻擊${strong(sp.atk, '較強')}，防禦${strong(sp.guard, '較強')}。`, ['就選你了！', '再看看']);
    if (i !== 0) return;
    giveMonster(sp.id);
    setFlag('starterChosen');
    audio.sfx('hatch');
    this.burstSpark(o.spr.x, o.spr.y - 8);
    this.refreshObjects();
    this.buildFollowers();
    saveGame();
    await say([`${sp.name}${STORY.starterPicked[0]}`]);
    await this.starterTest();
  }

  /** 博士的第一題：找出和「ㄅ」一樣的符號，順便教怎麼作答；通過後送道具 */
  private async starterTest() {
    const who = '嘟嘟博士';
    await say(STORY.guideTest.map((text) => ({ who, text })));
    // 播放注音發音；沒有可靠音檔時，明確改成看符號並提示
    if (!audio.playSymbol('ㄅ')) await say(STORY.guideNoAudio.map((text) => ({ who: '旁白', text })));
    // 第 0 關：全程有視覺提示（符號卡一直顯示），兩個選項
    bui.show(false);
    const others = activeSymbols().filter((s) => s !== 'ㄅ');
    const q = { type: 'match' as const, target: 'ㄅ', options: shuffle(['ㄅ', others[Math.floor(Math.random() * others.length)] ?? 'ㄆ']), fallback: false };
    const run = new QuestionRun(q, G.save.stats);
    await bui.ask(run, { speakPrompt: false });
    bui.hide();
    audio.sfx('levelup');
    addItem('potion', 3); addItem('berry', 1);
    setFlag('giftGiven');
    saveGame();
    await say(STORY.guideGift.map((text) => ({ who, text })));
    await say([`得到 ${ITEMS.potion.icon} ${ITEMS.potion.name} ×3、${ITEMS.berry.icon} ${ITEMS.berry.name} ×1！`], { speak: true });
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
      // 被打倒不算失敗：送回自己的房間睡一覺，HP／魔力全部恢復
      await say(STORY.defeat);
      this.queue = []; this.pending = undefined;
      const back = defeatSpot(G.save.homeMap);
      await this.travel(back.map, back.x, back.y);
      healAll();
      saveGame();
      return;
    }
    if (res === 'run') { const st = this.mons.get(o.def.id); if (st) stunMon(st); return; } // 撤退：這隻怪暫停幾步，讓孩子來得及走開
    await this.applyReward(def, o);
  }

  /** 第一次認識符號的小課程：每個新符號依序「選符號 → 聽符號 → 寫符號」，不能跳過、沒有處罰；上完記進 introduced。 */
  private async runLessons(newAbilities: string[]) {
    const intro = (G.save.introduced ??= []);
    for (const sym of lessonSymbols(newAbilities, intro, castSymbol)) {
      const steps = lessonSteps({ hasAudio: audio.hasSymbolAudio(sym), hasStrokes: !!STROKES[sym]?.length, writeOn: G.settings.writeChallenge });
      await say([`「${sym}」是新朋友！`, '我們來認識它：先找一找，再聽一聽，最後寫一寫。'].map((text) => ({ text })), { speak: true });
      for (const step of steps) {
        if (step === 'write') { await openWriteSymbol(sym, { required: true }); continue; }
        const round = makeLessonRound(sym, activeSymbols());
        await openLessonPick(step, round.target, round.options);
      }
      intro.push(sym);
      saveGame();
    }
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
      if (rw.grow) { const g = rw.grow === 'starter' ? G.save.party[0] : G.save.party.find((p) => p.species === rw.grow); if (g) { g.stage = 1; g.level += 1; } }
      for (const a of rw.abilities ?? []) if (!hasAbility(a)) G.save.abilities.push(a);
      for (const [id, n] of Object.entries(rw.items ?? {})) { addItem(id, n); lines.push(`得到 ${ITEMS[id].icon} ${ITEMS[id].name} ×${n}！`); }
      if (rw.join && !G.save.party.some((p) => p.species === rw.join)) {
        if (!giveMonster(rw.join)) lines.push('隊伍滿了，新夥伴先在村子裡等你。');
      }
    }
    if (def.id.startsWith('boss_')) { const lv = def.id.slice(5); if (!G.save.cleared.includes(lv)) G.save.cleared.push(lv); }
    if (rw.coins) addCoins(rw.coins);
    this.refreshObjects();
    this.buildFollowers();
    saveGame();
    const all = claimed ? lines : [...rw.story, ...lines];
    const coinLine = rw.coins ? [`得到 🪙 ${rw.coins} 枚金幣！（共 ${G.save.coins} 枚）`] : [];
    if (all.length) await say([...all, ...coinLine].map((text) => ({ text })));
    else toast(`贏了！獲得經驗 ${rw.exp}${rw.coins ? `、🪙 ${rw.coins} 枚金幣` : ''}！`);
    if (!claimed) await this.runLessons(rw.abilities ?? []);
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
