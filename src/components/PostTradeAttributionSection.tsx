import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type PostTradeAttributionSectionProps = {
  postTradeDecision: ExecutionReviewStatus;
  postTradeReviewDays: number;
  onPostTradeReviewDaysChange: (value: number) => void;
  postTradeBenchmarkMovePercent: number;
  onPostTradeBenchmarkMovePercentChange: (value: number) => void;
  onExportPostTradeAttributionCsv: () => void;
  postTradeAttributionRows: ExecutionReviewItem[];
  postTradeBlockCount: number;
  postTradeWatchCount: number;
  postTradeResidualMarketImpact: number;
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

export function PostTradeAttributionSection({
  postTradeDecision,
  postTradeReviewDays,
  onPostTradeReviewDaysChange,
  postTradeBenchmarkMovePercent,
  onPostTradeBenchmarkMovePercentChange,
  onExportPostTradeAttributionCsv,
  postTradeAttributionRows,
  postTradeBlockCount,
  postTradeWatchCount,
  postTradeResidualMarketImpact,
}: PostTradeAttributionSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">交易後績效歸因</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(postTradeDecision)}`}>
              {executionReviewLabel(postTradeDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將成交率、殘單、成本、現金偏差與未成交市場曝險整理成復盤指標
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[120px_140px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">復盤天數</span>
            <input
              type="number"
              min={1}
              max={60}
              step={1}
              value={postTradeReviewDays}
              onChange={(event) => onPostTradeReviewDaysChange(Math.min(60, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">市場變動 %</span>
            <input
              type="number"
              min={-30}
              max={30}
              step={0.5}
              value={postTradeBenchmarkMovePercent}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                onPostTradeBenchmarkMovePercentChange(Math.min(30, Math.max(-30, Number.isFinite(nextValue) ? nextValue : 0)));
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportPostTradeAttributionCsv}
            disabled={!postTradeAttributionRows.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            歸因 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["復盤狀態", executionReviewLabel(postTradeDecision)],
          ["阻擋 / 觀察", `${postTradeBlockCount} / ${postTradeWatchCount}`],
          ["殘單曝險", formatCurrency(postTradeResidualMarketImpact)],
          ["復盤週期", `T+${postTradeReviewDays}`],
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
        <table className="w-full min-w-[980px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">項目</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium text-right">目前值</th>
              <th className="py-2 px-3 font-medium">門檻</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {postTradeAttributionRows.map((item) => (
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
