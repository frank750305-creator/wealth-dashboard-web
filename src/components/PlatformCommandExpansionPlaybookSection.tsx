import {
  platformCommandExpansionSignalLabel,
  platformCommandExpansionStateLabel,
  type PlatformCommandExpansionPlaybookItem,
  type PlatformCommandExpansionPlaybookSummary,
  type PlatformCommandExpansionSignal,
  type PlatformCommandExpansionState,
} from "@/lib/platformCommandExpansionPlaybook";
import {
  platformCommandAdoptionSignalLabel,
  platformCommandCustomerSuccessStateLabel,
  type PlatformCommandAdoptionSignal,
  type PlatformCommandCustomerSuccessState,
} from "@/lib/platformCommandCustomerSuccessActivation";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandExpansionPlaybookSectionProps = {
  summary: PlatformCommandExpansionPlaybookSummary;
  items: PlatformCommandExpansionPlaybookItem[];
  onExportCsv: () => void;
};

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

function successBadgeClass(state: PlatformCommandCustomerSuccessState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "onboarding") return "bg-amber-500/15 text-amber-200";
  if (state === "adoption") return "bg-sky-500/15 text-sky-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function adoptionBadgeClass(signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "bg-rose-500/15 text-rose-200";
  if (signal === "guided") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandExpansionPlaybookItem["status"]) {
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

export function PlatformCommandExpansionPlaybookSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandExpansionPlaybookSectionProps) {
  const metrics = [
    ["Expansion", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Renewal", `${summary.renewalSaveCount}`],
    ["Ready", `${summary.expansionReadyCount}`],
    ["Scale", `${summary.scaleMotionCount}`],
    ["Protect", `${summary.protectCount}`],
    ["Expand", `${summary.expandCount}`],
    ["Scale signal", `${summary.scaleCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["擴張窗", summary.nextExpansionWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Expansion Playbook 擴張續約劇本</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把客戶成功訊號轉成續約健康、擴張路徑、利益關係人、價值證明、報價槓桿與下一步
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
            Expansion CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.expansionId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.expansionId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.expansionOwner} / {item.expansionWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(item.expansionSignal)}`}>
                {platformCommandExpansionSignalLabel(item.expansionSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.renewalPosture}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">{platformCommandExpansionStateLabel(item.expansionState)}</p>
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
            <p className="mt-3 text-[11px] text-slate-300">{item.expansionPath}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2380px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Expansion ID</th>
              <th className="py-2 px-3 font-medium">Success ID</th>
              <th className="py-2 px-3 font-medium">Launch ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Expansion Owner</th>
              <th className="py-2 px-3 font-medium">Expansion</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 px-3 font-medium">Customer Success</th>
              <th className="py-2 px-3 font-medium">Adoption</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Renewal</th>
              <th className="py-2 px-3 font-medium">Path</th>
              <th className="py-2 px-3 font-medium">Stakeholders</th>
              <th className="py-2 px-3 font-medium">Value Proof</th>
              <th className="py-2 px-3 font-medium">Pricing Lever</th>
              <th className="py-2 px-3 font-medium">Success Motion</th>
              <th className="py-2 px-3 font-medium">Commercial Ask</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Risk Note</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.expansionId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.expansionId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.successId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.launchId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.expansionOwner}</td>
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
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${successBadgeClass(item.customerSuccessState)}`}>
                    {platformCommandCustomerSuccessStateLabel(item.customerSuccessState)}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${adoptionBadgeClass(item.adoptionSignal)}`}>
                    {platformCommandAdoptionSignalLabel(item.adoptionSignal)}
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
                <td className="py-2 px-3 text-slate-300">{item.renewalPosture}</td>
                <td className="py-2 px-3 text-slate-300">{item.expansionPath}</td>
                <td className="py-2 px-3 text-slate-500">{item.stakeholderMap}</td>
                <td className="py-2 px-3 text-cyan-200">{item.valueProof}</td>
                <td className="py-2 px-3 text-slate-400">{item.pricingLever}</td>
                <td className="py-2 px-3 text-slate-500">{item.successMotion}</td>
                <td className="py-2 px-3 text-amber-200">{item.commercialAsk}</td>
                <td className="py-2 px-3 text-slate-300">{item.expansionWindow}</td>
                <td className="py-2 px-3 text-amber-200">{item.riskNote}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
