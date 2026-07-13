import {
  rebalanceDirectionClass,
  rebalanceDirectionLabel,
} from "@/lib/rebalanceWorkflow";
import type { TradeBatchRow } from "@/lib/tradeExecutionWorkflow";

type TradeBatchSectionProps = {
  maximumBatchAmount: number;
  onMaximumBatchAmountChange: (value: number) => void;
  maximumTicketsPerBatch: number;
  onMaximumTicketsPerBatchChange: (value: number) => void;
  onExportTradeBatchCsv: () => void;
  tradeBatches: TradeBatchRow[];
  tradeBatchCount: number;
  maximumTradeBatchGross: number;
  firstTradeBatchCashImpact: number | null | undefined;
  averageTradeBatchGross: number | null;
};

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

export function TradeBatchSection({
  maximumBatchAmount,
  onMaximumBatchAmountChange,
  maximumTicketsPerBatch,
  onMaximumTicketsPerBatchChange,
  onExportTradeBatchCsv,
  tradeBatches,
  tradeBatchCount,
  maximumTradeBatchGross,
  firstTradeBatchCashImpact,
  averageTradeBatchGross,
}: TradeBatchSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <h5 className="text-xs font-bold text-slate-100">分批交易計畫</h5>
          <p className="text-[11px] text-slate-500 mt-0.5">
            依單批金額與筆數限制，把交易清單拆成較容易執行與覆核的批次
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[170px_140px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">單批金額上限</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={maximumBatchAmount}
              onChange={(event) => onMaximumBatchAmountChange(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">每批筆數</span>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={maximumTicketsPerBatch}
              onChange={(event) => onMaximumTicketsPerBatchChange(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportTradeBatchCsv}
            disabled={!tradeBatches.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            批次 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["批次數", `${tradeBatchCount} 批`],
          ["最大單批", formatCurrency(maximumTradeBatchGross)],
          ["首批現金", formatCurrency(firstTradeBatchCashImpact)],
          ["平均單批", formatCurrency(averageTradeBatchGross)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {tradeBatches.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[980px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium text-right">Batch</th>
                <th className="py-2 px-3 font-medium text-right">Seq</th>
                <th className="py-2 px-3 font-medium">Symbol</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
                <th className="py-2 px-3 font-medium text-right">Amount</th>
                <th className="py-2 px-3 font-medium text-right">Batch Gross</th>
                <th className="py-2 px-3 font-medium text-right">Batch Cash</th>
                <th className="py-2 px-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {tradeBatches.slice(0, 16).map((row) => (
                <tr key={`${row.batchNumber}-${row.symbol}`} className="border-t border-slate-800/80">
                  <td className="py-2 px-3 text-right font-mono text-cyan-200">{row.batchNumber}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">{row.sequenceInBatch}</td>
                  <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                      {rebalanceDirectionLabel(row.direction)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-100">{formatCurrency(row.ticketAmount)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(row.batchGrossAmount)}</td>
                  <td
                    className={`py-2 px-3 text-right font-mono ${
                      row.batchCashImpact < 0 ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {formatCurrency(row.batchCashImpact)}
                  </td>
                  <td className="py-2 px-3 text-slate-500">{row.batchNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
          交易清單建立後，這裡會依批次限制產生執行順序。
        </div>
      )}
    </div>
  );
}
