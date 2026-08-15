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
  PortfolioOptimizeBigQueryPayload,
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

type ManualWeightRow = {
  symbol: string;
  weightPercent: number;
};

const analysisMode = "long_rebuild" as const;

type OptimizationMode = PortfolioOptimizeBigQueryPayload["optimization_mode"];

const optimizationModeOptions: Array<{
  id: OptimizationMode;
  label: string;
  note: string;
}> = [
  { id: "max_return", label: "報酬最大", note: "選歷史年化報酬最高的組合" },
  { id: "min_vol", label: "風險最小", note: "選歷史波動最低的組合" },
  { id: "max_sharpe", label: "最優 Sharpe", note: "選單位風險報酬最好的組合" },
  { id: "target_vol", label: "目標標準差", note: "在客戶可承擔波動內追求報酬" },
];

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
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .filter((symbol) => {
      if (seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .slice(0, 12);
}

function currencyBySymbol(symbols: string[]) {
  return Object.fromEntries(symbols.map((symbol) => [symbol, inferCurrency(symbol)]));
}

function clampWeightPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function equalWeightPercent(symbolCount: number) {
  return symbolCount ? Number((100 / symbolCount).toFixed(2)) : 0;
}

function normalizeManualWeights(rows: ManualWeightRow[]) {
  const total = rows.reduce((sum, row) => sum + Math.max(row.weightPercent, 0), 0);
  if (total <= 0) return null;
  return Object.fromEntries(
    rows.map((row) => [row.symbol, Math.max(row.weightPercent, 0) / total]),
  );
}

function normalizeTargetVolatilityPercent(value: number) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(Math.max(value, 1), 80);
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
  const selectedSymbolKey = dedupeSymbols(symbols).join("|");
  const selectedSymbols = useMemo(
    () => (selectedSymbolKey ? selectedSymbolKey.split("|") : []),
    [selectedSymbolKey],
  );
  const [analysisResult, setAnalysisResult] = useState<PortfolioAnalysisResponse | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<PortfolioOptimizationResponse | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BigQueryAssetHistoryResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [optimizationStatus, setOptimizationStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [message, setMessage] = useState("");
  const [optimizationMessage, setOptimizationMessage] = useState("");
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>("max_sharpe");
  const [targetVolatilityPercent, setTargetVolatilityPercent] = useState(12);
  const [manualWeightsBySymbol, setManualWeightsBySymbol] = useState<Record<string, number>>({});
  const [analysisContextKey, setAnalysisContextKey] = useState("");
  const [optimizationContextKey, setOptimizationContextKey] = useState("");

  const activeBenchmark = benchmarkSymbol.trim().toUpperCase();
  const canRun = hasBigQueryCredentials && selectedSymbols.length > 0;
  const selectedOptimizationMode = optimizationModeOptions.find((option) => option.id === optimizationMode);
  const manualWeightRows = useMemo(() => {
    const fallbackWeight = equalWeightPercent(selectedSymbols.length);
    return selectedSymbols.map((symbol) => ({
      symbol,
      weightPercent: clampWeightPercent(manualWeightsBySymbol[symbol] ?? fallbackWeight),
    }));
  }, [manualWeightsBySymbol, selectedSymbols]);
  const manualWeightTotal = manualWeightRows.reduce((sum, row) => sum + row.weightPercent, 0);
  const normalizedManualWeights = useMemo(() => normalizeManualWeights(manualWeightRows), [manualWeightRows]);
  const manualWeightKey = manualWeightRows.map((row) => `${row.symbol}:${row.weightPercent.toFixed(4)}`).join("|");
  const currentAnalysisKey = `${selectedSymbolKey}|${activeBenchmark}|${priceBasis}|${manualWeightKey}`;
  const currentOptimizationKey = `${selectedSymbolKey}|${activeBenchmark}|${priceBasis}|${optimizationMode}|${targetVolatilityPercent}`;
  const displayResult = analysisContextKey === currentAnalysisKey ? analysisResult : null;
  const currentOptimizationResult = optimizationContextKey === currentOptimizationKey ? optimizationResult : null;
  const chartRows = useMemo(
    () => buildPortfolioChartRows(displayResult, benchmarkHistory),
    [displayResult, benchmarkHistory],
  );
  const annualRows = useMemo(() => buildAnnualReturnRows(displayResult), [displayResult]);
  const aiWeightRows = currentOptimizationResult?.weights ?? [];
  const hasOptimizedWeights = Boolean(currentOptimizationResult?.weights?.length);

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

  function handleManualWeightChange(symbol: string, value: number) {
    setManualWeightsBySymbol((current) => ({
      ...current,
      [symbol]: clampWeightPercent(value),
    }));
    setAnalysisResult(null);
    setBenchmarkHistory(null);
    setAnalysisContextKey("");
    setStatus("idle");
    setMessage("");
  }

  function handleResetEqualWeights() {
    const weight = equalWeightPercent(selectedSymbols.length);
    setManualWeightsBySymbol(Object.fromEntries(selectedSymbols.map((symbol) => [symbol, weight])));
    setAnalysisResult(null);
    setBenchmarkHistory(null);
    setAnalysisContextKey("");
    setStatus("idle");
    setMessage("");
  }

  function handleApplyOptimizedWeights() {
    if (!currentOptimizationResult?.weights?.length) return;
    setManualWeightsBySymbol(
      Object.fromEntries(
        currentOptimizationResult.weights.map((weightRow) => [
          weightRow.symbol,
          Number((Math.max(weightRow.weight ?? 0, 0) * 100).toFixed(2)),
        ]),
      ),
    );
    setAnalysisResult(null);
    setBenchmarkHistory(null);
    setAnalysisContextKey("");
    setStatus("idle");
    setMessage("已把 AI 權重套用到輸入權重。請按「執行組合分析」重新計算主圖表與累積報酬。");
  }

  async function handleRunAnalysis() {
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
    if (!normalizedManualWeights) {
      setStatus("error");
      setMessage("請至少輸入一個大於 0% 的權重。");
      return;
    }

    setStatus("loading");
    setMessage("");
    setAnalysisResult(null);
    setAnalysisContextKey("");
    setBenchmarkHistory(null);

    const analysisPromise = analyzePortfolioFromBigQuery({
      ...basePayload,
      weights_by_symbol: normalizedManualWeights,
    });
    const benchmarkPromise = activeBenchmark
      ? fetchBigQueryAssetHistory(activeBenchmark, priceBasis, { limit: 20000 })
      : Promise.resolve(null);

    const [analysisSettled, benchmarkSettled] = await Promise.allSettled([
      analysisPromise,
      benchmarkPromise,
    ]);

    if (analysisSettled.status === "fulfilled") {
      setAnalysisResult(analysisSettled.value);
      setAnalysisContextKey(currentAnalysisKey);
    }
    if (benchmarkSettled.status === "fulfilled") {
      setBenchmarkHistory(benchmarkSettled.value);
    }

    const warnings = [
      analysisSettled.status === "rejected"
        ? `組合歷史分析失敗：${analysisSettled.reason instanceof Error ? analysisSettled.reason.message : String(analysisSettled.reason)}`
        : "",
      benchmarkSettled.status === "rejected"
        ? `基準線圖讀取失敗：${benchmarkSettled.reason instanceof Error ? benchmarkSettled.reason.message : String(benchmarkSettled.reason)}`
        : "",
    ].filter(Boolean);

    setMessage(warnings.join("\n"));
    setStatus(analysisSettled.status === "fulfilled" ? "loaded" : "error");
  }

  async function handleRunOptimization() {
    if (!hasBigQueryCredentials) {
      setOptimizationStatus("error");
      setOptimizationMessage("Vercel 尚未設定 BigQuery 憑證。");
      return;
    }
    if (selectedSymbols.length < 2) {
      setOptimizationStatus("error");
      setOptimizationMessage("AI 調整至少需要兩個標的。");
      return;
    }

    setOptimizationStatus("loading");
    setOptimizationMessage("");
    setOptimizationResult(null);
    setOptimizationContextKey("");

    try {
      const response = await optimizePortfolioFromBigQuery({
        ...basePayload,
        symbols: selectedSymbols,
        optimization_mode: optimizationMode,
        target_volatility: optimizationMode === "target_vol"
          ? normalizeTargetVolatilityPercent(targetVolatilityPercent) / 100
          : null,
      });
      setOptimizationResult(response);
      setOptimizationContextKey(currentOptimizationKey);
      setOptimizationStatus("loaded");
    } catch (error) {
      setOptimizationStatus("error");
      setOptimizationMessage(`AI 權重最佳化失敗：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-mono text-cyan-300">PORTFOLIO ANALYTICS</p>
          <h3 className="mt-1 text-sm font-bold text-slate-100">組合分析</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            先輸入各標的權重，再用該組合計算歷史線圖、年度報酬、相關係數與效率前緣。
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
            {status === "loading" ? "分析中" : "用輸入權重分析"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-900/60 bg-cyan-950/10 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-bold text-cyan-200">步驟 1：輸入組合權重</p>
            <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
              這裡是主分析的計算依據；輸入完後按右上「用輸入權重分析」。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-fit rounded px-2 py-1 text-[10px] font-mono font-bold ${
              Math.abs(manualWeightTotal - 100) <= 0.01 ? "bg-cyan-700 text-white" : "bg-amber-100 text-amber-700"
            }`}>
              合計 {manualWeightTotal.toFixed(2)}%
            </span>
            <button
              type="button"
              onClick={handleResetEqualWeights}
              disabled={!selectedSymbols.length}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-cyan-500 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
            >
              重設等權
            </button>
          </div>
        </div>

        {manualWeightRows.length ? (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {manualWeightRows.map((weightRow) => {
              const normalizedWeight = Math.max(0, Math.min(1, weightRow.weightPercent / 100));
              return (
                <div key={weightRow.symbol} className="rounded-md border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-bold text-slate-200" title={weightRow.symbol}>{weightRow.symbol}</span>
                    <label className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={weightRow.weightPercent}
                        onChange={(event) => handleManualWeightChange(weightRow.symbol, Number(event.target.value))}
                        className="w-20 bg-transparent text-right font-mono font-bold text-cyan-200 outline-none"
                      />
                      <span className="text-slate-500">%</span>
                    </label>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${normalizedWeight * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
            先在上方選取標的，這裡會顯示可輸入的組合權重。
          </div>
        )}
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-200">效率前緣 / AI 調整</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {selectedOptimizationMode?.note ?? "選擇最佳化目標後執行 AI 調整。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleRunOptimization()}
              disabled={!hasBigQueryCredentials || selectedSymbols.length < 2 || optimizationStatus === "loading"}
              className="rounded-md bg-cyan-700 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
            >
              {optimizationStatus === "loading" ? "AI 調整中" : "執行 AI 調整"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {optimizationModeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setOptimizationMode(option.id)}
                className={`rounded-md border px-3 py-2 text-left text-xs font-bold transition ${
                  optimizationMode === option.id
                    ? "border-cyan-400 bg-cyan-950/50 text-cyan-100"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {optimizationMode === "target_vol" ? (
            <label className="mt-3 flex max-w-xs flex-col gap-1 text-[11px] font-bold text-slate-500">
              客戶可承擔標準差
              <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
                <input
                  type="number"
                  min={1}
                  max={80}
                  step={0.5}
                  value={targetVolatilityPercent}
                  onChange={(event) => setTargetVolatilityPercent(normalizeTargetVolatilityPercent(Number(event.target.value)))}
                  className="w-full bg-transparent font-mono text-sm font-bold text-slate-100 outline-none"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </label>
          ) : null}

          {optimizationMessage ? (
            <div className="mt-3 whitespace-pre-wrap rounded-md border border-amber-900/60 bg-amber-950/10 p-3 text-xs leading-5 text-amber-200">
              {optimizationMessage}
            </div>
          ) : null}

          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-200">AI 調整後權重</p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                  {hasOptimizedWeights
                    ? `已依「${selectedOptimizationMode?.label ?? currentOptimizationResult?.optimizationMode}」產生建議。`
                    : "執行 AI 調整後，這裡會顯示建議權重。"}
                  {currentOptimizationResult?.optimizationMode === "target_vol" && currentOptimizationResult.targetVolatility !== null
                    ? ` 目標標準差 ${formatPercent(currentOptimizationResult.targetVolatility, 1)}。`
                    : ""}
                </p>
              </div>
              {hasOptimizedWeights ? (
                <button
                  type="button"
                  onClick={handleApplyOptimizedWeights}
                  className="rounded-md border border-cyan-500 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-950/60"
                >
                  套用到上方權重
                </button>
              ) : null}
            </div>

            {aiWeightRows.length ? (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {aiWeightRows.map((weightRow) => {
                  const normalizedWeight = Math.max(0, Math.min(1, weightRow.weight ?? 0));
                  return (
                    <div key={weightRow.symbol} className="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-bold text-slate-200" title={weightRow.symbol}>{weightRow.symbol}</span>
                        <span className="font-mono font-bold text-cyan-200">{formatPercent(weightRow.weight, 1)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${normalizedWeight * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                尚未產生 AI 權重。
              </div>
            )}
          </div>

          <BigQueryPortfolioEfficientFrontier
            efficientFrontier={currentOptimizationResult?.efficientFrontier}
            formatChartPercent={formatChartPercent}
            variant="embedded"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
        <BigQueryPortfolioCorrelationMatrix matrix={displayResult?.correlationMatrix} />
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
    </section>
  );
}
