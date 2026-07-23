import {
  platformCommandOwnerLoadStateLabel,
  type PlatformCommandOwnerLoadItem,
  type PlatformCommandOwnerLoadState,
  type PlatformCommandOwnerLoadSummary,
} from "@/lib/platformCommandOwnerLoad";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandOwnerLoadSectionProps = {
  summary: PlatformCommandOwnerLoadSummary;
  items: PlatformCommandOwnerLoadItem[];
  onExportCsv: () => void;
};

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

function statusBadgeClass(status: PlatformCommandOwnerLoadItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

export function PlatformCommandOwnerLoadSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandOwnerLoadSectionProps) {
  const metrics = [
    ["Owner", `${summary.ownerCount}`],
    ["Overloaded", `${summary.overloadedCount}`],
    ["Strained", `${summary.strainedCount}`],
    ["Balanced", `${summary.balancedCount}`],
    ["Clear", `${summary.clearCount}`],
    ["Breach", `${summary.breachCount}`],
    ["Urgent", `${summary.urgentCount}`],
    ["Top Owner", summary.topOwner],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Owner Load 負責人負載</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            用 SLA 命令估算 owner 負載，判斷誰需要副 owner、交接或升級
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
            Owner Load CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-load`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.owner}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.routeCount} routes / {item.commandCount} commands</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${loadBadgeClass(item.loadState)}`}>
                {platformCommandOwnerLoadStateLabel(item.loadState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-right text-xs">
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
              <div>
                <p className="text-[10px] text-slate-600">Watch</p>
                <p className="font-mono font-bold text-sky-200">{item.watchCount}</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[11px] text-cyan-200">{item.leadCommand}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.handoffNote}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1500px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Load</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium text-right">Commands</th>
              <th className="py-2 px-3 font-medium text-right">Breach</th>
              <th className="py-2 px-3 font-medium text-right">Urgent</th>
              <th className="py-2 px-3 font-medium">Lead Route</th>
              <th className="py-2 px-3 font-medium">Lead Command</th>
              <th className="py-2 px-3 font-medium">Handoff</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-owner-load-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.owner}</td>
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
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.commandCount}</td>
                <td className="py-2 px-3 text-right font-mono text-rose-200">{item.breachCount}</td>
                <td className="py-2 px-3 text-right font-mono text-amber-200">{item.urgentCount}</td>
                <td className="py-2 px-3 text-cyan-200">{item.leadRoute}</td>
                <td className="py-2 px-3">
                  <p className="font-mono text-cyan-200">{item.leadCommand}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.responseClock}</p>
                </td>
                <td className="py-2 px-3 text-slate-500">{item.handoffNote}</td>
                <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
