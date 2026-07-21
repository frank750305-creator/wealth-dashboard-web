import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type { CommitteeDecision } from "@/lib/investmentCommitteeWorkflow";
import type {
  ExecutionFillRow,
  ExecutionReviewStatus,
  TradeBatchRow,
  TradeTicketRow,
} from "@/lib/tradeExecutionWorkflow";
import type { PostTradeAttributionWarehouseSyncPayload } from "@/types/market";

export type ExecutionHandoffPriority = "high" | "medium" | "low";

export type ExecutionHandoffItem = {
  owner: string;
  task: string;
  priority: ExecutionHandoffPriority;
  due: string;
  status: ExecutionReviewStatus;
  evidence: string;
  note: string;
};

export type PlatformExceptionItem = {
  source: string;
  owner: string;
  item: string;
  status: ExecutionReviewStatus;
  priority: ExecutionHandoffPriority;
  due: string;
  evidence: string;
  nextAction: string;
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

function normalizeWarehouseKey(value: string | undefined, fallback: string) {
  const cleanValue = value?.trim();
  return cleanValue || fallback;
}

const POST_TRADE_ATTRIBUTION_METRIC_KEYS: Record<string, string> = {
  成交完成率: "completion_rate",
  未成交殘單: "unfilled_residual",
  交易成本: "execution_cost",
  成交後現金偏差: "cash_impact_after_cost",
  未成交市場曝險: "residual_market_impact",
};

function postTradeAttributionMetricKey(label: string, index: number) {
  return POST_TRADE_ATTRIBUTION_METRIC_KEYS[label] ?? `metric_${index + 1}`;
}

export function executionHandoffPriorityLabel(priority: ExecutionHandoffPriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

export function executionHandoffPriorityClass(priority: ExecutionHandoffPriority) {
  if (priority === "high") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  if (priority === "medium") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
}

export function handoffPriorityFromStatus(status: ExecutionReviewStatus): ExecutionHandoffPriority {
  if (status === "block") return "high";
  if (status === "watch") return "medium";
  return "low";
}

export function buildExecutionHandoffItems({
  auditId,
  executionOwner,
  riskOwner,
  settlementOwner,
  handoffDueDays,
  committeeDecision,
  policyDecision,
  monitoringDecision,
  tradeTickets,
  tradeBatches,
  allocationCapital,
  policyBlockCount,
  policyWatchCount,
  committeeBlockCount,
  committeeWatchCount,
}: {
  auditId: string;
  executionOwner: string;
  riskOwner: string;
  settlementOwner: string;
  handoffDueDays: number;
  committeeDecision: CommitteeDecision;
  policyDecision: ExecutionReviewStatus;
  monitoringDecision: ExecutionReviewStatus;
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  allocationCapital: number;
  policyBlockCount: number;
  policyWatchCount: number;
  committeeBlockCount: number;
  committeeWatchCount: number;
}): ExecutionHandoffItem[] {
  const batchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);
  const grossTradeAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const netCashImpact = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);
  const grossTradeRatio = allocationCapital > 0 ? grossTradeAmount / allocationCapital : null;
  const netCashRatio = allocationCapital > 0 ? Math.abs(netCashImpact) / allocationCapital : null;
  const tradeReadiness: ExecutionReviewStatus =
    committeeDecision === "hold" || !tradeTickets.length ? "block" : committeeDecision === "conditional" ? "watch" : "pass";
  const batchReadiness: ExecutionReviewStatus =
    !tradeBatches.length ? "block" : batchCount > 3 || (grossTradeRatio !== null && grossTradeRatio > 0.5) ? "watch" : "pass";
  const cashReadiness: ExecutionReviewStatus =
    netCashRatio === null ? "watch" : netCashRatio > 0.3 ? "block" : netCashRatio > 0.15 ? "watch" : "pass";
  const policyReadiness: ExecutionReviewStatus =
    policyDecision === "block" ? "block" : policyDecision === "watch" || committeeWatchCount > 0 ? "watch" : "pass";

  return [
    {
      owner: executionOwner.trim() || "交易員",
      task: "確認決策包版本",
      priority: "low",
      due: "T+0",
      status: "pass",
      evidence: auditId,
      note: "交易前先核對目前畫面、CSV 與 memo 是否為同一個決策包版本",
    },
    {
      owner: executionOwner.trim() || "交易員",
      task: "執行第一批交易",
      priority: handoffPriorityFromStatus(tradeReadiness),
      due: "T+0",
      status: tradeReadiness,
      evidence: `${tradeTickets.length} 檔 / ${batchCount} 批`,
      note:
        tradeReadiness === "block"
          ? "簽核結果暫緩或尚無可執行交易，不應送出交易"
          : tradeReadiness === "watch"
            ? "條件執行，需先確認觀察項目已被接受"
            : "可依第一批交易計畫進入執行",
    },
    {
      owner: executionOwner.trim() || "交易員",
      task: "拆批與交易金額控管",
      priority: handoffPriorityFromStatus(batchReadiness),
      due: "T+0",
      status: batchReadiness,
      evidence: `${formatCurrency(grossTradeAmount)} / ${formatPercent(grossTradeRatio)}`,
      note:
        batchReadiness === "block"
          ? "尚無分批計畫"
          : batchReadiness === "watch"
            ? "交易幅度或批次偏大，執行時需分段回報"
            : "批次與交易金額在目前規則內",
    },
    {
      owner: riskOwner.trim() || "風控",
      task: "覆核政策例外",
      priority: handoffPriorityFromStatus(policyReadiness),
      due: "T+0",
      status: policyReadiness,
      evidence: `政策暫停 ${policyBlockCount} / 觀察 ${policyWatchCount}`,
      note:
        policyReadiness === "block"
          ? "政策暫停項目解除前不得執行"
          : policyReadiness === "watch"
            ? "觀察項目需留下接受原因"
            : "政策檢查未發現阻擋項",
    },
    {
      owner: riskOwner.trim() || "風控",
      task: "建立交易後監控",
      priority: handoffPriorityFromStatus(monitoringDecision),
      due: `T+${Math.max(1, handoffDueDays)}`,
      status: monitoringDecision,
      evidence: `簽核暫停 ${committeeBlockCount} / 觀察 ${committeeWatchCount}`,
      note:
        monitoringDecision === "block"
          ? "監控警戒項目需要先定義處置方式"
          : monitoringDecision === "watch"
            ? "需要設定觀察條件與回報節點"
            : "監控規則可直接列入後續追蹤",
    },
    {
      owner: settlementOwner.trim() || "中台",
      task: "確認現金與結算影響",
      priority: handoffPriorityFromStatus(cashReadiness),
      due: "T+0",
      status: cashReadiness,
      evidence: `${formatCurrency(netCashImpact)} / ${formatPercent(netCashRatio)}`,
      note:
        cashReadiness === "block"
          ? "淨現金影響偏高，需確認現金來源或拆分交易"
          : cashReadiness === "watch"
            ? "現金影響需在執行前覆核"
            : "現金影響在目前門檻內",
    },
  ];
}

