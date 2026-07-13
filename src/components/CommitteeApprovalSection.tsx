import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import {
  committeeDecisionLabel,
  committeeDecisionStatus,
  type CommitteeDecision,
} from "@/lib/investmentCommitteeWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type CommitteeApprovalSectionProps = {
  committeeDecision: CommitteeDecision;
  onExportCommitteeApprovalCsv: () => void;
  canExport: boolean;
  committeeBlockCount: number;
  committeeWatchCount: number;
  tradeTicketCount: number;
  committeeApprovalItems: ExecutionReviewItem[];
};

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-emerald-500/10 bg-emerald-950/5";
  if (status === "watch") return "border-amber-500/10 bg-amber-950/5";
  return "border-rose-500/10 bg-rose-950/5";
}

export function CommitteeApprovalSection({
  committeeDecision,
  onExportCommitteeApprovalCsv,
  canExport,
  committeeBlockCount,
  committeeWatchCount,
  tradeTicketCount,
  committeeApprovalItems,
}: CommitteeApprovalSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">投委會簽核摘要</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(committeeDecisionStatus(committeeDecision))}`}>
              {committeeDecisionLabel(committeeDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將交易前檢核與交易後監控合併成可送簽的最終決策摘要
          </p>
        </div>
        <button
          onClick={onExportCommitteeApprovalCsv}
          disabled={!canExport}
          className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          簽核 CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["簽核建議", committeeDecisionLabel(committeeDecision)],
          ["暫停項目", `${committeeBlockCount} 項`],
          ["觀察項目", `${committeeWatchCount} 項`],
          ["送簽交易", `${tradeTicketCount} 檔`],
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
        <table className="w-full min-w-[920px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">項目</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium text-right">目前值</th>
              <th className="py-2 px-3 font-medium">門檻</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {committeeApprovalItems.map((item) => (
              <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                    {executionReviewLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                <td className="py-2 px-3 text-slate-500">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
