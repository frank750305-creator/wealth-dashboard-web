import type {
  MarketAlertCommandSummary,
  MarketAlertEvent,
  MarketAlertOwnerQueue,
  MarketAlertPriority,
  MarketAlertRunbookItem,
  MarketAlertStatus,
} from "@/lib/marketAlertEvents";
import type { MarketAlertWarehouseAuditRecord } from "@/types/market";

type MarketAlertSectionProps = {
  marketAlertDecision: MarketAlertStatus;
  marketAlertCommandSummary: MarketAlertCommandSummary;
  hasBigQueryCredentials: boolean;
  syncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  syncMessage: string;
  warehouseAlertCount: number;
  ownerQueueSyncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  ownerQueueSyncMessage: string;
  warehouseOwnerQueueCount: number;
  runbookSyncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  runbookSyncMessage: string;
  warehouseRunbookCount: number;
  auditStatus: "idle" | "loading" | "loaded" | "error";
  auditMessage: string;
  auditRecords: MarketAlertWarehouseAuditRecord[];
  onSyncMarketAlertsToBigQuery: () => void;
  onLoadMarketAlertsFromBigQuery: () => void;
  onLoadMarketAlertWarehouseAudit: () => void;
  onSyncMarketAlertOwnerQueuesToBigQuery: () => void;
  onLoadMarketAlertOwnerQueuesFromBigQuery: () => void;
  onSyncMarketAlertRunbooksToBigQuery: () => void;
  onLoadMarketAlertRunbooksFromBigQuery: () => void;
  onExportMarketAlertCsv: () => void;
  onExportMarketAlertCommandSummaryCsv: () => void;
  onExportMarketAlertOwnerQueueCsv: () => void;
  onExportMarketAlertRunbookCsv: () => void;
  marketAlertEvents: MarketAlertEvent[];
  marketAlertOwnerQueues: MarketAlertOwnerQueue[];
  marketAlertRunbookItems: MarketAlertRunbookItem[];
  marketHighAlertCount: number;
  marketMediumAlertCount: number;
  platformExceptionCount: number;
};

function executionReviewLabel(status: MarketAlertStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: MarketAlertStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
  if (status === "watch") return "bg-amber-500/15 text-amber-200 border border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border border-rose-500/30";
}

function executionReviewRowClass(status: MarketAlertStatus) {
  if (status === "pass") return "border-slate-900";
  if (status === "watch") return "border-amber-500/20 bg-amber-500/5";
  return "border-rose-500/20 bg-rose-500/5";
}

