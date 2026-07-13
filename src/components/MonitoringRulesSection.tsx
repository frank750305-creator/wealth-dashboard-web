import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type MonitoringRulesSectionProps = {
  monitoringDecision: ExecutionReviewStatus;
  monitoringHorizonDays: number;
  onMonitoringHorizonDaysChange: (value: number) => void;
  monitoringDrawdownAlertPercent: number;
  onMonitoringDrawdownAlertPercentChange: (value: number) => void;
  onExportMonitoringRulesCsv: () => void;
  canExport: boolean;
  monitoringAlertCount: number;
  monitoringWatchCount: number;
  monitoringRules: ExecutionReviewItem[];
};

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-emerald-500/10 bg-emerald-950/5";
  if (status === "watch") return "border-amber-500/10 bg-amber-950/5";
  return "border-rose-500/10 bg-rose-950/5";
}

export function MonitoringRulesSection({
  monitoringDecision,
  monitoringHorizonDays,
  onMonitoringHorizonDaysChange,
  monitoringDrawdownAlertPercent,
  onMonitoringDrawdownAlertPercentChange,
  onExportMonitoringRulesCsv,
  canExport,
  monitoringAlertCount,
  monitoringWatchCount,
  monitoringRules,
}: MonitoringRulesSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">交易後監控規則</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(monitoringDecision)}`}>
              {executionReviewLabel(monitoringDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            把本次交易轉成後續追蹤條件，避免執行後沒有回看機制
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[120px_140px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">監控天數</span>
            <input
              type="number"
              min={1}
              max={90}
              step={1}
              value={monitoringHorizonDays}
              onChange={(event) => onMonitoringHorizonDaysChange(Math.min(90, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">回撤警戒 %</span>
            <input
              type="number"
              min={-80}
              max={0}
              step={1}
              value={monitoringDrawdownAlertPercent}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                onMonitoringDrawdownAlertPercentChange(Math.min(0, Math.max(-80, Number.isFinite(nextValue) ? nextValue : -8)));
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportMonitoringRulesCsv}
            disabled={!canExport}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            監控 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["監控狀態", executionReviewLabel(monitoringDecision)],
          ["警戒項目", `${monitoringAlertCount} 項`],
          ["觀察項目", `${monitoringWatchCount} 項`],
          ["監控週期", `T+${monitoringHorizonDays}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">項目</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium text-right">目前值</th>
              <th className="py-2 px-3 font-medium">觸發條件</th>
              <th className="py-2 px-3 font-medium">後續動作</th>
            </tr>
          </thead>
          <tbody>
            {monitoringRules.map((item) => (
              <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                    {executionReviewLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                <td className="py-2 px-3 text-slate-500">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
