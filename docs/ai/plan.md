# SuperBoard Lite 計劃（精簡版）

這份是 repo 內的精簡計劃，給新 session 讀。只放方針、階段、門檻與目前狀態。
目前進度與下一步以 `docs/ai/state.md` 為準；決策紀錄在 `docs/ai/decisions.tsv`。
本檔屬 Tier 0（文件）。更新時要同步 `state.md`。

## 目的

用 SuperBoard Lite（網頁區塊截圖看板，資料存瀏覽器本地）當練習場，**盡量還原 pstack**，走完
plan → design → build → test → deploy → maintain，最後做到多個 agent 過夜持續跑、自動開 PR 與合併、
人只做分級與抽樣檢查。

成功的定義不是產品做得多好，而是：
1. pstack 的每一層（router、原則、playbook、skill）都在對的階段真的被用過，並留下證據。
2. 過夜無人看守的隊列能跑完，且有量測數字：每 PR 成本、干預次數、驗證者抓到的缺陷、回退率。
3. 專案擁有者能用自己的話解釋：為什麼驗證技能是地基、為什麼作者不能判定自己通過、為什麼修正要先做成確定性檢查、分級與抽樣如何取代逐一審查、router 與原則如何約束 agent 的決策。

## 方針（優先於本檔其他段落）

1. **預設還原。** pstack 原生的 router、原則、playbook、skills、流程規則預設全部使用。偏離（不用、改用、延後）必須在 `decisions.tsv` 記一列，寫明理由。
2. **任務從 `/poteto-mode` 進入。** 由 router 分類並配對 playbook，步驟原封複製進 task list；跳過任何步驟要記錄理由。
3. **原則要有使用規則。** 原則被觸發時，要說明它改變了哪個決定；PR 描述列出觸發的原則與其改變的決定。具體寫法等還原清單確認後定案，放 `docs/ai/pstack-playbooks.md`。
4. **驗證用原生流程。** 驗證 skill 以 `create-verification-skill` 產生、`maintain-verification-skill` 維護。
5. **autopilot 是必做。** `autopilot-full`、`autopilot-stack` 在 P4，前置條件是無人看守的憑證改造（見下）。
6. **兩份清單分開管理。** 「還原清單」是 pstack 原生內容；「我們的補充」要明確標示「這是我們的設計，不是 pstack」。目前的補充有：Tier 0／1／2 分級與抽樣、Vercel deploy、Maintain 階段、GitHub App 憑證改造、需求訪談缺口（Issue 模板加驗收條件）、治理強化檢查（suppression、decisions 時間）。
7. **在讀過 SKILL.md 之前，不得使用**：`poteto-mode`（P0.5 前）、`autopilot-stack`、`babysit`、`autonomous-run`、`opening-a-pr`。
8. 不宣稱複製他人成果；還原的是機制與流程，不是結果。外部自述數字只當方向參考。

## 不做

- 不追求一天幾百個 PR；規模用階梯 1 → 3 → 8 → 15 個 PR，每升一階要達上一階的門檻。
- 不做真實網站抓取（資料來源一律是隨時鐘變化的 fixture）。
- 不做帳號系統、付費、多人協作。

## 身分與合併規則（摘要）

- 合併條件由 ruleset `main-protection` 強制：要 PR、只能 squash、線性歷史、4 個必過檢查（`check`、`e2e`、`conventional-title`、`verify`）、strict、code-owner 審查、無 bypass。
- 驗證者是 CI 的確定性工作 `verify`，用 `GITHUB_TOKEN` 發出、綁 PR head SHA；作者不能判定自己通過。
- Tier 2（CODEOWNERS 路徑：CI、verify/、skills、lint／型別設定、依賴、設定檔等）只有人能核准。Tier 0／1 目前只靠必過檢查，Tier 0／1 的自動區分與抽樣是 P4。
- 有人在場的本機 session 沿用現況。**無人看守前必須完成憑證改造：** 用只裝在本 repo、沒有 administration 權限的 GitHub App 當 agent 身分，在受限的 Environment 內執行。在此之前，不要讓 agent 在無人在場時推送或開 PR。
- 不要把本 repo 以推送權限接到雲端 session，直到確認該環境的 GitHub 身分不是人類核准者。

## 階段、門檻與目前狀態

