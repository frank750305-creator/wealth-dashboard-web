import {
  platformCommandCeoDecisionSignalLabel,
  platformCommandCeoDecisionStateLabel,
  type PlatformCommandCeoDecisionConsoleItem,
  type PlatformCommandCeoDecisionConsoleSummary,
  type PlatformCommandCeoDecisionSignal,
  type PlatformCommandCeoDecisionState,
} from "@/lib/platformCommandCeoDecisionConsole";
import {
  platformCommandControlTowerSignalLabel,
  platformCommandControlTowerStateLabel,
  type PlatformCommandControlTowerSignal,
  type PlatformCommandControlTowerState,
} from "@/lib/platformCommandOperatingControlTower";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandCeoDecisionConsoleSectionProps = {
  summary: PlatformCommandCeoDecisionConsoleSummary;
  items: PlatformCommandCeoDecisionConsoleItem[];
  onExportCsv: () => void;
};

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

function controlStateBadgeClass(state: PlatformCommandControlTowerState) {
  if (state === "halted") return "bg-rose-500/15 text-rose-200";
  if (state === "war_room") return "bg-amber-500/15 text-amber-200";
  if (state === "executive_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function controlSignalBadgeClass(signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return "bg-rose-500/15 text-rose-200";
  if (signal === "focus") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandCeoDecisionConsoleItem["status"]) {
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

export function PlatformCommandCeoDecisionConsoleSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandCeoDecisionConsoleSectionProps) {
  const metrics = [
    ["Memos", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedDecisionCount}`],
    ["Repair", `${summary.repairMandateCount}`],
    ["Conditional", `${summary.conditionalGoCount}`],
    ["CEO Go", `${summary.ceoGoCount}`],
    ["Reject", `${summary.rejectCount}`],
    ["Condition", `${summary.conditionCount}`],
    ["Approve", `${summary.approveCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["決策窗", summary.ceoDecisionWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command CEO Decision Console CEO 決策台</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把平台總控台轉成 CEO 可執行的拒絕、條件批准、批准決策包，連到投資、收入、客戶、風險、董事會與投資人訊息
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
            CEO CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.memoId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.memoId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.ceoOwner} / {item.followUpCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ceoSignalBadgeClass(item.ceoDecisionSignal)}`}>
                {platformCommandCeoDecisionSignalLabel(item.ceoDecisionSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.agendaTitle}</p>
            <p className="mt-2 text-[11px] text-amber-200">{item.ceoDecision}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandCeoDecisionStateLabel(item.ceoDecisionState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.decisionRationale}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2700px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Memo ID</th>
              <th className="py-2 px-3 font-medium">Control ID</th>
              <th className="py-2 px-3 font-medium">Board Pack ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">CEO Owner</th>
              <th className="py-2 px-3 font-medium">CEO State</th>
              <th className="py-2 px-3 font-medium">CEO Signal</th>
              <th className="py-2 px-3 font-medium">Control</th>
              <th className="py-2 px-3 font-medium">Control Signal</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Agenda</th>
              <th className="py-2 px-3 font-medium">CEO Decision</th>
              <th className="py-2 px-3 font-medium">Rationale</th>
              <th className="py-2 px-3 font-medium">Investment</th>
              <th className="py-2 px-3 font-medium">Revenue</th>
              <th className="py-2 px-3 font-medium">Customer</th>
              <th className="py-2 px-3 font-medium">Operating</th>
              <th className="py-2 px-3 font-medium">Risk Mandate</th>
              <th className="py-2 px-3 font-medium">Board Message</th>
              <th className="py-2 px-3 font-medium">Investor Message</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.memoId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.memoId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.controlId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.boardPackId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.ceoOwner}</td>
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
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${controlStateBadgeClass(item.controlState)}`}>
                    {platformCommandControlTowerStateLabel(item.controlState)}
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
                <td className="py-2 px-3 text-slate-300">{item.agendaTitle}</td>
                <td className="py-2 px-3 text-amber-200">{item.ceoDecision}</td>
                <td className="py-2 px-3 text-slate-300">{item.decisionRationale}</td>
                <td className="py-2 px-3 text-slate-300">{item.investmentPosture}</td>
                <td className="py-2 px-3 text-slate-300">{item.revenuePosture}</td>
                <td className="py-2 px-3 text-slate-300">{item.customerPosture}</td>
                <td className="py-2 px-3 text-slate-300">{item.operatingMandate}</td>
                <td className="py-2 px-3 text-slate-300">{item.riskMandate}</td>
                <td className="py-2 px-3 text-slate-300">{item.boardMessage}</td>
                <td className="py-2 px-3 text-slate-300">{item.investorMessage}</td>
                <td className="py-2 px-3 text-slate-300">{item.followUpCadence}</td>
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
