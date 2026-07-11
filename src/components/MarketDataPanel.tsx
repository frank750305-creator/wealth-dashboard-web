import { useEffect, useState } from "react";
import { useMarketSources } from "@/hooks/useMarketSources";
import { fetchBigQueryAssetProfile, fetchBigQueryAssets } from "@/lib/marketApi";
import type { BigQueryAsset, BigQueryAssetProfileResponse, MarketSourceStatus } from "@/types/market";
import { BigQueryPortfolioPanel } from "./BigQueryPortfolioPanel";

type QualityStatus = "strong" | "watch" | "risk" | "neutral";
type AssetDecisionSignal = "candidate" | "watch" | "risk" | "neutral";
type AssetComparisonSortKey =
  | "score"
  | "annualizedReturn"
  | "annualizedVolatility"
  | "maxDrawdown"
  | "riskAdjustedReturn"
  | "freshnessDays";
type AllocationMode = "score" | "risk" | "equal";

type SavedWatchlistPreset = {
  id: string;
  name: string;
  symbols: string;
  priceBasis: "adjusted" | "raw";
  sortKey: AssetComparisonSortKey;
  signalFilter: AssetDecisionSignal | "all";
  minimumScore: number;
  updatedAt: string;
};

type AssetComparisonRow = {
  symbol: string;
  latestDate: string | null;
  rowCount: number;
  latestPrice: number | null;
  totalReturn: number | null;
  annualizedReturn: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  freshnessDays: number | null;
  qualityStatus: QualityStatus;
  riskAdjustedReturn: number | null;
  score: number;
  signal: AssetDecisionSignal;
  signalNote: string;
};

type AllocationDraftRow = AssetComparisonRow & {
  allocationWeight: number;
  allocationAmount: number;
  allocationBasis: number;
  allocationCapApplied: boolean;
  allocationNote: string;
};

type AllocationRiskRow = AllocationDraftRow & {
  weightedVolatility: number;
  riskContribution: number;
};

type AllocationRiskSnapshot = {
  investedAmount: number;
  expectedAnnualReturn: number | null;
  estimatedAnnualVolatility: number | null;
  weightedMaxDrawdown: number | null;
  worstMaxDrawdown: number | null;
  stressLoss: number;
  stressedValue: number;
  riskRows: AllocationRiskRow[];
};

type RebalanceDirection = "buy" | "sell" | "hold";

type RebalanceDraftRow = {
  symbol: string;
  currentAmount: number;
  currentWeight: number;
  targetAmount: number;
  targetWeight: number;
  tradeAmount: number;
  tradeWeight: number;
  direction: RebalanceDirection;
  score: number | null;
  signal: AssetDecisionSignal | null;
  note: string;
};

type TradeTicketRow = RebalanceDraftRow & {
  ticketAmount: number;
  cashImpact: number;
  ticketNote: string;
};

const statusMeta: Record<MarketSourceStatus, { label: string; className: string }> = {
  ready: {
    label: "可接 API",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  },
  needs_secret: {
    label: "需環境變數",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  },
  batch_only: {
    label: "批次管線",
    className: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  },
  local_only: {
    label: "本機資料",
    className: "bg-slate-500/10 text-slate-300 border-slate-500/40",
  },
};

const bigQueryEnvironmentVars = [
  { key: "BIGQUERY_PROJECT_ID", value: "fund-war-room", kind: "plain" },
  { key: "BIGQUERY_DATASET", value: "fund_database", kind: "plain" },
  { key: "BIGQUERY_PRICE_TABLE", value: "daily_prices", kind: "plain" },
  { key: "BIGQUERY_FX_TABLE", value: "daily_fx", kind: "plain" },
  { key: "GCP_SERVICE_ACCOUNT_JSON", value: "Service account JSON", kind: "secret" },
];
const watchlistPresetStorageKey = "wealth-dashboard.bigqueryWatchlistPresets";

function formatCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW") : "--";
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW", { maximumFractionDigits: 4 }) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function daysSinceDate(value?: string | null) {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function freshnessStatus(days: number | null): QualityStatus {
  if (days === null) return "neutral";
  if (days <= 3) return "strong";
  if (days <= 10) return "watch";
  return "risk";
}

function coverageStatus(count: number | undefined, strongThreshold: number, watchThreshold: number): QualityStatus {
  if (typeof count !== "number" || !Number.isFinite(count)) return "neutral";
  if (count >= strongThreshold) return "strong";
  if (count >= watchThreshold) return "watch";
  return "risk";
}

function qualityLabel(status: QualityStatus) {
  if (status === "strong") return "正常";
  if (status === "watch") return "觀察";
  if (status === "risk") return "異常";
  return "未知";
}

function qualityClass(status: QualityStatus) {
  if (status === "strong") return "border-emerald-500/20 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/25 bg-amber-950/10";
  if (status === "risk") return "border-rose-500/25 bg-rose-950/10";
  return "border-slate-800 bg-slate-900/60";
}

function qualityBadgeClass(status: QualityStatus) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function decisionSignalLabel(signal: AssetDecisionSignal) {
  if (signal === "candidate") return "候選";
  if (signal === "watch") return "觀察";
  if (signal === "risk") return "風險";
  return "中性";
}

