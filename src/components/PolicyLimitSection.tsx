import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type PolicyLimitSectionProps = {
  policyDecision: ExecutionReviewStatus;
  policyMaxSingleWeightPercent: number;
  onPolicyMaxSingleWeightPercentChange: (value: number) => void;
  policyMaxVolatilityPercent: number;
  onPolicyMaxVolatilityPercentChange: (value: number) => void;
  policyMaxDrawdownPercent: number;
  onPolicyMaxDrawdownPercentChange: (value: number) => void;
  policyMinimumScore: number;
  onPolicyMinimumScoreChange: (value: number) => void;
  onExportPolicyLimitCsv: () => void;
  canExport: boolean;
  policyBlockCount: number;
  policyWatchCount: number;
  policyLimitItems: ExecutionReviewItem[];
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

export function PolicyLimitSection({
  policyDecision,
  policyMaxSingleWeightPercent,
  onPolicyMaxSingleWeightPercentChange,
  policyMaxVolatilityPercent,
  onPolicyMaxVolatilityPercentChange,
  policyMaxDrawdownPercent,
  onPolicyMaxDrawdownPercentChange,
  policyMinimumScore,
  onPolicyMinimumScoreChange,
  onExportPolicyLimitCsv,
  canExport,
  policyBlockCount,
  policyWatchCount,
  policyLimitItems,
}: PolicyLimitSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">投資政策限制檢查</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(policyDecision)}`}>
              {executionReviewLabel(policyDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            用政策上限檢查模型配置、交易幅度與資料新鮮度，作為送簽前的硬性控管
          </p>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-[120px_120px_120px_110px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">單檔上限 %</span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={policyMaxSingleWeightPercent}
              onChange={(event) => onPolicyMaxSingleWeightPercentChange(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">波動上限 %</span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={policyMaxVolatilityPercent}
              onChange={(event) => onPolicyMaxVolatilityPercentChange(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">回撤限制 %</span>
            <input
              type="number"
              min={-90}
              max={0}
              step={1}
              value={policyMaxDrawdownPercent}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                onPolicyMaxDrawdownPercentChange(Math.min(0, Math.max(-90, Number.isFinite(nextValue) ? nextValue : -25)));
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">最低分數</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={policyMinimumScore}
              onChange={(event) => onPolicyMinimumScoreChange(Math.min(100, Math.max(0, Math.floor(Number(event.target.value) || 0))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportPolicyLimitCsv}
            disabled={!canExport}
            className="col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            政策 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["政策狀態", executionReviewLabel(policyDecision)],
          ["暫停項目", `${policyBlockCount} 項`],
          ["觀察項目", `${policyWatchCount} 項`],
          ["政策下限", `${policyMinimumScore} 分`],
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
              <th className="py-2 px-3 font-medium">政策限制</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {policyLimitItems.map((item) => (
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
