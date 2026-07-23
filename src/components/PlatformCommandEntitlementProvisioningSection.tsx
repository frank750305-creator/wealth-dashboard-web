import {
  platformCommandAccessSignalLabel,
  platformCommandEntitlementStateLabel,
  type PlatformCommandAccessSignal,
  type PlatformCommandEntitlementProvisioningItem,
  type PlatformCommandEntitlementProvisioningSummary,
  type PlatformCommandEntitlementState,
} from "@/lib/platformCommandEntitlementProvisioning";
import {
  platformCommandQuoteDeskStateLabel,
  platformCommandQuoteRiskSignalLabel,
  type PlatformCommandQuoteDeskState,
  type PlatformCommandQuoteRiskSignal,
} from "@/lib/platformCommandQuoteDesk";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandEntitlementProvisioningSectionProps = {
  summary: PlatformCommandEntitlementProvisioningSummary;
  items: PlatformCommandEntitlementProvisioningItem[];
  onExportCsv: () => void;
};

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

function quoteDeskBadgeClass(state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "draft") return "bg-amber-500/15 text-amber-200";
  if (state === "legal_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function quoteRiskBadgeClass(signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return "bg-rose-500/15 text-rose-200";
  if (signal === "needs_review") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandEntitlementProvisioningItem["status"]) {
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

export function PlatformCommandEntitlementProvisioningSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandEntitlementProvisioningSectionProps) {
  const metrics = [
    ["Entitle", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Provision", `${summary.provisioningCount}`],
    ["Security", `${summary.securityReviewCount}`],
    ["Active", `${summary.activeCount}`],
    ["Denied", `${summary.deniedCount}`],
    ["Guarded", `${summary.guardedCount}`],
    ["Clear", `${summary.clearCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["開通窗", summary.nextProvisionWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Entitlement Provisioning 客戶權限開通</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把報價工作台轉成帳號、API scope、資料產品授權、權限邊界、安全審查與用量計量前置
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
            Entitlement CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.entitlementId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.entitlementId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.accessOwner} / {item.provisionCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${accessBadgeClass(item.accessSignal)}`}>
                {platformCommandAccessSignalLabel(item.accessSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.accountPlan}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">{platformCommandEntitlementStateLabel(item.entitlementState)}</p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.apiScope}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.permissionBoundary}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2600px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Entitlement ID</th>
              <th className="py-2 px-3 font-medium">Quote ID</th>
              <th className="py-2 px-3 font-medium">Pricing ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Access Owner</th>
              <th className="py-2 px-3 font-medium">Entitlement</th>
              <th className="py-2 px-3 font-medium">Access</th>
              <th className="py-2 px-3 font-medium">Quote Desk</th>
              <th className="py-2 px-3 font-medium">Quote Risk</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Account Plan</th>
              <th className="py-2 px-3 font-medium">API Scope</th>
              <th className="py-2 px-3 font-medium">Data Product Scope</th>
              <th className="py-2 px-3 font-medium">Permission Boundary</th>
              <th className="py-2 px-3 font-medium">Security Review</th>
              <th className="py-2 px-3 font-medium">Onboarding Runbook</th>
              <th className="py-2 px-3 font-medium">SLA Prereq</th>
              <th className="py-2 px-3 font-medium">Metering Plan</th>
              <th className="py-2 px-3 font-medium">Customer Comms</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.entitlementId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.entitlementId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.quoteId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.pricingId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.accessOwner}</td>
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
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${quoteDeskBadgeClass(item.quoteDeskState)}`}>
                    {platformCommandQuoteDeskStateLabel(item.quoteDeskState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${quoteRiskBadgeClass(item.quoteRiskSignal)}`}>
                    {platformCommandQuoteRiskSignalLabel(item.quoteRiskSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.accountPlan}</td>
                <td className="py-2 px-3 text-cyan-200">{item.apiScope}</td>
                <td className="py-2 px-3 text-slate-300">{item.dataProductScope}</td>
                <td className="py-2 px-3 text-amber-200">{item.permissionBoundary}</td>
                <td className="py-2 px-3 text-slate-400">{item.securityReview}</td>
                <td className="py-2 px-3 text-slate-400">{item.onboardingRunbook}</td>
                <td className="py-2 px-3 text-slate-300">{item.slaPrerequisite}</td>
                <td className="py-2 px-3 text-cyan-200">{item.meteringPlan}</td>
                <td className="py-2 px-3 text-slate-300">{item.customerComms}</td>
                <td className="py-2 px-3 text-slate-300">{item.provisionCadence}</td>
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
