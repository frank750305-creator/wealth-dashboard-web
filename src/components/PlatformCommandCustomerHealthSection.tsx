import {
  platformCommandCustomerHealthStateLabel,
  platformCommandRetentionSignalLabel,
  type PlatformCommandCustomerHealthItem,
  type PlatformCommandCustomerHealthState,
  type PlatformCommandCustomerHealthSummary,
  type PlatformCommandRetentionSignal,
} from "@/lib/platformCommandCustomerHealth";
import {
  platformCommandAuditSignalLabel,
  platformCommandRevenueAuditStateLabel,
  type PlatformCommandAuditSignal,
  type PlatformCommandRevenueAuditState,
} from "@/lib/platformCommandRevenueAudit";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandCustomerHealthSectionProps = {
  summary: PlatformCommandCustomerHealthSummary;
  items: PlatformCommandCustomerHealthItem[];
  onExportCsv: () => void;
};

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

function auditBadgeClass(state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "reconciliation") return "bg-amber-500/15 text-amber-200";
  if (state === "exception_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function auditSignalBadgeClass(signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return "bg-rose-500/15 text-rose-200";
  if (signal === "exception") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandCustomerHealthItem["status"]) {
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

export function PlatformCommandCustomerHealthSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandCustomerHealthSectionProps) {
  const metrics = [
    ["Health", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Adoption", `${summary.adoptionRecoveryCount}`],
    ["Value", `${summary.valueReviewCount}`],
    ["Healthy", `${summary.healthyCount}`],
    ["Churn", `${summary.churnRiskCount}`],
    ["Watch", `${summary.expansionWatchCount}`],
    ["Retained", `${summary.retainedCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["QBR窗", summary.nextQbrWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Customer Health 客戶健康</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把營收稽核轉成採用訊號、價值證據、續約風險、擴張潛力、QBR 節奏與客戶成功動作
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
            Health CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.healthId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.healthId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.successOwner} / {item.qbrCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${retentionBadgeClass(item.retentionSignal)}`}>
                {platformCommandRetentionSignalLabel(item.retentionSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.adoptionSignal}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Health</p>
                <p className="font-bold text-slate-100">
                  {platformCommandCustomerHealthStateLabel(item.customerHealthState)}
                </p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.valueEvidence}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2480px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Health ID</th>
              <th className="py-2 px-3 font-medium">Audit ID</th>
              <th className="py-2 px-3 font-medium">Usage ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Success Owner</th>
              <th className="py-2 px-3 font-medium">Health</th>
              <th className="py-2 px-3 font-medium">Retention</th>
              <th className="py-2 px-3 font-medium">Audit</th>
              <th className="py-2 px-3 font-medium">Audit Signal</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Adoption</th>
              <th className="py-2 px-3 font-medium">Value Evidence</th>
              <th className="py-2 px-3 font-medium">Support Load</th>
              <th className="py-2 px-3 font-medium">Renewal Risk</th>
              <th className="py-2 px-3 font-medium">Expansion Potential</th>
              <th className="py-2 px-3 font-medium">Executive Sponsor</th>
              <th className="py-2 px-3 font-medium">Customer Comms</th>
              <th className="py-2 px-3 font-medium">QBR</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.healthId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.healthId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.auditId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.usageId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.successOwner}</td>
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
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditBadgeClass(item.revenueAuditState)}`}>
                    {platformCommandRevenueAuditStateLabel(item.revenueAuditState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditSignalBadgeClass(item.auditSignal)}`}>
                    {platformCommandAuditSignalLabel(item.auditSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.adoptionSignal}</td>
                <td className="py-2 px-3 text-cyan-200">{item.valueEvidence}</td>
                <td className="py-2 px-3 text-slate-300">{item.supportLoad}</td>
                <td className="py-2 px-3 text-amber-200">{item.renewalRisk}</td>
                <td className="py-2 px-3 text-slate-300">{item.expansionPotential}</td>
                <td className="py-2 px-3 text-slate-400">{item.executiveSponsor}</td>
                <td className="py-2 px-3 text-slate-300">{item.customerComms}</td>
                <td className="py-2 px-3 text-cyan-200">{item.qbrCadence}</td>
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
