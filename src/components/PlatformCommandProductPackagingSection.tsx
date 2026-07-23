import {
  platformCommandProductPackageStateLabel,
  platformCommandRevenueSignalLabel,
  type PlatformCommandProductPackagingItem,
  type PlatformCommandProductPackagingSummary,
  type PlatformCommandProductPackageState,
  type PlatformCommandRevenueSignal,
} from "@/lib/platformCommandProductPackaging";
import {
  platformCommandClientReadoutStateLabel,
  platformCommandDistributionSignalLabel,
  type PlatformCommandClientReadoutState,
  type PlatformCommandDistributionSignal,
} from "@/lib/platformCommandClientReadout";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandProductPackagingSectionProps = {
  summary: PlatformCommandProductPackagingSummary;
  items: PlatformCommandProductPackagingItem[];
  onExportCsv: () => void;
};

function packageBadgeClass(state: PlatformCommandProductPackageState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "pricing_review") return "bg-amber-500/15 text-amber-200";
  if (state === "packaging") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function revenueBadgeClass(signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "bg-rose-500/15 text-rose-200";
  if (signal === "pilot") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function readoutBadgeClass(state: PlatformCommandClientReadoutState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "drafting") return "bg-amber-500/15 text-amber-200";
  if (state === "review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function distributionBadgeClass(signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return "bg-rose-500/15 text-rose-200";
  if (signal === "internal_only") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandProductPackagingItem["status"]) {
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

export function PlatformCommandProductPackagingSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandProductPackagingSectionProps) {
  const metrics = [
    ["Packages", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Pricing", `${summary.pricingReviewCount}`],
    ["Packaging", `${summary.packagingCount}`],
    ["Ready", `${summary.marketReadyCount}`],
    ["Revenue block", `${summary.blockedRevenueCount}`],
    ["Pilot", `${summary.pilotCount}`],
    ["Sellable", `${summary.sellableCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["上架窗", summary.nextLaunchWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Product Packaging 產品化封裝</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把客戶交付內容轉成產品包、定價檢查、權限規則、銷售話術、上架通道與商業化下一步
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
            Product CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.packageId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.packageId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.productTier} / {item.launchWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${revenueBadgeClass(item.revenueSignal)}`}>
                {platformCommandRevenueSignalLabel(item.revenueSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.packageName}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Package</p>
                <p className="font-bold text-slate-100">
                  {platformCommandProductPackageStateLabel(item.packageState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.valueProposition}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.pricingCheck}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2280px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Package ID</th>
              <th className="py-2 px-3 font-medium">Readout ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Product Owner</th>
              <th className="py-2 px-3 font-medium">Package</th>
              <th className="py-2 px-3 font-medium">Revenue</th>
              <th className="py-2 px-3 font-medium">Readout</th>
              <th className="py-2 px-3 font-medium">Distribution</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Tier</th>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Value</th>
              <th className="py-2 px-3 font-medium">Pricing Check</th>
              <th className="py-2 px-3 font-medium">Entitlement</th>
              <th className="py-2 px-3 font-medium">Asset</th>
              <th className="py-2 px-3 font-medium">Sales Note</th>
              <th className="py-2 px-3 font-medium">Channel</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.packageId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.packageId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.readoutId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.productOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${packageBadgeClass(item.packageState)}`}>
                    {platformCommandProductPackageStateLabel(item.packageState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${revenueBadgeClass(item.revenueSignal)}`}>
                    {platformCommandRevenueSignalLabel(item.revenueSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${readoutBadgeClass(item.clientReadoutState)}`}>
                    {platformCommandClientReadoutStateLabel(item.clientReadoutState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${distributionBadgeClass(item.distributionSignal)}`}>
                    {platformCommandDistributionSignalLabel(item.distributionSignal)}
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
                <td className="py-2 px-3 text-slate-400">{item.productTier}</td>
                <td className="py-2 px-3 text-slate-300">{item.packageName}</td>
                <td className="py-2 px-3 text-slate-300">{item.valueProposition}</td>
                <td className="py-2 px-3 text-amber-200">{item.pricingCheck}</td>
                <td className="py-2 px-3 text-slate-400">{item.entitlementRule}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.deliveryAsset}</td>
                <td className="py-2 px-3 text-slate-500">{item.salesNote}</td>
                <td className="py-2 px-3 text-slate-400">{item.launchChannel}</td>
                <td className="py-2 px-3 text-slate-300">{item.launchWindow}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
