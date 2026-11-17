// 專案沒裝 @types/node；skin 指紋測試只需要 createHash 的最小宣告
declare module 'node:crypto' {
  interface Hash { update(data: string): Hash; digest(encoding: 'hex'): string }
  export function createHash(algorithm: string): Hash;
}
