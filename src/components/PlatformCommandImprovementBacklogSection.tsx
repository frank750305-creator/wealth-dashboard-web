import {
  platformCommandBacklogEffortLabel,
  platformCommandBacklogImpactLabel,
  platformCommandBacklogStateLabel,
  type PlatformCommandBacklogEffort,
  type PlatformCommandBacklogImpact,
  type PlatformCommandBacklogState,
  type PlatformCommandImprovementBacklogItem,
  type PlatformCommandImprovementBacklogSummary,
} from "@/lib/platformCommandImprovementBacklog";
import {
  platformCommandPostmortemThemeLabel,
  type PlatformCommandPostmortemTheme,
} from "@/lib/platformCommandPostmortem";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandImprovementBacklogSectionProps = {
  summary: PlatformCommandImprovementBacklogSummary;
  items: PlatformCommandImprovementBacklogItem[];
  onExportCsv: () => void;
};

function backlogBadgeClass(state: PlatformCommandBacklogState) {
  if (state === "critical_path") return "bg-rose-500/15 text-rose-200";
  if (state === "planned") return "bg-amber-500/15 text-amber-200";
  if (state === "scheduled") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function impactBadgeClass(impact: PlatformCommandBacklogImpact) {
  if (impact === "risk") return "bg-rose-500/15 text-rose-200";
  if (impact === "reliability") return "bg-sky-500/15 text-sky-200";
  if (impact === "handoff") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function themeBadgeClass(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "bg-rose-500/15 text-rose-200";
  if (theme === "handoff_quality") return "bg-amber-500/15 text-amber-200";
  if (theme === "sla_prevention") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandImprovementBacklogItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function effortClass(effort: PlatformCommandBacklogEffort) {
  if (effort === "high") return "text-rose-200";
  if (effort === "medium") return "text-amber-200";
  return "text-emerald-200";
}

function residualRiskClass(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "text-rose-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandImprovementBacklogSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandImprovementBacklogSectionProps) {
  const metrics = [
    ["改善項", `${summary.itemCount}`],
    ["Critical", `${summary.criticalPathCount}`],
    ["Planned", `${summary.plannedCount}`],
    ["Scheduled", `${summary.scheduledCount}`],
    ["Parking", `${summary.parkingLotCount}`],
    ["高工時", `${summary.highEffortCount}`],
    ["高風險", `${summary.highResidualRiskCount}`],
    ["下一 release", summary.nextReleaseWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Improvement Backlog 改善排程</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把復盤改善動作排成 release backlog，標出依賴、工時、交付風險與驗收指標
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
            Backlog CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-${item.backlogTitle}-backlog-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.backlogTitle}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.owner} / {item.releaseWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${backlogBadgeClass(item.backlogState)}`}>
                {platformCommandBacklogStateLabel(item.backlogState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Impact</p>
                <p className="font-bold text-slate-100">{platformCommandBacklogImpactLabel(item.impact)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Effort</p>
                <p className={`font-bold ${effortClass(item.effort)}`}>
                  {platformCommandBacklogEffortLabel(item.effort)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Risk</p>
                <p className={`font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-amber-200">{item.nextMilestone}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.acceptanceMetric}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1840px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Backlog</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Sponsor</th>
              <th className="py-2 px-3 font-medium">State</th>
              <th className="py-2 px-3 font-medium">Impact</th>
              <th className="py-2 px-3 font-medium">Effort</th>
              <th className="py-2 px-3 font-medium">Theme</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Scope</th>
              <th className="py-2 px-3 font-medium">Dependency</th>
              <th className="py-2 px-3 font-medium">Release</th>
              <th className="py-2 px-3 font-medium">Delivery Risk</th>
              <th className="py-2 px-3 font-medium">Next Milestone</th>
              <th className="py-2 px-3 font-medium">Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-${item.backlogTitle}-backlog-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.backlogTitle}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.sponsor}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${backlogBadgeClass(item.backlogState)}`}>
                    {platformCommandBacklogStateLabel(item.backlogState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${impactBadgeClass(item.impact)}`}>
                    {platformCommandBacklogImpactLabel(item.impact)}
                  </span>
                </td>
                <td className={`py-2 px-3 font-bold ${effortClass(item.effort)}`}>
                  {platformCommandBacklogEffortLabel(item.effort)}
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${themeBadgeClass(item.theme)}`}>
                    {platformCommandPostmortemThemeLabel(item.theme)}
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
                <td className="py-2 px-3 text-slate-500">{item.deliveryScope}</td>
                <td className="py-2 px-3 text-slate-500">{item.dependency}</td>
                <td className="py-2 px-3 text-amber-200">{item.releaseWindow}</td>
                <td className="py-2 px-3 text-slate-500">{item.deliveryRisk}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextMilestone}</td>
                <td className="py-2 px-3 text-slate-500">{item.acceptanceMetric}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
