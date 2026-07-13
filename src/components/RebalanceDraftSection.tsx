import {
  rebalanceDirectionClass,
  rebalanceDirectionLabel,
  type RebalanceDraftRow,
} from "@/lib/rebalanceWorkflow";

type RebalanceDraftSectionProps = {
  rebalanceThreshold: number;
  onRebalanceThresholdChange: (value: number) => void;
  onExportRebalanceDraftCsv: () => void;
  currentHoldingsText: string;
  onCurrentHoldingsTextChange: (value: string) => void;
  rebalanceRows: RebalanceDraftRow[];
  activeRebalanceRows: RebalanceDraftRow[];
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

export function RebalanceDraftSection({
  rebalanceThreshold,
  onRebalanceThresholdChange,
  onExportRebalanceDraftCsv,
  currentHoldingsText,
  onCurrentHoldingsTextChange,
  rebalanceRows,
  activeRebalanceRows,
}: RebalanceDraftSectionProps) {
  const buyAmount = activeRebalanceRows
    .filter((row) => row.direction === "buy")
    .reduce((sum, row) => sum + row.tradeAmount, 0);
  const sellAmount = activeRebalanceRows
    .filter((row) => row.direction === "sell")
    .reduce((sum, row) => sum + Math.abs(row.tradeAmount), 0);

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-100">再平衡交易草稿</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            輸入現有持倉金額後，依模型目標權重估算買賣差額
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[150px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">偏離門檻</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={Number((rebalanceThreshold * 100).toFixed(2))}
              onChange={(event) => onRebalanceThresholdChange(Math.min(0.2, Math.max(0, (Number(event.target.value) || 0) / 100)))}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportRebalanceDraftCsv}
            disabled={!rebalanceRows.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            再平衡 CSV
          </button>
        </div>
      </div>

      <textarea
        value={currentHoldingsText}
        onChange={(event) => onCurrentHoldingsTextChange(event.target.value)}
        rows={4}
        placeholder={"0050.TW 300000\nSPY 250000\nQQQ 200000"}
        className="w-full resize-y rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>每行一檔：商品代號 金額；也可用逗號分隔</span>
        <span className="font-mono">
          {rebalanceRows.length} rows · {formatPercent(rebalanceThreshold)}
        </span>
      </div>

      {rebalanceRows.length ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              ["需交易", `${activeRebalanceRows.length} 檔`],
              ["買入金額", formatCurrency(buyAmount)],
              ["賣出金額", formatCurrency(sellAmount)],
              [
                "最大偏離",
                rebalanceRows.length
                  ? `${rebalanceRows[0].symbol} · ${formatPercent(rebalanceRows[0].tradeWeight)}`
                  : "--",
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                <p className="text-[11px] text-slate-600 truncate">{label}</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70">
            <table className="w-full min-w-[920px] text-xs">
              <thead>
                <tr className="text-left text-[11px] text-slate-600">
                  <th className="py-2 px-3 font-medium">Symbol</th>
                  <th className="py-2 px-3 font-medium text-right">Current</th>
                  <th className="py-2 px-3 font-medium text-right">Target</th>
                  <th className="py-2 px-3 font-medium text-right">Trade</th>
                  <th className="py-2 px-3 font-medium text-right">Current W</th>
                  <th className="py-2 px-3 font-medium text-right">Target W</th>
                  <th className="py-2 px-3 font-medium text-right">Drift</th>
                  <th className="py-2 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rebalanceRows.slice(0, 12).map((row) => (
                  <tr key={row.symbol} className="border-t border-slate-800/80">
                    <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(row.currentAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(row.targetAmount)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono ${
                        row.tradeAmount < 0 ? "text-rose-300" : row.tradeAmount > 0 ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      {formatCurrency(row.tradeAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {formatPercent(row.currentWeight)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {formatPercent(row.targetWeight)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {formatPercent(row.tradeWeight)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                        {rebalanceDirectionLabel(row.direction)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
