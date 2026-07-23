import {
  platformCommandOperatingDecisionLabel,
  type PlatformCommandOperatingDecision,
  type PlatformCommandOperatingReviewItem,
  type PlatformCommandOperatingReviewSummary,
} from "@/lib/platformCommandOperatingReview";
import {
  platformCommandReleaseMonitorStateLabel,
  type PlatformCommandReleaseMonitorState,
} from "@/lib/platformCommandReleaseMonitor";
import {
  platformCommandReleaseStateLabel,
  type PlatformCommandReleaseState,
} from "@/lib/platformCommandReleaseReadiness";
import {
  platformCommandBacklogImpactLabel,
  type PlatformCommandBacklogImpact,
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

type PlatformCommandOperatingReviewSectionProps = {
  summary: PlatformCommandOperatingReviewSummary;
  items: PlatformCommandOperatingReviewItem[];
  onExportCsv: () => void;
};

function decisionBadgeClass(decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return "bg-rose-500/15 text-rose-200";
  if (decision === "review") return "bg-amber-500/15 text-amber-200";
  if (decision === "report") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function monitorBadgeClass(state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return "bg-rose-500/15 text-rose-200";
  if (state === "watch") return "bg-amber-500/15 text-amber-200";
  if (state === "stable") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function releaseBadgeClass(state: PlatformCommandReleaseState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "guarded") return "bg-amber-500/15 text-amber-200";
  if (state === "go") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
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

function statusBadgeClass(status: PlatformCommandOperatingReviewItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function scoreClass(score: number) {
  if (score < 50) return "text-rose-200";
  if (score < 75) return "text-amber-200";
  return "text-emerald-200";
}

function residualRiskClass(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "text-rose-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandOperatingReviewSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandOperatingReviewSectionProps) {
  const metrics = [
    ["Review", `${summary.itemCount}`],
    ["Escalate", `${summary.escalateCount}`],
    ["Review", `${summary.reviewCount}`],
    ["Report", `${summary.reportCount}`],
    ["Archive", `${summary.archiveCount}`],
    ["高風險", `${summary.highResidualRiskCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["管理窗", summary.nextManagementWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Operating Review 營運審查</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把上線監控結果整理成管理決策、會議節奏、風險 memo 與下一個 checkpoint
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
            Review CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.owner}-${item.backlogTitle}-operating-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.backlogTitle}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.decisionOwner} / {item.meetingCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionBadgeClass(item.decision)}`}>
                {platformCommandOperatingDecisionLabel(item.decision)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className={`font-mono font-bold ${scoreClass(item.readinessScore)}`}>{item.readinessScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Monitor</p>
                <p className="font-bold text-slate-100">{platformCommandReleaseMonitorStateLabel(item.monitorState)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Risk</p>
                <p className={`font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-amber-200">{item.managementAction}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.boardMetric}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2020px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Backlog</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Review Owner</th>
              <th className="py-2 px-3 font-medium">Decision</th>
              <th className="py-2 px-3 font-medium">Monitor</th>
              <th className="py-2 px-3 font-medium">Release</th>
              <th className="py-2 px-3 font-medium">Impact</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Narrative</th>
              <th className="py-2 px-3 font-medium">Management Action</th>
              <th className="py-2 px-3 font-medium">Board Metric</th>
              <th className="py-2 px-3 font-medium">Risk Memo</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Decision Owner</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Checkpoint</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.owner}-${item.backlogTitle}-operating-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-bold text-slate-100">{item.backlogTitle}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.reviewOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionBadgeClass(item.decision)}`}>
                    {platformCommandOperatingDecisionLabel(item.decision)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${monitorBadgeClass(item.monitorState)}`}>
                    {platformCommandReleaseMonitorStateLabel(item.monitorState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${releaseBadgeClass(item.releaseState)}`}>
                    {platformCommandReleaseStateLabel(item.releaseState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${impactBadgeClass(item.impact)}`}>
                    {platformCommandBacklogImpactLabel(item.impact)}
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
                <td className={`py-2 px-3 text-right font-mono font-bold ${scoreClass(item.readinessScore)}`}>
                  {item.readinessScore}
                </td>
                <td className="py-2 px-3 text-slate-500">{item.operatingNarrative}</td>
                <td className="py-2 px-3 text-amber-200">{item.managementAction}</td>
                <td className="py-2 px-3 text-slate-500">{item.boardMetric}</td>
                <td className="py-2 px-3 text-slate-500">{item.riskMemo}</td>
                <td className="py-2 px-3 text-slate-300">{item.meetingCadence}</td>
                <td className="py-2 px-3 text-cyan-200">{item.decisionOwner}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.evidencePack}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextCheckpoint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
