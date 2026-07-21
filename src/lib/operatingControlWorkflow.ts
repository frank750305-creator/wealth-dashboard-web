import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import {
  executionHandoffPriorityLabel,
  formatBps,
  type ExecutionHandoffPriority,
  type PlatformExceptionItem,
} from "@/lib/executionOperationsWorkflow";
import { committeeDecisionStatus, type CommitteeDecision } from "@/lib/investmentCommitteeWorkflow";
import type {
  ExecutionFillRow,
  ExecutionReviewStatus,
  TradeTicketRow,
} from "@/lib/tradeExecutionWorkflow";
import type { SlaEscalationWarehouseSyncPayload } from "@/types/market";

export type SlaEscalationTier = "critical" | "review" | "routine";

export type SlaEscalationItem = {
  tier: SlaEscalationTier;
  owner: string;
  trigger: string;
  status: ExecutionReviewStatus;
  priority: ExecutionHandoffPriority;
  due: string;
  escalationPath: string;
  action: string;
};

export type OperatingKriItem = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  limit: string;
  owner: string;
  note: string;
};

export type DecisionFunnelStage = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  conversion: string;
  owner: string;
  note: string;
};

type AllocationRiskSnapshot = {
  investedAmount: number;
  stressLoss: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function normalizeWarehouseKey(value: string | undefined, fallback: string) {
  const cleanValue = value?.trim();
  return cleanValue || fallback;
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

function combinedExecutionStatus(statuses: ExecutionReviewStatus[]): ExecutionReviewStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

export function buildCioOperatingBriefItems({
  dataStatus,
  visibleRows,
  candidateCount,
  activeAllocationCount,
  allocationRisk,
  tradeTickets,
  tradeBatchCount,
  committeeDecision,
  executionFillDecision,
  postTradeDecision,
  platformExceptionDecision,
  platformExceptionBlockCount,
  platformExceptionWatchCount,
  totalExecutionCost,
  totalUnfilledNotional,
  totalCashImpactAfterCost,
}: {
  dataStatus: ExecutionReviewStatus;
  visibleRows: number;
  candidateCount: number;
  activeAllocationCount: number;
  allocationRisk: AllocationRiskSnapshot;
  tradeTickets: TradeTicketRow[];
  tradeBatchCount: number;
  committeeDecision: CommitteeDecision;
  executionFillDecision: ExecutionReviewStatus;
  postTradeDecision: ExecutionReviewStatus;
  platformExceptionDecision: ExecutionReviewStatus;
  platformExceptionBlockCount: number;
  platformExceptionWatchCount: number;
  totalExecutionCost: number;
  totalUnfilledNotional: number;
  totalCashImpactAfterCost: number;
}): ExecutionReviewItem[] {
  const researchStatus: ExecutionReviewStatus = candidateCount > 0 ? "pass" : visibleRows > 0 ? "watch" : "block";
  const allocationStatus: ExecutionReviewStatus = activeAllocationCount > 0 ? "pass" : visibleRows > 0 ? "watch" : "block";
  const tradeStatus = committeeDecisionStatus(committeeDecision);
  const exceptionStatus = platformExceptionDecision;
  const baseItems: ExecutionReviewItem[] = [
    {
      label: "資料可用性",
      status: dataStatus,
      value: executionReviewLabel(dataStatus),
      threshold: "資料表結構、價格新鮮度與覆蓋率需可用",
      note: dataStatus === "block" ? "資料層仍有阻擋項，不應進入正式決策" : dataStatus === "watch" ? "資料可用但需保留觀察" : "資料層可支撐目前工作流",
    },
    {
      label: "研究池",
      status: researchStatus,
      value: `${candidateCount} 候選 / ${visibleRows} 顯示`,
      threshold: "至少一檔候選標的",
      note: researchStatus === "block" ? "目前沒有可用研究標的" : researchStatus === "watch" ? "有標的但沒有候選，需要調整篩選條件" : "研究池已有候選標的",
    },
    {
      label: "模型配置",
      status: allocationStatus,
      value: `${activeAllocationCount} 檔 / ${formatCurrency(allocationRisk.investedAmount)}`,
      threshold: "至少一檔進入模型配置",
      note: allocationStatus === "block" ? "尚未形成配置草稿" : allocationStatus === "watch" ? "配置草稿不足，需檢查篩選條件" : "配置草稿已可進入交易流程",
    },
    {
      label: "交易管線",
      status: tradeStatus,
      value: `${tradeTickets.length} 檔 / ${tradeBatchCount} 批`,
      threshold: "投委會簽核建議需可執行",
      note: tradeStatus === "block" ? "交易管線暫緩" : tradeStatus === "watch" ? "交易可條件執行" : "交易管線可執行",
    },
    {
      label: "成交與成本",
      status: executionFillDecision,
      value: `${formatCurrency(totalExecutionCost)} / 未成交 ${formatCurrency(totalUnfilledNotional)}`,
      threshold: "成交率與交易成本需在門檻內",
      note: executionFillDecision === "block" ? "成交或成本存在阻擋項" : executionFillDecision === "watch" ? "成交或成本需觀察" : "成交回報在目前門檻內",
    },
    {
      label: "復盤狀態",
      status: postTradeDecision,
      value: `${formatCurrency(totalCashImpactAfterCost)} 現金影響`,
      threshold: "成交後現金偏差、殘單與成本需可解釋",
      note: postTradeDecision === "block" ? "復盤仍有阻擋項" : postTradeDecision === "watch" ? "復盤仍有觀察項" : "復盤狀態可接受",
    },
    {
      label: "例外事項",
      status: exceptionStatus,
      value: `暫停 ${platformExceptionBlockCount} / 觀察 ${platformExceptionWatchCount}`,
      threshold: "高優先例外需先處理",
      note: exceptionStatus === "block" ? "先清除暫停項目" : exceptionStatus === "watch" ? "保留觀察項目並追蹤" : "目前沒有待處理例外事項",
    },
  ];
  const overallStatus = combinedExecutionStatus(baseItems.map((item) => item.status));
  const nextAction =
    overallStatus === "block"
      ? "暫停正式推進，先處理阻擋項與高優先例外"
      : overallStatus === "watch"
        ? "可進入條件執行或觀察，但需保留追蹤紀錄"
        : "可進入下一輪配置、交易或回報週期";

  return [
    {
      label: "CIO 總覽",
      status: overallStatus,
      value: executionReviewLabel(overallStatus),
      threshold: "資料、研究、配置、交易、成交、復盤與例外事項共同判斷",
      note: nextAction,
    },
    ...baseItems,
  ];
}

export function slaEscalationTierLabel(tier: SlaEscalationTier) {
  if (tier === "critical") return "L1 立即升級";
  if (tier === "review") return "L2 覆核追蹤";
  return "L3 例行追蹤";
}

export function buildSlaEscalationItems({
  platformExceptionItems,
  cioOperatingDecision,
  riskOwner,
  decisionApprover,
  slaCriticalHours,
  slaReviewHours,
}: {
  platformExceptionItems: PlatformExceptionItem[];
  cioOperatingDecision: ExecutionReviewStatus;
  riskOwner: string;
  decisionApprover: string;
  slaCriticalHours: number;
  slaReviewHours: number;
}): SlaEscalationItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const cleanCriticalHours = Math.max(1, Math.floor(slaCriticalHours));
  const cleanReviewHours = Math.max(cleanCriticalHours, Math.floor(slaReviewHours));
  const escalationItems = platformExceptionItems.map((item) => {
    const tier: SlaEscalationTier = item.status === "block" ? "critical" : item.priority === "high" ? "critical" : "review";
    const due = tier === "critical" ? `${cleanCriticalHours}h` : `${cleanReviewHours}h`;
    const escalationPath = tier === "critical" ? `${item.owner} -> ${cleanApprover}` : `${item.owner} -> ${cleanRiskOwner}`;

    return {
      tier,
      owner: item.owner,
      trigger: `${item.source} / ${item.item}`,
      status: item.status,
      priority: item.priority,
      due,
      escalationPath,
      action: item.nextAction,
    };
  });

  if (escalationItems.length) {
    return escalationItems.sort((left, right) => {
      const tierRank: Record<SlaEscalationTier, number> = { critical: 0, review: 1, routine: 2 };
      const priorityRank: Record<ExecutionHandoffPriority, number> = { high: 0, medium: 1, low: 2 };
      return tierRank[left.tier] - tierRank[right.tier] || priorityRank[left.priority] - priorityRank[right.priority];
    });
  }

  return [
    {
      tier: "routine",
      owner: cleanRiskOwner,
      trigger: "CIO 營運總覽",
      status: cioOperatingDecision,
      priority: cioOperatingDecision === "pass" ? "low" : "medium",
      due: `${cleanReviewHours}h`,
      escalationPath: `${cleanRiskOwner} -> ${cleanApprover}`,
      action: cioOperatingDecision === "pass" ? "維持例行監控與下一輪配置檢查" : "確認觀察項目是否需要升級",
    },
  ];
}

export function slaEscalationCsv(rows: SlaEscalationItem[]) {
  const header = ["tier", "owner", "trigger", "priority", "due", "status", "escalation_path", "action"];
  const csvRows = rows.map((row) => [
    slaEscalationTierLabel(row.tier),
    row.owner,
    row.trigger,
    executionHandoffPriorityLabel(row.priority),
    row.due,
    executionReviewLabel(row.status),
    row.escalationPath,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildSlaEscalationSyncPayload({
  items,
  generatedAt,
  workspaceId,
  actorId,
  portfolioId,
  batchId,
  slaCriticalHours,
  slaReviewHours,
}: {
  items: SlaEscalationItem[];
  generatedAt: string;
  workspaceId?: string;
  actorId?: string;
  portfolioId?: string;
  batchId?: string;
  slaCriticalHours: number;
  slaReviewHours: number;
}): SlaEscalationWarehouseSyncPayload {
  const cleanWorkspaceId = normalizeWarehouseKey(workspaceId, "default");
  const cleanActorId = normalizeWarehouseKey(actorId, "system");
  const cleanPortfolioId = normalizeWarehouseKey(portfolioId, "default-portfolio");
  const cleanBatchId = normalizeWarehouseKey(batchId, generatedAt);
  const records = items.map((item, index) => {
    const escalationId = `${cleanPortfolioId}:${cleanBatchId}:SLA:${index + 1}`;

    return {
      workspace_id: cleanWorkspaceId,
      actor_id: cleanActorId,
      escalation_id: escalationId,
      idempotency_key: `${cleanWorkspaceId}:${cleanActorId}:${escalationId}:${generatedAt}`,
      generated_at: generatedAt,
      updated_at: generatedAt,
      portfolio_id: cleanPortfolioId,
      batch_id: cleanBatchId,
      sla_critical_hours: Math.max(1, Math.floor(slaCriticalHours)),
      sla_review_hours: Math.max(1, Math.floor(slaReviewHours)),
      tier: item.tier,
      owner: item.owner,
      trigger: item.trigger,
      status: item.status,
      priority: item.priority,
      due: item.due,
      escalation_path: item.escalationPath,
      action: item.action,
    };
  });

  return {
    table: "sla_escalations",
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    portfolio_id: cleanPortfolioId,
    batch_id: cleanBatchId,
    generated_at: generatedAt,
    record_count: records.length,
    records,
  };
}

export function buildOperatingKriItems({
  dataStatus,
  allocationRisk,
  tradeTickets,
  executionFillRows,
  totalExecutionCost,
  totalUnfilledNotional,
  platformExceptionItems,
  slaEscalationItems,
  postTradeDecision,
  riskOwner,
  executionOwner,
  decisionApprover,
  priceFreshnessDays,
}: {
  dataStatus: ExecutionReviewStatus;
  allocationRisk: AllocationRiskSnapshot;
  tradeTickets: TradeTicketRow[];
  executionFillRows: ExecutionFillRow[];
  totalExecutionCost: number;
  totalUnfilledNotional: number;
  platformExceptionItems: PlatformExceptionItem[];
  slaEscalationItems: SlaEscalationItem[];
  postTradeDecision: ExecutionReviewStatus;
  riskOwner: string;
  executionOwner: string;
  decisionApprover: string;
  priceFreshnessDays: number | null;
}): OperatingKriItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanExecutionOwner = executionOwner.trim() || "交易員";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const totalTicketNotional = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const totalFilledNotional = executionFillRows.reduce((sum, row) => sum + row.filledNotional, 0);
  const unfilledRatio = totalTicketNotional > 0 ? totalUnfilledNotional / totalTicketNotional : null;
  const costBps = totalFilledNotional > 0 ? (totalExecutionCost / totalFilledNotional) * 10000 : null;
  const stressLossRatio = allocationRisk.investedAmount > 0 ? Math.abs(allocationRisk.stressLoss) / allocationRisk.investedAmount : null;
  const exceptionBlockCount = platformExceptionItems.filter((item) => item.status === "block").length;
  const exceptionWatchCount = platformExceptionItems.filter((item) => item.status === "watch").length;
  const highPriorityExceptionCount = platformExceptionItems.filter((item) => item.priority === "high").length;
  const criticalSlaCount = slaEscalationItems.filter((item) => item.tier === "critical").length;
  const reviewSlaCount = slaEscalationItems.filter((item) => item.tier === "review").length;
  const stressStatus: ExecutionReviewStatus =
    stressLossRatio === null ? "watch" : stressLossRatio <= 0.12 ? "pass" : stressLossRatio <= 0.25 ? "watch" : "block";
  const unfilledStatus: ExecutionReviewStatus =
    unfilledRatio === null ? "watch" : unfilledRatio <= 0.05 ? "pass" : unfilledRatio <= 0.2 ? "watch" : "block";
  const costStatus: ExecutionReviewStatus =
    costBps === null ? (totalTicketNotional > 0 ? "block" : "watch") : costBps <= 15 ? "pass" : costBps <= 35 ? "watch" : "block";
  const exceptionStatus: ExecutionReviewStatus =
    exceptionBlockCount > 0 ? "block" : exceptionWatchCount > 0 || highPriorityExceptionCount > 0 ? "watch" : "pass";
  const slaStatus: ExecutionReviewStatus = criticalSlaCount > 0 ? "block" : reviewSlaCount > 0 ? "watch" : "pass";

  return [
    {
      label: "資料新鮮度",
      status: dataStatus,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      limit: "3 天內通過，10 天以上暫停",
      owner: cleanRiskOwner,
      note: dataStatus === "block" ? "資料層阻擋正式決策" : dataStatus === "watch" ? "資料可用但需保留觀察" : "資料層可支援營運監控",
    },
    {
      label: "配置壓力損失",
      status: stressStatus,
      value: `${formatCurrency(allocationRisk.stressLoss)} / ${formatPercent(stressLossRatio)}`,
      limit: "低於 12% 通過，25% 以上暫停",
      owner: cleanRiskOwner,
      note: stressStatus === "block" ? "壓力損失過高，應先調整配置" : "以目前配置草稿估算下行情境",
    },
    {
      label: "未成交殘單",
      status: unfilledStatus,
      value: `${formatCurrency(totalUnfilledNotional)} / ${formatPercent(unfilledRatio)}`,
      limit: "低於交易額 5% 通過，20% 以上暫停",
      owner: cleanExecutionOwner,
      note: unfilledStatus === "block" ? "殘單過高，需重新拆單或延後決策" : "用成交回報檢查執行落差",
    },
    {
      label: "交易成本",
      status: costStatus,
      value: `${formatCurrency(totalExecutionCost)} / ${formatBps(costBps)}`,
      limit: "低於 15 bps 通過，35 bps 以上暫停",
      owner: cleanExecutionOwner,
      note: costStatus === "block" ? "交易成本超出營運門檻" : "合併滑價與手續費估算",
    },
    {
      label: "例外事項",
      status: exceptionStatus,
      value: `高優先 ${highPriorityExceptionCount} / 暫停 ${exceptionBlockCount} / 觀察 ${exceptionWatchCount}`,
      limit: "不得有暫停項目，高優先需追蹤",
      owner: cleanApprover,
      note: exceptionStatus === "pass" ? "目前沒有需要升級的例外" : "需在例外事項總控台指定處理動作",
    },
    {
      label: "SLA 升級",
      status: slaStatus,
      value: `L1 ${criticalSlaCount} / L2 ${reviewSlaCount}`,
      limit: "L1 項目需立即升級",
      owner: cleanRiskOwner,
      note: slaStatus === "block" ? "存在 L1 升級項目" : slaStatus === "watch" ? "存在 L2 覆核項目" : "SLA 處於例行追蹤",
    },
    {
      label: "投後復盤",
      status: postTradeDecision,
      value: executionReviewLabel(postTradeDecision),
      limit: "復盤無暫停項目才可關閉本輪交易",
      owner: cleanRiskOwner,
      note: postTradeDecision === "block" ? "復盤仍有阻擋項" : postTradeDecision === "watch" ? "復盤仍有觀察項" : "成交後狀態可接受",
    },
  ];
}

export function operatingKriCsv(rows: OperatingKriItem[]) {
  const header = ["label", "status", "value", "limit", "owner", "note"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.value,
    row.limit,
    row.owner,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function funnelConversionText(count: number, total: number) {
  return total > 0 ? formatPercent(count / total) : "--";
}

function funnelRatioStatus(count: number, total: number, passRatio: number, watchRatio: number): ExecutionReviewStatus {
  if (total <= 0) return "watch";
  if (count <= 0) return "block";
  const ratio = count / total;
  if (ratio >= passRatio) return "pass";
  if (ratio >= watchRatio) return "watch";
  return "block";
}

export function buildDecisionFunnelStages({
  totalRows,
  visibleRows,
  candidateCount,
  activeAllocationCount,
  activeRebalanceCount,
  tradeTicketCount,
  filledTradeCount,
  dataStatus,
  executionFillDecision,
  operatingKriDecision,
  platformExceptionDecision,
  platformExceptionCount,
  operatingKriBlockCount,
  operatingKriWatchCount,
  riskOwner,
  executionOwner,
  decisionApprover,
}: {
  totalRows: number;
  visibleRows: number;
  candidateCount: number;
  activeAllocationCount: number;
  activeRebalanceCount: number;
  tradeTicketCount: number;
  filledTradeCount: number;
  dataStatus: ExecutionReviewStatus;
  executionFillDecision: ExecutionReviewStatus;
  operatingKriDecision: ExecutionReviewStatus;
  platformExceptionDecision: ExecutionReviewStatus;
  platformExceptionCount: number;
  operatingKriBlockCount: number;
  operatingKriWatchCount: number;
  riskOwner: string;
  executionOwner: string;
  decisionApprover: string;
}): DecisionFunnelStage[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanExecutionOwner = executionOwner.trim() || "交易員";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const dataLoadStatus: ExecutionReviewStatus = totalRows > 0 ? dataStatus : "watch";
  const tradeStatus: ExecutionReviewStatus =
    activeRebalanceCount === 0 ? "watch" : tradeTicketCount === 0 ? "block" : tradeTicketCount < activeRebalanceCount ? "watch" : "pass";
  const filledStatus: ExecutionReviewStatus = tradeTicketCount > 0 ? executionFillDecision : "watch";

  return [
    {
      label: "資料載入",
      status: dataLoadStatus,
      value: `${totalRows} 檔`,
      conversion: totalRows > 0 ? "100.00%" : "--",
      owner: cleanRiskOwner,
      note: dataLoadStatus === "pass" ? "BigQuery 商品資料已可進入研究流程" : "先載入或修正資料品質，再進入研究漏斗",
    },
    {
      label: "研究篩選",
      status: funnelRatioStatus(visibleRows, totalRows, 0.2, 0.05),
      value: `${visibleRows} / ${totalRows}`,
      conversion: funnelConversionText(visibleRows, totalRows),
      owner: cleanRiskOwner,
      note: visibleRows ? "Watchlist 篩選後仍有可研究標的" : "目前篩選條件沒有留下標的",
    },
    {
      label: "候選名單",
      status: funnelRatioStatus(candidateCount, visibleRows, 0.15, 0.01),
      value: `${candidateCount} / ${visibleRows}`,
      conversion: funnelConversionText(candidateCount, visibleRows),
      owner: cleanRiskOwner,
      note: candidateCount ? "候選池可支援下一步配置" : "需要調整篩選門檻或商品清單",
    },
    {
      label: "模型配置",
      status: funnelRatioStatus(activeAllocationCount, visibleRows, 0.15, 0.01),
      value: `${activeAllocationCount} / ${visibleRows}`,
      conversion: funnelConversionText(activeAllocationCount, visibleRows),
      owner: cleanRiskOwner,
      note: activeAllocationCount ? "已有商品進入配置草稿" : "尚未形成可交易的配置草稿",
    },
    {
      label: "再平衡交易",
      status: tradeStatus,
      value: `${tradeTicketCount} / ${activeRebalanceCount}`,
      conversion: funnelConversionText(tradeTicketCount, activeRebalanceCount),
      owner: cleanExecutionOwner,
      note:
        activeRebalanceCount === 0
          ? "目前沒有偏離門檻以上的交易"
          : tradeTicketCount < activeRebalanceCount
            ? "部分交易低於最小交易金額，需人工確認"
            : "需交易項目已轉成交易清單",
    },
    {
      label: "成交回報",
      status: filledStatus,
      value: `${filledTradeCount} / ${tradeTicketCount}`,
      conversion: funnelConversionText(filledTradeCount, tradeTicketCount),
      owner: cleanExecutionOwner,
      note: filledStatus === "block" ? "成交不足或成本過高" : filledStatus === "watch" ? "成交回報需要覆核" : "成交回報可進入復盤",
    },
    {
      label: "營運放行",
      status: operatingKriDecision,
      value: `暫停 ${operatingKriBlockCount} / 觀察 ${operatingKriWatchCount}`,
      conversion: executionReviewLabel(operatingKriDecision),
      owner: cleanApprover,
      note: operatingKriDecision === "pass" ? "KRI 未阻擋本輪流程" : "先處理 KRI 暫停或觀察項目",
    },
    {
      label: "例外關閉",
      status: platformExceptionDecision,
      value: `${platformExceptionCount} 項`,
      conversion: platformExceptionCount ? "待清理" : "已清理",
      owner: cleanApprover,
      note: platformExceptionCount ? "依例外事項總控台關閉待辦" : "本輪沒有未關閉例外",
    },
  ];
}

export function decisionFunnelCsv(rows: DecisionFunnelStage[]) {
  const header = ["stage", "status", "value", "conversion", "owner", "note"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.value,
    row.conversion,
    row.owner,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
