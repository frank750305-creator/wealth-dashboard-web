type CopyStatus = "idle" | "copied";

type BigQueryPortfolioAssetToolsProps = {
  totalWeight: number;
  symbolCopyStatus: CopyStatus;
  configCopyStatus: CopyStatus;
  bulkConfigText: string;
  onBulkConfigTextChange: (value: string) => void;
  onAddRow: () => void;
  onNormalizeWeights: () => void;
  onEqualWeight: () => void;
  onMergeDuplicateSymbols: () => void;
  onClearBlankRows: () => void;
  onSortByWeight: () => void;
  onSortBySymbol: () => void;
  onInferCurrencies: () => void;
  onCopySymbols: () => void;
  onCopyConfiguration: () => void;
  onApplyBulkConfiguration: () => void;
  onExportConfigurationCsv: () => void;
  onResetConfiguration: () => void;
};

export function BigQueryPortfolioAssetTools({
  totalWeight,
  symbolCopyStatus,
  configCopyStatus,
  bulkConfigText,
  onBulkConfigTextChange,
  onAddRow,
  onNormalizeWeights,
  onEqualWeight,
  onMergeDuplicateSymbols,
  onClearBlankRows,
  onSortByWeight,
  onSortBySymbol,
  onInferCurrencies,
  onCopySymbols,
  onCopyConfiguration,
  onApplyBulkConfiguration,
  onExportConfigurationCsv,
  onResetConfiguration,
}: BigQueryPortfolioAssetToolsProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddRow}
            className="w-9 h-9 rounded-md bg-slate-950 border border-slate-700 text-cyan-300 hover:border-cyan-600"
            title="新增商品"
          >
            +
          </button>
          <button
            onClick={onNormalizeWeights}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            正規化
          </button>
          <button
            onClick={onEqualWeight}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            等權
          </button>
          <button
            onClick={onMergeDuplicateSymbols}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            合併
          </button>
          <button
            onClick={onClearBlankRows}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            清空白
          </button>
          <button
            onClick={onSortByWeight}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            排序
          </button>
          <button
            onClick={onSortBySymbol}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            代號
          </button>
          <button
            onClick={onInferCurrencies}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            幣別
          </button>
          <button
            onClick={onCopySymbols}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            {symbolCopyStatus === "copied" ? "已複製" : "複代號"}
          </button>
          <button
            onClick={onCopyConfiguration}
            className="h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            {configCopyStatus === "copied" ? "已複製" : "複配置"}
          </button>
        </div>
        <div className="text-right">
          <p className={`text-xs font-mono ${Math.abs(totalWeight - 100) < 0.01 ? "text-emerald-300" : "text-amber-300"}`}>
            {totalWeight.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-600">權重總和</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-slate-500">批次配置</span>
          <span className="font-mono text-slate-600">CSV / TSV</span>
        </div>
        <textarea
          value={bulkConfigText}
          onChange={(event) => onBulkConfigTextChange(event.target.value)}
          rows={3}
          placeholder={"symbol,weight_percent,currency\n0050.TW,50,TWD\nSPY,50,USD"}
          className="w-full resize-y rounded-md border border-slate-800 bg-slate-900 px-2 py-2 font-mono text-[11px] text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onApplyBulkConfiguration}
            disabled={!bulkConfigText.trim()}
            className="h-9 px-3 rounded-md bg-cyan-700 text-[11px] font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            套用貼上
          </button>
          <button
            onClick={onExportConfigurationCsv}
            className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
          >
            下載 CSV
          </button>
          <button
            onClick={onResetConfiguration}
            className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-amber-500 hover:text-amber-200"
          >
            重設預設
          </button>
        </div>
      </div>
    </>
  );
}
