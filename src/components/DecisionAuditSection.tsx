import type { DecisionAuditRecord } from "@/lib/investmentCommitteeWorkflow";

type DecisionAuditSectionProps = {
  decisionAuditId: string;
  decisionOwner: string;
  onDecisionOwnerChange: (value: string) => void;
  decisionApprover: string;
  onDecisionApproverChange: (value: string) => void;
  onRefreshDecisionVersion: () => void;
  onExportDecisionAuditCsv: () => void;
  decisionAuditGeneratedText: string;
  decisionAuditRecords: DecisionAuditRecord[];
};

export function DecisionAuditSection({
  decisionAuditId,
  decisionOwner,
  onDecisionOwnerChange,
  decisionApprover,
  onDecisionApproverChange,
  onRefreshDecisionVersion,
  onExportDecisionAuditCsv,
  decisionAuditGeneratedText,
  decisionAuditRecords,
}: DecisionAuditSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">決策包稽核紀錄</h5>
            <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-200 border border-cyan-500/30">
              {decisionAuditId}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將本次政策、簽核、交易清單與版本時間整理成可追蹤紀錄
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[140px_140px_auto_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">決策人</span>
            <input
              type="text"
              value={decisionOwner}
              onChange={(event) => onDecisionOwnerChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">簽核單位</span>
            <input
              type="text"
              value={decisionApprover}
              onChange={(event) => onDecisionApproverChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <button
            onClick={onRefreshDecisionVersion}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold"
          >
            刷新版本
          </button>
          <button
            onClick={onExportDecisionAuditCsv}
            className="sm:self-end px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-bold"
          >
            稽核 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["決策包", decisionAuditId],
          ["版本時間", decisionAuditGeneratedText],
          ["決策人", decisionOwner.trim() || "--"],
          ["簽核單位", decisionApprover.trim() || "--"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">欄位</th>
              <th className="py-2 px-3 font-medium">值</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {decisionAuditRecords.map((item) => (
              <tr key={item.label} className="border-t border-slate-900">
                <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                <td className="py-2 px-3 font-mono text-slate-200">{item.value}</td>
                <td className="py-2 px-3 text-slate-500">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
