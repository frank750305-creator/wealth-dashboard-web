import type {
  ExecutionRouteEventWarehouseSyncPayload,
  ExecutionRouteWarehouseSyncPayload,
  TradeTicketWarehouseSyncPayload,
} from "@/types/market";

export type RebalanceDirection = "buy" | "sell" | "hold";

export type RebalanceDraftRow = {
  symbol: string;
  currentAmount: number;
  currentWeight: number;
  targetAmount: number;
  targetWeight: number;
  tradeAmount: number;
  tradeWeight: number;
  direction: RebalanceDirection;
  score: number | null;
  signal: string | null;
  note: string;
};

export type TradeTicketRow = RebalanceDraftRow & {
  ticketAmount: number;
  cashImpact: number;
  ticketNote: string;
};

export type TradeBatchRow = TradeTicketRow & {
  batchNumber: number;
  batchGrossAmount: number;
  batchCashImpact: number;
  sequenceInBatch: number;
  batchNote: string;
};

export type ExecutionReviewStatus = "pass" | "watch" | "block";

export type ExecutionFillRow = TradeTicketRow & {
  filledNotional: number;
  unfilledNotional: number;
  fillCompletionRate: number;
  slippageBps: number;
  commissionBps: number;
  slippageCost: number;
  commissionCost: number;
  totalCost: number;
  cashImpactAfterCost: number;
  fillStatus: ExecutionReviewStatus;
  fillNote: string;
};

export type TradeTicketApprovalGateItem = {
  id: string;
  label: string;
  status: ExecutionReviewStatus;
  owner: string;
  evidence: string;
  rule: string;
  action: string;
};

export type ExecutionRouteState = "blocked" | "staged" | "routed";
export type BrokerBoundaryMode = "disabled" | "paper" | "manual_review";
export type ExecutionRouteEventType =
  | "route_created"
  | "approval_gate_checked"
  | "venue_assigned"
  | "broker_boundary_checked"
  | "paper_acknowledged";

export type ExecutionRouteRow = TradeBatchRow & {
  routeId: string;
  venue: string;
  routeState: ExecutionRouteState;
  routeStatus: ExecutionReviewStatus;
  routeSequence: number;
  routeNotional: number;
  estimatedSlippageBps: number;
  estimatedCommissionBps: number;
  estimatedRouteCost: number;
  routeNote: string;
};

export type ExecutionRouteEventRow = {
  eventId: string;
  routeId: string;
  ticketId: string;
  routeSequence: number;
  eventSequence: number;
  symbol: string;
  direction: RebalanceDirection;
  venue: string;
  routeState: ExecutionRouteState;
  routeStatus: ExecutionReviewStatus;
  eventType: ExecutionRouteEventType;
  eventStatus: ExecutionReviewStatus;
  brokerMode: BrokerBoundaryMode;
  eventTime: string;
  actor: string;
  source: string;
  evidence: string;
  nextAction: string;
};

function normalizeWarehouseKey(value: string | undefined, fallback: string) {
  const cleanValue = String(value || fallback).trim().replaceAll(" ", "-").slice(0, 80);
  return cleanValue || fallback;
}

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

export function tradeTicketApprovalLabel(status: ExecutionReviewStatus) {
  return executionReviewLabel(status);
}

export function executionRouteStateLabel(state: ExecutionRouteState) {
  if (state === "routed") return "已模擬路由";
  if (state === "staged") return "待人工確認";
  return "暫停路由";
}

export function brokerBoundaryModeLabel(mode: BrokerBoundaryMode) {
  if (mode === "paper") return "Paper broker";
  if (mode === "manual_review") return "Manual review";
  return "Broker disabled";
}

export function executionRouteEventTypeLabel(type: ExecutionRouteEventType) {
  if (type === "route_created") return "建立路由";
  if (type === "approval_gate_checked") return "核准檢查";
  if (type === "venue_assigned") return "Venue 指派";
  if (type === "broker_boundary_checked") return "Broker 邊界檢查";
  return "Paper ACK";
}

