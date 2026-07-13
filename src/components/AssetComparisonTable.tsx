import {
  decisionSignalClass,
  decisionSignalLabel,
  formatCount,
  formatPrice,
  qualityBadgeClass,
  qualityLabel,
  type AssetComparisonRow,
} from "@/lib/assetResearchWorkflow";

type AssetComparisonTableProps = {
  rows: AssetComparisonRow[];
  onLoadAssetProfile: (symbol: string) => void;
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function signedMetricClass(value: number | null | undefined) {
  return typeof value === "number" && value < 0 ? "text-rose-300" : "text-emerald-300";
}

export function AssetComparisonTable({ rows, onLoadAssetProfile }: AssetComparisonTableProps) {
  return (
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
          {rows.map((row) => (
            <tr key={row.symbol} className="border-t border-slate-900">
              <td className="py-2 pr-3">
                <button
                  onClick={() => onLoadAssetProfile(row.symbol)}
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
              <td className={`py-2 px-3 text-right font-mono ${signedMetricClass(row.totalReturn)}`}>
                {formatPercent(row.totalReturn)}
              </td>
              <td className={`py-2 px-3 text-right font-mono ${signedMetricClass(row.annualizedReturn)}`}>
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
  );
}
