import {
  type PlatformCommandTriageItem,
  type PlatformCommandTriageSummary,
} from "@/lib/platformCommandTriage";
import {
  platformCommandCategoryLabel,
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandTriageSectionProps = {
  summary: PlatformCommandTriageSummary;
  items: PlatformCommandTriageItem[];
  onExportCsv: () => void;
};

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandTriageItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

export function PlatformCommandTriageSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandTriageSectionProps) {
  const metrics = [
    ["Route", `${summary.routeCount}`],
    ["Owner", `${summary.ownerCount}`],
    ["Command", `${summary.commandCount}`],
    ["Critical", `${summary.criticalRouteCount}`],
    ["High", `${summary.highRouteCount}`],
    ["暫停", `${summary.blockRouteCount}`],
    ["觀察", `${summary.watchRouteCount}`],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Triage 指令分流板</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            按 owner 與 route 聚合命令，快速判斷哪條營運路徑需要先處理
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
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
            分流 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.id}-priority`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.terminalRoute}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.owner} / {platformCommandCategoryLabel(item.category)}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(item.priority)}`}>
                {platformCommandPriorityLabel(item.priority)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">命令</p>
                <p className="font-mono font-bold text-slate-100">{item.commandCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">暫停</p>
                <p className="font-mono font-bold text-rose-200">{item.blockCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">觀察</p>
                <p className="font-mono font-bold text-amber-200">{item.watchCount}</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[11px] text-cyan-200">{item.leadCommand}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1480px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium text-right">Commands</th>
              <th className="py-2 px-3 font-medium text-right">Critical</th>
              <th className="py-2 px-3 font-medium text-right">High</th>
              <th className="py-2 px-3 font-medium">Lead Command</th>
              <th className="py-2 px-3 font-medium">Escalation</th>
              <th className="py-2 px-3 font-medium">Expected Output</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-800/80">
                <td className="py-2 px-3">
                  <p className="font-bold text-slate-100">{item.terminalRoute}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{platformCommandCategoryLabel(item.category)}</p>
                </td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
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
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.commandCount}</td>
                <td className="py-2 px-3 text-right font-mono text-rose-200">{item.criticalCount}</td>
                <td className="py-2 px-3 text-right font-mono text-amber-200">{item.highCount}</td>
                <td className="py-2 px-3">
                  <p className="font-mono text-cyan-200">{item.leadCommand}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.leadTitle} / {item.leadMetric}</p>
                </td>
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
