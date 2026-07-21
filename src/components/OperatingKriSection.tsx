import { formatBps } from "@/lib/executionOperationsWorkflow";
import type { OperatingKriItem } from "@/lib/operatingControlWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type OperatingKriSectionProps = {
  operatingKriDecision: ExecutionReviewStatus;
  hasBigQueryCredentials: boolean;
  syncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  syncMessage: string;
  warehouseKriCount: number;
  onSyncOperatingKriToBigQuery: () => void;
  onLoadOperatingKriFromBigQuery: () => void;
  onExportOperatingKriCsv: () => void;
  operatingKriItems: OperatingKriItem[];
  operatingKriBlockCount: number;
  operatingKriWatchCount: number;
  totalExecutionCost: number;
  totalFilledNotional: number;
  totalUnfilledNotional: number;
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

export function OperatingKriSection({
  operatingKriDecision,
  hasBigQueryCredentials,
  syncStatus,
  syncMessage,
  warehouseKriCount,
  onSyncOperatingKriToBigQuery,
  onLoadOperatingKriFromBigQuery,
  onExportOperatingKriCsv,
  operatingKriItems,
  operatingKriBlockCount,
  operatingKriWatchCount,
  totalExecutionCost,
  totalFilledNotional,
  totalUnfilledNotional,
}: OperatingKriSectionProps) {
  const executionCostBps = totalFilledNotional > 0 ? (totalExecutionCost / totalFilledNotional) * 10000 : null;

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">營運 KRI 指標板</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(operatingKriDecision)}`}>
              {executionReviewLabel(operatingKriDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            把資料品質、壓力損失、殘單、成本、例外、SLA 與投後復盤整理成營運風險指標
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            onClick={onSyncOperatingKriToBigQuery}
            disabled={!hasBigQueryCredentials || !operatingKriItems.length || syncStatus === "syncing" || syncStatus === "loading"}
            className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "syncing" ? "同步中" : "同步 BigQuery"}
          </button>
          <button
            onClick={onLoadOperatingKriFromBigQuery}
            disabled={!hasBigQueryCredentials || syncStatus === "syncing" || syncStatus === "loading"}
            className="px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "loading" ? "載入中" : "載入 BigQuery"}
          </button>
          <button
            onClick={onExportOperatingKriCsv}
            disabled={!operatingKriItems.length}
            className="px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            KRI CSV
          </button>
        </div>
      </div>
      {syncMessage ? (
        <p className={`text-[11px] ${syncStatus === "error" ? "text-rose-300" : "text-slate-500"}`}>
          {syncMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {[
          ["KRI 狀態", executionReviewLabel(operatingKriDecision)],
          ["暫停 / 觀察", `${operatingKriBlockCount} / ${operatingKriWatchCount}`],
          ["交易成本", `${formatCurrency(totalExecutionCost)} / ${formatBps(executionCostBps)}`],
          ["未成交", formatCurrency(totalUnfilledNotional)],
          ["倉儲 KRI", `${warehouseKriCount} 項`],
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
        <table className="w-full min-w-[1050px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">指標</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium text-right">目前值</th>
              <th className="py-2 px-3 font-medium">門檻</th>
              <th className="py-2 px-3 font-medium">負責人</th>
              <th className="py-2 px-3 font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {operatingKriItems.map((item) => (
              <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                    {executionReviewLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                <td className="py-2 px-3 text-slate-400">{item.limit}</td>
                <td className="py-2 px-3 text-slate-300">{item.owner}</td>
                <td className="py-2 px-3 text-slate-500">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
