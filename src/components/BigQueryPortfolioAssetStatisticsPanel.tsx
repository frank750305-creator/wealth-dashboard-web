import type { PortfolioAssetStatistic } from "@/types/market";

type BigQueryPortfolioAssetStatisticsPanelProps = {
  assets: PortfolioAssetStatistic[];
  formatMetric: (value: number | null, kind: "percent" | "number") => string;
};

export function BigQueryPortfolioAssetStatisticsPanel({
  assets,
  formatMetric,
}: BigQueryPortfolioAssetStatisticsPanelProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <p className="text-[11px] text-slate-500 mb-3">資產統計</p>
      <div className="space-y-2">
        {assets.map((asset) => (
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
  );
}
