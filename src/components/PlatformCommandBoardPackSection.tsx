import {
  platformCommandBoardPackStateLabel,
  platformCommandBoardSignalLabel,
  type PlatformCommandBoardPackItem,
  type PlatformCommandBoardPackState,
  type PlatformCommandBoardPackSummary,
  type PlatformCommandBoardSignal,
} from "@/lib/platformCommandBoardPack";
import {
  platformCommandExecutiveSignalLabel,
  platformCommandManagementStateLabel,
  type PlatformCommandExecutiveSignal,
  type PlatformCommandManagementState,
} from "@/lib/platformCommandManagementOverview";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandBoardPackSectionProps = {
  summary: PlatformCommandBoardPackSummary;
  items: PlatformCommandBoardPackItem[];
  onExportCsv: () => void;
};

function boardPackBadgeClass(state: PlatformCommandBoardPackState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "committee_review") return "bg-amber-500/15 text-amber-200";
  if (state === "board_draft") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function boardSignalBadgeClass(signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return "bg-rose-500/15 text-rose-200";
  if (signal === "disclose") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function managementBadgeClass(state: PlatformCommandManagementState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "turnaround") return "bg-amber-500/15 text-amber-200";
  if (state === "operating_review") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function executiveBadgeClass(signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return "bg-rose-500/15 text-rose-200";
  if (signal === "amber") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandBoardPackItem["status"]) {
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

export function PlatformCommandBoardPackSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandBoardPackSectionProps) {
  const metrics = [
    ["Board", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Committee", `${summary.committeeReviewCount}`],
    ["Draft", `${summary.boardDraftCount}`],
    ["Ready", `${summary.boardReadyCount}`],
    ["Hold", `${summary.holdCount}`],
    ["Disclose", `${summary.discloseCount}`],
    ["Approve", `${summary.approveCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["董事會窗", summary.nextBoardWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Board Pack 董事會包</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把管理層總覽收斂成收入故事、客戶故事、風險揭露、策略決策、資源要求、治理註記與附錄證據
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
            Board CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.boardPackId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.boardPackId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.boardOwner} / {item.boardCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${boardSignalBadgeClass(item.boardSignal)}`}>
                {platformCommandBoardSignalLabel(item.boardSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.revenueStory}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Board</p>
                <p className="font-bold text-slate-100">{platformCommandBoardPackStateLabel(item.boardPackState)}</p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.riskDisclosure}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.strategicDecision}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2580px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Board Pack ID</th>
              <th className="py-2 px-3 font-medium">Overview ID</th>
              <th className="py-2 px-3 font-medium">Health ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Board Owner</th>
              <th className="py-2 px-3 font-medium">Board Pack</th>
              <th className="py-2 px-3 font-medium">Board Signal</th>
              <th className="py-2 px-3 font-medium">Management</th>
              <th className="py-2 px-3 font-medium">Executive</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Revenue Story</th>
              <th className="py-2 px-3 font-medium">Customer Story</th>
              <th className="py-2 px-3 font-medium">Risk Disclosure</th>
              <th className="py-2 px-3 font-medium">Strategic Decision</th>
              <th className="py-2 px-3 font-medium">Capital Ask</th>
              <th className="py-2 px-3 font-medium">Operating KPI</th>
              <th className="py-2 px-3 font-medium">Governance</th>
              <th className="py-2 px-3 font-medium">Appendix</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Decision Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.boardPackId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.boardPackId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.overviewId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.healthId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.boardOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${boardPackBadgeClass(item.boardPackState)}`}>
                    {platformCommandBoardPackStateLabel(item.boardPackState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${boardSignalBadgeClass(item.boardSignal)}`}>
                    {platformCommandBoardSignalLabel(item.boardSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${managementBadgeClass(item.managementState)}`}>
                    {platformCommandManagementStateLabel(item.managementState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executiveBadgeClass(item.executiveSignal)}`}>
                    {platformCommandExecutiveSignalLabel(item.executiveSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.revenueStory}</td>
                <td className="py-2 px-3 text-cyan-200">{item.customerStory}</td>
                <td className="py-2 px-3 text-amber-200">{item.riskDisclosure}</td>
                <td className="py-2 px-3 text-slate-300">{item.strategicDecision}</td>
                <td className="py-2 px-3 text-slate-400">{item.capitalAsk}</td>
                <td className="py-2 px-3 text-slate-300">{item.operatingKpi}</td>
                <td className="py-2 px-3 text-cyan-200">{item.governanceNote}</td>
                <td className="py-2 px-3 text-slate-400">{item.appendixEvidence}</td>
                <td className="py-2 px-3 text-slate-300">{item.boardCadence}</td>
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
