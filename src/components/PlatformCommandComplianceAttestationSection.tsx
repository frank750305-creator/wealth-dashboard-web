import {
  platformCommandAttestationResultLabel,
  platformCommandAttestationStateLabel,
  type PlatformCommandAttestationResult,
  type PlatformCommandAttestationState,
  type PlatformCommandComplianceAttestationItem,
  type PlatformCommandComplianceAttestationSummary,
} from "@/lib/platformCommandComplianceAttestation";
import {
  platformCommandAuditResultLabel,
  platformCommandAuditStateLabel,
  type PlatformCommandAuditResult,
  type PlatformCommandAuditState,
} from "@/lib/platformCommandAuditTrail";
import {
  platformCommandEvidenceStateLabel,
  type PlatformCommandEvidenceState,
} from "@/lib/platformCommandEvidenceLedger";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandComplianceAttestationSectionProps = {
  summary: PlatformCommandComplianceAttestationSummary;
  items: PlatformCommandComplianceAttestationItem[];
  onExportCsv: () => void;
};

function attestationBadgeClass(state: PlatformCommandAttestationState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "drafting") return "bg-amber-500/15 text-amber-200";
  if (state === "ready") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function resultBadgeClass(result: PlatformCommandAttestationResult) {
  if (result === "not_ready") return "bg-rose-500/15 text-rose-200";
  if (result === "conditional") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function auditBadgeClass(state: PlatformCommandAuditState) {
  if (state === "exception") return "bg-rose-500/15 text-rose-200";
  if (state === "open") return "bg-amber-500/15 text-amber-200";
  if (state === "scheduled") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function auditResultBadgeClass(result: PlatformCommandAuditResult) {
  if (result === "fail") return "bg-rose-500/15 text-rose-200";
  if (result === "review") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function evidenceBadgeClass(state: PlatformCommandEvidenceState) {
  if (state === "missing") return "bg-rose-500/15 text-rose-200";
  if (state === "collecting") return "bg-amber-500/15 text-amber-200";
  if (state === "ready") return "bg-emerald-500/15 text-emerald-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandComplianceAttestationItem["status"]) {
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

export function PlatformCommandComplianceAttestationSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandComplianceAttestationSectionProps) {
  const metrics = [
    ["Attestation", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Drafting", `${summary.draftingCount}`],
    ["Ready", `${summary.readyCount}`],
    ["Attested", `${summary.attestedCount}`],
    ["Not ready", `${summary.notReadyCount}`],
    ["Conditional", `${summary.conditionalCount}`],
    ["Clean", `${summary.cleanCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["交付窗", summary.nextDeliveryWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Compliance Attestation 合規簽核包</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把稽核軌跡整理成簽核聲明、例外說明、交付窗口、報告用途與保存包
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
            Attestation CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.attestationId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.attestationId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.attestationOwner} / {item.deliveryWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${attestationBadgeClass(item.attestationState)}`}>
                {platformCommandAttestationStateLabel(item.attestationState)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Result</p>
                <p className="font-bold text-slate-100">{platformCommandAttestationResultLabel(item.attestationResult)}</p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.attestationStatement}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2360px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Attestation ID</th>
              <th className="py-2 px-3 font-medium">Audit ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Attestation Owner</th>
              <th className="py-2 px-3 font-medium">Audit Owner</th>
              <th className="py-2 px-3 font-medium">Attestation</th>
              <th className="py-2 px-3 font-medium">Result</th>
              <th className="py-2 px-3 font-medium">Audit</th>
              <th className="py-2 px-3 font-medium">Audit Result</th>
              <th className="py-2 px-3 font-medium">Evidence</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Scope</th>
              <th className="py-2 px-3 font-medium">Statement</th>
              <th className="py-2 px-3 font-medium">Exception</th>
              <th className="py-2 px-3 font-medium">Signoff</th>
              <th className="py-2 px-3 font-medium">Package</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Use Case</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.attestationId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.attestationId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.auditId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.attestationOwner}</td>
                <td className="py-2 px-3 text-slate-400">{item.auditOwner}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${attestationBadgeClass(item.attestationState)}`}>
                    {platformCommandAttestationStateLabel(item.attestationState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${resultBadgeClass(item.attestationResult)}`}>
                    {platformCommandAttestationResultLabel(item.attestationResult)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditBadgeClass(item.auditState)}`}>
                    {platformCommandAuditStateLabel(item.auditState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${auditResultBadgeClass(item.auditResult)}`}>
                    {platformCommandAuditResultLabel(item.auditResult)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${evidenceBadgeClass(item.evidenceState)}`}>
                    {platformCommandEvidenceStateLabel(item.evidenceState)}
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
                <td className="py-2 px-3 text-slate-300">{item.attestationScope}</td>
                <td className="py-2 px-3 text-slate-300">{item.attestationStatement}</td>
                <td className="py-2 px-3 text-amber-200">{item.exceptionNote}</td>
                <td className="py-2 px-3 text-cyan-200">{item.requiredSignoff}</td>
                <td className="py-2 px-3 font-mono text-cyan-200">{item.attestationPackage}</td>
                <td className="py-2 px-3 text-slate-300">{item.deliveryWindow}</td>
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
