type BigQueryPortfolioHeaderProps = {
  canSubmit: boolean;
  isAnalyzing: boolean;
  isOptimizing: boolean;
  isComparingModes: boolean;
  onAnalyze: () => void;
  onOptimize: () => void;
  onCompareModes: () => void;
};

export function BigQueryPortfolioHeader({
  canSubmit,
  isAnalyzing,
  isOptimizing,
  isComparingModes,
  onAnalyze,
  onOptimize,
  onCompareModes,
}: BigQueryPortfolioHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <div>
        <h3 className="text-sm font-bold text-cyan-300">▍ BigQuery 投組分析工作台</h3>
        <p className="text-[11px] text-slate-500 mt-1">daily_prices / daily_fx</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAnalyze}
          disabled={!canSubmit}
          className="px-3 py-2 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isAnalyzing ? "分析中" : "執行分析"}
        </button>
        <button
          onClick={onOptimize}
          disabled={!canSubmit}
          className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isOptimizing ? "調倉中" : "AI 調倉"}
        </button>
        <button
          onClick={onCompareModes}
          disabled={!canSubmit}
          className="px-3 py-2 text-xs font-bold rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isComparingModes ? "比較中" : "比較模式"}
        </button>
      </div>
    </div>
  );
}
