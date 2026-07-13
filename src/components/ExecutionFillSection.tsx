import { rebalanceDirectionLabel } from "@/lib/rebalanceWorkflow";
import type { ExecutionFillRow, ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type ExecutionFillSectionProps = {
  executionFillDecision: ExecutionReviewStatus;
  fillCompletionPercent: number;
  onFillCompletionPercentChange: (value: number) => void;
  fillSlippageBps: number;
  onFillSlippageBpsChange: (value: number) => void;
  fillCommissionBps: number;
  onFillCommissionBpsChange: (value: number) => void;
  onExportExecutionFillCsv: () => void;
  executionFillRows: ExecutionFillRow[];
  totalFilledNotional: number;
  totalUnfilledNotional: number;
  totalExecutionCost: number;
  totalCashImpactAfterCost: number;
};

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
  if (status === "watch") return "bg-amber-500/15 text-amber-200 border border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border border-rose-500/30";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-slate-900";
  if (status === "watch") return "border-amber-500/20 bg-amber-500/5";
  return "border-rose-500/20 bg-rose-500/5";
}

export function ExecutionFillSection({
  executionFillDecision,
  fillCompletionPercent,
  onFillCompletionPercentChange,
  fillSlippageBps,
  onFillSlippageBpsChange,
  fillCommissionBps,
  onFillCommissionBpsChange,
  onExportExecutionFillCsv,
  executionFillRows,
  totalFilledNotional,
  totalUnfilledNotional,
  totalExecutionCost,
  totalCashImpactAfterCost,
}: ExecutionFillSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">成交回報與滑價分析</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(executionFillDecision)}`}>
              {executionReviewLabel(executionFillDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            以交易清單估算成交金額、未成交金額、滑價成本、手續費與成交後現金影響
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[110px_110px_110px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">成交率 %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={fillCompletionPercent}
              onChange={(event) => onFillCompletionPercentChange(Math.min(100, Math.max(0, Math.floor(Number(event.target.value) || 0))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">滑價 bps</span>
            <input
              type="number"
              min={0}
              max={200}
              step={0.5}
              value={fillSlippageBps}
              onChange={(event) => onFillSlippageBpsChange(Math.min(200, Math.max(0, Number(event.target.value) || 0)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">手續費 bps</span>
            <input
              type="number"
              min={0}
              max={200}
              step={0.5}
              value={fillCommissionBps}
              onChange={(event) => onFillCommissionBpsChange(Math.min(200, Math.max(0, Number(event.target.value) || 0)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportExecutionFillCsv}
            disabled={!executionFillRows.length}
            className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            成交 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["成交金額", formatCurrency(totalFilledNotional)],
          ["未成交", formatCurrency(totalUnfilledNotional)],
          ["總成本", formatCurrency(totalExecutionCost)],
          ["成交後現金", formatCurrency(totalCashImpactAfterCost)],
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
        <table className="w-full min-w-[1080px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">商品</th>
              <th className="py-2 px-3 font-medium">動作</th>
              <th className="py-2 px-3 font-medium text-right">目標金額</th>
              <th className="py-2 px-3 font-medium text-right">成交金額</th>
              <th className="py-2 px-3 font-medium text-right">未成交</th>
              <th className="py-2 px-3 font-medium text-right">成本</th>
              <th className="py-2 px-3 font-medium text-right">成交後現金</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {executionFillRows.map((row) => (
              <tr key={`${row.symbol}-${row.direction}-fill`} className={`border-t ${executionReviewRowClass(row.fillStatus)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{row.symbol}</td>
                <td className="py-2 px-3 text-slate-300">{rebalanceDirectionLabel(row.direction)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(row.ticketAmount)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-100">{formatCurrency(row.filledNotional)}</td>
                <td className="py-2 px-3 text-right font-mono text-amber-200">{formatCurrency(row.unfilledNotional)}</td>
                <td className="py-2 px-3 text-right font-mono text-rose-200">{formatCurrency(row.totalCost)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-200">{formatCurrency(row.cashImpactAfterCost)}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(row.fillStatus)}`}>
                    {executionReviewLabel(row.fillStatus)}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-500">{row.fillNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
