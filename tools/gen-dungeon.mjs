// 迷宮產生器：同樣的種子與設定永遠產生同樣的樓層（自備 LCG 亂數，不用 Math.random）。
// 房間 (rx, ry) 的 2×2 地板左上角是 (3*rx+1, 3*ry+1)；房間之間隔 1 格牆。

/** 依固定順序（右、左、下、上） */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function generateFloor(cfg) {
  const cols = cfg.cols ?? 10;
  const rows = cfg.rows ?? 7;
  const W = 3 * cols + 1;
  const H = 3 * rows + 1;
  const N = cols * rows;

  // 1. 亂數
  let s = cfg.seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  /** Fisher-Yates 打散（回傳新陣列） */
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const id = (rx, ry) => ry * cols + rx;
  const rxOf = (r) => r % cols;
  const ryOf = (r) => Math.floor(r / cols);
  const x0Of = (r) => 3 * rxOf(r) + 1;
  const y0Of = (r) => 3 * ryOf(r) + 1;
  const inGrid = (rx, ry) => rx >= 0 && ry >= 0 && rx < cols && ry < rows;
  const ekey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  // 2. 保留密室房間：邊界、非四角的房間（列優先順序列出）
  let closetRoom = -1;
  if (cfg.closet) {
    const cand = [];
    for (let ry = 0; ry < rows; ry++) for (let rx = 0; rx < cols; rx++) {
      const edge = rx === 0 || ry === 0 || rx === cols - 1 || ry === rows - 1;
      const corner = (rx === 0 || rx === cols - 1) && (ry === 0 || ry === rows - 1);
      if (edge && !corner) cand.push(id(rx, ry));
    }
    if (cand.length) closetRoom = pick(cand);
  }
  const inMaze = (r) => r !== closetRoom;

  // 3. 遞迴回溯法（疊代版）挖出跨越所有迷宮房間的樹
  const adj = Array.from({ length: N }, () => []); // 相連的房間（樹＋braid）
  const connect = (a, b) => { adj[a].push(b); adj[b].push(a); };
  const edges = new Set(); // 已相連的邊
  const visited = new Array(N).fill(false);
  visited[0] = true;
  const stack = [0];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nbs = [];
    for (const [dx, dy] of DIRS) {
      const nx = rxOf(cur) + dx, ny = ryOf(cur) + dy;
      if (!inGrid(nx, ny)) continue;
      const n = id(nx, ny);
      if (inMaze(n) && !visited[n]) nbs.push(n);
    }
    if (!nbs.length) { stack.pop(); continue; }
    const n = pick(nbs);
    visited[n] = true;
    connect(cur, n);
    edges.add(ekey(cur, n));
    stack.push(n);
  }

  /** 在相連關係上從 from 做 BFS，回傳距離與父節點；skip(a,b) 為真的邊不走 */
  const bfs = (from, skip) => {
    const dist = new Array(N).fill(-1);
    const par = new Array(N).fill(-1);
    dist[from] = 0;
    const q = [from];
    for (let i = 0; i < q.length; i++) {
      const a = q[i];
      for (const b of adj[a]) {
        if (dist[b] >= 0 || (skip && skip(a, b))) continue;
        dist[b] = dist[a] + 1; par[b] = a; q.push(b);
      }
    }
    return { dist, par };
  };

  // 4. 起點與終點（此時只有樹）：終點是距離最大者，同距離取編號（列優先）最小
  const start = 0;
  const t = bfs(start);
  let end = start;
  for (let r = 0; r < N; r++) if (t.dist[r] > t.dist[end]) end = r;
  const path = [];
  for (let r = end; r !== -1; r = t.par[r]) path.unshift(r);

  // 5. 鎖邊：路徑 60% 處；A 側＝起點側
  let lockA = -1, lockB = -1;
  const sideA = new Set();
  if ((cfg.lock || cfg.barrier) && path.length >= 2) {
    const idx = Math.min(path.length - 1, Math.max(1, Math.floor(path.length * 0.6)));
    lockA = path[idx - 1]; lockB = path[idx];
  }
  const hasLock = lockA >= 0;
  const isLock = (a, b) => (a === lockA && b === lockB) || (a === lockB && b === lockA);
  if (hasLock) {
    const side = bfs(start, isLock);
    for (let r = 0; r < N; r++) if (side.dist[r] >= 0) sideA.add(r);
  }
  const sameSide = (a, b) => !hasLock || sideA.has(a) === sideA.has(b);

  // 6. braid：岔路與捷徑（不跨鎖邊兩側，所以鎖一定擋得住）
  for (let r = 0; r < N; r++) {
    if (!inMaze(r)) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = rxOf(r) + dx, ny = ryOf(r) + dy;
      if (!inGrid(nx, ny)) continue;
      const n = id(nx, ny);
      if (!inMaze(n) || edges.has(ekey(r, n)) || !sameSide(r, n)) continue;
      if (rnd() < 0.18) { connect(r, n); edges.add(ekey(r, n)); }
    }
  }

  const objects = [];
  const used = new Set(); // 已放物件（或保留）的房間
  const cellOf = (r, dx, dy) => ({ x: x0Of(r) + dx, y: y0Of(r) + dy });
  const put = (role, p, extra) => objects.push({ role, x: p.x, y: p.y, ...extra });
  /** 兩個相鄰房間之間牆上「靠上／靠左」的那一格 */
  const gapCell = (a, b) => {
    const horiz = ryOf(a) === ryOf(b);
    const lo = (horiz ? rxOf(a) < rxOf(b) : ryOf(a) < ryOf(b)) ? a : b;
    return horiz ? { x: 3 * rxOf(lo) + 3, y: y0Of(lo) } : { x: x0Of(lo), y: 3 * ryOf(lo) + 3 };
  };

  // 7. 鑰匙或開關：A 側死路房間，沒有就退而選離起點最遠的
  if (hasLock) {
    const d = bfs(start, isLock).dist;
    const A = [...sideA].sort((a, b) => a - b);
    const dead = A.filter((r) => r !== start && r !== lockA && adj[r].length === 1);
    let keyRoom;
    if (dead.length) keyRoom = pick(dead);
    else {
      let best = -1;
      for (const r of A) if (r !== start && (best < 0 || d[r] > d[best])) best = r;
      keyRoom = best >= 0 ? best : start; // A 只剩起點時的最後後備
    }
    used.add(keyRoom);
    put(cfg.lock ? 'key' : 'switch', cellOf(keyRoom, 1, 1));
  }

  // 8. 終點物件與起點樓梯
  used.add(start); used.add(end);
  put('up', { x: 1, y: 1 });
  const arrive = { x: 2, y: 1 };
  let downArrive = null;
  if (cfg.boss) {
    put('boss', cellOf(end, 0, 0));
    put('bossChest', cellOf(end, 1, 1));
  } else {
    put('down', cellOf(end, 1, 1));
    downArrive = cellOf(end, 0, 1);
  }

  // 9. 密室：與一個鄰居（優先死路、避開起點終點）之間的牆只打通一格放裂石
  let rockCell = null;
  if (closetRoom >= 0) {
    const nbs = [];
    for (const [dx, dy] of DIRS) {
      const nx = rxOf(closetRoom) + dx, ny = ryOf(closetRoom) + dy;
      if (inGrid(nx, ny)) nbs.push(id(nx, ny));
    }
    const ok = nbs.filter((n) => n !== start && n !== end);
    const pool = ok.length ? ok : nbs;
    const dead = pool.filter((n) => adj[n].length === 1);
    const nb = dead.length ? dead[0] : pool[0];
    used.add(nb);
    rockCell = gapCell(closetRoom, nb);
    put('rock', rockCell);
    put('closet', cellOf(closetRoom, 1, 1));
  }

  // 鎖門／石牆：鎖邊的通道只打通一格
  let lockCell = null;
  if (hasLock) {
    lockCell = gapCell(lockA, lockB);
    put(cfg.lock ? 'door' : 'barrier', lockCell);
  }

  // 10. 一般寶箱：剩下的死路房間；不夠就用離起點由遠到近的其他房間補
  const full = bfs(start, null).dist; // 完整圖上離起點的步數
  const free = (r) => inMaze(r) && !used.has(r);
  const all = [];
  for (let r = 0; r < N; r++) all.push(r);
  const chestRooms = shuffle(all.filter((r) => free(r) && adj[r].length === 1)).slice(0, cfg.chests);
  if (chestRooms.length < cfg.chests) {
    const rest = all
      .filter((r) => free(r) && !chestRooms.includes(r))
      .sort((a, b) => full[b] - full[a] || a - b);
    chestRooms.push(...rest.slice(0, cfg.chests - chestRooms.length));
  }
  for (const r of chestRooms) { used.add(r); put('chest', cellOf(r, 1, 1)); }

  // 11. 怪物：離起點大於 5 步、沒有其他物件的房間
  const mons = shuffle(all.filter((r) => free(r) && full[r] > 5)).slice(0, cfg.monsters.count);
  for (const r of mons) {
    used.add(r);
    if (cfg.monsters.ai === 'patrol') {
      put('monster', cellOf(r, 0, 0), { ai: 'patrol', patrol: [cellOf(r, 1, 0), cellOf(r, 1, 1)] });
    } else {
      put('monster', cellOf(r, 1, 1), { ai: 'chase' });
    }
  }

  // 12. 畫格子：全牆，房間與通道挖成地板
  const grid = Array.from({ length: H }, () => new Array(W).fill('S'));
  const open = (x, y) => { grid[y][x] = ':'; };
  for (let r = 0; r < N; r++) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) open(x0Of(r) + dx, y0Of(r) + dy);
  }
  for (const k of edges) {
    const [a, b] = k.split('-').map(Number);
    if (isLock(a, b)) continue; // 鎖邊只開一格（下面處理）
    if (ryOf(a) === ryOf(b)) {
      const x = 3 * Math.min(rxOf(a), rxOf(b)) + 3;
      open(x, y0Of(a)); open(x, y0Of(a) + 1);
    } else {
      const y = 3 * Math.min(ryOf(a), ryOf(b)) + 3;
      open(x0Of(a), y); open(x0Of(a) + 1, y);
    }
  }
  if (lockCell) open(lockCell.x, lockCell.y);
  if (rockCell) open(rockCell.x, rockCell.y);

  return { w: W, h: H, rows: grid.map((r) => r.join('')), objects, arrive, downArrive };
}

