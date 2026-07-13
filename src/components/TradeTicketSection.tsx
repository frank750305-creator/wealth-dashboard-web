import {
  rebalanceDirectionClass,
  rebalanceDirectionLabel,
} from "@/lib/rebalanceWorkflow";
import type { TradeTicketRow } from "@/lib/tradeExecutionWorkflow";

type TradeTicketSectionProps = {
  minimumTradeAmount: number;
  onMinimumTradeAmountChange: (value: number) => void;
  onExportTradeTicketCsv: () => void;
  tradeTickets: TradeTicketRow[];
  skippedTradeCount: number;
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

export function TradeTicketSection({
  minimumTradeAmount,
  onMinimumTradeAmountChange,
  onExportTradeTicketCsv,
  tradeTickets,
  skippedTradeCount,
}: TradeTicketSectionProps) {
  const buyAmount = tradeTickets
    .filter((row) => row.direction === "buy")
    .reduce((sum, row) => sum + row.ticketAmount, 0);
  const netCash = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <h5 className="text-xs font-bold text-slate-100">交易執行清單</h5>
          <p className="text-[11px] text-slate-500 mt-0.5">
            再用最小交易金額過濾，形成可交給人工覆核的交易清單
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[170px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">最小交易金額</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={minimumTradeAmount}
              onChange={(event) => onMinimumTradeAmountChange(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportTradeTicketCsv}
            disabled={!tradeTickets.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            交易 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["可執行", `${tradeTickets.length} 檔`],
          ["低於門檻", `${Math.max(0, skippedTradeCount)} 檔`],
          ["買入合計", formatCurrency(buyAmount)],
          ["現金淨額", formatCurrency(netCash)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {tradeTickets.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[860px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">Symbol</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
                <th className="py-2 px-3 font-medium text-right">Amount</th>
                <th className="py-2 px-3 font-medium text-right">Cash</th>
                <th className="py-2 px-3 font-medium text-right">Drift</th>
                <th className="py-2 px-3 font-medium text-right">Score</th>
                <th className="py-2 px-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {tradeTickets.slice(0, 12).map((row) => (
                <tr key={row.symbol} className="border-t border-slate-800/80">
                  <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                      {rebalanceDirectionLabel(row.direction)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-100">
                    {formatCurrency(row.ticketAmount)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono ${
                      row.cashImpact < 0 ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {formatCurrency(row.cashImpact)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {formatPercent(row.tradeWeight)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {row.score ?? "--"}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{row.ticketNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
          目前沒有超過最小交易金額的買賣項目。
        </div>
      )}
    </>
  );
}
