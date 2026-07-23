import {
  platformCommandBoardReportStateLabel,
  platformCommandBoardSignalLabel,
  type PlatformCommandBoardReportingItem,
  type PlatformCommandBoardReportingSummary,
  type PlatformCommandBoardReportState,
  type PlatformCommandBoardSignal,
} from "@/lib/platformCommandBoardReporting";
import {
  platformCommandAttestationResultLabel,
  platformCommandAttestationStateLabel,
  type PlatformCommandAttestationResult,
  type PlatformCommandAttestationState,
} from "@/lib/platformCommandComplianceAttestation";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandBoardReportingSectionProps = {
  summary: PlatformCommandBoardReportingSummary;
  items: PlatformCommandBoardReportingItem[];
  onExportCsv: () => void;
};

function boardStateBadgeClass(state: PlatformCommandBoardReportState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "draft") return "bg-amber-500/15 text-amber-200";
  if (state === "ready") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function signalBadgeClass(signal: PlatformCommandBoardSignal) {
  if (signal === "red") return "bg-rose-500/15 text-rose-200";
  if (signal === "amber") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function attestationBadgeClass(state: PlatformCommandAttestationState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "drafting") return "bg-amber-500/15 text-amber-200";
  if (state === "ready") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function attestationResultBadgeClass(result: PlatformCommandAttestationResult) {
  if (result === "not_ready") return "bg-rose-500/15 text-rose-200";
  if (result === "conditional") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandBoardReportingItem["status"]) {
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

export function PlatformCommandBoardReportingSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandBoardReportingSectionProps) {
  const metrics = [
    ["Reports", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Draft", `${summary.draftCount}`],
    ["Ready", `${summary.readyCount}`],
    ["Published", `${summary.publishedCount}`],
    ["Red", `${summary.redCount}`],
    ["Amber", `${summary.amberCount}`],
    ["Green", `${summary.greenCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["發布窗", summary.nextPublishWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Board Reporting Pack 董事會報告包</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把合規簽核包轉成報告訊號、風險揭露、董事會決策請求、資料附件與發布窗口
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
          <div key={`${item.reportId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.reportId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.audience} / {item.publishWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(item.boardSignal)}`}>
                {platformCommandBoardSignalLabel(item.boardSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.executiveHeadline}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandBoardReportStateLabel(item.boardReportState)}
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
            <p className="mt-3 text-[11px] text-amber-200">{item.boardAsk}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2260px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Report ID</th>
              <th className="py-2 px-3 font-medium">Attestation ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Report Owner</th>
              <th className="py-2 px-3 font-medium">Report</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 px-3 font-medium">Attestation</th>
              <th className="py-2 px-3 font-medium">Attestation Result</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Audience</th>
              <th className="py-2 px-3 font-medium">Headline</th>
              <th className="py-2 px-3 font-medium">Disclosure</th>
              <th className="py-2 px-3 font-medium">Board Ask</th>
              <th className="py-2 px-3 font-medium">Appendix</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Use Case</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.reportId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.reportId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.attestationId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.reportOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${boardStateBadgeClass(item.boardReportState)}`}>
                    {platformCommandBoardReportStateLabel(item.boardReportState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(item.boardSignal)}`}>
                    {platformCommandBoardSignalLabel(item.boardSignal)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${attestationBadgeClass(item.attestationState)}`}>
                    {platformCommandAttestationStateLabel(item.attestationState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${attestationResultBadgeClass(item.attestationResult)}`}>
                    {platformCommandAttestationResultLabel(item.attestationResult)}
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
                <td className="py-2 px-3 text-slate-400">{item.audience}</td>
                <td className="py-2 px-3 text-slate-300">{item.executiveHeadline}</td>
                <td className="py-2 px-3 text-amber-200">{item.riskDisclosure}</td>
                <td className="py-2 px-3 text-amber-200">{item.boardAsk}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.dataAppendix}</td>
                <td className="py-2 px-3 text-slate-300">{item.publishWindow}</td>
                <td className="py-2 px-3 text-slate-500">{item.reportingUseCase}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
