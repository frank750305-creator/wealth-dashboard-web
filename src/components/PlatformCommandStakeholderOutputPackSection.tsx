import {
  platformCommandStakeholderAudienceLabel,
  platformCommandStakeholderDeliverySignalLabel,
  platformCommandStakeholderOutputStateLabel,
  type PlatformCommandStakeholderAudience,
  type PlatformCommandStakeholderDeliverySignal,
  type PlatformCommandStakeholderOutputPackItem,
  type PlatformCommandStakeholderOutputPackSummary,
  type PlatformCommandStakeholderOutputState,
} from "@/lib/platformCommandStakeholderOutputPack";
import {
  platformCommandCeoDecisionSignalLabel,
  platformCommandCeoDecisionStateLabel,
  type PlatformCommandCeoDecisionSignal,
  type PlatformCommandCeoDecisionState,
} from "@/lib/platformCommandCeoDecisionConsole";
import {
  platformCommandControlTowerSignalLabel,
  type PlatformCommandControlTowerSignal,
} from "@/lib/platformCommandOperatingControlTower";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandStakeholderOutputPackSectionProps = {
  summary: PlatformCommandStakeholderOutputPackSummary;
  items: PlatformCommandStakeholderOutputPackItem[];
  onExportCsv: () => void;
};

function audienceBadgeClass(audience: PlatformCommandStakeholderAudience) {
  if (audience === "investor") return "bg-fuchsia-500/15 text-fuchsia-200";
  if (audience === "board") return "bg-cyan-500/15 text-cyan-200";
  if (audience === "customer") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700 text-slate-200";
}

function outputStateBadgeClass(state: PlatformCommandStakeholderOutputState) {
  if (state === "suppressed") return "bg-rose-500/15 text-rose-200";
  if (state === "rewrite") return "bg-orange-500/15 text-orange-200";
  if (state === "review") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function deliverySignalBadgeClass(signal: PlatformCommandStakeholderDeliverySignal) {
  if (signal === "do_not_send") return "bg-rose-500/15 text-rose-200";
  if (signal === "conditional_send") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function ceoStateBadgeClass(state: PlatformCommandCeoDecisionState) {
  if (state === "blocked_decision") return "bg-rose-500/15 text-rose-200";
  if (state === "repair_mandate") return "bg-amber-500/15 text-amber-200";
  if (state === "conditional_go") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function ceoSignalBadgeClass(signal: PlatformCommandCeoDecisionSignal) {
  if (signal === "reject") return "bg-rose-500/15 text-rose-200";
  if (signal === "condition") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function controlSignalBadgeClass(signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return "bg-rose-500/15 text-rose-200";
  if (signal === "focus") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandStakeholderOutputPackItem["status"]) {
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

export function PlatformCommandStakeholderOutputPackSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandStakeholderOutputPackSectionProps) {
  const metrics = [
    ["Outputs", `${summary.itemCount}`],
    ["Investor", `${summary.investorCount}`],
    ["Board", `${summary.boardCount}`],
    ["Customer", `${summary.customerCount}`],
    ["Internal", `${summary.internalCount}`],
    ["Suppressed", `${summary.suppressedCount}`],
    ["Review", `${summary.reviewCount}`],
    ["Ready", `${summary.publishReadyCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["發布決策", summary.publishDecision],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Stakeholder Output Pack 最終輸出包</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把 CEO 決策拆成投資人、董事會、客戶與內部管理層四種輸出，統一控制是否發布、條件發布或禁止發布
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
            Output CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {items.slice(0, 4).map((item) => (
          <div key={`${item.outputId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.outputId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.publishWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${audienceBadgeClass(item.audience)}`}>
                {platformCommandStakeholderAudienceLabel(item.audience)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.outputTitle}</p>
            <p className="mt-2 text-[11px] text-slate-300">{item.executiveSummary}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandStakeholderOutputStateLabel(item.outputState)}
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
            <p className="mt-3 text-[11px] text-amber-200">{item.callToAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2860px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Output ID</th>
              <th className="py-2 px-3 font-medium">Memo ID</th>
              <th className="py-2 px-3 font-medium">Control ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Audience</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Publisher</th>
              <th className="py-2 px-3 font-medium">Output</th>
              <th className="py-2 px-3 font-medium">Delivery</th>
              <th className="py-2 px-3 font-medium">CEO State</th>
              <th className="py-2 px-3 font-medium">CEO Signal</th>
              <th className="py-2 px-3 font-medium">Control Signal</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Title</th>
              <th className="py-2 px-3 font-medium">Summary</th>
              <th className="py-2 px-3 font-medium">Proof</th>
              <th className="py-2 px-3 font-medium">Disclosure</th>
              <th className="py-2 px-3 font-medium">CTA</th>
              <th className="py-2 px-3 font-medium">Channel</th>
              <th className="py-2 px-3 font-medium">Approval</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.outputId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.outputId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.memoId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.controlId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${audienceBadgeClass(item.audience)}`}>
                    {platformCommandStakeholderAudienceLabel(item.audience)}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.publisher}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${outputStateBadgeClass(item.outputState)}`}>
                    {platformCommandStakeholderOutputStateLabel(item.outputState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${deliverySignalBadgeClass(item.deliverySignal)}`}>
                    {platformCommandStakeholderDeliverySignalLabel(item.deliverySignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ceoStateBadgeClass(item.ceoDecisionState)}`}>
                    {platformCommandCeoDecisionStateLabel(item.ceoDecisionState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ceoSignalBadgeClass(item.ceoDecisionSignal)}`}>
                    {platformCommandCeoDecisionSignalLabel(item.ceoDecisionSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${controlSignalBadgeClass(item.controlSignal)}`}>
                    {platformCommandControlTowerSignalLabel(item.controlSignal)}
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
                <td className="py-2 px-3 text-slate-400">{item.sourceRoute}</td>
                <td className="py-2 px-3 text-slate-400">{item.buyerSegment}</td>
                <td className="py-2 px-3 text-slate-300">{item.outputTitle}</td>
                <td className="py-2 px-3 text-slate-300">{item.executiveSummary}</td>
                <td className="py-2 px-3 text-slate-300">{item.proofPoint}</td>
                <td className="py-2 px-3 text-slate-300">{item.disclosure}</td>
                <td className="py-2 px-3 text-amber-200">{item.callToAction}</td>
                <td className="py-2 px-3 text-slate-300">{item.deliveryChannel}</td>
                <td className="py-2 px-3 text-slate-300">{item.approvalOwner}</td>
                <td className="py-2 px-3 text-slate-300">{item.publishWindow}</td>
                <td className="py-2 px-3 text-slate-300">{item.decisionGate}</td>
                <td className="py-2 px-3 text-slate-300">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