export function executionHandoffCsv(rows: ExecutionHandoffItem[]) {
  const header = ["owner", "task", "priority", "due", "status", "evidence", "note"];
  const csvRows = rows.map((row) => [
    row.owner,
    row.task,
    executionHandoffPriorityLabel(row.priority),
    row.due,
    executionReviewLabel(row.status),
    row.evidence,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function formatBps(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)} bps`;
}

export function postTradeAttributionItems({
  executionFillRows,
  allocationCapital,
  postTradeReviewDays,
  postTradeBenchmarkMovePercent,
}: {
  executionFillRows: ExecutionFillRow[];
  allocationCapital: number;
  postTradeReviewDays: number;
  postTradeBenchmarkMovePercent: number;
}): ExecutionReviewItem[] {
  const targetNotional = executionFillRows.reduce((sum, row) => sum + row.ticketAmount, 0);
  const filledNotional = executionFillRows.reduce((sum, row) => sum + row.filledNotional, 0);
  const unfilledNotional = executionFillRows.reduce((sum, row) => sum + row.unfilledNotional, 0);
  const totalCost = executionFillRows.reduce((sum, row) => sum + row.totalCost, 0);
  const cashImpactAfterCost = executionFillRows.reduce((sum, row) => sum + row.cashImpactAfterCost, 0);
  const completionRate = targetNotional > 0 ? filledNotional / targetNotional : null;
  const unfilledRatio = targetNotional > 0 ? unfilledNotional / targetNotional : null;
  const costBps = filledNotional > 0 ? (totalCost / filledNotional) * 10_000 : null;
  const cashImpactRatio = allocationCapital > 0 ? Math.abs(cashImpactAfterCost) / allocationCapital : null;
  const benchmarkMove = postTradeBenchmarkMovePercent / 100;
  const residualMarketImpact = unfilledNotional * benchmarkMove;
  const residualMarketImpactRatio = allocationCapital > 0 ? Math.abs(residualMarketImpact) / allocationCapital : null;
  const completionStatus: ExecutionReviewStatus =
    completionRate === null ? "block" : completionRate < 0.8 ? "block" : completionRate < 1 ? "watch" : "pass";
  const unfilledStatus: ExecutionReviewStatus =
    unfilledRatio === null ? "watch" : unfilledRatio > 0.2 ? "block" : unfilledRatio > 0.05 ? "watch" : "pass";
  const costStatus: ExecutionReviewStatus =
    costBps === null ? "watch" : costBps > 35 ? "block" : costBps > 20 ? "watch" : "pass";
  const cashStatus: ExecutionReviewStatus =
    cashImpactRatio === null ? "watch" : cashImpactRatio > 0.3 ? "block" : cashImpactRatio > 0.15 ? "watch" : "pass";
  const residualStatus: ExecutionReviewStatus =
    residualMarketImpactRatio === null ? "watch" : residualMarketImpactRatio > 0.08 ? "block" : residualMarketImpactRatio > 0.03 ? "watch" : "pass";

  return [
    {
      label: "成交完成率",
      status: completionStatus,
      value: `${formatCurrency(filledNotional)} / ${formatPercent(completionRate)}`,
      threshold: "100% 通過，80% 以下暫停",
      note:
        completionStatus === "block"
          ? "成交不足，需重新排程或檢討流動性"
          : completionStatus === "watch"
            ? "仍有未成交部位，需列入復盤"
            : "交易清單已完整成交",
    },
    {
      label: "未成交殘單",
      status: unfilledStatus,
      value: `${formatCurrency(unfilledNotional)} / ${formatPercent(unfilledRatio)}`,
      threshold: "殘單低於交易金額 5% 為佳",
      note:
        unfilledStatus === "block"
          ? "殘單比例偏高，可能影響模型配置落地"
          : unfilledStatus === "watch"
            ? "有少量殘單，需決定補單或取消"
            : "沒有明顯殘單",
    },
    {
      label: "交易成本",
      status: costStatus,
      value: `${formatCurrency(totalCost)} / ${formatBps(costBps)}`,
      threshold: "20 bps 內通過，35 bps 以上暫停",
      note:
        costStatus === "block"
          ? "交易成本偏高，需要檢討執行方式"
          : costStatus === "watch"
            ? "成本略高，需保留交易理由"
            : "成本在目前門檻內",
    },
    {
      label: "成交後現金偏差",
      status: cashStatus,
      value: `${formatCurrency(cashImpactAfterCost)} / ${formatPercent(cashImpactRatio)}`,
      threshold: "低於模型本金 15% 為佳",
      note:
        cashStatus === "block"
          ? "成交後現金影響過大，需重新檢查資金安排"
          : cashStatus === "watch"
            ? "現金影響需在下次復盤確認"
            : "成交後現金影響在目前門檻內",
    },
    {
      label: "未成交市場曝險",
      status: residualStatus,
      value: `${formatCurrency(residualMarketImpact)} / ${formatPercent(residualMarketImpactRatio)}`,
      threshold: `T+${Math.max(1, postTradeReviewDays)} 市場變動假設 ${formatPercent(benchmarkMove)}`,
      note:
        residualStatus === "block"
          ? "未成交部位的市場變動影響偏高，需優先檢討"
          : residualStatus === "watch"
            ? "未成交曝險需列入復盤紀錄"
            : "未成交曝險在目前門檻內",
    },
  ];
}

export function buildPostTradeAttributionSyncPayload({
  rows,
  generatedAt,
  workspaceId,
  actorId,
  portfolioId,
  batchId,
  reviewDays,
  benchmarkMovePercent,
  residualMarketImpact,
}: {
  rows: ExecutionReviewItem[];
  generatedAt: string;
  workspaceId?: string;
  actorId?: string;
  portfolioId?: string;
  batchId?: string;
  reviewDays: number;
  benchmarkMovePercent: number;
  residualMarketImpact: number;
}): PostTradeAttributionWarehouseSyncPayload {
  const cleanWorkspaceId = normalizeWarehouseKey(workspaceId, "default");
  const cleanActorId = normalizeWarehouseKey(actorId, "system");
  const cleanPortfolioId = normalizeWarehouseKey(portfolioId, "default-portfolio");
  const cleanBatchId = normalizeWarehouseKey(batchId, generatedAt);
  const records = rows.map((row, index) => {
    const metricKey = postTradeAttributionMetricKey(row.label, index);
    const attributionId = `${cleanPortfolioId}:${cleanBatchId}:PTA:${metricKey}`;

    return {
      workspace_id: cleanWorkspaceId,
      actor_id: cleanActorId,
      attribution_id: attributionId,
      idempotency_key: `${cleanWorkspaceId}:${cleanActorId}:${attributionId}:${generatedAt}`,
      generated_at: generatedAt,
      updated_at: generatedAt,
      portfolio_id: cleanPortfolioId,
      batch_id: cleanBatchId,
      review_days: Math.max(1, Math.floor(reviewDays)),
      benchmark_move_percent: benchmarkMovePercent,
      residual_market_impact: residualMarketImpact,
      metric_key: metricKey,
      label: row.label,
      status: row.status,
      value: row.value,
      threshold: row.threshold,
      note: row.note,
      source: "post_trade_attribution",
    };
  });

  return {
    table: "post_trade_attribution",
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    portfolio_id: cleanPortfolioId,
    batch_id: cleanBatchId,
    generated_at: generatedAt,
    record_count: records.length,
    records,
  };
}

export function platformExceptionQueueItems({
  policyLimitItems,
  executionReviewItems,
  monitoringRules,
  committeeApprovalItems,
  executionHandoffItems,
  executionFillRows,
  postTradeAttributionRows,
  executionOwner,
  riskOwner,
  settlementOwner,
  decisionApprover,
  exceptionDueDays,
}: {
  policyLimitItems: ExecutionReviewItem[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  committeeApprovalItems: ExecutionReviewItem[];
  executionHandoffItems: ExecutionHandoffItem[];
  executionFillRows: ExecutionFillRow[];
  postTradeAttributionRows: ExecutionReviewItem[];
  executionOwner: string;
  riskOwner: string;
  settlementOwner: string;
  decisionApprover: string;
  exceptionDueDays: number;
}): PlatformExceptionItem[] {
  const cleanExecutionOwner = executionOwner.trim() || "交易員";
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanSettlementOwner = settlementOwner.trim() || "中台";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const due = `T+${Math.max(1, exceptionDueDays)}`;
  const fromReviewItems = (
    source: string,
    owner: string,
    rows: ExecutionReviewItem[],
    nextAction: string,
  ): PlatformExceptionItem[] =>
    rows
      .filter((row) => row.status !== "pass")
      .map((row) => ({
        source,
        owner,
        item: row.label,
        status: row.status,
        priority: handoffPriorityFromStatus(row.status),
        due,
        evidence: row.value,
        nextAction,
      }));

  return [
    ...fromReviewItems("投資政策", cleanRiskOwner, policyLimitItems, "確認政策例外是否可接受，必要時退回模型配置"),
    ...fromReviewItems("交易前檢核", cleanExecutionOwner, executionReviewItems, "交易前解除阻擋項或保留條件執行理由"),
    ...fromReviewItems("交易後監控", cleanRiskOwner, monitoringRules, "建立監控條件與處置節點"),
    ...fromReviewItems("投委會簽核", cleanApprover, committeeApprovalItems, "確認簽核結論與觀察項目是否已被接受"),
    ...executionHandoffItems
      .filter((row) => row.status !== "pass")
      .map((row) => ({
        source: "執行交接",
        owner: row.owner,
        item: row.task,
        status: row.status,
        priority: row.priority,
        due: row.due,
        evidence: row.evidence,
        nextAction: row.note,
      })),
    ...executionFillRows
      .filter((row) => row.fillStatus !== "pass")
      .map((row) => ({
        source: "成交回報",
        owner: cleanExecutionOwner,
        item: row.symbol,
        status: row.fillStatus,
        priority: handoffPriorityFromStatus(row.fillStatus),
        due,
        evidence: `${formatCurrency(row.unfilledNotional)} / ${formatCurrency(row.totalCost)}`,
        nextAction: row.fillNote,
      })),
    ...fromReviewItems("交易後歸因", cleanRiskOwner || cleanSettlementOwner, postTradeAttributionRows, "納入復盤紀錄並決定是否調整下次交易規則"),
  ].sort((left, right) => {
    const priorityRank: Record<ExecutionHandoffPriority, number> = { high: 0, medium: 1, low: 2 };
    return priorityRank[left.priority] - priorityRank[right.priority];
  });
}

export function platformExceptionCsv(rows: PlatformExceptionItem[]) {
  const header = ["source", "owner", "item", "priority", "due", "status", "evidence", "next_action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.owner,
    row.item,
    executionHandoffPriorityLabel(row.priority),
    row.due,
    executionReviewLabel(row.status),
    row.evidence,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