| 階段 | 內容 | 通過門檻 | 狀態 |
|---|---|---|---|
| P0 底盤 | 骨架、嚴格 TS、ESLint、Vitest、Playwright、`Clock`、commit 規範、CI、ruleset、pstack 安裝 | 兩帳號 PR 演練、ruleset 擋直接推送 | 完成；缺用量量測工具、Vercel 連結確認 |
| 治理強化 | CODEOWNERS 補洞、suppression 檢查、decisions 時間由指令寫入 | 三個 PR 合併、檢查全綠 | 完成（#21、#22、#23） |
| P0.5 還原第一步 | 讀釘住版本的 `poteto-mode`、原則索引、playbook 清單、`show-me-your-work` 格式，寫出還原清單；確認 decisions.tsv 格式對照；小任務試跑 router | 還原清單經擁有者確認；每個偏離有決策列；試跑行為符合 SKILL.md | **下一步** |
| P1 手動走一輪 | 從 `/poteto-mode` 入口完成第一個功能（Board 管理）到 PR；journey 放 `verify/journeys/` | 一個 PR 走完；每階段有決策紀錄；擁有者能口頭複述每步為何用該 skill 與原則；router 與專案規則是否衝突有結論 | 未做 |
| P2 驗證三件套 | 原生入口重跑 `create-verification-skill`；verify CLI（clock、種子資料）；Feature Map；約 10 個植入錯誤 | 植入錯誤 100% 被抓到；同一 commit 輸出可重現；Feature Map 與原始碼不一致時能偵測更新；新 session 冷啟動可用 | 部分完成（引擎、首頁 journey、驗證 skill） |
| P3 單任務自主迴圈 | 任務加明確完成條件，agent 自跑到可合併；刻意設計失敗情境 | 無人介入下連續 5 個任務至少 4 個到「可合併」；失敗時能自己停下並留下原因 | 未做；前置：憑證改造 |
| P4 多 agent、分級、自動合併、deploy | `autopilot-*`、risk-tier 檢查、30 分鐘等待窗、`halt`、agent verifier、Vercel | 8 個 PR 過夜佇列無人介入完成率 ≥60%；無「作者自己通過」的合併；每個合併可追溯到 head SHA 的驗證結論；一次 revert／回滾演練成功 | 關卡設計已完成，其餘未做 |
| P5 過夜、gardener、抽樣、維護、L2 | 過夜 15 個 PR；gardener；每日抽樣；`correct`、`reflect`；L2 擷取 worker | 連續 3 晚完成；抽樣至少產生 2 條新確定性檢查；回退率與干預原因有資料 | 未做 |
| P6 選配 | 額度用完交接給 Codex；跨廠商 reviewer | 交接後無需人工補上下文即可續跑 | 未做 |

## 分級與抽樣（我們的設計，P4 實作）

- **Tier 0**：文件、測試、樣式、既有檔案內小幅改動（行數上限 60），不碰依賴、設定、CI、驗證器、schema。檢查全綠自動合併。
- **Tier 1**：一般 `src/` 功能或修正。自動合併，但進抽樣池。
- **Tier 2**：依賴、CI、`verify/`、skills、lint／型別設定、schema 與遷移、deploy 設定、CODEOWNERS 範圍。只有人能合併。
- 抽樣（每日一次）：必看所有 Tier 2、驗證分歧或重試 ≥2 次的 PR、被 revert 的 PR；抽查 Tier 1 初始 30%、Tier 0 初始 10%。連續 20 個抽查無問題則降一檔；任何一次需要 revert 或補 lint 則升一檔，並強制新增一條確定性檢查。
- 修正的價值排序：從架構讓錯誤不可能發生 → 做成 lint／型別／測試讓 CI 擋 → 寫成 skill 或規則 → 人讀 diff（最後手段）。

## 工作紀律

- 每個工作單元切到一個用量視窗內能完成的大小；做完就把狀態寫回 `state.md` 與 `decisions.tsv`。額度用完就停，下一個 session 從 `state.md` 接續。
- 一切狀態都在 repo 裡，不依賴對話記憶。
- 時間一律由指令（`pnpm decision`）寫入系統時間，不由 agent 估計。
- 每 PR 記錄：成本、迴圈次數、驗證者抓到的缺陷與誤報、人工干預次數與原因、tier、合併後 7 天是否回退。
- 驗證者數量預設 1；只有 Tier 2 與驗證分歧時才加到 2–3，並記錄是否真的多抓到東西。

## 未驗證項目

- `poteto-mode` 在 Claude Code 的路由與原則機制，以及它是否與本專案既有規則（AGENTS.md、hooks、ruleset、`pnpm decision`）衝突。
- decisions.tsv（6 欄，前 30 列已雜湊凍結）與 pstack 決策紀錄格式是否一致；不一致時不得改動被凍結的列。
- 憑證改造的細節：App token 開的 PR 是否觸發必過檢查、Environment 分支限制是否擋得住 secret 外洩、`claude-code-action` 搭配訂閱 token 的行為。
- strict 模式下兩個 PR 同時開著的完整行為（只觀察過合併後的結果）；merge queue 在個人帳號 repo 是否可用。
- Vercel：preview 部署保護與驗證者存取、免費方案的回滾能力。
- 用量量測工具尚未決定（見 `docs/ai/usage-measurement.md`）。
- 驗證者與作者同模型的獨立性；後期以跨廠商 reviewer 檢驗。
