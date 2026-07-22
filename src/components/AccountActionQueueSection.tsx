import {
  accountActionMotionLabel,
  accountActionPriorityLabel,
  accountActionStatusLabel,
  type AccountActionMotion,
  type AccountActionPriority,
  type AccountActionQueueItem,
  type AccountActionQueueSummary,
} from "@/lib/accountActionQueue";
import { accountHealthStageClass, accountHealthStageLabel } from "@/lib/accountHealth";

type AccountActionQueueSectionProps = {
  summary: AccountActionQueueSummary;
  items: AccountActionQueueItem[];
  onExportCsv: () => void;
};

function formatCurrency(value: number) {
  if (value === 0) return "NT$0";
  return `NT$${value.toLocaleString("zh-TW")}`;
}

function statusBadgeClass(status: AccountActionQueueSummary["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function priorityBadgeClass(priority: AccountActionPriority) {
  if (priority === "p0") return "bg-rose-500/15 text-rose-200";
  if (priority === "p1") return "bg-amber-500/15 text-amber-200";
  if (priority === "p2") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function motionBadgeClass(motion: AccountActionMotion) {
  if (motion === "retain") return "bg-rose-500/15 text-rose-200";
  if (motion === "stabilize") return "bg-amber-500/15 text-amber-200";
  if (motion === "expand") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

export function AccountActionQueueSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: AccountActionQueueSectionProps) {
  const metrics = [
    ["行動", `${summary.actionCount}`],
    ["P0", `${summary.p0Count}`],
    ["P1", `${summary.p1Count}`],
    ["保留", `${summary.retentionCount}`],
    ["穩定", `${summary.stabilizationCount}`],
    ["擴售", `${summary.expansionCount}`],
    ["風險 MRR", formatCurrency(summary.mrrAtRisk)],
    ["擴售 Pipeline", formatCurrency(summary.expansionPipelineMrr)],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">續約 / 擴售行動隊列</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {accountActionStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把 Account Health 轉成客戶成功、銷售與產品團隊可以執行的優先任務
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                <p className="text-[10px] text-slate-600">{label}</p>
                <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={!items.length}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            行動隊列 CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1500px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Workspace</th>
              <th className="py-2 px-3 font-medium">Motion</th>
              <th className="py-2 px-3 font-medium">Stage</th>
              <th className="py-2 px-3 font-medium text-right">Target MRR</th>
              <th className="py-2 px-3 font-medium text-right">Exposure</th>
              <th className="py-2 px-3 font-medium">Due</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Playbook</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Success Metric</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.workspace}-account-action`} className="border-t border-slate-800/80">
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(item.priority)}`}>
                    {accountActionPriorityLabel(item.priority)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <p className="font-bold text-slate-100">{item.workspace}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.plan}</p>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${motionBadgeClass(item.motion)}`}>
                    {accountActionMotionLabel(item.motion)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${accountHealthStageClass(item.stage)}`}>
                    {accountHealthStageLabel(item.stage)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.targetMrr)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.exposureMrr)}</td>
                <td className="py-2 px-3 text-slate-400">{item.dueWindow}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-500">{item.playbook}</td>
                <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                <td className="py-2 px-3 text-slate-500">{item.successMetric}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
