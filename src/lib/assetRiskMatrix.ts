import type { BigQueryAssetHistoryResponse } from "@/types/market";

const TRADING_DAYS = 252;

export type AssetRiskGroup = "tw" | "us_etf" | "fx" | "fund" | "other";

export type AssetRiskMatrixRow = {
  symbol: string;
  group: AssetRiskGroup;
  groupLabel: string;
  firstDate: string | null;
  latestDate: string | null;
  ageYears: number | null;
  rowCount: number;
  observationCount: number;
  latestPrice: number | null;
  totalReturn: number | null;
  annualizedReturn: number | null;
  sharpe: number | null;
  annualizedVolatility: number | null;
  downsideDeviation: number | null;
  skewness: number | null;
  kurtosis: number | null;
  beta: number | null;
  treynor: number | null;
  alpha: number | null;
  appraisalRatio: number | null;
  maxDrawdown: number | null;
};

type ReturnPoint = {
  date: string;
  dailyReturn: number;
};

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeDivide(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || Math.abs(denominator) < 1e-12) return null;
  return numerator / denominator;
}

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values: number[]) {
  if (values.length < 2) return null;
  const average = mean(values);
  if (average === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}

function covariance(left: number[], right: number[]) {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = mean(left);
  const rightMean = mean(right);
  if (leftMean === null || rightMean === null) return null;
  return left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0) / (left.length - 1);
}

function skewness(values: number[]) {
  if (values.length < 3) return null;
  const average = mean(values);
  const std = sampleStd(values);
  if (average === null || std === null || std <= 0) return null;
  return values.reduce((sum, value) => sum + ((value - average) / std) ** 3, 0) / values.length;
}

function kurtosis(values: number[]) {
  if (values.length < 4) return null;
  const average = mean(values);
  const std = sampleStd(values);
  if (average === null || std === null || std <= 0) return null;
  return values.reduce((sum, value) => sum + ((value - average) / std) ** 4, 0) / values.length;
}

function yearsBetween(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / 31557600000;
}

function inferRiskGroup(symbol: string): { group: AssetRiskGroup; groupLabel: string } {
  const upper = symbol.toUpperCase();
  if (/^[0-9]{4,6}\.TW$/.test(upper)) return { group: "tw", groupLabel: "台股標的" };
  if (["SPY", "QQQ", "VOO", "VTI", "IVV", "DIA", "IWM", "AGG", "BND", "TLT", "GLD", "SLV", "VNQ"].includes(upper)) {
    return { group: "us_etf", groupLabel: "美股 ETF" };
  }
  if (/^[A-Z]{3}[_-]?[A-Z]{3}$/.test(upper)) return { group: "fx", groupLabel: "匯率" };
  if (upper.includes("FUND") || upper.includes("基金")) return { group: "fund", groupLabel: "基金" };
  return { group: "other", groupLabel: "其他標的" };
}

function returnPointsFromHistory(history: BigQueryAssetHistoryResponse): ReturnPoint[] {
  const sortedPoints = [...history.prices]
    .filter((point) => point.date)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));

  const result: ReturnPoint[] = [];
  let previousPrice: number | null = null;
  for (const point of sortedPoints) {
    const selectedPrice = finiteNumber(point.selected_price);
    const apiReturn = finiteNumber(point.daily_return);
    const computedReturn =
      selectedPrice !== null && previousPrice !== null && previousPrice > 0
        ? selectedPrice / previousPrice - 1
        : null;
    const dailyReturn = apiReturn ?? computedReturn;
    if (selectedPrice !== null) previousPrice = selectedPrice;
    if (point.date && dailyReturn !== null) {
      result.push({ date: point.date, dailyReturn });
    }
  }

  return result;
}

