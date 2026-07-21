import {
  brokerBoundaryModeLabel,
  executionRouteEventTypeLabel,
  type BrokerBoundaryMode,
  type ExecutionReviewStatus,
  type ExecutionRouteEventRow,
} from "@/lib/tradeExecutionWorkflow";

type ExecutionRouteEventSectionProps = {
  brokerBoundaryMode: BrokerBoundaryMode;
  onBrokerBoundaryModeChange: (value: BrokerBoundaryMode) => void;
  eventRows: ExecutionRouteEventRow[];
  eventDecision: ExecutionReviewStatus;
  eventPassCount: number;
  eventWatchCount: number;
  eventBlockCount: number;
  hasBigQueryCredentials: boolean;
  syncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  syncMessage: string;
  warehouseEventCount: number;
  onSyncExecutionRouteEventsToBigQuery: () => void;
  onLoadExecutionRouteEventsFromBigQuery: () => void;
  onExportExecutionRouteEventCsv: () => void;
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

export function ExecutionRouteEventSection({
  brokerBoundaryMode,
  onBrokerBoundaryModeChange,
  eventRows,
  eventDecision,
  eventPassCount,
  eventWatchCount,
  eventBlockCount,
  hasBigQueryCredentials,
  syncStatus,
  syncMessage,
  warehouseEventCount,
  onSyncExecutionRouteEventsToBigQuery,
  onLoadExecutionRouteEventsFromBigQuery,
  onExportExecutionRouteEventCsv,
}: ExecutionRouteEventSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">Route Event History / Broker Boundary</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(eventDecision)}`}>
              {executionReviewLabel(eventDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            記錄 route 建立、核准檢查、venue 指派、broker 邊界與 paper ack，全程不送真實委託
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[180px_repeat(3,auto)] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">Broker boundary</span>
            <select
              value={brokerBoundaryMode}
              onChange={(event) => onBrokerBoundaryModeChange(event.target.value as BrokerBoundaryMode)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            >
              <option value="paper">Paper broker</option>
              <option value="manual_review">Manual review</option>
              <option value="disabled">Broker disabled</option>
            </select>
          </label>
          <button
            onClick={onSyncExecutionRouteEventsToBigQuery}
            disabled={!hasBigQueryCredentials || !eventRows.length || syncStatus === "syncing" || syncStatus === "loading"}
            className="sm:self-end px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "syncing" ? "同步中" : "同步 BigQuery"}
          </button>
          <button
            onClick={onLoadExecutionRouteEventsFromBigQuery}
            disabled={!hasBigQueryCredentials || syncStatus === "syncing" || syncStatus === "loading"}
            className="sm:self-end px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "loading" ? "載入中" : "載入 BigQuery"}
          </button>
          <button
            onClick={onExportExecutionRouteEventCsv}
            disabled={!eventRows.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            Events CSV
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
          ["事件數", `${eventRows.length} 筆`],
          ["通過", `${eventPassCount} 筆`],
          ["觀察", `${eventWatchCount} 筆`],
          ["暫停", `${eventBlockCount} 筆`],
          ["倉儲事件", `${warehouseEventCount} 筆`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {eventRows.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[1180px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">Event</th>
                <th className="py-2 px-3 font-medium">Route</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium">Broker</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Evidence</th>
                <th className="py-2 px-3 font-medium">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {eventRows.slice(0, 20).map((row) => (
                <tr key={row.eventId} className={`border-t ${executionReviewRowClass(row.eventStatus)}`}>
                  <td className="py-2 px-3 font-mono text-[11px] text-cyan-200">{row.eventId}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{row.routeId}</td>
                  <td className="py-2 px-3 text-slate-200">{executionRouteEventTypeLabel(row.eventType)}</td>
                  <td className="py-2 px-3 text-slate-400">{brokerBoundaryModeLabel(row.brokerMode)}</td>
                  <td className="py-2 px-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(row.eventStatus)}`}>
                      {executionReviewLabel(row.eventStatus)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">{row.evidence}</td>
                  <td className="py-2 px-3 text-slate-400">{row.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
          執行路由建立後，這裡會產生 broker boundary 事件歷史。
        </div>
      )}
    </div>
  );
}