// 回音洞窟（回音森林）兩層的設定與種子。要換迷宮：改種子，重跑 `node tools/gen-dungeon.mjs`
export const FLOORS = {
  gc1: { seed: 11, lock: true, closet: true, chests: 3, monsters: { ai: 'patrol', count: 4 } },
  gc2: { seed: 23, barrier: true, boss: true, closet: true, chests: 3, monsters: { ai: 'chase', count: 3 } },
};
/** 產生 src/data/mazes.ts 的內容（字串）。測試用它比對檔案有沒有和產生器同步。 */
export function renderMazes() {
  const out = Object.fromEntries(Object.entries(FLOORS).map(([id, cfg]) => [id, generateFloor(cfg)]));
  return `// 由 tools/gen-dungeon.mjs 產生，不要手改。要換迷宮：改 tools/gen-dungeon.mjs 裡的種子，重跑 node tools/gen-dungeon.mjs\n` +
    `import type { Floor } from '../../tools/gen-dungeon.mjs';\n\nexport const MAZES: Record<'gc1' | 'gc2', Floor> = ${JSON.stringify(out, null, 2)};\n`;
}
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const target = new URL('../src/data/mazes.ts', import.meta.url);
  writeFileSync(target, renderMazes(), 'utf8');
  console.log('已寫入', fileURLToPath(target));
}