export function buildAssetRiskMatrixRow({
  history,
  benchmarkHistory,
  riskFreeRate,
}: {
  history: BigQueryAssetHistoryResponse;
  benchmarkHistory: BigQueryAssetHistoryResponse | null;
  riskFreeRate: number;
}): AssetRiskMatrixRow {
  const returns = returnPointsFromHistory(history);
  const dailyReturns = returns.map((point) => point.dailyReturn);
  const annualizedReturn = finiteNumber(history.metrics.annualizedReturn);
  const annualizedVolatility =
    finiteNumber(history.metrics.annualizedVolatility) ??
    (sampleStd(dailyReturns) !== null ? sampleStd(dailyReturns)! * Math.sqrt(TRADING_DAYS) : null);
  const downsideReturns = dailyReturns.filter((value) => value < 0);
  const downsideDeviation = downsideReturns.length ? (sampleStd(downsideReturns) ?? 0) * Math.sqrt(TRADING_DAYS) : null;
  const sharpe = safeDivide(
    annualizedReturn !== null ? annualizedReturn - riskFreeRate : null,
    annualizedVolatility,
  );

  let beta: number | null = null;
  let alpha: number | null = null;
  let treynor: number | null = null;
  let appraisalRatio: number | null = null;
  if (benchmarkHistory) {
    const benchmarkByDate = new Map(returnPointsFromHistory(benchmarkHistory).map((point) => [point.date, point.dailyReturn]));
    const pairedAsset: number[] = [];
    const pairedBenchmark: number[] = [];
    returns.forEach((point) => {
      const benchmarkReturn = benchmarkByDate.get(point.date);
      if (typeof benchmarkReturn === "number" && Number.isFinite(benchmarkReturn)) {
        pairedAsset.push(point.dailyReturn);
        pairedBenchmark.push(benchmarkReturn);
      }
    });

    if (pairedAsset.length > 30) {
      const benchmarkVariance = covariance(pairedBenchmark, pairedBenchmark);
      const assetBenchmarkCovariance = covariance(pairedAsset, pairedBenchmark);
      beta = safeDivide(assetBenchmarkCovariance, benchmarkVariance);
      const assetMean = mean(pairedAsset);
      const benchmarkMean = mean(pairedBenchmark);
      if (beta !== null && assetMean !== null && benchmarkMean !== null) {
        const intercept = assetMean - beta * benchmarkMean;
        alpha = intercept * TRADING_DAYS;
        treynor = safeDivide(annualizedReturn !== null ? annualizedReturn - riskFreeRate : null, beta);
        const residuals = pairedAsset.map((value, index) => value - (intercept + beta! * pairedBenchmark[index]));
        const residualRisk = sampleStd(residuals);
        appraisalRatio = safeDivide(alpha, residualRisk !== null ? residualRisk * Math.sqrt(TRADING_DAYS) : null);
      }
    }
  }

  const groupInfo = inferRiskGroup(history.symbol);

  return {
    symbol: history.symbol,
    ...groupInfo,
    firstDate: history.summary.first_date,
    latestDate: history.summary.latest_date,
    ageYears: yearsBetween(history.summary.first_date, history.summary.latest_date),
    rowCount: history.summary.row_count,
    observationCount: dailyReturns.length,
    latestPrice: finiteNumber(history.metrics.latestPrice),
    totalReturn: finiteNumber(history.metrics.totalReturn),
    annualizedReturn,
    sharpe,
    annualizedVolatility,
    downsideDeviation,
    skewness: skewness(dailyReturns),
    kurtosis: kurtosis(dailyReturns),
    beta,
    treynor,
    alpha,
    appraisalRatio,
    maxDrawdown: finiteNumber(history.metrics.maxDrawdown),
  };
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function assetRiskMatrixCsv(rows: AssetRiskMatrixRow[], benchmarkSymbol: string, riskFreeRate: number) {
  const header = [
    "symbol",
    "group",
    "benchmark",
    "risk_free_rate",
    "first_date",
    "latest_date",
    "age_years",
    "row_count",
    "observation_count",
    "latest_price",
    "total_return",
    "annualized_return",
    "sharpe",
    "standard_deviation",
    "semi_deviation",
    "skewness",
    "kurtosis",
    "beta",
    "treynor",
    "alpha",
    "appraisal_ratio",
    "max_drawdown",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.groupLabel,
    benchmarkSymbol,
    riskFreeRate,
    row.firstDate ?? "",
    row.latestDate ?? "",
    row.ageYears ?? "",
    row.rowCount,
    row.observationCount,
    row.latestPrice ?? "",
    row.totalReturn ?? "",
    row.annualizedReturn ?? "",
    row.sharpe ?? "",
    row.annualizedVolatility ?? "",
    row.downsideDeviation ?? "",
    row.skewness ?? "",
    row.kurtosis ?? "",
    row.beta ?? "",
    row.treynor ?? "",
    row.alpha ?? "",
    row.appraisalRatio ?? "",
    row.maxDrawdown ?? "",
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
