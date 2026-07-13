import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type ExecutionReviewSectionProps = {
  decision: ExecutionReviewStatus;
  blockCount: number;
  watchCount: number;
  canExport: boolean;
  onExportExecutionReviewCsv: () => void;
  items: ExecutionReviewItem[];
};

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-emerald-500/10 bg-emerald-950/5";
  if (status === "watch") return "border-amber-500/10 bg-amber-950/5";
  return "border-rose-500/10 bg-rose-950/5";
}

export function ExecutionReviewSection({
  decision,
  blockCount,
  watchCount,
  canExport,
  onExportExecutionReviewCsv,
  items,
}: ExecutionReviewSectionProps) {
  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">交易前檢核中心</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(decision)}`}>
              {executionReviewLabel(decision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將交易清單轉成可覆核的現金、集中度、資料新鮮度與壓力風險檢查
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-400">
            暫停 {blockCount} · 觀察 {watchCount}
          </span>
          <button
            onClick={onExportExecutionReviewCsv}
            disabled={!canExport}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            檢核 CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs">
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
            {items.map((item) => (
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
    </>
  );
}
