"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  analyzePortfolioFromBigQuery,
  fetchBigQueryAssetHistory,
  optimizePortfolioFromBigQuery,
} from "@/lib/marketApi";
import type {
  BigQueryAssetHistoryResponse,
  PortfolioAnalysisResponse,
  PortfolioOptimizationResponse,
  PortfolioWealthPoint,
} from "@/types/market";
import { BigQueryPortfolioCorrelationMatrix } from "./BigQueryPortfolioCorrelationMatrix";
import { BigQueryPortfolioEfficientFrontier } from "./BigQueryPortfolioEfficientFrontier";

type PortfolioAnalyticsSectionProps = {
  symbols: string[];
  benchmarkSymbol: string;
  priceBasis: "adjusted" | "raw";
  riskFreeRatePercent: number;
  hasBigQueryCredentials: boolean;
};

type PortfolioChartRow = {
  date: string;
  portfolio: number | null;
  benchmark: number | null;
};

type AnnualReturnRow = {
  year: string;
  annualReturn: number;
};

const analysisMode = "long_rebuild" as const;
const optimizationMode = "max_sharpe" as const;

function formatNumber(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatPercent(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : "--";
}

function formatChartPercent(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)}%` : "--";
}

function formatChartIndex(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(0) : "--";
}

function formatChartDate(value: unknown) {
  if (typeof value !== "string" || value.length < 7) return "--";
  return value.slice(2, 7).replace("-", "/");
}

function inferCurrency(symbol: string) {
  return symbol.trim().toUpperCase().endsWith(".TW") ? "TWD" : "USD";
}

function dedupeSymbols(symbols: string[]) {
  const seen = new Set<string>();
  return symbols
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

function equalWeightsBySymbol(symbols: string[]) {
  const weight = symbols.length ? 1 / symbols.length : 0;
  return Object.fromEntries(symbols.map((symbol) => [symbol, weight]));
}

function currencyBySymbol(symbols: string[]) {
  return Object.fromEntries(symbols.map((symbol) => [symbol, inferCurrency(symbol)]));
}

function buildBenchmarkIndexByDate(
  history: BigQueryAssetHistoryResponse | null,
  wealthPath: PortfolioWealthPoint[],
) {
  if (!history?.prices?.length || !wealthPath.length) return new Map<string, number>();

  const sortedPrices = [...history.prices]
    .filter((point) => point.date && typeof point.selected_price === "number" && Number.isFinite(point.selected_price))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
  const result = new Map<string, number>();
  let priceIndex = 0;
  let latestPrice: number | null = null;
  let basePrice: number | null = null;

  wealthPath.forEach((point) => {
    const date = point.date;
    if (!date) return;

    while (
      priceIndex < sortedPrices.length &&
      String(sortedPrices[priceIndex].date) <= date
    ) {
      latestPrice = sortedPrices[priceIndex].selected_price ?? null;
      priceIndex += 1;
    }

    if (latestPrice !== null && latestPrice > 0 && basePrice === null) {
      basePrice = latestPrice;
    }
    if (latestPrice !== null && latestPrice > 0 && basePrice !== null && basePrice > 0) {
      result.set(date, (latestPrice / basePrice) * 100);
    }
  });

  return result;
}

function buildPortfolioChartRows(
  result: PortfolioAnalysisResponse | PortfolioOptimizationResponse | null,
  benchmarkHistory: BigQueryAssetHistoryResponse | null,
): PortfolioChartRow[] {
  if (!result?.wealthPath?.length) return [];
  const benchmarkByDate = buildBenchmarkIndexByDate(benchmarkHistory, result.wealthPath);

  return result.wealthPath.flatMap((point) => {
    if (!point.date) return [];
    return [{
      date: point.date,
      portfolio: point.value,
      benchmark: benchmarkByDate.get(point.date) ?? null,
    }];
  });
}

function buildAnnualReturnRows(result: PortfolioAnalysisResponse | PortfolioOptimizationResponse | null): AnnualReturnRow[] {
  if (!result?.wealthPath?.length) return [];
  const compoundedByYear = new Map<string, number>();

  result.wealthPath.forEach((point) => {
    if (!point.date || typeof point.dailyReturn !== "number" || !Number.isFinite(point.dailyReturn)) return;
    const year = point.date.slice(0, 4);
    compoundedByYear.set(year, (compoundedByYear.get(year) ?? 1) * (1 + point.dailyReturn));
  });

  return [...compoundedByYear.entries()]
    .map(([year, compounded]) => ({ year, annualReturn: compounded - 1 }))
    .sort((left, right) => left.year.localeCompare(right.year));
}

function metricCards(result: PortfolioAnalysisResponse | PortfolioOptimizationResponse | null) {
  return [
    ["累積報酬", formatPercent(result?.metrics.cumulativeReturn)],
    ["年化報酬", formatPercent(result?.metrics.cagr)],
    ["年化波動", formatPercent(result?.metrics.annualVolatility)],
    ["Sharpe", formatNumber(result?.metrics.sharpe, 2)],
    ["最大回撤", formatPercent(result?.metrics.maxDrawdown)],
    ["觀察日數", result ? result.dataWindow.observations.toLocaleString("zh-TW") : "--"],
  ];
}

export function PortfolioAnalyticsSection({
  symbols,
  benchmarkSymbol,
  priceBasis,
  riskFreeRatePercent,
  hasBigQueryCredentials,
}: PortfolioAnalyticsSectionProps) {
  const selectedSymbols = useMemo(() => dedupeSymbols(symbols), [symbols]);
  const [analysisResult, setAnalysisResult] = useState<PortfolioAnalysisResponse | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<PortfolioOptimizationResponse | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BigQueryAssetHistoryResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [message, setMessage] = useState("");

  const displayResult = optimizationResult ?? analysisResult;
  const chartRows = useMemo(
    () => buildPortfolioChartRows(displayResult, benchmarkHistory),
    [displayResult, benchmarkHistory],
  );
  const annualRows = useMemo(() => buildAnnualReturnRows(displayResult), [displayResult]);
  const activeBenchmark = benchmarkSymbol.trim();
  const canRun = hasBigQueryCredentials && selectedSymbols.length > 0;

  const handleRunAnalysis = async () => {
    if (!hasBigQueryCredentials) {
      setStatus("error");
      setMessage("Vercel 尚未設定 BigQuery 憑證。");
      return;
    }
    if (!selectedSymbols.length) {
      setStatus("error");
      setMessage("請先在上方選取至少一個標的。");
      return;
    }

    setStatus("loading");
    setMessage("");
    setAnalysisResult(null);
    setOptimizationResult(null);
    setBenchmarkHistory(null);

    const basePayload = {
      benchmark_symbol: activeBenchmark || null,
      start_date: null,
      end_date: null,
      price_basis: priceBasis,
      pricing_currency: "original" as const,
      currency_by_symbol: currencyBySymbol(selectedSymbols),
      mode: analysisMode,
      confidence_level: 0.95,
      risk_free_rate: riskFreeRatePercent / 100,
    };

    const analysisPromise = analyzePortfolioFromBigQuery({
      ...basePayload,
      weights_by_symbol: equalWeightsBySymbol(selectedSymbols),
    });
    const optimizationPromise = selectedSymbols.length >= 2
      ? optimizePortfolioFromBigQuery({
          ...basePayload,
          symbols: selectedSymbols,
          optimization_mode: optimizationMode,
          target_volatility: null,
        })
      : Promise.resolve(null);
    const benchmarkPromise = activeBenchmark
      ? fetchBigQueryAssetHistory(activeBenchmark, priceBasis, { limit: 20000 })
      : Promise.resolve(null);

    const [analysisSettled, optimizationSettled, benchmarkSettled] = await Promise.allSettled([
      analysisPromise,
      optimizationPromise,
      benchmarkPromise,
    ]);

    if (analysisSettled.status === "fulfilled") {
      setAnalysisResult(analysisSettled.value);
    }
    if (optimizationSettled.status === "fulfilled") {
      setOptimizationResult(optimizationSettled.value);
    }
    if (benchmarkSettled.status === "fulfilled") {
      setBenchmarkHistory(benchmarkSettled.value);
    }

    const warnings = [
      analysisSettled.status === "rejected"
        ? `組合歷史分析失敗：${analysisSettled.reason instanceof Error ? analysisSettled.reason.message : String(analysisSettled.reason)}`
        : "",
      optimizationSettled.status === "rejected"
        ? `AI 權重最佳化失敗：${optimizationSettled.reason instanceof Error ? optimizationSettled.reason.message : String(optimizationSettled.reason)}`
        : "",
      benchmarkSettled.status === "rejected"
        ? `基準線圖讀取失敗：${benchmarkSettled.reason instanceof Error ? benchmarkSettled.reason.message : String(benchmarkSettled.reason)}`
        : "",
    ].filter(Boolean);

    setMessage(warnings.join("\n"));
    setStatus(analysisSettled.status === "fulfilled" || optimizationSettled.status === "fulfilled" ? "loaded" : "error");
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-mono text-cyan-300">PORTFOLIO ANALYTICS</p>
          <h3 className="mt-1 text-sm font-bold text-slate-100">組合分析</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            用已選標的建立等權組合，並輸出組合歷史線圖、年度報酬、相關係數與 AI 權重最佳化。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[320px]">
            <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
              <p className="text-[10px] text-slate-500">已選標的</p>
              <p className="mt-1 font-mono text-lg font-bold text-slate-100">{selectedSymbols.length}</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
              <p className="text-[10px] text-slate-500">比較基準</p>
              <p className="mt-1 truncate font-mono text-lg font-bold text-slate-100">{activeBenchmark || "--"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleRunAnalysis()}
            disabled={!canRun || status === "loading"}
            className="rounded-md bg-cyan-700 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
          >
            {status === "loading" ? "分析中" : "執行組合分析"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="whitespace-pre-wrap rounded-lg border border-amber-900/60 bg-amber-950/10 p-3 text-xs leading-5 text-amber-200">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {metricCards(displayResult).map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-slate-200">組合歷史線圖</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Base 100，可與右上角基準比較</p>
            </div>
            <span className="rounded bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-500">
              {priceBasis}
            </span>
          </div>
          <div className="h-72">
            {chartRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis dataKey="date" minTickGap={28} tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={formatChartIndex} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(value, name) => [formatChartIndex(value), name === "portfolio" ? "組合" : activeBenchmark || "基準"]}
                    labelFormatter={(value) => String(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="portfolio" name="組合" stroke="#0891b2" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="benchmark" name={activeBenchmark || "基準"} stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-800 text-xs text-slate-500">
                執行組合分析後顯示歷史線圖
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-slate-200">每年漲跌幅</p>
              <p className="mt-0.5 text-[11px] text-slate-500">用組合每日報酬逐年複利</p>
            </div>
            <span className="rounded bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-500">
              {annualRows.length} years
            </span>
          </div>
          <div className="h-72">
            {annualRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualRows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={formatChartPercent} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip formatter={(value) => [formatChartPercent(value), "年度報酬"]} />
                  <Bar dataKey="annualReturn" name="年度報酬" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-800 text-xs text-slate-500">
                執行組合分析後顯示年度柱狀圖
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <BigQueryPortfolioCorrelationMatrix matrix={displayResult?.correlationMatrix} />
        <div className="space-y-4">
          <BigQueryPortfolioEfficientFrontier
            efficientFrontier={optimizationResult?.efficientFrontier}
            formatChartPercent={formatChartPercent}
          />
          {optimizationResult?.weights?.length ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-[11px] font-bold text-slate-200">AI 調整後權重</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {optimizationResult.weights.map((weightRow) => (
                  <div key={weightRow.symbol} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs">
                    <span className="truncate text-slate-300" title={weightRow.symbol}>{weightRow.symbol}</span>
                    <span className="font-mono font-bold text-cyan-200">{formatPercent(weightRow.weight, 1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
