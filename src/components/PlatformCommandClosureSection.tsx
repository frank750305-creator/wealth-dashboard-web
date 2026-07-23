import {
  platformCommandClosureStateLabel,
  platformCommandResidualRiskLabel,
  type PlatformCommandClosureItem,
  type PlatformCommandClosureState,
  type PlatformCommandClosureSummary,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandHandoffStateLabel,
  type PlatformCommandHandoffState,
} from "@/lib/platformCommandHandoff";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandClosureSectionProps = {
  summary: PlatformCommandClosureSummary;
  items: PlatformCommandClosureItem[];
  onExportCsv: () => void;
};

function closureBadgeClass(state: PlatformCommandClosureState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "ready") return "bg-amber-500/15 text-amber-200";
  if (state === "monitor") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function handoffBadgeClass(state: PlatformCommandHandoffState) {
  if (state === "required") return "bg-rose-500/15 text-rose-200";
  if (state === "recommended") return "bg-amber-500/15 text-amber-200";
  if (state === "scheduled") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandClosureItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function residualRiskClass(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "text-rose-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandClosureSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandClosureSectionProps) {
  const metrics = [
    ["結案項", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Ready", `${summary.readyCount}`],
    ["Monitor", `${summary.monitorCount}`],
    ["Closed", `${summary.closedCount}`],
    ["核准 owner", `${summary.approvalOwnerCount}`],
    ["高風險", `${summary.highResidualRiskCount}`],
    ["下一結案", summary.nextCloseWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Closure 驗收關卡</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把交接建議轉成可結案條件、證據要求、核准 owner 與殘餘風險
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
            Closure CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-closure-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.owner}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">Approval: {item.approvalOwner}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${closureBadgeClass(item.closureState)}`}>
                {platformCommandClosureStateLabel(item.closureState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Window</p>
                <p className="font-bold text-slate-100">{item.closeWindow}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Risk</p>
                <p className={`font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className="font-mono font-bold text-slate-100">{item.loadScore}</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[11px] text-cyan-200">{item.leadCommand}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.closeGate}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1620px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Deputy</th>
              <th className="py-2 px-3 font-medium">Closure</th>
              <th className="py-2 px-3 font-medium">Handoff</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Lead Command</th>
              <th className="py-2 px-3 font-medium">Close Gate</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Approval</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-closure-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.deputyOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${closureBadgeClass(item.closureState)}`}>
                    {platformCommandClosureStateLabel(item.closureState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${handoffBadgeClass(item.handoffState)}`}>
                    {platformCommandHandoffStateLabel(item.handoffState)}
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
                <td className="py-2 px-3 text-amber-200">{item.closeGate}</td>
                <td className="py-2 px-3 text-slate-500">{item.evidenceRequired}</td>
                <td className="py-2 px-3 text-slate-400">{item.approvalOwner}</td>
                <td className={`py-2 px-3 font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </td>
                <td className="py-2 px-3 text-slate-300">{item.closeWindow}</td>
                <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
