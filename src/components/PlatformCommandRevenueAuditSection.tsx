import {
  platformCommandAuditSignalLabel,
  platformCommandRevenueAuditStateLabel,
  type PlatformCommandAuditSignal,
  type PlatformCommandRevenueAuditItem,
  type PlatformCommandRevenueAuditState,
  type PlatformCommandRevenueAuditSummary,
} from "@/lib/platformCommandRevenueAudit";
import {
  platformCommandUsageMonitoringStateLabel,
  platformCommandUsageSignalLabel,
  type PlatformCommandUsageMonitoringState,
  type PlatformCommandUsageSignal,
} from "@/lib/platformCommandUsageMonitoring";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandRevenueAuditSectionProps = {
  summary: PlatformCommandRevenueAuditSummary;
  items: PlatformCommandRevenueAuditItem[];
  onExportCsv: () => void;
};

function auditStateBadgeClass(state: PlatformCommandRevenueAuditState) {
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

function usageBadgeClass(state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "instrumentation_setup") return "bg-amber-500/15 text-amber-200";
  if (state === "anomaly_watch") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function usageSignalBadgeClass(signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "bg-rose-500/15 text-rose-200";
  if (signal === "sampled") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandRevenueAuditItem["status"]) {
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

export function PlatformCommandRevenueAuditSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandRevenueAuditSectionProps) {
  const metrics = [
    ["Audit", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Recon", `${summary.reconciliationCount}`],
    ["Exception", `${summary.exceptionReviewCount}`],
    ["Certified", `${summary.certifiedCount}`],
    ["Failed", `${summary.failedCount}`],
    ["Review", `${summary.exceptionCount}`],
    ["Clean", `${summary.cleanCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["稽核窗", summary.nextAuditWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Revenue Audit 營收稽核</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把用量監控轉成收入事件追蹤、invoice match、usage 對帳、認列控制、差異政策與稽核證據
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
            Audit CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.auditId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.auditId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.auditOwner} / {item.financeCloseGate}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditSignalBadgeClass(item.auditSignal)}`}>
                {platformCommandAuditSignalLabel(item.auditSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.revenueEventTrace}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Audit</p>
                <p className="font-bold text-slate-100">
                  {platformCommandRevenueAuditStateLabel(item.revenueAuditState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.invoiceMatch}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.auditEvidence}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2620px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Audit ID</th>
              <th className="py-2 px-3 font-medium">Usage ID</th>
              <th className="py-2 px-3 font-medium">Billing ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Audit Owner</th>
              <th className="py-2 px-3 font-medium">Audit</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 px-3 font-medium">Usage</th>
              <th className="py-2 px-3 font-medium">Metering</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Revenue Trace</th>
              <th className="py-2 px-3 font-medium">Invoice Match</th>
              <th className="py-2 px-3 font-medium">Usage Invoice</th>
              <th className="py-2 px-3 font-medium">Recognition</th>
              <th className="py-2 px-3 font-medium">Variance</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Compliance</th>
              <th className="py-2 px-3 font-medium">Customer Impact</th>
              <th className="py-2 px-3 font-medium">Close Gate</th>
              <th className="py-2 px-3 font-medium">Board Signal</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.auditId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.auditId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.usageId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.billingId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.auditOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditStateBadgeClass(item.revenueAuditState)}`}>
                    {platformCommandRevenueAuditStateLabel(item.revenueAuditState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditSignalBadgeClass(item.auditSignal)}`}>
                    {platformCommandAuditSignalLabel(item.auditSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${usageBadgeClass(item.usageState)}`}>
                    {platformCommandUsageMonitoringStateLabel(item.usageState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${usageSignalBadgeClass(item.usageSignal)}`}>
                    {platformCommandUsageSignalLabel(item.usageSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.revenueEventTrace}</td>
                <td className="py-2 px-3 text-cyan-200">{item.invoiceMatch}</td>
                <td className="py-2 px-3 text-slate-300">{item.usageToInvoiceCheck}</td>
                <td className="py-2 px-3 text-slate-300">{item.recognitionControl}</td>
                <td className="py-2 px-3 text-amber-200">{item.variancePolicy}</td>
                <td className="py-2 px-3 text-slate-400">{item.auditEvidence}</td>
                <td className="py-2 px-3 text-slate-300">{item.complianceNote}</td>
                <td className="py-2 px-3 text-slate-300">{item.customerImpact}</td>
                <td className="py-2 px-3 text-cyan-200">{item.financeCloseGate}</td>
                <td className="py-2 px-3 text-slate-400">{item.boardReportingSignal}</td>
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
