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
