"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { analyzePortfolioFromBigQuery, fetchBigQueryAssets, optimizePortfolioFromBigQuery } from "@/lib/marketApi";
import type { BigQueryAsset, PortfolioAnalysisResponse, PortfolioOptimizationResponse } from "@/types/market";

type AssetRow = {
  id: string;
  symbol: string;
  weight: number;
  currency: string;
};

type BigQueryPortfolioPanelProps = {
  hasBigQueryCredentials: boolean;
};

type SavedPortfolioPreset = {
  id: string;
  name: string;
  rows: Array<Pick<AssetRow, "symbol" | "weight" | "currency">>;
  portfolioValue?: number;
  transactionCostBps?: number;
  minTradeAmount?: number;
  benchmarkSymbol: string;
  startDate: string;
  endDate: string;
  priceBasis: "adjusted" | "raw";
  pricingCurrency: "original" | "TWD";
  mode: "overlap" | "long_rebuild";
  optimizationMode: "max_sharpe" | "min_vol" | "max_return" | "target_vol";
  targetVolatility: number;
  updatedAt: string;
};

type PortfolioResult = PortfolioAnalysisResponse | PortfolioOptimizationResponse;

type RebalanceRecommendation = {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  tradeAmount: number;
  estimatedCost: number;
  action: "increase" | "decrease" | "hold" | "skip";
};

type RebalanceSummary = {
  totalBuy: number;
  totalSell: number;
  netCashFlow: number;
  turnover: number | null;
  totalEstimatedCost: number;
};

type ModeComparisonResult = {
  overlap: PortfolioAnalysisResponse;
  longRebuild: PortfolioAnalysisResponse;
};

type DecisionSignal = {
  label: string;
  value: string;
  status: "strong" | "watch" | "risk" | "neutral";
  note: string;
};

type InputCheck = {
  label: string;
  value: string;
  status: "strong" | "watch" | "risk" | "neutral";
  note: string;
};

type AllocationInsight = InputCheck;

type AllocationExposureRow = {
  label: string;
  value: number;
};

type ExportedPortfolioPayload = {
  exportedAt?: string;
  presetName?: string;
  configuration?: {
    rows?: Array<{
      symbol?: string;
      weight?: number;
      currency?: string;
    }>;
    portfolioValue?: number;
    transactionCostBps?: number;
    minTradeAmount?: number;
    benchmarkSymbol?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    priceBasis?: "adjusted" | "raw";
    pricingCurrency?: "original" | "TWD";
    mode?: "overlap" | "long_rebuild";
    optimizationMode?: "max_sharpe" | "min_vol" | "max_return" | "target_vol";
    targetVolatility?: number;
  };
  result?: PortfolioResult;
  rebalancing?: RebalanceRecommendation[];
  decisionSignals?: DecisionSignal[];
  inputChecks?: InputCheck[];
  allocationInsights?: AllocationInsight[];
  allocationExposures?: {
    currencies?: AllocationExposureRow[];
    holdings?: AllocationExposureRow[];
  };
};

type StoredPortfolioSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  payload: ExportedPortfolioPayload;
};

const initialRows: AssetRow[] = [
  { id: "asset-0050", symbol: "0050.TW", weight: 50, currency: "TWD" },
  { id: "asset-spy", symbol: "SPDR S&P500 ETF", weight: 50, currency: "USD" },
];

const assetOptionListId = "bigquery-asset-symbol-options";
const presetStorageKey = "wealth-dashboard.bigqueryPortfolioPresets";
const snapshotStorageKey = "wealth-dashboard.bigqueryPortfolioSnapshots";
const defaultPortfolioValue = 1_000_000;
const defaultTransactionCostBps = 10;
const defaultMinTradeAmount = 1_000;

const moneyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
});

type PortfolioMetricCard = {
  key: keyof PortfolioAnalysisResponse["metrics"];
  label: string;
  kind: "percent" | "number";
};

const metricGroups: Array<{
  title: string;
  subtitle: string;
  cards: PortfolioMetricCard[];
}> = [
  {
    title: "報酬與總風險",
    subtitle: "看組合整體有沒有賺，以及波動大小",
    cards: [
      { key: "cumulativeReturn", label: "累積報酬", kind: "percent" },
      { key: "cagr", label: "CAGR", kind: "percent" },
      { key: "annualVolatility", label: "年化波動", kind: "percent" },
      { key: "confidenceLowerBound", label: "信賴下緣", kind: "percent" },
    ],
  },
  {
    title: "風險效率",
    subtitle: "看每承擔一份風險，換到多少報酬",
    cards: [
      { key: "sharpe", label: "Sharpe", kind: "number" },
      { key: "sortino", label: "Sortino", kind: "number" },
      { key: "maxDrawdown", label: "最大回撤", kind: "percent" },
      { key: "downsideDeviation", label: "下檔波動", kind: "percent" },
    ],
  },
  {
    title: "市場連動",
    subtitle: "看組合跟基準指標的同步程度",
    cards: [
      { key: "beta", label: "Beta", kind: "number" },
      { key: "rSquared", label: "R-Squared", kind: "number" },
      { key: "treynor", label: "Treynor", kind: "number" },
      { key: "informationRatio", label: "Info Ratio", kind: "number" },
    ],
  },
  {
    title: "主動能力與尾端風險",
    subtitle: "看超額報酬、偏態與極端波動",
    cards: [
      { key: "alpha", label: "Alpha", kind: "percent" },
      { key: "appraisalRatio", label: "Appraisal", kind: "number" },
      { key: "skewness", label: "Skewness", kind: "number" },
      { key: "kurtosis", label: "Kurtosis", kind: "number" },
    ],
  },
];

const comparisonMetricCards = metricGroups.flatMap((group) => group.cards);
const snapshotMetricCards: PortfolioMetricCard[] = [
  { key: "cagr", label: "CAGR", kind: "percent" },
  { key: "annualVolatility", label: "年化波動", kind: "percent" },
  { key: "sharpe", label: "Sharpe", kind: "number" },
  { key: "maxDrawdown", label: "最大回撤", kind: "percent" },
];

function makeRow(): AssetRow {
  return {
    id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol: "",
    weight: 0,
    currency: "USD",
  };
}

function makePresetRow(row: Pick<AssetRow, "symbol" | "weight" | "currency">): AssetRow {
  return {
    id: `asset-${row.symbol || "preset"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol: row.symbol,
    weight: row.weight,
    currency: row.currency,
  };
}

function loadPresetsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(presetStorageKey) || "[]");
    return Array.isArray(parsed) ? (parsed as SavedPortfolioPreset[]) : [];
  } catch {
    return [];
  }
}

function writePresetsToStorage(presets: SavedPortfolioPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(presetStorageKey, JSON.stringify(presets));
}

function loadSnapshotsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(snapshotStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is StoredPortfolioSnapshot => {
      if (!item || typeof item !== "object") return false;
      const snapshot = item as Partial<StoredPortfolioSnapshot>;
      return (
        typeof snapshot.id === "string" &&
        typeof snapshot.name === "string" &&
        typeof snapshot.createdAt === "string" &&
        Boolean(snapshot.payload && typeof snapshot.payload === "object")
      );
    });
  } catch {
    return [];
  }
}

function writeSnapshotsToStorage(snapshots: StoredPortfolioSnapshot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(snapshotStorageKey, JSON.stringify(snapshots));
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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

function wealthPathCsv(result: PortfolioResult) {
  const header = ["date", "wealth_index", "daily_return"];
  const rows = result.wealthPath.map((point) => [point.date, point.value, point.dailyReturn]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function assetStatisticsCsv(result: PortfolioResult) {
  const contributionBySymbol = new Map((result.riskContributions ?? []).map((item) => [item.symbol, item]));
  const header = [
    "symbol",
    "annual_return",
    "annual_volatility",
    "weight",
    "marginal_risk",
    "risk_contribution",
    "risk_contribution_percent",
  ];
  const rows = result.assetStatistics.map((asset) => {
    const contribution = contributionBySymbol.get(asset.symbol);
    return [
      asset.symbol,
      asset.annualReturn,
      asset.annualVolatility,
      contribution?.weight,
      contribution?.marginalRisk,
      contribution?.riskContribution,
      contribution?.riskContributionPercent,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function rebalancingCsv(rows: RebalanceRecommendation[]) {
  const header = [
    "symbol",
    "current_weight",
    "target_weight",
    "delta_weight",
    "trade_amount_twd",
    "estimated_cost_twd",
    "action",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.currentWeight,
    row.targetWeight,
    row.deltaWeight,
    row.tradeAmount,
    row.estimatedCost,
    row.action,
  ]);
  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function formatMetric(value: number | null, kind: "percent" | "number") {
  if (value === null || !Number.isFinite(value)) return "--";
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}

function formatMetricDelta(value: number | null, kind: "percent" | "number") {
  if (value === null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  if (kind === "percent") return `${sign}${(value * 100).toFixed(2)}%`;
  return `${sign}${value.toFixed(2)}`;
}

function metricDeltaClass(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "text-slate-500";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function decisionSignalClass(status: DecisionSignal["status"]) {
  if (status === "strong") return "border-emerald-500/20 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/25 bg-amber-950/10";
  if (status === "risk") return "border-rose-500/25 bg-rose-950/10";
  return "border-slate-800 bg-slate-950";
}

function decisionSignalBadgeClass(status: DecisionSignal["status"]) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function decisionSignalStatusLabel(status: DecisionSignal["status"]) {
  if (status === "strong") return "穩健";
  if (status === "watch") return "觀察";
  if (status === "risk") return "風險";
  return "中性";
}

function inputCheckStatusLabel(status: InputCheck["status"]) {
  if (status === "strong") return "通過";
  if (status === "watch") return "檢查";
  if (status === "risk") return "修正";
  return "資訊";
}

function buildDecisionSignals(
  result: PortfolioResult,
  riskRows: Array<{ symbol: string; riskContributionPercent?: number | null }>,
) {
  const metrics = result.metrics;
  const signals: DecisionSignal[] = [];

  if (isFiniteNumber(metrics.cagr)) {
    const status = metrics.cagr >= 0.08 ? "strong" : metrics.cagr >= 0 ? "watch" : "risk";
    signals.push({
      label: "年化報酬",
      value: formatMetric(metrics.cagr, "percent"),
      status,
      note: status === "strong" ? "長期成長力較明確" : status === "watch" ? "正報酬，但還要看波動" : "回測期間未形成正成長",
    });
  }

  if (isFiniteNumber(metrics.sharpe)) {
    const status = metrics.sharpe >= 1 ? "strong" : metrics.sharpe >= 0.4 ? "watch" : "risk";
    signals.push({
      label: "報酬效率",
      value: formatMetric(metrics.sharpe, "number"),
      status,
      note: status === "strong" ? "每承擔一份風險的報酬較好" : status === "watch" ? "效率普通，適合和替代組合比較" : "風險補償偏低",
    });
  }

  if (isFiniteNumber(metrics.maxDrawdown)) {
    const drawdown = Math.abs(metrics.maxDrawdown);
    const status = drawdown >= 0.3 ? "risk" : drawdown >= 0.15 ? "watch" : "strong";
    signals.push({
      label: "最大回撤",
      value: formatMetric(metrics.maxDrawdown, "percent"),
      status,
      note: status === "strong" ? "歷史下跌幅度相對可控" : status === "watch" ? "需要預留心理與現金緩衝" : "極端下跌壓力偏高",
    });
  }

  if (isFiniteNumber(metrics.confidenceLowerBound)) {
    const status = metrics.confidenceLowerBound <= -0.2 ? "risk" : metrics.confidenceLowerBound <= -0.08 ? "watch" : "strong";
    signals.push({
      label: "信賴下緣",
      value: formatMetric(metrics.confidenceLowerBound, "percent"),
      status,
      note: status === "strong" ? "壞情境壓力較低" : status === "watch" ? "壞情境需要納入資金規劃" : "壞情境下損失可能偏大",
    });
  }

  const observations = result.dataWindow.observations;
  if (Number.isFinite(observations)) {
    const status = observations >= 756 ? "strong" : observations >= 252 ? "watch" : "risk";
    signals.push({
      label: "資料期間",
      value: `${observations.toLocaleString("zh-TW")} 筆`,
      status,
      note: status === "strong" ? "樣本較充足" : status === "watch" ? "樣本可用，但仍需小心解讀" : "樣本偏少，結果容易失真",
    });
  }

  const topRisk = riskRows.find((row) => isFiniteNumber(row.riskContributionPercent));
  if (topRisk && isFiniteNumber(topRisk.riskContributionPercent)) {
    const concentration = Math.abs(topRisk.riskContributionPercent);
    const status = concentration >= 0.5 ? "risk" : concentration >= 0.35 ? "watch" : "strong";
    signals.push({
      label: "風險集中",
      value: `${topRisk.symbol} ${formatMetric(concentration, "percent")}`,
      status,
      note: status === "strong" ? "風險來源分散度較好" : status === "watch" ? "主要風險來源需要追蹤" : "單一資產主導組合風險",
    });
  }

  return signals;
}

function daysBetween(startDate: string, endDate: string) {
  if (!startDate || !endDate) return null;
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return Math.floor((endTime - startTime) / 86400000);
}

function formatSignedWeightDelta(value: number) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}pp`;
}

function formatMoney(value: number, signed = false) {
  if (!Number.isFinite(value)) return "--";
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}TWD ${moneyFormatter.format(Math.abs(value))}`;
}

function normalizePortfolioValue(value: unknown, fallback = defaultPortfolioValue) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function normalizeTransactionCostBps(value: unknown, fallback = defaultTransactionCostBps) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function normalizeMinTradeAmount(value: unknown, fallback = defaultMinTradeAmount) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function estimateTradeCost(tradeAmount: number, transactionCostBps: number) {
  if (!Number.isFinite(tradeAmount) || !Number.isFinite(transactionCostBps)) return 0;
  return Math.abs(tradeAmount) * (transactionCostBps / 10000);
}

function rebalanceAction(deltaWeight: number, tradeAmount: number, minTradeAmount: number): RebalanceRecommendation["action"] {
  if (Math.abs(deltaWeight) < 0.0005) return "hold";
  if (Math.abs(tradeAmount) < minTradeAmount) return "skip";
  return deltaWeight > 0 ? "increase" : "decrease";
}

function rebalanceActionLabel(action: RebalanceRecommendation["action"]) {
  if (action === "increase") return "加碼";
  if (action === "decrease") return "減碼";
  if (action === "skip") return "略過";
  return "維持";
}

function rebalanceActionClass(action: RebalanceRecommendation["action"]) {
  if (action === "increase") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (action === "decrease") return "text-rose-300 bg-rose-500/10 border-rose-500/30";
  if (action === "skip") return "text-slate-400 bg-slate-900 border-slate-700";
  return "text-slate-300 bg-slate-800 border-slate-700";
}

function rebalanceBarWidth(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.min(Math.abs(value) * 100, 100).toFixed(1)}%`;
}

