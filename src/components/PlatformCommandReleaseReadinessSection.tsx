import {
  platformCommandReleaseStateLabel,
  type PlatformCommandReleaseReadinessItem,
  type PlatformCommandReleaseReadinessSummary,
  type PlatformCommandReleaseState,
} from "@/lib/platformCommandReleaseReadiness";
import {
  platformCommandBacklogEffortLabel,
  platformCommandBacklogImpactLabel,
  platformCommandBacklogStateLabel,
  type PlatformCommandBacklogEffort,
  type PlatformCommandBacklogImpact,
  type PlatformCommandBacklogState,
} from "@/lib/platformCommandImprovementBacklog";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandReleaseReadinessSectionProps = {
  summary: PlatformCommandReleaseReadinessSummary;
  items: PlatformCommandReleaseReadinessItem[];
  onExportCsv: () => void;
};

function releaseBadgeClass(state: PlatformCommandReleaseState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "guarded") return "bg-amber-500/15 text-amber-200";
  if (state === "go") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

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

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandReleaseReadinessItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function scoreClass(score: number) {
  if (score < 50) return "text-rose-200";
  if (score < 75) return "text-amber-200";
  return "text-emerald-200";
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

export function PlatformCommandReleaseReadinessSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandReleaseReadinessSectionProps) {
  const metrics = [
    ["Release", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Guarded", `${summary.guardedCount}`],
    ["Go", `${summary.goCount}`],
    ["Deferred", `${summary.deferredCount}`],
    ["Rollback", `${summary.rollbackPlanCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["下一步", summary.nextReleaseWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Release Readiness 發布驗收</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把改善 backlog 轉成 go/no-go、guarded rollout、rollback 與核准路徑
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
            Release CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-${item.backlogTitle}-release-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.backlogTitle}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.releaseOwner} / {item.releaseWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${releaseBadgeClass(item.releaseState)}`}>
                {platformCommandReleaseStateLabel(item.releaseState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className={`font-mono font-bold ${scoreClass(item.readinessScore)}`}>{item.readinessScore}</p>
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
            <p className="mt-3 text-[11px] text-amber-200">{item.goNoGoGate}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.rollbackPlan}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1900px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Backlog</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Release Owner</th>
              <th className="py-2 px-3 font-medium">Release</th>
              <th className="py-2 px-3 font-medium">Backlog State</th>
              <th className="py-2 px-3 font-medium">Impact</th>
              <th className="py-2 px-3 font-medium">Effort</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Rollout</th>
              <th className="py-2 px-3 font-medium">Go / No-Go</th>
              <th className="py-2 px-3 font-medium">QA Evidence</th>
              <th className="py-2 px-3 font-medium">Rollback</th>
              <th className="py-2 px-3 font-medium">Notice</th>
              <th className="py-2 px-3 font-medium">Approval</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-${item.backlogTitle}-release-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.backlogTitle}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.releaseOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${releaseBadgeClass(item.releaseState)}`}>
                    {platformCommandReleaseStateLabel(item.releaseState)}
                  </span>
                </td>
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
                <td className={`py-2 px-3 text-right font-mono font-bold ${scoreClass(item.readinessScore)}`}>
                  {item.readinessScore}
                </td>
                <td className="py-2 px-3 text-slate-300">{item.rolloutMode}</td>
                <td className="py-2 px-3 text-amber-200">{item.goNoGoGate}</td>
                <td className="py-2 px-3 text-slate-500">{item.qaEvidence}</td>
                <td className="py-2 px-3 text-slate-500">{item.rollbackPlan}</td>
                <td className="py-2 px-3 text-slate-500">{item.customerNotice}</td>
                <td className="py-2 px-3 text-cyan-200">{item.approvalPath}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
