import {
  platformCommandServiceSignalLabel,
  platformCommandSlaStateLabel,
  type PlatformCommandServiceSignal,
  type PlatformCommandSlaOperationsItem,
  type PlatformCommandSlaOperationsSummary,
  type PlatformCommandSlaState,
} from "@/lib/platformCommandSlaOperations";
import {
  platformCommandRevenueMeterSignalLabel,
  platformCommandSubscriptionBillingStateLabel,
  type PlatformCommandRevenueMeterSignal,
  type PlatformCommandSubscriptionBillingState,
} from "@/lib/platformCommandSubscriptionBilling";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandSlaOperationsSectionProps = {
  summary: PlatformCommandSlaOperationsSummary;
  items: PlatformCommandSlaOperationsItem[];
  onExportCsv: () => void;
};

function slaBadgeClass(state: PlatformCommandSlaState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "draft") return "bg-amber-500/15 text-amber-200";
  if (state === "incident_watch") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function serviceBadgeClass(signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "bg-rose-500/15 text-rose-200";
  if (signal === "monitored") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function billingBadgeClass(state: PlatformCommandSubscriptionBillingState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "setup") return "bg-amber-500/15 text-amber-200";
  if (state === "invoice_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function meterBadgeClass(signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return "bg-rose-500/15 text-rose-200";
  if (signal === "manual") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandSlaOperationsItem["status"]) {
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

export function PlatformCommandSlaOperationsSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandSlaOperationsSectionProps) {
  const metrics = [
    ["SLA", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Draft", `${summary.draftCount}`],
    ["Incident", `${summary.incidentWatchCount}`],
    ["Active", `${summary.activeCount}`],
    ["No SLA", `${summary.noSlaCount}`],
    ["Monitor", `${summary.monitoredCount}`],
    ["Guarantee", `${summary.guaranteedCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["服務窗", summary.nextServiceWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command SLA Operations 服務承諾營運</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把訂閱帳務轉成 availability、回應時間、資料新鮮度、incident protocol、status page 與 error budget
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
            SLA CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.slaId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.slaId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.slaOwner} / {item.serviceCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${serviceBadgeClass(item.serviceSignal)}`}>
                {platformCommandServiceSignalLabel(item.serviceSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.availabilityTarget}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">SLA</p>
                <p className="font-bold text-slate-100">{platformCommandSlaStateLabel(item.slaState)}</p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.responseTarget}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.incidentProtocol}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2500px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">SLA ID</th>
              <th className="py-2 px-3 font-medium">Billing ID</th>
              <th className="py-2 px-3 font-medium">Entitlement ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">SLA Owner</th>
              <th className="py-2 px-3 font-medium">SLA</th>
              <th className="py-2 px-3 font-medium">Service</th>
              <th className="py-2 px-3 font-medium">Billing</th>
              <th className="py-2 px-3 font-medium">Meter</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Availability</th>
              <th className="py-2 px-3 font-medium">Response</th>
              <th className="py-2 px-3 font-medium">Freshness</th>
              <th className="py-2 px-3 font-medium">Support</th>
              <th className="py-2 px-3 font-medium">Incident</th>
              <th className="py-2 px-3 font-medium">Status Page</th>
              <th className="py-2 px-3 font-medium">Error Budget</th>
              <th className="py-2 px-3 font-medium">Credit Policy</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.slaId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.slaId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.billingId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.entitlementId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.slaOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${slaBadgeClass(item.slaState)}`}>
                    {platformCommandSlaStateLabel(item.slaState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${serviceBadgeClass(item.serviceSignal)}`}>
                    {platformCommandServiceSignalLabel(item.serviceSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${billingBadgeClass(item.billingState)}`}>
                    {platformCommandSubscriptionBillingStateLabel(item.billingState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${meterBadgeClass(item.revenueMeterSignal)}`}>
                    {platformCommandRevenueMeterSignalLabel(item.revenueMeterSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.availabilityTarget}</td>
                <td className="py-2 px-3 text-slate-300">{item.responseTarget}</td>
                <td className="py-2 px-3 text-cyan-200">{item.dataFreshnessTarget}</td>
                <td className="py-2 px-3 text-slate-400">{item.supportCoverage}</td>
                <td className="py-2 px-3 text-amber-200">{item.incidentProtocol}</td>
                <td className="py-2 px-3 text-slate-300">{item.statusPagePlan}</td>
                <td className="py-2 px-3 text-slate-400">{item.errorBudgetPolicy}</td>
                <td className="py-2 px-3 text-slate-300">{item.serviceCreditPolicy}</td>
                <td className="py-2 px-3 text-slate-300">{item.serviceCadence}</td>
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
