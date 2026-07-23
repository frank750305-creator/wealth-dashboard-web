import {
  platformCommandAdoptionSignalLabel,
  platformCommandCustomerSuccessStateLabel,
  type PlatformCommandAdoptionSignal,
  type PlatformCommandCustomerSuccessActivationItem,
  type PlatformCommandCustomerSuccessActivationSummary,
  type PlatformCommandCustomerSuccessState,
} from "@/lib/platformCommandCustomerSuccessActivation";
import {
  platformCommandGtmLaunchStateLabel,
  platformCommandLaunchSignalLabel,
  type PlatformCommandGtmLaunchState,
  type PlatformCommandLaunchSignal,
} from "@/lib/platformCommandGtmLaunch";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandCustomerSuccessActivationSectionProps = {
  summary: PlatformCommandCustomerSuccessActivationSummary;
  items: PlatformCommandCustomerSuccessActivationItem[];
  onExportCsv: () => void;
};

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

function statusBadgeClass(status: PlatformCommandCustomerSuccessActivationItem["status"]) {
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

export function PlatformCommandCustomerSuccessActivationSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandCustomerSuccessActivationSectionProps) {
  const metrics = [
    ["Success", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Onboarding", `${summary.onboardingCount}`],
    ["Adoption", `${summary.adoptionCount}`],
    ["Scaled", `${summary.scaledCount}`],
    ["At risk", `${summary.atRiskCount}`],
    ["Guided", `${summary.guidedCount}`],
    ["Healthy", `${summary.healthyCount}`],
    ["Score", `${summary.averageReadinessScore}`],
    ["成功窗", summary.nextSuccessWindow],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Customer Success Activation 客戶成功啟動</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把上市推進轉成 onboarding、採用訊號、訓練素材、健康指標、續約風險與客戶回饋閉環
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
            Success CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.successId}-card`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cyan-200">{item.successId}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.successOwner} / {item.successWindow}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${adoptionBadgeClass(item.adoptionSignal)}`}>
                {platformCommandAdoptionSignalLabel(item.adoptionSignal)}
              </span>
            </div>
            <p className="mt-3 text-[12px] font-bold text-slate-100">{item.onboardingPlan}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">State</p>
                <p className="font-bold text-slate-100">
                  {platformCommandCustomerSuccessStateLabel(item.customerSuccessState)}
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
            <p className="mt-3 text-[11px] text-slate-300">{item.activationMetric}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[2340px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Success ID</th>
              <th className="py-2 px-3 font-medium">Launch ID</th>
              <th className="py-2 px-3 font-medium">Revenue ID</th>
              <th className="py-2 px-3 font-medium">Decision ID</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">Success Owner</th>
              <th className="py-2 px-3 font-medium">Success</th>
              <th className="py-2 px-3 font-medium">Adoption</th>
              <th className="py-2 px-3 font-medium">Launch</th>
              <th className="py-2 px-3 font-medium">Launch Signal</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Risk</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium">Route</th>
              <th className="py-2 px-3 font-medium">Buyer</th>
              <th className="py-2 px-3 font-medium">Onboarding</th>
              <th className="py-2 px-3 font-medium">Training</th>
              <th className="py-2 px-3 font-medium">Activation</th>
              <th className="py-2 px-3 font-medium">Health</th>
              <th className="py-2 px-3 font-medium">Usage</th>
              <th className="py-2 px-3 font-medium">Renewal Risk</th>
              <th className="py-2 px-3 font-medium">Support</th>
              <th className="py-2 px-3 font-medium">Feedback</th>
              <th className="py-2 px-3 font-medium">Window</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.successId}-row`} className="border-t border-slate-800/80">
                <td className="py-2 px-3 font-mono font-bold text-cyan-200">{item.successId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.launchId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.revenueId}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{item.decisionId}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-cyan-200">{item.successOwner}</td>
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
                <td className="py-2 px-3 text-slate-300">{item.onboardingPlan}</td>
                <td className="py-2 px-3 text-slate-500">{item.trainingAsset}</td>
                <td className="py-2 px-3 text-cyan-200">{item.activationMetric}</td>
                <td className="py-2 px-3 text-slate-400">{item.healthMetric}</td>
                <td className="py-2 px-3 text-slate-500">{item.usageCheckpoint}</td>
                <td className="py-2 px-3 text-amber-200">{item.renewalRisk}</td>
                <td className="py-2 px-3 text-slate-400">{item.supportModel}</td>
                <td className="py-2 px-3 text-slate-500">{item.customerFeedbackLoop}</td>
                <td className="py-2 px-3 text-slate-300">{item.successWindow}</td>
                <td className="py-2 px-3 text-amber-200">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
