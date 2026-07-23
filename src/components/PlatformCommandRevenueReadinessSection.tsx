import {
  platformCommandBookingSignalLabel,
  platformCommandRevenueReadinessStateLabel,
  type PlatformCommandBookingSignal,
  type PlatformCommandRevenueReadinessItem,
  type PlatformCommandRevenueReadinessState,
  type PlatformCommandRevenueReadinessSummary,
} from "@/lib/platformCommandRevenueReadiness";
import {
  platformCommandProductPackageStateLabel,
  platformCommandRevenueSignalLabel,
  type PlatformCommandProductPackageState,
  type PlatformCommandRevenueSignal,
} from "@/lib/platformCommandProductPackaging";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandRevenueReadinessSectionProps = {
  summary: PlatformCommandRevenueReadinessSummary;
  items: PlatformCommandRevenueReadinessItem[];
  onExportCsv: () => void;
};

function readinessBadgeClass(state: PlatformCommandRevenueReadinessState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "qualifying") return "bg-amber-500/15 text-amber-200";
  if (state === "contracting") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function bookingBadgeClass(signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "bg-rose-500/15 text-rose-200";
  if (signal === "pilot_only") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

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

function statusBadgeClass(status: PlatformCommandRevenueReadinessItem["status"]) {
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

export function PlatformCommandRevenueReadinessSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandRevenueReadinessSectionProps) {
  const metrics = [
    ["Revenue", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Qualifying", `${summary.qualifyingCount}`],
    ["Contracting", `${summary.contractingCount}`],
    ["Bookable", `${summary.bookableCount}`],
    ["No go", `${summary.noGoCount}`],
    ["Pilot only", `${summary.pilotOnlyCount}`],
    ["Bookable", `${summary.bookableSignalCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["收入窗", summary.nextRevenueWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Revenue Readiness 收入化準備</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把產品包轉成銷售資格、收入訊號、客戶分層、合約 gate、計費備註與 forecast 處理
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2">
            {metrics.map(([label, value], index) => (
              <div key={`${label}-${index}`} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
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
            Revenue CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.revenueId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.revenueId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.buyerSegment} / {item.nextAction}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${bookingBadgeClass(item.bookingSignal)}`}>
                {platformCommandBookingSignalLabel(item.bookingSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.qualifiedOffer}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandRevenueReadinessStateLabel(item.revenueReadinessState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.salesMotion}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.contractGate}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2320px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Revenue ID</th>
              <th className="py-2 px-3 font-medium">Package ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Revenue Owner</th>
              <th className="py-2 px-3 font-medium">Readiness</th>
              <th className="py-2 px-3 font-medium">Booking</th>
              <th className="py-2 px-3 font-medium">Package</th>
              <th className="py-2 px-3 font-medium">Revenue Signal</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Tier</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Sales Motion</th>
              <th className="py-2 px-3 font-medium">Offer</th>
              <th className="py-2 px-3 font-medium">ARR Band</th>
              <th className="py-2 px-3 font-medium">Contract Gate</th>
              <th className="py-2 px-3 font-medium">Billing</th>
              <th className="py-2 px-3 font-medium">CS Handoff</th>
              <th className="py-2 px-3 font-medium">Forecast</th>
              <th className="py-2 px-3 font-medium">Revenue Risk</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.revenueId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.revenueId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.packageId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.revenueOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${readinessBadgeClass(item.revenueReadinessState)}`}>
                    {platformCommandRevenueReadinessStateLabel(item.revenueReadinessState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${bookingBadgeClass(item.bookingSignal)}`}>
                    {platformCommandBookingSignalLabel(item.bookingSignal)}
                  </span>
                </td>
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
                <td className="py-2 px-3 text-slate-400">{item.buyerSegment}</td>
                <td className="py-2 px-3 text-slate-300">{item.salesMotion}</td>
                <td className="py-2 px-3 text-slate-300">{item.qualifiedOffer}</td>
                <td className="py-2 px-3 text-slate-400">{item.arrBand}</td>
                <td className="py-2 px-3 text-amber-200">{item.contractGate}</td>
                <td className="py-2 px-3 text-slate-400">{item.billingNote}</td>
                <td className="py-2 px-3 text-slate-500">{item.customerSuccessHandoff}</td>
                <td className="py-2 px-3 text-slate-400">{item.forecastTreatment}</td>
                <td className="py-2 px-3 text-amber-200">{item.revenueRisk}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
