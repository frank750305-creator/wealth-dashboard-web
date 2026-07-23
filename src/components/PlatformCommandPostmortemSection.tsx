import {
  platformCommandPostmortemThemeLabel,
  type PlatformCommandPostmortemItem,
  type PlatformCommandPostmortemSummary,
  type PlatformCommandPostmortemTheme,
} from "@/lib/platformCommandPostmortem";
import {
  platformCommandClosureStateLabel,
  platformCommandResidualRiskLabel,
  type PlatformCommandClosureState,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandPostmortemSectionProps = {
  summary: PlatformCommandPostmortemSummary;
  items: PlatformCommandPostmortemItem[];
  onExportCsv: () => void;
};

function themeBadgeClass(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "bg-rose-500/15 text-rose-200";
  if (theme === "handoff_quality") return "bg-amber-500/15 text-amber-200";
  if (theme === "sla_prevention") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function closureBadgeClass(state: PlatformCommandClosureState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "ready") return "bg-amber-500/15 text-amber-200";
  if (state === "monitor") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandPostmortemItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function residualRiskClass(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "text-rose-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandPostmortemSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandPostmortemSectionProps) {
  const metrics = [
    ["復盤項", `${summary.itemCount}`],
    ["Risk", `${summary.riskReductionCount}`],
    ["Handoff", `${summary.handoffQualityCount}`],
    ["SLA", `${summary.slaPreventionCount}`],
    ["Memory", `${summary.operatingMemoryCount}`],
    ["高風險", `${summary.highResidualRiskCount}`],
    ["下一複核", summary.nextReviewWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Postmortem 復盤改善</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把結案項轉成根因、改善動作、預防控制與可複查的成功指標
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
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
            Postmortem CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-postmortem-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.owner}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.reviewCadence} / {item.dueWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${themeBadgeClass(item.theme)}`}>
                {platformCommandPostmortemThemeLabel(item.theme)}
              </span>
            </div>
            <p className="mt-3 font-mono text-[11px] text-cyan-200">{item.leadCommand}</p>
            <p className="mt-1 text-[11px] text-slate-400">{item.finding}</p>
            <p className="mt-2 text-[11px] text-slate-500">{item.successMetric}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1760px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Deputy</th>
              <th className="py-2 px-3 font-medium">Theme</th>
              <th className="py-2 px-3 font-medium">Closure</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Finding</th>
              <th className="py-2 px-3 font-medium">Root Cause</th>
              <th className="py-2 px-3 font-medium">Improvement</th>
              <th className="py-2 px-3 font-medium">Prevention</th>
              <th className="py-2 px-3 font-medium">Archive</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Due</th>
              <th className="py-2 px-3 font-medium">Success Metric</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-${item.leadCommand}-postmortem`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.deputyOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${themeBadgeClass(item.theme)}`}>
                    {platformCommandPostmortemThemeLabel(item.theme)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${closureBadgeClass(item.closureState)}`}>
                    {platformCommandClosureStateLabel(item.closureState)}
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
                <td className={`py-2 px-3 font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </td>
                <td className="py-2 px-3 text-cyan-200">{item.sourceRoute}</td>
                <td className="py-2 px-3 text-slate-400">{item.finding}</td>
                <td className="py-2 px-3 text-slate-500">{item.rootCause}</td>
                <td className="py-2 px-3 text-amber-200">{item.improvementAction}</td>
                <td className="py-2 px-3 text-slate-500">{item.preventionControl}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.evidenceArchive}</td>
                <td className="py-2 px-3 text-slate-300">{item.reviewCadence}</td>
                <td className="py-2 px-3 text-slate-300">{item.dueWindow}</td>
                <td className="py-2 px-3 text-slate-500">{item.successMetric}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
