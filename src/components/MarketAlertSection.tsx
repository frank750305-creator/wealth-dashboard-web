import type {
  MarketAlertEvent,
  MarketAlertOwnerQueue,
  MarketAlertPriority,
  MarketAlertStatus,
} from "@/lib/marketAlertEvents";

type MarketAlertSectionProps = {
  marketAlertDecision: MarketAlertStatus;
  onExportMarketAlertCsv: () => void;
  onExportMarketAlertOwnerQueueCsv: () => void;
  marketAlertEvents: MarketAlertEvent[];
  marketAlertOwnerQueues: MarketAlertOwnerQueue[];
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
  onExportMarketAlertCsv,
  onExportMarketAlertOwnerQueueCsv,
  marketAlertEvents,
  marketAlertOwnerQueues,
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
            onClick={onExportMarketAlertOwnerQueueCsv}
            disabled={!marketAlertOwnerQueues.length}
            className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            分派 CSV
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["警示狀態", executionReviewLabel(marketAlertDecision)],
          ["事件數", `${marketAlertEvents.length} 筆`],
          ["高 / 中優先", `${marketHighAlertCount} / ${marketMediumAlertCount}`],
          ["待處理例外", `${platformExceptionCount} 項`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

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
