import {
  platformCommandSlaStateLabel,
  type PlatformCommandSlaItem,
  type PlatformCommandSlaState,
  type PlatformCommandSlaSummary,
} from "@/lib/platformCommandSla";
import {
  platformCommandCategoryLabel,
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandSlaSectionProps = {
  summary: PlatformCommandSlaSummary;
  items: PlatformCommandSlaItem[];
  onExportCsv: () => void;
};

function slaBadgeClass(state: PlatformCommandSlaState) {
  if (state === "breach") return "bg-rose-500/15 text-rose-200";
  if (state === "urgent") return "bg-amber-500/15 text-amber-200";
  if (state === "watch") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandSlaItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

export function PlatformCommandSlaSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandSlaSectionProps) {
  const metrics = [
    ["命令", `${summary.itemCount}`],
    ["Breach", `${summary.breachCount}`],
    ["Urgent", `${summary.urgentCount}`],
    ["Watch", `${summary.watchCount}`],
    ["On Track", `${summary.onTrackCount}`],
    ["Critical", `${summary.criticalCount}`],
    ["Owner", `${summary.ownerCount}`],
    ["下一回應", summary.nextResponseWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command SLA 處理時限</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            依 priority 與 status 轉換處理時限，讓高風險命令自動進入回應時鐘
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
            SLA CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {(["breach", "urgent", "watch", "on_track"] as PlatformCommandSlaState[]).map((state) => {
          const stateItems = items.filter((item) => item.slaState === state);
          const lead = stateItems[0];

          return (
            <div key={state} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${slaBadgeClass(state)}`}>
                  {platformCommandSlaStateLabel(state)}
                </span>
                <p className="font-mono text-sm font-bold text-slate-100">{stateItems.length}</p>
              </div>
              {lead ? (
                <div className="mt-3">
                  <p className="font-mono text-[11px] text-cyan-200">{lead.command}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{lead.targetWindow}</p>
                  <p className="mt-1 text-[11px] text-amber-200">{lead.responseClock}</p>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-slate-600">目前沒有命令。</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1500px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Command</th>
              <th className="py-2 px-3 font-medium">SLA</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Target Window</th>
              <th className="py-2 px-3 font-medium">Response Clock</th>
              <th className="py-2 px-3 font-medium">Escalation</th>
              <th className="py-2 px-3 font-medium">Expected Output</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.id}-sla`} className="border-t border-slate-800/80">
                <td className="py-2 px-3">
                  <p className="font-mono font-bold text-cyan-200">{item.command}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.title} / {platformCommandCategoryLabel(item.category)}</p>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${slaBadgeClass(item.slaState)}`}>
                    {platformCommandSlaStateLabel(item.slaState)}
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
                <td className="py-2 px-3 text-cyan-200">{item.terminalRoute}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-500">{item.targetWindow}</td>
                <td className="py-2 px-3 text-amber-200">{item.responseClock}</td>
                <td className="py-2 px-3 text-slate-500">{item.escalation}</td>
                <td className="py-2 px-3 text-slate-500">{item.expectedOutput}</td>
                <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