function decisionSignalClass(signal: AssetDecisionSignal) {
  if (signal === "candidate") return "bg-emerald-500/15 text-emerald-200";
  if (signal === "watch") return "bg-amber-500/15 text-amber-200";
  if (signal === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value).replaceAll("|", "/").replaceAll("\n", " ");
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resultStamp() {
  return new Date().toISOString().slice(0, 19).replaceAll(":", "").replace("T", "-");
}

function loadWatchlistPresetsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(watchlistPresetStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavedWatchlistPreset => {
      if (!item || typeof item !== "object") return false;
      const preset = item as Partial<SavedWatchlistPreset>;
      return (
        typeof preset.id === "string" &&
        typeof preset.name === "string" &&
        typeof preset.symbols === "string" &&
        typeof preset.updatedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeWatchlistPresetsToStorage(presets: SavedWatchlistPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(watchlistPresetStorageKey, JSON.stringify(presets));
}

function assetProfileCsv(profile: BigQueryAssetProfileResponse) {
  const rows = [
    ["section", "date", "name", "value"],
    ["summary", "", "symbol", profile.symbol],
    ["summary", "", "price_basis", profile.priceBasis],
    ["summary", "", "first_date", profile.summary.first_date ?? ""],
    ["summary", "", "latest_date", profile.summary.latest_date ?? ""],
    ["summary", "", "row_count", profile.summary.row_count],
    ["summary", "", "selected_price_rows", profile.summary.selected_price_rows],
    ["summary", "", "missing_selected_price_rows", profile.summary.missing_selected_price_rows],
    ["summary", "", "adjusted_price_rows", profile.summary.adjusted_price_rows],
    ["summary", "", "raw_price_rows", profile.summary.raw_price_rows],
    ...Object.entries(profile.metrics).map(([key, value]) => ["metric", "", key, value ?? ""]),
    ...profile.recentPrices.map((point) => [
      "recent_price",
      point.date ?? "",
      "selected_price",
      point.selected_price ?? "",
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function parseSymbolList(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\s,，、]+/)
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .filter((symbol) => {
      const key = symbol.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function comparisonRowFromProfile(profile: BigQueryAssetProfileResponse): AssetComparisonRow {
  const freshnessDays = daysSinceDate(profile.summary.latest_date);
  const missingRows = profile.summary.missing_selected_price_rows;
  const freshness = freshnessStatus(freshnessDays);
  const qualityStatus: QualityStatus =
    freshness === "risk" || missingRows > 5
      ? "risk"
      : freshness === "watch" || missingRows > 0
        ? "watch"
        : "strong";
  const annualizedReturn = profile.metrics.annualizedReturn;
  const annualizedVolatility = profile.metrics.annualizedVolatility;
  const maxDrawdown = profile.metrics.maxDrawdown;
  const returnScore = typeof annualizedReturn === "number" ? clamp(annualizedReturn * 120, -30, 35) : 0;
  const volatilityPenalty =
    typeof annualizedVolatility === "number" ? clamp(annualizedVolatility * 60, 0, 25) : 10;
  const drawdownPenalty = typeof maxDrawdown === "number" ? clamp(Math.abs(maxDrawdown) * 70, 0, 30) : 10;
  const freshnessPenalty = freshnessDays === null ? 8 : freshnessDays > 10 ? 18 : freshnessDays > 3 ? 8 : 0;
  const missingPenalty = missingRows > 5 ? 12 : missingRows > 0 ? 5 : 0;
  const score = Math.round(clamp(50 + returnScore - volatilityPenalty - drawdownPenalty - freshnessPenalty - missingPenalty, 0, 100));
  const riskAdjustedReturn =
    typeof annualizedReturn === "number" &&
    typeof annualizedVolatility === "number" &&
    annualizedVolatility > 0
      ? annualizedReturn / annualizedVolatility
      : null;
  const signal: AssetDecisionSignal =
    qualityStatus === "risk" || score < 40
      ? "risk"
      : score >= 70 && qualityStatus === "strong"
        ? "candidate"
        : score >= 55
          ? "watch"
          : "neutral";
  const signalNote =
    signal === "candidate"
      ? "報酬、風險與資料品質相對較佳"
      : signal === "watch"
        ? "具備可比性，但仍需檢查波動或資料品質"
        : signal === "risk"
          ? "資料品質或風險報酬條件偏弱"
          : "暫無明確優勢";

  return {
    symbol: profile.symbol,
    latestDate: profile.summary.latest_date,
    rowCount: profile.summary.row_count,
    latestPrice: profile.metrics.latestPrice,
    totalReturn: profile.metrics.totalReturn,
    annualizedReturn: profile.metrics.annualizedReturn,
    annualizedVolatility: profile.metrics.annualizedVolatility,
    maxDrawdown: profile.metrics.maxDrawdown,
    freshnessDays,
    qualityStatus,
    riskAdjustedReturn,
    score,
    signal,
    signalNote,
  };
}

function assetComparisonCsv(rows: AssetComparisonRow[], priceBasis: "adjusted" | "raw") {
  const header = [
    "symbol",
    "price_basis",
    "latest_date",
    "row_count",
    "latest_price",
    "total_return",
    "annualized_return",
    "annualized_volatility",
    "max_drawdown",
    "freshness_days",
    "quality_status",
    "risk_adjusted_return",
    "score",
    "signal",
    "signal_note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    priceBasis,
    row.latestDate ?? "",
    row.rowCount,
    row.latestPrice ?? "",
    row.totalReturn ?? "",
    row.annualizedReturn ?? "",
    row.annualizedVolatility ?? "",
    row.maxDrawdown ?? "",
    row.freshnessDays ?? "",
    row.qualityStatus,
    row.riskAdjustedReturn ?? "",
    row.score,
    row.signal,
    row.signalNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function allocationModeLabel(mode: AllocationMode) {
  if (mode === "score") return "分數加權";
  if (mode === "risk") return "風險調整";
  return "等權重";
}

function allocationBasisForRow(row: AssetComparisonRow, mode: AllocationMode) {
  if (row.signal === "risk" || row.qualityStatus === "risk" || row.score < 40) return 0;
  if (mode === "equal") return 1;
  if (mode === "score") return Math.max(0, row.score - 35);

  const volatility = typeof row.annualizedVolatility === "number" && row.annualizedVolatility > 0 ? row.annualizedVolatility : 0.25;
  const drawdownPenalty = typeof row.maxDrawdown === "number" ? 1 + Math.abs(row.maxDrawdown) : 1.2;
  return Math.max(0, row.score - 35) / volatility / drawdownPenalty;
}

function allocationNoteForRow(row: AssetComparisonRow, mode: AllocationMode, capApplied: boolean) {
  if (row.signal === "risk" || row.qualityStatus === "risk") return "排除：資料品質或風險訊號偏弱";
  if (row.score < 40) return "排除：分數低於配置門檻";
  if (capApplied) return "納入：達單檔上限，超額權重已重新分配";
  if (mode === "risk") return "納入：分數經波動與回撤調整";
  if (mode === "score") return "納入：依 Watchlist 分數配置";
  return "納入：符合門檻後等權配置";
}

function cappedAllocationWeights(basisValues: number[], maximumWeight: number) {
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

function allocationDraftRows(rows: AssetComparisonRow[], mode: AllocationMode, capital: number, maximumWeight: number): AllocationDraftRow[] {
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

function allocationDraftCsv(rows: AllocationDraftRow[], mode: AllocationMode, capital: number, priceBasis: "adjusted" | "raw", maximumWeight: number) {
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

function allocationRiskRows(rows: AllocationDraftRow[]) {
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

function weightedAllocationMetric(rows: AllocationDraftRow[], selector: (row: AllocationDraftRow) => number | null) {
  const validRows = rows.filter((row) => typeof selector(row) === "number" && Number.isFinite(selector(row) as number));
  if (!validRows.length) return null;
  return validRows.reduce((sum, row) => sum + row.allocationWeight * (selector(row) as number), 0);
}

function allocationRiskSnapshot(rows: AllocationDraftRow[], stressShockPercent: number): AllocationRiskSnapshot {
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

function allocationRiskCsv(snapshot: AllocationRiskSnapshot, stressShockPercent: number) {
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

function parseCurrentHoldings(value: string) {
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

function rebalanceDirectionLabel(direction: RebalanceDirection) {
  if (direction === "buy") return "買入";
  if (direction === "sell") return "賣出";
  return "不動";
}

function rebalanceDirectionClass(direction: RebalanceDirection) {
  if (direction === "buy") return "bg-emerald-500/15 text-emerald-200";
  if (direction === "sell") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function rebalanceDraftRows(
  allocationRows: AllocationDraftRow[],
  currentHoldingsText: string,
  driftThreshold: number,
): RebalanceDraftRow[] {
  const currentHoldings = parseCurrentHoldings(currentHoldingsText);
  if (!currentHoldings.size) return [];

  const allocationBySymbol = new Map(allocationRows.map((row) => [row.symbol.toUpperCase(), row]));
  const symbols = Array.from(new Set([...allocationRows.map((row) => row.symbol.toUpperCase()), ...currentHoldings.keys()]));
  const currentTotal = Array.from(currentHoldings.values()).reduce((sum, amount) => sum + amount, 0);
  const targetTotal = allocationRows.reduce((sum, row) => sum + row.allocationAmount, 0);

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

function rebalanceDraftCsv(rows: RebalanceDraftRow[], driftThreshold: number) {
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

function tradeTicketRows(rows: RebalanceDraftRow[], minimumTradeAmount: number): TradeTicketRow[] {
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

function tradeTicketCsv(rows: TradeTicketRow[], minimumTradeAmount: number) {
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

function averageComparisonMetric(rows: AssetComparisonRow[], selector: (row: AssetComparisonRow) => number | null) {
  const values = rows.map(selector).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function comparisonSortLabel(sortKey: AssetComparisonSortKey) {
  if (sortKey === "score") return "分數高到低";
  if (sortKey === "annualizedReturn") return "年化報酬高到低";
  if (sortKey === "riskAdjustedReturn") return "風險調整報酬高到低";
  if (sortKey === "annualizedVolatility") return "波動低到高";
  if (sortKey === "maxDrawdown") return "回撤低到高";
  return "資料新鮮優先";
}

function comparisonSignalFilterLabel(signal: AssetDecisionSignal | "all") {
  return signal === "all" ? "全部" : decisionSignalLabel(signal);
}

function assetComparisonMemo(
  rows: AssetComparisonRow[],
  options: {
    name: string;
    symbols: string;
    priceBasis: "adjusted" | "raw";
    sortKey: AssetComparisonSortKey;
    signalFilter: AssetDecisionSignal | "all";
    minimumScore: number;
    totalRows: number;
    allocationRows?: AllocationDraftRow[];
    allocationMode?: AllocationMode;
    allocationCapital?: number;
    maximumAllocationWeight?: number;
    allocationRisk?: AllocationRiskSnapshot;
    stressShockPercent?: number;
    rebalanceRows?: RebalanceDraftRow[];
    rebalanceThreshold?: number;
    tradeTickets?: TradeTicketRow[];
    minimumTradeAmount?: number;
  },
) {
  const candidateRows = rows.filter((row) => row.signal === "candidate");
  const watchRows = rows.filter((row) => row.signal === "watch");
  const riskRows = rows.filter((row) => row.signal === "risk" || row.qualityStatus === "risk");
  const qualityRows = rows.filter((row) => row.qualityStatus !== "strong");
  const avgReturn = averageComparisonMetric(rows, (row) => row.annualizedReturn);
  const avgVolatility = averageComparisonMetric(rows, (row) => row.annualizedVolatility);
  const avgDrawdown = averageComparisonMetric(rows, (row) => row.maxDrawdown);
  const symbolText = parseSymbolList(options.symbols).join(", ") || "--";
  const topRows = rows.slice(0, 8);
  const reviewRows = [...riskRows, ...qualityRows.filter((row) => !riskRows.some((riskRow) => riskRow.symbol === row.symbol))].slice(0, 8);
  const memoAllocationRows = (options.allocationRows ?? []).filter((row) => row.allocationWeight > 0).slice(0, 8);
  const memoRiskRows = (options.allocationRisk?.riskRows ?? []).slice(0, 5);
  const memoRebalanceRows = (options.rebalanceRows ?? []).slice(0, 8);
  const memoTradeTickets = (options.tradeTickets ?? []).slice(0, 8);
  const tableHeader = "| 商品 | 分數 | 訊號 | 年化報酬 | 年化波動 | 最大回撤 | 最新日 | 說明 |";
  const tableDivider = "|---|---:|---|---:|---:|---:|---|---|";
  const tableRows = topRows.map((row) =>
    [
      markdownCell(row.symbol),
      row.score,
      markdownCell(decisionSignalLabel(row.signal)),
      markdownCell(formatPercent(row.annualizedReturn)),
      markdownCell(formatPercent(row.annualizedVolatility)),
      markdownCell(formatPercent(row.maxDrawdown)),
      markdownCell(row.latestDate),
      markdownCell(row.signalNote),
    ].join(" | "),
  );
  const reviewTableRows = reviewRows.map((row) =>
    [
      markdownCell(row.symbol),
      row.score,
      markdownCell(decisionSignalLabel(row.signal)),
      markdownCell(qualityLabel(row.qualityStatus)),
      markdownCell(row.latestDate),
      markdownCell(row.freshnessDays === null ? "--" : `${row.freshnessDays} 天`),
      markdownCell(row.signalNote),
    ].join(" | "),
  );
  const allocationTableRows = memoAllocationRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(formatPercent(row.allocationWeight)),
      markdownCell(formatCurrency(row.allocationAmount)),
      row.score,
      markdownCell(decisionSignalLabel(row.signal)),
      markdownCell(row.allocationCapApplied ? "達上限" : "--"),
      markdownCell(row.allocationNote),
    ].join(" | "),
  );
  const riskBudgetTableRows = memoRiskRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(formatPercent(row.allocationWeight)),
      markdownCell(formatPercent(row.riskContribution)),
      markdownCell(formatPercent(row.annualizedVolatility)),
      markdownCell(formatPercent(row.maxDrawdown)),
    ].join(" | "),
  );
  const rebalanceTableRows = memoRebalanceRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(formatCurrency(row.currentAmount)),
      markdownCell(formatCurrency(row.targetAmount)),
      markdownCell(formatCurrency(row.tradeAmount)),
      markdownCell(formatPercent(row.tradeWeight)),
      markdownCell(rebalanceDirectionLabel(row.direction)),
    ].join(" | "),
  );
  const tradeTicketTableRows = memoTradeTickets.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(rebalanceDirectionLabel(row.direction)),
      markdownCell(formatCurrency(row.ticketAmount)),
      markdownCell(formatCurrency(row.cashImpact)),
      markdownCell(formatPercent(row.tradeWeight)),
      markdownCell(row.ticketNote),
    ].join(" | "),
  );

  return [
    `# ${options.name || "未命名 Watchlist"} 研究摘要`,
    "",
    `- 產出時間：${new Date().toLocaleString("zh-TW")}`,
    `- 商品清單：${symbolText}`,
    `- 價格口徑：${options.priceBasis}`,
    `- 排序：${comparisonSortLabel(options.sortKey)}`,
    `- 訊號篩選：${comparisonSignalFilterLabel(options.signalFilter)}`,
    `- 最低分數：${options.minimumScore}`,
    "",
    "## 篩選概況",
    `- 顯示商品：${rows.length} / ${options.totalRows} 檔`,
    `- 候選 / 觀察 / 風險：${candidateRows.length} / ${watchRows.length} / ${riskRows.length}`,
    `- 平均年化報酬：${formatPercent(avgReturn)}`,
    `- 平均年化波動：${formatPercent(avgVolatility)}`,
    `- 平均最大回撤：${formatPercent(avgDrawdown)}`,
    "",
    "## 優先研究名單",
    topRows.length ? tableHeader : "目前篩選條件下沒有商品。",
    topRows.length ? tableDivider : "",
    ...tableRows.map((row) => `| ${row} |`),
    "",
    "## 模型配置草稿",
    `- 配置模式：${options.allocationMode ? allocationModeLabel(options.allocationMode) : "--"}`,
    `- 模型本金：${formatCurrency(options.allocationCapital)}`,
    `- 單檔權重上限：${formatPercent(options.maximumAllocationWeight)}`,
    memoAllocationRows.length ? "| 商品 | 權重 | 金額 | 分數 | 訊號 | 上限 | 說明 |" : "目前篩選條件下沒有可納入配置的商品。",
    memoAllocationRows.length ? "|---|---:|---:|---:|---|---|---|" : "",
    ...allocationTableRows.map((row) => `| ${row} |`),
    "",
    "## 配置風險壓力測試",
    `- 預估年化報酬：${formatPercent(options.allocationRisk?.expectedAnnualReturn)}`,
    `- 預估年化波動：${formatPercent(options.allocationRisk?.estimatedAnnualVolatility)}`,
    `- 加權最大回撤：${formatPercent(options.allocationRisk?.weightedMaxDrawdown)}`,
    `- 壓力情境：${options.stressShockPercent ?? "--"}%`,
    `- 情境損益：${formatCurrency(options.allocationRisk?.stressLoss)}`,
    memoRiskRows.length ? "| 商品 | 權重 | 風險貢獻 | 年化波動 | 最大回撤 |" : "目前沒有可計算風險貢獻的配置商品。",
    memoRiskRows.length ? "|---|---:|---:|---:|---:|" : "",
    ...riskBudgetTableRows.map((row) => `| ${row} |`),
    "",
    "## 再平衡交易草稿",
    `- 偏離門檻：${formatPercent(options.rebalanceThreshold)}`,
    memoRebalanceRows.length ? "| 商品 | 現有金額 | 目標金額 | 交易差額 | 權重偏離 | 動作 |" : "尚未輸入現有持倉，無法產生再平衡草稿。",
    memoRebalanceRows.length ? "|---|---:|---:|---:|---:|---|" : "",
    ...rebalanceTableRows.map((row) => `| ${row} |`),
    "",
    "## 交易執行清單",
    `- 最小交易金額：${formatCurrency(options.minimumTradeAmount)}`,
    memoTradeTickets.length ? "| 商品 | 動作 | 交易金額 | 現金影響 | 權重偏離 | 說明 |" : "目前沒有達最小交易金額的可執行交易。",
    memoTradeTickets.length ? "|---|---|---:|---:|---:|---|" : "",
    ...tradeTicketTableRows.map((row) => `| ${row} |`),
    "",
    "## 需要複核的風險",
    reviewRows.length ? "| 商品 | 分數 | 訊號 | 品質 | 最新日 | 距今天 | 說明 |" : "目前篩選結果未偵測到明確風險。",
    reviewRows.length ? "|---|---:|---|---|---|---:|---|" : "",
    ...reviewTableRows.map((row) => `| ${row} |`),
    "",
    "## 使用限制",
    "- 此摘要只依 BigQuery daily_prices 的歷史價格計算，尚未納入估值、產業、流動性、配息、匯率與交易成本。",
    "- 分數是研究排序工具，不是買賣建議；正式決策前仍需人工覆核。",
  ].join("\n");
}

function sortComparisonRows(rows: AssetComparisonRow[], sortKey: AssetComparisonSortKey) {
  const sortedRows = [...rows];

  return sortedRows.sort((left, right) => {
    if (sortKey === "annualizedVolatility" || sortKey === "maxDrawdown" || sortKey === "freshnessDays") {
      const leftValue = sortKey === "maxDrawdown" ? Math.abs(left.maxDrawdown ?? Infinity) : left[sortKey] ?? Infinity;
      const rightValue = sortKey === "maxDrawdown" ? Math.abs(right.maxDrawdown ?? Infinity) : right[sortKey] ?? Infinity;
      return leftValue - rightValue;
    }

    const leftValue = left[sortKey] ?? -Infinity;
    const rightValue = right[sortKey] ?? -Infinity;
    return rightValue - leftValue;
  });
}

export function MarketDataPanel() {
  const {
    data,
    bigQueryStatus,
    bigQueryDiagnostics,
    error,
    bigQueryError,
    bigQueryDiagnosticsError,
    isLoading,
    reload,
  } = useMarketSources();
  const [assetQuery, setAssetQuery] = useState("0050.TW");
  const [assetPriceBasis, setAssetPriceBasis] = useState<"adjusted" | "raw">("adjusted");
  const [assetSuggestions, setAssetSuggestions] = useState<BigQueryAsset[]>([]);
  const [assetProfile, setAssetProfile] = useState<BigQueryAssetProfileResponse | null>(null);
  const [assetPanelError, setAssetPanelError] = useState<string | null>(null);
  const [isSearchingAssets, setIsSearchingAssets] = useState(false);
  const [isLoadingAssetProfile, setIsLoadingAssetProfile] = useState(false);
  const [comparisonSymbols, setComparisonSymbols] = useState("0050.TW SPY QQQ");
  const [comparisonRows, setComparisonRows] = useState<AssetComparisonRow[]>([]);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonSignalFilter, setComparisonSignalFilter] = useState<AssetDecisionSignal | "all">("all");
  const [comparisonSortKey, setComparisonSortKey] = useState<AssetComparisonSortKey>("score");
  const [minimumComparisonScore, setMinimumComparisonScore] = useState(0);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("risk");
  const [allocationCapital, setAllocationCapital] = useState(1_000_000);
  const [maximumAllocationWeight, setMaximumAllocationWeight] = useState(0.35);
  const [stressShockPercent, setStressShockPercent] = useState(-20);
  const [currentHoldingsText, setCurrentHoldingsText] = useState("");
  const [rebalanceThreshold, setRebalanceThreshold] = useState(0.02);
  const [minimumTradeAmount, setMinimumTradeAmount] = useState(10_000);
  const [watchlistPresetName, setWatchlistPresetName] = useState("核心 ETF");
  const [selectedWatchlistPresetId, setSelectedWatchlistPresetId] = useState("");
  const [savedWatchlistPresets, setSavedWatchlistPresets] = useState<SavedWatchlistPreset[]>([]);
  const [watchlistMemoCopyStatus, setWatchlistMemoCopyStatus] = useState<"idle" | "copied">("idle");
  const sources = data?.sources ?? [];
  const securedCount = sources.filter((source) => source.status !== "needs_secret").length;
  const hasBigQueryCredentials = Boolean(
    bigQueryStatus?.hasServiceAccountEnv || bigQueryStatus?.hasGoogleApplicationCredentials,
  );
  const bigQueryBadge = hasBigQueryCredentials
    ? "已設定憑證"
    : "等待 Vercel 金鑰";
  const priceFreshnessDays = daysSinceDate(bigQueryDiagnostics?.priceSummary.latest_date);
  const fxFreshnessDays = daysSinceDate(bigQueryDiagnostics?.fxSummary.latest_date);
  const priceFreshnessStatus = freshnessStatus(priceFreshnessDays);
  const fxFreshnessStatus = freshnessStatus(fxFreshnessDays);
  const staleSymbols = bigQueryDiagnostics?.staleSymbols ?? [];
  const fxCurrencies = bigQueryDiagnostics?.fxCurrencies ?? [];
  const staleSymbolStatus: QualityStatus = staleSymbols.length >= 5 ? "risk" : staleSymbols.length > 0 ? "watch" : "strong";
  const fxCurrencyStatus: QualityStatus = coverageStatus(fxCurrencies.length, 2, 1);
  const schemaStatus: QualityStatus = bigQueryDiagnostics
    ? bigQueryDiagnostics.schemaChecks.priceTable.isReady && bigQueryDiagnostics.schemaChecks.fxTable.isReady
      ? "strong"
      : "risk"
    : "neutral";
  const symbolCoverageStatus = coverageStatus(bigQueryDiagnostics?.priceSummary.symbol_count, 50, 10);
  const priceDepthStatus = coverageStatus(bigQueryDiagnostics?.priceSummary.row_count, 50_000, 5_000);
  const qualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = [
    {
      label: "Schema",
      value: bigQueryDiagnostics ? (schemaStatus === "strong" ? "Ready" : "Missing") : "--",
      status: schemaStatus,
      note: schemaStatus === "strong" ? "價格表與匯率表欄位完整" : schemaStatus === "risk" ? "必要欄位缺失" : "尚未讀取",
    },
    {
      label: "價格新鮮度",
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      status: priceFreshnessStatus,
      note: bigQueryDiagnostics?.priceSummary.latest_date ?? "尚無價格最新日",
    },
    {
      label: "匯率新鮮度",
      value: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      status: fxFreshnessStatus,
      note: bigQueryDiagnostics?.fxSummary.latest_date ?? "尚無匯率最新日",
    },
    {
      label: "商品覆蓋",
      value: `${formatCount(bigQueryDiagnostics?.priceSummary.symbol_count)} 檔`,
      status: symbolCoverageStatus,
      note: "daily_prices 可分析商品數",
    },
    {
      label: "價格深度",
      value: `${formatCount(bigQueryDiagnostics?.priceSummary.row_count)} 筆`,
      status: priceDepthStatus,
      note: "daily_prices 歷史價格筆數",
    },
  ];
  const issueCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = [
    {
      label: "落後商品",
      value: `${staleSymbols.length} 檔`,
      status: bigQueryDiagnostics ? staleSymbolStatus : "neutral",
      note: staleSymbols.length ? "部分商品最新日落後於價格表最新日" : "未偵測到落後商品",
    },
    {
      label: "匯率幣別",
      value: `${fxCurrencies.length} 組`,
      status: bigQueryDiagnostics ? fxCurrencyStatus : "neutral",
      note: "daily_fx 可供換算的幣別數",
    },
  ];
  const visibleComparisonRows = sortComparisonRows(
    comparisonRows.filter((row) => {
      const signalMatched = comparisonSignalFilter === "all" || row.signal === comparisonSignalFilter;
      return signalMatched && row.score >= minimumComparisonScore;
    }),
    comparisonSortKey,
  );
  const modelAllocationRows = allocationDraftRows(visibleComparisonRows, allocationMode, allocationCapital, maximumAllocationWeight);
  const activeAllocationRows = modelAllocationRows.filter((row) => row.allocationWeight > 0);
  const effectiveMaximumAllocationWeight = Math.max(
    maximumAllocationWeight,
    activeAllocationRows.length ? 1 / activeAllocationRows.length : maximumAllocationWeight,
  );
  const allocationRisk = allocationRiskSnapshot(activeAllocationRows, stressShockPercent);
  const rebalanceRows = rebalanceDraftRows(activeAllocationRows, currentHoldingsText, rebalanceThreshold);
  const activeRebalanceRows = rebalanceRows.filter((row) => row.direction !== "hold");
  const tradeTickets = tradeTicketRows(rebalanceRows, minimumTradeAmount);
  const skippedTradeCount = activeRebalanceRows.length - tradeTickets.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const presets = loadWatchlistPresetsFromStorage();
      setSavedWatchlistPresets(presets);
      setSelectedWatchlistPresetId((currentId) => currentId || presets[0]?.id || "");
      setWatchlistPresetName((currentName) => currentName || presets[0]?.name || "核心 ETF");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const assetProfileQualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = assetProfile
    ? [
        {
          label: "價格新鮮度",
          value: `${daysSinceDate(assetProfile.summary.latest_date) ?? "--"} 天`,
          status: freshnessStatus(daysSinceDate(assetProfile.summary.latest_date)),
          note: assetProfile.summary.latest_date ?? "--",
        },
        {
          label: "資料完整度",
          value: `${formatCount(assetProfile.summary.selected_price_rows)} / ${formatCount(assetProfile.summary.row_count)}`,
          status:
            assetProfile.summary.missing_selected_price_rows === 0
              ? "strong"
              : assetProfile.summary.missing_selected_price_rows <= 5
                ? "watch"
                : "risk",
          note: `缺 ${formatCount(assetProfile.summary.missing_selected_price_rows)} 筆 ${assetProfile.priceBasis}`,
        },
        {
          label: "累積報酬",
          value: formatPercent(assetProfile.metrics.totalReturn),
          status:
            typeof assetProfile.metrics.totalReturn === "number"
              ? assetProfile.metrics.totalReturn >= 0
                ? "strong"
                : "risk"
              : "neutral",
          note: `${assetProfile.summary.first_date ?? "--"} ~ ${assetProfile.summary.latest_date ?? "--"}`,
        },
        {
          label: "年化波動",
          value: formatPercent(assetProfile.metrics.annualizedVolatility),
          status:
            typeof assetProfile.metrics.annualizedVolatility === "number"
              ? assetProfile.metrics.annualizedVolatility <= 0.18
                ? "strong"
                : assetProfile.metrics.annualizedVolatility <= 0.35
                  ? "watch"
                  : "risk"
              : "neutral",
          note: "以日報酬換算 252 交易日",
        },
        {
          label: "最大回撤",
          value: formatPercent(assetProfile.metrics.maxDrawdown),
          status:
            typeof assetProfile.metrics.maxDrawdown === "number"
              ? Math.abs(assetProfile.metrics.maxDrawdown) <= 0.15
                ? "strong"
                : Math.abs(assetProfile.metrics.maxDrawdown) <= 0.3
                  ? "watch"
                  : "risk"
              : "neutral",
          note: "單一商品高低點壓力",
        },
      ]
    : [];
  const handleExportDiagnosticsCsv = () => {
    if (!bigQueryDiagnostics) return;

    const rows = [
      ["section", "name", "value", "status", "note"],
      ...qualityCards.map((card) => ["quality", card.label, card.value, card.status, card.note]),
      ["summary", "price_first_date", bigQueryDiagnostics.priceSummary.first_date ?? "", "", ""],
      ["summary", "price_latest_date", bigQueryDiagnostics.priceSummary.latest_date ?? "", "", ""],
      ["summary", "price_row_count", bigQueryDiagnostics.priceSummary.row_count ?? "", "", ""],
      ["summary", "price_symbol_count", bigQueryDiagnostics.priceSummary.symbol_count ?? "", "", ""],
      ["summary", "adjusted_price_rows", bigQueryDiagnostics.priceSummary.adjusted_price_rows ?? "", "", ""],
      ["summary", "raw_price_rows", bigQueryDiagnostics.priceSummary.raw_price_rows ?? "", "", ""],
      ["summary", "fx_first_date", bigQueryDiagnostics.fxSummary.first_date ?? "", "", ""],
      ["summary", "fx_latest_date", bigQueryDiagnostics.fxSummary.latest_date ?? "", "", ""],
      ["summary", "fx_row_count", bigQueryDiagnostics.fxSummary.row_count ?? "", "", ""],
      ["summary", "fx_currency_count", bigQueryDiagnostics.fxSummary.currency_count ?? "", "", ""],
      ...issueCards.map((card) => ["issue", card.label, card.value, card.status, card.note]),
      ...bigQueryDiagnostics.recentSymbols.map((symbol) => [
        "recent_symbol",
        symbol.symbol,
        symbol.latest_date ?? "",
        freshnessStatus(daysSinceDate(symbol.latest_date)),
        symbol.row_count,
      ]),
      ...staleSymbols.map((symbol) => [
        "stale_symbol",
        symbol.symbol,
        symbol.latest_date ?? "",
        symbol.stale_days ?? "",
        symbol.row_count,
      ]),
      ...fxCurrencies.map((currency) => [
        "fx_currency",
        currency.currency,
        currency.latest_date ?? "",
        freshnessStatus(daysSinceDate(currency.latest_date)),
        currency.row_count,
      ]),
    ];

    downloadTextFile(
      `bigquery-data-quality-${resultStamp()}.csv`,
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  };
  const handleSearchAssets = async () => {
    if (!hasBigQueryCredentials || !assetQuery.trim()) return;

    setIsSearchingAssets(true);
    setAssetPanelError(null);
    try {
      const response = await fetchBigQueryAssets(assetQuery, 12);
      setAssetSuggestions(response.assets);
    } catch (err: unknown) {
      setAssetSuggestions([]);
      setAssetPanelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSearchingAssets(false);
    }
  };
  const handleLoadAssetProfile = async (symbol = assetQuery) => {
    const cleanSymbol = symbol.trim();
    if (!hasBigQueryCredentials || !cleanSymbol) return;

    setIsLoadingAssetProfile(true);
    setAssetPanelError(null);
    try {
      const response = await fetchBigQueryAssetProfile(cleanSymbol, assetPriceBasis);
      setAssetQuery(response.symbol);
      setAssetProfile(response);
    } catch (err: unknown) {
      setAssetProfile(null);
      setAssetPanelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAssetProfile(false);
    }
  };
  const handleExportAssetProfileCsv = () => {
    if (!assetProfile) return;

    downloadTextFile(
      `bigquery-asset-profile-${assetProfile.symbol}-${resultStamp()}.csv`,
      assetProfileCsv(assetProfile),
      "text/csv;charset=utf-8",
    );
  };
  const handleCompareAssets = async () => {
    const symbols = parseSymbolList(comparisonSymbols);
    if (!hasBigQueryCredentials || !symbols.length) return;

    setIsLoadingComparison(true);
    setComparisonError(null);
    try {
      const profiles = await Promise.all(
        symbols.map((symbol) => fetchBigQueryAssetProfile(symbol, assetPriceBasis)),
      );
      setComparisonRows(profiles.map(comparisonRowFromProfile));
    } catch (err: unknown) {
      setComparisonRows([]);
      setComparisonError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingComparison(false);
    }
  };
  const handleExportAssetComparisonCsv = () => {
    if (!visibleComparisonRows.length) return;

    downloadTextFile(
      `bigquery-asset-watchlist-${resultStamp()}.csv`,
      assetComparisonCsv(visibleComparisonRows, assetPriceBasis),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportAllocationDraftCsv = () => {
    if (!modelAllocationRows.length) return;

    downloadTextFile(
      `bigquery-allocation-draft-${resultStamp()}.csv`,
      allocationDraftCsv(modelAllocationRows, allocationMode, allocationCapital, assetPriceBasis, maximumAllocationWeight),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportAllocationRiskCsv = () => {
    if (!activeAllocationRows.length) return;

    downloadTextFile(
      `bigquery-allocation-risk-${resultStamp()}.csv`,
      allocationRiskCsv(allocationRisk, stressShockPercent),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportRebalanceDraftCsv = () => {
    if (!rebalanceRows.length) return;

    downloadTextFile(
      `bigquery-rebalance-draft-${resultStamp()}.csv`,
      rebalanceDraftCsv(rebalanceRows, rebalanceThreshold),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportTradeTicketCsv = () => {
    if (!tradeTickets.length) return;

    downloadTextFile(
      `bigquery-trade-tickets-${resultStamp()}.csv`,
      tradeTicketCsv(tradeTickets, minimumTradeAmount),
      "text/csv;charset=utf-8",
    );
  };
  const buildAssetComparisonMemo = () =>
    assetComparisonMemo(visibleComparisonRows, {
      name: watchlistPresetName.trim() || "未命名 Watchlist",
      symbols: comparisonSymbols,
      priceBasis: assetPriceBasis,
      sortKey: comparisonSortKey,
      signalFilter: comparisonSignalFilter,
      minimumScore: minimumComparisonScore,
      totalRows: comparisonRows.length,
      allocationRows: modelAllocationRows,
      allocationMode,
      allocationCapital,
      maximumAllocationWeight,
      allocationRisk,
      stressShockPercent,
      rebalanceRows,
      rebalanceThreshold,
      tradeTickets,
      minimumTradeAmount,
    });
  const handleExportAssetComparisonMemo = () => {
    if (!visibleComparisonRows.length) return;

    downloadTextFile(
      `bigquery-watchlist-memo-${resultStamp()}.md`,
      buildAssetComparisonMemo(),
      "text/markdown;charset=utf-8",
    );
  };
  const handleCopyAssetComparisonMemo = async () => {
    if (!visibleComparisonRows.length || typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(buildAssetComparisonMemo());
      setWatchlistMemoCopyStatus("copied");
      window.setTimeout(() => setWatchlistMemoCopyStatus("idle"), 1800);
    } catch (err: unknown) {
      setComparisonError(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSaveWatchlistPreset = () => {
    const cleanName = watchlistPresetName.trim() || "未命名 Watchlist";
    const now = new Date().toISOString();
    const preset: SavedWatchlistPreset = {
      id: selectedWatchlistPresetId || `watchlist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: cleanName,
      symbols: comparisonSymbols,
      priceBasis: assetPriceBasis,
      sortKey: comparisonSortKey,
      signalFilter: comparisonSignalFilter,
      minimumScore: minimumComparisonScore,
      updatedAt: now,
    };

    setSavedWatchlistPresets((currentPresets) => {
      const nextPresets = [preset, ...currentPresets.filter((item) => item.id !== preset.id)].slice(0, 12);
      writeWatchlistPresetsToStorage(nextPresets);
      return nextPresets;
    });
    setSelectedWatchlistPresetId(preset.id);
  };
  const handleLoadWatchlistPreset = () => {
    const preset = savedWatchlistPresets.find((item) => item.id === selectedWatchlistPresetId);
    if (!preset) return;

    setWatchlistPresetName(preset.name);
    setComparisonSymbols(preset.symbols);
    setAssetPriceBasis(preset.priceBasis === "raw" ? "raw" : "adjusted");
    setComparisonSortKey(preset.sortKey ?? "score");
    setComparisonSignalFilter(preset.signalFilter ?? "all");
    setMinimumComparisonScore(Number.isFinite(preset.minimumScore) ? preset.minimumScore : 0);
    setComparisonRows([]);
    setComparisonError(null);
  };
  const handleDeleteWatchlistPreset = () => {
    if (!selectedWatchlistPresetId) return;

    setSavedWatchlistPresets((currentPresets) => {
      const nextPresets = currentPresets.filter((preset) => preset.id !== selectedWatchlistPresetId);
      writeWatchlistPresetsToStorage(nextPresets);
      setSelectedWatchlistPresetId(nextPresets[0]?.id || "");
      setWatchlistPresetName(nextPresets[0]?.name || "核心 ETF");
      return nextPresets;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-cyan-300 flex items-center gap-2">
              ▍ 市場資料平台中控台
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              MoneyDJ、鉅亨、Yahoo、FRED、BigQuery 資料管線盤點
            </p>
          </div>
          <button
            onClick={reload}
            className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            ⟳ 重新整理
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">資料源</p>
            <p className="text-2xl font-bold text-white font-mono">{sources.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">可安全接入</p>
            <p className="text-2xl font-bold text-emerald-300 font-mono">{securedCount}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">最後檢查</p>
            <p className="text-sm font-semibold text-slate-200 font-mono">
              {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("zh-TW") : "--"}
            </p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">BigQuery API</p>
            <p className={`text-sm font-bold ${hasBigQueryCredentials ? "text-emerald-300" : "text-amber-300"}`}>
              {bigQueryStatus ? bigQueryBadge : "--"}
            </p>
          </div>
        </div>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 連線狀態</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                投組分析 API 會從這裡讀取 daily_prices / daily_fx
              </p>
            </div>
            <span
              className={`self-start text-[10px] px-2 py-1 rounded border font-bold ${
                hasBigQueryCredentials
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/40"
              }`}
            >
              {bigQueryStatus ? bigQueryBadge : "讀取中"}
            </span>
          </div>

          {bigQueryError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {bigQueryError}
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Project / Dataset</dt>
                <dd className="text-slate-200 mt-0.5 font-mono">
                  {bigQueryStatus ? `${bigQueryStatus.projectId}.${bigQueryStatus.dataset}` : "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">憑證來源</dt>
                <dd className="text-slate-200 mt-0.5 font-mono">
                  {bigQueryStatus?.credentialSource ?? "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">價格表</dt>
                <dd className="text-cyan-200 mt-0.5 font-mono break-all">
                  {bigQueryStatus?.priceTable ?? "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">匯率表</dt>
                <dd className="text-cyan-200 mt-0.5 font-mono break-all">
                  {bigQueryStatus?.fxTable ?? "--"}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {!hasBigQueryCredentials && (
          <section className="bg-amber-950/20 border border-amber-900/60 rounded-lg p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-amber-200">BigQuery 上線接線板</h3>
                <p className="text-[11px] text-amber-100/70 mt-0.5">
                  Vercel 設定完成並重新部署後，市場資料 API 會切換為可讀取狀態
                </p>
              </div>
              <a
                href="https://vercel.com/frank-workspace/wealth-dashboard-web/settings/environment-variables"
                target="_blank"
                rel="noreferrer"
                className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                開啟 Vercel
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 text-xs">
              {bigQueryEnvironmentVars.map((envVar) => (
                <div key={envVar.key} className="bg-slate-950/80 border border-amber-900/40 rounded-md p-3 min-w-0">
                  <p className="text-[10px] text-amber-100/60 mb-1">{envVar.kind === "secret" ? "Secret" : "Value"}</p>
                  <p className="font-mono text-amber-100 truncate">{envVar.key}</p>
                  <p className="font-mono text-slate-400 truncate mt-1">{envVar.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-amber-100/80">
              <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
                <span className="font-mono text-amber-200">1</span> 建立 BigQuery service account
              </div>
              <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
                <span className="font-mono text-amber-200">2</span> 貼到 Vercel Production / Preview / Development
              </div>
              <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
                <span className="font-mono text-amber-200">3</span> 重新部署 main 後按重新整理
              </div>
            </div>
          </section>
        )}

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 資料倉儲診斷</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                價格表與匯率表的覆蓋率、最近更新日與資料筆數
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {bigQueryDiagnostics ? (
                <button
                  onClick={handleExportDiagnosticsCsv}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  品質 CSV
                </button>
              ) : null}
              <span className="self-start text-[10px] px-2 py-1 rounded border font-bold bg-slate-800 text-slate-300 border-slate-700">
                {bigQueryDiagnostics ? "已讀取" : "待憑證"}
              </span>
            </div>
          </div>

          {bigQueryDiagnosticsError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {bigQueryDiagnosticsError}
            </div>
          ) : bigQueryDiagnostics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {qualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {issueCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-200">daily_prices</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "strong" : "risk",
                      )}`}
                    >
                      {bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "Ready" : "Missing"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">期間</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {bigQueryDiagnostics.priceSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.priceSummary.latest_date ?? "--"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">商品數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.symbol_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">總筆數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.row_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Adj / Raw</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.adjusted_price_rows)} / {formatCount(bigQueryDiagnostics.priceSummary.raw_price_rows)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-200">daily_fx</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "strong" : "risk",
                      )}`}
                    >
                      {bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "Ready" : "Missing"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">期間</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {bigQueryDiagnostics.fxSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.fxSummary.latest_date ?? "--"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">幣別數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.fxSummary.currency_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">總筆數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.fxSummary.row_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">距今天</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {(!bigQueryDiagnostics.schemaChecks.priceTable.isReady || !bigQueryDiagnostics.schemaChecks.fxTable.isReady) && (
                <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 space-y-2">
                  {!bigQueryDiagnostics.schemaChecks.priceTable.isReady && (
                    <p>
                      daily_prices 缺少欄位：
                      {bigQueryDiagnostics.schemaChecks.priceTable.missingColumns.join(", ")}
                    </p>
                  )}
                  {!bigQueryDiagnostics.schemaChecks.fxTable.isReady && (
                    <p>
                      daily_fx 缺少欄位：
                      {bigQueryDiagnostics.schemaChecks.fxTable.missingColumns.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {staleSymbols.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">落後商品</span>
                    <span className="text-slate-600 font-mono">{staleSymbols.length} 檔</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {staleSymbols.slice(0, 8).map((symbol) => {
                      const staleDays = symbol.stale_days ?? daysSinceDate(symbol.latest_date);
                      return (
                        <div key={symbol.symbol} className="bg-slate-900 border border-slate-800 rounded-md p-2 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-200 truncate">{symbol.symbol}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                                freshnessStatus(staleDays),
                              )}`}
                            >
                              {staleDays === null ? "--" : `${staleDays} 天`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span className="font-mono">{symbol.latest_date ?? "--"}</span>
                            <span className="font-mono">{formatCount(symbol.row_count)} rows</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {fxCurrencies.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">匯率幣別狀態</span>
                    <span className="text-slate-600 font-mono">{fxCurrencies.length} 組</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {fxCurrencies.map((currency) => (
                      <div key={currency.currency} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                        <span className="text-slate-200 truncate">{currency.currency}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">{currency.latest_date ?? "--"}</span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                              freshnessStatus(daysSinceDate(currency.latest_date)),
                            )}`}
                          >
                            {qualityLabel(freshnessStatus(daysSinceDate(currency.latest_date)))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-500">近期商品新鮮度</span>
                  <span className="text-slate-600 font-mono">{bigQueryDiagnostics.recentSymbols.length} 檔</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {bigQueryDiagnostics.recentSymbols.map((symbol) => (
                    <div key={symbol.symbol} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                      <span className="text-slate-200 truncate">{symbol.symbol}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">{symbol.latest_date ?? "--"}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                            freshnessStatus(daysSinceDate(symbol.latest_date)),
                          )}`}
                        >
                          {qualityLabel(freshnessStatus(daysSinceDate(symbol.latest_date)))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              設定 GCP_SERVICE_ACCOUNT_JSON 後，這裡會顯示 daily_prices / daily_fx 的資料覆蓋率。
            </div>
          )}
        </section>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 商品主檔</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                單一商品價格、報酬、波動、回撤與資料完整度
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto_auto] gap-2 text-xs xl:min-w-[680px]">
              <input
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleLoadAssetProfile();
                  }
                }}
                placeholder="0050.TW"
                className="min-w-0 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-600"
              />
              <select
                value={assetPriceBasis}
                onChange={(event) => setAssetPriceBasis(event.target.value as "adjusted" | "raw")}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value="adjusted">Adj</option>
                <option value="raw">Raw</option>
              </select>
              <button
                onClick={handleSearchAssets}
                disabled={!hasBigQueryCredentials || isSearchingAssets || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isSearchingAssets ? "搜尋中" : "搜尋"}
              </button>
              <button
                onClick={() => handleLoadAssetProfile()}
                disabled={!hasBigQueryCredentials || isLoadingAssetProfile || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isLoadingAssetProfile ? "讀取中" : "讀取商品"}
              </button>
            </div>
          </div>

          {assetPanelError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {assetPanelError}
            </div>
          ) : null}

          {assetSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {assetSuggestions.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => handleLoadAssetProfile(asset.symbol)}
                  className="max-w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs hover:border-cyan-600"
                >
                  <span className="block font-bold text-cyan-200">{asset.symbol}</span>
                  <span className="block text-[11px] text-slate-500">
                    {asset.first_date ?? "--"} ~ {asset.latest_date ?? "--"} · {formatCount(asset.row_count)} rows
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {assetProfile ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-900 pt-4">
                <div>
                  <p className="text-sm font-bold text-cyan-200">{assetProfile.symbol}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {assetProfile.summary.first_date ?? "--"} ~ {assetProfile.summary.latest_date ?? "--"} · {assetProfile.priceBasis}
                  </p>
                </div>
                <button
                  onClick={handleExportAssetProfileCsv}
                  className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  商品 CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {assetProfileQualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-xs">
                {[
                  ["最新價格", formatPrice(assetProfile.metrics.latestPrice)],
                  ["年化報酬", formatPercent(assetProfile.metrics.annualizedReturn)],
                  ["勝率", formatPercent(assetProfile.metrics.positiveDayRatio)],
                  ["最佳單日", formatPercent(assetProfile.metrics.bestDay)],
                  ["最差單日", formatPercent(assetProfile.metrics.worstDay)],
                  ["最新日報酬", formatPercent(assetProfile.metrics.latestDailyReturn)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                    <p className="text-[11px] text-slate-600 truncate">{label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium text-right">Selected</th>
                      <th className="py-2 px-3 font-medium text-right">Adj</th>
                      <th className="py-2 px-3 font-medium text-right">Raw</th>
                      <th className="py-2 pl-3 font-medium text-right">Daily Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetProfile.recentPrices.slice().reverse().map((point) => (
                      <tr key={point.date} className="border-t border-slate-900">
                        <td className="py-2 pr-3 font-mono text-slate-300">{point.date ?? "--"}</td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">{formatPrice(point.selected_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.adj_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.raw_price)}</td>
                        <td
                          className={`py-2 pl-3 text-right font-mono ${
                            typeof point.daily_return === "number" && point.daily_return < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatPercent(point.daily_return)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              選擇商品後，這裡會顯示單一商品的資料主檔與價格品質。
            </div>
          )}
        </section>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery Watchlist 比較</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                批次比較多檔商品的報酬、波動、回撤與資料品質
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {comparisonRows.length ? (
                <>
                  <button
                    onClick={handleExportAssetComparisonMemo}
                    disabled={!visibleComparisonRows.length}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-emerald-700 hover:bg-emerald-600 text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
                  >
                    Memo MD
                  </button>
                  <button
                    onClick={() => void handleCopyAssetComparisonMemo()}
                    disabled={!visibleComparisonRows.length}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
                  >
                    {watchlistMemoCopyStatus === "copied" ? "已複製" : "複製 Memo"}
                  </button>
                  <button
                    onClick={handleExportAssetComparisonCsv}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                  >
                    Watchlist CSV
                  </button>
                </>
              ) : null}
              <button
                onClick={handleCompareAssets}
                disabled={!hasBigQueryCredentials || isLoadingComparison || !parseSymbolList(comparisonSymbols).length}
                className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-700 hover:bg-cyan-600 text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isLoadingComparison ? "比較中" : "比較商品"}
              </button>
            </div>
          </div>

          <textarea
            value={comparisonSymbols}
            onChange={(event) => setComparisonSymbols(event.target.value)}
            rows={3}
            placeholder="0050.TW SPY QQQ"
            className="w-full resize-y rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>最多比較 12 檔；可用空白、逗號或換行分隔</span>
            <span className="font-mono">
              {parseSymbolList(comparisonSymbols).length} symbols · {assetPriceBasis}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-500">Watchlist 名稱</span>
              <input
                value={watchlistPresetName}
                onChange={(event) => setWatchlistPresetName(event.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
              <label className="space-y-1">
                <span className="text-slate-500">已存 Watchlist</span>
                <select
                  value={selectedWatchlistPresetId}
                  onChange={(event) => {
                    const preset = savedWatchlistPresets.find((item) => item.id === event.target.value);
                    setSelectedWatchlistPresetId(event.target.value);
                    if (preset) setWatchlistPresetName(preset.name);
                  }}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="">尚未選擇</option>
                  {savedWatchlistPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} · {new Date(preset.updatedAt).toLocaleDateString("zh-TW")}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={handleSaveWatchlistPreset}
                className="md:self-end px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
              >
                儲存
              </button>
              <button
                onClick={handleLoadWatchlistPreset}
                disabled={!selectedWatchlistPresetId}
                className="md:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
              >
                載入
              </button>
              <button
                onClick={handleDeleteWatchlistPreset}
                disabled={!selectedWatchlistPresetId}
                className="md:self-end px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:border-rose-500 hover:text-rose-300 font-bold disabled:cursor-not-allowed disabled:text-slate-700"
              >
                刪除
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr] gap-2 text-xs">
            <label className="space-y-1">
              <span className="text-slate-500">排序</span>
              <select
                value={comparisonSortKey}
                onChange={(event) => setComparisonSortKey(event.target.value as AssetComparisonSortKey)}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              >
                <option value="score">分數高到低</option>
                <option value="annualizedReturn">年化報酬高到低</option>
                <option value="riskAdjustedReturn">風險調整報酬高到低</option>
                <option value="annualizedVolatility">波動低到高</option>
                <option value="maxDrawdown">回撤低到高</option>
                <option value="freshnessDays">資料新鮮優先</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-500">訊號</span>
              <select
                value={comparisonSignalFilter}
                onChange={(event) => setComparisonSignalFilter(event.target.value as AssetDecisionSignal | "all")}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              >
                <option value="all">全部</option>
                <option value="candidate">候選</option>
                <option value="watch">觀察</option>
                <option value="neutral">中性</option>
                <option value="risk">風險</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="flex items-center justify-between gap-2 text-slate-500">
                <span>最低分數</span>
                <span className="font-mono text-slate-400">{minimumComparisonScore}</span>
              </span>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={minimumComparisonScore}
                onChange={(event) => setMinimumComparisonScore(Number(event.target.value))}
                className="w-full accent-cyan-500"
              />
            </label>
          </div>

          {comparisonError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {comparisonError}
            </div>
          ) : null}

          {comparisonRows.length ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {[
                  ["顯示商品", `${visibleComparisonRows.length} / ${comparisonRows.length} 檔`],
                  [
                    "平均年化報酬",
                    formatPercent(
                      visibleComparisonRows.reduce((sum, row) => sum + (row.annualizedReturn ?? 0), 0) /
                        Math.max(1, visibleComparisonRows.filter((row) => row.annualizedReturn !== null).length),
                    ),
                  ],
                  [
                    "平均波動",
                    formatPercent(
                      visibleComparisonRows.reduce((sum, row) => sum + (row.annualizedVolatility ?? 0), 0) /
                        Math.max(1, visibleComparisonRows.filter((row) => row.annualizedVolatility !== null).length),
                    ),
                  ],
                  [
                    "異常/觀察",
                    `${visibleComparisonRows.filter((row) => row.qualityStatus !== "strong").length} 檔`,
                  ],
                  [
                    "最高分",
                    visibleComparisonRows.length
                      ? `${visibleComparisonRows[0].symbol} · ${visibleComparisonRows[0].score}`
                      : "--",
                  ],
                  [
                    "候選",
                    `${visibleComparisonRows.filter((row) => row.signal === "candidate").length} 檔`,
                  ],
                  [
                    "風險",
                    `${visibleComparisonRows.filter((row) => row.signal === "risk").length} 檔`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                    <p className="text-[11px] text-slate-600 truncate">{label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">模型配置草稿</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      依目前 Watchlist 篩選結果產生研究用權重；風險訊號與低分商品會自動排除
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[150px_160px_140px_150px_auto_auto] gap-2 text-xs">
                    <label className="space-y-1">
                      <span className="text-slate-500">配置模式</span>
                      <select
                        value={allocationMode}
                        onChange={(event) => setAllocationMode(event.target.value as AllocationMode)}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
                      >
                        <option value="risk">風險調整</option>
                        <option value="score">分數加權</option>
                        <option value="equal">等權重</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500">模型本金</span>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={allocationCapital}
                        onChange={(event) => setAllocationCapital(Math.max(0, Number(event.target.value) || 0))}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500">單檔上限</span>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        step={5}
                        value={Math.round(maximumAllocationWeight * 100)}
                        onChange={(event) => setMaximumAllocationWeight(Math.min(1, Math.max(0.05, (Number(event.target.value) || 0) / 100)))}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500">壓力情境</span>
                      <input
                        type="number"
                        min={-80}
                        max={0}
                        step={5}
                        value={stressShockPercent}
                        onChange={(event) => setStressShockPercent(Math.min(0, Math.max(-80, Number(event.target.value) || 0)))}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                      />
                    </label>
                    <button
                      onClick={handleExportAllocationDraftCsv}
                      disabled={!modelAllocationRows.length}
                      className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      配置 CSV
                    </button>
                    <button
                      onClick={handleExportAllocationRiskCsv}
                      disabled={!activeAllocationRows.length}
                      className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      風險 CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    ["模式", allocationModeLabel(allocationMode)],
                    ["納入商品", `${activeAllocationRows.length} / ${visibleComparisonRows.length} 檔`],
                    ["配置金額", formatCurrency(activeAllocationRows.reduce((sum, row) => sum + row.allocationAmount, 0))],
                    [
                      "最高權重",
                      activeAllocationRows.length
                        ? `${activeAllocationRows[0].symbol} · ${formatPercent(activeAllocationRows[0].allocationWeight)}`
                        : "--",
                    ],
                    ["權重上限", formatPercent(effectiveMaximumAllocationWeight)],
                    ["達上限", `${activeAllocationRows.filter((row) => row.allocationCapApplied).length} 檔`],
                    ["預估年化報酬", formatPercent(allocationRisk.expectedAnnualReturn)],
                    ["預估年化波動", formatPercent(allocationRisk.estimatedAnnualVolatility)],
                    ["壓力損益", formatCurrency(allocationRisk.stressLoss)],
                    [
                      "最大風險貢獻",
                      allocationRisk.riskRows.length
                        ? `${allocationRisk.riskRows[0].symbol} · ${formatPercent(allocationRisk.riskRows[0].riskContribution)}`
                        : "--",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                      <p className="text-[11px] text-slate-600 truncate">{label}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-xs">
                    <thead>
                      <tr className="text-left text-[11px] text-slate-600">
                        <th className="py-2 pr-3 font-medium">Symbol</th>
                        <th className="py-2 px-3 font-medium text-right">Weight</th>
                        <th className="py-2 px-3 font-medium text-right">Cap</th>
                        <th className="py-2 px-3 font-medium text-right">Amount</th>
                        <th className="py-2 px-3 font-medium text-right">Score</th>
                        <th className="py-2 px-3 font-medium text-right">Vol</th>
                        <th className="py-2 px-3 font-medium text-right">Drawdown</th>
                        <th className="py-2 px-3 font-medium">Signal</th>
                        <th className="py-2 pl-3 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelAllocationRows.slice(0, 10).map((row) => (
                        <tr key={row.symbol} className="border-t border-slate-800/80">
                          <td className="py-2 pr-3 font-bold text-cyan-200">{row.symbol}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-100">
                            {formatPercent(row.allocationWeight)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                row.allocationCapApplied ? "bg-amber-500/15 text-amber-200" : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {row.allocationCapApplied ? "Hit" : "--"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            {formatCurrency(row.allocationAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">{row.score}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-200">
                            {formatPercent(row.annualizedVolatility)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-300">
                            {formatPercent(row.maxDrawdown)}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalClass(row.signal)}`}>
                              {decisionSignalLabel(row.signal)}
                            </span>
                          </td>
                          <td className="py-2 pl-3 text-slate-500">{row.allocationNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-3">
                  <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-600">壓力情境損益</p>
                      <p className={`mt-1 font-mono text-lg font-bold ${allocationRisk.stressLoss < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                        {formatCurrency(allocationRisk.stressLoss)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatPercent(stressShockPercent / 100)} 情境後估計市值 {formatCurrency(allocationRisk.stressedValue)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-slate-600">加權最大回撤</p>
                        <p className="mt-1 font-mono text-sm font-bold text-rose-300">
                          {formatPercent(allocationRisk.weightedMaxDrawdown)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-600">單檔最差回撤</p>
                        <p className="mt-1 font-mono text-sm font-bold text-rose-300">
                          {formatPercent(allocationRisk.worstMaxDrawdown)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      目前使用單資產歷史波動估算風險預算，尚未納入資產間相關係數；後續接完整歷史報酬矩陣後，可升級為共變異數模型。
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70">
                    <table className="w-full min-w-[720px] text-xs">
                      <thead>
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">Symbol</th>
                          <th className="py-2 px-3 font-medium text-right">Weight</th>
                          <th className="py-2 px-3 font-medium text-right">Risk Budget</th>
                          <th className="py-2 px-3 font-medium text-right">Weighted Vol</th>
                          <th className="py-2 px-3 font-medium text-right">Vol</th>
                          <th className="py-2 px-3 font-medium text-right">Drawdown</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationRisk.riskRows.slice(0, 8).map((row) => (
                          <tr key={row.symbol} className="border-t border-slate-800/80">
                            <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">
                              {formatPercent(row.allocationWeight)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-100">
                              {formatPercent(row.riskContribution)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                              {formatPercent(row.weightedVolatility)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-amber-200">
                              {formatPercent(row.annualizedVolatility)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-300">
                              {formatPercent(row.maxDrawdown)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">再平衡交易草稿</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        輸入現有持倉金額後，依模型目標權重估算買賣差額
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[150px_auto] gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-slate-500">偏離門檻</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={Number((rebalanceThreshold * 100).toFixed(2))}
                          onChange={(event) => setRebalanceThreshold(Math.min(0.2, Math.max(0, (Number(event.target.value) || 0) / 100)))}
                          className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                        />
                      </label>
                      <button
                        onClick={handleExportRebalanceDraftCsv}
                        disabled={!rebalanceRows.length}
                        className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                      >
                        再平衡 CSV
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={currentHoldingsText}
                    onChange={(event) => setCurrentHoldingsText(event.target.value)}
                    rows={4}
                    placeholder={"0050.TW 300000\nSPY 250000\nQQQ 200000"}
                    className="w-full resize-y rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>每行一檔：商品代號 金額；也可用逗號分隔</span>
                    <span className="font-mono">
                      {rebalanceRows.length} rows · {formatPercent(rebalanceThreshold)}
                    </span>
                  </div>

                  {rebalanceRows.length ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {[
                          ["需交易", `${activeRebalanceRows.length} 檔`],
                          [
                            "買入金額",
                            formatCurrency(
                              activeRebalanceRows
                                .filter((row) => row.direction === "buy")
                                .reduce((sum, row) => sum + row.tradeAmount, 0),
                            ),
                          ],
                          [
                            "賣出金額",
                            formatCurrency(
                              activeRebalanceRows
                                .filter((row) => row.direction === "sell")
                                .reduce((sum, row) => sum + Math.abs(row.tradeAmount), 0),
                            ),
                          ],
                          [
                            "最大偏離",
                            rebalanceRows.length
                              ? `${rebalanceRows[0].symbol} · ${formatPercent(rebalanceRows[0].tradeWeight)}`
                              : "--",
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                            <p className="text-[11px] text-slate-600 truncate">{label}</p>
                            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70">
                        <table className="w-full min-w-[920px] text-xs">
                          <thead>
                            <tr className="text-left text-[11px] text-slate-600">
                              <th className="py-2 px-3 font-medium">Symbol</th>
                              <th className="py-2 px-3 font-medium text-right">Current</th>
                              <th className="py-2 px-3 font-medium text-right">Target</th>
                              <th className="py-2 px-3 font-medium text-right">Trade</th>
                              <th className="py-2 px-3 font-medium text-right">Current W</th>
                              <th className="py-2 px-3 font-medium text-right">Target W</th>
                              <th className="py-2 px-3 font-medium text-right">Drift</th>
                              <th className="py-2 px-3 font-medium text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rebalanceRows.slice(0, 12).map((row) => (
                              <tr key={row.symbol} className="border-t border-slate-800/80">
                                <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                                <td className="py-2 px-3 text-right font-mono text-slate-300">
                                  {formatCurrency(row.currentAmount)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-300">
                                  {formatCurrency(row.targetAmount)}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono ${
                                    row.tradeAmount < 0 ? "text-rose-300" : row.tradeAmount > 0 ? "text-emerald-300" : "text-slate-400"
                                  }`}
                                >
                                  {formatCurrency(row.tradeAmount)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-400">
                                  {formatPercent(row.currentWeight)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-400">
                                  {formatPercent(row.targetWeight)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-300">
                                  {formatPercent(row.tradeWeight)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                                    {rebalanceDirectionLabel(row.direction)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3 space-y-3">
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-100">交易執行清單</h5>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              再用最小交易金額過濾，形成可交給人工覆核的交易清單
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[170px_auto] gap-2 text-xs">
                            <label className="space-y-1">
                              <span className="text-slate-500">最小交易金額</span>
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={minimumTradeAmount}
                                onChange={(event) => setMinimumTradeAmount(Math.max(0, Number(event.target.value) || 0))}
                                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                              />
                            </label>
                            <button
                              onClick={handleExportTradeTicketCsv}
                              disabled={!tradeTickets.length}
                              className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                            >
                              交易 CSV
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {[
                            ["可執行", `${tradeTickets.length} 檔`],
                            ["低於門檻", `${Math.max(0, skippedTradeCount)} 檔`],
                            [
                              "買入合計",
                              formatCurrency(
                                tradeTickets
                                  .filter((row) => row.direction === "buy")
                                  .reduce((sum, row) => sum + row.ticketAmount, 0),
                              ),
                            ],
                            [
                              "現金淨額",
                              formatCurrency(tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0)),
                            ],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                              <p className="text-[11px] text-slate-600 truncate">{label}</p>
                              <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {tradeTickets.length ? (
                          <div className="overflow-x-auto rounded-md border border-slate-800">
                            <table className="w-full min-w-[860px] text-xs">
                              <thead>
                                <tr className="text-left text-[11px] text-slate-600">
                                  <th className="py-2 px-3 font-medium">Symbol</th>
                                  <th className="py-2 px-3 font-medium text-right">Action</th>
                                  <th className="py-2 px-3 font-medium text-right">Amount</th>
                                  <th className="py-2 px-3 font-medium text-right">Cash</th>
                                  <th className="py-2 px-3 font-medium text-right">Drift</th>
                                  <th className="py-2 px-3 font-medium text-right">Score</th>
                                  <th className="py-2 px-3 font-medium">Note</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tradeTickets.slice(0, 12).map((row) => (
                                  <tr key={row.symbol} className="border-t border-slate-800/80">
                                    <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                                        {rebalanceDirectionLabel(row.direction)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-100">
                                      {formatCurrency(row.ticketAmount)}
                                    </td>
                                    <td
                                      className={`py-2 px-3 text-right font-mono ${
                                        row.cashImpact < 0 ? "text-rose-300" : "text-emerald-300"
                                      }`}
                                    >
                                      {formatCurrency(row.cashImpact)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                                      {formatPercent(row.tradeWeight)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                                      {row.score ?? "--"}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500">{row.ticketNote}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
                            目前沒有超過最小交易金額的買賣項目。
                          </div>
                        )}
                      </section>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                      輸入現有持倉後，這裡會顯示目標金額、買賣差額與偏離門檻判斷。
                    </div>
                  )}
                </div>
              </section>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Symbol</th>
                      <th className="py-2 px-3 font-medium text-right">Score</th>
                      <th className="py-2 px-3 font-medium">Latest</th>
                      <th className="py-2 px-3 font-medium text-right">Rows</th>
                      <th className="py-2 px-3 font-medium text-right">Price</th>
                      <th className="py-2 px-3 font-medium text-right">Total</th>
                      <th className="py-2 px-3 font-medium text-right">Ann. Return</th>
                      <th className="py-2 px-3 font-medium text-right">Vol</th>
                      <th className="py-2 px-3 font-medium text-right">Drawdown</th>
                      <th className="py-2 px-3 font-medium text-right">RA Return</th>
                      <th className="py-2 px-3 font-medium text-right">Signal</th>
                      <th className="py-2 pl-3 font-medium text-right">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleComparisonRows.map((row) => (
                        <tr key={row.symbol} className="border-t border-slate-900">
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => handleLoadAssetProfile(row.symbol)}
                              className="font-bold text-cyan-200 hover:text-cyan-100"
                            >
                              {row.symbol}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`inline-flex min-w-10 justify-center rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                                row.score >= 70
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : row.score >= 55
                                    ? "bg-amber-500/15 text-amber-200"
                                    : "bg-rose-500/15 text-rose-200"
                              }`}
                            >
                              {row.score}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">
                            {row.latestDate ?? "--"}
                            <span className="ml-2 text-slate-600">
                              {row.freshnessDays === null ? "" : `${row.freshnessDays}d`}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">{formatCount(row.rowCount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPrice(row.latestPrice)}</td>
                          <td
                            className={`py-2 px-3 text-right font-mono ${
                              typeof row.totalReturn === "number" && row.totalReturn < 0 ? "text-rose-300" : "text-emerald-300"
                            }`}
                          >
                            {formatPercent(row.totalReturn)}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-mono ${
                              typeof row.annualizedReturn === "number" && row.annualizedReturn < 0
                                ? "text-rose-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {formatPercent(row.annualizedReturn)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-200">
                            {formatPercent(row.annualizedVolatility)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-300">
                            {formatPercent(row.maxDrawdown)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            {typeof row.riskAdjustedReturn === "number" ? row.riskAdjustedReturn.toFixed(2) : "--"}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalClass(row.signal)}`}
                              title={row.signalNote}
                            >
                              {decisionSignalLabel(row.signal)}
                            </span>
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(row.qualityStatus)}`}>
                              {qualityLabel(row.qualityStatus)}
                            </span>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              輸入多個商品代號後，這裡會顯示 watchlist 橫向比較。
            </div>
          )}
        </section>

        {isLoading && (
          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
            市場資料源盤點讀取中...
          </div>
        )}

        {error && (
          <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4 text-sm text-red-300 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sources.map((source) => {
              const meta = statusMeta[source.status];

              return (
                <article key={source.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{source.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {source.provider} · {source.category}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-1 rounded border font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">目前資料位置</dt>
                      <dd className="text-slate-300 mt-0.5">{source.currentStorage}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">整合路徑</dt>
                      <dd className="text-cyan-200 mt-0.5">{source.integrationPath}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">下一步</dt>
                      <dd className="text-amber-200 mt-0.5">{source.nextAction}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {data?.securityNotes.length ? (
        <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl">
          <h3 className="text-sm font-bold text-amber-300 border-b border-slate-800 pb-3 mb-3">
            ▍ 上線安全檢查
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {data.securityNotes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="text-amber-400">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <BigQueryPortfolioPanel hasBigQueryCredentials={hasBigQueryCredentials} />
    </div>
  );
}
