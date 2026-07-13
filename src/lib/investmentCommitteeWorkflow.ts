import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type {
  ExecutionReviewStatus,
  TradeBatchRow,
  TradeTicketRow,
} from "@/lib/tradeExecutionWorkflow";

export type CommitteeDecision = "approve" | "conditional" | "hold";

export type DecisionAuditRecord = {
  label: string;
  value: string;
  note: string;
};

type AllocationPolicyRow = {
  symbol: string;
  allocationWeight: number;
  score: number;
};

type AllocationRiskSnapshot = {
  investedAmount: number;
  estimatedAnnualVolatility: number | null;
  weightedMaxDrawdown: number | null;
  stressLoss: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function finiteValues(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function minimumFiniteValue(values: Array<number | null | undefined>) {
  const cleanValues = finiteValues(values);
  return cleanValues.length ? Math.min(...cleanValues) : null;
}

function maximumFiniteValue(values: Array<number | null | undefined>) {
  const cleanValues = finiteValues(values);
  return cleanValues.length ? Math.max(...cleanValues) : null;
}

function parseSymbolList(value: string) {
  return value
    .split(/[\s,，、]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function resultStamp() {
  return new Date().toISOString().slice(0, 19).replaceAll(":", "").replace("T", "-");
}

export function investmentPolicyLimitItems({
  allocationRows,
  allocationRisk,
  tradeTickets,
  allocationCapital,
  priceFreshnessDays,
  policyMaxSingleWeightPercent,
  policyMaxVolatilityPercent,
  policyMaxDrawdownPercent,
  policyMinimumScore,
}: {
  allocationRows: AllocationPolicyRow[];
  allocationRisk: AllocationRiskSnapshot;
  tradeTickets: TradeTicketRow[];
  allocationCapital: number;
  priceFreshnessDays: number | null;
  policyMaxSingleWeightPercent: number;
  policyMaxVolatilityPercent: number;
  policyMaxDrawdownPercent: number;
  policyMinimumScore: number;
}): ExecutionReviewItem[] {
  const maxSingleWeight = Math.max(0, policyMaxSingleWeightPercent) / 100;
  const maxVolatility = Math.max(0, policyMaxVolatilityPercent) / 100;
  const drawdownLimit = -Math.max(0.01, Math.abs(policyMaxDrawdownPercent) / 100);
  const maxWeight = maximumFiniteValue(allocationRows.map((row) => row.allocationWeight));
  const maxWeightRow = allocationRows.find((row) => row.allocationWeight === maxWeight);
  const minScore = minimumFiniteValue(allocationRows.map((row) => row.score));
  const grossTradeAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const grossTradeRatio = allocationCapital > 0 ? grossTradeAmount / allocationCapital : null;
  const volatility = allocationRisk.estimatedAnnualVolatility;
  const weightedDrawdown = allocationRisk.weightedMaxDrawdown;
  const weightStatus: ExecutionReviewStatus =
    maxWeight === null ? "watch" : maxWeight <= maxSingleWeight ? "pass" : maxWeight <= maxSingleWeight * 1.15 ? "watch" : "block";
  const volatilityStatus: ExecutionReviewStatus =
    volatility === null ? "watch" : volatility <= maxVolatility ? "pass" : volatility <= maxVolatility * 1.2 ? "watch" : "block";
  const drawdownStatus: ExecutionReviewStatus =
    weightedDrawdown === null ? "watch" : weightedDrawdown >= drawdownLimit ? "pass" : weightedDrawdown >= drawdownLimit * 1.15 ? "watch" : "block";
  const scoreStatus: ExecutionReviewStatus =
    minScore === null ? "watch" : minScore >= policyMinimumScore ? "pass" : minScore >= policyMinimumScore - 5 ? "watch" : "block";
  const turnoverStatus: ExecutionReviewStatus =
    grossTradeRatio === null ? "watch" : grossTradeRatio <= 0.5 ? "pass" : grossTradeRatio <= 0.8 ? "watch" : "block";
  const freshnessStatusValue: ExecutionReviewStatus =
    priceFreshnessDays === null ? "watch" : priceFreshnessDays <= 3 ? "pass" : priceFreshnessDays <= 10 ? "watch" : "block";

  return [
    {
      label: "單檔權重上限",
      status: weightStatus,
      value: `${maxWeightRow?.symbol ?? "--"} / ${formatPercent(maxWeight)}`,
      threshold: `不得高於 ${formatPercent(maxSingleWeight)}`,
      note: weightStatus === "block" ? "單檔權重超出政策限制，需重跑配置或降低上限" : "檢查模型配置是否過度集中",
    },
    {
      label: "年化波動上限",
      status: volatilityStatus,
      value: formatPercent(volatility),
      threshold: `不得高於 ${formatPercent(maxVolatility)}`,
      note: volatilityStatus === "block" ? "預估波動超出政策限制，需降低風險資產比重" : "使用配置草稿的預估年化波動",
    },
    {
      label: "回撤限制",
      status: drawdownStatus,
      value: formatPercent(weightedDrawdown),
      threshold: `不得低於 ${formatPercent(drawdownLimit)}`,
      note: drawdownStatus === "block" ? "加權回撤超出政策限制，需調整候選資產" : "使用配置草稿的加權最大回撤",
    },
    {
      label: "最低模型分數",
      status: scoreStatus,
      value: minScore === null ? "--" : String(minScore),
      threshold: `不得低於 ${policyMinimumScore}`,
      note: scoreStatus === "block" ? "低分標的不應納入政策組合" : "確認配置內商品分數符合政策底線",
    },
    {
      label: "換手限制",
      status: turnoverStatus,
      value: `${formatCurrency(grossTradeAmount)} / ${formatPercent(grossTradeRatio)}`,
      threshold: "總交易額低於模型本金 50% 為佳",
      note: turnoverStatus === "block" ? "交易幅度過大，建議分批或降低調倉強度" : "用總交易額估算本次調倉強度",
    },
    {
      label: "資料新鮮度",
      status: freshnessStatusValue,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      threshold: "3 天內通過，10 天內觀察",
      note: freshnessStatusValue === "block" ? "資料過舊，不應作為正式政策簽核依據" : "確認 BigQuery daily_prices 已足夠接近交易日",
    },
  ];
}

export function committeeDecisionLabel(decision: CommitteeDecision) {
  if (decision === "approve") return "可執行";
  if (decision === "conditional") return "條件執行";
  return "暫緩";
}

export function committeeDecisionStatus(decision: CommitteeDecision): ExecutionReviewStatus {
  if (decision === "approve") return "pass";
  if (decision === "conditional") return "watch";
  return "block";
}

export function committeeDecisionFromItems({
  tradeTickets,
  executionReviewItems,
  monitoringRules,
  policyLimitItems,
}: {
  tradeTickets: TradeTicketRow[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  policyLimitItems: ExecutionReviewItem[];
}): CommitteeDecision {
  const allReviewItems = [...policyLimitItems, ...executionReviewItems, ...monitoringRules];
  const hasBlock = allReviewItems.some((item) => item.status === "block");
  const hasWatch = allReviewItems.some((item) => item.status === "watch");

  if (!tradeTickets.length || hasBlock) return "hold";
  if (hasWatch) return "conditional";
  return "approve";
}

export function committeeApprovalChecklist({
  decision,
  tradeTickets,
  tradeBatches,
  executionReviewItems,
  monitoringRules,
  policyLimitItems,
  allocationRisk,
  allocationCapital,
  skippedTradeCount,
}: {
  decision: CommitteeDecision;
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  policyLimitItems: ExecutionReviewItem[];
  allocationRisk: AllocationRiskSnapshot;
  allocationCapital: number;
  skippedTradeCount: number;
}): ExecutionReviewItem[] {
  const allReviewItems = [...policyLimitItems, ...executionReviewItems, ...monitoringRules];
  const blockCount = allReviewItems.filter((item) => item.status === "block").length;
  const watchCount = allReviewItems.filter((item) => item.status === "watch").length;
  const batchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);
  const grossTradeAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const netCashImpact = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);
  const grossTradeRatio = allocationCapital > 0 ? grossTradeAmount / allocationCapital : null;
  const netCashRatio = allocationCapital > 0 ? Math.abs(netCashImpact) / allocationCapital : null;
  const stressLossRatio = allocationRisk.investedAmount > 0 ? Math.abs(allocationRisk.stressLoss) / allocationRisk.investedAmount : null;
  const tradeAmountStatus: ExecutionReviewStatus =
    grossTradeRatio === null ? "watch" : grossTradeRatio <= 0.5 ? "pass" : grossTradeRatio <= 0.8 ? "watch" : "block";
  const netCashStatus: ExecutionReviewStatus =
    netCashRatio === null ? "watch" : netCashRatio <= 0.15 ? "pass" : netCashRatio <= 0.3 ? "watch" : "block";
  const stressStatus: ExecutionReviewStatus =
    stressLossRatio === null ? "watch" : stressLossRatio <= 0.12 ? "pass" : stressLossRatio <= 0.25 ? "watch" : "block";

  return [
    {
      label: "簽核結論",
      status: committeeDecisionStatus(decision),
      value: committeeDecisionLabel(decision),
      threshold: "沒有暫停項目才可直接執行",
      note:
        decision === "approve"
          ? "可進入交易執行"
          : decision === "conditional"
            ? "需要先處理觀察項目，再執行或分批執行"
            : "存在暫停項目或尚無交易清單，暫不建議執行",
    },
    {
      label: "交易範圍",
      status: tradeTickets.length ? "pass" : "block",
      value: `${tradeTickets.length} 檔 / ${batchCount} 批`,
      threshold: "至少一檔可執行交易",
      note: tradeTickets.length ? "交易清單與批次計畫已形成" : "尚未形成可送簽的交易清單",
    },
    {
      label: "未處理警示",
      status: blockCount > 0 ? "block" : watchCount > 0 ? "watch" : "pass",
      value: `暫停 ${blockCount} / 觀察 ${watchCount}`,
      threshold: "暫停項目必須先解除",
      note: blockCount > 0 ? "先處理暫停項目再送出交易" : watchCount > 0 ? "可條件執行，但需保留覆核紀錄" : "未發現阻擋項目",
    },
    {
      label: "總交易額",
      status: tradeAmountStatus,
      value: `${formatCurrency(grossTradeAmount)} / ${formatPercent(grossTradeRatio)}`,
      threshold: "總交易額低於模型本金 50% 為佳",
      note: tradeAmountStatus === "block" ? "交易幅度過大，建議重新拆批或降低目標差距" : "用於判斷本次調倉幅度",
    },
    {
      label: "現金影響",
      status: netCashStatus,
      value: `${formatCurrency(netCashImpact)} / ${formatPercent(netCashRatio)}`,
      threshold: "淨現金影響低於模型本金 15% 為佳",
      note: netCashImpact < 0 ? "執行前需確認現金來源" : netCashImpact > 0 ? "執行後會釋放現金" : "買賣現金大致平衡",
    },
    {
      label: "壓力風險",
      status: stressStatus,
      value: `${formatCurrency(allocationRisk.stressLoss)} / ${formatPercent(stressLossRatio)}`,
      threshold: "壓力損失低於 12% 為佳",
      note: "簽核時保留配置草稿的壓力風險基準",
    },
    {
      label: "殘留偏離",
      status: skippedTradeCount === 0 ? "pass" : skippedTradeCount <= 2 ? "watch" : "block",
      value: `${Math.max(0, skippedTradeCount)} 檔`,
      threshold: "低於最小交易金額的殘留偏離需列入下次追蹤",
      note: skippedTradeCount ? "有交易因金額太小未執行，需在下次再平衡複核" : "沒有因最小交易金額留下的殘留項目",
    },
  ];
}

export function formatDecisionAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "--";
  return date.toLocaleString("zh-TW", { hour12: false });
}

export function buildDecisionAuditId(name: string, symbols: string, generatedAt: string) {
  const slug =
    `${name}-${symbols}`
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .toUpperCase() || "WATCHLIST";
  const stamp = generatedAt.replace(/\D/g, "").slice(0, 12) || resultStamp().replace(/\D/g, "").slice(0, 12);

  return `IC-${stamp}-${slug}`;
}

export function buildDecisionAuditRecords({
  auditId,
  generatedAt,
  owner,
  approver,
  watchlistName,
  comparisonSymbols,
  committeeDecision,
  policyDecision,
  policyLimitItems,
  executionReviewItems,
  monitoringRules,
  committeeApprovalItems,
  tradeTickets,
  tradeBatches,
  allocationCapital,
}: {
  auditId: string;
  generatedAt: string;
  owner: string;
  approver: string;
  watchlistName: string;
  comparisonSymbols: string;
  committeeDecision: CommitteeDecision;
  policyDecision: ExecutionReviewStatus;
  policyLimitItems: ExecutionReviewItem[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  committeeApprovalItems: ExecutionReviewItem[];
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  allocationCapital: number;
}): DecisionAuditRecord[] {
  const symbols = parseSymbolList(comparisonSymbols);
  const allReviewItems = [...policyLimitItems, ...executionReviewItems, ...monitoringRules, ...committeeApprovalItems];
  const blockCount = allReviewItems.filter((item) => item.status === "block").length;
  const watchCount = allReviewItems.filter((item) => item.status === "watch").length;
  const policyBlockCount = policyLimitItems.filter((item) => item.status === "block").length;
  const policyWatchCount = policyLimitItems.filter((item) => item.status === "watch").length;
  const tradeBatchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);

  return [
    {
      label: "決策包編號",
      value: auditId,
      note: "用於比對本次投委會摘要、交易清單與匯出檔版本",
    },
    {
      label: "產出時間",
      value: formatDecisionAuditTime(generatedAt),
      note: "刷新時間後會重新產生稽核版本",
    },
    {
      label: "決策人",
      value: owner.trim() || "--",
      note: "送簽前確認本次決策負責人",
    },
    {
      label: "簽核單位",
      value: approver.trim() || "--",
      note: "用於保留投委會或覆核人資訊",
    },
    {
      label: "Watchlist",
      value: watchlistName.trim() || "未命名 Watchlist",
      note: "對應目前研究名單",
    },
    {
      label: "商品清單",
      value: symbols.join(" ") || "--",
      note: `共 ${symbols.length} 檔商品`,
    },
    {
      label: "簽核建議",
      value: committeeDecisionLabel(committeeDecision),
      note: "由政策限制、交易前檢核、交易後監控共同推導",
    },
    {
      label: "政策狀態",
      value: executionReviewLabel(policyDecision),
      note: `政策暫停 ${policyBlockCount} / 觀察 ${policyWatchCount}`,
    },
    {
      label: "風控檢核",
      value: `暫停 ${blockCount} / 觀察 ${watchCount}`,
      note: "合併政策、交易前、交易後與簽核檢查",
    },
    {
      label: "交易清單",
      value: `${tradeTickets.length} 檔`,
      note: `分批計畫 ${tradeBatchCount} 批`,
    },
    {
      label: "模型本金",
      value: formatCurrency(allocationCapital),
      note: "本次配置、交易額與風險比例基準",
    },
    {
      label: "稽核備註",
      value:
        committeeDecision === "approve"
          ? "可歸檔送執行"
          : committeeDecision === "conditional"
            ? "需保留條件執行紀錄"
            : "暫緩並保留阻擋原因",
      note: "作為後續回看與版本追蹤的人工覆核入口",
    },
  ];
}

export function decisionAuditCsv(rows: DecisionAuditRecord[]) {
  const header = ["label", "value", "note"];
  const csvRows = rows.map((row) => [row.label, row.value, row.note]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
