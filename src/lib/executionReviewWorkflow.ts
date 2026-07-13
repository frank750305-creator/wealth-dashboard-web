import type {
  ExecutionReviewStatus,
  RebalanceDraftRow,
  TradeBatchRow,
  TradeTicketRow,
} from "@/lib/tradeExecutionWorkflow";

type AllocationRiskSnapshot = {
  investedAmount: number;
  weightedMaxDrawdown: number | null;
  stressLoss: number;
};

export type ExecutionReviewItem = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  threshold: string;
  note: string;
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

export function tradeExecutionReviewItems({
  tradeTickets,
  activeTrades,
  allocationCapital,
  priceFreshnessDays,
  allocationRisk,
  skippedTradeCount,
}: {
  tradeTickets: TradeTicketRow[];
  activeTrades: RebalanceDraftRow[];
  allocationCapital: number;
  priceFreshnessDays: number | null;
  allocationRisk: AllocationRiskSnapshot;
  skippedTradeCount: number;
}): ExecutionReviewItem[] {
  const activeCount = activeTrades.length;
  const ticketCount = tradeTickets.length;
  const executableCoverage = activeCount ? ticketCount / activeCount : null;
  const netCash = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);
  const maxTicketAmount = tradeTickets.reduce((maxValue, row) => Math.max(maxValue, row.ticketAmount), 0);
  const netCashRatio = allocationCapital > 0 ? Math.abs(netCash) / allocationCapital : null;
  const maxTicketRatio = allocationCapital > 0 ? maxTicketAmount / allocationCapital : null;
  const minScore = minimumFiniteValue(tradeTickets.map((row) => row.score));
  const stressLossRatio = allocationRisk.investedAmount > 0 ? Math.abs(allocationRisk.stressLoss) / allocationRisk.investedAmount : null;
  const coverageReviewStatus: ExecutionReviewStatus =
    activeCount === 0 ? "watch" : ticketCount === 0 ? "block" : skippedTradeCount > 0 ? "watch" : "pass";
  const cashReviewStatus: ExecutionReviewStatus =
    netCashRatio === null ? "watch" : netCashRatio <= 0.15 ? "pass" : netCashRatio <= 0.3 ? "watch" : "block";
  const concentrationReviewStatus: ExecutionReviewStatus =
    maxTicketRatio === null ? "watch" : maxTicketRatio <= 0.2 ? "pass" : maxTicketRatio <= 0.35 ? "watch" : "block";
  const freshnessReviewStatus: ExecutionReviewStatus =
    priceFreshnessDays === null ? "watch" : priceFreshnessDays <= 3 ? "pass" : priceFreshnessDays <= 10 ? "watch" : "block";
  const scoreReviewStatus: ExecutionReviewStatus =
    minScore === null ? "watch" : minScore >= 55 ? "pass" : minScore >= 45 ? "watch" : "block";
  const stressReviewStatus: ExecutionReviewStatus =
    stressLossRatio === null ? "watch" : stressLossRatio <= 0.12 ? "pass" : stressLossRatio <= 0.25 ? "watch" : "block";

  return [
    {
      label: "交易覆蓋率",
      status: coverageReviewStatus,
      value: executableCoverage === null ? "--" : `${ticketCount}/${activeCount} (${formatPercent(executableCoverage)})`,
      threshold: "可執行交易不得為 0",
      note:
        activeCount === 0
          ? "尚未形成需交易項目"
          : skippedTradeCount > 0
            ? "部分交易低於最小交易金額，需人工決定是否合併或暫緩"
            : "所有需交易項目都已進入執行清單",
    },
    {
      label: "現金淨流量",
      status: cashReviewStatus,
      value: `${formatCurrency(netCash)} / ${formatPercent(netCashRatio)}`,
      threshold: "低於模型本金 15% 為佳",
      note: netCash < 0 ? "本次交易需要淨投入現金" : netCash > 0 ? "本次交易會釋放現金" : "買賣金額大致平衡",
    },
    {
      label: "最大單筆交易",
      status: concentrationReviewStatus,
      value: `${formatCurrency(maxTicketAmount)} / ${formatPercent(maxTicketRatio)}`,
      threshold: "單筆低於模型本金 20% 為佳",
      note: "避免單一商品交易主導整批調倉",
    },
    {
      label: "價格資料新鮮度",
      status: freshnessReviewStatus,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      threshold: "3 天內通過，10 天內觀察",
      note: "交易前應確認 BigQuery daily_prices 已更新",
    },
    {
      label: "最低模型分數",
      status: scoreReviewStatus,
      value: minScore === null ? "--" : String(minScore),
      threshold: "55 分以上通過，45 分以下暫停",
      note: "避免低分商品被動進入交易單",
    },
    {
      label: "壓力損失比例",
      status: stressReviewStatus,
      value: `${formatCurrency(allocationRisk.stressLoss)} / ${formatPercent(stressLossRatio)}`,
      threshold: "低於 12% 通過，25% 以上暫停",
      note: "使用目前配置草稿的壓力情境估算",
    },
  ];
}

