export interface FloorConfig {
  seed: number;
  /** 房間欄數、列數（預設 10、7）。圖大小是 3*cols+1 欄、3*rows+1 列 */
  cols?: number; rows?: number;
  /** 一樓：一把鎖門＋一把鑰匙 */
  lock?: boolean;
  /** 二樓：一道石牆＋一個機關開關 */
  barrier?: boolean;
  /** 終點放頭目（頭目＋頭目寶箱）；否則終點放往下的樓梯 */
  boss?: boolean;
  /** 隱藏小密室（裂石當門，裡面一個寶箱） */
  closet?: boolean;
  /** 一般寶箱數量 */
  chests: number;
  /** 怪物：patrol 沿小路徑來回；chase 看到就追 */
  monsters: { ai: 'patrol' | 'chase'; count: number };
}
export type Role = 'up' | 'down' | 'key' | 'door' | 'barrier' | 'switch' | 'rock' | 'closet' | 'chest' | 'boss' | 'bossChest' | 'monster';
export interface FloorObject { role: Role; x: number; y: number; ai?: 'patrol' | 'chase'; patrol?: { x: number; y: number }[] }
export interface Floor {
  w: number; h: number;
  /** 格子字元：'S' 牆、':' 地板，每列一個字串 */
  rows: string[];
  objects: FloorObject[];
  /** 往上的樓梯旁邊、玩家落腳的格子（固定 (2,1)） */
  arrive: { x: number; y: number };
  /** 往下的樓梯旁邊、從下一層回來時落腳的格子（沒有往下樓梯的樓層是 null） */
  downArrive: { x: number; y: number } | null;
}
export function generateFloor(cfg: FloorConfig): Floor;
export const FLOORS: Record<'gc1' | 'gc2', FloorConfig>;
export function renderMazes(): string;
