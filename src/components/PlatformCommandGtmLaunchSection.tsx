import {
  platformCommandGtmLaunchStateLabel,
  platformCommandLaunchSignalLabel,
  type PlatformCommandGtmLaunchItem,
  type PlatformCommandGtmLaunchState,
  type PlatformCommandGtmLaunchSummary,
  type PlatformCommandLaunchSignal,
} from "@/lib/platformCommandGtmLaunch";
import {
  platformCommandBookingSignalLabel,
  platformCommandRevenueReadinessStateLabel,
  type PlatformCommandBookingSignal,
  type PlatformCommandRevenueReadinessState,
} from "@/lib/platformCommandRevenueReadiness";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandGtmLaunchSectionProps = {
  summary: PlatformCommandGtmLaunchSummary;
  items: PlatformCommandGtmLaunchItem[];
  onExportCsv: () => void;
};

function launchBadgeClass(state: PlatformCommandGtmLaunchState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "enablement") return "bg-amber-500/15 text-amber-200";
  if (state === "pilot_launch") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function signalBadgeClass(signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "bg-rose-500/15 text-rose-200";
  if (signal === "controlled") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function revenueReadinessBadgeClass(state: PlatformCommandRevenueReadinessState) {
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

function statusBadgeClass(status: PlatformCommandGtmLaunchItem["status"]) {
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

export function PlatformCommandGtmLaunchSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandGtmLaunchSectionProps) {
  const metrics = [
    ["Launch", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Enablement", `${summary.enablementCount}`],
    ["Pilot", `${summary.pilotLaunchCount}`],
    ["Live", `${summary.liveCount}`],
    ["Hold", `${summary.holdCount}`],
    ["Controlled", `${summary.controlledCount}`],
    ["Scale", `${summary.scaleCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["上市窗", summary.nextLaunchWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command GTM Launch 上市推進</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把收入化準備轉成銷售啟用、demo 腳本、CRM stage、上市通道、成功指標與回饋閉環
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
            GTM CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.launchId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.launchId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.launchOwner} / {item.launchWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(item.launchSignal)}`}>
                {platformCommandLaunchSignalLabel(item.launchSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.launchMotion}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">{platformCommandGtmLaunchStateLabel(item.gtmLaunchState)}</p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.demoScript}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2360px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Launch ID</th>
              <th className="py-2 px-3 font-medium">Revenue ID</th>
              <th className="py-2 px-3 font-medium">Package ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Launch Owner</th>
              <th className="py-2 px-3 font-medium">Launch</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 px-3 font-medium">Revenue</th>
              <th className="py-2 px-3 font-medium">Booking</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Motion</th>
              <th className="py-2 px-3 font-medium">Enablement</th>
              <th className="py-2 px-3 font-medium">Demo Script</th>
              <th className="py-2 px-3 font-medium">CRM Stage</th>
              <th className="py-2 px-3 font-medium">Channel</th>
              <th className="py-2 px-3 font-medium">Success Metric</th>
              <th className="py-2 px-3 font-medium">Feedback</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Launch Risk</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.launchId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.launchId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.revenueId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.packageId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.launchOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${launchBadgeClass(item.gtmLaunchState)}`}>
                    {platformCommandGtmLaunchStateLabel(item.gtmLaunchState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(item.launchSignal)}`}>
                    {platformCommandLaunchSignalLabel(item.launchSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${revenueReadinessBadgeClass(item.revenueReadinessState)}`}>
                    {platformCommandRevenueReadinessStateLabel(item.revenueReadinessState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${bookingBadgeClass(item.bookingSignal)}`}>
                    {platformCommandBookingSignalLabel(item.bookingSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.launchMotion}</td>
                <td className="py-2 px-3 text-slate-500">{item.enablementAsset}</td>
                <td className="py-2 px-3 text-slate-300">{item.demoScript}</td>
                <td className="py-2 px-3 text-slate-400">{item.crmStage}</td>
                <td className="py-2 px-3 text-slate-400">{item.launchChannel}</td>
                <td className="py-2 px-3 text-cyan-200">{item.successMetric}</td>
                <td className="py-2 px-3 text-slate-500">{item.feedbackLoop}</td>
                <td className="py-2 px-3 text-slate-300">{item.launchWindow}</td>
                <td className="py-2 px-3 text-amber-200">{item.launchRisk}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
