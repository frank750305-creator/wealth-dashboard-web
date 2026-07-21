type MonitoringRuleStatus = "strong" | "watch" | "risk" | "neutral";

export type BigQueryPortfolioMonitoringRule = {
  id: string;
  category: string;
  trigger: string;
  currentValue: string;
  threshold: string;
  nextAction: string;
  status: MonitoringRuleStatus;
};

type BigQueryPortfolioMonitoringCenterProps = {
  rules: BigQueryPortfolioMonitoringRule[];
  onExportCsv: () => void;
};

function monitoringBadgeClass(status: MonitoringRuleStatus) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function monitoringStatusLabel(status: MonitoringRuleStatus) {
  if (status === "strong") return "穩健";
  if (status === "watch") return "觀察";
  if (status === "risk") return "風險";
  return "中性";
}

export function BigQueryPortfolioMonitoringCenter({
  rules,
  onExportCsv,
}: BigQueryPortfolioMonitoringCenterProps) {
  if (!rules.length) return null;

  const riskCount = rules.filter((rule) => rule.status === "risk").length;
  const watchCount = rules.filter((rule) => rule.status === "watch").length;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-200">監控中心</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Risk {riskCount} · Watch {watchCount} · Total {rules.length}
          </p>
        </div>
        <button
          onClick={onExportCsv}
          className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200"
        >
          監控 CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 px-3 font-medium">Trigger</th>
              <th className="py-2 px-3 font-medium text-right">Current</th>
              <th className="py-2 px-3 font-medium">Threshold</th>
              <th className="py-2 px-3 font-medium">Next Action</th>
              <th className="py-2 pl-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-slate-900">
                <td className="py-2 pr-3 text-slate-300">{rule.category}</td>
                <td className="py-2 px-3 text-slate-200">{rule.trigger}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{rule.currentValue}</td>
                <td className="py-2 px-3 text-slate-500">{rule.threshold}</td>
                <td className="py-2 px-3 text-slate-400">{rule.nextAction}</td>
                <td className="py-2 pl-3 text-right">
                  <span
                    className={`inline-flex min-w-12 justify-center rounded px-2 py-1 text-[11px] font-bold ${monitoringBadgeClass(rule.status)}`}
                  >
                    {monitoringStatusLabel(rule.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
