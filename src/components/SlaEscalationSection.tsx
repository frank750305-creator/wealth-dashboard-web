import {
  executionHandoffPriorityClass,
  executionHandoffPriorityLabel,
} from "@/lib/executionOperationsWorkflow";
import {
  slaEscalationTierLabel,
  type SlaEscalationItem,
} from "@/lib/operatingControlWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type SlaEscalationSectionProps = {
  slaEscalationDecision: ExecutionReviewStatus;
  slaCriticalHours: number;
  onSlaCriticalHoursChange: (value: number) => void;
  slaReviewHours: number;
  onSlaReviewHoursChange: (value: number) => void;
  onExportSlaEscalationCsv: () => void;
  slaEscalationItems: SlaEscalationItem[];
  slaCriticalCount: number;
  slaReviewCount: number;
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

export function SlaEscalationSection({
  slaEscalationDecision,
  slaCriticalHours,
  onSlaCriticalHoursChange,
  slaReviewHours,
  onSlaReviewHoursChange,
  onExportSlaEscalationCsv,
  slaEscalationItems,
  slaCriticalCount,
  slaReviewCount,
}: SlaEscalationSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">SLA 升級矩陣</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(slaEscalationDecision)}`}>
              {executionReviewLabel(slaEscalationDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將例外事項與 CIO 狀態轉成處理時限、升級路徑與責任人
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[100px_100px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">L1 小時</span>
            <input
              type="number"
              min={1}
              max={168}
              step={1}
              value={slaCriticalHours}
              onChange={(event) => onSlaCriticalHoursChange(Math.min(168, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">L2 小時</span>
            <input
              type="number"
              min={1}
              max={336}
              step={1}
              value={slaReviewHours}
              onChange={(event) => onSlaReviewHoursChange(Math.min(336, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportSlaEscalationCsv}
            disabled={!slaEscalationItems.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            SLA CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["升級項目", `${slaEscalationItems.length} 項`],
          ["L1 立即", `${slaCriticalCount} 項`],
          ["L2 覆核", `${slaReviewCount} 項`],
          ["升級狀態", executionReviewLabel(slaEscalationDecision)],
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
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">層級</th>
              <th className="py-2 px-3 font-medium">負責人</th>
              <th className="py-2 px-3 font-medium">觸發項</th>
              <th className="py-2 px-3 font-medium text-right">優先級</th>
              <th className="py-2 px-3 font-medium text-right">時限</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium">升級路徑</th>
              <th className="py-2 px-3 font-medium">動作</th>
            </tr>
          </thead>
          <tbody>
            {slaEscalationItems.map((item) => (
              <tr key={`${item.tier}-${item.trigger}-${item.owner}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{slaEscalationTierLabel(item.tier)}</td>
                <td className="py-2 px-3 text-slate-300">{item.owner}</td>
                <td className="py-2 px-3 text-slate-200">{item.trigger}</td>
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
                <td className="py-2 px-3 text-slate-400">{item.escalationPath}</td>
                <td className="py-2 px-3 text-slate-500">{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
