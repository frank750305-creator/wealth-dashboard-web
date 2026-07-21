import type { PortfolioAnalysisWeight } from "@/types/market";

type BigQueryPortfolioOptimizationWeightsProps = {
  weights: PortfolioAnalysisWeight[] | undefined;
};

export function BigQueryPortfolioOptimizationWeights({
  weights,
}: BigQueryPortfolioOptimizationWeightsProps) {
  if (!weights?.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <p className="text-[11px] text-slate-500 mb-2">AI 建議權重</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {weights.map((weightRow) => (
          <div key={weightRow.symbol} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-300 truncate">{weightRow.symbol}</span>
            <span className="text-cyan-200 font-mono">{(weightRow.weight * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