export function executionReviewCsv(rows: ExecutionReviewItem[]) {
  const header = ["label", "status", "value", "threshold", "note"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.value,
    row.threshold,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function tradeMonitoringRuleItems({
  tradeTickets,
  tradeBatches,
  activeTrades,
  allocationCapital,
  allocationRisk,
  priceFreshnessDays,
  skippedTradeCount,
  monitoringHorizonDays,
  monitoringDrawdownAlertPercent,
}: {
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  activeTrades: RebalanceDraftRow[];
  allocationCapital: number;
  allocationRisk: AllocationRiskSnapshot;
  priceFreshnessDays: number | null;
  skippedTradeCount: number;
  monitoringHorizonDays: number;
  monitoringDrawdownAlertPercent: number;
}): ExecutionReviewItem[] {
  const tradeSymbols = new Set(tradeTickets.map((row) => row.symbol));
  const skippedTrades = activeTrades.filter((row) => !tradeSymbols.has(row.symbol));
  const maxSkippedDrift = maximumFiniteValue(skippedTrades.map((row) => Math.abs(row.tradeWeight)));
  const minTradeScore = minimumFiniteValue(tradeTickets.map((row) => row.score));
  const firstBatch = tradeBatches.find((row) => row.batchNumber === 1);
  const firstBatchCashRatio = allocationCapital > 0 && firstBatch ? Math.abs(firstBatch.batchCashImpact) / allocationCapital : null;
  const maxBatchGross = maximumFiniteValue(tradeBatches.map((row) => row.batchGrossAmount));
  const maxBatchGrossRatio = allocationCapital > 0 && maxBatchGross !== null ? maxBatchGross / allocationCapital : null;
  const drawdownLimit = -Math.max(0.01, Math.abs(monitoringDrawdownAlertPercent) / 100);
  const weightedDrawdown = allocationRisk.weightedMaxDrawdown;
  const drawdownWatchLimit = drawdownLimit * 0.75;
  const priceStatus: ExecutionReviewStatus =
    priceFreshnessDays === null ? "watch" : priceFreshnessDays <= 3 ? "pass" : priceFreshnessDays <= 10 ? "watch" : "block";
  const skippedStatus: ExecutionReviewStatus =
    skippedTradeCount === 0 ? "pass" : skippedTradeCount <= 2 ? "watch" : "block";
  const firstBatchCashStatus: ExecutionReviewStatus =
    firstBatchCashRatio === null ? "watch" : firstBatchCashRatio <= 0.1 ? "pass" : firstBatchCashRatio <= 0.2 ? "watch" : "block";
  const batchSizeStatus: ExecutionReviewStatus =
    maxBatchGrossRatio === null ? "watch" : maxBatchGrossRatio <= 0.2 ? "pass" : maxBatchGrossRatio <= 0.35 ? "watch" : "block";
  const scoreStatus: ExecutionReviewStatus =
    minTradeScore === null ? "watch" : minTradeScore >= 55 ? "pass" : minTradeScore >= 45 ? "watch" : "block";
  const drawdownStatus: ExecutionReviewStatus =
    weightedDrawdown === null ? "watch" : weightedDrawdown <= drawdownLimit ? "block" : weightedDrawdown <= drawdownWatchLimit ? "watch" : "pass";

  return [
    {
      label: `T+${monitoringHorizonDays} 價格更新`,
      status: priceStatus,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      threshold: "交易後必須確認 daily_prices 更新",
      note: priceStatus === "pass" ? "資料可支援交易後追蹤" : "先補齊價格更新，再檢查交易後偏離",
    },
    {
      label: "未執行偏離",
      status: skippedStatus,
      value: `${Math.max(0, skippedTradeCount)} 檔 / ${formatPercent(maxSkippedDrift)}`,
      threshold: "低於最小交易金額的偏離需定期回看",
      note: skippedTradeCount ? "下次再平衡前先檢查這些殘留偏離" : "本輪沒有殘留未執行交易",
    },
    {
      label: "首批現金壓力",
      status: firstBatchCashStatus,
      value: `${formatCurrency(firstBatch?.batchCashImpact)} / ${formatPercent(firstBatchCashRatio)}`,
      threshold: "首批現金影響低於模型本金 10% 為佳",
      note: firstBatch?.batchCashImpact && firstBatch.batchCashImpact < 0 ? "需確認現金來源與入金時間" : "首批不需要明顯額外現金",
    },
    {
      label: "批次規模",
      status: batchSizeStatus,
      value: `${formatCurrency(maxBatchGross)} / ${formatPercent(maxBatchGrossRatio)}`,
      threshold: "最大單批低於模型本金 20% 為佳",
      note: batchSizeStatus === "block" ? "建議再降低單批金額上限" : "批次規模可作為執行節奏參考",
    },
    {
      label: "低分交易覆核",
      status: scoreStatus,
      value: minTradeScore === null ? "--" : String(minTradeScore),
      threshold: "最低分數 55 以上較適合直接執行",
      note: scoreStatus === "pass" ? "交易清單未包含明顯低分標的" : "低分標的應先人工確認理由",
    },
    {
      label: "回撤警戒",
      status: drawdownStatus,
      value: `${formatPercent(weightedDrawdown)} / ${formatPercent(drawdownLimit)}`,
      threshold: "超過設定回撤警戒需重新檢查配置",
      note: "以配置草稿的加權最大回撤作為交易後監控基準",
    },
  ];
}
