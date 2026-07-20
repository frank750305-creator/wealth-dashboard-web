type CopyStatus = "idle" | "copied";

type BigQueryPortfolioResultExportBarProps = {
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  memoCopyStatus: CopyStatus;
  copyStatus: CopyStatus;
  hasMonitoringRules: boolean;
  hasDecisionSignals: boolean;
  hasRebalanceRows: boolean;
  hasModeComparisonRows: boolean;
  onSaveSnapshot: () => void;
  onExportJson: () => void;
  onExportCommitteeMemo: () => void;
  onCopyCommitteeMemo: () => void;
  onExportMonitoringCsv: () => void;
  onExportDecisionSummary: () => void;
  onCopyDecisionSummary: () => void;
  onExportWealthCsv: () => void;
  onExportAssetCsv: () => void;
  onExportRebalancingCsv: () => void;
  onExportModeComparisonCsv: () => void;
};

export function BigQueryPortfolioResultExportBar({
  startDate,
  endDate,
  memoCopyStatus,
  copyStatus,
  hasMonitoringRules,
  hasDecisionSignals,
  hasRebalanceRows,
  hasModeComparisonRows,
  onSaveSnapshot,
  onExportJson,
  onExportCommitteeMemo,
  onCopyCommitteeMemo,
  onExportMonitoringCsv,
  onExportDecisionSummary,
  onCopyDecisionSummary,
  onExportWealthCsv,
  onExportAssetCsv,
  onExportRebalancingCsv,
  onExportModeComparisonCsv,
}: BigQueryPortfolioResultExportBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div>
        <p className="text-xs font-bold text-slate-200">分析結果匯出</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {startDate ?? "--"} ~ {endDate ?? "--"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onSaveSnapshot}
          className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-700 hover:bg-cyan-600 text-white"
        >
          存快照
        </button>
        <button
          onClick={onExportJson}
          className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
        >
          JSON
        </button>
        <button
          onClick={onExportCommitteeMemo}
          className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
        >
          Memo MD
        </button>
        <button
          onClick={onCopyCommitteeMemo}
          className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
        >
          {memoCopyStatus === "copied" ? "已複製" : "複製 Memo"}
        </button>
        {hasMonitoringRules ? (
          <button
            onClick={onExportMonitoringCsv}
            className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            監控 CSV
          </button>
        ) : null}
        {hasDecisionSignals ? (
          <button
            onClick={onExportDecisionSummary}
            className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            摘要 TXT
          </button>
        ) : null}
        {hasDecisionSignals ? (
          <button
            onClick={onCopyDecisionSummary}
            className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            {copyStatus === "copied" ? "已複製" : "複製摘要"}
          </button>
        ) : null}
        <button
          onClick={onExportWealthCsv}
          className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
        >
          財富 CSV
        </button>
        <button
          onClick={onExportAssetCsv}
          className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
        >
          資產 CSV
        </button>
        {hasRebalanceRows ? (
          <button
            onClick={onExportRebalancingCsv}
            className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            調倉 CSV
          </button>
        ) : null}
        {hasModeComparisonRows ? (
          <button
            onClick={onExportModeComparisonCsv}
            className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            比較 CSV
          </button>
        ) : null}
      </div>
    </div>
  );
}
