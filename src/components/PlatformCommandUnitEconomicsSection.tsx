import {
  platformCommandMarginSignalLabel,
  platformCommandUnitEconomicsStateLabel,
  type PlatformCommandMarginSignal,
  type PlatformCommandUnitEconomicsItem,
  type PlatformCommandUnitEconomicsState,
  type PlatformCommandUnitEconomicsSummary,
} from "@/lib/platformCommandUnitEconomics";
import {
  platformCommandRevenueRecognitionSignalLabel,
  platformCommandRevOpsStateLabel,
  type PlatformCommandRevenueRecognitionSignal,
  type PlatformCommandRevOpsState,
} from "@/lib/platformCommandRevenueOperationsLedger";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandUnitEconomicsSectionProps = {
  summary: PlatformCommandUnitEconomicsSummary;
  items: PlatformCommandUnitEconomicsItem[];
  onExportCsv: () => void;
};

function unitEconomicsBadgeClass(state: PlatformCommandUnitEconomicsState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "cost_review") return "bg-amber-500/15 text-amber-200";
  if (state === "margin_watch") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function marginBadgeClass(signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return "bg-rose-500/15 text-rose-200";
  if (signal === "thin") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function revOpsBadgeClass(state: PlatformCommandRevOpsState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "contract_review") return "bg-amber-500/15 text-amber-200";
  if (state === "billing_setup") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function recognitionBadgeClass(signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "bg-rose-500/15 text-rose-200";
  if (signal === "manual_review") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandUnitEconomicsItem["status"]) {
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

export function PlatformCommandUnitEconomicsSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandUnitEconomicsSectionProps) {
  const metrics = [
    ["Economics", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Cost", `${summary.costReviewCount}`],
    ["Watch", `${summary.marginWatchCount}`],
    ["Efficient", `${summary.efficientCount}`],
    ["Negative", `${summary.negativeCount}`],
    ["Thin", `${summary.thinCount}`],
    ["Healthy", `${summary.healthyCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["毛利窗", summary.nextMarginWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Unit Economics Scorecard 單位經濟儀表</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把收入營運台帳轉成毛利訊號、COGS driver、交付成本、支援成本、回本視角與定價動作
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
            Unit CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.economicsId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.economicsId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.financeOwner} / {item.financeCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${marginBadgeClass(item.marginSignal)}`}>
                {platformCommandMarginSignalLabel(item.marginSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.grossMarginBand}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandUnitEconomicsStateLabel(item.unitEconomicsState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.paybackView}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.pricingAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2380px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Economics ID</th>
              <th className="py-2 px-3 font-medium">RevOps ID</th>
              <th className="py-2 px-3 font-medium">Forecast ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Finance Owner</th>
              <th className="py-2 px-3 font-medium">Economics</th>
              <th className="py-2 px-3 font-medium">Margin</th>
              <th className="py-2 px-3 font-medium">RevOps</th>
              <th className="py-2 px-3 font-medium">Recognition</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Gross Margin</th>
              <th className="py-2 px-3 font-medium">COGS</th>
              <th className="py-2 px-3 font-medium">Delivery Cost</th>
              <th className="py-2 px-3 font-medium">Support Cost</th>
              <th className="py-2 px-3 font-medium">Payback</th>
              <th className="py-2 px-3 font-medium">Pricing Action</th>
              <th className="py-2 px-3 font-medium">Margin Risk</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.economicsId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.economicsId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.revOpsId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.forecastId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.financeOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${unitEconomicsBadgeClass(item.unitEconomicsState)}`}>
                    {platformCommandUnitEconomicsStateLabel(item.unitEconomicsState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${marginBadgeClass(item.marginSignal)}`}>
                    {platformCommandMarginSignalLabel(item.marginSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${revOpsBadgeClass(item.revOpsState)}`}>
                    {platformCommandRevOpsStateLabel(item.revOpsState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${recognitionBadgeClass(item.recognitionSignal)}`}>
                    {platformCommandRevenueRecognitionSignalLabel(item.recognitionSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.grossMarginBand}</td>
                <td className="py-2 px-3 text-slate-300">{item.cogsDriver}</td>
                <td className="py-2 px-3 text-slate-400">{item.deliveryCostControl}</td>
                <td className="py-2 px-3 text-slate-400">{item.supportCostModel}</td>
                <td className="py-2 px-3 text-cyan-200">{item.paybackView}</td>
                <td className="py-2 px-3 text-amber-200">{item.pricingAction}</td>
                <td className="py-2 px-3 text-slate-500">{item.marginRisk}</td>
                <td className="py-2 px-3 text-slate-300">{item.financeCadence}</td>
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
