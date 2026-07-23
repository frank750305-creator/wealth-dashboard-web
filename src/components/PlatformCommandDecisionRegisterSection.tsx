import {
  platformCommandDecisionStateLabel,
  type PlatformCommandDecisionRegisterItem,
  type PlatformCommandDecisionRegisterSummary,
  type PlatformCommandDecisionState,
} from "@/lib/platformCommandDecisionRegister";
import {
  platformCommandExecutiveDecisionLabel,
  type PlatformCommandExecutiveDecision,
} from "@/lib/platformCommandExecutiveBrief";
import {
  platformCommandOperatingDecisionLabel,
  type PlatformCommandOperatingDecision,
} from "@/lib/platformCommandOperatingReview";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandDecisionRegisterSectionProps = {
  summary: PlatformCommandDecisionRegisterSummary;
  items: PlatformCommandDecisionRegisterItem[];
  onExportCsv: () => void;
};

function decisionStateBadgeClass(state: PlatformCommandDecisionState) {
  if (state === "required") return "bg-rose-500/15 text-rose-200";
  if (state === "pending") return "bg-amber-500/15 text-amber-200";
  if (state === "approved") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function executiveBadgeClass(decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return "bg-rose-500/15 text-rose-200";
  if (decision === "management_review") return "bg-amber-500/15 text-amber-200";
  if (decision === "monthly_update") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function operatingBadgeClass(decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return "bg-rose-500/15 text-rose-200";
  if (decision === "review") return "bg-amber-500/15 text-amber-200";
  if (decision === "report") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandDecisionRegisterItem["status"]) {
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

export function PlatformCommandDecisionRegisterSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandDecisionRegisterSectionProps) {
  const metrics = [
    ["Decision", `${summary.itemCount}`],
    ["Required", `${summary.requiredCount}`],
    ["Pending", `${summary.pendingCount}`],
    ["Approved", `${summary.approvedCount}`],
    ["Noted", `${summary.notedCount}`],
    ["高風險", `${summary.highResidualRiskCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["審批窗", summary.nextApprovalWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Decision Register 決策登錄</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把高層 decision ask 轉成可追蹤的決策 ID、審批人、截止時間、落地 owner 與稽核紀錄
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
            Decision CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.decisionId}-decision-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.decisionId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.approver} / {item.approvalDeadline}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionStateBadgeClass(item.decisionState)}`}>
                {platformCommandDecisionStateLabel(item.decisionState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className={`font-mono font-bold ${scoreClass(item.readinessScore)}`}>{item.readinessScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Status</p>
                <p className="font-bold text-slate-100">{platformCommandStatusLabel(item.status)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Risk</p>
                <p className={`font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-amber-200">{item.approvalCriteria}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.downstreamImpact}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2080px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Implementation</th>
              <th className="py-2 px-3 font-medium">State</th>
              <th className="py-2 px-3 font-medium">Executive</th>
              <th className="py-2 px-3 font-medium">Operating</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Decision Record</th>
              <th className="py-2 px-3 font-medium">Approver</th>
              <th className="py-2 px-3 font-medium">Deadline</th>
              <th className="py-2 px-3 font-medium">Criteria</th>
              <th className="py-2 px-3 font-medium">Impact</th>
              <th className="py-2 px-3 font-medium">Audit Trail</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.decisionId}-decision-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.implementationOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionStateBadgeClass(item.decisionState)}`}>
                    {platformCommandDecisionStateLabel(item.decisionState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executiveBadgeClass(item.executiveDecision)}`}>
                    {platformCommandExecutiveDecisionLabel(item.executiveDecision)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${operatingBadgeClass(item.operatingDecision)}`}>
                    {platformCommandOperatingDecisionLabel(item.operatingDecision)}
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
                <td className="py-2 px-3 text-cyan-200">{item.sourceRoute}</td>
                <td className="py-2 px-3 text-slate-500">{item.decisionRecord}</td>
                <td className="py-2 px-3 text-cyan-200">{item.approver}</td>
                <td className="py-2 px-3 text-amber-200">{item.approvalDeadline}</td>
                <td className="py-2 px-3 text-slate-500">{item.approvalCriteria}</td>
                <td className="py-2 px-3 text-slate-500">{item.downstreamImpact}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.auditTrail}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
