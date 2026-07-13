import type { AllocationDraftRow } from "@/lib/allocationWorkflow";
import type {
  RebalanceDirection,
  RebalanceDraftRow,
} from "@/lib/tradeExecutionWorkflow";

export type { RebalanceDirection, RebalanceDraftRow } from "@/lib/tradeExecutionWorkflow";

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function parseCurrentHoldings(value: string) {
  const holdings = new Map<string, number>();

  value.split(/\n+/).forEach((line) => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    const match = cleanLine.match(/^([^\s,，]+)[\s,，]+(.+)$/);
    if (!match) return;

    const symbol = match[1].trim().toUpperCase();
    const amount = Number(match[2].replace(/[,\s，]/g, ""));
    if (!symbol || !Number.isFinite(amount)) return;

    holdings.set(symbol, (holdings.get(symbol) ?? 0) + amount);
  });

  return holdings;
}

export function rebalanceDirectionLabel(direction: RebalanceDirection) {
  if (direction === "buy") return "買入";
  if (direction === "sell") return "賣出";
  return "不動";
}

export function rebalanceDirectionClass(direction: RebalanceDirection) {
  if (direction === "buy") return "bg-emerald-500/15 text-emerald-200";
  if (direction === "sell") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

export function rebalanceDraftRows(
  allocationRows: AllocationDraftRow[],
  currentHoldingsText: string,
  driftThreshold: number,
): RebalanceDraftRow[] {
  const currentHoldings = parseCurrentHoldings(currentHoldingsText);
  if (!currentHoldings.size) return [];

  const allocationBySymbol = new Map(allocationRows.map((row) => [row.symbol.toUpperCase(), row]));
  const symbols = Array.from(new Set([...allocationRows.map((row) => row.symbol.toUpperCase()), ...currentHoldings.keys()]));
  const currentTotal = Array.from(currentHoldings.values()).reduce((sum, amount) => sum + amount, 0);

  return symbols
    .map((symbol) => {
      const allocation = allocationBySymbol.get(symbol);
      const currentAmount = currentHoldings.get(symbol) ?? 0;
      const targetAmount = allocation?.allocationAmount ?? 0;
      const currentWeight = currentTotal > 0 ? currentAmount / currentTotal : 0;
      const targetWeight = allocation?.allocationWeight ?? 0;
      const tradeAmount = targetAmount - currentAmount;
      const tradeWeight = targetWeight - currentWeight;
      const direction: RebalanceDirection =
        Math.abs(tradeWeight) < driftThreshold ? "hold" : tradeAmount > 0 ? "buy" : "sell";

      return {
        symbol,
        currentAmount,
        currentWeight,
        targetAmount,
        targetWeight,
        tradeAmount,
        tradeWeight,
        direction,
        score: allocation?.score ?? null,
        signal: allocation?.signal ?? null,
        note:
          allocation && allocation.allocationWeight > 0
            ? "依模型目標權重再平衡"
            : "不在模型配置內，目標權重為 0",
      };
    })
    .sort((left, right) => Math.abs(right.tradeAmount) - Math.abs(left.tradeAmount));
}

export function rebalanceDraftCsv(rows: RebalanceDraftRow[], driftThreshold: number) {
  const header = [
    "symbol",
    "current_amount",
    "current_weight",
    "target_amount",
    "target_weight",
    "trade_amount",
    "trade_weight",
    "direction",
    "drift_threshold",
    "score",
    "signal",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.currentAmount,
    row.currentWeight,
    row.targetAmount,
    row.targetWeight,
    row.tradeAmount,
    row.tradeWeight,
    row.direction,
    driftThreshold,
    row.score ?? "",
    row.signal ?? "",
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
