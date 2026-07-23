import {
  platformCommandRevenueMeterSignalLabel,
  platformCommandSubscriptionBillingStateLabel,
  type PlatformCommandRevenueMeterSignal,
  type PlatformCommandSubscriptionBillingItem,
  type PlatformCommandSubscriptionBillingState,
  type PlatformCommandSubscriptionBillingSummary,
} from "@/lib/platformCommandSubscriptionBilling";
import {
  platformCommandAccessSignalLabel,
  platformCommandEntitlementStateLabel,
  type PlatformCommandAccessSignal,
  type PlatformCommandEntitlementState,
} from "@/lib/platformCommandEntitlementProvisioning";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandSubscriptionBillingSectionProps = {
  summary: PlatformCommandSubscriptionBillingSummary;
  items: PlatformCommandSubscriptionBillingItem[];
  onExportCsv: () => void;
};

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

function entitlementBadgeClass(state: PlatformCommandEntitlementState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "provisioning") return "bg-amber-500/15 text-amber-200";
  if (state === "security_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function accessBadgeClass(signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "bg-rose-500/15 text-rose-200";
  if (signal === "guarded") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandSubscriptionBillingItem["status"]) {
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

export function PlatformCommandSubscriptionBillingSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandSubscriptionBillingSectionProps) {
  const metrics = [
    ["Billing", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Setup", `${summary.setupCount}`],
    ["Invoice", `${summary.invoiceReviewCount}`],
    ["Live", `${summary.liveCount}`],
    ["Disabled", `${summary.disabledCount}`],
    ["Manual", `${summary.manualCount}`],
    ["Auto", `${summary.automatedCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["帳務窗", summary.nextBillingWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Subscription Billing 訂閱帳務</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把客戶權限開通轉成訂閱方案、帳務帳戶、發票規則、用量計量、收款控制與月結節奏
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
            Billing CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.billingId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.billingId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.billingOwner} / {item.financeClose}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${meterBadgeClass(item.revenueMeterSignal)}`}>
                {platformCommandRevenueMeterSignalLabel(item.revenueMeterSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.subscriptionPlan}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Billing</p>
                <p className="font-bold text-slate-100">
                  {platformCommandSubscriptionBillingStateLabel(item.billingState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.invoiceRule}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.collectionsControl}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2520px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Billing ID</th>
              <th className="py-2 px-3 font-medium">Entitlement ID</th>
              <th className="py-2 px-3 font-medium">Quote ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Billing Owner</th>
              <th className="py-2 px-3 font-medium">Billing</th>
              <th className="py-2 px-3 font-medium">Meter</th>
              <th className="py-2 px-3 font-medium">Entitlement</th>
              <th className="py-2 px-3 font-medium">Access</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Subscription Plan</th>
              <th className="py-2 px-3 font-medium">Billing Account</th>
              <th className="py-2 px-3 font-medium">Invoice Rule</th>
              <th className="py-2 px-3 font-medium">Usage Meter</th>
              <th className="py-2 px-3 font-medium">Tax Treatment</th>
              <th className="py-2 px-3 font-medium">Revenue Schedule</th>
              <th className="py-2 px-3 font-medium">Collections Control</th>
              <th className="py-2 px-3 font-medium">Dunning Plan</th>
              <th className="py-2 px-3 font-medium">Finance Close</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.billingId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.billingId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.entitlementId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.quoteId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.billingOwner}</td>
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
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${entitlementBadgeClass(item.entitlementState)}`}>
                    {platformCommandEntitlementStateLabel(item.entitlementState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${accessBadgeClass(item.accessSignal)}`}>
                    {platformCommandAccessSignalLabel(item.accessSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.subscriptionPlan}</td>
                <td className="py-2 px-3 text-cyan-200">{item.billingAccount}</td>
                <td className="py-2 px-3 text-amber-200">{item.invoiceRule}</td>
                <td className="py-2 px-3 text-slate-300">{item.usageMeter}</td>
                <td className="py-2 px-3 text-slate-400">{item.taxTreatment}</td>
                <td className="py-2 px-3 text-slate-300">{item.revenueSchedule}</td>
                <td className="py-2 px-3 text-amber-200">{item.collectionsControl}</td>
                <td className="py-2 px-3 text-slate-400">{item.dunningPlan}</td>
                <td className="py-2 px-3 text-cyan-200">{item.financeClose}</td>
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
