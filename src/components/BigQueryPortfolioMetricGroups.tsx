import type { PortfolioAnalysisResponse } from "@/types/market";

export type BigQueryPortfolioMetricCard = {
  key: keyof PortfolioAnalysisResponse["metrics"];
  label: string;
  kind: "percent" | "number";
};

export type BigQueryPortfolioMetricGroup = {
  title: string;
  subtitle: string;
  cards: BigQueryPortfolioMetricCard[];
};

type BigQueryPortfolioMetricGroupsProps = {
  groups: BigQueryPortfolioMetricGroup[];
  metrics: PortfolioAnalysisResponse["metrics"];
  formatMetric: (value: number | null, kind: BigQueryPortfolioMetricCard["kind"]) => string;
};

export function BigQueryPortfolioMetricGroups({
  groups,
  metrics,
  formatMetric,
}: BigQueryPortfolioMetricGroupsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {groups.map((group) => (
        <section key={group.title} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-200">{group.title}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{group.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {group.cards.map((metric) => {
              const value = metrics[metric.key];
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
  );
}