function summarizeRebalance(rows: RebalanceRecommendation[], portfolioValue: number): RebalanceSummary {
  const executableRows = rows.filter((row) => row.action === "increase" || row.action === "decrease");
  const totalBuy = executableRows.reduce((sum, row) => sum + Math.max(row.tradeAmount, 0), 0);
  const totalSell = executableRows.reduce((sum, row) => sum + Math.max(-row.tradeAmount, 0), 0);
  const totalEstimatedCost = executableRows.reduce(
    (sum, row) => sum + (Number.isFinite(row.estimatedCost) ? row.estimatedCost : 0),
    0,
  );

  return {
    totalBuy,
    totalSell,
    netCashFlow: totalBuy - totalSell,
    turnover: portfolioValue > 0 ? (totalBuy + totalSell) / (2 * portfolioValue) : null,
    totalEstimatedCost,
  };
}

function riskContributionBarWidth(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0%";
  return `${Math.min(Math.abs(value) * 100, 100).toFixed(1)}%`;
}

function formatCorrelation(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function correlationCellClass(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "bg-slate-900 text-slate-600 border-slate-800";
  }
  if (value >= 0.75) return "bg-red-500/20 text-red-200 border-red-500/30";
  if (value >= 0.4) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (value <= -0.4) return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  return "bg-slate-900 text-slate-300 border-slate-800";
}

function formatChartNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "--";
}

