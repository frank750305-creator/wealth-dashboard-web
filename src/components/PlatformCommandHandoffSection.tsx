import {
  platformCommandHandoffStateLabel,
  type PlatformCommandHandoffItem,
  type PlatformCommandHandoffState,
  type PlatformCommandHandoffSummary,
} from "@/lib/platformCommandHandoff";
import {
  platformCommandOwnerLoadStateLabel,
  type PlatformCommandOwnerLoadState,
} from "@/lib/platformCommandOwnerLoad";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandHandoffSectionProps = {
  summary: PlatformCommandHandoffSummary;
  items: PlatformCommandHandoffItem[];
  onExportCsv: () => void;
};

function handoffBadgeClass(state: PlatformCommandHandoffState) {
  if (state === "required") return "bg-rose-500/15 text-rose-200";
  if (state === "recommended") return "bg-amber-500/15 text-amber-200";
  if (state === "scheduled") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function loadBadgeClass(state: PlatformCommandOwnerLoadState) {
  if (state === "overloaded") return "bg-rose-500/15 text-rose-200";
  if (state === "strained") return "bg-amber-500/15 text-amber-200";
  if (state === "balanced") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandHandoffItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

export function PlatformCommandHandoffSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandHandoffSectionProps) {
  const metrics = [
    ["交接", `${summary.itemCount}`],
    ["Required", `${summary.requiredCount}`],
    ["Recommended", `${summary.recommendedCount}`],
    ["Scheduled", `${summary.scheduledCount}`],
    ["Standby", `${summary.standbyCount}`],
    ["Overloaded", `${summary.overloadedCount}`],
    ["支援池", `${summary.deputyPoolCount}`],
    ["下一窗口", summary.nextHandoffWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Handoff 交接建議</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            根據 owner 負載自動產生副 owner、交接範圍與驗收標準
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
            Handoff CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-handoff-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.owner}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">Deputy: {item.deputyOwner}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${handoffBadgeClass(item.handoffState)}`}>
                {platformCommandHandoffStateLabel(item.handoffState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className="font-mono font-bold text-slate-100">{item.loadScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Breach</p>
                <p className="font-mono font-bold text-rose-200">{item.breachCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Urgent</p>
                <p className="font-mono font-bold text-amber-200">{item.urgentCount}</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[11px] text-cyan-200">{item.leadCommand}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.acceptanceCriteria}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1540px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Deputy</th>
              <th className="py-2 px-3 font-medium">Handoff</th>
              <th className="py-2 px-3 font-medium">Load</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Lead Command</th>
              <th className="py-2 px-3 font-medium">Target Window</th>
              <th className="py-2 px-3 font-medium">Scope</th>
              <th className="py-2 px-3 font-medium">Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-handoff-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.deputyOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${handoffBadgeClass(item.handoffState)}`}>
                    {platformCommandHandoffStateLabel(item.handoffState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${loadBadgeClass(item.loadState)}`}>
                    {platformCommandOwnerLoadStateLabel(item.loadState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(item.priority)}`}>
                    {platformCommandPriorityLabel(item.priority)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(item.status)}`}>
                    {platformCommandStatusLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.loadScore}</td>
                <td className="py-2 px-3 text-cyan-200">{item.sourceRoute}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.leadCommand}</td>
                <td className="py-2 px-3 text-amber-200">{item.targetWindow}</td>
                <td className="py-2 px-3 text-slate-500">{item.handoffScope}</td>
                <td className="py-2 px-3 text-slate-500">{item.acceptanceCriteria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
