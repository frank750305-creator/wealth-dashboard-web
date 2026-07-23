import {
  platformCommandExecutiveSignalLabel,
  platformCommandManagementStateLabel,
  type PlatformCommandExecutiveSignal,
  type PlatformCommandManagementOverviewItem,
  type PlatformCommandManagementOverviewSummary,
  type PlatformCommandManagementState,
} from "@/lib/platformCommandManagementOverview";
import {
  platformCommandCustomerHealthStateLabel,
  platformCommandRetentionSignalLabel,
  type PlatformCommandCustomerHealthState,
  type PlatformCommandRetentionSignal,
} from "@/lib/platformCommandCustomerHealth";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandManagementOverviewSectionProps = {
  summary: PlatformCommandManagementOverviewSummary;
  items: PlatformCommandManagementOverviewItem[];
  onExportCsv: () => void;
};

function managementBadgeClass(state: PlatformCommandManagementState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "turnaround") return "bg-amber-500/15 text-amber-200";
  if (state === "operating_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function executiveBadgeClass(signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return "bg-rose-500/15 text-rose-200";
  if (signal === "amber") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function healthBadgeClass(state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "adoption_recovery") return "bg-amber-500/15 text-amber-200";
  if (state === "value_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function retentionBadgeClass(signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return "bg-rose-500/15 text-rose-200";
  if (signal === "expansion_watch") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandManagementOverviewItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function residualRiskClass(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "text-rose-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

function scoreClass(score: number) {
  if (score < 50) return "text-rose-200";
  if (score < 75) return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandManagementOverviewSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandManagementOverviewSectionProps) {
  const metrics = [
    ["Mgmt", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Turn", `${summary.turnaroundCount}`],
    ["Review", `${summary.operatingReviewCount}`],
    ["Ready", `${summary.executiveReadyCount}`],
    ["Red", `${summary.redCount}`],
    ["Amber", `${summary.amberCount}`],
    ["Green", `${summary.greenCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["決策窗", summary.nextExecutiveWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Management Overview 管理層總覽</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把客戶健康轉成營收信心、客戶信心、營運焦點、策略要求、管理層決策與 Board narrative
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2">
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
            Mgmt CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.overviewId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.overviewId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.riskOwner} / {item.qbrCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executiveBadgeClass(item.executiveSignal)}`}>
                {platformCommandExecutiveSignalLabel(item.executiveSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.revenueConfidence}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">{platformCommandManagementStateLabel(item.managementState)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Risk</p>
                <p className={`font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className={`font-mono font-bold ${scoreClass(item.readinessScore)}`}>{item.readinessScore}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-300">{item.boardNarrative}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.executiveDecision}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2520px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Overview ID</th>
              <th className="py-2 px-3 font-medium">Health ID</th>
              <th className="py-2 px-3 font-medium">Audit ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Executive Owner</th>
              <th className="py-2 px-3 font-medium">Management</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 px-3 font-medium">Health</th>
              <th className="py-2 px-3 font-medium">Retention</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Revenue Confidence</th>
              <th className="py-2 px-3 font-medium">Customer Confidence</th>
              <th className="py-2 px-3 font-medium">Operating Focus</th>
              <th className="py-2 px-3 font-medium">Strategic Ask</th>
              <th className="py-2 px-3 font-medium">Board Narrative</th>
              <th className="py-2 px-3 font-medium">Executive Decision</th>
              <th className="py-2 px-3 font-medium">Risk Owner</th>
              <th className="py-2 px-3 font-medium">QBR</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.overviewId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.overviewId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.healthId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.auditId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.executiveOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${managementBadgeClass(item.managementState)}`}>
                    {platformCommandManagementStateLabel(item.managementState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executiveBadgeClass(item.executiveSignal)}`}>
                    {platformCommandExecutiveSignalLabel(item.executiveSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${healthBadgeClass(item.customerHealthState)}`}>
                    {platformCommandCustomerHealthStateLabel(item.customerHealthState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${retentionBadgeClass(item.retentionSignal)}`}>
                    {platformCommandRetentionSignalLabel(item.retentionSignal)}
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
                <td className="py-2 px-3 text-slate-400">{item.buyerSegment}</td>
                <td className="py-2 px-3 text-slate-300">{item.revenueConfidence}</td>
                <td className="py-2 px-3 text-cyan-200">{item.customerConfidence}</td>
                <td className="py-2 px-3 text-slate-300">{item.operatingFocus}</td>
                <td className="py-2 px-3 text-amber-200">{item.strategicAsk}</td>
                <td className="py-2 px-3 text-slate-400">{item.boardNarrative}</td>
                <td className="py-2 px-3 text-slate-300">{item.executiveDecision}</td>
                <td className="py-2 px-3 text-cyan-200">{item.riskOwner}</td>
                <td className="py-2 px-3 text-slate-300">{item.qbrCadence}</td>
                <td className="py-2 px-3 text-slate-300">{item.decisionGate}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
