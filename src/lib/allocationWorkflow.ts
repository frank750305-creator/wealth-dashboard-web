import type { AssetComparisonRow } from "@/lib/assetResearchWorkflow";

export type AllocationMode = "score" | "risk" | "equal";

export type AllocationDraftRow = AssetComparisonRow & {
  allocationWeight: number;
  allocationAmount: number;
  allocationBasis: number;
  allocationCapApplied: boolean;
  allocationNote: string;
};

export type AllocationRiskRow = AllocationDraftRow & {
  weightedVolatility: number;
  riskContribution: number;
};

export type AllocationRiskSnapshot = {
  investedAmount: number;
  expectedAnnualReturn: number | null;
  estimatedAnnualVolatility: number | null;
  weightedMaxDrawdown: number | null;
  worstMaxDrawdown: number | null;
  stressLoss: number;
  stressedValue: number;
  riskRows: AllocationRiskRow[];
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function allocationModeLabel(mode: AllocationMode) {
  if (mode === "score") return "分數加權";
  if (mode === "risk") return "風險調整";
  return "等權重";
}

export function allocationBasisForRow(row: AssetComparisonRow, mode: AllocationMode) {
  if (row.signal === "risk" || row.qualityStatus === "risk" || row.score < 40) return 0;
  if (mode === "equal") return 1;
  if (mode === "score") return Math.max(0, row.score - 35);

  const volatility = typeof row.annualizedVolatility === "number" && row.annualizedVolatility > 0 ? row.annualizedVolatility : 0.25;
  const drawdownPenalty = typeof row.maxDrawdown === "number" ? 1 + Math.abs(row.maxDrawdown) : 1.2;
  return Math.max(0, row.score - 35) / volatility / drawdownPenalty;
}

export function allocationNoteForRow(row: AssetComparisonRow, mode: AllocationMode, capApplied: boolean) {
  if (row.signal === "risk" || row.qualityStatus === "risk") return "排除：資料品質或風險訊號偏弱";
  if (row.score < 40) return "排除：分數低於配置門檻";
  if (capApplied) return "納入：達單檔上限，超額權重已重新分配";
  if (mode === "risk") return "納入：分數經波動與回撤調整";
  if (mode === "score") return "納入：依 Watchlist 分數配置";
  return "納入：符合門檻後等權配置";
}

export function cappedAllocationWeights(basisValues: number[], maximumWeight: number) {
  const activeIndexes = basisValues
    .map((basis, index) => ({ basis, index }))
    .filter((item) => item.basis > 0)
    .map((item) => item.index);
  const weights = basisValues.map(() => 0);
  if (!activeIndexes.length) return weights;

  const effectiveCap = Math.max(Math.min(Math.max(maximumWeight, 0.01), 1), 1 / activeIndexes.length);
  let remainingIndexes = [...activeIndexes];
  let remainingWeight = 1;

  while (remainingIndexes.length && remainingWeight > 0.000001) {
    const totalBasis = remainingIndexes.reduce((sum, index) => sum + basisValues[index], 0);
    if (totalBasis <= 0) {
      const equalWeight = remainingWeight / remainingIndexes.length;
      remainingIndexes.forEach((index) => {
        weights[index] = Math.min(effectiveCap, equalWeight);
      });
      break;
    }

    const cappedIndexes = remainingIndexes.filter((index) => {
      const proposedWeight = (remainingWeight * basisValues[index]) / totalBasis;
      return proposedWeight >= effectiveCap;
    });

    if (!cappedIndexes.length) {
      remainingIndexes.forEach((index) => {
        weights[index] = (remainingWeight * basisValues[index]) / totalBasis;
      });
      break;
    }

    cappedIndexes.forEach((index) => {
      weights[index] = effectiveCap;
      remainingWeight -= effectiveCap;
    });
    remainingIndexes = remainingIndexes.filter((index) => !cappedIndexes.includes(index));
  }

  return weights;
}

export function allocationDraftRows(rows: AssetComparisonRow[], mode: AllocationMode, capital: number, maximumWeight: number): AllocationDraftRow[] {
  const positiveRows = rows.map((row) => ({ row, basis: allocationBasisForRow(row, mode) }));
  const allocationWeights = cappedAllocationWeights(
    positiveRows.map((item) => item.basis),
    maximumWeight,
  );
  const effectiveCap = Math.max(
    Math.min(Math.max(maximumWeight, 0.01), 1),
    positiveRows.filter((item) => item.basis > 0).length ? 1 / positiveRows.filter((item) => item.basis > 0).length : 0,
  );

  return positiveRows
    .map(({ row, basis }, index) => {
      const allocationWeight = allocationWeights[index] ?? 0;
      const allocationCapApplied = allocationWeight > 0 && allocationWeight >= effectiveCap - 0.000001;
      return {
        ...row,
        allocationWeight,
        allocationAmount: allocationWeight * Math.max(0, capital),
        allocationBasis: basis,
        allocationCapApplied,
        allocationNote: allocationNoteForRow(row, mode, allocationCapApplied),
      };
    })
    .sort((left, right) => right.allocationWeight - left.allocationWeight || right.score - left.score);
}

export function allocationDraftCsv(rows: AllocationDraftRow[], mode: AllocationMode, capital: number, priceBasis: "adjusted" | "raw", maximumWeight: number) {
  const header = [
    "symbol",
    "price_basis",
    "allocation_mode",
    "model_capital",
    "maximum_weight",
    "allocation_weight",
    "allocation_amount",
    "allocation_cap_applied",
    "score",
    "signal",
    "quality_status",
    "annualized_return",
    "annualized_volatility",
    "max_drawdown",
    "risk_adjusted_return",
    "latest_date",
    "allocation_note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    priceBasis,
    mode,
    capital,
    maximumWeight,
    row.allocationWeight,
    row.allocationAmount,
    row.allocationCapApplied,
    row.score,
    row.signal,
    row.qualityStatus,
    row.annualizedReturn ?? "",
    row.annualizedVolatility ?? "",
    row.maxDrawdown ?? "",
    row.riskAdjustedReturn ?? "",
    row.latestDate ?? "",
    row.allocationNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function allocationRiskRows(rows: AllocationDraftRow[]) {
  const riskRows = rows.map((row) => ({
    ...row,
    weightedVolatility: row.allocationWeight * (row.annualizedVolatility ?? 0),
    riskContribution: 0,
  }));
  const totalWeightedVolatility = riskRows.reduce((sum, row) => sum + row.weightedVolatility, 0);

  return riskRows
    .map((row) => ({
      ...row,
      riskContribution: totalWeightedVolatility > 0 ? row.weightedVolatility / totalWeightedVolatility : 0,
    }))
    .sort((left, right) => right.riskContribution - left.riskContribution || right.allocationWeight - left.allocationWeight);
}

export function weightedAllocationMetric(rows: AllocationDraftRow[], selector: (row: AllocationDraftRow) => number | null) {
  const validRows = rows.filter((row) => typeof selector(row) === "number" && Number.isFinite(selector(row) as number));
  if (!validRows.length) return null;
  return validRows.reduce((sum, row) => sum + row.allocationWeight * (selector(row) as number), 0);
}

export function allocationRiskSnapshot(rows: AllocationDraftRow[], stressShockPercent: number): AllocationRiskSnapshot {
  const investedAmount = rows.reduce((sum, row) => sum + row.allocationAmount, 0);
  const stressRate = stressShockPercent / 100;
  const maxDrawdownValues = rows
    .map((row) => row.maxDrawdown)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    investedAmount,
    expectedAnnualReturn: weightedAllocationMetric(rows, (row) => row.annualizedReturn),
    estimatedAnnualVolatility: weightedAllocationMetric(rows, (row) => row.annualizedVolatility),
    weightedMaxDrawdown: weightedAllocationMetric(rows, (row) => row.maxDrawdown),
    worstMaxDrawdown: maxDrawdownValues.length ? Math.min(...maxDrawdownValues) : null,
    stressLoss: investedAmount * stressRate,
    stressedValue: investedAmount * (1 + stressRate),
    riskRows: allocationRiskRows(rows),
  };
}

export function allocationRiskCsv(snapshot: AllocationRiskSnapshot, stressShockPercent: number) {
  const summaryRows = [
    ["summary", "invested_amount", snapshot.investedAmount, "", "", "", "", "", "", "", "", ""],
    ["summary", "expected_annual_return", snapshot.expectedAnnualReturn ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "estimated_annual_volatility", snapshot.estimatedAnnualVolatility ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "weighted_max_drawdown", snapshot.weightedMaxDrawdown ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "worst_asset_drawdown", snapshot.worstMaxDrawdown ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "stress_shock_percent", stressShockPercent, "", "", "", "", "", "", "", "", ""],
    ["summary", "stress_loss", snapshot.stressLoss, "", "", "", "", "", "", "", "", ""],
    ["summary", "stressed_value", snapshot.stressedValue, "", "", "", "", "", "", "", "", ""],
  ];
  const riskRows = snapshot.riskRows.map((row) => [
    "risk_budget",
    "asset",
    "",
    row.symbol,
    row.allocationWeight,
    row.allocationAmount,
    row.annualizedVolatility ?? "",
    row.weightedVolatility,
    row.riskContribution,
    row.maxDrawdown ?? "",
    row.score,
    row.signal,
  ]);

  return [
    ["section", "name", "value", "symbol", "allocation_weight", "allocation_amount", "annualized_volatility", "weighted_volatility", "risk_contribution", "max_drawdown", "score", "signal"],
    ...summaryRows,
    ...riskRows,
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}
