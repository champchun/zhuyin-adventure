# 注音單音檔

檔名與符號的對照在 `src/data/audioMap.ts`（37 個：b p m f d t n l g k h j q x zh ch sh r z c s i u v a o e eh ai ei ao ou an en ang eng er）。

目前這裡的檔案是用 Azure AI Speech 以 `npm run gen:voice -- --zhuyin-only` 產生的**語音合成**，不是真人標準音。
家長設定 →「注音發音測試 → ④ 音檔」可逐一試聽；覺得念得不對，可以直接用真人錄音（mp3）同檔名覆蓋。
遊戲啟動時偵測這些檔案；出題用到的符號（目前 ㄅㄆㄇㄈㄉㄊㄋ）音檔都在，才會出「聽音選符號」，否則退回「看符號配對」。
