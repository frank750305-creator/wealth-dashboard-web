import {
  platformCommandEvidenceStateLabel,
  type PlatformCommandEvidenceLedgerItem,
  type PlatformCommandEvidenceLedgerSummary,
  type PlatformCommandEvidenceState,
} from "@/lib/platformCommandEvidenceLedger";
import {
  platformCommandFollowUpStateLabel,
  type PlatformCommandFollowUpState,
} from "@/lib/platformCommandDecisionFollowUp";
import {
  platformCommandDecisionStateLabel,
  type PlatformCommandDecisionState,
} from "@/lib/platformCommandDecisionRegister";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

type PlatformCommandEvidenceLedgerSectionProps = {
  summary: PlatformCommandEvidenceLedgerSummary;
  items: PlatformCommandEvidenceLedgerItem[];
  onExportCsv: () => void;
};

function evidenceBadgeClass(state: PlatformCommandEvidenceState) {
  if (state === "missing") return "bg-rose-500/15 text-rose-200";
  if (state === "collecting") return "bg-amber-500/15 text-amber-200";
  if (state === "ready") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function followUpBadgeClass(state: PlatformCommandFollowUpState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "due") return "bg-amber-500/15 text-amber-200";
  if (state === "active") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function decisionStateBadgeClass(state: PlatformCommandDecisionState) {
  if (state === "required") return "bg-rose-500/15 text-rose-200";
  if (state === "pending") return "bg-amber-500/15 text-amber-200";
  if (state === "approved") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandEvidenceLedgerItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function scoreClass(score: number) {
  if (score < 50) return "text-rose-200";
  if (score < 75) return "text-amber-200";
  return "text-emerald-200";
}

function residualRiskClass(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "text-rose-200";
  if (risk === "medium") return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandEvidenceLedgerSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandEvidenceLedgerSectionProps) {
  const metrics = [
    ["Evidence", `${summary.itemCount}`],
    ["Missing", `${summary.missingCount}`],
    ["Collecting", `${summary.collectingCount}`],
    ["Ready", `${summary.readyCount}`],
    ["Archived", `${summary.archivedCount}`],
    ["高風險", `${summary.highResidualRiskCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["證據窗", summary.nextEvidenceWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Evidence Ledger 證據台帳</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把落地追蹤轉成證據狀態、保存位置、證據缺口、驗證 owner 與保留規則
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
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
            Evidence CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.decisionId}-evidence-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.decisionId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.evidenceOwner} / {item.verificationCadence}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${evidenceBadgeClass(item.evidenceState)}`}>
                {platformCommandEvidenceStateLabel(item.evidenceState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className={`font-mono font-bold ${scoreClass(item.readinessScore)}`}>{item.readinessScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Follow</p>
                <p className="font-bold text-slate-100">{platformCommandFollowUpStateLabel(item.followUpState)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Risk</p>
                <p className={`font-bold ${residualRiskClass(item.residualRisk)}`}>
                  {platformCommandResidualRiskLabel(item.residualRisk)}
                </p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[11px] text-cyan-200">{item.evidenceLocation}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.evidenceGap}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2180px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Evidence Owner</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Follow-up</th>
              <th className="py-2 px-3 font-medium">Decision</th>
              <th className="py-2 px-3 font-medium">Priority</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Location</th>
              <th className="py-2 px-3 font-medium">Gap</th>
              <th className="py-2 px-3 font-medium">Verifier</th>
              <th className="py-2 px-3 font-medium">Cadence</th>
              <th className="py-2 px-3 font-medium">Retention</th>
              <th className="py-2 px-3 font-medium">Closure Gate</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.decisionId}-evidence-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-400">{item.evidenceOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${evidenceBadgeClass(item.evidenceState)}`}>
                    {platformCommandEvidenceStateLabel(item.evidenceState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${followUpBadgeClass(item.followUpState)}`}>
                    {platformCommandFollowUpStateLabel(item.followUpState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionStateBadgeClass(item.decisionState)}`}>
                    {platformCommandDecisionStateLabel(item.decisionState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(item.priority)}`}>
                    {platformCommandPriorityLabel(item.priority)}
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
                <td className="py-2 px-3 text-slate-500">{item.evidenceType}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.evidenceLocation}</td>
                <td className="py-2 px-3 text-amber-200">{item.evidenceGap}</td>
                <td className="py-2 px-3 text-cyan-200">{item.verificationOwner}</td>
                <td className="py-2 px-3 text-slate-300">{item.verificationCadence}</td>
                <td className="py-2 px-3 text-slate-500">{item.retentionRule}</td>
                <td className="py-2 px-3 text-amber-200">{item.closureGate}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
