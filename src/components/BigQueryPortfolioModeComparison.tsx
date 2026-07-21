import type { BigQueryPortfolioMetricCard } from "./BigQueryPortfolioMetricGroups";

export type BigQueryPortfolioModeComparisonRow = BigQueryPortfolioMetricCard & {
  overlapValue: number | null;
  longRebuildValue: number | null;
  delta: number | null;
};

type BigQueryPortfolioModeComparisonProps = {
  rows: BigQueryPortfolioModeComparisonRow[];
  formatMetric: (value: number | null, kind: BigQueryPortfolioMetricCard["kind"]) => string;
  formatMetricDelta: (value: number | null, kind: BigQueryPortfolioMetricCard["kind"]) => string;
};

function metricDeltaClass(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "text-slate-500";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

export function BigQueryPortfolioModeComparison({
  rows,
  formatMetric,
  formatMetricDelta,
}: BigQueryPortfolioModeComparisonProps) {
  if (!rows.length) return null;

  return (
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
            {rows.map((row) => (
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
  );
}
