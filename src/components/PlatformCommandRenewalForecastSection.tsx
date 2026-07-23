import {
  platformCommandNrrSignalLabel,
  platformCommandRenewalForecastStateLabel,
  type PlatformCommandNrrSignal,
  type PlatformCommandRenewalForecastItem,
  type PlatformCommandRenewalForecastState,
  type PlatformCommandRenewalForecastSummary,
} from "@/lib/platformCommandRenewalForecast";
import {
  platformCommandExpansionSignalLabel,
  platformCommandExpansionStateLabel,
  type PlatformCommandExpansionSignal,
  type PlatformCommandExpansionState,
} from "@/lib/platformCommandExpansionPlaybook";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandRenewalForecastSectionProps = {
  summary: PlatformCommandRenewalForecastSummary;
  items: PlatformCommandRenewalForecastItem[];
  onExportCsv: () => void;
};

function forecastBadgeClass(state: PlatformCommandRenewalForecastState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "protect") return "bg-amber-500/15 text-amber-200";
  if (state === "commit_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function nrrBadgeClass(signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return "bg-rose-500/15 text-rose-200";
  if (signal === "flat") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function expansionBadgeClass(state: PlatformCommandExpansionState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "renewal_save") return "bg-amber-500/15 text-amber-200";
  if (state === "expansion_ready") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function signalBadgeClass(signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return "bg-rose-500/15 text-rose-200";
  if (signal === "expand") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandRenewalForecastItem["status"]) {
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

export function PlatformCommandRenewalForecastSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandRenewalForecastSectionProps) {
  const metrics = [
    ["Forecast", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Protect", `${summary.protectCount}`],
    ["Commit", `${summary.commitReviewCount}`],
    ["Growth", `${summary.growthCommitCount}`],
    ["Contraction", `${summary.contractionCount}`],
    ["Flat", `${summary.flatCount}`],
    ["Expansion", `${summary.expansionCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["續約窗", summary.nextRenewalWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Renewal Forecast 續約預測</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把擴張續約劇本轉成 NRR 方向、續約機率、forecast 類別、QBR 動作、報價下一步與風險說明
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
            Renewal CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.forecastId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.forecastId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.forecastOwner} / {item.renewalWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${nrrBadgeClass(item.nrrSignal)}`}>
                {platformCommandNrrSignalLabel(item.nrrSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.renewalProbability}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandRenewalForecastStateLabel(item.renewalForecastState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.nrrDirection}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2400px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Forecast ID</th>
              <th className="py-2 px-3 font-medium">Expansion ID</th>
              <th className="py-2 px-3 font-medium">Success ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Forecast Owner</th>
              <th className="py-2 px-3 font-medium">Forecast</th>
              <th className="py-2 px-3 font-medium">NRR</th>
              <th className="py-2 px-3 font-medium">Expansion</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Probability</th>
              <th className="py-2 px-3 font-medium">Category</th>
              <th className="py-2 px-3 font-medium">NRR Direction</th>
              <th className="py-2 px-3 font-medium">QBR</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Pricing</th>
              <th className="py-2 px-3 font-medium">Sponsor</th>
              <th className="py-2 px-3 font-medium">Risk Note</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.forecastId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.forecastId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.expansionId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.successId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.forecastOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${forecastBadgeClass(item.renewalForecastState)}`}>
                    {platformCommandRenewalForecastStateLabel(item.renewalForecastState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${nrrBadgeClass(item.nrrSignal)}`}>
                    {platformCommandNrrSignalLabel(item.nrrSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${expansionBadgeClass(item.expansionState)}`}>
                    {platformCommandExpansionStateLabel(item.expansionState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(item.expansionSignal)}`}>
                    {platformCommandExpansionSignalLabel(item.expansionSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.renewalProbability}</td>
                <td className="py-2 px-3 text-slate-400">{item.forecastCategory}</td>
                <td className="py-2 px-3 text-cyan-200">{item.nrrDirection}</td>
                <td className="py-2 px-3 text-slate-300">{item.qbrAction}</td>
                <td className="py-2 px-3 text-slate-500">{item.commercialEvidence}</td>
                <td className="py-2 px-3 text-amber-200">{item.pricingAction}</td>
                <td className="py-2 px-3 text-slate-400">{item.executiveSponsor}</td>
                <td className="py-2 px-3 text-amber-200">{item.forecastRisk}</td>
                <td className="py-2 px-3 text-slate-300">{item.renewalWindow}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
