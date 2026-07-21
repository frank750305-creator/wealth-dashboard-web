import type { PortfolioRiskContribution } from "@/types/market";

type BigQueryPortfolioRiskContributionPanelProps = {
  rows: PortfolioRiskContribution[];
  formatMetric: (value: number | null, kind: "percent" | "number") => string;
};

function riskContributionBarWidth(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0%";
  return `${Math.min(Math.abs(value) * 100, 100).toFixed(1)}%`;
}

export function BigQueryPortfolioRiskContributionPanel({
  rows,
  formatMetric,
}: BigQueryPortfolioRiskContributionPanelProps) {
  if (!rows.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] text-slate-500">風險貢獻</p>
        <p className="text-[11px] text-slate-600 font-mono">Weight / Risk</p>
      </div>
      <div className="space-y-3">
        {rows.map((item) => {
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
  );
}