export function tradeTicketRows(rows: RebalanceDraftRow[], minimumTradeAmount: number): TradeTicketRow[] {
  return rows
    .filter((row) => row.direction !== "hold")
    .map((row) => {
      const ticketAmount = Math.abs(row.tradeAmount);
      const isBelowMinimum = ticketAmount < minimumTradeAmount;
      return {
        ...row,
        ticketAmount,
        cashImpact: row.direction === "buy" ? -ticketAmount : ticketAmount,
        ticketNote: isBelowMinimum ? "低於最小交易金額，暫不執行" : "可列入交易清單",
      };
    })
    .filter((row) => row.ticketAmount >= minimumTradeAmount)
    .sort((left, right) => Math.abs(right.cashImpact) - Math.abs(left.cashImpact));
}

export function tradeTicketCsv(rows: TradeTicketRow[], minimumTradeAmount: number) {
  const header = [
    "symbol",
    "direction",
    "ticket_amount",
    "cash_impact",
    "current_amount",
    "target_amount",
    "trade_weight",
    "minimum_trade_amount",
    "score",
    "signal",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.direction,
    row.ticketAmount,
    row.cashImpact,
    row.currentAmount,
    row.targetAmount,
    row.tradeWeight,
    minimumTradeAmount,
    row.score ?? "",
    row.signal ?? "",
    row.ticketNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildTradeTicketSyncPayload({
  tickets,
  generatedAt,
  workspaceId,
  actorId,
  portfolioId,
  batchId,
  minimumTradeAmount,
}: {
  tickets: TradeTicketRow[];
  generatedAt: string;
  workspaceId?: string;
  actorId?: string;
  portfolioId?: string;
  batchId?: string;
  minimumTradeAmount: number;
}): TradeTicketWarehouseSyncPayload {
  const cleanWorkspaceId = normalizeWarehouseKey(workspaceId, "default");
  const cleanActorId = normalizeWarehouseKey(actorId, "system");
  const cleanPortfolioId = normalizeWarehouseKey(portfolioId, "default-portfolio");
  const cleanBatchId = normalizeWarehouseKey(batchId, generatedAt);
  const records = tickets.map((ticket) => {
    const ticketId = `${cleanPortfolioId}:${cleanBatchId}:${ticket.symbol}:${ticket.direction}`;
    return {
      workspace_id: cleanWorkspaceId,
      actor_id: cleanActorId,
      ticket_id: ticketId,
      idempotency_key: `${cleanWorkspaceId}:${cleanActorId}:${ticketId}:${generatedAt}`,
      generated_at: generatedAt,
      updated_at: generatedAt,
      portfolio_id: cleanPortfolioId,
      batch_id: cleanBatchId,
      symbol: ticket.symbol,
      direction: ticket.direction,
      status: "draft",
      ticket_amount: ticket.ticketAmount,
      cash_impact: ticket.cashImpact,
      current_amount: ticket.currentAmount,
      current_weight: ticket.currentWeight,
      target_amount: ticket.targetAmount,
      target_weight: ticket.targetWeight,
      trade_amount: ticket.tradeAmount,
      trade_weight: ticket.tradeWeight,
      score: ticket.score,
      signal: ticket.signal,
      note: ticket.note,
      ticket_note: ticket.ticketNote,
      minimum_trade_amount: minimumTradeAmount,
    };
  });

  return {
    table: "trade_tickets",
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    portfolio_id: cleanPortfolioId,
    batch_id: cleanBatchId,
    generated_at: generatedAt,
    record_count: records.length,
    records,
  };
}

export function tradeBatchRows(
  tickets: TradeTicketRow[],
  maximumBatchAmount: number,
  maximumTicketsPerBatch: number,
): TradeBatchRow[] {
  const cleanMaximumBatchAmount = Math.max(0, maximumBatchAmount);
  const cleanMaximumTicketsPerBatch = Math.max(1, Math.floor(maximumTicketsPerBatch));
  const batches: TradeTicketRow[][] = [];

  tickets.forEach((ticket) => {
    const currentBatch = batches[batches.length - 1];
    const currentGrossAmount = currentBatch?.reduce((sum, row) => sum + row.ticketAmount, 0) ?? 0;
    const shouldStartNewBatch = Boolean(
      currentBatch?.length &&
        (currentBatch.length >= cleanMaximumTicketsPerBatch ||
          (cleanMaximumBatchAmount > 0 && currentGrossAmount + ticket.ticketAmount > cleanMaximumBatchAmount)),
    );

    if (!currentBatch || shouldStartNewBatch) {
      batches.push([ticket]);
      return;
    }

    currentBatch.push(ticket);
  });

  return batches.flatMap((batch, batchIndex) => {
    const batchGrossAmount = batch.reduce((sum, row) => sum + row.ticketAmount, 0);
    const batchCashImpact = batch.reduce((sum, row) => sum + row.cashImpact, 0);
    const batchNote =
      cleanMaximumBatchAmount > 0 && batchGrossAmount > cleanMaximumBatchAmount
        ? "單筆交易已超過批次金額上限，需人工確認流動性"
        : "依交易金額與筆數上限分批";

    return batch.map((row, rowIndex) => ({
      ...row,
      batchNumber: batchIndex + 1,
      batchGrossAmount,
      batchCashImpact,
      sequenceInBatch: rowIndex + 1,
      batchNote,
    }));
  });
}

export function tradeBatchCsv(rows: TradeBatchRow[], maximumBatchAmount: number, maximumTicketsPerBatch: number) {
  const header = [
    "batch_number",
    "sequence_in_batch",
    "symbol",
    "direction",
    "ticket_amount",
    "cash_impact",
    "batch_gross_amount",
    "batch_cash_impact",
    "maximum_batch_amount",
    "maximum_tickets_per_batch",
    "trade_weight",
    "score",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.batchNumber,
    row.sequenceInBatch,
    row.symbol,
    row.direction,
    row.ticketAmount,
    row.cashImpact,
    row.batchGrossAmount,
    row.batchCashImpact,
    maximumBatchAmount,
    maximumTicketsPerBatch,
    row.tradeWeight,
    row.score ?? "",
    row.batchNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildTradeTicketApprovalGateItems({
  tradeTickets,
  tradeBatches,
  skippedTradeCount,
  executionReviewDecision,
  committeeApprovalDecision,
  policyDecision,
  handoffDecision,
  dataReadinessDecision,
  marketAlertDecision,
  maximumBatchAmount,
  minimumTradeAmount,
  decisionOwner,
  executionOwner,
}: {
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  skippedTradeCount: number;
  executionReviewDecision: ExecutionReviewStatus;
  committeeApprovalDecision: ExecutionReviewStatus;
  policyDecision: ExecutionReviewStatus;
  handoffDecision: ExecutionReviewStatus;
  dataReadinessDecision: ExecutionReviewStatus;
  marketAlertDecision: ExecutionReviewStatus;
  maximumBatchAmount: number;
  minimumTradeAmount: number;
  decisionOwner: string;
  executionOwner: string;
}): TradeTicketApprovalGateItem[] {
  const cleanDecisionOwner = decisionOwner.trim() || "Investment owner";
  const cleanExecutionOwner = executionOwner.trim() || "Execution owner";
  const grossTicketAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const largestTicketAmount = tradeTickets.reduce((maxValue, row) => Math.max(maxValue, row.ticketAmount), 0);
  const largestBatchAmount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchGrossAmount), 0);
  const batchLimitStatus: ExecutionReviewStatus =
    !tradeTickets.length
      ? "watch"
      : maximumBatchAmount > 0 && largestBatchAmount > maximumBatchAmount
        ? "block"
        : "pass";
  const minimumTradeStatus: ExecutionReviewStatus =
    !tradeTickets.length ? "block" : skippedTradeCount > 0 ? "watch" : "pass";

  return [
    {
      id: "ticket-readiness",
      label: "交易票完整性",
      status: tradeTickets.length ? "pass" : "block",
      owner: cleanDecisionOwner,
      evidence: `${tradeTickets.length} 張交易票 / 總金額 ${grossTicketAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`,
      rule: "送簽前必須至少有一張可執行交易票",
      action: tradeTickets.length ? "可送下一關" : "先產生再平衡交易票",
    },
    {
      id: "minimum-trade-threshold",
      label: "最小交易金額",
      status: minimumTradeStatus,
      owner: cleanDecisionOwner,
      evidence: `門檻 ${minimumTradeAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })} / 略過 ${Math.max(0, skippedTradeCount)} 張`,
      rule: "低於門檻的交易不進入正式送簽",
      action: skippedTradeCount > 0 ? "確認門檻以下交易是否維持跳過" : "維持現有門檻",
    },
    {
      id: "batch-limit",
      label: "批次金額上限",
      status: batchLimitStatus,
      owner: cleanExecutionOwner,
      evidence: `最大批次 ${largestBatchAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })} / 最大單筆 ${largestTicketAmount.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`,
      rule: "單批交易金額不可超過執行上限",
      action: batchLimitStatus === "block" ? "拆分交易或提高上限後重新送簽" : "可交由交易執行控管",
    },
    {
      id: "pre-trade-review",
      label: "交易前覆核",
      status: executionReviewDecision,
      owner: cleanDecisionOwner,
      evidence: `交易前覆核：${executionReviewLabel(executionReviewDecision)}`,
      rule: "價格新鮮度、曝險與交易清單需先通過",
      action: executionReviewDecision === "pass" ? "保留覆核紀錄" : "先處理交易前覆核警示",
    },
    {
      id: "policy-limit",
      label: "投資政策限制",
      status: policyDecision,
      owner: cleanDecisionOwner,
      evidence: `政策限制：${executionReviewLabel(policyDecision)}`,
      rule: "單一權重、波動、回撤與分數需符合政策",
      action: policyDecision === "pass" ? "可進投委會覆核" : "先修正配置或調整政策門檻",
    },
    {
      id: "committee-approval",
      label: "投委會送簽",
      status: committeeApprovalDecision,
      owner: cleanDecisionOwner,
      evidence: `投委會清單：${executionReviewLabel(committeeApprovalDecision)}`,
      rule: "投委會 blocking item 必須歸零",
      action: committeeApprovalDecision === "pass" ? "可保留核准摘要" : "先完成投委會補件",
    },
    {
      id: "execution-handoff",
      label: "執行交接",
      status: handoffDecision,
      owner: cleanExecutionOwner,
      evidence: `交接狀態：${executionReviewLabel(handoffDecision)}`,
      rule: "執行、風控、交割 owner 與期限需可追蹤",
      action: handoffDecision === "pass" ? "可交給執行台" : "先補齊交接責任人與期限",
    },
    {
      id: "data-readiness",
      label: "資料準備度",
      status: dataReadinessDecision,
      owner: cleanDecisionOwner,
      evidence: `BigQuery 資料：${executionReviewLabel(dataReadinessDecision)}`,
      rule: "價格、FX、schema 與覆蓋率需可讀取",
      action: dataReadinessDecision === "pass" ? "可引用倉儲資料" : "先修資料管線與欄位缺口",
    },
    {
      id: "market-alert",
      label: "市場與營運警示",
      status: marketAlertDecision,
      owner: cleanExecutionOwner,
      evidence: `警示中心：${executionReviewLabel(marketAlertDecision)}`,
      rule: "高優先警示不得進入無條件送簽",
      action: marketAlertDecision === "pass" ? "維持例行監控" : "先關閉阻斷警示或升級人工核准",
    },
  ];
}

export function tradeTicketApprovalGateCsv(rows: TradeTicketApprovalGateItem[]) {
  const header = ["id", "label", "status", "owner", "evidence", "rule", "action"];
  const csvRows = rows.map((row) => [
    row.id,
    row.label,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.rule,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildExecutionRouteRows({
  tradeBatches,
  approvalDecision,
  primaryVenue,
  backupVenue,
  venueCapacityAmount,
  routeSlippageBps,
  routeCommissionBps,
}: {
  tradeBatches: TradeBatchRow[];
  approvalDecision: ExecutionReviewStatus;
  primaryVenue: string;
  backupVenue: string;
  venueCapacityAmount: number;
  routeSlippageBps: number;
  routeCommissionBps: number;
}): ExecutionRouteRow[] {
  const cleanPrimaryVenue = primaryVenue.trim() || "Paper route";
  const cleanBackupVenue = backupVenue.trim() || "Manual review queue";
  const cleanVenueCapacityAmount = Math.max(0, venueCapacityAmount);
  const cleanRouteSlippageBps = Math.max(0, routeSlippageBps);
  const cleanRouteCommissionBps = Math.max(0, routeCommissionBps);
  const allInCostBps = cleanRouteSlippageBps + cleanRouteCommissionBps;

  return tradeBatches.map((row, index) => {
    const exceedsVenueCapacity = cleanVenueCapacityAmount > 0 && row.batchGrossAmount > cleanVenueCapacityAmount;
    const routeStatus: ExecutionReviewStatus =
      approvalDecision === "block"
        ? "block"
        : exceedsVenueCapacity || approvalDecision === "watch" || allInCostBps > 30
          ? "watch"
          : "pass";
    const routeState: ExecutionRouteState =
      routeStatus === "block" ? "blocked" : routeStatus === "watch" ? "staged" : "routed";
    const venue = routeStatus === "pass" ? cleanPrimaryVenue : cleanBackupVenue;
    const estimatedRouteCost = row.ticketAmount * (allInCostBps / 10_000);
    const routeNote =
      routeStatus === "block"
        ? "approval gate 尚未通過，禁止進入正式路由"
        : exceedsVenueCapacity
          ? "批次金額超過 venue 容量，需拆單或改走人工隊列"
          : routeStatus === "watch"
            ? "需人工確認後才能進入正式路由"
            : "僅為模擬路由，尚未送出真實委託";

    return {
      ...row,
      routeId: `RT-${row.batchNumber}-${row.sequenceInBatch}-${row.symbol}-${row.direction}`,
      venue,
      routeState,
      routeStatus,
      routeSequence: index + 1,
      routeNotional: row.ticketAmount,
      estimatedSlippageBps: cleanRouteSlippageBps,
      estimatedCommissionBps: cleanRouteCommissionBps,
      estimatedRouteCost,
      routeNote,
    };
  });
}

export function executionRouteCsv(rows: ExecutionRouteRow[]) {
  const header = [
    "route_id",
    "route_sequence",
    "batch_number",
    "symbol",
    "direction",
    "venue",
    "route_state",
    "route_status",
    "route_notional",
    "estimated_slippage_bps",
    "estimated_commission_bps",
    "estimated_route_cost",
    "cash_impact",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.routeId,
    row.routeSequence,
    row.batchNumber,
    row.symbol,
    row.direction,
    row.venue,
    executionRouteStateLabel(row.routeState),
    executionReviewLabel(row.routeStatus),
    row.routeNotional,
    row.estimatedSlippageBps,
    row.estimatedCommissionBps,
    row.estimatedRouteCost,
    row.cashImpact,
    row.routeNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildExecutionRouteSyncPayload({
  routes,
  generatedAt,
  workspaceId,
  actorId,
  portfolioId,
  batchId,
  approvalDecision,
}: {
  routes: ExecutionRouteRow[];
  generatedAt: string;
  workspaceId?: string;
  actorId?: string;
  portfolioId?: string;
  batchId?: string;
  approvalDecision: ExecutionReviewStatus;
}): ExecutionRouteWarehouseSyncPayload {
  const cleanWorkspaceId = normalizeWarehouseKey(workspaceId, "default");
  const cleanActorId = normalizeWarehouseKey(actorId, "system");
  const cleanPortfolioId = normalizeWarehouseKey(portfolioId, "default-portfolio");
  const cleanBatchId = normalizeWarehouseKey(batchId, generatedAt);
  const records = routes.map((route) => {
    const ticketId = `${cleanPortfolioId}:${cleanBatchId}:${route.symbol}:${route.direction}`;
    const routeId = `${cleanPortfolioId}:${cleanBatchId}:${route.routeId}`;
    return {
      workspace_id: cleanWorkspaceId,
      actor_id: cleanActorId,
      route_id: routeId,
      ticket_id: ticketId,
      idempotency_key: `${cleanWorkspaceId}:${cleanActorId}:${routeId}:${generatedAt}`,
      generated_at: generatedAt,
      updated_at: generatedAt,
      portfolio_id: cleanPortfolioId,
      batch_id: cleanBatchId,
      batch_number: route.batchNumber,
      sequence_in_batch: route.sequenceInBatch,
      route_sequence: route.routeSequence,
      symbol: route.symbol,
      direction: route.direction,
      venue: route.venue,
      route_state: route.routeState,
      route_status: route.routeStatus,
      route_notional: route.routeNotional,
      ticket_amount: route.ticketAmount,
      cash_impact: route.cashImpact,
      batch_gross_amount: route.batchGrossAmount,
      batch_cash_impact: route.batchCashImpact,
      estimated_slippage_bps: route.estimatedSlippageBps,
      estimated_commission_bps: route.estimatedCommissionBps,
      estimated_route_cost: route.estimatedRouteCost,
      approval_decision: approvalDecision,
      route_note: route.routeNote,
    };
  });

  return {
    table: "execution_routes",
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    portfolio_id: cleanPortfolioId,
    batch_id: cleanBatchId,
    generated_at: generatedAt,
    record_count: records.length,
    records,
  };
}

function routeEventStatus({
  routeStatus,
  approvalDecision,
  brokerMode,
  eventType,
}: {
  routeStatus: ExecutionReviewStatus;
  approvalDecision: ExecutionReviewStatus;
  brokerMode: BrokerBoundaryMode;
  eventType: ExecutionRouteEventType;
}): ExecutionReviewStatus {
  if (routeStatus === "block" || approvalDecision === "block") return "block";
  if ((eventType === "broker_boundary_checked" || eventType === "paper_acknowledged") && brokerMode === "disabled") {
    return "block";
  }
  if (routeStatus === "watch" || approvalDecision === "watch" || brokerMode === "manual_review") return "watch";
  return "pass";
}

function routeEventNextAction(status: ExecutionReviewStatus, eventType: ExecutionRouteEventType, brokerMode: BrokerBoundaryMode) {
  if (status === "block") {
    return (eventType === "broker_boundary_checked" || eventType === "paper_acknowledged") && brokerMode === "disabled"
      ? "先維持 broker adapter 關閉，不得送出真實委託"
      : "先處理阻擋項目，再重新產生路由事件";
  }
  if (status === "watch") return "需人工覆核後才能進入下一步";
  if (eventType === "paper_acknowledged") return "可保留 paper ack 作為稽核軌跡";
  return "可進入下一個事件";
}

export function buildExecutionRouteEventRows({
  routes,
  generatedAt,
  actor,
  brokerMode,
  approvalDecision,
}: {
  routes: ExecutionRouteRow[];
  generatedAt: string;
  actor: string;
  brokerMode: BrokerBoundaryMode;
  approvalDecision: ExecutionReviewStatus;
}): ExecutionRouteEventRow[] {
  const cleanActor = actor.trim() || "Execution operator";
  const eventTypes: ExecutionRouteEventType[] = [
    "route_created",
    "approval_gate_checked",
    "venue_assigned",
    "broker_boundary_checked",
    "paper_acknowledged",
  ];

  return routes.flatMap((route) => {
    const ticketId = `${route.symbol}:${route.direction}`;
    return eventTypes.map((eventType, eventIndex) => {
      const eventStatus = routeEventStatus({
        routeStatus: route.routeStatus,
        approvalDecision,
        brokerMode,
        eventType,
      });
      const evidence =
        eventType === "route_created"
          ? `${route.routeState} / ${route.routeNotional.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`
          : eventType === "approval_gate_checked"
            ? `approval gate: ${executionReviewLabel(approvalDecision)}`
            : eventType === "venue_assigned"
              ? `${route.venue} / cost ${route.estimatedRouteCost.toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`
              : eventType === "broker_boundary_checked"
                ? `${brokerBoundaryModeLabel(brokerMode)} / no live broker order`
                : route.routeState === "routed"
                  ? "paper ack only, no live broker submission"
                  : "paper ack waiting for manual review";

      return {
        eventId: `${route.routeId}-EV-${eventIndex + 1}`,
        routeId: route.routeId,
        ticketId,
        routeSequence: route.routeSequence,
        eventSequence: eventIndex + 1,
        symbol: route.symbol,
        direction: route.direction,
        venue: route.venue,
        routeState: route.routeState,
        routeStatus: route.routeStatus,
        eventType,
        eventStatus,
        brokerMode,
        eventTime: generatedAt,
        actor: cleanActor,
        source: "wealth-dashboard-route-boundary",
        evidence,
        nextAction: routeEventNextAction(eventStatus, eventType, brokerMode),
      };
    });
  });
}

export function executionRouteEventCsv(rows: ExecutionRouteEventRow[]) {
  const header = [
    "event_id",
    "route_id",
    "ticket_id",
    "route_sequence",
    "event_sequence",
    "symbol",
    "direction",
    "venue",
    "route_state",
    "route_status",
    "event_type",
    "event_status",
    "broker_mode",
    "event_time",
    "actor",
    "source",
    "evidence",
    "next_action",
  ];
  const csvRows = rows.map((row) => [
    row.eventId,
    row.routeId,
    row.ticketId,
    row.routeSequence,
    row.eventSequence,
    row.symbol,
    row.direction,
    row.venue,
    executionRouteStateLabel(row.routeState),
    executionReviewLabel(row.routeStatus),
    executionRouteEventTypeLabel(row.eventType),
    executionReviewLabel(row.eventStatus),
    brokerBoundaryModeLabel(row.brokerMode),
    row.eventTime,
    row.actor,
    row.source,
    row.evidence,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildExecutionRouteEventSyncPayload({
  events,
  generatedAt,
  workspaceId,
  actorId,
  portfolioId,
  batchId,
}: {
  events: ExecutionRouteEventRow[];
  generatedAt: string;
  workspaceId?: string;
  actorId?: string;
  portfolioId?: string;
  batchId?: string;
}): ExecutionRouteEventWarehouseSyncPayload {
  const cleanWorkspaceId = normalizeWarehouseKey(workspaceId, "default");
  const cleanActorId = normalizeWarehouseKey(actorId, "system");
  const cleanPortfolioId = normalizeWarehouseKey(portfolioId, "default-portfolio");
  const cleanBatchId = normalizeWarehouseKey(batchId, generatedAt);
  const records = events.map((event) => {
    const routeId = `${cleanPortfolioId}:${cleanBatchId}:${event.routeId}`;
    const ticketId = `${cleanPortfolioId}:${cleanBatchId}:${event.ticketId}`;
    const eventId = `${routeId}:${event.eventSequence}:${event.eventType}`;
    return {
      workspace_id: cleanWorkspaceId,
      actor_id: cleanActorId,
      event_id: eventId,
      route_id: routeId,
      ticket_id: ticketId,
      idempotency_key: `${cleanWorkspaceId}:${cleanActorId}:${eventId}:${generatedAt}`,
      generated_at: generatedAt,
      updated_at: generatedAt,
      event_time: event.eventTime,
      portfolio_id: cleanPortfolioId,
      batch_id: cleanBatchId,
      route_sequence: event.routeSequence,
      event_sequence: event.eventSequence,
      symbol: event.symbol,
      direction: event.direction,
      venue: event.venue,
      route_state: event.routeState,
      route_status: event.routeStatus,
      event_type: event.eventType,
      event_status: event.eventStatus,
      broker_mode: event.brokerMode,
      source: event.source,
      evidence: event.evidence,
      next_action: event.nextAction,
    };
  });

  return {
    table: "execution_route_events",
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    portfolio_id: cleanPortfolioId,
    batch_id: cleanBatchId,
    generated_at: generatedAt,
    record_count: records.length,
    records,
  };
}

export function buildExecutionFillRows({
  tradeTickets,
  fillCompletionPercent,
  fillSlippageBps,
  fillCommissionBps,
}: {
  tradeTickets: TradeTicketRow[];
  fillCompletionPercent: number;
  fillSlippageBps: number;
  fillCommissionBps: number;
}): ExecutionFillRow[] {
  const completionRate = Math.min(1, Math.max(0, fillCompletionPercent / 100));
  const cleanSlippageBps = Math.max(0, fillSlippageBps);
  const cleanCommissionBps = Math.max(0, fillCommissionBps);
  const allInCostBps = cleanSlippageBps + cleanCommissionBps;

  return tradeTickets.map((row) => {
    const filledNotional = row.ticketAmount * completionRate;
    const unfilledNotional = Math.max(0, row.ticketAmount - filledNotional);
    const slippageCost = filledNotional * (cleanSlippageBps / 10_000);
    const commissionCost = filledNotional * (cleanCommissionBps / 10_000);
    const totalCost = slippageCost + commissionCost;
    const cashImpactAfterCost = row.direction === "buy" ? -(filledNotional + totalCost) : filledNotional - totalCost;
    const fillStatus: ExecutionReviewStatus =
      completionRate < 0.8 ? "block" : completionRate < 1 || allInCostBps > 20 ? "watch" : "pass";
    const fillNote =
      fillStatus === "block"
        ? "成交率偏低，需要重新排程或取消殘單"
        : fillStatus === "watch"
          ? "存在未成交或成本偏高，需要執行後覆核"
          : "成交率與成本在目前門檻內";

    return {
      ...row,
      filledNotional,
      unfilledNotional,
      fillCompletionRate: completionRate,
      slippageBps: cleanSlippageBps,
      commissionBps: cleanCommissionBps,
      slippageCost,
      commissionCost,
      totalCost,
      cashImpactAfterCost,
      fillStatus,
      fillNote,
    };
  });
}

export function executionFillCsv(rows: ExecutionFillRow[]) {
  const header = [
    "symbol",
    "direction",
    "target_notional",
    "filled_notional",
    "unfilled_notional",
    "fill_completion_rate",
    "slippage_bps",
    "commission_bps",
    "slippage_cost",
    "commission_cost",
    "total_cost",
    "cash_impact_after_cost",
    "status",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.direction,
    row.ticketAmount,
    row.filledNotional,
    row.unfilledNotional,
    row.fillCompletionRate,
    row.slippageBps,
    row.commissionBps,
    row.slippageCost,
    row.commissionCost,
    row.totalCost,
    row.cashImpactAfterCost,
    executionReviewLabel(row.fillStatus),
    row.fillNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