function marketAlertPriorityLabel(priority: MarketAlertPriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function marketAlertPriorityClass(priority: MarketAlertPriority) {
  if (priority === "high") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  if (priority === "medium") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
}

export function MarketAlertSection({
  marketAlertDecision,
  marketAlertCommandSummary,
  hasBigQueryCredentials,
  syncStatus,
  syncMessage,
  warehouseAlertCount,
  ownerQueueSyncStatus,
  ownerQueueSyncMessage,
  warehouseOwnerQueueCount,
  runbookSyncStatus,
  runbookSyncMessage,
  warehouseRunbookCount,
  auditStatus,
  auditMessage,
  auditRecords,
  onSyncMarketAlertsToBigQuery,
  onLoadMarketAlertsFromBigQuery,
  onLoadMarketAlertWarehouseAudit,
  onSyncMarketAlertOwnerQueuesToBigQuery,
  onLoadMarketAlertOwnerQueuesFromBigQuery,
  onSyncMarketAlertRunbooksToBigQuery,
  onLoadMarketAlertRunbooksFromBigQuery,
  onExportMarketAlertCsv,
  onExportMarketAlertCommandSummaryCsv,
  onExportMarketAlertOwnerQueueCsv,
  onExportMarketAlertRunbookCsv,
  marketAlertEvents,
  marketAlertOwnerQueues,
  marketAlertRunbookItems,
  marketHighAlertCount,
  marketMediumAlertCount,
  platformExceptionCount,
}: MarketAlertSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">市場警示中心</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(marketAlertDecision)}`}>
              {executionReviewLabel(marketAlertDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將資料品質、決策漏斗、KRI、SLA 與例外事項合併成可分派的警示事件流
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSyncMarketAlertsToBigQuery}
            disabled={!hasBigQueryCredentials || !marketAlertEvents.length || syncStatus === "syncing" || syncStatus === "loading"}
            className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "syncing" ? "同步中" : "同步 BigQuery"}
          </button>
          <button
            onClick={onLoadMarketAlertsFromBigQuery}
            disabled={!hasBigQueryCredentials || syncStatus === "syncing" || syncStatus === "loading"}
            className="px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "loading" ? "載入中" : "載入 BigQuery"}
          </button>
          <button
            onClick={onLoadMarketAlertWarehouseAudit}
            disabled={!hasBigQueryCredentials || auditStatus === "loading"}
            className="px-3 py-2 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {auditStatus === "loading" ? "稽核載入中" : "載入稽核"}
          </button>
          <button
            onClick={onExportMarketAlertCommandSummaryCsv}
            className="px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
          >
            摘要 CSV
          </button>
          <button
            onClick={onExportMarketAlertOwnerQueueCsv}
            disabled={!marketAlertOwnerQueues.length}
            className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            分派 CSV
          </button>
          <button
            onClick={onExportMarketAlertRunbookCsv}
            disabled={!marketAlertRunbookItems.length}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            Runbook CSV
          </button>
          <button
            onClick={onExportMarketAlertCsv}
            disabled={!marketAlertEvents.length}
            className="px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            警示 CSV
          </button>
        </div>
      </div>
      {syncMessage ? (
        <p className={`text-[11px] ${syncStatus === "error" ? "text-rose-300" : "text-slate-500"}`}>
          {syncMessage}
        </p>
      ) : null}
      {auditMessage ? (
        <p className={`text-[11px] ${auditStatus === "error" ? "text-rose-300" : "text-slate-500"}`}>
          {auditMessage}
        </p>
      ) : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <button
          onClick={onSyncMarketAlertOwnerQueuesToBigQuery}
          disabled={!hasBigQueryCredentials || !marketAlertOwnerQueues.length || ownerQueueSyncStatus === "syncing" || ownerQueueSyncStatus === "loading"}
          className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          {ownerQueueSyncStatus === "syncing" ? "分派同步中" : "同步分派"}
        </button>
        <button
          onClick={onLoadMarketAlertOwnerQueuesFromBigQuery}
          disabled={!hasBigQueryCredentials || ownerQueueSyncStatus === "syncing" || ownerQueueSyncStatus === "loading"}
          className="px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          {ownerQueueSyncStatus === "loading" ? "分派載入中" : "載入分派"}
        </button>
        <button
          onClick={onSyncMarketAlertRunbooksToBigQuery}
          disabled={!hasBigQueryCredentials || !marketAlertRunbookItems.length || runbookSyncStatus === "syncing" || runbookSyncStatus === "loading"}
          className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          {runbookSyncStatus === "syncing" ? "Runbook 同步中" : "同步 Runbook"}
        </button>
        <button
          onClick={onLoadMarketAlertRunbooksFromBigQuery}
          disabled={!hasBigQueryCredentials || runbookSyncStatus === "syncing" || runbookSyncStatus === "loading"}
          className="px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          {runbookSyncStatus === "loading" ? "Runbook 載入中" : "載入 Runbook"}
        </button>
      </div>
      {ownerQueueSyncMessage || runbookSyncMessage ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
          {ownerQueueSyncMessage ? (
            <p className={ownerQueueSyncStatus === "error" ? "text-rose-300" : "text-slate-500"}>
              {ownerQueueSyncMessage}
            </p>
          ) : null}
          {runbookSyncMessage ? (
            <p className={runbookSyncStatus === "error" ? "text-rose-300" : "text-slate-500"}>
              {runbookSyncMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`rounded-md border p-3 ${executionReviewRowClass(marketAlertCommandSummary.status)}`}>
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-slate-100">指揮官摘要</p>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(marketAlertCommandSummary.status)}`}>
                {marketAlertCommandSummary.releaseGate}
              </span>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${marketAlertPriorityClass(marketAlertCommandSummary.priority)}`}>
                {marketAlertPriorityLabel(marketAlertCommandSummary.priority)}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-100">{marketAlertCommandSummary.headline}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              先處理：{marketAlertCommandSummary.focusOwner} · {marketAlertCommandSummary.focusSource} · {marketAlertCommandSummary.nextReview}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs xl:min-w-[520px]">
            {[
              ["模式", marketAlertCommandSummary.operatingMode],
              ["阻塞流程", marketAlertCommandSummary.blockedFlow],
              ["高優先", `${marketAlertCommandSummary.highPriorityCount}`],
              ["Runbook", `${marketAlertCommandSummary.runbookCount}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded bg-slate-950/70 px-2 py-2 min-w-0">
                <p className="text-[10px] text-slate-600 truncate">{label}</p>
                <p className="mt-1 font-mono font-bold text-slate-100 truncate" title={value}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded bg-slate-950/70 p-2">
          <p className="text-[10px] font-bold text-slate-500">第一個動作</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{marketAlertCommandSummary.immediateAction}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
        {[
          ["警示狀態", executionReviewLabel(marketAlertDecision)],
          ["事件數", `${marketAlertEvents.length} 筆`],
          ["高 / 中優先", `${marketHighAlertCount} / ${marketMediumAlertCount}`],
          ["待處理例外", `${platformExceptionCount} 項`],
          ["倉儲 警示/分派/Runbook", `${warehouseAlertCount} / ${warehouseOwnerQueueCount} / ${warehouseRunbookCount}`],
          ["稽核批次", `${auditRecords.length} 批`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {auditRecords.length ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-100">市場警示同步稽核</p>
              <p className="mt-0.5 text-[11px] text-slate-500">比對事件、分派與 Runbook 最近批次是否一致</p>
            </div>
            <span className="self-start md:self-auto rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {auditRecords.length} 批
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs">
              <thead>
                <tr className="text-left text-[11px] text-slate-600">
                  <th className="py-2 px-3 font-medium">批次</th>
                  <th className="py-2 px-3 font-medium">更新</th>
                  <th className="py-2 px-3 font-medium text-right">警示</th>
                  <th className="py-2 px-3 font-medium text-right">高優先</th>
                  <th className="py-2 px-3 font-medium text-right">阻塞 / 觀察</th>
                  <th className="py-2 px-3 font-medium text-right">分派 / 總量</th>
                  <th className="py-2 px-3 font-medium text-right">Runbook</th>
                  <th className="py-2 px-3 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditRecords.slice(0, 5).map((record) => (
                  <tr key={`${record.workspace_id}-${record.generated_at}-${record.batch_id ?? "batch"}`} className="border-t border-slate-900">
                    <td className="py-2 px-3 font-mono text-slate-300">{record.generated_at}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{record.latest_updated_at ?? "--"}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-100">{record.alert_count}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-200">{record.high_priority_count}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{record.block_count} / {record.watch_count}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{record.owner_queue_count} / {record.owner_queue_total}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{record.runbook_count}</td>
                    <td className="py-2 px-3 text-slate-500">{record.actor_id ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {marketAlertOwnerQueues.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 text-xs">
          {marketAlertOwnerQueues.slice(0, 6).map((queue) => (
            <div key={queue.owner} className={`rounded-md border p-3 min-w-0 ${executionReviewRowClass(queue.status)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-100 truncate">{queue.owner}</p>
                  <p className="mt-1 text-[11px] text-slate-500 truncate">主要來源：{queue.topSource}</p>
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${marketAlertPriorityClass(queue.priority)}`}>
                  {marketAlertPriorityLabel(queue.priority)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  ["總數", queue.total],
                  ["高", queue.high],
                  ["中", queue.medium],
                  ["阻塞", queue.block],
                ].map(([label, value]) => (
                  <div key={label} className="rounded bg-slate-950/70 px-2 py-1.5">
                    <p className="text-[10px] text-slate-600">{label}</p>
                    <p className="font-mono font-bold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{queue.nextAction}</p>
            </div>
          ))}
        </div>
      ) : null}

      {marketAlertRunbookItems.length ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-100">Runbook 處理手冊</p>
              <p className="mt-0.5 text-[11px] text-slate-500">把警示轉成檢查、修復、驗收與升級條件</p>
            </div>
            <span className="self-start md:self-auto rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {marketAlertRunbookItems.length} 條
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 text-xs">
            {marketAlertRunbookItems.slice(0, 4).map((item) => (
              <div key={`${item.source}-${item.title}-${item.owner}`} className={`rounded-md border p-3 min-w-0 ${executionReviewRowClass(item.status)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-100 truncate">{item.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500 truncate">
                      {item.source} · {item.owner} · {item.deadline}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${marketAlertPriorityClass(item.priority)}`}>
                    {marketAlertPriorityLabel(item.priority)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    ["檢查", item.diagnose],
                    ["修復", item.resolve],
                    ["驗收", item.verify],
                    ["升級", item.escalation],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded bg-slate-950/70 p-2">
                      <p className="text-[10px] font-bold text-slate-500">{label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {marketAlertEvents.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">來源</th>
                <th className="py-2 px-3 font-medium">事件</th>
                <th className="py-2 px-3 font-medium text-right">優先級</th>
                <th className="py-2 px-3 font-medium text-right">狀態</th>
                <th className="py-2 px-3 font-medium">負責人</th>
                <th className="py-2 px-3 font-medium">依據</th>
                <th className="py-2 px-3 font-medium">動作</th>
              </tr>
            </thead>
            <tbody>
              {marketAlertEvents.map((event, index) => (
                <tr key={`${event.source}-${event.title}-${index}`} className={`border-t ${executionReviewRowClass(event.status)}`}>
                  <td className="py-2 px-3 font-bold text-slate-100">{event.source}</td>
                  <td className="py-2 px-3 text-slate-200">{event.title}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${marketAlertPriorityClass(event.priority)}`}>
                      {marketAlertPriorityLabel(event.priority)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(event.status)}`}>
                      {executionReviewLabel(event.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">{event.owner}</td>
                  <td className="py-2 px-3 font-mono text-slate-400">{event.evidence}</td>
                  <td className="py-2 px-3 text-slate-500">{event.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-950/10 p-3 text-xs text-emerald-200">
          目前沒有需要處理的市場警示。
        </div>
      )}
    </div>
  );
}
