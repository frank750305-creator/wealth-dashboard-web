import {
  executionHandoffPriorityClass,
  executionHandoffPriorityLabel,
  type ExecutionHandoffItem,
} from "@/lib/executionOperationsWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type ExecutionHandoffSectionProps = {
  executionOwner: string;
  onExecutionOwnerChange: (value: string) => void;
  riskOwner: string;
  onRiskOwnerChange: (value: string) => void;
  settlementOwner: string;
  onSettlementOwnerChange: (value: string) => void;
  handoffDueDays: number;
  onHandoffDueDaysChange: (value: number) => void;
  onExportExecutionHandoffCsv: () => void;
  handoffBlockCount: number;
  handoffWatchCount: number;
  handoffHighPriorityCount: number;
  executionHandoffItems: ExecutionHandoffItem[];
};

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
  if (status === "watch") return "bg-amber-500/15 text-amber-200 border border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border border-rose-500/30";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-slate-900";
  if (status === "watch") return "border-amber-500/20 bg-amber-500/5";
  return "border-rose-500/20 bg-rose-500/5";
}

export function ExecutionHandoffSection({
  executionOwner,
  onExecutionOwnerChange,
  riskOwner,
  onRiskOwnerChange,
  settlementOwner,
  onSettlementOwnerChange,
  handoffDueDays,
  onHandoffDueDaysChange,
  onExportExecutionHandoffCsv,
  handoffBlockCount,
  handoffWatchCount,
  handoffHighPriorityCount,
  executionHandoffItems,
}: ExecutionHandoffSectionProps) {
  const handoffStatus: ExecutionReviewStatus = handoffBlockCount > 0 ? "block" : handoffWatchCount > 0 ? "watch" : "pass";

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">執行交接清單</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(handoffStatus)}`}>
              暫停 {handoffBlockCount} / 觀察 {handoffWatchCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將簽核後的交易、風控與結算事項轉成可交接的任務清單
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[120px_120px_120px_100px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">交易負責人</span>
            <input
              type="text"
              value={executionOwner}
              onChange={(event) => onExecutionOwnerChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">風控負責人</span>
            <input
              type="text"
              value={riskOwner}
              onChange={(event) => onRiskOwnerChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">中台負責人</span>
            <input
              type="text"
              value={settlementOwner}
              onChange={(event) => onSettlementOwnerChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">追蹤天數</span>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={handoffDueDays}
              onChange={(event) => onHandoffDueDaysChange(Math.min(30, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportExecutionHandoffCsv}
            className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold"
          >
            交接 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["任務數", `${executionHandoffItems.length} 項`],
          ["高優先", `${handoffHighPriorityCount} 項`],
          ["交易負責", executionOwner.trim() || "--"],
          ["追蹤期限", `T+${handoffDueDays}`],
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
        <table className="w-full min-w-[1040px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">負責人</th>
              <th className="py-2 px-3 font-medium">任務</th>
              <th className="py-2 px-3 font-medium text-right">優先級</th>
              <th className="py-2 px-3 font-medium text-right">期限</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium">依據</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {executionHandoffItems.map((item) => (
              <tr key={`${item.owner}-${item.task}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{item.owner}</td>
                <td className="py-2 px-3 text-slate-200">{item.task}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                    {executionHandoffPriorityLabel(item.priority)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.due}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                    {executionReviewLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 px-3 font-mono text-slate-400">{item.evidence}</td>
                <td className="py-2 px-3 text-slate-500">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