function formatChartPercent(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)}%` : "--";
}

function formatChartDate(value: unknown) {
  if (typeof value !== "string" || value.length < 7) return "--";
  return value.slice(2, 7).replace("-", "/");
}

function formatShortSymbol(value: unknown) {
  const text = String(value ?? "");
  return text.length > 12 ? `${text.slice(0, 10)}…` : text;
}

function inferSymbolCurrency(symbol: string) {
  return symbol.trim().toUpperCase().endsWith(".TW") ? "TWD" : "USD";
}

function isPortfolioResult(value: unknown): value is PortfolioResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortfolioResult>;
  return Boolean(candidate.metrics && candidate.dataWindow && Array.isArray(candidate.wealthPath));
}

function importedWeightToPercent(weight: unknown) {
  const numeric = Number(weight);
  if (!Number.isFinite(numeric)) return 0;
  return Math.abs(numeric) <= 1 ? Number((numeric * 100).toFixed(2)) : numeric;
}

function parseWeightCell(weight: unknown) {
  const text = String(weight ?? "").trim();
  if (!text) return 0;

  if (text.endsWith("%")) {
    const numeric = Number(text.slice(0, -1));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  return importedWeightToPercent(text);
}

function splitConfigurationLine(line: string) {
  const delimiter = line.includes("\t") ? "\t" : ",";
  return line.split(delimiter).map((cell) => cell.trim());
}

function isConfigurationHeader(cells: string[]) {
  const normalizedCells = cells.map((cell) => cell.trim().toLowerCase());
  return normalizedCells.some((cell) =>
    ["symbol", "ticker", "weight", "weight_percent", "currency"].includes(cell),
  );
}

function parsePastedConfiguration(text: string): Array<Pick<AssetRow, "symbol" | "weight" | "currency">> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.flatMap((line, index) => {
    const cells = splitConfigurationLine(line);
    if (index === 0 && isConfigurationHeader(cells)) return [];

    const [symbolRaw, weightRaw, currencyRaw] = cells;
    const symbol = symbolRaw?.trim();
    if (!symbol) return [];

    return [
      {
        symbol,
        weight: parseWeightCell(weightRaw),
        currency: currencyRaw?.trim().toUpperCase() || inferSymbolCurrency(symbol),
      },
    ];
  });
}

function configurationCsv(rows: AssetRow[]) {
  const header = ["symbol", "weight_percent", "currency"];
  const dataRows = rows.map((row) => [
    row.symbol.trim(),
    (Number(row.weight) || 0).toFixed(2),
    row.currency.trim().toUpperCase() || inferSymbolCurrency(row.symbol),
  ]);
  return [header, ...dataRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function allocationSummaryCsv(
  insights: AllocationInsight[],
  currencyRows: AllocationExposureRow[],
  holdingRows: AllocationExposureRow[],
) {
  const rows = [
    ["section", "label", "value", "status", "note"],
    ...insights.map((insight) => ["summary", insight.label, insight.value, insight.status, insight.note]),
    ...currencyRows.map((row) => ["currency", row.label, row.value, "", ""]),
    ...holdingRows.map((row) => ["holding", row.label, row.value, "", ""]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function applyTradeAssumptions(
  rows: RebalanceRecommendation[],
  portfolioValue: number,
  transactionCostBps: number,
  minTradeAmount: number,
) {
  return rows.map((row) => ({
    ...row,
    ...tradeFieldsFor(row.deltaWeight, portfolioValue, transactionCostBps, minTradeAmount),
  }));
}

function tradeFieldsFor(
  deltaWeight: number,
  portfolioValue: number,
  transactionCostBps: number,
  minTradeAmount: number,
) {
  const tradeAmount = deltaWeight * portfolioValue;
  const action = rebalanceAction(deltaWeight, tradeAmount, minTradeAmount);
  return {
    tradeAmount,
    estimatedCost: action === "increase" || action === "decrease" ? estimateTradeCost(tradeAmount, transactionCostBps) : 0,
    action,
  };
}

function buildRebalanceRows(
  currentRows: Array<Pick<AssetRow, "symbol" | "weight">>,
  targetRows: PortfolioOptimizationResponse["weights"],
  portfolioValue: number,
  transactionCostBps: number,
  minTradeAmount: number,
) {
  const totalWeight = currentRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  const currentBySymbol = new Map(
    currentRows.map((row) => [
      row.symbol.trim(),
      totalWeight > 0 ? (Number(row.weight) || 0) / totalWeight : 0,
    ]),
  );

  return targetRows.map((targetRow) => {
    const targetWeight = Number(targetRow.weight) || 0;
    const currentWeight = currentBySymbol.get(targetRow.symbol) ?? 0;
    const deltaWeight = targetWeight - currentWeight;
    return {
      symbol: targetRow.symbol,
      currentWeight,
      targetWeight,
      deltaWeight,
      ...tradeFieldsFor(deltaWeight, portfolioValue, transactionCostBps, minTradeAmount),
    };
  });
}

function normalizeRebalanceRows(
  value: unknown,
  portfolioValue: number,
  transactionCostBps: number,
  minTradeAmount: number,
) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Partial<RebalanceRecommendation>;
    if (typeof item.symbol !== "string" || !item.symbol.trim()) return [];

    const currentWeight = Number(item.currentWeight);
    const targetWeight = Number(item.targetWeight);
    const deltaWeight = Number.isFinite(Number(item.deltaWeight)) ? Number(item.deltaWeight) : targetWeight - currentWeight;
    if (!Number.isFinite(currentWeight) || !Number.isFinite(targetWeight) || !Number.isFinite(deltaWeight)) return [];

    return [
      {
        symbol: item.symbol.trim(),
        currentWeight,
        targetWeight,
        deltaWeight,
        ...tradeFieldsFor(deltaWeight, portfolioValue, transactionCostBps, minTradeAmount),
      },
    ];
  });
}

export function BigQueryPortfolioPanel({ hasBigQueryCredentials }: BigQueryPortfolioPanelProps) {
  const [rows, setRows] = useState<AssetRow[]>(initialRows);
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("0050.TW");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priceBasis, setPriceBasis] = useState<"adjusted" | "raw">("adjusted");
  const [pricingCurrency, setPricingCurrency] = useState<"original" | "TWD">("TWD");
  const [mode, setMode] = useState<"overlap" | "long_rebuild">("overlap");
  const [optimizationMode, setOptimizationMode] = useState<"max_sharpe" | "min_vol" | "max_return" | "target_vol">(
    "max_sharpe",
  );
  const [targetVolatility, setTargetVolatility] = useState(12);
  const [portfolioValue, setPortfolioValue] = useState(defaultPortfolioValue);
  const [transactionCostBps, setTransactionCostBps] = useState(defaultTransactionCostBps);
  const [minTradeAmount, setMinTradeAmount] = useState(defaultMinTradeAmount);
  const [result, setResult] = useState<PortfolioAnalysisResponse | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<PortfolioOptimizationResponse | null>(null);
  const [modeComparisonResult, setModeComparisonResult] = useState<ModeComparisonResult | null>(null);
  const [rebalanceRows, setRebalanceRows] = useState<RebalanceRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [symbolCopyStatus, setSymbolCopyStatus] = useState<"idle" | "copied">("idle");
  const [configCopyStatus, setConfigCopyStatus] = useState<"idle" | "copied">("idle");
  const [bulkConfigText, setBulkConfigText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isComparingModes, setIsComparingModes] = useState(false);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetSuggestions, setAssetSuggestions] = useState<BigQueryAsset[]>([]);
  const [assetSearchError, setAssetSearchError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [presetName, setPresetName] = useState("核心配置");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedPortfolioPreset[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [savedSnapshots, setSavedSnapshots] = useState<StoredPortfolioSnapshot[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0),
    [rows],
  );
  const allocationRows = useMemo(() => {
    const activeAssetRows = rows.filter((row) => row.symbol.trim());
    const positiveTotalWeight = activeAssetRows.reduce(
      (sum, row) => sum + Math.max(Number(row.weight) || 0, 0),
      0,
    );

    return activeAssetRows
      .map((row) => {
        const positiveWeight = Math.max(Number(row.weight) || 0, 0);
        return {
          label: row.symbol.trim(),
          value: positiveTotalWeight > 0 ? positiveWeight / positiveTotalWeight : 0,
        };
      })
      .sort((left, right) => right.value - left.value);
  }, [rows]);
  const currencyExposureRows = useMemo(() => {
    const exposures = new Map<string, number>();

    rows.forEach((row) => {
      if (!row.symbol.trim()) return;
      const currency = row.currency.trim().toUpperCase() || inferSymbolCurrency(row.symbol);
      const positiveWeight = Math.max(Number(row.weight) || 0, 0);
      exposures.set(currency, (exposures.get(currency) ?? 0) + positiveWeight);
    });

    const totalPositiveWeight = [...exposures.values()].reduce((sum, value) => sum + value, 0);
    return [...exposures.entries()]
      .map(([label, value]) => ({
        label,
        value: totalPositiveWeight > 0 ? value / totalPositiveWeight : 0,
      }))
      .sort((left, right) => right.value - left.value);
  }, [rows]);
  const allocationInsights = useMemo(() => {
    const activeCount = allocationRows.length;
    const topHolding = allocationRows[0];
    const topThreeWeight = allocationRows.slice(0, 3).reduce((sum, row) => sum + row.value, 0);
    const hhi = allocationRows.reduce((sum, row) => sum + row.value ** 2, 0);
    const mainCurrency = currencyExposureRows[0];
    const insights: AllocationInsight[] = [
      {
        label: "有效商品",
        value: `${activeCount} 檔`,
        status: activeCount >= 6 ? "strong" : activeCount >= 3 ? "watch" : activeCount > 0 ? "risk" : "neutral",
        note:
          activeCount >= 6
            ? "商品數具備基本分散度"
            : activeCount >= 3
              ? "商品數可用，但還有集中風險"
              : activeCount > 0
                ? "商品數偏少，容易被單一資產主導"
                : "尚未輸入商品",
      },
      {
        label: "最大持倉",
        value: topHolding ? `${topHolding.label} ${formatMetric(topHolding.value, "percent")}` : "--",
        status: !topHolding ? "neutral" : topHolding.value >= 0.4 ? "risk" : topHolding.value >= 0.25 ? "watch" : "strong",
        note:
          !topHolding
            ? "尚無有效持倉"
            : topHolding.value >= 0.4
              ? "單一商品占比偏高"
              : topHolding.value >= 0.25
                ? "最大持倉需要持續追蹤"
                : "最大持倉占比相對可控",
      },
      {
        label: "前三大權重",
        value: activeCount ? formatMetric(topThreeWeight, "percent") : "--",
        status: !activeCount ? "neutral" : topThreeWeight >= 0.8 ? "risk" : topThreeWeight >= 0.65 ? "watch" : "strong",
        note: !activeCount ? "尚無有效持倉" : topThreeWeight >= 0.8 ? "前三大過度主導配置" : topThreeWeight >= 0.65 ? "前三大集中度偏高" : "前幾大持倉分散度尚可",
      },
      {
        label: "HHI 集中度",
        value: activeCount ? hhi.toFixed(2) : "--",
        status: !activeCount ? "neutral" : hhi >= 0.35 ? "risk" : hhi >= 0.22 ? "watch" : "strong",
        note: !activeCount ? "尚無有效權重" : hhi >= 0.35 ? "整體配置集中度偏高" : hhi >= 0.22 ? "有一定集中度，適合和風險貢獻一起看" : "配置集中度較低",
      },
      {
        label: "主要幣別",
        value: mainCurrency ? `${mainCurrency.label} ${formatMetric(mainCurrency.value, "percent")}` : "--",
        status: !mainCurrency ? "neutral" : mainCurrency.value >= 0.85 ? "risk" : mainCurrency.value >= 0.7 ? "watch" : "strong",
        note:
          !mainCurrency
            ? "尚無幣別曝險"
            : mainCurrency.value >= 0.85
              ? "幣別曝險高度集中"
              : mainCurrency.value >= 0.7
                ? "主要幣別占比較高"
                : "幣別曝險較分散",
      },
    ];

    return insights;
  }, [allocationRows, currencyExposureRows]);
  const inputChecks = useMemo(() => {
    const activeAssetRows = rows.filter((row) => row.symbol.trim());
    const normalizedSymbols = activeAssetRows.map((row) => row.symbol.trim().toUpperCase());
    const duplicateSymbols = [...new Set(normalizedSymbols.filter((symbol, index) => normalizedSymbols.indexOf(symbol) !== index))];
    const negativeWeightSymbols = activeAssetRows
      .filter((row) => (Number(row.weight) || 0) < 0)
      .map((row) => row.symbol.trim());
    const weightGap = Math.abs(totalWeight - 100);
    const dateSpan = daysBetween(startDate, endDate);
    const checks: InputCheck[] = [
      {
        label: "商品數",
        value: `${activeAssetRows.length} 檔`,
        status: activeAssetRows.length >= 2 ? "strong" : activeAssetRows.length === 1 ? "watch" : "risk",
        note:
          activeAssetRows.length >= 2
            ? "可進行組合分散分析"
            : activeAssetRows.length === 1
              ? "單一商品只能看自身表現"
              : "至少需要一個商品",
      },
      {
        label: "權重總和",
        value: `${totalWeight.toFixed(1)}%`,
        status: weightGap < 0.01 ? "strong" : weightGap <= 5 ? "watch" : "risk",
        note: weightGap < 0.01 ? "權重已對齊 100%" : weightGap <= 5 ? "偏離不大，但建議修正" : "偏離過大，分析結果會失真",
      },
      {
        label: "重複代號",
        value: duplicateSymbols.length ? duplicateSymbols.join(", ") : "無",
        status: duplicateSymbols.length ? "risk" : "strong",
        note: duplicateSymbols.length ? "同一商品重複輸入會讓權重失真" : "未發現重複商品",
      },
      {
        label: "負權重",
        value: negativeWeightSymbols.length ? negativeWeightSymbols.join(", ") : "無",
        status: negativeWeightSymbols.length ? "risk" : "strong",
        note: negativeWeightSymbols.length ? "現階段不建議用負權重跑一般配置" : "權重皆為正值或零",
      },
      {
        label: "日期區間",
        value: dateSpan === null ? "--" : `${dateSpan.toLocaleString("zh-TW")} 天`,
        status: dateSpan === null || dateSpan < 0 ? "risk" : dateSpan < 365 ? "watch" : "strong",
        note:
          dateSpan === null || dateSpan < 0
            ? "起日與迄日需要修正"
            : dateSpan < 365
              ? "樣本期間偏短，解讀要保守"
              : "期間足夠進行回測",
      },
    ];

    return checks;
  }, [endDate, rows, startDate, totalWeight]);

  const isBusy = isAnalyzing || isOptimizing || isComparingModes;
  const canSubmit = hasBigQueryCredentials && rows.some((row) => row.symbol.trim()) && !isBusy;
  const displayResult = optimizationResult ?? result;
  const selectedSnapshot = useMemo(
    () => savedSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null,
    [savedSnapshots, selectedSnapshotId],
  );
  const correlationMatrix = displayResult?.correlationMatrix;
  const efficientFrontier = optimizationResult?.efficientFrontier;
  const riskContributionRows = useMemo(() => {
    return [...(displayResult?.riskContributions ?? [])].sort(
      (left, right) =>
        Math.abs(right.riskContributionPercent ?? 0) - Math.abs(left.riskContributionPercent ?? 0),
    );
  }, [displayResult]);
  const decisionSignals = useMemo(() => {
    if (!displayResult) return [];
    return buildDecisionSignals(displayResult, riskContributionRows);
  }, [displayResult, riskContributionRows]);
  const rebalanceSummary = useMemo(
    () => summarizeRebalance(rebalanceRows, portfolioValue),
    [rebalanceRows, portfolioValue],
  );
  const rebalanceChartData = useMemo(
    () =>
      [...rebalanceRows]
        .sort((left, right) => Math.abs(right.deltaWeight) - Math.abs(left.deltaWeight))
        .map((row) => ({
          symbol: row.symbol,
          currentWeight: row.currentWeight,
          targetWeight: row.targetWeight,
        })),
    [rebalanceRows],
  );
  const modeComparisonRows = useMemo(() => {
    if (!modeComparisonResult) return [];

    return comparisonMetricCards.map((metric) => {
      const overlapValue = modeComparisonResult.overlap.metrics[metric.key];
      const longRebuildValue = modeComparisonResult.longRebuild.metrics[metric.key];
      const delta =
        overlapValue !== null &&
        longRebuildValue !== null &&
        Number.isFinite(overlapValue) &&
        Number.isFinite(longRebuildValue)
          ? longRebuildValue - overlapValue
          : null;

      return {
        ...metric,
        overlapValue,
        longRebuildValue,
        delta,
      };
    });
  }, [modeComparisonResult]);
  const snapshotComparisonRows = useMemo(() => {
    const snapshotResult = selectedSnapshot?.payload.result;
    if (!displayResult || !isPortfolioResult(snapshotResult)) return [];

    return snapshotMetricCards.map((metric) => {
      const currentValue = displayResult.metrics[metric.key];
      const snapshotValue = snapshotResult.metrics[metric.key];
      const delta =
        currentValue !== null &&
        snapshotValue !== null &&
        Number.isFinite(currentValue) &&
        Number.isFinite(snapshotValue)
          ? currentValue - snapshotValue
          : null;

      return {
        ...metric,
        currentValue,
        snapshotValue,
        delta,
      };
    });
  }, [displayResult, selectedSnapshot]);
  const wealthChartData = useMemo(() => {
    const wealthPath = displayResult?.wealthPath ?? [];
    const step = Math.max(1, Math.floor(wealthPath.length / 360));

    const sampled = wealthPath
      .filter((point, index) => index % step === 0 && point.date && point.value !== null && Number.isFinite(point.value))
      .map((point) => ({
        date: point.date,
        value: point.value,
        dailyReturn: point.dailyReturn,
      }));

    const lastPoint = wealthPath.at(-1);
    if (
      lastPoint?.date &&
      lastPoint.value !== null &&
      Number.isFinite(lastPoint.value) &&
      sampled.at(-1)?.date !== lastPoint.date
    ) {
      sampled.push({
        date: lastPoint.date,
        value: lastPoint.value,
        dailyReturn: lastPoint.dailyReturn,
      });
    }

    return sampled;
  }, [displayResult]);
  const drawdownChartData = useMemo(() => {
    const wealthPath = displayResult?.wealthPath ?? [];
    const drawdownRows: Array<{ date: string; drawdown: number; value: number }> = [];
    let runningPeak = -Infinity;

    for (const point of wealthPath) {
      const value = Number(point.value);
      if (!point.date || !Number.isFinite(value)) continue;

      runningPeak = Math.max(runningPeak, value);
      drawdownRows.push({
        date: point.date,
        drawdown: runningPeak > 0 ? value / runningPeak - 1 : 0,
        value,
      });
    }

    const step = Math.max(1, Math.floor(drawdownRows.length / 360));
    const sampled = drawdownRows.filter((_, index) => index % step === 0);
    const lastPoint = drawdownRows.at(-1);

    if (lastPoint && sampled.at(-1)?.date !== lastPoint.date) {
      sampled.push(lastPoint);
    }

    return sampled;
  }, [displayResult]);

  useEffect(() => {
    if (!hasBigQueryCredentials) {
      return;
    }

    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingAssets(true);
      setAssetSearchError(null);

      try {
        const response = await fetchBigQueryAssets(assetQuery, assetQuery.trim() ? 20 : 12);
        if (!isCancelled) {
          setAssetSuggestions(response.assets);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setAssetSuggestions([]);
          setAssetSearchError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAssets(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [assetQuery, hasBigQueryCredentials]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const presets = loadPresetsFromStorage();
      const snapshots = loadSnapshotsFromStorage();
      setSavedPresets(presets);
      setSavedSnapshots(snapshots);
      setSelectedPresetId((currentId) => currentId || presets[0]?.id || "");
      setSelectedSnapshotId((currentId) => currentId || snapshots[0]?.id || "");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function updateRow(id: string, patch: Partial<AssetRow>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
  }

  function activeRows() {
    return rows.filter((row) => row.symbol.trim());
  }

  function handleNormalizeWeights() {
    const activeAssetRows = activeRows();
    const activeTotalWeight = activeAssetRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);

    if (activeTotalWeight <= 0) {
      setError("無法正規化權重：有效權重總和必須大於 0。");
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) => {
        if (!row.symbol.trim()) return row;
        const normalizedWeight = ((Number(row.weight) || 0) / activeTotalWeight) * 100;
        return { ...row, weight: Number(normalizedWeight.toFixed(2)) };
      }),
    );
    setError(null);
  }

  function handleEqualWeight() {
    const activeAssetRows = activeRows();

    if (!activeAssetRows.length) {
      setError("無法等權配置：至少需要一個商品代號。");
      return;
    }

    const equalWeight = Number((100 / activeAssetRows.length).toFixed(2));
    const remainder = Number((100 - equalWeight * activeAssetRows.length).toFixed(2));
    let firstActiveRowId: string | null = null;

    setRows((currentRows) =>
      currentRows.map((row) => {
        if (!row.symbol.trim()) return row;
        firstActiveRowId = firstActiveRowId ?? row.id;
        return {
          ...row,
          weight: row.id === firstActiveRowId ? Number((equalWeight + remainder).toFixed(2)) : equalWeight,
        };
      }),
    );
    setError(null);
  }

  function handleMergeDuplicateSymbols() {
    const normalizedSymbols = activeRows().map((row) => row.symbol.trim().toUpperCase());
    const hasDuplicates = normalizedSymbols.some((symbol, index) => normalizedSymbols.indexOf(symbol) !== index);

    if (!hasDuplicates) {
      setError("沒有可合併的重複商品代號。");
      return;
    }

    setRows((currentRows) => {
      const mergedBySymbol = new Map<string, AssetRow>();
      const mergedRows: AssetRow[] = [];
      const blankRows: AssetRow[] = [];

      currentRows.forEach((row) => {
        const symbol = row.symbol.trim();

        if (!symbol) {
          blankRows.push(row);
          return;
        }

        const key = symbol.toUpperCase();
        const existingRow = mergedBySymbol.get(key);

        if (existingRow) {
          existingRow.weight = Number(((Number(existingRow.weight) || 0) + (Number(row.weight) || 0)).toFixed(2));
          return;
        }

        const nextRow = { ...row, symbol };
        mergedBySymbol.set(key, nextRow);
        mergedRows.push(nextRow);
      });

      return [...mergedRows, ...blankRows];
    });

    setError(null);
  }

  function handleClearBlankRows() {
    const hasBlankRows = rows.some((row) => !row.symbol.trim());

    if (!hasBlankRows) {
      setError("沒有可清除的空白商品列。");
      return;
    }

    setRows((currentRows) => {
      const activeAssetRows = currentRows.filter((row) => row.symbol.trim());
      return activeAssetRows.length ? activeAssetRows : [makeRow()];
    });
    setError(null);
  }

  function handleSortByWeight() {
    const activeAssetRows = activeRows();

    if (activeAssetRows.length < 2) {
      setError("至少需要兩個商品才能排序。");
      return;
    }

    setRows((currentRows) => {
      const activeRowsSorted = currentRows
        .filter((row) => row.symbol.trim())
        .sort((left, right) => (Number(right.weight) || 0) - (Number(left.weight) || 0));
      const blankRows = currentRows.filter((row) => !row.symbol.trim());
      return [...activeRowsSorted, ...blankRows];
    });
    setError(null);
  }

  function handleSortBySymbol() {
    const activeAssetRows = activeRows();

    if (activeAssetRows.length < 2) {
      setError("至少需要兩個商品才能依代號排序。");
      return;
    }

    setRows((currentRows) => {
      const activeRowsSorted = currentRows
        .filter((row) => row.symbol.trim())
        .sort((left, right) =>
          left.symbol.trim().toUpperCase().localeCompare(right.symbol.trim().toUpperCase()),
        );
      const blankRows = currentRows.filter((row) => !row.symbol.trim());
      return [...activeRowsSorted, ...blankRows];
    });
    setError(null);
  }

  function handleInferCurrencies() {
    const activeAssetRows = activeRows();

    if (!activeAssetRows.length) {
      setError("至少需要一個商品代號才能自動判斷幣別。");
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) => {
        if (!row.symbol.trim()) return row;
        return { ...row, currency: inferSymbolCurrency(row.symbol) };
      }),
    );
    setError(null);
  }

  async function handleCopySymbols() {
    const symbols = activeRows().map((row) => row.symbol.trim());

    if (!symbols.length) {
      setError("至少需要一個商品代號才能複製。");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("瀏覽器不支援剪貼簿 API");
      }

      await navigator.clipboard.writeText(symbols.join("\n"));
      setSymbolCopyStatus("copied");
      window.setTimeout(() => setSymbolCopyStatus("idle"), 2000);
      setError(null);
    } catch (err: unknown) {
      setError(`商品代號複製失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleCopyConfiguration() {
    const activeAssetRows = activeRows();

    if (!activeAssetRows.length) {
      setError("至少需要一個商品代號才能複製配置。");
      return;
    }

    const rowsText = activeAssetRows.map((row) =>
      [row.symbol.trim(), (Number(row.weight) || 0).toFixed(2), row.currency.trim().toUpperCase() || "USD"].join("\t"),
    );
    const content = ["symbol\tweight_percent\tcurrency", ...rowsText].join("\n");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("瀏覽器不支援剪貼簿 API");
      }

      await navigator.clipboard.writeText(content);
      setConfigCopyStatus("copied");
      window.setTimeout(() => setConfigCopyStatus("idle"), 2000);
      setError(null);
    } catch (err: unknown) {
      setError(`配置複製失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleExportConfigurationCsv() {
    const activeAssetRows = activeRows();

    if (!activeAssetRows.length) {
      setError("至少需要一個商品代號才能下載配置。");
      return;
    }

    downloadTextFile(
      `bigquery-configuration-${resultStamp()}.csv`,
      configurationCsv(activeAssetRows),
      "text/csv;charset=utf-8",
    );
    setError(null);
  }

  function handleExportAllocationCsv() {
    if (!allocationRows.length) {
      setError("至少需要一個商品代號才能下載配置分析。");
      return;
    }

    downloadTextFile(
      `bigquery-allocation-summary-${resultStamp()}.csv`,
      allocationSummaryCsv(allocationInsights, currencyExposureRows, allocationRows),
      "text/csv;charset=utf-8",
    );
    setError(null);
  }

  function handleApplyBulkConfiguration() {
    const importedRows = parsePastedConfiguration(bulkConfigText).map(makePresetRow);

    if (!importedRows.length) {
      setError("貼上內容沒有可用配置。");
      return;
    }

    setRows(importedRows);
    setSelectedPresetId("");
    setResult(null);
    setOptimizationResult(null);
    setModeComparisonResult(null);
    setRebalanceRows([]);
    setBulkConfigText("");
    setError(null);
  }

  function handleResetConfiguration() {
    setRows(initialRows.map(makePresetRow));
    setSelectedPresetId("");
    setResult(null);
    setOptimizationResult(null);
    setModeComparisonResult(null);
    setRebalanceRows([]);
    setBulkConfigText("");
    setError(null);
  }

  function handlePortfolioValueChange(value: number) {
    const nextValue = normalizePortfolioValue(value, 0);
    setPortfolioValue(nextValue);
    setRebalanceRows((currentRows) => applyTradeAssumptions(currentRows, nextValue, transactionCostBps, minTradeAmount));
  }

  function handleTransactionCostBpsChange(value: number) {
    const nextCostBps = normalizeTransactionCostBps(value, 0);
    setTransactionCostBps(nextCostBps);
    setRebalanceRows((currentRows) => applyTradeAssumptions(currentRows, portfolioValue, nextCostBps, minTradeAmount));
  }

  function handleMinTradeAmountChange(value: number) {
    const nextMinTradeAmount = normalizeMinTradeAmount(value, 0);
    setMinTradeAmount(nextMinTradeAmount);
    setRebalanceRows((currentRows) =>
      applyTradeAssumptions(currentRows, portfolioValue, transactionCostBps, nextMinTradeAmount),
    );
  }

  function applyAssetSuggestion(symbol: string) {
    const currency = inferSymbolCurrency(symbol);
    setRows((currentRows) => {
      const emptyRowIndex = currentRows.findIndex((row) => !row.symbol.trim());

      if (emptyRowIndex >= 0) {
        return currentRows.map((row, index) => (index === emptyRowIndex ? { ...row, symbol, currency } : row));
      }

      return [
        ...currentRows,
        {
          ...makeRow(),
          symbol,
          currency,
        },
      ];
    });
    setAssetQuery(symbol);
  }

  function currencyBySymbolFor(activeAssetRows: AssetRow[]) {
    return Object.fromEntries(
      activeAssetRows.map((row) => [row.symbol.trim(), row.currency.trim().toUpperCase() || "USD"]),
    );
  }

  function handleSavePreset() {
    const cleanName = presetName.trim() || "未命名配置";
    const now = new Date().toISOString();
    const activeAssetRows = activeRows();
    const preset: SavedPortfolioPreset = {
      id: selectedPresetId || `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: cleanName,
      rows: activeAssetRows.length
        ? activeAssetRows.map((row) => ({
            symbol: row.symbol.trim(),
            weight: Number(row.weight) || 0,
            currency: row.currency.trim().toUpperCase() || "USD",
          }))
        : rows.map((row) => ({
            symbol: row.symbol.trim(),
            weight: Number(row.weight) || 0,
            currency: row.currency.trim().toUpperCase() || "USD",
          })),
      portfolioValue,
      transactionCostBps,
      minTradeAmount,
      benchmarkSymbol,
      startDate,
      endDate,
      priceBasis,
      pricingCurrency,
      mode,
      optimizationMode,
      targetVolatility,
      updatedAt: now,
    };

    setSavedPresets((currentPresets) => {
      const nextPresets = [preset, ...currentPresets.filter((item) => item.id !== preset.id)].slice(0, 12);
      writePresetsToStorage(nextPresets);
      return nextPresets;
    });
    setSelectedPresetId(preset.id);
  }

  function handleLoadPreset() {
    const preset = savedPresets.find((item) => item.id === selectedPresetId);
    if (!preset) return;

    setRows(preset.rows.length ? preset.rows.map(makePresetRow) : initialRows);
    setBenchmarkSymbol(preset.benchmarkSymbol);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setPriceBasis(preset.priceBasis);
    setPricingCurrency(preset.pricingCurrency);
    setMode(preset.mode);
    setOptimizationMode(preset.optimizationMode);
    setTargetVolatility(preset.targetVolatility);
    setPortfolioValue(normalizePortfolioValue(preset.portfolioValue));
    setTransactionCostBps(normalizeTransactionCostBps(preset.transactionCostBps));
    setMinTradeAmount(normalizeMinTradeAmount(preset.minTradeAmount));
    setPresetName(preset.name);
    setResult(null);
    setOptimizationResult(null);
    setModeComparisonResult(null);
    setRebalanceRows([]);
    setError(null);
  }

  function handleDeletePreset() {
    if (!selectedPresetId) return;

    setSavedPresets((currentPresets) => {
      const nextPresets = currentPresets.filter((preset) => preset.id !== selectedPresetId);
      writePresetsToStorage(nextPresets);
      setSelectedPresetId(nextPresets[0]?.id || "");
      return nextPresets;
    });
  }

  function applyPortfolioPayload(payload: ExportedPortfolioPayload, fallbackName: string) {
    const config = payload.configuration;
    if (!config?.rows?.length) {
      throw new Error("匯入檔缺少 configuration.rows。");
    }

    const importedRows = config.rows
      .filter((row) => typeof row.symbol === "string" && row.symbol.trim())
      .map((row) =>
        makePresetRow({
          symbol: row.symbol?.trim() ?? "",
          weight: importedWeightToPercent(row.weight),
          currency: row.currency?.trim().toUpperCase() || inferSymbolCurrency(row.symbol ?? ""),
        }),
      );

    if (!importedRows.length) {
      throw new Error("匯入檔沒有可用商品。");
    }

    setRows(importedRows);
    setBenchmarkSymbol(config.benchmarkSymbol?.trim() || "");
    setStartDate(config.startDate || "2020-01-01");
    setEndDate(config.endDate || new Date().toISOString().slice(0, 10));
    setPriceBasis(config.priceBasis === "raw" ? "raw" : "adjusted");
    setPricingCurrency(config.pricingCurrency === "original" ? "original" : "TWD");
    setMode(config.mode === "long_rebuild" ? "long_rebuild" : "overlap");
    setOptimizationMode(config.optimizationMode ?? "max_sharpe");
    setTargetVolatility(Number.isFinite(config.targetVolatility) ? Number(config.targetVolatility) : 12);
    const nextPortfolioValue = normalizePortfolioValue(config.portfolioValue);
    const nextTransactionCostBps = normalizeTransactionCostBps(config.transactionCostBps);
    const nextMinTradeAmount = normalizeMinTradeAmount(config.minTradeAmount);
    setPortfolioValue(nextPortfolioValue);
    setTransactionCostBps(nextTransactionCostBps);
    setMinTradeAmount(nextMinTradeAmount);
    setPresetName(payload.presetName?.trim() || fallbackName);
    setSelectedPresetId("");
    setModeComparisonResult(null);
    setRebalanceRows(
      normalizeRebalanceRows(payload.rebalancing, nextPortfolioValue, nextTransactionCostBps, nextMinTradeAmount),
    );
    setError(null);

    if (isPortfolioResult(payload.result)) {
      if ("optimizationMode" in payload.result) {
        setOptimizationResult(payload.result as PortfolioOptimizationResponse);
        setResult(null);
      } else {
        setResult(payload.result as PortfolioAnalysisResponse);
        setOptimizationResult(null);
      }
    } else {
      setResult(null);
      setOptimizationResult(null);
    }
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text()) as ExportedPortfolioPayload;
      applyPortfolioPayload(payload, file.name.replace(/\.json$/i, ""));
    } catch (err: unknown) {
      setError(`JSON 匯入失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function exportPayload() {
    if (!displayResult) return null;

    return {
      exportedAt: new Date().toISOString(),
      presetName,
      configuration: {
        rows: activeRows().map((row) => ({
          symbol: row.symbol.trim(),
          weight: Number(row.weight) / 100,
          currency: row.currency.trim().toUpperCase() || "USD",
        })),
        portfolioValue,
        transactionCostBps,
        minTradeAmount,
        benchmarkSymbol,
        startDate,
        endDate,
        priceBasis,
        pricingCurrency,
        mode,
        optimizationMode,
        targetVolatility,
      },
      result: displayResult,
      rebalancing: rebalanceRows,
      decisionSignals,
      inputChecks,
      allocationInsights,
      allocationExposures: {
        currencies: currencyExposureRows,
        holdings: allocationRows,
      },
    };
  }

  function decisionSummaryText() {
    if (!displayResult) return "";

    const activeAssetRows = activeRows();
    const analysisType = optimizationResult ? "AI 調倉 / 最佳化" : "投組分析";
    const dataWindow = displayResult.dataWindow;
    const modeLabel = mode === "overlap" ? "近期交集法" : "長線重建法";
    const priceBasisLabel = priceBasis === "adjusted" ? "還原價格" : "原始價格";
    const pricingCurrencyLabel = pricingCurrency === "TWD" ? "台幣換算" : "原幣";
    const lines = [
      "BigQuery 投組決策摘要",
      `匯出時間: ${new Date().toISOString()}`,
      `配置名稱: ${presetName.trim() || "未命名配置"}`,
      `分析類型: ${analysisType}`,
      `資料期間: ${dataWindow.startDate ?? "--"} ~ ${dataWindow.endDate ?? "--"} (${dataWindow.observations.toLocaleString("zh-TW")} 筆)`,
      `資料模式: ${modeLabel}`,
      `價格基礎: ${priceBasisLabel} / ${pricingCurrencyLabel}`,
      `基準指標: ${benchmarkSymbol.trim() || "--"}`,
      "",
      "配置",
      ...activeAssetRows.map((row) => {
        const weight = Number(row.weight) || 0;
        return `- ${row.symbol.trim()}: ${weight.toFixed(2)}% / ${row.currency.trim().toUpperCase() || "USD"}`;
      }),
      "",
      "分析前檢核",
      ...inputChecks.map(
        (check) =>
          `- [${inputCheckStatusLabel(check.status)}] ${check.label}: ${check.value} - ${check.note}`,
      ),
      "",
      "配置結構",
      ...allocationInsights.map(
        (insight) =>
          `- [${inputCheckStatusLabel(insight.status)}] ${insight.label}: ${insight.value} - ${insight.note}`,
      ),
      "",
      "決策摘要",
      ...decisionSignals.map(
        (signal) =>
          `- [${decisionSignalStatusLabel(signal.status)}] ${signal.label}: ${signal.value} - ${signal.note}`,
      ),
    ];

    if (rebalanceRows.length) {
      lines.push(
        "",
        "再平衡摘要",
        `- Buy: ${formatMoney(rebalanceSummary.totalBuy)}`,
        `- Sell: ${formatMoney(rebalanceSummary.totalSell)}`,
        `- Net Cash: ${formatMoney(rebalanceSummary.netCashFlow, true)}`,
        `- Turnover: ${formatMetric(rebalanceSummary.turnover, "percent")}`,
        `- Estimated Cost: ${formatMoney(rebalanceSummary.totalEstimatedCost)}`,
      );
    }

    if (modeComparisonRows.length) {
      lines.push(
        "",
        "模式比較",
        "Delta = 長線重建法 - 近期交集法",
        ...modeComparisonRows.map(
          (row) =>
            `- ${row.label}: 近期交集法 ${formatMetric(row.overlapValue, row.kind)} / 長線重建法 ${formatMetric(row.longRebuildValue, row.kind)} / Delta ${formatMetricDelta(row.delta, row.kind)}`,
        ),
      );
    }

    return lines.join("\n");
  }

  function handleExportJson() {
    const payload = exportPayload();
    if (!payload) return;

    downloadTextFile(
      `bigquery-portfolio-${resultStamp()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function handleSaveSnapshot() {
    const payload = exportPayload();
    if (!payload) return;

    const now = new Date().toISOString();
    const snapshot: StoredPortfolioSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: presetName.trim() || "未命名快照",
      createdAt: now,
      payload: {
        ...payload,
        exportedAt: payload.exportedAt || now,
      },
    };

    setSavedSnapshots((currentSnapshots) => {
      const nextSnapshots = [snapshot, ...currentSnapshots].slice(0, 10);
      writeSnapshotsToStorage(nextSnapshots);
      return nextSnapshots;
    });
    setSelectedSnapshotId(snapshot.id);
    setError(null);
  }

  function handleLoadSnapshot() {
    if (!selectedSnapshot) {
      setError("尚未選擇快照。");
      return;
    }

    try {
      applyPortfolioPayload(selectedSnapshot.payload, selectedSnapshot.name);
      setSelectedSnapshotId(selectedSnapshot.id);
    } catch (err: unknown) {
      setError(`快照載入失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleExportSnapshotJson() {
    if (!selectedSnapshot) {
      setError("尚未選擇快照。");
      return;
    }

    downloadTextFile(
      `bigquery-snapshot-${resultStamp()}.json`,
      JSON.stringify(selectedSnapshot.payload, null, 2),
      "application/json;charset=utf-8",
    );
    setError(null);
  }

  function handleDeleteSnapshot() {
    if (!selectedSnapshotId) return;

    setSavedSnapshots((currentSnapshots) => {
      const nextSnapshots = currentSnapshots.filter((snapshot) => snapshot.id !== selectedSnapshotId);
      writeSnapshotsToStorage(nextSnapshots);
      setSelectedSnapshotId(nextSnapshots[0]?.id || "");
      return nextSnapshots;
    });
    setError(null);
  }

  function handleExportDecisionSummary() {
    if (!displayResult || !decisionSignals.length) return;

    downloadTextFile(
      `bigquery-decision-summary-${resultStamp()}.txt`,
      decisionSummaryText(),
      "text/plain;charset=utf-8",
    );
  }

  async function handleCopyDecisionSummary() {
    if (!displayResult || !decisionSignals.length) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("瀏覽器不支援剪貼簿 API");
      }

      await navigator.clipboard.writeText(decisionSummaryText());
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err: unknown) {
      setError(`摘要複製失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleExportWealthCsv() {
    if (!displayResult) return;

    downloadTextFile(
      `bigquery-wealth-path-${resultStamp()}.csv`,
      wealthPathCsv(displayResult),
      "text/csv;charset=utf-8",
    );
  }

  function handleExportAssetCsv() {
    if (!displayResult) return;

    downloadTextFile(
      `bigquery-asset-statistics-${resultStamp()}.csv`,
      assetStatisticsCsv(displayResult),
      "text/csv;charset=utf-8",
    );
  }

  function handleExportRebalancingCsv() {
    if (!rebalanceRows.length) return;

    downloadTextFile(
      `bigquery-rebalancing-${resultStamp()}.csv`,
      rebalancingCsv(rebalanceRows),
      "text/csv;charset=utf-8",
    );
  }

  function handleExportModeComparisonCsv() {
    if (!modeComparisonRows.length) return;

    const header = ["metric", "overlap", "long_rebuild", "delta"];
    const rows = modeComparisonRows.map((row) => [
      row.label,
      row.overlapValue,
      row.longRebuildValue,
      row.delta,
    ]);

    downloadTextFile(
      `bigquery-mode-comparison-${resultStamp()}.csv`,
      [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  }

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    setModeComparisonResult(null);
    setRebalanceRows([]);

    if (!hasBigQueryCredentials) {
      setError("Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。");
      return;
    }

    const activeAssetRows = activeRows();
    if (!activeAssetRows.length) {
      setError("至少需要一個商品代號。");
      return;
    }

    setIsAnalyzing(true);
    try {
      const weightsBySymbol = Object.fromEntries(
        activeAssetRows.map((row) => [row.symbol.trim(), Number(row.weight) / 100]),
      );

      const response = await analyzePortfolioFromBigQuery({
        weights_by_symbol: weightsBySymbol,
        benchmark_symbol: benchmarkSymbol.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        price_basis: priceBasis,
        pricing_currency: pricingCurrency,
        currency_by_symbol: currencyBySymbolFor(activeAssetRows),
        mode,
      });

      setResult(response);
      setOptimizationResult(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleOptimize() {
    setError(null);
    setResult(null);
    setOptimizationResult(null);
    setModeComparisonResult(null);
    setRebalanceRows([]);

    if (!hasBigQueryCredentials) {
      setError("Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。");
      return;
    }

    const activeAssetRows = activeRows();
    if (activeAssetRows.length < 2) {
      setError("AI 調倉至少需要兩個商品。");
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await optimizePortfolioFromBigQuery({
        symbols: activeAssetRows.map((row) => row.symbol.trim()),
        benchmark_symbol: benchmarkSymbol.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        price_basis: priceBasis,
        pricing_currency: pricingCurrency,
        currency_by_symbol: currencyBySymbolFor(activeAssetRows),
        mode,
        optimization_mode: optimizationMode,
        target_volatility: optimizationMode === "target_vol" ? targetVolatility / 100 : null,
      });

      const optimizedWeights = Object.fromEntries(
        response.weights.map((weightRow) => [weightRow.symbol, Number((weightRow.weight * 100).toFixed(1))]),
      );
      const nextRebalanceRows = buildRebalanceRows(
        activeAssetRows,
        response.weights,
        portfolioValue,
        transactionCostBps,
        minTradeAmount,
      );

      setRows((currentRows) =>
        currentRows.map((row) => {
          const symbol = row.symbol.trim();
          return symbol in optimizedWeights ? { ...row, weight: optimizedWeights[symbol] } : row;
        }),
      );
      setOptimizationResult(response);
      setRebalanceRows(nextRebalanceRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsOptimizing(false);
    }
  }

  async function handleCompareModes() {
    setError(null);
    setResult(null);
    setOptimizationResult(null);
    setModeComparisonResult(null);
    setRebalanceRows([]);

    if (!hasBigQueryCredentials) {
      setError("Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。");
      return;
    }

    const activeAssetRows = activeRows();
    if (!activeAssetRows.length) {
      setError("至少需要一個商品代號。");
      return;
    }

    setIsComparingModes(true);
    try {
      const weightsBySymbol = Object.fromEntries(
        activeAssetRows.map((row) => [row.symbol.trim(), Number(row.weight) / 100]),
      );
      const basePayload = {
        weights_by_symbol: weightsBySymbol,
        benchmark_symbol: benchmarkSymbol.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        price_basis: priceBasis,
        pricing_currency: pricingCurrency,
        currency_by_symbol: currencyBySymbolFor(activeAssetRows),
      };

      const [overlapResponse, longRebuildResponse] = await Promise.all([
        analyzePortfolioFromBigQuery({ ...basePayload, mode: "overlap" }),
        analyzePortfolioFromBigQuery({ ...basePayload, mode: "long_rebuild" }),
      ]);

      setModeComparisonResult({
        overlap: overlapResponse,
        longRebuild: longRebuildResponse,
      });
      setResult(mode === "long_rebuild" ? longRebuildResponse : overlapResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsComparingModes(false);
    }
  }

  return (
    <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-cyan-300">▍ BigQuery 投組分析工作台</h3>
          <p className="text-[11px] text-slate-500 mt-1">daily_prices / daily_fx</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className="px-3 py-2 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isAnalyzing ? "分析中" : "執行分析"}
          </button>
          <button
            onClick={handleOptimize}
            disabled={!canSubmit}
            className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isOptimizing ? "調倉中" : "AI 調倉"}
          </button>
          <button
            onClick={handleCompareModes}
            disabled={!canSubmit}
            className="px-3 py-2 text-xs font-bold rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isComparingModes ? "比較中" : "比較模式"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
        <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportJson} />
        <label className="space-y-1 text-xs">
          <span className="text-slate-500">配置名稱</span>
          <input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">已存配置</span>
            <select
              value={selectedPresetId}
              onChange={(event) => {
                const preset = savedPresets.find((item) => item.id === event.target.value);
                setSelectedPresetId(event.target.value);
                if (preset) setPresetName(preset.name);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="">尚未選擇</option>
              {savedPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} · {new Date(preset.updatedAt).toLocaleDateString("zh-TW")}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleSavePreset}
            className="md:self-end px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            儲存
          </button>
          <button
            onClick={handleLoadPreset}
            disabled={!selectedPresetId}
            className="md:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
          >
            載入
          </button>
          <button
            onClick={handleDeletePreset}
            disabled={!selectedPresetId}
            className="md:self-end px-3 py-2 rounded-md bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
          >
            刪除
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="md:self-end px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold"
          >
            匯入 JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_72px_82px_36px] gap-2 text-[11px] text-slate-500 px-1">
            <span>商品代號</span>
            <span>權重%</span>
            <span>幣別</span>
            <span />
          </div>

          <datalist id={assetOptionListId}>
            {assetSuggestions.map((asset) => (
              <option
                key={asset.symbol}
                value={asset.symbol}
                label={`${asset.latest_date ?? "--"} · Adj ${asset.adjusted_price_rows.toLocaleString("zh-TW")} · Raw ${asset.raw_price_rows.toLocaleString("zh-TW")}`}
              />
            ))}
          </datalist>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_72px_82px_36px] gap-2">
              <input
                value={row.symbol}
                list={hasBigQueryCredentials ? assetOptionListId : undefined}
                onChange={(event) => {
                  updateRow(row.id, { symbol: event.target.value });
                  setAssetQuery(event.target.value);
                }}
                className="min-w-0 bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-xs text-slate-100"
              />
              <input
                type="number"
                value={row.weight}
                onChange={(event) => updateRow(row.id, { weight: Number(event.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-xs text-slate-100 font-mono"
              />
              <select
                value={row.currency}
                onChange={(event) => updateRow(row.id, { currency: event.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-xs text-slate-100"
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AUD">AUD</option>
              </select>
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="bg-slate-950 border border-slate-700 rounded-md text-slate-400 hover:text-red-300 disabled:opacity-30"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRows((currentRows) => [...currentRows, makeRow()])}
                className="w-9 h-9 rounded-md bg-slate-950 border border-slate-700 text-cyan-300 hover:border-cyan-600"
                title="新增商品"
              >
                +
              </button>
              <button
                onClick={handleNormalizeWeights}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                正規化
              </button>
              <button
                onClick={handleEqualWeight}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                等權
              </button>
              <button
                onClick={handleMergeDuplicateSymbols}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                合併
              </button>
              <button
                onClick={handleClearBlankRows}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                清空白
              </button>
              <button
                onClick={handleSortByWeight}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                排序
              </button>
              <button
                onClick={handleSortBySymbol}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                代號
              </button>
              <button
                onClick={handleInferCurrencies}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                幣別
              </button>
              <button
                onClick={handleCopySymbols}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                {symbolCopyStatus === "copied" ? "已複製" : "複代號"}
              </button>
              <button
                onClick={handleCopyConfiguration}
                className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                {configCopyStatus === "copied" ? "已複製" : "複配置"}
              </button>
            </div>
            <div className="text-right">
              <p className={`text-xs font-mono ${Math.abs(totalWeight - 100) < 0.01 ? "text-emerald-300" : "text-amber-300"}`}>
                {totalWeight.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-600">權重總和</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-slate-500">批次配置</span>
              <span className="font-mono text-slate-600">CSV / TSV</span>
            </div>
            <textarea
              value={bulkConfigText}
              onChange={(event) => setBulkConfigText(event.target.value)}
              rows={3}
              placeholder={"symbol,weight_percent,currency\n0050.TW,50,TWD\nSPY,50,USD"}
              className="w-full resize-y rounded-md border border-slate-800 bg-slate-900 px-2 py-2 font-mono text-[11px] text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleApplyBulkConfiguration}
                disabled={!bulkConfigText.trim()}
                className="h-9 px-3 rounded-md bg-cyan-700 text-[11px] font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                套用貼上
              </button>
              <button
                onClick={handleExportConfigurationCsv}
                className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
              >
                下載 CSV
              </button>
              <button
                onClick={handleResetConfiguration}
                className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-amber-500 hover:text-amber-200"
              >
                重設預設
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-200">配置結構分析</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {allocationRows.length ? `${allocationRows.length} 檔有效商品` : "尚無有效商品"}
                </p>
              </div>
              <button
                onClick={handleExportAllocationCsv}
                disabled={!allocationRows.length}
                className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                分析 CSV
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
              {allocationInsights.map((insight) => (
                <div
                  key={insight.label}
                  className={`rounded-lg border p-3 min-w-0 ${decisionSignalClass(insight.status)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500 truncate">{insight.label}</p>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalBadgeClass(insight.status)}`}
                    >
                      {inputCheckStatusLabel(insight.status)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs font-bold text-slate-100 truncate" title={insight.value}>
                    {insight.value}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{insight.note}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>幣別曝險</span>
                  <span className="font-mono">{currencyExposureRows.length} 組</span>
                </div>
                {currencyExposureRows.length ? (
                  <div className="space-y-2">
                    {currencyExposureRows.map((row) => (
                      <div key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-slate-200 truncate">{row.label}</span>
                          <span className="font-mono text-slate-400">{formatMetric(row.value, "percent")}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${Math.max(row.value * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">--</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>前五大持倉</span>
                  <span className="font-mono">{allocationRows.slice(0, 5).length} 檔</span>
                </div>
                {allocationRows.length ? (
                  <div className="space-y-2">
                    {allocationRows.slice(0, 5).map((row) => (
                      <div key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-slate-200 truncate" title={row.label}>
                            {row.label}
                          </span>
                          <span className="font-mono text-slate-400">{formatMetric(row.value, "percent")}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.max(row.value * 100, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">--</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {inputChecks.map((check) => (
              <div
                key={check.label}
                className={`rounded-lg border p-3 min-w-0 ${decisionSignalClass(check.status)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500 truncate">{check.label}</p>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalBadgeClass(check.status)}`}
                  >
                    {inputCheckStatusLabel(check.status)}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs font-bold text-slate-100 truncate" title={check.value}>
                  {check.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{check.note}</p>
              </div>
            ))}
          </div>

          {hasBigQueryCredentials && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-500">BigQuery 商品候選</span>
                <span className="text-slate-500 font-mono">
                  {isLoadingAssets ? "搜尋中" : `${assetSuggestions.length} 筆`}
                </span>
              </div>
              {assetSearchError ? (
                <p className="text-[11px] text-red-300 whitespace-pre-wrap">{assetSearchError}</p>
              ) : assetSuggestions.length ? (
                <div className="flex flex-wrap gap-2">
                  {assetSuggestions.slice(0, 8).map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => applyAssetSuggestion(asset.symbol)}
                      className="max-w-full min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-left text-[11px] text-slate-200 hover:border-cyan-600"
                    >
                      <span className="block truncate font-bold text-cyan-200">{asset.symbol}</span>
                      <span className="block truncate text-slate-500">{asset.latest_date ?? "--"}</span>
                      <span className="block truncate text-slate-500">
                        Adj {asset.adjusted_price_rows.toLocaleString("zh-TW")} · Raw{" "}
                        {asset.raw_price_rows.toLocaleString("zh-TW")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">查無候選</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">Benchmark</span>
            <input
              value={benchmarkSymbol}
              list={hasBigQueryCredentials ? assetOptionListId : undefined}
              onChange={(event) => {
                setBenchmarkSymbol(event.target.value);
                setAssetQuery(event.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">投組總金額 TWD</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={portfolioValue}
              onChange={(event) => handlePortfolioValueChange(Number(event.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">交易成本 bps</span>
            <input
              type="number"
              min={0}
              step={1}
              value={transactionCostBps}
              onChange={(event) => handleTransactionCostBpsChange(Number(event.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">最小交易金額 TWD</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={minTradeAmount}
              onChange={(event) => handleMinTradeAmountChange(Number(event.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">起日</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">迄日</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">價格基準</span>
            <select
              value={priceBasis}
              onChange={(event) => setPriceBasis(event.target.value as "adjusted" | "raw")}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="adjusted">Adj</option>
              <option value="raw">Raw</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">計價</span>
            <select
              value={pricingCurrency}
              onChange={(event) => setPricingCurrency(event.target.value as "original" | "TWD")}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="TWD">TWD</option>
              <option value="original">原幣</option>
            </select>
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">模式</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "overlap" | "long_rebuild")}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="overlap">近期交集法</option>
              <option value="long_rebuild">長線重建法</option>
            </select>
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">AI 策略</span>
            <select
              value={optimizationMode}
              onChange={(event) =>
                setOptimizationMode(event.target.value as "max_sharpe" | "min_vol" | "max_return" | "target_vol")
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="max_sharpe">最大夏普</option>
              <option value="min_vol">最小風險</option>
              <option value="max_return">最大報酬</option>
              <option value="target_vol">指定波動率</option>
            </select>
          </label>
          {optimizationMode === "target_vol" && (
            <label className="space-y-1 col-span-2">
              <span className="text-slate-500">目標波動率 %</span>
              <input
                type="number"
                value={targetVolatility}
                onChange={(event) => setTargetVolatility(Number(event.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
              />
            </label>
          )}
        </div>
      </div>

      {!hasBigQueryCredentials && (
        <div className="border border-amber-900/60 bg-amber-950/20 rounded-lg p-3 text-xs text-amber-200">
          Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。
        </div>
      )}

      {error && (
        <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {savedSnapshots.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-[0.7fr_1.3fr] gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div>
            <p className="text-xs font-bold text-slate-200">分析快照</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{savedSnapshots.length} 筆本機留存</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 text-xs">
            <select
              value={selectedSnapshotId}
              onChange={(event) => setSelectedSnapshotId(event.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              {savedSnapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.name} · {new Date(snapshot.createdAt).toLocaleString("zh-TW")}
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadSnapshot}
              disabled={!selectedSnapshot}
              className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
            >
              載入
            </button>
            <button
              onClick={handleExportSnapshotJson}
              disabled={!selectedSnapshot}
              className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
            >
              JSON
            </button>
            <button
              onClick={handleDeleteSnapshot}
              disabled={!selectedSnapshot}
              className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
            >
              刪除
            </button>
          </div>
        </div>
      ) : null}

      {displayResult && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div>
              <p className="text-xs font-bold text-slate-200">分析結果匯出</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {displayResult.dataWindow.startDate ?? "--"} ~ {displayResult.dataWindow.endDate ?? "--"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveSnapshot}
                className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-700 hover:bg-cyan-600 text-white"
              >
                存快照
              </button>
              <button
                onClick={handleExportJson}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                JSON
              </button>
              {decisionSignals.length ? (
                <button
                  onClick={handleExportDecisionSummary}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  摘要 TXT
                </button>
              ) : null}
              {decisionSignals.length ? (
                <button
                  onClick={handleCopyDecisionSummary}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  {copyStatus === "copied" ? "已複製" : "複製摘要"}
                </button>
              ) : null}
              <button
                onClick={handleExportWealthCsv}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                財富 CSV
              </button>
              <button
                onClick={handleExportAssetCsv}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                資產 CSV
              </button>
              {rebalanceRows.length ? (
                <button
                  onClick={handleExportRebalancingCsv}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  調倉 CSV
                </button>
              ) : null}
              {modeComparisonRows.length ? (
                <button
                  onClick={handleExportModeComparisonCsv}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  比較 CSV
                </button>
              ) : null}
            </div>
          </div>

          {snapshotComparisonRows.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-200">快照比較</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedSnapshot?.name ?? "--"} · Delta = 目前結果 - 快照
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                {snapshotComparisonRows.map((row) => {
                  const isNegative = typeof row.delta === "number" && row.delta < 0;
                  return (
                    <div key={row.key} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                      <p className="text-[11px] text-slate-500 truncate">{row.label}</p>
                      <p className="mt-2 font-mono text-xs font-bold text-slate-100">
                        {formatMetric(row.currentValue, row.kind)}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        快照 {formatMetric(row.snapshotValue, row.kind)}
                      </p>
                      <p className={`mt-1 font-mono text-[11px] font-bold ${isNegative ? "text-rose-300" : "text-emerald-300"}`}>
                        {formatMetricDelta(row.delta, row.kind)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {decisionSignals.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {decisionSignals.map((signal) => (
                <div
                  key={signal.label}
                  className={`rounded-lg border p-3 min-w-0 ${decisionSignalClass(signal.status)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500 truncate">{signal.label}</p>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalBadgeClass(signal.status)}`}
                    >
                      {decisionSignalStatusLabel(signal.status)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={signal.value}>
                    {signal.value}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{signal.note}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {metricGroups.map((group) => (
              <section key={group.title} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="mb-3">
                  <p className="text-xs font-bold text-slate-200">{group.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{group.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {group.cards.map((metric) => {
                    const value = displayResult.metrics[metric.key];
                    const isNegative = typeof value === "number" && value < 0;

                    return (
                      <div key={metric.key} className="rounded-md border border-slate-800 bg-slate-900/60 p-2 min-w-0">
                        <p className="text-[11px] text-slate-600 truncate">{metric.label}</p>
                        <p className={`mt-1 text-sm font-bold font-mono ${isNegative ? "text-rose-200" : "text-slate-100"}`}>
                          {formatMetric(value, metric.kind)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {modeComparisonRows.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-[11px] text-slate-500">模式比較</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">近期交集法 vs 長線重建法</p>
                </div>
                <p className="text-[11px] text-slate-600 font-mono">
                  Delta = 長線重建法 - 近期交集法
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Metric</th>
                      <th className="py-2 px-3 font-medium text-right">近期交集法</th>
                      <th className="py-2 px-3 font-medium text-right">長線重建法</th>
                      <th className="py-2 pl-3 font-medium text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modeComparisonRows.map((row) => (
                      <tr key={row.key} className="border-t border-slate-900">
                        <td className="py-2 pr-3 text-slate-300">{row.label}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {formatMetric(row.overlapValue, row.kind)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">
                          {formatMetric(row.longRebuildValue, row.kind)}
                        </td>
                        <td className={`py-2 pl-3 text-right font-mono ${metricDeltaClass(row.delta)}`}>
                          {formatMetricDelta(row.delta, row.kind)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {rebalanceRows.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">再平衡建議</p>
                <div className="text-right">
                  <p className="text-[11px] text-slate-600 font-mono">{formatMoney(portfolioValue)}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Cost {formatMoney(rebalanceSummary.totalEstimatedCost)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-[11px] text-slate-600">Buy</p>
                  <p className="mt-1 font-mono text-xs text-emerald-300">{formatMoney(rebalanceSummary.totalBuy)}</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-[11px] text-slate-600">Sell</p>
                  <p className="mt-1 font-mono text-xs text-rose-300">{formatMoney(rebalanceSummary.totalSell)}</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-[11px] text-slate-600">Net Cash</p>
                  <p
                    className={`mt-1 font-mono text-xs ${
                      rebalanceSummary.netCashFlow > 0
                        ? "text-emerald-300"
                        : rebalanceSummary.netCashFlow < 0
                          ? "text-rose-300"
                          : "text-slate-300"
                    }`}
                  >
                    {formatMoney(rebalanceSummary.netCashFlow, true)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-[11px] text-slate-600">Turnover</p>
                  <p className="mt-1 font-mono text-xs text-cyan-200">
                    {formatMetric(rebalanceSummary.turnover, "percent")}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                  <p className="text-[11px] text-slate-600">Cost</p>
                  <p className="mt-1 font-mono text-xs text-amber-200">
                    {formatMoney(rebalanceSummary.totalEstimatedCost)}
                  </p>
                </div>
              </div>
              <div className="mb-3 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rebalanceChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="symbol"
                      minTickGap={18}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatShortSymbol}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <Tooltip
                      contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                      labelStyle={{ color: "#cbd5e1" }}
                      formatter={(value, name) => [
                        formatChartPercent(value),
                        String(name) === "currentWeight" ? "Current" : "Target",
                      ]}
                    />
                    <Bar dataKey="currentWeight" name="Current" fill="#64748b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="targetWeight" name="Target" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Asset</th>
                      <th className="py-2 px-3 font-medium text-right">Current</th>
                      <th className="py-2 px-3 font-medium text-right">Target</th>
                      <th className="py-2 px-3 font-medium">Delta</th>
                      <th className="py-2 px-3 font-medium text-right">Trade</th>
                      <th className="py-2 px-3 font-medium text-right">Cost</th>
                      <th className="py-2 pl-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebalanceRows.map((row) => (
                      <tr key={row.symbol} className="border-t border-slate-900">
                        <td className="py-2 pr-3 text-slate-200">
                          <span title={row.symbol} className="block max-w-48 truncate">
                            {row.symbol}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {formatMetric(row.currentWeight, "percent")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">
                          {formatMetric(row.targetWeight, "percent")}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-16 font-mono ${
                                row.deltaWeight > 0 ? "text-emerald-300" : row.deltaWeight < 0 ? "text-rose-300" : "text-slate-400"
                              }`}
                            >
                              {formatSignedWeightDelta(row.deltaWeight)}
                            </span>
                            <div className="h-2 min-w-24 flex-1 rounded-full bg-slate-900 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.deltaWeight >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                                style={{ width: rebalanceBarWidth(row.deltaWeight) }}
                              />
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            row.tradeAmount > 0
                              ? "text-emerald-300"
                              : row.tradeAmount < 0
                                ? "text-rose-300"
                                : "text-slate-400"
                          }`}
                        >
                          {formatMoney(row.tradeAmount, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-200">
                          {formatMoney(row.estimatedCost)}
                        </td>
                        <td className="py-2 pl-3 text-right">
                          <span className={`inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[11px] font-bold ${rebalanceActionClass(row.action)}`}>
                            {rebalanceActionLabel(row.action)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {riskContributionRows.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">風險貢獻</p>
                <p className="text-[11px] text-slate-600 font-mono">Weight / Risk</p>
              </div>
              <div className="space-y-3">
                {riskContributionRows.map((item) => {
                  const isNegative =
                    item.riskContributionPercent !== null &&
                    item.riskContributionPercent !== undefined &&
                    item.riskContributionPercent < 0;
                  return (
                    <div key={item.symbol} className="grid grid-cols-1 md:grid-cols-[11rem_1fr_10rem] gap-2 md:items-center">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-200 truncate" title={item.symbol}>
                          {item.symbol}
                        </p>
                        <p className="text-[11px] text-slate-600 font-mono">
                          {formatMetric(item.weight, "percent")}
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isNegative ? "bg-cyan-400" : "bg-rose-400"}`}
                          style={{ width: riskContributionBarWidth(item.riskContributionPercent) }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono md:text-right">
                        <span className={isNegative ? "text-cyan-200" : "text-rose-200"}>
                          {formatMetric(item.riskContributionPercent, "percent")}
                        </span>
                        <span className="text-slate-500">{formatMetric(item.marginalRisk, "percent")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {efficientFrontier?.points?.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] text-slate-500">有效前緣</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">候選組合風險 / 報酬分布</p>
                </div>
                <p className="text-[11px] text-slate-600 font-mono">
                  {efficientFrontier.points.length} scenarios
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={efficientFrontier.points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      type="number"
                      dataKey="annualVolatility"
                      name="年化波動"
                      domain={["auto", "auto"]}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <YAxis
                      type="number"
                      dataKey="annualReturn"
                      name="年化報酬"
                      domain={["auto", "auto"]}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <Tooltip
                      contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                      labelStyle={{ color: "#cbd5e1" }}
                      formatter={(value, name) => {
                        const label = String(name);
                        if (label === "annualVolatility") return [formatChartPercent(value), "年化波動"];
                        if (label === "sharpe") {
                          const numeric = Number(value);
                          return [Number.isFinite(numeric) ? numeric.toFixed(2) : "--", "Sharpe"];
                        }
                        return [formatChartPercent(value), "年化報酬"];
                      }}
                    />
                    <Scatter
                      data={efficientFrontier.points}
                      name="候選組合"
                      fill="#475569"
                      fillOpacity={0.45}
                      isAnimationActive={false}
                    />
                    <Line
                      data={efficientFrontier.frontier}
                      type="monotone"
                      dataKey="annualReturn"
                      name="有效前緣"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#67e8f9" }}
                      isAnimationActive={false}
                    />
                    {efficientFrontier.selectedPoint?.annualReturn !== null &&
                    efficientFrontier.selectedPoint?.annualVolatility !== null ? (
                      <Scatter
                        data={[efficientFrontier.selectedPoint]}
                        name="AI 建議"
                        fill="#facc15"
                        isAnimationActive={false}
                      />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">財富指數曲線</p>
                <p className="text-[11px] text-slate-600 font-mono">Base 100</p>
              </div>
              <div className="h-72 w-full">
                {wealthChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wealthChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="date"
                        minTickGap={28}
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickFormatter={formatChartDate}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickFormatter={formatChartNumber}
                      />
                      <Tooltip
                        contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                        labelStyle={{ color: "#cbd5e1" }}
                        formatter={(value) => [formatChartNumber(value), "財富指數"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: "#67e8f9" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-md text-xs text-slate-600">
                    尚無曲線資料
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <p className="text-[11px] text-slate-500 mb-3">資產統計</p>
              <div className="space-y-2">
                {(displayResult.assetStatistics ?? []).map((asset) => (
                  <div key={asset.symbol} className="border-b border-slate-900 last:border-0 pb-2 last:pb-0">
                    <p className="text-xs text-slate-200 truncate">{asset.symbol}</p>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <span className="text-emerald-300">{formatMetric(asset.annualReturn, "percent")}</span>
                      <span className="text-amber-300">{formatMetric(asset.annualVolatility, "percent")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[11px] text-slate-500">回撤曲線</p>
              <p className="text-[11px] text-slate-600 font-mono">Peak to trough</p>
            </div>
            <div className="h-56 w-full">
              {drawdownChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={drawdownChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="date"
                      minTickGap={28}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartDate}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <Tooltip
                      contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                      labelStyle={{ color: "#cbd5e1" }}
                      formatter={(value) => [formatChartPercent(value), "回撤"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#fb7185"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#fda4af" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-md text-xs text-slate-600">
                  尚無回撤資料
                </div>
              )}
            </div>
          </div>

          {correlationMatrix?.symbols?.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">相關係數矩陣</p>
                <p className="text-[11px] text-slate-600 font-mono">-1.00 ~ 1.00</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11px]">
                  <thead>
                    <tr>
                      <th className="w-28 px-2 py-1 text-left font-medium text-slate-600">Asset</th>
                      {correlationMatrix.symbols.map((symbol, index) => (
                        <th key={`${symbol}-${index}`} className="max-w-[6rem] px-2 py-1 text-center font-medium text-slate-500">
                          <span title={symbol} className="block truncate">
                            {symbol}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationMatrix.symbols.map((rowSymbol, rowIndex) => (
                      <tr key={`${rowSymbol}-${rowIndex}`}>
                        <th className="max-w-[8rem] px-2 py-2 text-left font-medium text-slate-300">
                          <span title={rowSymbol} className="block truncate">
                            {rowSymbol}
                          </span>
                        </th>
                        {correlationMatrix.symbols.map((columnSymbol, columnIndex) => {
                          const value = correlationMatrix.values?.[rowIndex]?.[columnIndex] ?? null;
                          return (
                            <td
                              key={`${rowSymbol}-${rowIndex}-${columnSymbol}-${columnIndex}`}
                              className={`h-9 min-w-[4rem] rounded-md border px-2 text-center align-middle font-mono ${correlationCellClass(value)}`}
                            >
                              {formatCorrelation(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {optimizationResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <p className="text-[11px] text-slate-500 mb-2">AI 建議權重</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                {optimizationResult.weights.map((weightRow) => (
                  <div key={weightRow.symbol} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300 truncate">{weightRow.symbol}</span>
                    <span className="text-cyan-200 font-mono">{(weightRow.weight * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-slate-400 font-mono">
            {displayResult.dataWindow.startDate ?? "--"} ~ {displayResult.dataWindow.endDate ?? "--"} ·{" "}
            {displayResult.dataWindow.observations} observations
          </div>
        </div>
      )}
    </section>
  );
}
