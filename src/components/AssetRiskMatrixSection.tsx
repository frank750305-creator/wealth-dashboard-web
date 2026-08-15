import type { AssetRiskMatrixRow } from "@/lib/assetRiskMatrix";

type AssetRiskMatrixSectionProps = {
  rows: AssetRiskMatrixRow[];
  benchmarkSymbol: string;
  onBenchmarkSymbolChange: (value: string) => void;
  riskFreeRatePercent: number;
  onRiskFreeRatePercentChange: (value: number) => void;
  priceBasis: "adjusted" | "raw";
  isLoading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  onExportCsv: () => void;
};

function formatNumber(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatYears(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "--";
}

function metricTone(value: number | null | undefined, goodAbove = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "bg-slate-950 text-slate-500";
  if (value >= goodAbove) return "bg-emerald-500/15 text-emerald-200";
  return "bg-rose-500/15 text-rose-200";
}

function riskTone(value: number | null | undefined, watchAbove: number, riskAbove: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "bg-slate-950 text-slate-500";
  const absValue = Math.abs(value);
  if (absValue >= riskAbove) return "bg-rose-500/15 text-rose-200";
  if (absValue >= watchAbove) return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function groupClass(group: AssetRiskMatrixRow["group"]) {
  if (group === "tw") return "bg-cyan-500/20 text-cyan-100";
  if (group === "us_etf") return "bg-emerald-500/20 text-emerald-100";
  if (group === "fx") return "bg-violet-500/20 text-violet-100";
  if (group === "fund") return "bg-amber-500/20 text-amber-100";
  return "bg-slate-800 text-slate-200";
}

function matrixCellClass(extraClass = "") {
  return `border-r border-slate-800 px-3 py-2 text-right font-mono ${extraClass}`;
}

export function AssetRiskMatrixSection({
  rows,
  benchmarkSymbol,
  onBenchmarkSymbolChange,
  riskFreeRatePercent,
  onRiskFreeRatePercentChange,
  priceBasis,
  isLoading,
  error,
  onRefresh,
  onExportCsv,
}: AssetRiskMatrixSectionProps) {
  const averageSharpe = rows.length
    ? rows.reduce((sum, row) => sum + (row.sharpe ?? 0), 0) / rows.filter((row) => typeof row.sharpe === "number").length
    : null;
  const highBetaCount = rows.filter((row) => typeof row.beta === "number" && Math.abs(row.beta) > 1.2).length;
  const negativeAlphaCount = rows.filter((row) => typeof row.alpha === "number" && row.alpha < 0).length;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono text-cyan-300">RISK MATRIX</p>
          <h3 className="mt-1 text-sm font-bold text-slate-100">多標的風險矩陣</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {priceBasis === "adjusted" ? "Adjusted" : "Raw"} 價格口徑 · 以 BigQuery 可用完整歷史計算；Beta / Alpha 以基準標的對齊日報酬
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[140px_140px_auto_auto] gap-2 text-xs xl:min-w-[560px]">
          <label className="space-y-1">
            <span className="text-slate-500">基準</span>
            <input
              value={benchmarkSymbol}
              onChange={(event) => onBenchmarkSymbolChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-600"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">無風險利率</span>
            <input
              type="number"
              step={0.1}
              value={riskFreeRatePercent}
              onChange={(event) => onRiskFreeRatePercentChange(Number(event.target.value))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-slate-100 outline-none focus:border-cyan-600"
            />
          </label>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="md:self-end rounded-md bg-cyan-700 px-3 py-2 font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
          >
            {isLoading ? "計算中" : "重新計算"}
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!rows.length}
            className="md:self-end rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-bold text-slate-100 hover:border-cyan-700 hover:text-cyan-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-700"
          >
            風險 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          ["標的數", `${rows.length}`],
          ["平均 Sharpe", formatNumber(Number.isFinite(averageSharpe) ? averageSharpe : null, 2)],
          ["高 Beta", `${highBetaCount}`],
          ["負 Alpha", `${negativeAlphaCount}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/10 p-3 text-xs text-amber-200 whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-[1760px] w-full border-collapse text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                {[
                  "名稱",
                  "類型",
                  "資料起始日",
                  "資料年期",
                  "累積報酬",
                  "年化報酬",
                  "最新價",
                  "Sharpe",
                  "標準差",
                  "半標準差",
                  "偏度",
                  "峰度",
                  "β",
                  "Treynor",
                  "α",
                  "Appraisal ratio",
                  "最大回撤",
                  "樣本數",
                ].map((label) => (
                  <th key={label} className="border-b border-r border-slate-800 px-3 py-2 text-right font-bold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} className="border-b border-slate-800 bg-slate-950/70 hover:bg-slate-900">
                  <td className="border-r border-slate-800 px-3 py-2 text-left font-mono font-bold text-cyan-100">
                    {row.symbol}
                  </td>
                  <td className="border-r border-slate-800 px-3 py-2 text-left">
                    <span className={`rounded px-2 py-1 text-[10px] font-bold ${groupClass(row.group)}`}>
                      {row.groupLabel}
                    </span>
                  </td>
                  <td className={matrixCellClass("text-slate-300")}>{row.firstDate ?? "--"}</td>
                  <td className={matrixCellClass("text-blue-200")}>{formatYears(row.ageYears)}</td>
                  <td className={matrixCellClass(metricTone(row.totalReturn))}>{formatPercent(row.totalReturn)}</td>
                  <td className={matrixCellClass(metricTone(row.annualizedReturn))}>{formatPercent(row.annualizedReturn)}</td>
                  <td className={matrixCellClass("text-slate-200")}>{formatNumber(row.latestPrice, 4)}</td>
                  <td className={matrixCellClass(metricTone(row.sharpe))}>{formatNumber(row.sharpe, 3)}</td>
                  <td className={matrixCellClass(riskTone(row.annualizedVolatility, 0.12, 0.25))}>{formatPercent(row.annualizedVolatility)}</td>
                  <td className={matrixCellClass(riskTone(row.downsideDeviation, 0.08, 0.18))}>{formatPercent(row.downsideDeviation)}</td>
                  <td className={matrixCellClass("bg-sky-500/15 text-sky-100")}>{formatNumber(row.skewness, 2)}</td>
                  <td className={matrixCellClass("bg-fuchsia-500/15 text-fuchsia-100")}>{formatNumber(row.kurtosis, 2)}</td>
                  <td className={matrixCellClass(riskTone(row.beta, 1.0, 1.5))}>{formatNumber(row.beta, 2)}</td>
                  <td className={matrixCellClass(metricTone(row.treynor))}>{formatNumber(row.treynor, 3)}</td>
                  <td className={matrixCellClass(metricTone(row.alpha))}>{formatPercent(row.alpha)}</td>
                  <td className={matrixCellClass(metricTone(row.appraisalRatio))}>{formatNumber(row.appraisalRatio, 3)}</td>
                  <td className={matrixCellClass("bg-rose-500/15 text-rose-100")}>{formatPercent(row.maxDrawdown)}</td>
                  <td className={matrixCellClass("text-slate-400")}>{row.observationCount.toLocaleString("zh-TW")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-5 text-xs text-slate-500">
          選取多個標的並按「比較商品」後，這裡會一次顯示完整風險矩陣。
        </div>
      )}
    </section>
  );
}
