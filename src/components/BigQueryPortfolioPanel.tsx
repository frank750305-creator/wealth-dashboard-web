"use client";

import { useMemo, useState } from "react";
import { analyzePortfolioFromBigQuery } from "@/lib/marketApi";
import type { PortfolioAnalysisResponse } from "@/types/market";

type AssetRow = {
  id: string;
  symbol: string;
  weight: number;
  currency: string;
};

type BigQueryPortfolioPanelProps = {
  hasBigQueryCredentials: boolean;
};

const initialRows: AssetRow[] = [
  { id: "asset-0050", symbol: "0050.TW", weight: 50, currency: "TWD" },
  { id: "asset-spy", symbol: "SPDR S&P500 ETF", weight: 50, currency: "USD" },
];

const metricCards: Array<{
  key: keyof PortfolioAnalysisResponse["metrics"];
  label: string;
  kind: "percent" | "number";
}> = [
  { key: "cagr", label: "CAGR", kind: "percent" },
  { key: "annualVolatility", label: "年化波動", kind: "percent" },
  { key: "sharpe", label: "Sharpe", kind: "number" },
  { key: "maxDrawdown", label: "最大回撤", kind: "percent" },
  { key: "beta", label: "Beta", kind: "number" },
  { key: "alpha", label: "Alpha", kind: "percent" },
];

function makeRow(): AssetRow {
  return {
    id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol: "",
    weight: 0,
    currency: "USD",
  };
}

function formatMetric(value: number | null, kind: "percent" | "number") {
  if (value === null || !Number.isFinite(value)) return "--";
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}

export function BigQueryPortfolioPanel({ hasBigQueryCredentials }: BigQueryPortfolioPanelProps) {
  const [rows, setRows] = useState<AssetRow[]>(initialRows);
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("0050.TW");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priceBasis, setPriceBasis] = useState<"adjusted" | "raw">("adjusted");
  const [pricingCurrency, setPricingCurrency] = useState<"original" | "TWD">("TWD");
  const [mode, setMode] = useState<"overlap" | "long_rebuild">("overlap");
  const [result, setResult] = useState<PortfolioAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0),
    [rows],
  );

  const canSubmit = hasBigQueryCredentials && rows.some((row) => row.symbol.trim()) && !isAnalyzing;

  function updateRow(id: string, patch: Partial<AssetRow>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
  }

  async function handleAnalyze() {
    setError(null);
    setResult(null);

    if (!hasBigQueryCredentials) {
      setError("Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。");
      return;
    }

    const activeRows = rows.filter((row) => row.symbol.trim());
    if (!activeRows.length) {
      setError("至少需要一個商品代號。");
      return;
    }

    setIsAnalyzing(true);
    try {
      const weightsBySymbol = Object.fromEntries(
        activeRows.map((row) => [row.symbol.trim(), Number(row.weight) / 100]),
      );
      const currencyBySymbol = Object.fromEntries(
        activeRows.map((row) => [row.symbol.trim(), row.currency.trim().toUpperCase() || "USD"]),
      );

      const response = await analyzePortfolioFromBigQuery({
        weights_by_symbol: weightsBySymbol,
        benchmark_symbol: benchmarkSymbol.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        price_basis: priceBasis,
        pricing_currency: pricingCurrency,
        currency_by_symbol: currencyBySymbol,
        mode,
      });

      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-cyan-300">▍ BigQuery 投組分析工作台</h3>
          <p className="text-[11px] text-slate-500 mt-1">daily_prices / daily_fx</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!canSubmit}
          className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isAnalyzing ? "分析中" : "執行分析"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_72px_82px_36px] gap-2 text-[11px] text-slate-500 px-1">
            <span>商品代號</span>
            <span>權重%</span>
            <span>幣別</span>
            <span />
          </div>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_72px_82px_36px] gap-2">
              <input
                value={row.symbol}
                onChange={(event) => updateRow(row.id, { symbol: event.target.value })}
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
            <button
              onClick={() => setRows((currentRows) => [...currentRows, makeRow()])}
              className="w-9 h-9 rounded-md bg-slate-950 border border-slate-700 text-cyan-300 hover:border-cyan-600"
              title="新增商品"
            >
              +
            </button>
            <p className={`text-xs font-mono ${Math.abs(totalWeight - 100) < 0.01 ? "text-emerald-300" : "text-amber-300"}`}>
              {totalWeight.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">Benchmark</span>
            <input
              value={benchmarkSymbol}
              onChange={(event) => setBenchmarkSymbol(event.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
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

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {metricCards.map((metric) => (
              <div key={metric.key} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <p className="text-[11px] text-slate-500 mb-1">{metric.label}</p>
                <p className="text-lg font-bold text-slate-100 font-mono">
                  {formatMetric(result.metrics[metric.key], metric.kind)}
                </p>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {result.dataWindow.startDate ?? "--"} ~ {result.dataWindow.endDate ?? "--"} ·{" "}
            {result.dataWindow.observations} observations
          </div>
        </div>
      )}
    </section>
  );
}
