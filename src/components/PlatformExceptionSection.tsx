import {
  executionHandoffPriorityClass,
  executionHandoffPriorityLabel,
  type PlatformExceptionItem,
} from "@/lib/executionOperationsWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type PlatformExceptionSectionProps = {
  platformExceptionDecision: ExecutionReviewStatus;
  exceptionDueDays: number;
  onExceptionDueDaysChange: (value: number) => void;
  hasBigQueryCredentials: boolean;
  syncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  syncMessage: string;
  warehouseExceptionCount: number;
  onSyncPlatformExceptionsToBigQuery: () => void;
  onLoadPlatformExceptionsFromBigQuery: () => void;
  onExportPlatformExceptionCsv: () => void;
  platformExceptionItems: PlatformExceptionItem[];
  platformExceptionHighPriorityCount: number;
  platformExceptionBlockCount: number;
  platformExceptionWatchCount: number;
};

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

export function PlatformExceptionSection({
  platformExceptionDecision,
  exceptionDueDays,
  onExceptionDueDaysChange,
  hasBigQueryCredentials,
  syncStatus,
  syncMessage,
  warehouseExceptionCount,
  onSyncPlatformExceptionsToBigQuery,
  onLoadPlatformExceptionsFromBigQuery,
  onExportPlatformExceptionCsv,
  platformExceptionItems,
  platformExceptionHighPriorityCount,
  platformExceptionBlockCount,
  platformExceptionWatchCount,
}: PlatformExceptionSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">例外事項總控台</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(platformExceptionDecision)}`}>
              {executionReviewLabel(platformExceptionDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將政策、簽核、交接、成交與復盤的觀察/暫停項目集中成 Action Queue
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[120px_repeat(3,auto)] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">處理期限</span>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={exceptionDueDays}
              onChange={(event) => onExceptionDueDaysChange(Math.min(30, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onSyncPlatformExceptionsToBigQuery}
            disabled={!hasBigQueryCredentials || !platformExceptionItems.length || syncStatus === "syncing" || syncStatus === "loading"}
            className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "syncing" ? "同步中" : "同步 BigQuery"}
          </button>
          <button
            onClick={onLoadPlatformExceptionsFromBigQuery}
            disabled={!hasBigQueryCredentials || syncStatus === "syncing" || syncStatus === "loading"}
            className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "loading" ? "載入中" : "載入 BigQuery"}
          </button>
          <button
            onClick={onExportPlatformExceptionCsv}
            disabled={!platformExceptionItems.length}
            className="sm:self-end px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            例外 CSV
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
          ["待處理", `${platformExceptionItems.length} 項`],
          ["高優先", `${platformExceptionHighPriorityCount} 項`],
          ["暫停 / 觀察", `${platformExceptionBlockCount} / ${platformExceptionWatchCount}`],
          ["期限", `T+${exceptionDueDays}`],
          ["倉儲例外", `${warehouseExceptionCount} 項`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {platformExceptionItems.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">來源</th>
                <th className="py-2 px-3 font-medium">負責人</th>
                <th className="py-2 px-3 font-medium">項目</th>
                <th className="py-2 px-3 font-medium text-right">優先級</th>
                <th className="py-2 px-3 font-medium text-right">期限</th>
                <th className="py-2 px-3 font-medium text-right">狀態</th>
                <th className="py-2 px-3 font-medium">依據</th>
                <th className="py-2 px-3 font-medium">下一步</th>
              </tr>
            </thead>
            <tbody>
              {platformExceptionItems.map((item) => (
                <tr key={`${item.source}-${item.item}-${item.owner}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                  <td className="py-2 px-3 font-bold text-slate-100">{item.source}</td>
                  <td className="py-2 px-3 text-slate-300">{item.owner}</td>
                  <td className="py-2 px-3 text-slate-200">{item.item}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                      {executionHandoffPriorityLabel(item.priority)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{item.due}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                      {executionReviewLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-400">{item.evidence}</td>
                  <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-950/10 p-3 text-xs text-emerald-200">
          目前沒有待處理例外事項。
        </div>
      )}
    </div>
  );
}
