// 旅館住宿（純函式）：金幣夠就扣錢，不夠就不能住、也不扣錢。
export function stayOutcome(coins: number | undefined, price: number): { ok: boolean; coinsAfter: number } {
  const have = coins ?? 0; // 舊存檔沒有金幣欄位
  return have >= price ? { ok: true, coinsAfter: have - price } : { ok: false, coinsAfter: have };
}
